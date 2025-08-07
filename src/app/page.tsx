'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, listAll, getMetadata } from 'firebase/storage';
import FileUploader from '@/components/file-uploader';
import FileList from '@/components/file-list';
import { useToast } from "@/hooks/use-toast";

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  url: string;
  fullPath: string;
  uploadedAt: string;
}

export type SortKey = 'name' | 'size' | 'type' | 'uploadedAt';
export type SortDirection = 'asc' | 'desc';

export default function Home() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('uploadedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { toast } = useToast();

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const listRef = ref(storage, 'uploads');
      const res = await listAll(listRef);
      const filesData = await Promise.all(
        res.items.map(async (itemRef) => {
          const url = await getDownloadURL(itemRef);
          const metadata = await getMetadata(itemRef);
          return {
            name: metadata.name,
            size: metadata.size,
            type: metadata.contentType || 'unknown',
            url: url,
            fullPath: itemRef.fullPath,
            uploadedAt: metadata.timeCreated
          };
        })
      );
      setFiles(filesData);
    } catch (error) {
        const bucket = storage.app.options.storageBucket || 'N/A';
        let description = `No se pudo listar los archivos del bucket '${bucket}'. Por favor, revise su red y la configuración de Firebase.`;

        // More specific error handling could be added here if needed
        if (error instanceof Error && 'code' in error) {
             switch((error as any).code) {
                case 'storage/bucket-not-found':
                    description = `El bucket de Firebase Storage '${bucket}' no fue encontrado. Asegúrese de que Storage esté habilitado y el nombre del bucket sea correcto.`;
                    break;
                case 'storage/unauthorized':
                     description = `Permiso denegado para el bucket '${bucket}'. Por favor, revise las reglas de seguridad de Firebase Storage para permitir lecturas (allow read).`;
                    break;
             }
        }
        
        toast({
            variant: "destructive",
            title: "Error al Cargar Archivos",
            description: description,
        });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);
  

  const handleUploadSuccess = (uploadedFile: UploadedFile) => {
    setFiles(prevFiles => [...prevFiles, uploadedFile]);
  };

  const handleFileDelete = async (path: string) => {
    const fileRef = ref(storage, path);
    try {
      await deleteObject(fileRef);
      setFiles(prevFiles => prevFiles.filter(f => f.fullPath !== path));
      toast({
          title: "Archivo Eliminado",
          description: `El archivo fue eliminado exitosamente.`,
      });
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
          variant: "destructive",
          title: "Error al Eliminar",
          description: "No se pudo eliminar el archivo.",
      });
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedFiles = useMemo(() => {
    const sorted = [...files].sort((a, b) => {
      if (sortKey === 'size') {
        return a.size - b.size;
      }
      if (sortKey === 'uploadedAt') {
        return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
      }
      return a[sortKey].localeCompare(b[sortKey]);
    });

    if (sortDirection === 'desc') {
      return sorted.reverse();
    }
    return sorted;
  }, [files, sortKey, sortDirection]);


  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold font-headline text-primary">Firebase Storage Uploader</h1>
        <p className="text-muted-foreground mt-2">
          Sube y gestiona archivos directamente en Firebase Storage con esta interfaz.
        </p>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <FileUploader onUploadSuccess={handleUploadSuccess} />
        </div>
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-semibold mb-4">Archivos Subidos</h2>
          <FileList 
            files={sortedFiles} 
            onFileDelete={handleFileDelete}
            isLoading={isLoading}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        </div>
      </main>
    </div>
  );
}
