
'use client';

import { useState, type FC, type ChangeEvent, useRef, useCallback } from 'react';
import type { PreservedFact } from '@/types/rca';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, Loader2, FileArchive, FileText, ImageIcon, Paperclip, ExternalLink, Link2, UploadCloud } from 'lucide-react';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { db, storage } from '@/lib/firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { cn } from '@/lib/utils';
import { sanitizeForFirestore } from '@/lib/utils';


const MAX_FILE_SIZE_KB = 2048; // 2MB limit

const generateClientSideId = (prefix: string) => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const getEvidenceIcon = (tipo?: PreservedFact['tipo']) => {
    if (!tipo) return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />;
    if (tipo.startsWith('image/')) return <ImageIcon className="h-4 w-4 mr-2 flex-shrink-0 text-blue-600" />;
    if (tipo === 'application/pdf') return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-red-600" />;
    if (tipo.includes('word')) return <Paperclip className="h-4 w-4 mr-2 flex-shrink-0 text-sky-700" />;
    if (tipo === 'link') return <Link2 className="h-4 w-4 mr-2 flex-shrink-0 text-indigo-600" />;
    return <FileArchive className="h-4 w-4 mr-2 flex-shrink-0 text-gray-600" />;
};


interface PreservedFactsManagerProps {
  preservedFacts: PreservedFact[];
  setPreservedFacts: (facts: PreservedFact[] | ((prevState: PreservedFact[]) => PreservedFact[])) => void;
  analysisId: string | null;
  onAnalysisSaveRequired: () => Promise<string | null>;
}

