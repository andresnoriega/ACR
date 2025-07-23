
'use client';
import type { FC } from 'react';
import { useState, useEffect, useCallback } from 'react';
import type { FiveWhyEntry } from '@/types/rca';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, HelpCircle, Check, X, Loader2, AlertTriangle, SearchCheck } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

const generateClientSideId = (prefix: string) => {
    const randomPart = Math.random().toString(36).substring(2, 9);
    const timePart = Date.now().toString(36);
    return `${prefix}-${timePart}-${randomPart}`;
};

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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar Validación/Rechazo de Causa</DialogTitle>
          <DialogDescription>
            Por favor, ingrese el método o justificación utilizado para validar o rechazar esta causa.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="five-why-validation-method">Método de Validación/Rechazo <span className="text-destructive">*</span></Label>
          <Textarea
            id="five-why-validation-method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="Ej: Revisión de bitácora, entrevista con operador, evidencia física encontrada, etc."
            className="mt-1"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isProcessing}>Cancelar</Button>
          </DialogClose>
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
    const [validationState, setValidationState] = useState<{ id: string; status: 'accepted' | 'rejected' } | null>(null);
    const [isProcessingValidation, setIsProcessingValidation] = useState(false);
    const [isRootCauseConfirmOpen, setIsRootCauseConfirmOpen] = useState(false);
    const [rootCauseCandidateId, setRootCauseCandidateId] = useState<string | null>(null);

    useEffect(() => {
      setInternalData(fiveWhysData || []);
    }, [fiveWhysData]);

    const hasRootCause = internalData.some(e => e.isRootCause);
    const lastEntry = internalData.length > 0 ? internalData[internalData.length - 1] : null;
    const lastEntryStatus = lastEntry?.status;

    const handleAddEntry = () => {
        if (hasRootCause) {
            toast({ title: "Análisis Completo", description: "Ya se ha identificado una causa raíz. No se pueden añadir más 'porqués'.", variant: "default"});
            return;
        }
        if (lastEntryStatus === 'rejected') {
            toast({ title: "Acción Bloqueada", description: "La última causa fue rechazada. No se puede continuar esta línea de análisis.", variant: "destructive"});
            return;
        }

        const lastWhy = lastEntry?.because ? `¿Por qué: "${lastEntry.because.substring(0, 70)}..."?` : '';
        const newData = [...internalData, { id: generateClientSideId('5why'), why: lastWhy, because: '', status: 'pending' }];
        setInternalData(newData);
        onSetFiveWhysData(newData);
    };

    const handleUpdateEntry = (id: string, field: 'why' | 'because', value: string) => {
        const newData = internalData.map(entry => entry.id === id ? { ...entry, [field]: value } : entry);
        setInternalData(newData);
        onSetFiveWhysData(newData);
    };

    const handleRemoveEntry = (id: string) => {
        const newData = internalData.filter(entry => entry.id !== id);
        setInternalData(newData);
        onSetFiveWhysData(newData);
    };
    
    const handleToggleStatus = (id: string, status: 'accepted' | 'rejected') => {
        const entry = internalData.find(e => e.id === id);
        if (entry?.status === status) {
            const newData = internalData.map(e => e.id === id ? { ...e, status: 'pending', isRootCause: false, validationMethod: undefined } : e);
            setInternalData(newData);
            onSetFiveWhysData(newData);
        } else {
            setValidationState({ id, status });
        }
    };
    
    const handleConfirmValidation = useCallback((method: string) => {
      if (!validationState) return;
      setIsProcessingValidation(true);
      const { id, status } = validationState;
  
      const newData = internalData.map(e => {
        if (e.id === id) {
          return {
            ...e,
            status,
            validationMethod: method,
            isRootCause: status === 'rejected' ? false : e.isRootCause,
          };
        }
        return e;
      });
      
      setInternalData(newData);
      onSetFiveWhysData(newData);
      setIsProcessingValidation(false);
      setValidationState(null); 
    }, [internalData, onSetFiveWhysData, validationState]);
    
    const handleSetRootCause = () => {
        if (!rootCauseCandidateId) return;
        const newData = internalData.map(e =>
            e.id === rootCauseCandidateId ? { ...e, isRootCause: true } : e
        );
        setInternalData(newData);
        onSetFiveWhysData(newData);
        setIsRootCauseConfirmOpen(false);
        setRootCauseCandidateId(null);
    };
    
    const handleUnsetRootCause = (id: string) => {
        const newData = internalData.map(e =>
            e.id === id ? { ...e, isRootCause: false } : e
        );
        setInternalData(newData);
        onSetFiveWhysData(newData);
    };

  return (
      <>
      <Card className="shadow-lg">
        <CardHeader><CardTitle className="text-xl font-semibold font-headline text-primary flex items-center"><HelpCircle className="mr-2 h-6 w-6" />Análisis de los 5 Porqués</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {internalData.map((entry, index) => (
            <Card key={entry.id} className={cn("p-4 space-y-2", entry.isRootCause ? 'border-2 border-primary' : entry.status === 'accepted' ? 'border-green-200 dark:border-green-700' : entry.status === 'rejected' ? 'border-red-200 dark:border-red-700' : 'border-border')}>
              <div className="flex justify-between items-start">
                <div className="space-y-1 flex-grow">
                    <Label htmlFor={`why-${entry.id}`} className="font-semibold text-primary">#{index + 1} ¿Por qué?</Label>
                    <Textarea id={`why-${entry.id}`} value={entry.why} onChange={(e) => handleUpdateEntry(entry.id, 'why', e.target.value)} placeholder={`Ej: ¿Por qué ocurrió: ${eventFocusDescription.substring(0,50)}...?`} rows={2} />
                    <Label htmlFor={`because-${entry.id}`} className="font-semibold text-primary/90">Porque...</Label>
                    <Textarea id={`because-${entry.id}`} value={entry.because} onChange={(e) => handleUpdateEntry(entry.id, 'because', e.target.value)} placeholder="Describa la razón o causa..." rows={2} />
                </div>
                 <div className="flex flex-col gap-1 ml-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveEntry(entry.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                 </div>
              </div>

               <div className="pt-2 border-t mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Button variant={entry.status === 'accepted' ? 'secondary' : 'ghost'} size="sm" className="h-8" onClick={() => handleToggleStatus(entry.id, 'accepted')}><Check className="mr-1 h-4 w-4 text-green-600"/> Aceptar</Button>
                    <Button variant={entry.status === 'rejected' ? 'secondary' : 'ghost'} size="sm" className="h-8" onClick={() => handleToggleStatus(entry.id, 'rejected')}><X className="mr-1 h-4 w-4 text-destructive"/> Rechazar</Button>
                </div>
                {entry.isRootCause ? (
                    <Button onClick={() => handleUnsetRootCause(entry.id)} variant="destructive" size="sm" className="w-full sm:w-auto">
                       <SearchCheck className="mr-2 h-4 w-4" /> Anular Causa Raíz
                    </Button>
                 ) : (
                    <Button onClick={() => { setRootCauseCandidateId(entry.id); setIsRootCauseConfirmOpen(true); }} variant="outline" size="sm" className="w-full sm:w-auto" disabled={entry.status !== 'accepted'}>
                       <SearchCheck className="mr-2 h-4 w-4" /> Marcar como Causa Raíz
                    </Button>
                 )}
              </div>
              {entry.validationMethod && (
                <div className="text-xs text-muted-foreground pt-2 mt-2 border-t">
                  <span className="font-semibold">Justificación V/R:</span> {entry.validationMethod}
                </div>
              )}
            </Card>
          ))}
          <Button onClick={handleAddEntry} variant="outline" className="w-full" disabled={hasRootCause || lastEntryStatus === 'rejected'}>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Siguiente ¿Por qué?
          </Button>
        </CardContent>
      </Card>
      
      {validationState && (
        <ValidationDialog
          isOpen={!!validationState}
          onOpenChange={(open) => { if (!open) setValidationState(null); }}
          onConfirm={handleConfirmValidation}
          isProcessing={isProcessingValidation}
        />
      )}
      
      <AlertDialog open={isRootCauseConfirmOpen} onOpenChange={setIsRootCauseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Causa Raíz</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Es posible aplicar una solución definitiva y factible para esta causa? Al confirmar, esta será designada como la causa raíz principal del análisis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRootCauseCandidateId(null)}>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleSetRootCause}>Sí, es la Causa Raíz</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>
  );
};
