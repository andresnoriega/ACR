
'use client';
import { FC, useState, useEffect, useCallback } from 'react';
import type { FiveWhyEntry, FiveWhysData, FiveWhyBecause } from '@/types/rca';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, HelpCircle, Check, X, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// --- ValidationDialog Component ---
interface ValidationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (method: string) => void;
  statusToConfirm: 'accepted' | 'rejected';
  isProcessing: boolean;
}

const ValidationDialog: FC<ValidationDialogProps> = ({ isOpen, onOpenChange, onConfirm, statusToConfirm, isProcessing }) => {
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
          <DialogTitle>Confirmar {statusToConfirm === 'accepted' ? 'Aceptación' : 'Rechazo'}</DialogTitle>
          <DialogDescription>
            Por favor, ingrese el método utilizado para {statusToConfirm === 'accepted' ? 'validar' : 'rechazar'} esta causa.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="validationMethod">Método de Validación/Rechazo <span className="text-destructive">*</span></Label>
          <Textarea
            id="validationMethod"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="Ej: Revisión de bitácora, entrevista con operador, etc."
            className="mt-1"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isProcessing}>Cancelar</Button>
          </DialogClose>
          <Button onClick={handleConfirmClick} disabled={!method.trim() || isProcessing} className={statusToConfirm === 'rejected' ? 'bg-destructive hover:bg-destructive/90' : ''}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar {statusToConfirm === 'accepted' ? 'Aceptación' : 'Rechazo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


// --- FiveWhysRecursiveRenderer Component ---
interface FiveWhysRecursiveRendererProps {
  entries: FiveWhyEntry[];
  parentPath: (string | number)[];
  parentNumber: string;
  onUpdate: (path: (string | number)[], value: any, field?: string) => void;
  onAdd: (path: (string | number)[]) => void;
  onRemove: (path: (string | number)[]) => void;
}

const FiveWhysRecursiveRenderer: FC<FiveWhysRecursiveRendererProps> = ({
  entries,
  parentPath,
  parentNumber,
  onUpdate,
  onAdd,
  onRemove,
}) => {
  return (
    <div className="ml-6 border-l-2 pl-4 space-y-4">
      {entries.map((entry, whyIndex) => {
        const currentWhyNumber = `${parentNumber}.${whyIndex + 1}`;
        const currentWhyPath = [...parentPath, whyIndex];
        return (
          <div key={entry.id}>
            <div className="flex justify-between items-center mb-1">
              <Label htmlFor={`why-${entry.id}`} className="font-medium text-base">¿Por qué? #{currentWhyNumber}</Label>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onRemove(currentWhyPath)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
            <Textarea
              id={`why-${entry.id}`}
              value={entry.why}
              onChange={(e) => onUpdate(currentWhyPath, e.target.value, 'why')}
              placeholder="Describa la pregunta..."
              rows={2}
            />
            <div className="mt-2 flex flex-wrap gap-4">
              {entry.becauses.map((because, becauseIndex) => (
                <Card key={because.id} className={cn("p-3 space-y-2 flex-1 min-w-[280px]", because.status === 'accepted' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' : because.status === 'rejected' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700' : 'bg-card')}>
                  <div className="flex justify-between items-center">
                    <Label className="font-medium text-sm">Porque... {currentWhyNumber}.{becauseIndex + 1}</Label>
                    <div className="flex items-center">
                      <Button size="icon" variant={because.status === 'accepted' ? 'secondary' : 'ghost'} className="h-6 w-6" onClick={() => onUpdate([...currentWhyPath, 'becauses', becauseIndex], 'accepted', 'status')}><Check className="h-4 w-4 text-green-600" /></Button>
                      <Button size="icon" variant={because.status === 'rejected' ? 'secondary' : 'ghost'} className="h-6 w-6" onClick={() => onUpdate([...currentWhyPath, 'becauses', becauseIndex], 'rejected', 'status')}><X className="h-4 w-4 text-destructive" /></Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onRemove([...currentWhyPath, 'becauses', becauseIndex])}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                  <Textarea
                    value={because.description}
                    onChange={(e) => onUpdate([...currentWhyPath, 'becauses', becauseIndex], e.target.value, 'description')}
                    placeholder="Describa la razón..."
                    rows={2}
                  />
                   {because.validationMethod && (
                      <div className="text-xs text-muted-foreground pt-1">
                          <span className="font-semibold">Método de V/R:</span> {because.validationMethod}
                      </div>
                   )}
                  {because.status === 'accepted' && (
                    <Button size="sm" variant="outline" className="text-xs h-7 mt-2" onClick={() => onAdd([...currentWhyPath, 'becauses', becauseIndex, 'subWhys'])}>
                      <PlusCircle className="mr-1 h-3 w-3" /> Añadir Siguiente ¿Por qué?
                    </Button>
                  )}
                  {because.subWhys && because.subWhys.length > 0 && (
                    <FiveWhysRecursiveRenderer
                      entries={because.subWhys}
                      parentPath={[...currentWhyPath, 'becauses', becauseIndex, 'subWhys']}
                      parentNumber={`${currentWhyNumber}.${becauseIndex + 1}`}
                      onUpdate={onUpdate}
                      onAdd={onAdd}
                      onRemove={onRemove}
                    />
                  )}
                </Card>
              ))}
              <div className="flex items-center">
                  <Button size="sm" variant="outline" className="h-full" onClick={() => onAdd([...currentWhyPath, 'becauses'])}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir "Porque..."
                  </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};


// --- Main Component ---
interface FiveWhysInteractiveProps {
  focusEventDescription: string;
  fiveWhysData: FiveWhysData;
  onSetFiveWhysData: (data: FiveWhysData) => void;
}

export const FiveWhysInteractive: FC<FiveWhysInteractiveProps> = ({
  focusEventDescription,
  fiveWhysData,
  onSetFiveWhysData,
}) => {
  const [validationState, setValidationState] = useState<{ path: (string | number)[]; status: 'accepted' | 'rejected' } | null>(null);
  const [isProcessingValidation, setIsProcessingValidation] = useState(false);

  useEffect(() => {
    if (fiveWhysData.length === 0 && focusEventDescription) {
      onSetFiveWhysData([
        { id: generateId('why'), why: `¿Por qué ocurrió: "${focusEventDescription}"?`, becauses: [] }
      ]);
    }
  }, [focusEventDescription, fiveWhysData, onSetFiveWhysData]);

  const handleUpdate = useCallback((path: (string | number)[], value: any, field?: string) => {
    const newData = JSON.parse(JSON.stringify(fiveWhysData));
    let current = newData;
    for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
    }
    const finalKey = path[path.length - 1];
    
    if (field === 'status') {
      const currentStatus = current[finalKey].status;
      if (currentStatus === value) { // If clicking on the same status, toggle it back to pending
          current[finalKey].status = 'pending';
          current[finalKey].validationMethod = undefined;
          onSetFiveWhysData(newData);
      } else {
          setValidationState({ path, status: value });
      }
      return; 
    }

    if(field) {
        current[finalKey][field] = value;
    } else {
        current[finalKey] = value;
    }
    onSetFiveWhysData(newData);
  }, [fiveWhysData, onSetFiveWhysData]);
  
  const handleConfirmValidation = useCallback((method: string) => {
    if (!validationState) return;
    setIsProcessingValidation(true);
    const { path, status } = validationState;
    const newData = JSON.parse(JSON.stringify(fiveWhysData));
    let current = newData;
    for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
    }
    const finalKey = path[path.length - 1];
    current[finalKey].status = status;
    current[finalKey].validationMethod = method;
    onSetFiveWhysData(newData);
    setIsProcessingValidation(false);
    setValidationState(null);
  }, [fiveWhysData, onSetFiveWhysData, validationState]);

  const handleAdd = useCallback((path: (string | number)[]) => {
    const newData = JSON.parse(JSON.stringify(fiveWhysData));
    let current: any = newData;
    for (let i = 0; i < path.length; i++) {
      current = current[path[i]];
    }
    
    const keyToAdd = path[path.length-1];
    if (keyToAdd === 'becauses') {
        current.push({ id: generateId('because'), description: '', status: 'pending', subWhys: [] });
    } else if (keyToAdd === 'subWhys') {
        const parentBecauseDescription = current.description || '';
        if (!current.subWhys) current.subWhys = [];
        current.subWhys.push({ id: generateId('why'), why: `¿Por qué: "${parentBecauseDescription.substring(0,50)}..."?`, becauses: [] });
    } else {
         newData.push({ id: generateId('why'), why: '', becauses: [] });
    }
    
    onSetFiveWhysData(newData);
  }, [fiveWhysData, onSetFiveWhysData]);

  const handleRemove = useCallback((path: (string | number)[]) => {
    const newData = JSON.parse(JSON.stringify(fiveWhysData));
    if (path.length === 1) { // Removing a root-level "why"
      newData.splice(path[0] as number, 1);
    } else {
      let parent = newData;
      // Navigate to the parent array
      for (let i = 0; i < path.length - 2; i++) {
        parent = parent[path[i]];
      }

      // The last part of the path is the index to remove, the second to last is the key of the array
      const keyOfArray = path[path.length - 2];
      const indexToRemove = path[path.length - 1] as number;

      if (Array.isArray(parent[keyOfArray])) {
        parent[keyOfArray].splice(indexToRemove, 1);
      } else {
        console.error("Error on handleRemove: Could not find the array to remove from.", { path, parent });
      }
    }
    onSetFiveWhysData(newData);
  }, [fiveWhysData, onSetFiveWhysData]);
  
  return (
    <Card className="mt-4 shadow-sm">
      <CardContent className="p-4 space-y-4">
        <h3 className="text-lg font-semibold font-headline text-center text-primary flex items-center justify-center">
          <HelpCircle className="mr-2 h-5 w-5" /> Análisis de los 5 Porqués
        </h3>
        {fiveWhysData.map((entry, index) => (
          <div key={entry.id} className="p-3 border rounded-md bg-secondary/30">
            <div className="flex justify-between items-center mb-1">
                <Label htmlFor={`why-root-${entry.id}`} className="font-medium text-base">¿Por qué? #{index + 1}</Label>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRemove([index])}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
            <Textarea
              id={`why-root-${entry.id}`}
              value={entry.why}
              onChange={(e) => handleUpdate([index], e.target.value, 'why')}
              placeholder="Describa la pregunta inicial..."
              rows={2}
            />
            <div className="mt-2 flex flex-wrap gap-4">
              {entry.becauses.map((because, becauseIndex) => (
                <Card key={because.id} className={cn("p-3 space-y-2 flex-1 min-w-[280px]", because.status === 'accepted' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' : because.status === 'rejected' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700' : 'bg-card')}>
                  <div className="flex justify-between items-center">
                    <Label className="font-medium text-sm">Porque... {index + 1}.{becauseIndex + 1}</Label>
                     <div className="flex items-center">
                        <Button size="icon" variant={because.status === 'accepted' ? 'secondary' : 'ghost'} className="h-6 w-6" onClick={() => handleUpdate([index, 'becauses', becauseIndex], 'accepted', 'status')}><Check className="h-4 w-4 text-green-600"/></Button>
                        <Button size="icon" variant={because.status === 'rejected' ? 'secondary' : 'ghost'} className="h-6 w-6" onClick={() => handleUpdate([index, 'becauses', becauseIndex], 'rejected', 'status')}><X className="h-4 w-4 text-destructive" /></Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRemove([index, 'becauses', becauseIndex])}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                     </div>
                  </div>
                   <Textarea
                        value={because.description}
                        onChange={(e) => handleUpdate([index, 'becauses', becauseIndex], e.target.value, 'description')}
                        placeholder="Describa la razón..."
                        rows={2}
                    />
                     {because.validationMethod && (
                        <div className="text-xs text-muted-foreground pt-1">
                            <span className="font-semibold">Método de V/R:</span> {because.validationMethod}
                        </div>
                     )}
                   {because.status === 'accepted' && (
                       <Button size="sm" variant="outline" className="text-xs h-7 mt-2" onClick={() => handleAdd([index, 'becauses', becauseIndex])}>
                           <PlusCircle className="mr-1 h-3 w-3" /> Añadir Siguiente ¿Por qué?
                       </Button>
                   )}
                  {because.subWhys && because.subWhys.length > 0 && (
                    <FiveWhysRecursiveRenderer
                      entries={because.subWhys}
                      parentPath={[index, 'becauses', becauseIndex, 'subWhys']}
                      parentNumber={`${index + 1}.${becauseIndex + 1}`}
                      onUpdate={handleUpdate}
                      onAdd={handleAdd}
                      onRemove={handleRemove}
                    />
                  )}
                </Card>
              ))}
               <div className="flex items-center self-stretch">
                  <Button size="sm" variant="outline" className="h-full" onClick={() => handleAdd([index, 'becauses'])}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir "Porque..."
                  </Button>
               </div>
            </div>
          </div>
        ))}
         <div className="pt-4">
             <Button size="sm" variant="outline" onClick={() => handleAdd([])}>
                <PlusCircle className="mr-2 h-4 w-4" /> Iniciar nueva línea de análisis de Porqués
             </Button>
        </div>


        {validationState && (
          <ValidationDialog
            isOpen={!!validationState}
            onOpenChange={() => setValidationState(null)}
            onConfirm={handleConfirmValidation}
            statusToConfirm={validationState.status}
            isProcessing={isProcessingValidation}
          />
        )}
      </CardContent>
    </Card>
  );
};
