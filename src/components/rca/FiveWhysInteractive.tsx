
'use client';
import { FC, useState, useEffect, useCallback, useMemo } from 'react';
import type { FiveWhyEntry, FiveWhyBecause, FiveWhyCause } from '@/types/rca';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, HelpCircle, Check, X, Loader2, ChevronUp, ChevronDown, GitBranch, Target, GitCommitHorizontal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// --- ValidationDialog Component ---
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
          <DialogTitle>Confirmar Validación/Rechazo</DialogTitle>
          <DialogDescription>
            Por favor, ingrese el método utilizado para validar o rechazar esta causa como una línea de investigación.
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
          <Button onClick={handleConfirmClick} disabled={!method.trim() || isProcessing}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const FiveWhysRecursiveRenderer: FC<{
    entries: FiveWhyEntry[],
    level: number,
    basePath: (string|number)[],
    onUpdate: (path: (string|number)[], value: any, field?: keyof FiveWhyCause) => void,
    onAddBecause: (path: (string | number)[]) => void,
    onAddSubWhy: (path: (string | number)[], whyText: string) => void;
    onRemove: (path: (string|number)[], isBecause: boolean) => void,
}> = ({ entries, level, basePath, onUpdate, onAddBecause, onAddSubWhy, onRemove }) => {
    return (
        <div className="ml-4 pl-4 border-l-2 border-gray-300 space-y-3 mt-2">
          {entries.map((entry, whyIndex) => {
            const currentPath = [...basePath, whyIndex];
            
            return (
              <div key={entry.id} className="p-3 border rounded-md bg-card space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor={`why-${entry.id}`} className="font-medium text-base flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-primary" /> ¿Por qué? #{level}
                  </Label>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onRemove(currentPath, false)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
                <Textarea
                  id={`why-${entry.id}`}
                  value={entry.why}
                  onChange={(e) => onUpdate([...currentPath, 'why'], e.target.value)}
                  placeholder="Describa la pregunta..."
                  rows={2}
                />
                
                <div className="space-y-3 mt-2">
                    <div className="flex space-x-2 overflow-x-auto pb-2">
                        {entry.becauses.map((because, becauseIndex) => (
                            <Card key={because.id} className={cn(
                                "p-3 space-y-2 w-64 flex-shrink-0", 
                                because.status === 'accepted' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' : 
                                because.status === 'rejected' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 opacity-70' : 
                                because.status === 'root-cause' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-400 ring-2 ring-amber-300' :
                                'bg-card'
                            )}>
                                <div className="flex justify-between items-center">
                                    <Label className="font-medium text-sm">Porque... #{level}.{becauseIndex + 1}</Label>
                                    <div className="flex items-center">
                                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onUpdate([...currentPath, 'becauses', becauseIndex], !because.isCollapsed, 'isCollapsed')}>{because.isCollapsed ? <ChevronDown className="h-4 w-4"/> : <ChevronUp className="h-4 w-4"/>}</Button>
                                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onRemove([...currentPath, 'becauses', becauseIndex], true)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </div>
                                </div>
                                <div className={cn("space-y-2", !because.isCollapsed ? 'block' : 'hidden')}>
                                    <Textarea
                                        value={because.cause.description}
                                        onChange={(e) => onUpdate([...currentPath, 'becauses', becauseIndex, 'cause'], e.target.value, 'description')}
                                        placeholder="Describa la razón o causa..."
                                        rows={3}
                                    />
                                    {because.cause.validationMethod && (
                                        <div className="text-xs text-muted-foreground pt-1">
                                            <span className="font-semibold">Método V/R:</span> {because.cause.validationMethod}
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-2 pt-2">
                                    <Button size="xs" variant={because.status === 'accepted' ? 'secondary' : 'outline'} className="text-xs h-7" onClick={() => onUpdate([...currentPath, 'becauses', becauseIndex], 'accepted', 'status')}><Check className="mr-1 h-3 w-3"/> Validar</Button>
                                    <Button size="xs" variant={because.status === 'rejected' ? 'secondary' : 'outline'} className="text-xs h-7" onClick={() => onUpdate([...currentPath, 'becauses', becauseIndex], 'rejected', 'status')}><X className="mr-1 h-3 w-3"/> Rechazar</Button>
                                    <Button size="xs" variant={because.status === 'root-cause' ? 'secondary' : 'outline'} className="text-xs h-7" onClick={() => onUpdate([...currentPath, 'becauses', becauseIndex], 'root-cause', 'status')}><Target className="mr-1 h-3 w-3"/> Causa Raíz</Button>
                                    </div>
                                    {because.status === 'accepted' && (
                                      <Button size="xs" variant="outline" className="text-xs h-6 mt-1" onClick={() => onAddSubWhy([...currentPath, 'becauses', becauseIndex, 'subWhys'], `¿Por qué? #${level + 1}`)}>
                                          <PlusCircle className="mr-1 h-3 w-3"/> Siguiente ¿Por qué?
                                      </Button>
                                    )}
                                    {because.subWhys && because.subWhys.length > 0 && (
                                    <FiveWhysRecursiveRenderer
                                        entries={because.subWhys}
                                        level={level + 1}
                                        basePath={[...currentPath, 'becauses', becauseIndex, 'subWhys']}
                                        onUpdate={onUpdate}
                                        onAddBecause={onAddBecause}
                                        onAddSubWhy={onAddSubWhy}
                                        onRemove={onRemove}
                                    />
                                    )}
                                </div>
                            </Card>
                        ))}
                         <Button size="sm" variant="outline" className="text-muted-foreground self-center h-24 w-24 flex-shrink-0" onClick={() => onAddBecause([...currentPath, 'becauses'])}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Causa Paralela
                        </Button>
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      );
};

interface FiveWhysInteractiveProps {
  focusEventDescription: string;
  fiveWhysData: FiveWhyEntry[];
  onSetFiveWhysData: (data: FiveWhyEntry[]) => void;
}

export const FiveWhysInteractive: FC<FiveWhysInteractiveProps> = ({
  focusEventDescription,
  fiveWhysData,
  onSetFiveWhysData,
}) => {
  const [validationState, setValidationState] = useState<{ path: (string | number)[]; status: FiveWhyBecause['status'] } | null>(null);
  const [isProcessingValidation, setIsProcessingValidation] = useState(false);
  
  const initialWhyText = useMemo(() => {
    return focusEventDescription ? `¿Por qué ocurrió: "${focusEventDescription.substring(0,70)}${focusEventDescription.length > 70 ? "..." : ""}"?` : '¿Por qué ocurrió el evento?';
  }, [focusEventDescription]);

  useEffect(() => {
    if (fiveWhysData.length === 0 && focusEventDescription) {
      onSetFiveWhysData([
        { id: generateId('why'), why: initialWhyText, becauses: [] }
      ]);
    }
  }, [focusEventDescription, fiveWhysData, onSetFiveWhysData, initialWhyText]);


  const handleUpdate = useCallback((path: (string | number)[], value: any, field?: keyof FiveWhyCause | 'why' | 'isCollapsed') => {
    const newData = JSON.parse(JSON.stringify(fiveWhysData));
    let current: any = newData;
    
    // Path length must be at least 2 to do anything meaningful
    if(path.length < 2) {
        console.error("Invalid path for update:", path);
        return;
    }

    for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
    }
    const finalKey = path[path.length - 1];

    if (field === 'status') {
      const itemToUpdate = current[finalKey];
      const currentStatus = itemToUpdate.status;

      if(value === 'root-cause') {
         if(currentStatus === 'root-cause') {
            itemToUpdate.status = 'pending';
         } else {
            const unsetRootCauses = (entries: FiveWhyEntry[]) => {
                entries.forEach(entry => {
                    entry.becauses.forEach(because => {
                        if(because.status === 'root-cause') because.status = 'accepted';
                        if(because.subWhys) unsetRootCauses(because.subWhys);
                    });
                });
            }
            unsetRootCauses(newData);
            itemToUpdate.status = 'root-cause';
         }
         onSetFiveWhysData(newData);
         return;
      }
      
      if (currentStatus === value) {
          itemToUpdate.status = 'pending';
          itemToUpdate.cause.validationMethod = undefined;
          onSetFiveWhysData(newData);
      } else {
          setValidationState({ path, status: value });
      }
      if(value === 'rejected') itemToUpdate.isCollapsed = true;
      else if(value === 'accepted') itemToUpdate.isCollapsed = false;

      return;
    }
    
    if (field) {
        if (field === 'why' || field === 'isCollapsed') { // These are properties of the entry/because object itself
            current[finalKey][field] = value;
        } else { // It's a property of the 'cause' object
            if (!current[finalKey].cause) {
                current[finalKey].cause = { description: '' };
            }
            current[finalKey].cause[field] = value;
        }
    } else { // Fallback, should not be hit often
       current[finalKey] = value;
    }
    onSetFiveWhysData(newData);
  }, [fiveWhysData, onSetFiveWhysData]);
  
  const handleConfirmValidation = useCallback((method: string) => {
    if (!validationState) return;
    setIsProcessingValidation(true);
    const { path, status } = validationState;
    
    const newData = JSON.parse(JSON.stringify(fiveWhysData));
    let parent: any = newData;
    for (let i = 0; i < path.length - 1; i++) {
        parent = parent[path[i]];
    }
    const finalKey = path[path.length - 1];
    const itemToUpdate = parent[finalKey];
    
    itemToUpdate.status = status;
    if (!itemToUpdate.cause) itemToUpdate.cause = { description: '' };
    itemToUpdate.cause.validationMethod = method;

    onSetFiveWhysData(newData);
    setIsProcessingValidation(false);
    setValidationState(null);
  }, [fiveWhysData, onSetFiveWhysData, validationState]);

  const handleAddBecause = useCallback((path: (string | number)[]) => {
      const newData = JSON.parse(JSON.stringify(fiveWhysData));
      let parent: any = newData;
      for (let i = 0; i < path.length - 1; i++) {
          parent = parent[path[i]];
      }
      const arrayKey = path[path.length - 1];
      if (!Array.isArray(parent[arrayKey])) {
        console.error("Target for adding 'because' is not an array", path, parent);
        return;
      }
      
      parent[arrayKey].push({ id: generateId('because'), status: 'pending', cause: { description: '' }, subWhys: [], isCollapsed: false });
      onSetFiveWhysData(newData);
  }, [fiveWhysData, onSetFiveWhysData]);

  const handleAddSubWhy = useCallback((path: (string | number)[], whyText: string) => {
      const newData = JSON.parse(JSON.stringify(fiveWhysData));
      let parent: any = newData;
      for (let i = 0; i < path.length - 1; i++) {
          parent = parent[path[i]];
      }
      const arrayKey = path[path.length - 1];
       if (!parent[arrayKey]) {
        parent[arrayKey] = [];
      }
      if (!Array.isArray(parent[arrayKey])) {
        console.error("Target for adding 'subWhy' is not an array", path, parent);
        return;
      }
      parent[arrayKey].push({ id: generateId('why'), why: whyText, becauses: [] });
      onSetFiveWhysData(newData);
  }, [fiveWhysData, onSetFiveWhysData]);
  
  const handleRemove = useCallback((path: (string|number)[], isBecause: boolean) => {
      const newData = JSON.parse(JSON.stringify(fiveWhysData));
      if (path.length === 1 && !isBecause) {
        newData.splice(path[0] as number, 1);
        onSetFiveWhysData(newData);
        return;
      }

      let parent: any = newData;
      for (let i = 0; i < path.length - 2; i++) {
        parent = parent[path[i]];
      }
      
      const arrayContainer = parent[path[path.length-2]];
      const indexToRemove = path[path.length - 1] as number;

      if(isBecause && Array.isArray(arrayContainer.becauses)) {
        arrayContainer.becauses.splice(indexToRemove, 1);
      } else if (!isBecause && Array.isArray(arrayContainer.subWhys)) {
        arrayContainer.subWhys.splice(indexToRemove, 1);
      } else {
         console.error("Error on handleRemove: Could not find array to remove from.", { path, parent });
         return;
      }
      onSetFiveWhysData(newData);
  }, [fiveWhysData, onSetFiveWhysData]);

  const addParallelInvestigation = () => {
    onSetFiveWhysData([
      ...fiveWhysData,
      { id: generateId('why'), why: initialWhyText, becauses: [] }
    ]);
  };

  return (
    <Card className="mt-4 shadow-sm">
      <CardContent className="p-4 space-y-4">
        <h3 className="text-lg font-semibold font-headline text-center text-primary flex items-center justify-center">
          <HelpCircle className="mr-2 h-5 w-5" /> Análisis de los 5 Porqués (Estructura de Árbol)
        </h3>
        
        <div className="flex space-x-4 overflow-x-auto p-2">
            {fiveWhysData.map((entry, index) => (
              <div key={entry.id} className="p-3 border rounded-md bg-secondary/30 flex-shrink-0 w-[450px] max-w-[90vw] space-y-3">
                <div className="flex justify-between items-center mb-1">
                    <Label htmlFor={`why-root-${entry.id}`} className="font-medium text-base flex items-center gap-2">
                      <GitCommitHorizontal className="h-4 w-4 text-primary" /> Línea de Investigación #{index + 1}
                    </Label>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRemove([index], false)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
                <Textarea
                  id={`why-root-${entry.id}`}
                  value={entry.why}
                  onChange={(e) => handleUpdate([index], e.target.value, 'why')}
                  placeholder="Describa la pregunta inicial..."
                  rows={2}
                />
                <div className="mt-4 space-y-3">
                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    {entry.becauses.map((because, becauseIndex) => {
                        const currentPath = [index, 'becauses', becauseIndex];
                        return (
                            <Card key={because.id} className={cn(
                                "p-3 space-y-2 w-64 flex-shrink-0",
                                because.status === 'accepted' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' : 
                                because.status === 'rejected' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 opacity-70' : 
                                because.status === 'root-cause' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-400 ring-2 ring-amber-300' :
                                'bg-card'
                            )}>
                                <div className="flex justify-between items-center">
                                    <Label className="font-medium text-sm">Porque... #{index + 1}.{becauseIndex + 1}</Label>
                                    <div className="flex items-center">
                                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleUpdate(currentPath, !because.isCollapsed, 'isCollapsed')}>{because.isCollapsed ? <ChevronDown className="h-4 w-4"/> : <ChevronUp className="h-4 w-4"/>}</Button>
                                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRemove(currentPath, true)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </div>
                                </div>
                                <div className={cn("space-y-2", !because.isCollapsed ? 'block' : 'hidden')}>
                                    <Textarea
                                        value={because.cause.description}
                                        onChange={(e) => handleUpdate(currentPath, e.target.value, 'description')}
                                        placeholder="Describa la razón o causa..."
                                        rows={3}
                                    />
                                     {because.cause.validationMethod && (
                                        <div className="text-xs text-muted-foreground pt-1">
                                            <span className="font-semibold">Método V/R:</span> {because.cause.validationMethod}
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-2 pt-2">
                                      <Button size="xs" variant={because.status === 'accepted' ? 'secondary' : 'outline'} className="text-xs h-7" onClick={() => handleUpdate(currentPath, 'accepted', 'status')}><Check className="mr-1 h-3 w-3"/> Validar</Button>
                                      <Button size="xs" variant={because.status === 'rejected' ? 'secondary' : 'outline'} className="text-xs h-7" onClick={() => handleUpdate(currentPath, 'rejected', 'status')}><X className="mr-1 h-3 w-3"/> Rechazar</Button>
                                      <Button size="xs" variant={because.status === 'root-cause' ? 'secondary' : 'outline'} className="text-xs h-7" onClick={() => handleUpdate(currentPath, 'root-cause', 'status')}><Target className="mr-1 h-3 w-3"/> Causa Raíz</Button>
                                    </div>

                                    {because.status === 'accepted' && (
                                        <Button size="xs" variant="outline" className="text-xs h-6 mt-1" onClick={() => handleAddSubWhy([index, 'becauses', becauseIndex, 'subWhys'], `¿Por qué? #2`)}>
                                            <PlusCircle className="mr-1 h-3 w-3"/> Siguiente ¿Por qué?
                                        </Button>
                                    )}
                                    
                                    {because.subWhys && because.subWhys.length > 0 && (
                                      <FiveWhysRecursiveRenderer
                                          entries={because.subWhys}
                                          level={2}
                                          basePath={[index, 'becauses', becauseIndex, 'subWhys']}
                                          onRemove={handleRemove}
                                          onAddSubWhy={handleAddSubWhy}
                                          onAddBecause={handleAddBecause}
                                          onUpdate={handleUpdate}
                                      />
                                    )}
                                </div>
                            </Card>
                        )
                    })}
                  </div>
                  <div className="pt-2 border-t mt-2">
                    <Button size="sm" variant="outline" className="w-full text-muted-foreground" onClick={() => handleAddBecause([index, 'becauses'])}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Añadir Causa Paralela
                    </Button>
                  </div>
                </div>
              </div>
            ))}
        </div>
        
        <div className="pt-4 border-t">
          <Button onClick={addParallelInvestigation} variant="outline" className="w-full">
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Línea de Investigación Paralela
          </Button>
        </div>

        {validationState && (
          <ValidationDialog
            isOpen={!!validationState}
            onOpenChange={() => setValidationState(null)}
            onConfirm={handleConfirmValidation}
            isProcessing={isProcessingValidation}
          />
        )}
      </CardContent>
    </Card>
  );
};
