
'use client';
import type { FC, ChangeEvent } from 'react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { FiveWhyEntry } from '@/types/rca';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, HelpCircle, Check, X, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface FiveWhysInteractiveProps {
  fiveWhysData: FiveWhyEntry[];
  onSetFiveWhysData: (data: FiveWhyEntry[]) => void;
  eventFocusDescription: string;
}

const generateId = (prefix: string): string => {
    const randomPart = Math.random().toString(36).substring(2, 9);
    const timePart = Date.now().toString(36);
    return `${prefix}-${timePart}-${randomPart}`;
};

// --- Dialog for Validation ---
interface ValidationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (method: string) => void;
  isProcessing: boolean;
  status: 'accepted' | 'rejected';
}

const ValidationDialog: FC<ValidationDialogProps> = ({ isOpen, onOpenChange, onConfirm, isProcessing, status }) => {
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

  const title = status === 'accepted' ? "Confirmar Validación" : "Confirmar Rechazo";
  const description = `Por favor, ingrese el método o justificación utilizado para ${status === 'accepted' ? 'validar' : 'rechazar'} esta causa.`;
  const placeholder = `Ej: Revisión de bitácora, entrevista, evidencia física, etc.`;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="validationMethod">Método de Validación/Rechazo <span className="text-destructive">*</span></Label>
          <Textarea id="validationMethod" value={method} onChange={(e) => setMethod(e.target.value)} placeholder={placeholder} className="mt-1" />
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


// --- Dialog for Root Cause Confirmation ---
interface RootCauseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

const RootCauseDialog: FC<RootCauseDialogProps> = ({ isOpen, onOpenChange, onConfirm }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar Causa Raíz</DialogTitle>
          <DialogDescription>
            ¿Es posible aplicar una solución definitiva y factible para esta causa?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">No</Button></DialogClose>
          <Button onClick={onConfirm}>Sí</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export const FiveWhysInteractive: FC<FiveWhysInteractiveProps> = ({
  fiveWhysData,
  onSetFiveWhysData,
  eventFocusDescription,
}) => {
  const { toast } = useToast();
  const [internalData, setInternalData] = useState<FiveWhyEntry[]>([]);
  const [validationState, setValidationState] = useState<{ id: string; status: 'accepted' | 'rejected' } | null>(null);
  const [rootCauseState, setRootCauseState] = useState<{ id: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Initialize internal state only when the prop changes to avoid unnecessary re-renders
    if (JSON.stringify(fiveWhysData) !== JSON.stringify(internalData)) {
        setInternalData(fiveWhysData || []);
    }
  }, [fiveWhysData, internalData]);

  const hasIdentifiedRootCause = useMemo(() => internalData.some(entry => entry.isRootCause), [internalData]);

  const updateParentState = (newData: FiveWhyEntry[]) => {
      onSetFiveWhysData(newData);
  };
  
  const handleAddEntry = () => {
    if (hasIdentifiedRootCause) {
        toast({
            title: "Acción no permitida",
            description: "La Causa Raíz ya ha sido identificada. No se pueden añadir más 'Porqués'.",
            variant: "destructive"
        });
        return;
    }
    const lastEntry = internalData.length > 0 ? internalData[internalData.length - 1] : null;
    const initialWhy = lastEntry?.because ? `¿Por qué: "${lastEntry.because.substring(0, 70)}${lastEntry.because.length > 70 ? "..." : ""}"?` : '';
    const newData = [...internalData, { id: generateId('5why'), why: initialWhy, because: '', status: 'pending' }];
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

  const handleToggleStatus = (id: string, newStatus: 'accepted' | 'rejected') => {
    const entry = internalData.find(e => e.id === id);
    if (!entry) return;

    if (entry.status === newStatus) {
      // Toggle back to pending
      const newData = internalData.map(e => e.id === id ? { ...e, status: 'pending', validationMethod: undefined } : e);
      setInternalData(newData);
      updateParentState(newData);
    } else {
      // Open dialog to confirm
      setValidationState({ id, status: newStatus });
    }
  };

  const handleConfirmValidation = useCallback((method: string) => {
    if (!validationState) return;
    setIsProcessing(true);
    const newData = internalData.map(entry =>
      entry.id === validationState.id
        ? { ...entry, status: validationState.status, validationMethod: method }
        : entry
    );
    setInternalData(newData);
    updateParentState(newData);
    setValidationState(null);
    setIsProcessing(false);
  }, [internalData, validationState, updateParentState]);

  const handleSetRootCause = (id: string) => {
    const entry = internalData.find(e => e.id === id);
    if (!entry) return;

    if(entry.isRootCause) {
        // Undo root cause designation
        const newData = internalData.map(e => e.id === id ? { ...e, isRootCause: false } : e);
        setInternalData(newData);
        updateParentState(newData);
        toast({title: "Causa Raíz Anulada"});
    } else {
        // Set as root cause after confirmation
        setRootCauseState({ id });
    }
  };

  const handleConfirmRootCause = useCallback(() => {
    if (!rootCauseState) return;
    const newData = internalData.map(entry =>
      entry.id === rootCauseState.id ? { ...entry, isRootCause: true } : { ...entry, isRootCause: false }
    );
    setInternalData(newData);
    updateParentState(newData);
    setRootCauseState(null);
    toast({title: "Causa Raíz Identificada", className: "bg-primary text-primary-foreground"});
  }, [internalData, rootCauseState, updateParentState]);


  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold font-headline text-primary flex items-center">
            <HelpCircle className="mr-2 h-6 w-6" />
            Análisis de los 5 Porqués (con Validación)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {internalData.map((entry, index) => (
            <Card key={entry.id} className={cn("p-4 space-y-2",
              entry.isRootCause ? 'border-2 border-primary' :
              entry.status === 'accepted' ? 'border-green-300 dark:border-green-700' :
              entry.status === 'rejected' ? 'border-red-300 dark:border-red-700' :
              'border-border'
            )}>
              <div className="flex justify-between items-center">
                <Label htmlFor={`why-${entry.id}`} className="font-semibold text-primary">
                  #{index + 1} ¿Por qué?
                </Label>
                {internalData.length > 1 && (
                   <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveEntry(entry.id)}>
                     <Trash2 className="h-4 w-4 text-destructive" />
                   </Button>
                )}
              </div>
              <Textarea
                id={`why-${entry.id}`}
                value={entry.why}
                onChange={(e) => handleUpdateEntry(entry.id, 'why', e.target.value)}
                placeholder={`Ej: ¿Por qué ocurrió: ${eventFocusDescription.substring(0,50)}...?`}
                rows={2}
                disabled={entry.isRootCause}
              />

              <Label htmlFor={`because-${entry.id}`} className="font-semibold text-primary/90">
                Porque...
              </Label>
              <Textarea
                id={`because-${entry.id}`}
                value={entry.because}
                onChange={(e) => handleUpdateEntry(entry.id, 'because', e.target.value)}
                placeholder="Describa la razón o causa..."
                rows={2}
                disabled={entry.isRootCause}
              />
              {entry.validationMethod && (
                  <p className="text-xs text-muted-foreground pt-1">Justificación: {entry.validationMethod}</p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t mt-2">
                 <Button onClick={() => handleToggleStatus(entry.id, 'accepted')} variant={entry.status === 'accepted' ? 'secondary' : 'ghost'} size="sm" className="text-green-600 hover:bg-green-100 hover:text-green-700">
                    <Check className="mr-1 h-4 w-4"/> Aceptar
                 </Button>
                 <Button onClick={() => handleToggleStatus(entry.id, 'rejected')} variant={entry.status === 'rejected' ? 'secondary' : 'ghost'} size="sm" className="text-red-600 hover:bg-red-100 hover:text-red-700">
                    <X className="mr-1 h-4 w-4"/> Rechazar
                 </Button>
                 {entry.status === 'accepted' && (
                    <Button onClick={() => handleSetRootCause(entry.id)} variant="outline" size="sm" className={cn(entry.isRootCause && "border-primary text-primary hover:bg-primary/10")}>
                        {entry.isRootCause ? 'Anular Causa Raíz' : 'Causa Raíz'}
                    </Button>
                 )}
              </div>
            </Card>
          ))}
          <Button onClick={handleAddEntry} variant="outline" className="w-full" disabled={hasIdentifiedRootCause}>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Siguiente ¿Por qué?
          </Button>
        </CardContent>
      </Card>

      {validationState && (
        <ValidationDialog
          isOpen={!!validationState}
          onOpenChange={() => setValidationState(null)}
          onConfirm={handleConfirmValidation}
          isProcessing={isProcessing}
          status={validationState.status}
        />
      )}
      
      {rootCauseState && (
          <RootCauseDialog
            isOpen={!!rootCauseState}
            onOpenChange={() => setRootCauseState(null)}
            onConfirm={handleConfirmRootCause}
          />
      )}
    </>
  );
};
