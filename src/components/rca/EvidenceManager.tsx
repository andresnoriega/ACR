'use client';

import type { FC } from 'react';
import { useState } from 'react';
import type { Evidence } from '@/types/rca';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, ImageIcon, FileText, Link2, Paperclip, Loader2, ExternalLink } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { sanitizeForFirestore } from '@/lib/utils';

let idCounter = Date.now();
const generateClientSideId = (prefix: string) => {
    idCounter++;
    return `${prefix}-${idCounter}`;
};

const getEvidenceIconLocal = (tipo?: string) => {
  if (!tipo) return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />;
  const simplifiedType = tipo.split('/')[1] || tipo;
  switch (simplifiedType) {
    case 'pdf': return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-red-600" />;
    case 'jpeg': case 'jpg': case 'png': case 'gif': return <ImageIcon className="h-4 w-4 mr-2 flex-shrink-0 text-blue-600" />;
    case 'msword':
    case 'vnd.openxmlformats-officedocument.wordprocessingml.document':
      return <Paperclip className="h-4 w-4 mr-2 flex-shrink-0 text-sky-700" />;
    default: return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />;
  }
};


interface EvidenceManagerProps {
  title: string;
  analysisId: string | null;
  evidences: Evidence[];
  onEvidenceAdded: () => void; // Callback to notify parent about data change
}

export const EvidenceManager: FC<EvidenceManagerProps> = ({ title, analysisId, evidences, onEvidenceAdded }) => {
  const { toast } = useToast();
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [evidenceComment, setEvidenceComment] = useState('');
  const [userGivenName, setUserGivenName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 700 * 1024) {
        toast({
          title: "Archivo Demasiado Grande",
          description: "El archivo no puede superar los 700 KB para ser guardado directamente.",
          variant: "destructive",
          duration: 7000,
        });
        setFileToUpload(null);
        event.target.value = '';
        return;
      }
      setFileToUpload(file);
      if (!userGivenName) {
        setUserGivenName(file.name);
      }
    } else {
      setFileToUpload(null);
    }
  };
  
  const handleAddClick = async () => {
    if (!analysisId) {
      toast({ title: "Error", description: "El análisis debe guardarse al menos una vez antes de añadir evidencias.", variant: "destructive" });
      return;
    }
    if (!fileToUpload) {
      toast({ title: "Archivo requerido", description: "Por favor, seleccione un archivo para adjuntar.", variant: "destructive" });
      return;
    }
    if (!userGivenName.trim()) {
      toast({ title: "Nombre requerido", description: "Por favor, asigne un nombre a la evidencia.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      toast({ title: "Procesando archivo...", description: `Convirtiendo ${fileToUpload.name} a Data URL.` });
      const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(fileToUpload);
      });
  
      const newEvidence: Evidence = {
        id: generateClientSideId('ev'),
        nombre: userGivenName.trim(),
        tipo: (fileToUpload.type as Evidence['tipo']) || 'other',
        comment: evidenceComment.trim() || undefined,
        dataUrl,
      };

      const rcaDocRef = doc(db, 'rcaAnalyses', analysisId);
      await updateDoc(rcaDocRef, {
          preservedFacts: arrayUnion(sanitizeForFirestore(newEvidence)),
          updatedAt: new Date().toISOString()
      });

      toast({ title: "Evidencia Guardada", description: `Se añadió "${newEvidence.nombre}" al análisis.` });
      onEvidenceAdded(); // Notify parent to refetch/update state
      
      // Reset form
      setFileToUpload(null);
      setEvidenceComment('');
      setUserGivenName('');
      const fileInput = document.getElementById('evidence-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error: any) {
      console.error("[handleAddClick] Error detallado:", error);
      toast({ title: "Error al Guardar Evidencia", description: `No se pudo procesar el archivo: ${error.message || 'Error desconocido'}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveEvidence = async (evidenceToRemove: Evidence) => {
    if (!analysisId) return;
    
    setIsSaving(true);
    try {
      const rcaDocRef = doc(db, 'rcaAnalyses', analysisId);
      await updateDoc(rcaDocRef, {
        preservedFacts: arrayRemove(sanitizeForFirestore(evidenceToRemove)),
        updatedAt: new Date().toISOString(),
      });
      toast({ title: "Evidencia Eliminada", variant: 'destructive' });
      onEvidenceAdded(); // Notify parent to refetch/update state
    } catch (error) {
      console.error("Error removing evidence:", error);
      toast({ title: "Error", description: `No se pudo eliminar la evidencia: ${(error as Error).message}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="shadow-inner bg-secondary/20">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center">
          <Paperclip className="mr-2 h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 p-3 border rounded-md bg-background">
          <div>
            <Label htmlFor="evidence-file-input">Archivo de Evidencia (Máx. 700 KB)</Label>
            <Input id="evidence-file-input" type="file" onChange={handleFileChange} className="text-xs h-9" disabled={isSaving} />
          </div>
           <div>
            <Label htmlFor="evidence-user-name">Nombre de la Evidencia</Label>
            <Input id="evidence-user-name" type="text" placeholder="Ej: Foto del sensor dañado" value={userGivenName} onChange={(e) => setUserGivenName(e.target.value)} disabled={isSaving} />
          </div>
          <div>
            <Label htmlFor="evidence-comment">Comentario (opcional)</Label>
            <Textarea id="evidence-comment" placeholder="Breve descripción o contexto de la evidencia..." value={evidenceComment} onChange={(e) => setEvidenceComment(e.target.value)} rows={2} disabled={isSaving}/>
          </div>
          <Button onClick={handleAddClick} size="sm" disabled={isSaving || !fileToUpload}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} 
            Guardar Hecho
          </Button>
        </div>

        <div className="space-y-2 pt-2">
            <h4 className="font-semibold text-primary mb-1">[Evidencias Adjuntas]</h4>
            {evidences && evidences.length > 0 ? (
                <ul className="space-y-1.5">
                    {evidences.map(ev => (
                        <li key={ev.id} className="flex items-start justify-between text-xs border p-2 rounded-md bg-background">
                            <div className="flex-grow">
                                <div className="flex items-center">{getEvidenceIconLocal(ev.tipo)}<span className="font-medium">{ev.nombre}</span></div>
                                {ev.comment && <p className="text-xs text-muted-foreground ml-[calc(1rem+0.5rem)] mt-0.5">Comentario: {ev.comment}</p>}
                            </div>
                            <div className="flex-shrink-0 ml-2">
                                <Button asChild variant="link" size="sm" className="p-0 h-auto text-xs mr-2"><a href={ev.dataUrl} target="_blank" rel="noopener noreferrer" download={ev.nombre}><ExternalLink className="mr-1 h-3 w-3" />Ver/Descargar</a></Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/10" onClick={() => handleRemoveEvidence(ev)} disabled={isSaving} aria-label="Eliminar evidencia"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-xs text-muted-foreground italic">No hay evidencias adjuntas para este análisis.</p>
            )}
        </div>
      </CardContent>
    </Card>
  );
};
