
"use client";

import { useState, useRef, type FC, useCallback } from 'react';
import { storage, db } from '@/lib/firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { UploadCloud, Loader2, File as FileIcon, Trash2, ExternalLink } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn, formatBytes, sanitizeForFirestore } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { generateTagsForFile, type GenerateTagsForFileInput } from '@/ai/flows/generate-tags-for-file';
import type { PreservedFact } from '@/types/rca';

const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

interface PreservedFactsManagerProps {
  analysisId: string | null;
  onAnalysisSaveRequired: () => Promise<string | null>;
  preservedFacts: PreservedFact[];
  setPreservedFacts: (facts: PreservedFact[] | ((prevState: PreservedFact[]) => PreservedFact[])) => void;
}

const PreservedFactsManager: FC<PreservedFactsManagerProps> = ({
  analysisId,
  onAnalysisSaveRequired,
  preservedFacts,
  setPreservedFacts
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userGivenName, setUserGivenName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusText, setStatusText] = useState("Seleccione un archivo y asígnele un nombre.");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!userGivenName) {
        setUserGivenName(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };
  
  const resetState = () => {
    setSelectedFile(null);
    setUserGivenName('');
    setIsProcessing(false);
    setUploadProgress(0);
    setStatusText("Seleccione un archivo y asígnele un nombre.");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAddClick = async () => {
    if (!selectedFile) {
      toast({ title: "Archivo no seleccionado", description: "Por favor, seleccione un archivo para subir.", variant: "destructive" });
      return;
    }
    if (!userGivenName.trim()) {
      toast({ title: "Nombre requerido", description: "Por favor, asigne un nombre al hecho preservado.", variant: "destructive" });
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "Archivo Demasiado Grande", description: "El archivo no puede superar los 5MB.", variant: "destructive" });
        return;
    }


    setIsProcessing(true);

    let currentAnalysisId = analysisId;
    if (!currentAnalysisId) {
      setStatusText("Guardando análisis para obtener ID...");
      currentAnalysisId = await onAnalysisSaveRequired();
    }
    
    if (!currentAnalysisId) {
      toast({ title: "Error Crítico", description: "No se pudo obtener un ID para el análisis. Guarde el progreso e intente de nuevo.", variant: "destructive" });
      setIsProcessing(false);
      return;
    }
    
    const filePath = `uploads/${Date.now()}-${selectedFile.name}`;
    const fileStorageRef = storageRef(storage, filePath);
    const uploadTask = uploadBytesResumable(fileStorageRef, selectedFile);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
        setStatusText(`Subiendo: ${Math.round(progress)}%`);
      },
      (error) => {
        console.error("Upload failed:", error);
        toast({ variant: "destructive", title: "Fallo en la Subida", description: `Error: ${error.message} (Code: ${error.code})` });
        resetState();
      },
      async () => {
        try {
          setStatusText("Obteniendo URL y generando etiquetas con IA...");
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const fileDataUri = await fileToDataUri(selectedFile);
          
          const aiInput: GenerateTagsForFileInput = { fileDataUri, fileName: selectedFile.name, fileType: selectedFile.type };
          const { tags } = await generateTagsForFile(aiInput);

          setStatusText("Guardando en base de datos...");
          const newFact: PreservedFact = {
            id: `fact-${Date.now()}`,
            userGivenName,
            nombre: selectedFile.name,
            size: selectedFile.size,
            tipo: selectedFile.type,
            downloadURL,
            storagePath: uploadTask.snapshot.ref.fullPath,
            uploadDate: new Date().toISOString(),
            tags
          };
          
          const rcaDocRef = doc(db, "rcaAnalyses", currentAnalysisId!);
          await updateDoc(rcaDocRef, {
            preservedFacts: arrayUnion(sanitizeForFirestore(newFact)),
            updatedAt: new Date().toISOString()
          });

          setPreservedFacts(prev => [...(prev || []), newFact]);
          toast({ title: "Hecho Preservado Añadido", description: `${userGivenName} fue subido y guardado.` });
          resetState();

        } catch (error: any) {
          console.error("Post-upload processing failed:", error);
          toast({ variant: "destructive", title: "Fallo en Procesamiento", description: `La IA o la base de datos fallaron: ${error.message}` });
          resetState();
        }
      }
    );
  };
  
  const handleRemoveFact = async (factId: string) => {
    if (!analysisId) {
      toast({ title: "Error", description: "ID del análisis no encontrado.", variant: "destructive" });
      return;
    }
    const factToRemove = preservedFacts.find(fact => fact.id === factId);
    if (!factToRemove) return;
    
    setIsProcessing(true);
    
    try {
      if (factToRemove.storagePath) {
        const fileRef = storageRef(storage, factToRemove.storagePath);
        await deleteObject(fileRef);
      }
      
      const rcaDocRef = doc(db, "rcaAnalyses", analysisId);
      await updateDoc(rcaDocRef, {
          preservedFacts: arrayRemove(sanitizeForFirestore(factToRemove)),
          updatedAt: new Date().toISOString()
      });
      
      setPreservedFacts(prev => prev.filter(fact => fact.id !== factId));
      toast({ title: "Hecho Preservado Eliminado", description: "El archivo y su referencia se eliminaron exitosamente.", variant: 'destructive' });

    } catch (error: any) {
      console.error("Error al eliminar hecho preservado:", error);
      let errorDesc = `No se pudo confirmar la eliminación en la base de datos: ${error.message}.`;
      if (error.code === 'storage/object-not-found') {
        errorDesc = "El archivo ya no existía en Storage, pero se eliminó la referencia de la base de datos.";
      } else if (error.code) {
        errorDesc = `No se pudo eliminar de Storage. Código: ${error.code}`
      }
      toast({ title: "Error de Eliminación", description: errorDesc, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Añadir Nuevo Hecho Preservado</CardTitle>
          <CardDescription>Suba un archivo (imagen, documento, etc.) y asígnele un nombre descriptivo para preservarlo como evidencia.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userGivenName">Nombre del Hecho Preservado <span className="text-destructive">*</span></Label>
            <Input
              id="userGivenName"
              value={userGivenName}
              onChange={(e) => setUserGivenName(e.target.value)}
              placeholder="Ej: Foto de la fuga, Registro de mantención"
              disabled={isProcessing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="file-input-preservation">Archivo (Máx 5MB)<span className="text-destructive">*</span></Label>
            <Input id="file-input-preservation" ref={fileInputRef} type="file" onChange={handleFileChange} disabled={isProcessing} />
          </div>
          {selectedFile && !isProcessing && (
            <div className="text-sm text-muted-foreground">
              Archivo seleccionado: {selectedFile.name} ({formatBytes(selectedFile.size)})
            </div>
          )}
          {isProcessing && (
            <div className="flex flex-col gap-2">
              <Progress value={uploadProgress} className="w-full h-2" />
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{statusText}</span>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleAddClick} disabled={!selectedFile || !userGivenName.trim() || isProcessing}>
            <UploadCloud className="mr-2 h-4 w-4" />
            {isProcessing ? 'Procesando...' : 'Añadir y Subir Hecho'}
          </Button>
        </CardFooter>
      </Card>
      
      <div className="space-y-2 pt-4">
        <h4 className="font-semibold">Hechos Preservados Adjuntos</h4>
        {(preservedFacts || []).length > 0 ? (
          <div className="space-y-2">
            {preservedFacts.map((fact) => (
              <Card key={fact.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-grow min-w-0">
                    <p className="font-medium truncate">{fact.userGivenName}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(fact.size || 0)} - {format(new Date(fact.uploadDate), "dd/MM/yyyy HH:mm")}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {fact.tags?.map((tag, i) => <Badge key={i} variant="secondary">{tag}</Badge>)}
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-2 flex items-center gap-2">
                    {fact.downloadURL && (
                      <Button asChild variant="link" size="sm">
                        <a href={fact.downloadURL} target="_blank" rel="noopener noreferrer" download={fact.nombre}>
                          <ExternalLink className="mr-1.5 h-3 w-3"/> Ver/Descargar
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-destructive/10"
                      onClick={() => handleRemoveFact(fact.id)}
                      disabled={isProcessing}
                      aria-label="Eliminar hecho preservado"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No hay hechos preservados adjuntos a este análisis.</p>
        )}
      </div>
    </div>
  );
};

export default PreservedFactsManager;
