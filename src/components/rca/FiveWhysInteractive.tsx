
'use client';
import { FC, ChangeEvent, useState, useEffect, useMemo } from 'react';
import type { FiveWhysData, FiveWhy } from '@/types/rca';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Trash2, HelpCircle, Check, X, Loader2, Award, GitBranchPlus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


// --- Validation Dialog ---
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


// --- Root Cause Confirmation Dialog ---
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
          <DialogClose asChild>
            <Button variant="outline">No</Button>
          </DialogClose>
          <Button onClick={onConfirm}>Sí</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


// --- Main Component ---
interface FiveWhysInteractiveProps {
  fiveWhysData: FiveWhysData;
  onAddFiveWhyEntry: (investigationIndex: number) => void;
  onUpdateFiveWhyEntry: (investigationIndex: number, entryId: string, field: 'why' | 'because' | 'status' | 'validationMethod' | 'isRootCause', value: any) => void;
  onRemoveFiveWhyEntry: (investigationIndex: number, entryId: string) => void;
  onStartNewInvestigation: () => void;
}

export const FiveWhysInteractive: FC<FiveWhysInteractiveProps> = ({
  fiveWhysData,
  onAddFiveWhyEntry,
  onUpdateFiveWhyEntry,
  onRemoveFiveWhyEntry,
  onStartNewInvestigation
}) => {
  const [validationState, setValidationState] = useState<{ investigationIndex: number, entryId: string; status: 'accepted' | 'rejected' } | null>(null);
  const [rootCauseState, setRootCauseState] = useState<{ investigationIndex: number, entryId: string } | null>(null);


  const handleToggleStatus = (investigationIndex: number, entryId: string, status: 'accepted' | 'rejected') => {
    const investigation = fiveWhysData[investigationIndex];
    if (!investigation) return;
    const entry = investigation.find(e => e.id === entryId);
    if (!entry) return;

    if (entry.status === status) {
      onUpdateFiveWhyEntry(investigationIndex, entryId, 'status', 'pending');
      onUpdateFiveWhyEntry(investigationIndex, entryId, 'validationMethod', '');
      onUpdateFiveWhyEntry(investigationIndex, entryId, 'isRootCause', false); // Unset root cause if status is toggled off
    } else {
      setValidationState({ investigationIndex, entryId, status });
    }
  };

  const handleConfirmValidation = (method: string) => {
    if (!validationState) return;
    const { investigationIndex, entryId, status } = validationState;
    onUpdateFiveWhyEntry(investigationIndex, entryId, 'status', status);
    onUpdateFiveWhyEntry(investigationIndex, entryId, 'validationMethod', method);
    if (status === 'rejected') {
        onUpdateFiveWhyEntry(investigationIndex, entryId, 'isRootCause', false);
    }
    setValidationState(null);
  };
  
  const handleMarkAsRootCause = (investigationIndex: number, entryId: string) => {
    const investigation = fiveWhysData[investigationIndex];
    if (!investigation) return;
    const entry = investigation.find(e => e.id === entryId);
    if (!entry) return;

    // If it's already a root cause, unmark it directly.
    if (entry.isRootCause) {
        onUpdateFiveWhyEntry(investigationIndex, entryId, 'isRootCause', false);
    } else {
        // Otherwise, open the confirmation dialog.
        setRootCauseState({ investigationIndex, entryId });
    }
  };
  
  const handleConfirmRootCause = () => {
    if (!rootCauseState) return;
    const { investigationIndex, entryId } = rootCauseState;
    // Unset any other root cause in the same investigation chain
    fiveWhysData[investigationIndex].forEach(entry => {
        if (entry.id !== entryId && entry.isRootCause) {
            onUpdateFiveWhyEntry(investigationIndex, entry.id, 'isRootCause', false);
        }
    });
    // Set the new root cause
    onUpdateFiveWhyEntry(investigationIndex, entryId, 'isRootCause', true);
    setRootCauseState(null);
  };
  
  const canAddNextWhy = (investigation: FiveWhy[]): boolean => {
    if (!investigation || investigation.length === 0) {
      return true; // Can always add to an empty investigation.
    }
    const lastEntry = investigation[investigation.length - 1];
    return lastEntry && lastEntry.status === 'accepted' && !lastEntry.isRootCause;
  };

  const lastInvestigation = fiveWhysData.length > 0 ? fiveWhysData[fiveWhysData.length - 1] : [];
  const lastEntryOfLastInvestigation = lastInvestigation.length > 0 ? lastInvestigation[lastInvestigation.length - 1] : null;
  const canStartNewInvestigation = lastEntryOfLastInvestigation && lastEntryOfLastInvestigation.status === 'rejected';

  return (
    <TooltipProvider>
      <div className="space-y-4 mt-4 p-4 border rounded-lg shadow-sm bg-background">
        <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold font-headline text-primary">
            Análisis de los 5 Porqués
            </h3>
            {canStartNewInvestigation && (
                <Button onClick={onStartNewInvestigation} variant="outline" size="sm">
                    <GitBranchPlus className="mr-2 h-4 w-4" /> Iniciar Nueva Investigación
                </Button>
            )}
        </div>
        <Alert>
          <HelpCircle className="h-4 w-4" />
          <AlertTitle>¿Cómo usar esta herramienta?</AlertTitle>
          <AlertDescription>
            Comience preguntando por qué ocurrió el problema. Valide cada causa; si es correcta, continúe con el siguiente "porqué". Si es rechazada, puede iniciar una nueva línea de investigación.
          </AlertDescription>
        </Alert>
        <div className="flex space-x-4 overflow-x-auto pb-4">
            {fiveWhysData.map((investigation, investigationIndex) => (
                <div key={investigationIndex} className="w-[320px] flex-shrink-0 space-y-3">
                    <h4 className="text-sm font-semibold text-center text-muted-foreground border-b pb-1">Investigación #{investigationIndex + 1}</h4>
                    {investigation.map((entry, entryIndex) => (
                        <Card key={entry.id} className={cn("p-4 shadow-sm transition-all",
                            entry.status === 'accepted' && 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700',
                            entry.status === 'rejected' && 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 opacity-70',
                            entry.isRootCause && 'border-blue-600 border-2 ring-2 ring-blue-300'
                        )}>
                            <CardContent className="p-0 space-y-3">
                            <div className="flex justify-between items-center">
                                <p className="font-semibold text-primary">Paso #{entryIndex + 1}</p>
                                {investigation.length > 1 && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onRemoveFiveWhyEntry(investigationIndex, entry.id)}
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
                                onChange={(e) => onUpdateFiveWhyEntry(investigationIndex, entry.id, 'why', e.target.value)}
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
                                    <Tooltip><TooltipTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => handleToggleStatus(investigationIndex, entry.id, 'accepted')} disabled={!entry.because.trim()}>
                                            <Check className={cn("h-3 w-3", entry.status === 'accepted' ? "text-green-600" : "text-muted-foreground")} />
                                        </Button>
                                    </TooltipTrigger><TooltipContent><p>Validar Causa</p></TooltipContent></Tooltip>
                                    <Tooltip><TooltipTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => handleToggleStatus(investigationIndex, entry.id, 'rejected')} disabled={!entry.because.trim()}>
                                            <X className={cn("h-3 w-3", entry.status === 'rejected' ? "text-red-600" : "text-muted-foreground")} />
                                        </Button>
                                    </TooltipTrigger><TooltipContent><p>Rechazar Causa</p></TooltipContent></Tooltip>
                                    <Tooltip><TooltipTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => handleMarkAsRootCause(investigationIndex, entry.id)} disabled={entry.status !== 'accepted'}>
                                        <Award className={cn("h-3 w-3", entry.isRootCause ? "text-blue-600" : (entry.status === 'accepted' ? "text-muted-foreground" : "text-muted-foreground/50"))}/>
                                        </Button>
                                    </TooltipTrigger><TooltipContent><p>{entry.isRootCause ? "Anular Causa Raíz" : "Marcar como Causa Raíz"}</p></TooltipContent></Tooltip>
                                </div>
                                </div>
                                <Textarea
                                id={`because-${entry.id}`}
                                value={entry.because}
                                onChange={(e) => onUpdateFiveWhyEntry(investigationIndex, entry.id, 'because', e.target.value)}
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
                    {canAddNextWhy(investigation) && (
                        <Button onClick={() => onAddFiveWhyEntry(investigationIndex)} variant="outline" className="w-full">
                            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Siguiente Porqué
                        </Button>
                    )}
                    {!canAddNextWhy(investigation) && investigation.length > 0 && (
                        <div className="text-center text-xs text-muted-foreground pt-2">
                            {investigation[investigation.length - 1].status === 'rejected' ? 'Análisis finalizado: la última causa fue rechazada.' :
                            investigation[investigation.length - 1].isRootCause ? 'Análisis finalizado: ha marcado la última causa como Causa Raíz.' :
                            'Valide la última causa para continuar.'
                            }
                        </div>
                    )}
                </div>
            ))}
        </div>
      </div>

      {validationState && (
        <ValidationDialog
          isOpen={!!validationState}
          onOpenChange={() => setValidationState(null)}
          onConfirm={handleConfirmValidation}
          isProcessing={false}
        />
      )}
      {rootCauseState && (
        <RootCauseDialog
            isOpen={!!rootCauseState}
            onOpenChange={() => setRootCauseState(null)}
            onConfirm={handleConfirmRootCause}
        />
      )}
    </TooltipProvider>
  );
};
