'use client';

import { useState, type FC, type ChangeEvent } from 'react';
import type { PreservedFact } from '@/types/rca';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, Edit2, Loader2, FileArchive, FileText, ImageIcon, Paperclip, ExternalLink, Link2 } from 'lucide-react';
import { format } from 'date-fns';

const MAX_FILE_SIZE_KB = 700; // Safe limit to avoid Firestore's 1MiB document limit.

interface PreservedFactsManagerProps {
  analysisId: string | null;
  preservedFacts: PreservedFact[];
  onAddFact: (factMetadata: Omit<PreservedFact, 'id' | 'eventId' | 'uploadDate' | 'downloadURL' | 'storagePath'>, file: File) => Promise<void>;
  onRemoveFact: (factId: string) => Promise<void>;
  isSaving: boolean;
}

const getEvidenceIcon = (tipo?: PreservedFact['tipo']) => {
    if (!tipo) return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />;
    if (tipo.startsWith('image/')) return <ImageIcon className="h-4 w-4 mr-2 flex-shrink-0 text-blue-600" />;
    if (tipo === 'application/pdf') return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-red-600" />;
    if (tipo.includes('word')) return <Paperclip className="h-4 w-4 mr-2 flex-shrink-0 text-sky-700" />;
    if (tipo === 'link') return <Link2 className="h-4 w-4 mr-2 flex-shrink-0 text-indigo-600" />;
    return <FileArchive className="h-4 w-4 mr-2 flex-shrink-0 text-gray-600" />;
};


export const PreservedFactsManager: FC<PreservedFactsManagerProps> = ({
  analysisId,
  preservedFacts,
  onAddFact,
  onRemoveFact,
  isSaving,
}) => {
  const { toast } = useToast();
  const [userGivenName, setUserGivenName] = useState('');
  const [comment, setComment] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit for Storage, can be higher
        toast({
          title: "Archivo Demasiado Grande",
          description: `El archivo no puede superar los 2MB.`,
          variant: "destructive",
        });
        setSelectedFile(null);
        event.target.value = '';
        return;
      }
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleAddClick = async () => {
    if (!userGivenName.trim()) {
      toast({ title: "Nombre Requerido", description: "Por favor, asigne un nombre al hecho preservado.", variant: "destructive" });
      return;
    }
    if (!selectedFile) {
        toast({ title: "Archivo Requerido", description: "Por favor, seleccione un archivo para adjuntar.", variant: "destructive" });
        return;
    }

    setIsProcessing(true);
    const newFactPayload: Omit<PreservedFact, 'id' | 'eventId' | 'uploadDate' | 'downloadURL' | 'storagePath'> = {
        userGivenName,
        nombre: selectedFile.name,
        tipo: selectedFile.type,
        comment: comment.trim() || undefined,
    };
    
    await onAddFact(newFactPayload, selectedFile);

    // Reset form
    setUserGivenName('');
    setComment('');
    setSelectedFile(null);
    const fileInput = document.getElementById('preserved-fact-file') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    
    setIsProcessing(false);
  };

  const isFormDisabled = isSaving || isProcessing;

  return (
    <div className="space-y-4 pt-4 border-t">
      <h3 className="text-lg font-semibold font-headline flex items-center">
        <FileArchive className="mr-2 h-5 w-5 text-primary" />
        Preservación de Hechos (Anexos)
      </h3>

      <Card className="p-4 bg-secondary/30">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="preserved-fact-name">Nombre del Hecho Preservado <span className="text-destructive">*</span></Label>
                <Input
                    id="preserved-fact-name"
                    value={userGivenName}
                    onChange={(e) => setUserGivenName(e.target.value)}
                    placeholder="Ej: Foto de la Falla, Bitácora del día, etc."
                    disabled={isFormDisabled}
                />
             </div>
             <div className="space-y-2">
                <Label htmlFor="preserved-fact-file">Archivo (Máx 2MB) <span className="text-destructive">*</span></Label>
                 <Input
                    id="preserved-fact-file"
                    type="file"
                    onChange={handleFileChange}
                    disabled={isFormDisabled}
                />
             </div>
             <div className="space-y-2 md:col-span-2">
                 <Label htmlFor="preserved-fact-comment">Comentario (Opcional)</Label>
                <Textarea
                    id="preserved-fact-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Añada una breve descripción o contexto para este archivo."
                    rows={2}
                    disabled={isFormDisabled}
                />
             </div>
         </div>
         <Button onClick={handleAddClick} disabled={isFormDisabled || !selectedFile || !userGivenName.trim()} className="mt-4">
             {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
             Añadir Hecho Preservado
         </Button>
      </Card>

      <div className="space-y-2 pt-4">
        <h4 className="font-semibold">Hechos Preservados Adjuntos</h4>
        {(preservedFacts || []).length > 0 ? (
          preservedFacts.map((fact) => (
            <Card key={fact.id} className="p-3 flex items-center justify-between">
              <div className="flex items-center flex-grow min-w-0">
                  {getEvidenceIcon(fact.tipo)}
                  <div className="flex-grow min-w-0">
                    <p className="font-medium truncate" title={fact.userGivenName}>{fact.userGivenName}</p>
                    <p className="text-xs text-muted-foreground truncate" title={fact.nombre}>{fact.nombre} - Subido el {format(new Date(fact.uploadDate), "dd/MM/yy 'a las' HH:mm")}</p>
                    {fact.comment && <p className="text-xs italic text-muted-foreground truncate" title={fact.comment}>"{fact.comment}"</p>}
                  </div>
              </div>
              <div className="flex-shrink-0 ml-2 flex items-center gap-2">
                {fact.downloadURL && (
                    <Button asChild variant="link" size="sm">
                        <a href={fact.downloadURL} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-1.5 h-3 w-3"/> Ver/Descargar
                        </a>
                    </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-destructive/10"
                  onClick={() => onRemoveFact(fact.id)}
                  disabled={isFormDisabled}
                  aria-label="Eliminar hecho preservado"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground italic">No hay hechos preservados adjuntos a este análisis.</p>
        )}
      </div>
    </div>
  );
};