
'use client';
import { FC, ChangeEvent, useState } from 'react';
import type { IshikawaData, IshikawaCategory, IshikawaCause } from '@/types/rca';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, CornerDownRight, Users, Network, Wrench, Box, Ruler, Leaf, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// --- Validation Dialog Component (similar to CTM's) ---
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

  React.useEffect(() => {
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
          <Label htmlFor="ishikawaValidationMethod">Método de Validación/Rechazo <span className="text-destructive">*</span></Label>
          <Textarea
            id="ishikawaValidationMethod"
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


// --- Main Ishikawa Component ---
interface IshikawaDiagramInteractiveProps {
  focusEventDescription: string;
  ishikawaData: IshikawaData;
  onSetIshikawaData: (data: IshikawaData) => void;
}

const categoryIcons: { [key: string]: React.ElementType } = {
  manpower: Users,
  method: Network,
  machinery: Wrench,
  material: Box,
  measurement: Ruler,
  environment: Leaf,
};

export const IshikawaDiagramInteractive: FC<IshikawaDiagramInteractiveProps> = ({
  focusEventDescription,
  ishikawaData,
  onSetIshikawaData,
}) => {
  const [validationState, setValidationState] = useState<{ categoryId: string; causeId: string; status: 'accepted' | 'rejected' } | null>(null);

  const handleAddCause = (categoryId: string) => {
    const newData = ishikawaData.map(category => {
      if (category.id === categoryId) {
        const newCause: IshikawaCause = {
          id: `cause-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          description: '',
          status: 'pending',
        };
        return { ...category, causes: [...category.causes, newCause] };
      }
      return category;
    });
    onSetIshikawaData(newData);
  };

  const handleUpdateCause = (categoryId: string, causeId: string, value: string) => {
    const newData = ishikawaData.map(category => {
      if (category.id === categoryId) {
        const updatedCauses = category.causes.map(cause =>
          cause.id === causeId ? { ...cause, description: value } : cause
        );
        return { ...category, causes: updatedCauses };
      }
      return category;
    });
    onSetIshikawaData(newData);
  };

  const handleRemoveCause = (categoryId: string, causeId: string) => {
    const newData = ishikawaData.map(category => {
      if (category.id === categoryId) {
        const filteredCauses = category.causes.filter(cause => cause.id !== causeId);
        return { ...category, causes: filteredCauses };
      }
      return category;
    });
    onSetIshikawaData(newData);
  };

  const handleToggleCauseStatus = (categoryId: string, causeId: string, status: 'accepted' | 'rejected') => {
    const category = ishikawaData.find(c => c.id === categoryId);
    const cause = category?.causes.find(c => c.id === causeId);
    if (!cause) return;

    if (cause.status === status) {
      // Toggle back to pending if clicking the same status
      const newData = ishikawaData.map(cat => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            causes: cat.causes.map(c => c.id === causeId ? { ...c, status: 'pending' } : c)
          };
        }
        return cat;
      });
      onSetIshikawaData(newData);
    } else {
      setValidationState({ categoryId, causeId, status });
    }
  };

  const handleConfirmValidation = (method: string) => {
    if (!validationState) return;
    const { categoryId, causeId, status } = validationState;

    const newData = ishikawaData.map(cat => {
      if (cat.id === categoryId) {
        const updatedCauses = cat.causes.map(c => {
          if (c.id === causeId) {
            return { ...c, status, validationMethod: method };
          }
          return c;
        });
        return { ...cat, causes: updatedCauses };
      }
      return cat;
    });

    onSetIshikawaData(newData);
    setValidationState(null);
  };


  const topCategories = ishikawaData.slice(0, 3);
  const bottomCategories = ishikawaData.slice(3, 6);

  const renderCategoryGroup = (categories: IshikawaCategory[]) => (
    <div className={`grid grid-cols-1 md:grid-cols-${categories.length} gap-4 mb-4 relative`}>
      {categories.map((category) => {
        const Icon = categoryIcons[category.id] || CornerDownRight;
        return(
          <Card key={category.id} className="flex flex-col">
            <CardHeader className="pb-2 pt-3 px-4 bg-secondary/30">
              <CardTitle className="text-base font-semibold text-primary flex items-center">
                  <Icon className="mr-2 h-4 w-4" /> 
                  {category.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2 flex-grow">
              {category.causes.map((cause, causeIndex) => (
                <div key={cause.id} className="space-y-1">
                  <div className="flex items-start space-x-2">
                    <CornerDownRight className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
                    <div className="flex-grow space-y-1">
                      <Input
                        id={`cause-${category.id}-${cause.id}`}
                        value={cause.description}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          handleUpdateCause(category.id, cause.id, e.target.value)
                        }
                        placeholder={`Causa #${causeIndex + 1}`}
                        className={cn("h-8 text-xs",
                          cause.status === 'accepted' && 'border-green-500 ring-green-500',
                          cause.status === 'rejected' && 'border-red-500 ring-red-500 opacity-70'
                        )}
                      />
                      {cause.validationMethod && <p className="text-xs text-muted-foreground italic">Justificación: {cause.validationMethod}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveCause(category.id, cause.id)}
                      aria-label="Eliminar causa"
                      className="h-8 w-8 shrink-0"
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                   <div className="flex items-center gap-1 pl-6">
                      <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => handleToggleCauseStatus(category.id, cause.id, 'accepted')}>
                          <Check className={cn("h-3 w-3", cause.status === 'accepted' ? "text-green-600" : "text-muted-foreground")} />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => handleToggleCauseStatus(category.id, cause.id, 'rejected')}>
                          <X className={cn("h-3 w-3", cause.status === 'rejected' ? "text-red-600" : "text-muted-foreground")} />
                      </Button>
                   </div>
                </div>
              ))}
              <Button
                onClick={() => handleAddCause(category.id)}
                variant="outline"
                size="sm"
                className="w-full mt-2 text-xs"
              >
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Añadir Causa
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  );

  return (
    <>
      <div className="space-y-6 mt-4 p-4 border rounded-lg shadow-sm bg-background">
        <h3 className="text-lg font-semibold font-headline text-center text-primary">
          Diagrama de Ishikawa (Espina de Pescado)
        </h3>
        
        {renderCategoryGroup(topCategories)}

        <div className="flex items-center my-4">
          <div className="flex-grow border-t-2 border-gray-400"></div>
          <Card className="mx-4 shrink-0 shadow-lg border-primary">
              <CardContent className="p-3">
                  <p className="text-sm font-semibold text-center text-primary-foreground bg-primary px-3 py-1 rounded">
                      {focusEventDescription || "Evento Foco"}
                  </p>
              </CardContent>
          </Card>
          <div className="flex-grow border-t-2 border-gray-400"></div>
        </div>
        
        {renderCategoryGroup(bottomCategories)}
        
      </div>
      {validationState && (
        <ValidationDialog
          isOpen={!!validationState}
          onOpenChange={() => setValidationState(null)}
          onConfirm={handleConfirmValidation}
          isProcessing={false} // No long running task here
        />
      )}
    </>
  );
};
