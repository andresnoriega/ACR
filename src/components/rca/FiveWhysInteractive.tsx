'use client';
import type { FC } from 'react';
import { useState, useCallback, useEffect } from 'react';
import type { FiveWhysData, FiveWhysEntry, FiveWhysCause } from '@/types/rca';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, HelpCircle, Check, X, GitBranchPlus as NewAnalysisIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { ValidationDialog } from './ValidationDialog';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface FiveWhysInteractiveProps {
  fiveWhysData: FiveWhysData;
  onSetFiveWhysData: (data: FiveWhysData) => void;
  eventFocusDescription: string;
}

export const FiveWhysInteractive: FC<FiveWhysInteractiveProps> = ({
  fiveWhysData,
  onSetFiveWhysData,
  eventFocusDescription,
}) => {
  const { toast } = useToast();
  const [internalData, setInternalData] = useState<FiveWhysData>([]);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    // Sync external data to internal state only when it changes from the outside
    let initialData = JSON.parse(JSON.stringify(fiveWhysData || []));
    if (initialData.length === 0) {
      initialData.push({
        id: `5why-${Date.now()}`,
        why: eventFocusDescription ? `¿Por qué ocurrió: ${eventFocusDescription}?` : '',
        becauses: [{ id: `cause-${Date.now()}`, description: '', status: 'pending' }]
      });
    }
    setInternalData(initialData);
  }, [fiveWhysData, eventFocusDescription]);
  
  const updateData = (newData: FiveWhysData) => {
    setInternalData(newData);
    onSetFiveWhysData(newData);
  };

  const handleAddEntry = (fromCauseDescription?: string) => {
    const newWhy = fromCauseDescription
      ? `¿Por qué: "${fromCauseDescription.substring(0, 70)}..."?`
      : '';
    const newEntry: FiveWhysEntry = {
      id: `5why-${Date.now()}`,
      why: newWhy,
      becauses: [{ id: `cause-${Date.now()}`, description: '', status: 'pending' }],
    };
    updateData([...internalData, newEntry]);
  };

  const handleUpdateWhy = (id: string, value: string) => {
    const newData = internalData.map(entry =>
      entry.id === id ? { ...entry, why: value } : entry
    );
    updateData(newData);
  };

  const handleRemoveEntry = (id: string) => {
    if (internalData.length <= 1) {
      toast({
        title: "Acción no permitida",
        description: "Debe haber al menos una entrada en los 5 Porqués.",
        variant: "destructive"
      });
      return;
    }
    const newData = internalData.filter(entry => entry.id !== id);
    updateData(newData);
  };

  const handleAddBecause = (entryId: string) => {
    const newData = internalData.map(entry => {
      if (entry.id === entryId) {
        const newBecause: FiveWhysCause = { id: `cause-${Date.now()}`, description: '', status: 'pending' };
        return { ...entry, becauses: [...(entry.becauses || []), newBecause] };
      }
      return entry;
    });
    updateData(newData);
  };

  const handleUpdateBecause = (entryId: string, causeId: string, value: string) => {
    const newData = internalData.map(entry => {
      if (entry.id === entryId) {
        const updatedBecauses = (entry.becauses || []).map(cause =>
          cause.id === causeId ? { ...cause, description: value } : cause
        );
        return { ...entry, becauses: updatedBecauses };
      }
      return entry;
    });
    updateData(newData);
  };

  const handleRemoveBecause = (entryId: string, causeId: string) => {
    const newData = internalData.map(entry => {
      if (entry.id === entryId) {
        if ((entry.becauses || []).length > 1) {
          const updatedBecauses = (entry.becauses || []).filter(c => c.id !== causeId);
          return { ...entry, becauses: updatedBecauses };
        }
      }
      return entry;
    });
    updateData(newData);
  };

  // For ValidationDialog
  const [validationState, setValidationState] = useState<{
    entryId: string;
    causeId: string;
    status: 'accepted' | 'rejected';
  } | null>(null);
  const [isProcessingValidation, setIsProcessingValidation] = useState(false);

  const handleToggleCauseStatus = (entryId: string, causeId: string, status: 'accepted' | 'rejected') => {
    const entry = internalData.find(e => e.id === entryId);
    const cause = entry?.becauses?.find(c => c.id === causeId);
    if (!cause) return;
    if (cause.status === status) { // If clicking the same status, toggle back to pending
      const newData = internalData.map(e => e.id === entryId ? {
        ...e,
        becauses: e.becauses.map(c => c.id === causeId ? { ...c, status: 'pending', validationMethod: undefined } : c)
      } : e);
      updateData(newData);
    } else {
      setValidationState({ entryId, causeId, status });
    }
  };

  const handleConfirmValidation = useCallback((method: string) => {
    if (!validationState) return;
    setIsProcessingValidation(true);
    const { entryId, causeId, status } = validationState;
    const newData = internalData.map(entry => {
      if (entry.id === entryId) {
        const updatedBecauses = (entry.becauses || []).map(cause =>
          cause.id === causeId ? { ...cause, status, validationMethod: method } : cause
        );
        return { ...entry, becauses: updatedBecauses };
      }
      return entry;
    });
    updateData(newData);
    setIsProcessingValidation(false);
    setValidationState(null);
  }, [internalData, validationState]);


  return (
    <>
      <div className="relative w-full space-y-4 p-4 border rounded-lg shadow-sm bg-background">
        <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold font-headline text-primary flex items-center">
                <HelpCircle className="mr-2 h-5 w-5" />
                5 Porqués
            </h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    title="Ver ayuda contextual"
                    onClick={() => setShowHelp(!showHelp)}
                    aria-label="Ayuda contextual"
                  >
                    <HelpCircle className="h-5 w-5 text-blue-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" sideOffset={8}>Ayuda contextual sobre el método 5 Porqués</TooltipContent>
              </Tooltip>
            </TooltipProvider>
        </div>

        {showHelp && (
            <div className="absolute right-0 top-12 z-30 w-[330px] bg-background border rounded shadow-xl p-4 text-sm animate-in fade-in transition-all">
                <div className="flex gap-2 items-center mb-2">
                    <HelpCircle className="h-5 w-5 text-blue-600" />
                    <span className="font-bold text-blue-700">¿Cómo usar los 5 Porqués?</span>
                </div>
                <ul className="list-disc ml-5 space-y-1">
                    <li>Comienza con una pregunta clave sobre el evento.</li>
                    <li>Responde con una o más causas directas ("Porque...").</li>
                    <li>Valida (<Check className="inline h-4 w-4 text-green-600" />) o rechaza (<X className="inline h-4 w-4 text-red-600" />) cada causa con justificación.</li>
                    <li>Si una causa es validada, puedes usarla para crear el siguiente "Por qué" y profundizar en la cadena causal.</li>
                    <li>Continúa hasta llegar a la causa raíz.</li>
                </ul>
                <Button className="mt-4 w-full" size="sm" variant="secondary" onClick={() => setShowHelp(false)}>Cerrar ayuda</Button>
            </div>
        )}

        <div className="space-y-4">
          {(internalData || []).map((entry, index) => (
            <Card key={entry.id} className="p-4 bg-secondary/30">
              <div className="flex justify-between items-center mb-2">
                <p className="font-semibold text-primary">Por qué #{index + 1}</p>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveEntry(entry.id)} aria-label="Eliminar este paso"><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
              <div className="space-y-2">
                <div>
                  <Label htmlFor={`why-${entry.id}`}>¿Por qué?</Label>
                  <Textarea id={`why-${entry.id}`} value={entry.why} onChange={(e) => handleUpdateWhy(entry.id, e.target.value)} placeholder="Pregunte '¿Por qué...?'" rows={2}/>
                </div>
                <div className="space-y-2 pt-2">
                  {(entry.becauses || []).map((cause, causeIndex) => (
                    <div key={cause.id} className="pl-4 border-l-2 space-y-1">
                      <Label htmlFor={`because-${entry.id}-${cause.id}`} className="text-xs font-medium">Porque {index + 1}.{causeIndex + 1}</Label>
                      <div className="flex items-start gap-2">
                        <div className="flex-grow space-y-1">
                          <Textarea id={`because-${entry.id}-${cause.id}`} value={cause.description} onChange={(e) => handleUpdateBecause(entry.id, cause.id, e.target.value)} placeholder="Responda con la causa directa..." rows={1} className={cn("text-sm", cause.status === 'accepted' && 'border-green-500 ring-green-500 bg-green-50', cause.status === 'rejected' && 'border-red-500 ring-red-500 bg-red-50 opacity-80')}/>
                          {cause.validationMethod && <p className="text-xs text-muted-foreground italic pl-1">Justificación: {cause.validationMethod}</p>}
                          {cause.status === 'accepted' && (
                            <Button size="sm" variant="secondary" className="text-xs h-7 mt-1" onClick={() => handleAddEntry(cause.description)}>
                              <PlusCircle className="mr-1 h-3 w-3" /> Añadir Siguiente "Por qué"
                            </Button>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                            <TooltipProvider>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleToggleCauseStatus(entry.id, cause.id, 'accepted')} title="Validar Causa">
                                        <Check className={cn("h-3.5 w-3.5", cause.status === 'accepted' ? "text-green-600" : "text-muted-foreground")} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right" sideOffset={8}>Marca la causa como validada.</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleToggleCauseStatus(entry.id, cause.id, 'rejected')} title="Rechazar Causa">
                                        <X className={cn("h-3.5 w-3.5", cause.status === 'rejected' ? "text-red-600" : "text-muted-foreground")} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right" sideOffset={8}>Rechaza la causa si no es válida.</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveBecause(entry.id, cause.id)} disabled={(entry.becauses || []).length <= 1} title="Eliminar Causa">
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right" sideOffset={8}>Eliminar esta causa.</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" className="text-xs h-7 ml-4" onClick={() => handleAddBecause(entry.id)}><PlusCircle className="mr-1 h-3 w-3" /> Añadir Porque</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
      <ValidationDialog
        isOpen={!!validationState}
        onOpenChange={(open) => { if (!open) setValidationState(null); }}
        onConfirm={handleConfirmValidation}
        isProcessing={isProcessingValidation}
        title="Confirmar Validación/Rechazo de Causa"
        description="Por favor, ingrese el método o justificación utilizado para validar o rechazar esta causa."
        placeholder="Ej: Inspección visual, análisis de datos, entrevista, etc."
      />
    </>
  );
};
