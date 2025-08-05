
"use client";

import { useState, useRef, type FC } from 'react';
import { storage, db } from '@/lib/firebase';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { formatBytes, sanitizeForFirestore } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import type { PreservedFact } from '@/types/rca';
import type { UploadedFile } from '@/app/page';
import FileUploader from '../file-uploader';
import FileList from '../file-list';

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
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleUploadSuccess = async (uploadedFile: UploadedFile) => {
    setIsLoading(true);
    let currentAnalysisId = analysisId;
    
    // Ensure we have an analysis ID to associate the file with.
    if (!currentAnalysisId) {
      currentAnalysisId = await onAnalysisSaveRequired();
    }

    if (!currentAnalysisId) {
      toast({
        title: "Error Crítico",
        description: "No se pudo obtener un ID para el análisis. Guarde el progreso e intente de nuevo.",
        variant: "destructive"
      });
      // Try to delete the orphaned file from storage
      const orphanRef = storageRef(storage, uploadedFile.fullPath);
      await deleteObject(orphanRef);
      setIsLoading(false);
      return;
    }

    const newFact: PreservedFact = {
      id: `fact-${Date.now()}`,
      userGivenName: uploadedFile.name, // Use original file name as default
      nombre: uploadedFile.name,
      size: uploadedFile.size,
      tipo: uploadedFile.type,
      downloadURL: uploadedFile.url,
      storagePath: uploadedFile.fullPath,
      uploadDate: uploadedFile.uploadedAt,
      tags: uploadedFile.tags,
    };
    
    try {
      const rcaDocRef = doc(db, "rcaAnalyses", currentAnalysisId);
      await updateDoc(rcaDocRef, {
        preservedFacts: arrayUnion(sanitizeForFirestore(newFact)),
        updatedAt: new Date().toISOString()
      });
      
      setPreservedFacts(prev => [...(prev || []), newFact]);
      toast({ title: "Hecho Preservado Añadido", description: `${newFact.userGivenName} fue guardado en el análisis.` });
    } catch (error: any) {
      console.error("Error updating Firestore:", error);
      toast({
        title: "Error al Guardar Referencia",
        description: "El archivo se subió pero no se pudo guardar en el análisis. Intente de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFact = async (storagePath: string) => {
    if (!analysisId) {
      toast({ title: "Error", description: "ID del análisis no encontrado.", variant: "destructive" });
      return;
    }
    const factToRemove = preservedFacts.find(fact => fact.storagePath === storagePath);
    if (!factToRemove) return;
    
    setIsLoading(true);
    
    try {
      // Delete from storage
      const fileRef = storageRef(storage, factToRemove.storagePath);
      await deleteObject(fileRef);
      
      // Remove from Firestore document
      const rcaDocRef = doc(db, "rcaAnalyses", analysisId);
      await updateDoc(rcaDocRef, {
          preservedFacts: arrayRemove(sanitizeForFirestore(factToRemove)),
          updatedAt: new Date().toISOString()
      });
      
      setPreservedFacts(prev => prev.filter(fact => fact.storagePath !== storagePath));
      toast({ title: "Hecho Preservado Eliminado", variant: 'destructive' });

    } catch (error: any) {
      console.error("Error al eliminar hecho preservado:", error);
      toast({ title: "Error de Eliminación", description: `No se pudo eliminar el hecho: ${error.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Subir Nuevo Hecho Preservado</CardTitle>
          <CardDescription>Suba un archivo (imagen, documento, etc.) para preservarlo como evidencia. La IA generará etiquetas automáticamente.</CardDescription>
        </CardHeader>
        <CardContent>
          <FileUploader onUploadSuccess={handleUploadSuccess} />
        </CardContent>
      </Card>
      
      <div className="space-y-2 pt-4">
        <h4 className="font-semibold">Hechos Preservados Adjuntos</h4>
        {/* The FileList component will be added in a future step, for now we just show a message */}
        {(preservedFacts || []).length > 0 ? (
          <p className="text-sm text-muted-foreground">{preservedFacts.length} hecho(s) preservado(s) adjunto(s).</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">No hay hechos preservados adjuntos a este análisis.</p>
        )}
      </div>
    </div>
  );
};

export default PreservedFactsManager;

    