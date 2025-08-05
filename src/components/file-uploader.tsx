
"use client";
import { useState, useCallback, useRef } from 'react';
import { useDropzone, type DropzoneState } from 'react-dropzone';
import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL, updateMetadata, getMetadata } from 'firebase/storage';
import { Loader2, UploadCloud, File as FileIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { cn, formatBytes } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { generateTagsForFile, type GenerateTagsForFileInput } from '@/ai/flows/generate-tags-for-file';
import type { UploadedFile } from '@/app/page';


const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

interface FileUploaderProps {
  onUploadSuccess: (UploadedFile) => void;
}

export default function FileUploader({ onUploadSuccess }: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusText, setStatusText] = useState("Drag & drop a file here, or click to select a file");
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
  
  const resetState = () => {
    setFile(null);
    setIsProcessing(false);
    setUploadProgress(0);
    setStatusText("Drag & drop a file here, or click to select a file");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleProcessFile = async () => {
    if (!file) return;

    setIsProcessing(true);
    setUploadProgress(0);
    setStatusText("Preparing to upload...");
    
    // Use the filename directly to allow for replacement
    const storagePath = `uploads/${Date.now()}-${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
        setStatusText(`Uploading file... ${Math.round(progress)}%`);
      },
      (error) => {
        console.error("Upload failed:", error);
        const bucket = storage.app.options.storageBucket || 'N/A';
        let description = `Could not upload to bucket '${bucket}'. Please check your network and Firebase configuration.`;

        if (error.code) {
            switch(error.code) {
                case 'storage/bucket-not-found':
                    description = `Firebase Storage bucket '${bucket}' not found. Please ensure Storage is enabled and the bucket name in your config is correct.`;
                    break;
                case 'storage/project-not-found':
                    description = "Firebase project not found. Please check your Firebase configuration.";
                    break;
                case 'storage/unauthorized':
                    description = `Permission Denied for bucket '${bucket}'. Please check your Firebase Storage security rules to allow writes.`;
                    break;
                case 'storage/unknown':
                    description = `An unknown error occurred with bucket '${bucket}'. This could be a CORS configuration issue. Please check the browser console for details.`;
                    break;
            }
        }

        toast({ variant: "destructive", title: "Upload Failed", description });
        setStatusText("Upload failed. Please try again.");
        setTimeout(resetState, 4000);
      },
      async () => {
        try {
          setStatusText("Processing file with AI...");
          setUploadProgress(100);
          
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const fileDataUri = await fileToDataUri(file);

          const aiInput: GenerateTagsForFileInput = {
            fileDataUri,
            fileName: file.name,
            fileType: file.type,
          };
          
          const { tags } = await generateTagsForFile(aiInput);

          setStatusText("Saving tags...");
          const newMetadata = {
            customMetadata: {
              tags: JSON.stringify(tags)
            }
          };
          await updateMetadata(uploadTask.snapshot.ref, newMetadata);

          setStatusText("Finalizing...");

          // Get the full metadata to have access to timeCreated
          const finalMetadata = await getMetadata(uploadTask.snapshot.ref);

          const newFile: UploadedFile = {
            name: file.name,
            size: file.size,
            type: file.type,
            url: downloadURL,
            tags: tags,
            fullPath: uploadTask.snapshot.ref.fullPath,
            uploadedAt: finalMetadata.timeCreated,
          };

          onUploadSuccess(newFile);

          setStatusText("✅ Success! File processed.");
          toast({
            title: "✅ File Processed",
            description: `${file.name} was successfully uploaded and tagged.`,
          });
          
          setTimeout(resetState, 2000);

        } catch (error: any) {
          console.error("Post-upload processing failed:", error);
          setStatusText("AI processing failed.");
          toast({ variant: "destructive", title: "Processing Failed", description: "The AI tagging process failed. Please try again." });
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
              <span className="font-semibold text-primary">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">Any file type supported</p>
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
                    <Button variant="ghost" size="sm" onClick={resetState}>Change</Button>
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
                    Process and Tag File
                </Button>
            )}
        </div>
      )}
    </div>
  );
}