export const PreservedFactsManager: FC<PreservedFactsManagerProps> = ({
  preservedFacts,
  setPreservedFacts,
  analysisId,
  onAnalysisSaveRequired,
}) => {
  const { toast } = useToast();
  const [userGivenName, setUserGivenName] = useState('');
  const [comment, setComment] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusText, setStatusText] = useState("Añadir Hecho Preservado");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
      setUserGivenName('');
      setComment('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setIsProcessing(false);
      setUploadProgress(0);
      setStatusText("Añadir Hecho Preservado");
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_KB * 1024) {
        toast({
          title: "Archivo Demasiado Grande",
          description: `El archivo no puede superar los ${MAX_FILE_SIZE_KB / 1024}MB.`,
          variant: "destructive",
        });
        setSelectedFile(null);
        if (event.target) event.target.value = '';
        return;
      }
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleAddClick = async () => {
    if (!userGivenName.trim() || !selectedFile) {
      toast({ title: "Campos Requeridos", description: "El nombre del hecho y el archivo son obligatorios.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setStatusText("Preparando...");
    
    try {
      let currentAnalysisId = analysisId;
      if (!currentAnalysisId) {
        setStatusText("Guardando análisis...");
        currentAnalysisId = await onAnalysisSaveRequired();
      }

      if (!currentAnalysisId) {
        throw new Error("No se pudo obtener un ID de análisis válido. No se puede subir el archivo.");
      }

      const filePath = `preserved_facts/${currentAnalysisId}/${Date.now()}-${selectedFile.name}`;
      const fileStorageRef = storageRef(storage, filePath);
      const uploadTask = uploadBytesResumable(fileStorageRef, selectedFile);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
          setStatusText(`Subiendo... ${Math.round(progress)}%`);
        },
        (error) => {
          console.error("Upload failed:", error);
           let description = "No se pudo subir el archivo. Revise la consola para detalles.";
            if (error.code) {
                switch(error.code) {
                    case 'storage/unauthorized':
                        description = `Permiso denegado. Revise las reglas de seguridad de Firebase Storage para permitir escrituras.`;
                        break;
                    case 'storage/retry-limit-exceeded':
                        description = `Se superó el tiempo de espera. Revise su conexión de red.`;
                        break;
                }
            }
          toast({ variant: "destructive", title: "Fallo en la Subida", description });
          resetForm();
        },
        async () => {
            try {
                setStatusText("Finalizando...");
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

                const newFact: PreservedFact = {
                    id: generateClientSideId('pf'),
                    userGivenName: userGivenName.trim(),
                    nombre: selectedFile.name,
                    tipo: selectedFile.type,
                    comment: comment.trim() || undefined,
                    uploadDate: new Date().toISOString(),
                    eventId: currentAnalysisId!,
                    downloadURL: downloadURL,
                    storagePath: uploadTask.snapshot.ref.fullPath,
                };
                
                const rcaDocRef = doc(db, 'rcaAnalyses', currentAnalysisId!);
                await updateDoc(rcaDocRef, {
                  preservedFacts: arrayUnion(sanitizeForFirestore(newFact)),
                  updatedAt: new Date().toISOString()
                });
                
                setPreservedFacts(prev => [...prev, newFact]);
                toast({ title: "Éxito", description: "Hecho preservado añadido y subido correctamente." });
                resetForm();

            } catch (finalizationError) {
                 console.error("Error finalizing upload:", finalizationError);
                 toast({ variant: "destructive", title: "Error Post-Subida", description: "El archivo se subió pero no se pudo guardar la referencia." });
                 resetForm();
            }
        }
      );

    } catch (error) {
      console.error("Error in handleAddClick:", error);
      toast({ title: "Error Inesperado", description: (error as Error).message, variant: "destructive" });
      resetForm();
    }
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
        toast({ title: "Archivo Eliminado de Storage", variant: "default" });
      }
      
      const rcaDocRef = doc(db, "rcaAnalyses", analysisId);
      await updateDoc(rcaDocRef, {
          preservedFacts: arrayRemove(sanitizeForFirestore(factToRemove)),
          updatedAt: new Date().toISOString()
      });
      
      setPreservedFacts(prev => prev.filter(fact => fact.id !== factId));
      toast({ title: "Hecho Preservado Eliminado", description: "La referencia se eliminó exitosamente.", variant: 'destructive' });

    } catch (error: any) {
      console.error("Error al eliminar hecho preservado:", error);
      let errorDesc = `No se pudo confirmar la eliminación en la base de datos: ${error.message}.`;
      if (error.code === 'storage/object-not-found') {
        errorDesc = "El archivo ya no existía en Storage, pero se eliminó la referencia de la base de datos.";
      } else if (error.code) {
        errorDesc = `No se pudo eliminar de Storage. Código: ${error.code}`
      }
      toast({ title: "Error de Eliminación", description: errorDesc, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <div className="space-y-4 pt-4 border-t">
      <h3 className="text-lg font-semibold font-headline flex items-center">
        <FileArchive className="mr-2 h-5 w-5 text-primary" />
        Preservación de Hechos (Anexos)
      </h3>

      <div className="p-4 border rounded-md bg-secondary/30 space-y-4">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="preserved-fact-name">Nombre del Hecho Preservado <span className="text-destructive">*</span></Label>
                <Input
                    id="preserved-fact-name"
                    value={userGivenName}
                    onChange={(e) => setUserGivenName(e.target.value)}
                    placeholder="Ej: Foto de la Falla, Bitácora del día, etc."
                    disabled={isProcessing}
                />
             </div>
             <div className="space-y-2">
                <Label htmlFor="preserved-fact-file">Archivo (Máx 2MB) <span className="text-destructive">*</span></Label>
                 <Input
                    id="preserved-fact-file"
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    disabled={isProcessing}
                />
             </div>
             <div className="space-y-2 md:col-span-2">
                 <Label htmlFor="preserved-fact-comment">Comentario (Opcional)</Label>
                <Textarea
                    id="preserved-fact-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Añada una breve descripción o contexto para este archivo."
                    rows={2}
                    disabled={isProcessing}
                />
             </div>
         </div>
         <div className="flex flex-col gap-2">
            <Button onClick={handleAddClick} disabled={isProcessing || !selectedFile || !userGivenName.trim()}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                {isProcessing ? statusText : 'Añadir Hecho Preservado'}
            </Button>
            {isProcessing && uploadProgress > 0 && <Progress value={uploadProgress} className="w-full h-2" />}
         </div>
      </div>

      <div className="space-y-2 pt-4">
        <h4 className="font-semibold">Hechos Preservados Adjuntos</h4>
        {(preservedFacts || []).length > 0 ? (
          preservedFacts.map((fact) => (
            <div key={fact.id} className="flex items-center justify-between p-3 border rounded-md bg-card">
              <div className="flex items-center flex-grow min-w-0">
                  {getEvidenceIcon(fact.tipo)}
                  <div className="flex-grow min-w-0">
                    <p className="font-medium truncate" title={fact.userGivenName}>{fact.userGivenName}</p>
                    <p className="text-xs text-muted-foreground truncate" title={fact.nombre}>{fact.nombre} - Subido el {format(new Date(fact.uploadDate), "dd/MM/yy 'a las' HH:mm")}</p>
                    {fact.comment && <p className="text-xs italic text-muted-foreground truncate" title={fact.comment}>"{fact.comment}"</p>}
                  </div>
              </div>
              <div className="flex-shrink-0 ml-2 flex items-center gap-2">
                {fact.downloadURL && (
                    <Button asChild variant="link" size="sm">
                        <a href={fact.downloadURL} target="_blank" rel="noopener noreferrer">
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
          ))
        ) : (
          <p className="text-sm text-muted-foreground italic">No hay hechos preservados adjuntos a este análisis.</p>
        )}
      </div>
    </div>
  );
};
