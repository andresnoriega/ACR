"use client";

import { useState, useRef, type FC, useCallback } from 'react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL, updateMetadata, getMetadata, listAll, deleteObject } from 'firebase/storage';
import { UploadCloud, Loader2, File as FileIcon, Trash2, ExternalLink } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn, formatBytes } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { generateTagsForFile, type GenerateTagsForFileInput } from '@/ai/flows/generate-tags-for-file';
import type { PreservedFact } from '@/types/rca';
import { sanitizeForFirestore } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

interface FileUploaderProps {
  analysisId: string | null;
  onUploadSuccess: (file: PreservedFact) => void;
  onAnalysisSaveRequired: () => Promise<string | null>;
}

const FileUploader: FC<FileUploaderProps> = ({ analysisId, onUploadSuccess, onAnalysisSaveRequired }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusText, setStatusText] = useState("Arrastre un archivo aquí, o haga clic para seleccionar un archivo");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, over: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(over);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e, false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };
  
  const resetState = useCallback(() => {
    setFile(null);
    setIsProcessing(false);
    setUploadProgress(0);
    setStatusText("Arrastre un archivo aquí, o haga clic para seleccionar un archivo");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleProcessFile = async () => {
    if (!file) return;

    let currentAnalysisId = analysisId;
    if (!currentAnalysisId) {
      currentAnalysisId = await onAnalysisSaveRequired();
    }
    if (!currentAnalysisId) {
      toast({
        title: "Error de Análisis",
        description: "Se necesita guardar el análisis antes de poder subir archivos. Intente de nuevo.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);
    setStatusText("Preparando para subir...");
    
    const storageRef = ref(storage, `uploads/${currentAnalysisId}/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
        setStatusText(`Subiendo archivo... ${Math.round(progress)}%`);
      },
      (error) => {
        console.error("Fallo en la subida:", error);
        const bucket = storage.app.options.storageBucket || 'N/A';
        let description = `No se pudo subir al bucket '${bucket}'. Por favor revise su red y configuración de Firebase.`;

        if (error.code) {
            switch(error.code) {
                case 'storage/bucket-not-found':
                    description = `Bucket de Firebase Storage '${bucket}' no encontrado. Por favor asegúrese de que Storage esté habilitado y el nombre del bucket en su configuración sea correcto.`;
                    break;
                case 'storage/project-not-found':
                    description = "Proyecto de Firebase no encontrado. Por favor revise su configuración de Firebase.";
                    break;
                case 'storage/unauthorized':
                    description = `Permiso denegado para el bucket '${bucket}'. Por favor revise sus reglas de seguridad de Firebase Storage para permitir escrituras.`;
                    break;
                case 'storage/unknown':
                    description = `Un error desconocido ocurrió con el bucket '${bucket}'. Esto podría ser un problema de configuración de CORS. Por favor revise la consola del navegador para más detalles.`;
                    break;
            }
        }

        toast({ variant: "destructive", title: "Fallo en la Subida", description });
        setStatusText("Fallo en la subida. Por favor, intente de nuevo.");
        setTimeout(resetState, 4000);
      },
      async () => {
        try {
          setStatusText("Procesando archivo con IA...");
          setUploadProgress(100);
          
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const fileDataUri = await fileToDataUri(file);

          const aiInput: GenerateTagsForFileInput = {
            fileDataUri,
            fileName: file.name,
            fileType: file.type,
          };
          
          const { tags } = await generateTagsForFile(aiInput);

          setStatusText("Guardando etiquetas...");
          const newMetadata = {
            customMetadata: {
              tags: JSON.stringify(tags)
            }
          };
          await updateMetadata(uploadTask.snapshot.ref, newMetadata);

          setStatusText("Finalizando...");

          const finalMetadata = await getMetadata(uploadTask.snapshot.ref);

          const newFact: PreservedFact = {
            id: `pf-${finalMetadata.generation}`,
            userGivenName: file.name,
            nombre: file.name,
            size: file.size,
            tipo: file.type,
            downloadURL: downloadURL,
            storagePath: uploadTask.snapshot.ref.fullPath,
            uploadDate: finalMetadata.timeCreated,
            tags: tags,
            eventId: currentAnalysisId!
          };

          const rcaDocRef = doc(db, 'rcaAnalyses', currentAnalysisId!);
            await updateDoc(rcaDocRef, {
            preservedFacts: arrayUnion(sanitizeForFirestore(newFact)),
            updatedAt: new Date().toISOString()
          });

          onUploadSuccess(newFact);

          setStatusText("✅ ¡Éxito! Archivo procesado.");
          toast({
            title: "✅ Archivo Procesado",
            description: `${file.name} fue subido y etiquetado exitosamente.`,
          });
          
          setTimeout(resetState, 2000);

        } catch (error: any) {
          console.error("Fallo en el procesamiento post-subida:", error);
          setStatusText("Fallo en el procesamiento con IA.");
          toast({ variant: "destructive", title: "Fallo en el Procesamiento", description: "El proceso de etiquetado con IA falló. Por favor intente de nuevo." });
          setTimeout(resetState, 4000);
        }
      }
    );
  };
  
  return (
    <div className="flex flex-col items-center gap-4">
      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={(e) => handleDragEvents(e, true)}
          onDragLeave={(e) => handleDragEvents(e, false)}
          onDragOver={(e) => handleDragEvents(e, true)}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
            isDragOver ? 'border-primary bg-accent' : 'border-border hover:border-primary/50 hover:bg-accent/50'
          )}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
            <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
            <p className="mb-2 text-sm text-muted-foreground">
              <span className="font-semibold text-primary">Haga clic para subir</span> o arrastre y suelte
            </p>
            <p className="text-xs text-muted-foreground">Cualquier tipo de archivo soportado</p>
          </div>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
        </div>
      ) : (
        <div className="w-full p-4 border rounded-lg flex flex-col gap-4">
            <div className="flex items-center gap-4">
                <FileIcon className="h-10 w-10 text-muted-foreground" />
                <div className="flex-grow">
                    <p className="font-medium text-sm truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                </div>
                {!isProcessing && (
                    <Button variant="ghost" size="sm" onClick={resetState}>Cambiar</Button>
                )}
            </div>
            {isProcessing ? (
                <div className="flex flex-col gap-2">
                    <Progress value={uploadProgress} className="w-full h-2" />
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{statusText}</span>
                    </div>
                </div>
            ) : (
                <Button onClick={handleProcessFile} className="w-full">
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Procesar y Etiquetar Archivo
                </Button>
            )}
        </div>
      )}
    </div>
  );
};

export default FileUploader;
