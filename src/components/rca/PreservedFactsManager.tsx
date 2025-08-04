'use client';

import { useState, type FC, type ChangeEvent, useRef } from 'react';
import type { PreservedFact } from '@/types/rca';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, Loader2, FileArchive, FileText, ImageIcon, Paperclip, ExternalLink, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import { storage } from '@/lib/firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { sanitizeForFirestore } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

const MAX_FILE_SIZE_KB = 2048; // 2MB limit

interface PreservedFactsManagerProps {
  analysisId: string | null;
  preservedFacts: PreservedFact[];
  onAddFact: (newFact: PreservedFact) => Promise<void>;
  onRemoveFact: (factId: string) => Promise<void>;
  onAnalysisSaveRequired: () => Promise<string | null>;
}

const getEvidenceIcon = (tipo?: PreservedFact['tipo']) => {
    if (!tipo) return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />;
    if (tipo.startsWith('image/')) return <ImageIcon className="h-4 w-4 mr-2 flex-shrink-0 text-blue-600" />;
    if (tipo === 'application/pdf') return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-red-600" />;
    if (tipo.includes('word')) return <Paperclip className="h-4 w-4 mr-2 flex-shrink-0 text-sky-700" />;
    if (tipo === 'link') return <Link2 className="h-4 w-4 mr-2 flex-shrink-0 text-indigo-600" />;
    return <FileArchive className="h-4 w-4 mr-2 flex-shrink-0 text-gray-600" />;
};

export const PreservedFactsManager: FC<PreservedFactsManagerProps> = ({
  analysisId,
  preservedFacts,
  onAddFact,
  onRemoveFact,
  onAnalysisSaveRequired,
}) => {
  const { toast } = useToast();
  const [userGivenName, setUserGivenName] = useState('');
  const [comment, setComment] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusText, setStatusText] = useState("Seleccione un archivo para añadir.");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
      setUserGivenName('');
      setComment('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setIsProcessing(false);
      setUploadProgress(0);
      setStatusText("Seleccione un archivo para añadir.");
  };

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
      setStatusText(`Archivo seleccionado: ${file.name}`);
    } else {
      setSelectedFile(null);
      setStatusText("Seleccione un archivo para añadir.");
    }
  };

  const handleAddClick = async () => {
    if (!userGivenName.trim() || !selectedFile) {
      toast({ title: "Campos Requeridos", description: "El nombre del hecho y el archivo son obligatorios.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);
    setStatusText("Preparando subida...");
    
    try {
      const currentAnalysisId = await onAnalysisSaveRequired();
      if (!currentAnalysisId) {
        throw new Error("No se pudo obtener un ID de análisis válido para subir el archivo.");
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
          const bucket = storage.app.options.storageBucket || 'N/A';
          let description = `No se pudo subir al bucket '${bucket}'. Por favor, revise la red y la configuración de Firebase.`;

          switch(error.code) {
              case 'storage/bucket-not-found': description = `Bucket '${bucket}' no encontrado. Asegúrese de que Storage esté habilitado.`; break;
              case 'storage/project-not-found': description = "Proyecto de Firebase no encontrado. Revise su configuración."; break;
              case 'storage/unauthorized': description = `Permiso denegado para el bucket '${bucket}'. Revise las reglas de seguridad de Storage.`; break;
              case 'storage/unknown': description = `Error desconocido. Esto podría ser un problema de CORS. Revise la consola.`; break;
          }
          toast({ variant: "destructive", title: "Fallo en la Subida", description });
          resetForm();
        },
        async () => {
          try {
            setStatusText("Finalizando...");
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            const newFact: PreservedFact = {
                id: `pf-${Date.now()}`,
                userGivenName: userGivenName.trim(),
                nombre: selectedFile.name,
                tipo: selectedFile.type,
                comment: comment.trim() || undefined,
                uploadDate: new Date().toISOString(),
                eventId: currentAnalysisId,
                downloadURL: downloadURL,
                storagePath: uploadTask.snapshot.ref.fullPath,
            };
            
            await onAddFact(newFact);
            setStatusText("✅ ¡Subida Completa!");
            setTimeout(resetForm, 2000);

          } catch(finalizationError) {
             console.error("Error finalizing upload:", finalizationError);
             toast({ title: "Error Post-Subida", description: "El archivo se subió pero no se pudo guardar la referencia.", variant: "destructive"});
             resetForm();
          }
        }
      );
    } catch (error: any) {
      console.error("Error preparing upload:", error);
      toast({ title: "Error de Preparación", description: `No se pudo iniciar la subida: ${error.message}.`, variant: "destructive" });
      resetForm();
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t">
      <h3 className="text-lg font-semibold font-headline flex items-center">
        <FileArchive className="mr-2 h-5 w-5 text-primary" />
        Preservación de Hechos (Anexos)
      </h3>

      <Card className="p-4 bg-secondary/30">
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
         <Button onClick={handleAddClick} disabled={isProcessing || !selectedFile || !userGivenName.trim()} className="mt-4">
             {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
             Añadir Hecho Preservado
         </Button>
         {isProcessing && (
           <div className="mt-2 space-y-1">
             <Progress value={uploadProgress} className="w-full h-2" />
             <p className="text-xs text-muted-foreground text-center">{statusText}</p>
           </div>
         )}
      </Card>

      <div className="space-y-2 pt-4">
        <h4 className="font-semibold">Hechos Preservados Adjuntos</h4>
        {(preservedFacts || []).length > 0 ? (
          preservedFacts.map((fact) => (
            <Card key={fact.id} className="p-3 flex items-center justify-between">
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
                  onClick={() => onRemoveFact(fact.id)}
                  disabled={isProcessing}
                  aria-label="Eliminar hecho preservado"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground italic">No hay hechos preservados adjuntos a este análisis.</p>
        )}
      </div>
    </div>
  );
};
