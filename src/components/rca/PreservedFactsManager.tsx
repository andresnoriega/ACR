'use client';

import type { FC } from 'react';
import { useState } from 'react';
import type { PreservedFact } from '@/types/rca';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, ImageIcon, FileText, Link2, Paperclip, Loader2, ExternalLink, AlertTriangle, UploadCloud } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { sanitizeForFirestore } from '@/lib/utils';

let idCounter = Date.now();
const generateClientSideId = (prefix: string) => {
    idCounter++;
    return `${prefix}-${idCounter}`;
};

const getEvidenceIconLocal = (fileType?: string) => {
  if (!fileType) return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />;
  const simplifiedType = fileType.split('/')[1] || fileType;
  switch (simplifiedType) {
    case 'pdf': return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-red-600" />;
    case 'jpeg': case 'jpg': case 'png': case 'gif': return <ImageIcon className="h-4 w-4 mr-2 flex-shrink-0 text-blue-600" />;
    case 'msword':
    case 'vnd.openxmlformats-officedocument.wordprocessingml.document':
      return <Paperclip className="h-4 w-4 mr-2 flex-shrink-0 text-sky-700" />;
    default: return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />;
  }
};


interface PreservedFactsManagerProps {
  analysisId: string | null;
  preservedFacts: PreservedFact[];
  onEvidenceAdded: () => void;
}

