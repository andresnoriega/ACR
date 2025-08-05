
"use client";

import { useState, useRef, type FC, useEffect } from 'react';
import { storage, db } from '@/lib/firebase';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { formatBytes, sanitizeForFirestore } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PRESERVED_FACT_CATEGORIES, type PreservedFact, type PreservedFactCategory } from '@/types/rca';
import type { UploadedFile } from '@/app/page';
import FileUploader from '../file-uploader';
import { ExternalLink, Loader2, Save, Trash2 } from 'lucide-react';
import { cn } from "@/lib/utils"

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
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleUpdateFact = (id: string, field: 'category' | 'comment', value: string) => {
    setPreservedFacts(prev =>
      prev.map(fact =>
        fact.id === id ? { ...fact, [field]: value } : fact
      )
    );
    setEditingRowId(id);
  };
  
  const handleSaveFact = async (id: string) => {
    const factToSave = preservedFacts.find(fact => fact.id === id);
    if (!factToSave) return;

    if (!factToSave.category || !factToSave.comment?.trim()) {
        toast({
            title: "Campos Obligatorios",
            description: "Debe seleccionar una Categoría y añadir un Comentario para guardar el hecho.",
            variant: "destructive",
        });
        return;
    }

    let currentAnalysisId = analysisId;
    if (!currentAnalysisId) {
        currentAnalysisId = await onAnalysisSaveRequired();
    }
     if (!currentAnalysisId) {
      toast({
        title: "Error Crítico",
        description: "No se pudo obtener un ID para el análisis. Guarde el progreso e intente de nuevo.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
        const rcaDocRef = doc(db, "rcaAnalyses", currentAnalysisId);
        await updateDoc(rcaDocRef, {
            preservedFacts: sanitizeForFirestore(preservedFacts),
            updatedAt: new Date().toISOString()
        });
        
        toast({ title: "Hecho Actualizado", description: "Se guardaron los cambios para el hecho preservado." });
        setEditingRowId(null);
    } catch (error: any) {
        console.error("Error updating fact in Firestore:", error);
        toast({ title: "Error al Guardar", description: "No se pudo actualizar la información del hecho.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };


  const handleUploadSuccess = async (uploadedFile: UploadedFile) => {
    setIsLoading(true);
    let currentAnalysisId = analysisId;
    
    if (!currentAnalysisId) {
      currentAnalysisId = await onAnalysisSaveRequired();
    }

    if (!currentAnalysisId) {
      toast({
        title: "Error Crítico",
        description: "No se pudo obtener un ID para el análisis. Guarde el progreso e intente de nuevo.",
        variant: "destructive"
      });
      const orphanRef = storageRef(storage, uploadedFile.fullPath);
      await deleteObject(orphanRef).catch(err => console.error("Error deleting orphaned file:", err));
      setIsLoading(false);
      return;
    }

    const newFact: PreservedFact = {
      id: `fact-${Date.now()}`,
      userGivenName: uploadedFile.name,
      nombre: uploadedFile.name,
      size: uploadedFile.size,
      tipo: uploadedFile.type,
      downloadURL: uploadedFile.url,
      storagePath: uploadedFile.fullPath,
      uploadDate: uploadedFile.uploadedAt,
      tags: uploadedFile.tags,
      category: '',
      comment: '',
    };
    
    try {
      const rcaDocRef = doc(db, "rcaAnalyses", currentAnalysisId);
      const updatedFacts = [...(preservedFacts || []), newFact];
      await updateDoc(rcaDocRef, {
        preservedFacts: sanitizeForFirestore(updatedFacts),
        updatedAt: new Date().toISOString()
      });
      
      setPreservedFacts(updatedFacts);
      toast({ title: "Hecho Preservado Añadido", description: `${newFact.userGivenName} fue guardado. Ahora puede categorizarlo.` });
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

  const handleRemoveFact = async (factId: string) => {
    const factToRemove = preservedFacts.find(fact => fact.id === factId);
    if (!factToRemove) return;
    
    let currentAnalysisId = analysisId;
    if (!currentAnalysisId) {
       toast({ title: "Error", description: "ID del análisis no encontrado para eliminar el hecho.", variant: "destructive" });
       return;
    }

    setIsLoading(true);
    
    try {
      if (factToRemove.storagePath) {
        const fileRef = storageRef(storage, factToRemove.storagePath);
        await deleteObject(fileRef).catch(err => {
          if (err.code !== 'storage/object-not-found') {
            console.warn("Could not delete file from Storage, but proceeding to remove DB reference:", err);
          }
        });
      }
      
      const updatedFacts = preservedFacts.filter(fact => fact.id !== factId);
      const rcaDocRef = doc(db, "rcaAnalyses", currentAnalysisId);
      await updateDoc(rcaDocRef, {
          preservedFacts: sanitizeForFirestore(updatedFacts),
          updatedAt: new Date().toISOString()
      });

      setPreservedFacts(updatedFacts);
      
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
          <CardDescription>Suba un archivo (imagen, documento, etc.) para preservarlo como evidencia.</CardDescription>
        </CardHeader>
        <CardContent>
          <FileUploader onUploadSuccess={handleUploadSuccess} />
        </CardContent>
      </Card>
      
      <div className="space-y-4 pt-4">
        <h4 className="font-semibold text-lg">Hechos Preservados Adjuntos</h4>
        <Card>
          <CardContent className="p-0">
             <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Categoría <span className="text-destructive">*</span></TableHead>
                    <TableHead className="w-[30%]">Comentario <span className="text-destructive">*</span></TableHead>
                    <TableHead className="w-[25%]">Nombre del Archivo</TableHead>
                    <TableHead className="w-[15%] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(preservedFacts || []).length > 0 ? (
                    preservedFacts.map((fact) => (
                      <TableRow
                        key={fact.id}
                        className={cn(
                          "transition-colors",
                          editingRowId === fact.id ? "bg-yellow-50 dark:bg-yellow-900/20" : 
                          (!fact.category || !fact.comment?.trim()) ? "bg-red-50 dark:bg-red-900/20" : "bg-green-50 dark:bg-green-900/20"
                        )}
                      >
                        <TableCell>
                          <Select
                            value={fact.category}
                            onValueChange={(value) => handleUpdateFact(fact.id, 'category', value as PreservedFactCategory)}
                          >
                            <SelectTrigger><SelectValue placeholder="-- Seleccione una categoría --" /></SelectTrigger>
                            <SelectContent>
                              {PRESERVED_FACT_CATEGORIES.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={fact.comment || ''}
                            onChange={(e) => handleUpdateFact(fact.id, 'comment', e.target.value)}
                            placeholder="Añada un comentario..."
                          />
                        </TableCell>
                        <TableCell className="font-medium text-sm flex items-center">
                          <a
                            href={fact.downloadURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center hover:text-primary hover:underline"
                            title={fact.userGivenName}
                          >
                           <ExternalLink className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />
                           <span className="truncate">{fact.userGivenName}</span>
                          </a>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleSaveFact(fact.id)}
                                disabled={isLoading && editingRowId === fact.id}
                                className="h-8 w-8 hover:text-primary"
                                title="Guardar cambios de categoría y comentario"
                            >
                                {isLoading && editingRowId === fact.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4" />}
                            </Button>
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRemoveFact(fact.id)}
                                disabled={isLoading}
                                className="h-8 w-8 hover:text-destructive"
                                title="Eliminar hecho preservado"
                            >
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                        No hay hechos preservados adjuntos a este análisis.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PreservedFactsManager;
