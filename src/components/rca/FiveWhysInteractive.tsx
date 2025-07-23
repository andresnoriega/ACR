
'use client';
import { FC, useCallback, useMemo, useState, useEffect } from 'react';
import type { FiveWhyEntry, FiveWhyCause } from '@/types/rca';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PlusCircle, Trash2, Check, X, HelpCircle, Loader2, Target, CornerDownRight } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

// --- DIALOGS (kept from previous version) ---

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


// --- MAIN COMPONENT ---

interface FiveWhysInteractiveProps {
  fiveWhysData: FiveWhyEntry[];
  onSetFiveWhysData: (data: FiveWhyEntry[]) => void;
  eventFocusDescription: string;
}

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const FiveWhysInteractive: FC<FiveWhysInteractiveProps> = ({ fiveWhysData, onSetFiveWhysData, eventFocusDescription }) => {
  const { toast } = useToast();
  const [validationState, setValidationState] = useState<{ whyIndex: number; causeIndex: number; status: 'accepted' | 'rejected' } | null>(null);
  const [isProcessingValidation, setIsProcessingValidation] = useState(false);
  const [rootCauseCandidate, setRootCauseCandidate] = useState<{ whyIndex: number; causeIndex: number } | null>(null);

  const [internalData, setInternalData] = useState<FiveWhyEntry[]>(() => {
    if (fiveWhysData && fiveWhysData.length > 0) return fiveWhysData;
    const initialWhy = eventFocusDescription
      ? `¿Por qué ocurrió: "${eventFocusDescription.substring(0, 70)}${eventFocusDescription.length > 70 ? '...' : ''}"?`
      : '';
    return [{ id: generateId('why'), why: initialWhy, causes: [] }];
  });

  const hasIdentifiedRootCause = useMemo(() => internalData.some(entry => entry.causes.some(cause => cause.isRootCause)), [internalData]);

  useEffect(() => {
    onSetFiveWhysData(internalData);
  }, [internalData, onSetFiveWhysData]);


  const updateWhyDescription = (whyIndex: number, value: string) => {
    const newData = [...internalData];
    newData[whyIndex].why = value;
    setInternalData(newData);
  };

  const updateCauseDescription = (whyIndex: number, causeIndex: number, value: string) => {
    const newData = [...internalData];
    newData[whyIndex].causes[causeIndex].description = value;
    setInternalData(newData);
  };
  
  const addWhyEntry = () => {
    if (hasIdentifiedRootCause) {
        toast({ title: "Causa Raíz ya Identificada", description: "No se puede añadir un nuevo 'porqué' una vez que la causa raíz ha sido establecida.", variant: "default" });
        return;
    }
    
    const lastEntry = internalData[internalData.length - 1];
    const firstAcceptedCause = lastEntry?.causes.find(c => c.status === 'accepted');

    if (!firstAcceptedCause) {
        toast({ title: "Acción Requerida", description: "Debe validar al menos una causa como 'aceptada' en el último nivel para añadir el siguiente 'Porqué'.", variant: "destructive" });
        return;
    }

    const newWhyText = `¿Por qué: "${firstAcceptedCause.description.substring(0, 70)}${firstAcceptedCause.description.length > 70 ? '...' : ''}"?`;
    setInternalData([...internalData, { id: generateId('why'), why: newWhyText, causes: [] }]);
  };

  const removeWhyEntry = (whyIndex: number) => {
    if (internalData.length <= 1) return;
    setInternalData(internalData.filter((_, index) => index !== whyIndex));
  };
  
  const addCauseToWhy = (whyIndex: number) => {
    const newData = [...internalData];
    newData[whyIndex].causes.push({
      id: generateId('cause'),
      description: '',
      status: 'pending',
      isRootCause: false
    });
    setInternalData(newData);
  };

  const removeCauseFromWhy = (whyIndex: number, causeIndex: number) => {
    const newData = [...internalData];
    newData[whyIndex].causes = newData[whyIndex].causes.filter((_, index) => index !== causeIndex);
    setInternalData(newData);
  };

  const handleToggleStatus = (whyIndex: number, causeIndex: number, status: 'accepted' | 'rejected') => {
      const causeToUpdate = internalData[whyIndex].causes[causeIndex];
      if (causeToUpdate.status === status) {
        const newData = [...internalData];
        newData[whyIndex].causes[causeIndex].status = 'pending';
        newData[whyIndex].causes[causeIndex].validationMethod = undefined;
        if (status === 'accepted') {
          newData[whyIndex].causes[causeIndex].isRootCause = false;
        }
        setInternalData(newData);
      } else {
        setValidationState({ whyIndex, causeIndex, status });
      }
  };

  const handleConfirmValidation = useCallback((method: string) => {
    if (!validationState) return;
    setIsProcessingValidation(true);
    const { whyIndex, causeIndex, status } = validationState;
    
    const newData = [...internalData];
    const causeToUpdate = newData[whyIndex].causes[causeIndex];
    causeToUpdate.status = status;
    causeToUpdate.validationMethod = method;

    if (status === 'rejected') {
      causeToUpdate.isRootCause = false;
    }

    setInternalData(newData);
    setIsProcessingValidation(false);
    setValidationState(null);
  }, [internalData, validationState]);


  const handleToggleRootCause = (whyIndex: number, causeIndex: number) => {
    const isCurrentlyRoot = internalData[whyIndex].causes[causeIndex].isRootCause;
    if (isCurrentlyRoot) {
        const newData = [...internalData];
        newData[whyIndex].causes[causeIndex].isRootCause = false;
        setInternalData(newData);
        toast({ title: "Causa Raíz Anulada", variant: "default" });
    } else {
        setRootCauseCandidate({ whyIndex, causeIndex });
    }
  };

  const handleConfirmRootCause = () => {
    if (rootCauseCandidate === null) return;
    const { whyIndex, causeIndex } = rootCauseCandidate;
    const newData = [...internalData];
    // Unset any other root cause globally
    newData.forEach(entry => {
        entry.causes.forEach(cause => {
            cause.isRootCause = false;
        });
    });
    // Set the new root cause
    newData[whyIndex].causes[causeIndex].isRootCause = true;
    setInternalData(newData);
    setRootCauseCandidate(null);
    toast({ title: "Causa Raíz Identificada" });
  };


  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold font-headline text-primary flex items-center">
            <HelpCircle className="mr-2 h-6 w-6" />
            5 Porqués (Análisis de Causas Múltiples)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {internalData.map((entry, whyIndex) => (
            <div key={entry.id} className="p-3 space-y-2 border rounded-lg bg-secondary/20">
              <div className="flex justify-between items-center">
                <Label htmlFor={`why-${entry.id}`} className="font-semibold text-primary">
                  #{whyIndex + 1} ¿Por qué?
                </Label>
                {internalData.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeWhyEntry(whyIndex)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
              <Textarea id={`why-${entry.id}`} value={entry.why} onChange={(e) => updateWhyDescription(whyIndex, e.target.value)} rows={2}/>
              
              <div className="pl-4 space-y-3 pt-2 border-t">
                {entry.causes.map((cause, causeIndex) => (
                  <Card key={cause.id} className={cn(
                    "p-3", 
                    cause.isRootCause ? 'border-2 border-primary' : 
                    cause.status === 'accepted' ? 'bg-green-50 dark:bg-green-900/20' : 
                    cause.status === 'rejected' ? 'opacity-70 border-destructive' : 'bg-card'
                  )}>
                    <div className="flex items-start gap-2">
                       <CornerDownRight className="h-4 w-4 text-muted-foreground mt-2.5 flex-shrink-0"/>
                       <div className="flex-grow space-y-2">
                          <div className="flex justify-between items-center">
                            <Label htmlFor={`cause-${cause.id}`} className="text-sm font-semibold">Causa #{whyIndex + 1}.{causeIndex + 1}</Label>
                            <div className="flex items-center gap-1">
                               <Button size="icon" variant={cause.status === 'accepted' ? 'secondary' : 'ghost'} className="h-6 w-6" onClick={() => handleToggleStatus(whyIndex, causeIndex, 'accepted')} disabled={cause.status === 'rejected'}><Check className="h-4 w-4 text-green-600"/></Button>
                               <Button size="icon" variant={cause.status === 'rejected' ? 'secondary' : 'ghost'} className="h-6 w-6" onClick={() => handleToggleStatus(whyIndex, causeIndex, 'rejected')}><X className="h-4 w-4 text-destructive"/></Button>
                               <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeCauseFromWhy(whyIndex, causeIndex)}><Trash2 className="h-4 w-4 text-destructive/70" /></Button>
                            </div>
                          </div>
                          <Textarea id={`cause-${cause.id}`} value={cause.description} onChange={(e) => updateCauseDescription(whyIndex, causeIndex, e.target.value)} placeholder="Describa la causa o razón..." rows={2} disabled={cause.status === 'rejected' || cause.isRootCause} />
                          {cause.validationMethod && (
                            <div className="text-xs pt-1 mt-1 border-t text-muted-foreground">
                                <span className="font-semibold">Justificación:</span> {cause.validationMethod}
                            </div>
                           )}
                           <div className="pt-2 mt-2 border-t border-dashed">
                              <Button size="sm" variant={cause.isRootCause ? "destructive" : "outline"} className={cn("text-xs h-7 w-full")} onClick={() => handleToggleRootCause(whyIndex, causeIndex)} disabled={cause.status !== 'accepted'} title={cause.status !== 'accepted' ? "Debe validar esta causa como 'aceptada' para poder marcarla como Causa Raíz." : cause.isRootCause ? "Anular esta causa como la Causa Raíz" : "Marcar esta causa como la Causa Raíz principal."}>
                                  <Target className="mr-1 h-3 w-3" />
                                  {cause.isRootCause ? 'Anular Causa Raíz' : 'Marcar como Causa Raíz'}
                              </Button>
                           </div>
                       </div>
                    </div>
                  </Card>
                ))}
                <Button onClick={() => addCauseToWhy(whyIndex)} variant="outline" size="sm" className="w-full text-xs h-8 mt-2">
                  <PlusCircle className="mr-2 h-4 w-4" /> Añadir Causa a este "Porqué"
                </Button>
              </div>
            </div>
          ))}
          <Button onClick={addWhyEntry} variant="outline" className="w-full" disabled={hasIdentifiedRootCause}>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Siguiente Nivel de ¿Por qué?
          </Button>
        </CardContent>
      </Card>

      {validationState && (
        <FiveWhysValidationDialog
          isOpen={!!validationState}
          onOpenChange={() => setValidationState(null)}
          onConfirm={(method) => handleConfirmValidation(method)}
          isProcessing={isProcessingValidation}
        />
      )}
      {rootCauseCandidate !== null && (
        <RootCauseConfirmationDialog
            isOpen={rootCauseCandidate !== null}
            onOpenChange={() => setRootCauseCandidate(null)}
            onConfirm={handleConfirmRootCause}
            isProcessing={false}
        />
      )}
    </>
  );
};