export const PreservedFactsManager: FC<PreservedFactsManagerProps> = ({ analysisId, preservedFacts, onEvidenceAdded }) => {
  const { toast } = useToast();
  const [newFactName, setNewFactName] = useState('');
  const [isAddingFact, setIsAddingFact] = useState(false);
  const [isUploading, setIsUploading] = useState<string | null>(null);

  const handleAddFact = async () => {
    if (!analysisId) {
        toast({ title: "Acción Requerida", description: "Debe guardar el análisis al menos una vez para poder añadir hechos.", variant: "destructive" });
        return;
    }
    if (!newFactName.trim()) {
        toast({ title: "Nombre Requerido", description: "El nombre del hecho preservado no puede estar vacío.", variant: "destructive" });
        return;
    }

    setIsAddingFact(true);
    const newFact: PreservedFact = {
      id: generateClientSideId('pf'),
      nombre: newFactName.trim(),
      uploadDate: new Date().toISOString(),
    };

    try {
        const rcaDocRef = doc(db, 'rcaAnalyses', analysisId);
        await updateDoc(rcaDocRef, {
            preservedFacts: arrayUnion(sanitizeForFirestore(newFact)),
            updatedAt: new Date().toISOString(),
        });
        toast({ title: "Hecho Creado", description: "Ahora puede adjuntar un archivo a este hecho." });
        onEvidenceAdded();
        setNewFactName('');
    } catch (error: any) {
        console.error("Error creating preserved fact:", error);
        toast({ title: "Error al Crear Hecho", description: `No se pudo guardar el nuevo hecho: ${error.message}`, variant: "destructive" });
    } finally {
        setIsAddingFact(false);
    }
  };
  
  const handleFileUpload = async (factId: string, file: File) => {
    if (!analysisId) return;
    
    if (file.size > 700 * 1024) {
      toast({ title: "Archivo Demasiado Grande", description: "El archivo no puede superar los 700 KB.", variant: "destructive" });
      return;
    }

    setIsUploading(factId);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
      });

      const rcaDocRef = doc(db, 'rcaAnalyses', analysisId);
      const docSnap = await getDoc(rcaDocRef);
      if(!docSnap.exists()) throw new Error("Documento de análisis no encontrado.");

      const currentDocData = docSnap.data();
      const currentFacts = currentDocData.preservedFacts || [];
      
      const updatedFacts = currentFacts.map((fact: PreservedFact) => {
        if (fact.id === factId) {
          return {
            ...fact,
            fileName: file.name,
            fileType: file.type,
            dataUrl: dataUrl,
          };
        }
        return fact;
      });

      await updateDoc(rcaDocRef, {
          preservedFacts: sanitizeForFirestore(updatedFacts),
          updatedAt: new Date().toISOString()
      });

      toast({ title: "Archivo Adjuntado", description: `Se adjuntó ${file.name} al hecho.` });
      onEvidenceAdded();
    } catch (error: any) {
        console.error("Error uploading file for fact:", error);
        toast({ title: "Error al Adjuntar", description: `No se pudo adjuntar el archivo: ${error.message}`, variant: "destructive" });
    } finally {
        setIsUploading(null);
    }
  };

  const handleRemoveFact = async (factToRemove: PreservedFact) => {
    if (!analysisId) return;
    
    setIsAddingFact(true); // Reuse isAddingFact state to disable all buttons
    try {
      const rcaDocRef = doc(db, 'rcaAnalyses', analysisId);
      await updateDoc(rcaDocRef, {
        preservedFacts: arrayRemove(sanitizeForFirestore(factToRemove)),
        updatedAt: new Date().toISOString(),
      });
      toast({ title: "Hecho Eliminado", variant: 'destructive' });
      onEvidenceAdded();
    } catch (error) {
      console.error("Error removing preserved fact:", error);
      toast({ title: "Error", description: `No se pudo eliminar el hecho: ${(error as Error).message}`, variant: "destructive" });
    } finally {
      setIsAddingFact(false);
    }
  };

  return (
    <Card className="shadow-inner bg-secondary/20">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center">
          <Paperclip className="mr-2 h-5 w-5 text-primary" />
          Preservación de Hechos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!analysisId && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
            <p className="font-bold">Acción Requerida</p>
            <p>Debe guardar el avance del análisis al menos una vez para poder añadir hechos preservados. Utilice el botón "Guardar Avance" al final de la página.</p>
          </div>
        )}
        
        <div className="space-y-3 p-3 border rounded-md bg-background" style={{ opacity: !analysisId ? 0.5 : 1 }}>
          <div className="flex items-end gap-2">
            <div className="flex-grow">
                <Label htmlFor="new-fact-name">Nombre del Nuevo Hecho Preservado</Label>
                <Input 
                    id="new-fact-name" 
                    value={newFactName} 
                    onChange={(e) => setNewFactName(e.target.value)} 
                    placeholder="Ej: Foto del sensor dañado, Entrevista a Testigo"
                    disabled={!analysisId || isAddingFact}
                />
            </div>
            <Button onClick={handleAddFact} size="sm" disabled={!analysisId || isAddingFact || !newFactName.trim()}>
              {isAddingFact ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} 
              Añadir Hecho
            </Button>
          </div>
        </div>

        <div className="space-y-2 pt-2">
            <h4 className="font-semibold text-primary mb-1">Hechos Creados</h4>
            {preservedFacts && preservedFacts.length > 0 ? (
                <ul className="space-y-2">
                    {preservedFacts.map(fact => (
                        <li key={fact.id} className="flex flex-col gap-2 border p-3 rounded-md bg-background">
                            <div className="flex items-center justify-between">
                                <p className="font-medium text-sm">{fact.nombre}</p>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveFact(fact)} disabled={isAddingFact || !!isUploading}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                            {fact.dataUrl ? (
                                <div className="flex items-center justify-between text-xs bg-green-50 p-2 rounded-md">
                                    <div className="flex items-center">
                                        {getEvidenceIconLocal(fact.fileType)}
                                        <span className="font-semibold">{fact.fileName}</span>
                                    </div>
                                    <a href={fact.dataUrl} target="_blank" rel="noopener noreferrer" download={fact.fileName} className="text-blue-600 hover:underline flex items-center">
                                        <ExternalLink className="mr-1 h-3 w-3" />Ver/Descargar
                                    </a>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Label htmlFor={`upload-${fact.id}`} className="sr-only">Adjuntar archivo</Label>
                                    <Input 
                                        id={`upload-${fact.id}`}
                                        type="file" 
                                        className="text-xs h-8 flex-grow"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                handleFileUpload(fact.id, e.target.files[0]);
                                            }
                                        }}
                                        disabled={isUploading === fact.id}
                                    />
                                    {isUploading === fact.id && <Loader2 className="h-4 w-4 animate-spin" />}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-xs text-muted-foreground italic text-center py-4">No hay hechos preservados para este análisis.</p>
            )}
        </div>
      </CardContent>
    </Card>
  );
};
