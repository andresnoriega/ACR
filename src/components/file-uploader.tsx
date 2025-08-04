
"use client";
import { useState, useCallback } from 'react';
import { useDropzone, type DropzoneState } from 'react-dropzone';
import { Loader2, UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

export interface UploadedFile {
    name: string;
    size: number;
    type: string;
    url: string;
    tags: string[];
    fullPath: string;
    uploadedAt: string;
}

interface FileUploaderProps {
  onUploadSuccess: (file: UploadedFile) => void;
}

export default function FileUploader({ onUploadSuccess }: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  // Upload progress is not implemented in this version, so we remove the state
  // const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Simple size validation
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
            title: "Archivo demasiado grande",
            description: "El archivo no puede superar los 5MB.",
            variant: "destructive",
        });
        return;
    }

    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const newFile: UploadedFile = await response.json();
      onUploadSuccess(newFile);
      toast({
        title: "✅ Subida Exitosa",
        description: `${newFile.name} ha sido subido.`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Fallo en la Subida",
        description: `No se pudo subir el archivo: ${(error as Error).message}`,
      });
    } finally {
      setIsUploading(false);
    }
  }, [onUploadSuccess, toast]);

  const { getRootProps, getInputProps, isDragActive }: DropzoneState = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'image/*': ['.jpeg', '.png', '.jpg', '.gif', '.svg'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors
      ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
    >
      <input {...getInputProps()} />
      {isUploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Subiendo...</p>
          {/* Progress bar can be re-added here if using uploadBytesResumable with progress tracking */}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <UploadCloud className="h-8 w-8" />
          <p>Arrastre un archivo aquí, o haga clic para seleccionar</p>
          <p className="text-xs">Soporta Imagen, PDF, DOCX (Máx 5MB).</p>
        </div>
      )}
    </div>
  );
}

    