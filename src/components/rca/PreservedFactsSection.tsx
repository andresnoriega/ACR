'use client';
import { useState, type FC, type ChangeEvent } from 'react';
import { PreservedFact } from '@/types/rca';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, ClipboardList, FileText, Link2, ImageIcon, Paperclip, ExternalLink } from 'lucide-react';

const generateClientSideId = (prefix: string) => {
  const randomPart = Math.random().toString(36).substring(2, 9);
  const timePart = Date.now().toString(36);
  return `${prefix}-${timePart}-${randomPart}`;
};

const getEvidenceIconLocal = (tipo?: PreservedFact['tipo']) => {
  if (!tipo) return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />;
  const safeTipo = tipo?.toLowerCase() || 'other';
  switch (safeTipo) {
    case 'link': return <Link2 className="h-4 w-4 mr-2 flex-shrink-0 text-indigo-600" />;
    case 'pdf': return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-red-600" />;
    case 'jpg': case 'jpeg': case 'png': case 'gif': return <ImageIcon className="h-4 w-4 mr-2 flex-shrink-0 text-blue-600" />;
    case 'doc': case 'docx': return <Paperclip className="h-4 w-4 mr-2 flex-shrink-0 text-sky-700" />;
    default: return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />;
  }
};

interface PreservedFactsSectionProps {
  facts: PreservedFact[];
  onAddFact: (fact: PreservedFact) => void;
  onRemoveFact: (factId: string) => void;
  isSaving: boolean;
}

export const PreservedFactsSection: FC<PreservedFactsSectionProps> = ({ facts, onAddFact, onRemoveFact, isSaving }) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [comment, setComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 700 * 1024) { // ~700KB limit
        toast({
          title: "Archivo Demasiado Grande",
          description: "El archivo no puede superar los 700 KB para ser guardado directamente. Considere comprimirlo o enlazarlo desde un almacenamiento externo.",
          variant: "destructive",
          duration: 7000
        });
        e.target.value = '';
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSaveFact = async () => {
    if (!file) {
      toast({ title: "Sin Archivo", description: "Por favor, seleccione un archivo para guardar.", variant: "destructive" });
      return;
    }
    
    setIsProcessing(true);
    toast({ title: "Procesando Hecho...", description: `Convirtiendo ${file.name} a formato de guardado.`});

    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
      });

      const newFact: PreservedFact = {
        id: generateClientSideId('fact'),
        nombre: file.name,
        tipo: (file.type.split('/')[1] as PreservedFact['tipo']) || 'other',
        comment: comment.trim() || undefined,
        dataUrl: dataUrl,
      };

      onAddFact(newFact);
      toast({ title: "Hecho Añadido Localmente", description: `"${file.name}" está listo para ser guardado con el resto del análisis.` });
      
      // Reset form
      setFile(null);
      setComment('');
      const fileInput = document.getElementById('fact-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
        console.error("Error processing file to Data URL:", error);
        toast({ title: "Error al Procesar Archivo", description: `No se pudo leer el archivo: ${(error as Error).message}`, variant: "destructive"});
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <Card className="shadow-inner bg-secondary/20">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center">
            <ClipboardList className="mr-2 h-5 w-5 text-primary"/>
            Preservación de Hechos
        </CardTitle>
        <CardDescription>Adjunte archivos (fotos, documentos, etc.) que sirvan como evidencia objetiva del evento. Se guardarán al avanzar o guardar el paso.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-primary mb-1">[Hechos Adjuntos]</h4>
          {facts.length > 0 ? (
            <ul className="space-y-1.5">
              {facts.map(fact => (
                <li key={fact.id} className="flex items-start justify-between text-xs border p-2 rounded-md bg-background/50">
                  <div className="flex-grow">
                    <div className="flex items-center">{getEvidenceIconLocal(fact.tipo)}<span className="font-medium">{fact.nombre}</span></div>
                    {fact.comment && <p className="text-xs text-muted-foreground ml-[calc(1rem+0.5rem)] mt-0.5">Comentario: {fact.comment}</p>}
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <Button asChild variant="link" size="sm" className="p-0 h-auto text-xs mr-2"><a href={fact.dataUrl} target="_blank" rel="noopener noreferrer" download={fact.nombre}><ExternalLink className="mr-1 h-3 w-3" />Ver/Descargar</a></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/10" onClick={() => onRemoveFact(fact.id)} disabled={isSaving} aria-label="Eliminar hecho"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-muted-foreground">No hay hechos preservados.</p>}
        </div>

        <div className="pt-2">
          <h4 className="font-semibold text-primary mb-1">[Adjuntar nuevo hecho]</h4>
          <div className="space-y-2 p-3 border rounded-md bg-background/50">
            <Label htmlFor="fact-file-input">Archivo de Evidencia (Máx. 700 KB)</Label>
            <Input id="fact-file-input" type="file" onChange={handleFileChange} className="text-xs h-9" disabled={isSaving || isProcessing} />
            <Label htmlFor="fact-comment">Comentario para esta evidencia (opcional)</Label>
            <Input id="fact-comment" type="text" placeholder="Ej: Foto del componente dañado, registro de la bitácora..." value={comment} onChange={(e) => setComment(e.target.value)} className="text-xs h-9" disabled={isSaving || isProcessing} />
            <Button size="sm" onClick={handleSaveFact} disabled={isSaving || isProcessing || !file}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Guardar Hecho
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
