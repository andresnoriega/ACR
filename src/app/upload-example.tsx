'use client';

import { useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { Loader2, UploadCloud, FileText } from 'lucide-react';

// This is a self-contained example component demonstrating how to handle file uploads
// by converting the file to a Data URL and storing it in state.

export default function UploadExampleComponent() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const MAX_FILE_SIZE_KB = 700; // Safe limit to avoid Firestore's 1MiB document limit.

  // 1. Handles the file selection from the input
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    // Reset previous state
    setDataUrl(null);
    
    const file = event.target.files?.[0];
    if (file) {
      // 2. Validate the file size BEFORE processing
      if (file.size > MAX_FILE_SIZE_KB * 1024) {
        toast({
          title: "Archivo Demasiado Grande",
          description: `El archivo no puede superar los ${MAX_FILE_SIZE_KB} KB.`,
          variant: "destructive",
        });
        setSelectedFile(null); // Clear the selection
        event.target.value = ''; // Reset the file input
        return;
      }
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  // 3. The core function to process the file and generate the Data URL
  const handleProcessFile = () => {
    if (!selectedFile) {
      toast({ title: "Sin Archivo", description: "Por favor, seleccione un archivo primero.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    // 4. Initialize FileReader, a standard browser API
    const reader = new FileReader();

    // 5. Define what happens when the reader successfully loads the file
    reader.onload = () => {
      const result = reader.result as string; // The result is the Data URL string
      setDataUrl(result); // Store the Data URL in state
      setIsProcessing(false);
      toast({ title: "Archivo Procesado", description: "La Data URL ha sido generada exitosamente." });
      
      // At this point, you would typically pass the `result` string to your
      // main save function to be stored in Firestore.
      // Example: onSave(result);
    };

    // 6. Define what happens on an error
    reader.onerror = (error) => {
      console.error("Error reading file:", error);
      toast({ title: "Error de Lectura", description: "No se pudo procesar el archivo.", variant: "destructive" });
      setIsProcessing(false);
    };

    // 7. Start the reading process. This triggers either onload or onerror.
    reader.readAsDataURL(selectedFile);
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center"><FileText className="mr-2" /> Ejemplo de Subida de Archivo con Data URL</CardTitle>
        <CardDescription>
          Este es un ejemplo de cómo convertir un archivo a Data URL para guardarlo en Firestore.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file-upload-example">Seleccionar Archivo (Máx {MAX_FILE_SIZE_KB} KB)</Label>
          <Input id="file-upload-example" type="file" onChange={handleFileChange} />
        </div>
        
        {selectedFile && (
          <div className="text-sm text-muted-foreground">
            <p>Archivo seleccionado: <strong>{selectedFile.name}</strong></p>
            <p>Tamaño: <strong>{(selectedFile.size / 1024).toFixed(2)} KB</strong></p>
          </div>
        )}

        {dataUrl && (
          <div className="space-y-2">
            <Label>Data URL Generada (Primeros 100 caracteres)</Label>
            <div className="text-xs p-2 border rounded-md bg-muted text-muted-foreground break-all">
              {dataUrl.substring(0, 100)}...
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleProcessFile} disabled={!selectedFile || isProcessing}>
          {isProcessing ? <Loader2 className="mr-2 animate-spin" /> : <UploadCloud className="mr-2" />}
          {isProcessing ? 'Procesando...' : 'Procesar y Generar Data URL'}
        </Button>
      </CardFooter>
    </Card>
  );
}
