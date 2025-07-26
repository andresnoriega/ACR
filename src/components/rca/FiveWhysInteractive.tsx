'use client';
import type { FC, ChangeEvent } from 'react';
import { useState, useEffect, useCallback } from 'react';
import type { FiveWhysData, FiveWhysEntry, FiveWhysCause } from '@/types/rca';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, HelpCircle, Check, X, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { ValidationDialog } from './ValidationDialog';

interface FiveWhysInteractiveProps {
  fiveWhysData: FiveWhysData;
  onSetFiveWhysData: (data: FiveWhysData) => void;
}

export const FiveWhysInteractive: FC<FiveWhysInteractiveProps> = ({
  fiveWhysData,
  onSetFiveWhysData,
}) => {
  const { toast } = useToast();
  const [internalData, setInternalData] = useState<FiveWhysData>([]);
  const [validationState, setValidationState] = useState<{ entryId: string; causeId: string; status: 'accepted' | 'rejected' } | null>(null);
  const [isProcessingValidation, setIsProcessingValidation] = useState(false);

  useEffect(() => {
    // Deep copy to prevent mutation issues.
    setInternalData(JSON.parse(JSON.stringify(fiveWhysData || [])));
  }, [fiveWhysData]);

  const handleUpdate = (newData: FiveWhysData) => {
    setInternalData(newData);
    onSetFiveWhysData(newData);
  };
  
  const handleAddEntry = (fromCauseDescription?: string) => {
    const newWhy = fromCauseDescription
      ? `¿Por qué: "${fromCauseDescription.substring(0, 70)}..."?`
      : '';
    
    const newEntry: FiveWhysEntry = {
      id: `5why-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      why: newWhy,
      becauses: [{ id: `cause-${Date.now()}`, description: '', status: 'pending' }],
    };
    
    const newData = [...internalData, newEntry];
    handleUpdate(newData);
  };

  const handleUpdateWhy = (id: string, value: string) => {
    const newData = internalData.map(entry => 
      entry.id === id ? { ...entry, why: value } : entry
    );
    handleUpdate(newData);
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
    handleUpdate(newData);
  };
  
  const handleAddBecause = (entryId: string) => {
    const newData = internalData.map(entry => {
      if (entry.id === entryId) {
        const newBecause: FiveWhysCause = { id: `cause-${Date.now()}`, description: '', status: 'pending' };
        const updatedBecauses = Array.isArray(entry.becauses) ? [...entry.becauses, newBecause] : [newBecause];
        return { ...entry, becauses: updatedBecauses };
      }
      return entry;
    });
    handleUpdate(newData);
  };
  
  const handleUpdateBecause = (entryId: string, causeId: string, value: string) => {
    const newData = internalData.map(entry => {
      if (entry.id === entryId) {
        const updatedBecauses = entry.becauses.map(cause => 
          cause.id === causeId ? { ...cause, description: value } : cause
        );
        return { ...entry, becauses: updatedBecauses };
      }
      return entry;
    });
    handleUpdate(newData);
  };
  
  const handleRemoveBecause = (entryId: string, causeId: string) => {
    const newData = internalData.map(entry => {
      if (entry.id === entryId) {
        if (entry.becauses.length > 1) {
          const updatedBecauses = entry.becauses.filter(c => c.id !== causeId);
          return { ...entry, becauses: updatedBecauses };
        }
      }
      return entry;
    });
    handleUpdate(newData);
  };
  
  const handleToggleCauseStatus = (entryId: string, causeId: string, status: 'accepted' | 'rejected') => {
    const entry = internalData.find(e => e.id === entryId);
    const cause = entry?.becauses.find(c => c.id === causeId);
    if (!cause) return;
  
    if (cause.status === status) {
      // Toggle back to pending
      const newData = internalData.map(e => {
        if (e.id === entryId) {
          return {
            ...e,
            becauses: e.becauses.map(c => c.id === causeId ? { ...c, status: 'pending', validationMethod: undefined } : c)
          };
        }
        return e;
      });
      handleUpdate(newData);
    } else {
      setValidationState({ entryId, causeId, status });
    }
  };

  const handleConfirmValidation = (method: string) => {
    if (!validationState) return;
    setIsProcessingValidation(true);
    const { entryId, causeId, status } = validationState;

    const newData = internalData.map(entry => {
      if (entry.id === entryId) {
        const updatedBecauses = entry.becauses.map(cause => {
          if (cause.id === causeId) {
            return { ...cause, status, validationMethod: method };
          }
          return cause;
        });
        return { ...entry, becauses: updatedBecauses };
      }
      return entry;
    });
    
    handleUpdate(newData);
    setIsProcessingValidation(false);
    setValidationState(null);
  };


  return (
    <>
      <div className="space-y-4 mt-4 p-4 border rounded-lg shadow-sm bg-background">
        <h3 className="text-lg font-semibold font-headline text-primary flex items-center">
          <HelpCircle className="mr-2 h-5 w-5" /> 5 Porqués
        </h3>
        <div className="space-y-4">
          {(internalData || []).map((entry, index) => (
            <Card key={entry.id} className="p-4 bg-secondary/30">
              <div className="flex justify-between items-center mb-2">
                <p className="font-semibold text-primary">Por qué #{index + 1}</p>
                {internalData.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleRemoveEntry(entry.id)}
                    aria-label="Eliminar este paso"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <div>
                  <Label htmlFor={`why-${entry.id}`}>¿Por qué?</Label>
                  <Textarea
                    id={`why-${entry.id}`}
                    value={entry.why}
                    onChange={(e) => handleUpdateWhy(entry.id, e.target.value)}
                    placeholder="Pregunte '¿Por qué...?'"
                    rows={2}
                  />
                </div>
                <div className="space-y-2 pt-2">
                  {Array.isArray(entry.becauses) && entry.becauses.map((cause, causeIndex) => (
                    <div key={cause.id} className="pl-4 border-l-2 space-y-1">
                      <Label htmlFor={`because-${entry.id}-${cause.id}`} className="text-xs font-medium">Porque {index + 1}.{causeIndex + 1}</Label>
                      <div className="flex items-start gap-2">
                        <div className="flex-grow space-y-1">
                          <Textarea
                            id={`because-${entry.id}-${cause.id}`}
                            value={cause.description}
                            onChange={(e) => handleUpdateBecause(entry.id, cause.id, e.target.value)}
                            placeholder="Responda con la causa directa..."
                            rows={1}
                            className={cn("text-sm",
                              cause.status === 'accepted' && 'border-green-500 ring-green-500 bg-green-50',
                              cause.status === 'rejected' && 'border-red-500 ring-red-500 bg-red-50 opacity-80'
                            )}
                          />
                           {cause.validationMethod && <p className="text-xs text-muted-foreground italic pl-1">Justificación: {cause.validationMethod}</p>}
                           {cause.status === 'accepted' && (
                            <Button size="sm" variant="secondary" className="text-xs h-7 mt-1" onClick={() => handleAddEntry(cause.description)}>
                              <PlusCircle className="mr-1 h-3 w-3" /> Añadir Siguiente "Por qué"
                            </Button>
                           )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleToggleCauseStatus(entry.id, cause.id, 'accepted')} title="Validar Causa"><Check className={cn("h-3.5 w-3.5", cause.status === 'accepted' ? "text-green-600" : "text-muted-foreground")} /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleToggleCauseStatus(entry.id, cause.id, 'rejected')} title="Rechazar Causa"><X className={cn("h-3.5 w-3.5", cause.status === 'rejected' ? "text-red-600" : "text-muted-foreground")} /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveBecause(entry.id, cause.id)} disabled={entry.becauses.length <= 1} title="Eliminar Causa"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
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
        onOpenChange={() => setValidationState(null)}
        onConfirm={handleConfirmValidation}
        isProcessing={isProcessingValidation}
        title="Confirmar Validación/Rechazo de Causa"
        description="Por favor, ingrese el método o justificación utilizado para validar o rechazar esta causa."
        placeholder="Ej: Inspección visual, análisis de datos, entrevista, etc."
      />
    </>
  );
};
