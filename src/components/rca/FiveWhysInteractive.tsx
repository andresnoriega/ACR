
'use client';
import { FC, useCallback, useMemo, useState, useEffect } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { FiveWhyEntry } from '@/types/rca';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PlusCircle, Trash2, Check, X, HelpCircle, Loader2, Target } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';


interface FiveWhysValidationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (method: string) => void;
  isProcessing: boolean;
}

const FiveWhysValidationDialog: FC<FiveWhysValidationDialogProps> = ({ isOpen, onOpenChange, onConfirm, isProcessing }) => {
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
          <Label htmlFor="whyValidationMethod">Método de Validación/Rechazo <span className="text-destructive">*</span></Label>
          <Textarea
            id="whyValidationMethod"
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

interface RootCauseConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isProcessing: boolean;
}

const RootCauseConfirmationDialog: FC<RootCauseConfirmationDialogProps> = ({ isOpen, onOpenChange, onConfirm, isProcessing }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar como Causa Raíz</DialogTitle>
          <DialogDescription>
            ¿Es posible aplicar una solución definitiva y factible para esta causa?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
           <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            No
          </Button>
          <Button onClick={onConfirm} disabled={isProcessing}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sí
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

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const FiveWhysInteractive: FC<FiveWhysInteractiveProps> = ({ fiveWhysData, onSetFiveWhysData, eventFocusDescription }) => {
  const { toast } = useToast();
  const [validationState, setValidationState] = useState<{ index: number; status: NonNullable<FiveWhyEntry['status']> } | null>(null);
  const [isProcessingValidation, setIsProcessingValidation] = useState(false);
  const [rootCauseCandidateIndex, setRootCauseCandidateIndex] = useState<number | null>(null);

  const [internalData, setInternalData] = useState<FiveWhyEntry[]>(() => {
    if (fiveWhysData && fiveWhysData.length > 0) return fiveWhysData;
    const initialWhy = eventFocusDescription
      ? `¿Por qué ocurrió: "${eventFocusDescription.substring(0, 70)}${eventFocusDescription.length > 70 ? '...' : ''}"?`
      : '';
    return [{ id: generateId('5why'), why: initialWhy, because: '', status: 'pending', isRootCause: false }];
  });

  useEffect(() => {
      onSetFiveWhysData(internalData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internalData]);


  const handleUpdate = (index: number, field: 'why' | 'because', value: string) => {
    const newData = [...internalData];
    newData[index] = { ...newData[index], [field]: value };
    setInternalData(newData);
  };

  const handleToggleStatus = (index: number, status: 'accepted' | 'rejected') => {
      const itemToUpdate = internalData[index];
      
      if (itemToUpdate.status === status) {
        // Toggle back to pending
        const newData = [...internalData];
        newData[index].status = 'pending';
        newData[index].validationMethod = undefined;
        // If it was accepted and now is pending, it cannot be a root cause anymore
        if (status === 'accepted') {
          newData[index].isRootCause = false;
        }
        setInternalData(newData);
      } else {
        // Open dialog to confirm new status
        setValidationState({ index, status });
      }
  };

  const handleConfirmValidation = useCallback((method: string) => {
    if (!validationState) return;
    setIsProcessingValidation(true);
    const { index, status } = validationState;
    
    const newData = [...internalData];
    newData[index].status = status;
    newData[index].validationMethod = method;
    // If a cause is rejected, it cannot be a root cause
    if (status === 'rejected') {
      newData[index].isRootCause = false;
    }

    setInternalData(newData);
    setIsProcessingValidation(false);
    setValidationState(null);
  }, [internalData, validationState]);

  const handleAddEntry = () => {
    const lastEntry = internalData.length > 0 ? internalData[internalData.length - 1] : null;

    if (lastEntry && lastEntry.status !== 'accepted') {
        toast({
            title: "Acción Requerida",
            description: "Debe validar la causa anterior como 'aceptada' antes de añadir el siguiente 'Porqué'.",
            variant: "destructive"
        });
        return;
    }

    const newWhy = lastEntry?.because
      ? `¿Por qué: "${lastEntry.because.substring(0, 70)}${lastEntry.because.length > 70 ? '...' : ''}"?`
      : '';

    const newEntry: FiveWhyEntry = {
      id: generateId('5why'),
      why: newWhy,
      because: '',
      status: 'pending',
      isRootCause: false,
    };
    const newData = [...internalData, newEntry];
    setInternalData(newData);
  };

  const handleRemoveEntry = (indexToRemove: number) => {
    if (internalData.length <= 1) return;
    const newData = internalData.filter((_, index) => index !== indexToRemove);
    setInternalData(newData);
  };
  
  const handleConfirmRootCause = () => {
    if (rootCauseCandidateIndex === null) return;
    const newData = [...internalData];
    // Unset any other root cause
    newData.forEach((entry, index) => {
        if (index !== rootCauseCandidateIndex) {
            entry.isRootCause = false;
        }
    });
    newData[rootCauseCandidateIndex].isRootCause = true;
    setInternalData(newData);
    setRootCauseCandidateIndex(null);
    toast({ title: "Causa Raíz Identificada", description: "Se ha marcado una causa como la causa raíz principal." });
  };


  return (
    <>
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold font-headline text-primary flex items-center">
          <HelpCircle className="mr-2 h-6 w-6" />
          5 Porqués (con Validación)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {internalData.map((entry, index) => {
            const status = entry.status || 'pending';
            const isRootCause = entry.isRootCause || false;
            return (
            <Card key={entry.id} className={cn("p-3 space-y-2 transition-colors", 
                isRootCause ? 'border-2 border-primary' :
                status === 'accepted' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' 
                : status === 'rejected' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 opacity-70' 
                : 'bg-secondary/30'
            )}>
                <div className="flex justify-between items-center">
                <Label htmlFor={`why-${entry.id}`} className={cn("font-semibold text-primary")}>
                    #{index + 1} ¿Por qué?
                </Label>
                {internalData.length > 1 && (
                    <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleRemoveEntry(index)}
                    >
                    <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                )}
                </div>
                <Textarea
                id={`why-${entry.id}`}
                value={entry.why}
                onChange={(e) => handleUpdate(index, 'why', e.target.value)}
                placeholder="Describa el 'porqué'..."
                rows={2}
                disabled={status === 'rejected' || isRootCause}
                />
                <div className="pl-4">
                    <div className="flex justify-between items-center">
                        <Label htmlFor={`because-${entry.id}`} className="font-semibold text-foreground">
                            Porque... (Causa)
                        </Label>
                        <div className="flex gap-1">
                             <Button size="icon" variant={status === 'accepted' ? 'secondary' : 'ghost'} className={cn("h-7 w-7", isRootCause && "hidden")} onClick={() => handleToggleStatus(index, 'accepted')} disabled={status === 'rejected'}><Check className="h-4 w-4 text-green-600"/></Button>
                             <Button size="icon" variant={status === 'rejected' ? 'secondary' : 'ghost'} className={cn("h-7 w-7", isRootCause && "hidden")} onClick={() => handleToggleStatus(index, 'rejected')}><X className="h-4 w-4 text-destructive" /></Button>
                        </div>
                    </div>
                <Textarea
                    id={`because-${entry.id}`}
                    value={entry.because}
                    onChange={(e) => handleUpdate(index, 'because', e.target.value)}
                    placeholder="Describa la causa o razón..."
                    rows={2}
                    disabled={status === 'rejected' || isRootCause}
                />
                </div>
                 {entry.validationMethod && (
                    <div className="text-xs pt-2 mt-2 border-t text-muted-foreground border-border">
                        <span className="font-semibold">Justificación V/R:</span> {entry.validationMethod}
                    </div>
                )}
                <div className="pt-2 mt-2 border-t border-dashed border-border">
                     <Button
                        size="sm"
                        variant={isRootCause ? "default" : "outline"}
                        className={cn("text-xs h-7", isRootCause && "w-full font-bold")}
                        onClick={() => setRootCauseCandidateIndex(index)}
                        disabled={status !== 'accepted'}
                        title={status !== 'accepted' ? "Debe validar esta causa como 'aceptada' para poder marcarla como Causa Raíz." : "Marcar esta causa como la Causa Raíz principal."}
                      >
                        <Target className="mr-1 h-3 w-3" />
                        {isRootCause ? 'Identificada como Causa Raíz' : 'Marcar como Causa Raíz'}
                      </Button>
                </div>
            </Card>
            )
        })}
        <Button onClick={handleAddEntry} variant="outline" className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Siguiente ¿Por qué?
        </Button>
      </CardContent>
    </Card>
      {validationState && (
        <FiveWhysValidationDialog
          isOpen={!!validationState}
          onOpenChange={() => setValidationState(null)}
          onConfirm={handleConfirmValidation}
          isProcessing={isProcessingValidation}
        />
      )}
      {rootCauseCandidateIndex !== null && (
        <RootCauseConfirmationDialog
            isOpen={rootCauseCandidateIndex !== null}
            onOpenChange={() => setRootCauseCandidateIndex(null)}
            onConfirm={handleConfirmRootCause}
            isProcessing={false}
        />
      )}
    </>
  );
};
