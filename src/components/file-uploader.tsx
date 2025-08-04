
"use client";
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Loader2, UploadCloud, CheckCircle, AlertCircle } from 'lucide-react';
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    // In this simplified version, we are not handling tags.
    // If you need tags, you'd add an input and append it here:
    // formData.append('tags', JSON.stringify(['auto-tag1', 'auto-tag2']));
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const newFile: UploadedFile = await response.json();
      onUploadSuccess(newFile);
      toast({
        title: "✅ Upload Successful",
        description: `${newFile.name} has been uploaded.`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Could not upload the file.",
      });
    } finally {
      setIsUploading(false);
    }
  }, [onUploadSuccess, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
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
          <p>Uploading...</p>
          <Progress value={uploadProgress} className="w-full" />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <UploadCloud className="h-8 w-8" />
          <p>Drag & drop a file here, or click to select a file</p>
          <p className="text-xs">Image, PDF, DOCX supported.</p>
        </div>
      )}
    </div>
  );
}
