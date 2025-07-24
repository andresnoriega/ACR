
'use client';
import { FC, ChangeEvent, useState, useEffect, useMemo } from 'react';
import type { FiveWhysData } from '@/types/rca';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Trash2, HelpCircle, Check, X, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

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
          <Label htmlFor="why-validation-method">Método de Validación/Rechazo <span className="text-destructive">*</span></Label>
          <Textarea
            id="why-validation-method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="Ej: Inspección visual, análisis de datos, entrevista, etc."
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
  fiveWhysData: FiveWhysData;
  onAddFiveWhyEntry: () => void;
  onUpdateFiveWhyEntry: (id: string, field: 'why' | 'because' | 'status' | 'validationMethod', value: string | 'pending' | 'accepted' | 'rejected') => void;
  onRemoveFiveWhyEntry: (id: string) => void;
}

export const FiveWhysInteractive: FC<FiveWhysInteractiveProps> = ({
  fiveWhysData,
  onAddFiveWhyEntry,
  onUpdateFiveWhyEntry,
  onRemoveFiveWhyEntry,
}) => {
  const [validationState, setValidationState] = useState<{ entryId: string; status: 'accepted' | 'rejected' } | null>(null);

  const handleToggleStatus = (entryId: string, status: 'accepted' | 'rejected') => {
    const entry = fiveWhysData.find(e => e.id === entryId);
    if (!entry) return;

    if (entry.status === status) {
      onUpdateFiveWhyEntry(entryId, 'status', 'pending');
      onUpdateFiveWhyEntry(entryId, 'validationMethod', '');
    } else {
      setValidationState({ entryId, status });
    }
  };

  const handleConfirmValidation = (method: string) => {
    if (!validationState) return;
    const { entryId, status } = validationState;
    onUpdateFiveWhyEntry(entryId, 'status', status);
    onUpdateFiveWhyEntry(entryId, 'validationMethod', method);
    setValidationState(null);
  };
  
  const canAddNextWhy = useMemo(() => {
    if (fiveWhysData.length === 0) {
      return true; // Puede añadir el primero
    }
    const lastEntry = fiveWhysData[fiveWhysData.length - 1];
    // Solo puede añadir el siguiente si la causa anterior fue aceptada.
    return lastEntry && lastEntry.status === 'accepted';
  }, [fiveWhysData]);

  return (
    <>
      <div className="space-y-4 mt-4 p-4 border rounded-lg shadow-sm bg-background">
        <h3 className="text-lg font-semibold font-headline text-primary">
          Análisis de los 5 Porqués
        </h3>
        <Alert>
          <HelpCircle className="h-4 w-4" />
          <AlertTitle>¿Cómo usar esta herramienta?</AlertTitle>
          <AlertDescription>
            Comience preguntando por qué ocurrió el problema. Luego, tome la respuesta (el "porque") y úsela como base para la siguiente pregunta "por qué". Repita hasta llegar a la causa raíz fundamental. Valide o rechace cada causa ("porque") encontrada.
          </AlertDescription>
        </Alert>
        {fiveWhysData.map((entry, index) => (
          <Card key={entry.id} className={cn("p-4 shadow-sm",
            entry.status === 'accepted' && 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700',
            entry.status === 'rejected' && 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 opacity-70'
          )}>
            <CardContent className="p-0 space-y-3">
              <div className="flex justify-between items-center">
                <p className="font-semibold text-primary">Paso #{index + 1}</p>
                {fiveWhysData.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveFiveWhyEntry(entry.id)}
                    className="h-7 w-7"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor={`why-${entry.id}`} className="text-sm font-medium">
                  ¿Por qué?
                </label>
                <Textarea
                  id={`why-${entry.id}`}
                  value={entry.why}
                  onChange={(e) => onUpdateFiveWhyEntry(entry.id, 'why', e.target.value)}
                  placeholder="¿Por qué ocurrió...?"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label htmlFor={`because-${entry.id}`} className="text-sm font-medium">
                    Porque... (Causa)
                  </label>
                   <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => handleToggleStatus(entry.id, 'accepted')} disabled={!entry.because.trim()}>
                          <Check className={cn("h-3 w-3", entry.status === 'accepted' ? "text-green-600" : "text-muted-foreground")} />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => handleToggleStatus(entry.id, 'rejected')} disabled={!entry.because.trim()}>
                          <X className={cn("h-3 w-3", entry.status === 'rejected' ? "text-red-600" : "text-muted-foreground")} />
                      </Button>
                   </div>
                </div>
                <Textarea
                  id={`because-${entry.id}`}
                  value={entry.because}
                  onChange={(e) => onUpdateFiveWhyEntry(entry.id, 'because', e.target.value)}
                  placeholder="Describa la causa..."
                  rows={2}
                />
                 {entry.validationMethod && (
                    <div className="text-xs text-muted-foreground pt-2 mt-2 border-t">
                      <span className="font-semibold">Justificación V/R:</span> {entry.validationMethod}
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>
        ))}
         {canAddNextWhy && (
            <Button onClick={onAddFiveWhyEntry} variant="outline" className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Siguiente Porqué
            </Button>
        )}
      </div>

      {validationState && (
        <ValidationDialog
          isOpen={!!validationState}
          onOpenChange={() => setValidationState(null)}
          onConfirm={handleConfirmValidation}
          isProcessing={false}
        />
      )}
    </>
  );
};
