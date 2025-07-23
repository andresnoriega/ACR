
'use client';
import type { FC } from 'react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { FiveWhyEntry } from '@/types/rca';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, HelpCircle, Check, X, Loader2, Target, AlertTriangle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const generateClientSideId = (prefix: string) => {
    const randomPart = Math.random().toString(36).substring(2, 9);
    const timePart = Date.now().toString(36);
    return `${prefix}-${timePart}-${randomPart}`;
};

// --- Validation Dialog Component (similar to CTM) ---
interface ValidationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (method: string) => void;
  isProcessing: boolean;
}

const ValidationDialog: FC<ValidationDialogProps> = ({ isOpen, onOpenChange, onConfirm, isProcessing }) => {
  const [method, setMethod] = useState('');

  const handleConfirmClick = () => {
    if (method.trim()) {
      onConfirm(method);
    }
  };
  
  useEffect(() => {
    if (isOpen) {
      setMethod('');
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {if(!isProcessing) onOpenChange(open)}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar Validación/Rechazo de Causa</DialogTitle>
          <DialogDescription>
            Por favor, ingrese el método o justificación utilizado para validar o rechazar esta causa.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="validationMethod">Método de Validación/Rechazo <span className="text-destructive">*</span></Label>
          <Textarea
            id="validationMethod"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="Ej: Revisión de bitácora, entrevista con operador, evidencia física, etc."
            className="mt-1"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline" disabled={isProcessing}>Cancelar</Button></DialogClose>
          <Button onClick={handleConfirmClick} disabled={!method.trim() || isProcessing}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


interface FiveWhysInteractiveProps {
  fiveWhysData: FiveWhyEntry[];
  onSetFiveWhysData: (data: FiveWhyEntry[]) => void;
  eventFocusDescription: string;
}

export const FiveWhysInteractive: FC<FiveWhysInteractiveProps> = ({
  fiveWhysData,
  onSetFiveWhysData,
  eventFocusDescription,
}) => {
    const { toast } = useToast();
    const [internalData, setInternalData] = useState<FiveWhyEntry[]>([]);
    const [validationState, setValidationState] = useState<{ entryId: string; status: 'accepted' | 'rejected' } | null>(null);
    const [isProcessingValidation, setIsProcessingValidation] = useState(false);
    const [rootCauseCandidate, setRootCauseCandidate] = useState<FiveWhyEntry | null>(null);

    useEffect(() => {
        const initialData = (fiveWhysData && fiveWhysData.length > 0) ? fiveWhysData : [{ id: generateClientSideId('5why'), why: `¿Por qué ocurrió: "${eventFocusDescription.substring(0,70)}..."?`, because: '', status: 'pending', isRootCause: false }];
        setInternalData(initialData);
    }, [fiveWhysData, eventFocusDescription]);

    const updateParentState = (newData: FiveWhyEntry[]) => {
        onSetFiveWhysData(newData);
    };
    
    const lastEntry = internalData.length > 0 ? internalData[internalData.length - 1] : null;
    const hasIdentifiedRootCause = useMemo(() => internalData.some(entry => entry.isRootCause), [internalData]);
    const isLastEntryRejected = useMemo(() => lastEntry?.status === 'rejected', [lastEntry]);

    const handleAddEntry = () => {
        if (hasIdentifiedRootCause) {
            toast({ title: "Análisis Detenido", description: "Ya se ha identificado una Causa Raíz. No se pueden añadir más 'Porqués'.", variant: "default" });
            return;
        }
        if (isLastEntryRejected) {
             toast({ title: "Análisis Detenido", description: "La última causa fue rechazada. No se puede continuar esta línea de investigación.", variant: "destructive" });
             return;
        }
        const lastWhy = lastEntry?.because ? `¿Por qué: "${lastEntry.because.substring(0, 70)}..."?` : '';
        const newData = [...internalData, { id: generateClientSideId('5why'), why: lastWhy, because: '', status: 'pending', isRootCause: false }];
        setInternalData(newData);
        updateParentState(newData);
    };

    const handleUpdateEntry = (id: string, field: 'why' | 'because', value: string) => {
        const newData = internalData.map(entry => entry.id === id ? { ...entry, [field]: value } : entry);
        setInternalData(newData);
        updateParentState(newData);
    };

    const handleRemoveEntry = (id: string) => {
        const newData = internalData.filter(entry => entry.id !== id);
        setInternalData(newData);
        updateParentState(newData);
    };

    const handleToggleStatus = (entryId: string, status: 'accepted' | 'rejected') => {
        const entry = internalData.find(e => e.id === entryId);
        if (entry && entry.status === status) { // If clicking the same button again
            const newData = internalData.map(e => e.id === entryId ? { ...e, status: 'pending', validationMethod: undefined } : e);
            setInternalData(newData);
            updateParentState(newData);
        } else {
            setValidationState({ entryId, status });
        }
    };
    
    const handleConfirmValidation = (method: string) => {
        if (!validationState) return;
        setIsProcessingValidation(true);
        
        // Using a function for setState to ensure we have the latest state
        setInternalData(currentData => {
            const { entryId, status } = validationState;
            const newData = currentData.map(entry => 
                entry.id === entryId 
                    ? { ...entry, status, validationMethod: method } 
                    : entry
            );
            updateParentState(newData); // Propagate change to parent
            return newData; // Return new state for internal state update
        });

        // Close dialog and reset processing state
        setValidationState(null);
        setIsProcessingValidation(false);
    };

    const handleSetRootCause = (entry: FiveWhyEntry) => {
        if (entry.isRootCause) { // Anular
            const newData = internalData.map(e => e.id === entry.id ? { ...e, isRootCause: false } : e);
            setInternalData(newData);
            updateParentState(newData);
            toast({ title: "Causa Raíz Anulada" });
        } else if (entry.status === 'accepted') {
            setRootCauseCandidate(entry); // Open confirmation dialog
        }
    };

    const confirmRootCause = () => {
        if (!rootCauseCandidate) return;
        const newData = internalData.map(e => ({
            ...e,
            isRootCause: e.id === rootCauseCandidate.id,
        }));
        setInternalData(newData);
        updateParentState(newData);
        toast({ title: "Causa Raíz Identificada", className: "bg-primary text-primary-foreground" });
        setRootCauseCandidate(null);
    };

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader><CardTitle className="text-xl font-semibold font-headline text-primary flex items-center"><HelpCircle className="mr-2 h-6 w-6" />Análisis de los 5 Porqués</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {internalData.map((entry, index) => (
            <Card key={entry.id} className={cn("p-4 space-y-2", entry.isRootCause ? 'border-2 border-primary' : entry.status === 'accepted' ? 'border-green-300 dark:border-green-700' : entry.status === 'rejected' ? 'border-red-300 dark:border-red-700' : 'border-border')}>
              <div className="flex justify-between items-start">
                <div className="space-y-1 flex-grow">
                    <Label htmlFor={`why-${entry.id}`} className="font-semibold text-primary">#{index + 1} ¿Por qué?</Label>
                    <Textarea id={`why-${entry.id}`} value={entry.why} onChange={(e) => handleUpdateEntry(entry.id, 'why', e.target.value)} placeholder={`Ej: ¿Por qué ocurrió: ${eventFocusDescription.substring(0,50)}...?`} rows={2} />
                    <Label htmlFor={`because-${entry.id}`} className="font-semibold text-primary/90">Porque...</Label>
                    <Textarea id={`because-${entry.id}`} value={entry.because} onChange={(e) => handleUpdateEntry(entry.id, 'because', e.target.value)} placeholder="Describa la razón o causa..." rows={2} />
                    {entry.validationMethod && (<div className="text-xs text-muted-foreground pt-1"><span className="font-semibold">Justificación:</span> {entry.validationMethod}</div>)}
                </div>
                <div className="flex flex-col gap-1 ml-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveEntry(entry.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t mt-2">
                 <Button size="sm" variant={entry.status === 'accepted' ? "secondary" : "outline"} onClick={() => handleToggleStatus(entry.id, 'accepted')}><Check className="mr-1 h-4 w-4 text-green-600"/> Aceptar</Button>
                 <Button size="sm" variant={entry.status === 'rejected' ? "secondary" : "outline"} onClick={() => handleToggleStatus(entry.id, 'rejected')}><X className="mr-1 h-4 w-4 text-red-600"/> Rechazar</Button>
                 {entry.status === 'accepted' && (
                    <Button size="sm" variant={entry.isRootCause ? "default" : "outline"} onClick={() => handleSetRootCause(entry)}>
                        <Target className="mr-1 h-4 w-4" />{entry.isRootCause ? "Anular Causa Raíz" : "Causa Raíz"}
                    </Button>
                 )}
              </div>
            </Card>
          ))}
          <Button onClick={handleAddEntry} variant="outline" className="w-full" disabled={hasIdentifiedRootCause || isLastEntryRejected}>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Siguiente ¿Por qué?
          </Button>
          {(hasIdentifiedRootCause || isLastEntryRejected) && (
              <div className="text-sm text-center text-muted-foreground p-2 bg-secondary/50 rounded-md flex items-center justify-center">
                <AlertTriangle className="mr-2 h-4 w-4 text-yellow-600"/>
                {hasIdentifiedRootCause ? "Se ha identificado la Causa Raíz. Análisis detenido." : "La última causa fue rechazada. Análisis detenido."}
              </div>
          )}
        </CardContent>
      </Card>
      {validationState && <ValidationDialog isOpen={!!validationState} onOpenChange={() => setValidationState(null)} onConfirm={handleConfirmValidation} isProcessing={isProcessingValidation} />}
      {rootCauseCandidate && (
        <AlertDialog open={!!rootCauseCandidate} onOpenChange={() => setRootCauseCandidate(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Causa Raíz</AlertDialogTitle>
                    <AlertDialogDescription>¿Es posible aplicar una solución definitiva y factible para esta causa: "{rootCauseCandidate.because}"?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setRootCauseCandidate(null)}>No</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmRootCause}>Sí</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};
