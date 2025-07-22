
'use client';
import { FC, useState, useCallback, useMemo, useEffect } from 'react';
import type { FiveWhyEntry, FiveWhyNode } from '@/types/rca';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, HelpCircle, Check, X, Loader2, ChevronDown, GitBranch, Target } from 'lucide-react';
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
  entry: FiveWhyEntry,
  level: number,
  basePath: (string | number)[],
  onUpdate: (path: (string | number)[], value: any, field: keyof FiveWhyNode | 'why') => void,
  onAddNode: (path: (string | number)[]) => void,
  onRemoveNode: (path: (string | number)[]) => void,
  onAddSubAnalysis: (path: (string | number)[]) => void,
  onSetRootCause: (path: (string | number)[]) => void,
}> = ({ entry, level, basePath, onUpdate, onAddNode, onRemoveNode, onAddSubAnalysis, onSetRootCause }) => {
  return (
    <div className="ml-4 pl-4 border-l-2 border-gray-300 space-y-3 mt-2">
      <div className="flex justify-between items-center">
        <Label htmlFor={`why-${entry.id}`} className="font-medium text-base flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" /> ¿Por qué? #{level}
        </Label>
      </div>
      <Textarea
        id={`why-${entry.id}`}
        value={entry.why}
        onChange={(e) => onUpdate([...basePath, 'why'], e.target.value, 'why')}
        placeholder="Describa la pregunta..."
        rows={2}
      />
      
      <div className="flex flex-wrap gap-4 items-start">
        {(entry.responses || []).map((node, nodeIndex) => {
          const nodePath = [...basePath, 'responses', nodeIndex];
          return (
            <Card key={node.id} className={cn(
                "p-3 space-y-2 flex-grow min-w-[300px] w-full sm:w-auto",
                node.status === 'accepted' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' :
                node.status === 'rejected' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 opacity-70' :
                'bg-card',
                node.isRootCause && 'ring-2 ring-amber-400 border-amber-400'
            )}>
              <div className="flex justify-between items-center">
                <Label className="font-medium text-sm">Porque... #{level}.{nodeIndex + 1}</Label>
                <div className="flex items-center">
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onUpdate(nodePath, !node.isCollapsed, 'isCollapsed')}><ChevronDown className={cn("h-4 w-4 transition-transform", !node.isCollapsed && "rotate-180")} /></Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onRemoveNode(nodePath)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              <div className={cn("space-y-2", !node.isCollapsed ? 'block' : 'hidden')}>
                <Textarea
                  value={node.description}
                  onChange={(e) => onUpdate(nodePath, e.target.value, 'description')}
                  placeholder="Describa la razón o causa..."
                  rows={3}
                />
                {node.validationMethod && (
                  <div className="text-xs text-muted-foreground pt-1">
                    <span className="font-semibold">Método V/R:</span> {node.validationMethod}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="xs" variant={node.status === 'accepted' ? 'secondary' : 'outline'} className="text-xs h-7" onClick={() => onUpdate(nodePath, 'accepted', 'status')}><Check className="mr-1 h-3 w-3" /> Validar</Button>
                  <Button size="xs" variant={node.status === 'rejected' ? 'secondary' : 'outline'} className="text-xs h-7" onClick={() => onUpdate(nodePath, 'rejected', 'status')}><X className="mr-1 h-3 w-3" /> Rechazar</Button>
                  <Button size="xs" variant={node.isRootCause ? 'default' : 'outline'} className="text-xs h-7" onClick={() => onSetRootCause(nodePath)}><Target className="mr-1 h-3 w-3" /> Causa Raíz</Button>
                </div>
                {node.status === 'accepted' && !node.subAnalysis && (
                  <Button size="xs" variant="outline" className="text-xs h-6 mt-1" onClick={() => onAddSubAnalysis(nodePath)}>
                    <PlusCircle className="mr-1 h-3 w-3" /> Siguiente ¿Por qué?
                  </Button>
                )}
                {node.subAnalysis && (
                  <FiveWhysRecursiveRenderer
                    entry={node.subAnalysis}
                    level={level + 1}
                    basePath={[...nodePath, 'subAnalysis']}
                    onUpdate={onUpdate}
                    onAddNode={onAddNode}
                    onRemoveNode={onRemoveNode}
                    onAddSubAnalysis={onAddSubAnalysis}
                    onSetRootCause={onSetRootCause}
                  />
                )}
              </div>
            </Card>
          );
        })}
         <Button size="sm" variant="outline" className="text-muted-foreground self-center h-full min-h-[120px] w-full sm:w-auto" onClick={() => onAddNode([...basePath, 'responses'])}>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Causa Paralela
        </Button>
      </div>
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
  const [validationState, setValidationState] = useState<{ path: (string | number)[]; status: FiveWhyNode['status'] } | null>(null);
  const [isProcessingValidation, setIsProcessingValidation] = useState(false);

  const initialWhyText = useMemo(() => {
    return focusEventDescription ? `¿Por qué ocurrió: "${focusEventDescription.substring(0,70)}${focusEventDescription.length > 70 ? "..." : ""}"?` : '¿Por qué ocurrió el evento?';
  }, [focusEventDescription]);

  useEffect(() => {
    if (fiveWhysData.length === 0) {
      onSetFiveWhysData([
        { id: generateId('why'), why: initialWhyText, responses: [] }
      ]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusEventDescription, onSetFiveWhysData, initialWhyText]);


  const handleUpdate = useCallback((path: (string|number)[], value: any, field?: keyof FiveWhyNode | 'why') => {
    const newData = JSON.parse(JSON.stringify(fiveWhysData));
    let current: any = newData;
    
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    const finalKey = path[path.length - 1];

    if (field === 'status') {
      const itemToUpdate = current[finalKey];
      if (itemToUpdate.status === value) {
        itemToUpdate.status = 'pending';
        itemToUpdate.validationMethod = undefined;
      } else {
        setValidationState({ path, status: value });
      }
      onSetFiveWhysData(newData);
      return;
    }

    if (field) {
        current[finalKey][field] = value;
    } else { // Should not happen with field check, but for safety
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
    itemToUpdate.validationMethod = method;

    onSetFiveWhysData(newData);
    setIsProcessingValidation(false);
    setValidationState(null);
  }, [fiveWhysData, onSetFiveWhysData, validationState]);


  const handleAddNode = useCallback((path: (string | number)[]) => {
    const newData = JSON.parse(JSON.stringify(fiveWhysData));
    let parent: any = newData;
    
    // Traverse to the object that should contain the array.
    for (let i = 0; i < path.length - 1; i++) {
        parent = parent[path[i]];
    }

    const arrayKey = path[path.length - 1] as string;

    // Ensure the array exists before pushing.
    if (!Array.isArray(parent[arrayKey])) {
        parent[arrayKey] = [];
    }

    parent[arrayKey].push({
        id: generateId('node'),
        description: '',
        isRootCause: false,
        isCollapsed: false,
        status: 'pending',
    });
    
    onSetFiveWhysData(newData);
  }, [fiveWhysData, onSetFiveWhysData]);


  const handleRemoveNode = useCallback((path: (string|number)[]) => {
    const newData = JSON.parse(JSON.stringify(fiveWhysData));
    let parent: any = newData;
    // Navigate to the object containing the array.
    for (let i = 0; i < path.length - 2; i++) {
        parent = parent[path[i]];
    }
    const arrayKey = path[path.length - 2] as string;
    const indexToRemove = path[path.length - 1] as number;
    
    // Check if the array exists before trying to splice it.
    if (parent && Array.isArray(parent[arrayKey])) {
        parent[arrayKey].splice(indexToRemove, 1);
        onSetFiveWhysData(newData);
    } else {
        console.error("Error on handleRemoveNode: Could not find array to remove from.", { path, parent });
    }
  }, [fiveWhysData, onSetFiveWhysData]);


  const handleAddSubAnalysis = useCallback((path: (string|number)[]) => {
    const newData = JSON.parse(JSON.stringify(fiveWhysData));
    let parent: any = newData;
    for (let i = 0; i < path.length - 1; i++) {
        parent = parent[path[i]];
    }
    const finalKey = path[path.length - 1];
    parent[finalKey].subAnalysis = {
      id: generateId('why'),
      why: `¿Por qué: "${parent[finalKey].description.substring(0, 50)}..."?`,
      responses: [],
    };
    parent[finalKey].isCollapsed = false;
    onSetFiveWhysData(newData);
  }, [fiveWhysData, onSetFiveWhysData]);
  
  const handleSetRootCause = useCallback((path: (string|number)[]) => {
    const newData = JSON.parse(JSON.stringify(fiveWhysData));

    // Function to recursively clear existing root causes
    const clearRootCauses = (entry: FiveWhyEntry) => {
      if (!entry.responses) return;
      entry.responses.forEach(node => {
        node.isRootCause = false;
        if (node.subAnalysis) {
          clearRootCauses(node.subAnalysis);
        }
      });
    };
    newData.forEach(clearRootCauses);

    // Set the new root cause
    let parent: any = newData;
    for (let i = 0; i < path.length - 1; i++) {
        parent = parent[path[i]];
    }
    const finalKey = path[path.length - 1];
    const nodeToUpdate = parent[finalKey];
    
    // Toggle root cause status
    nodeToUpdate.isRootCause = !nodeToUpdate.isRootCause;
    
    // If it's now a root cause, ensure it's also accepted.
    if (nodeToUpdate.isRootCause) {
        nodeToUpdate.status = 'accepted';
    }

    onSetFiveWhysData(newData);
  }, [fiveWhysData, onSetFiveWhysData]);
  
  const handleAddWhyInvestigation = () => {
    onSetFiveWhysData([
      ...fiveWhysData,
      { id: generateId('why'), why: `¿Por qué ocurrió el evento? (Investigación Paralela #${fiveWhysData.length})`, responses: [] }
    ]);
  };
  
  const handleRemoveWhyInvestigation = (indexToRemove: number) => {
    onSetFiveWhysData(fiveWhysData.filter((_, index) => index !== indexToRemove));
  };


  if (fiveWhysData.length === 0) {
    return (
      <Card className="mt-4 shadow-sm">
        <CardContent className="p-4 space-y-4 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Inicializando análisis...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4 shadow-sm">
      <CardContent className="p-4 space-y-4">
        <h3 className="text-lg font-semibold font-headline text-center text-primary flex items-center justify-center">
          <HelpCircle className="mr-2 h-5 w-5" /> Análisis de los 5 Porqués (Árbol Ramificado)
        </h3>
        
        <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-4 space-y-4 lg:space-y-0">
            {fiveWhysData.map((entry, index) => (
                <div key={entry.id} className="p-3 border rounded-md bg-secondary/30 flex-1 min-w-0">
                    <div className="flex justify-end mb-1">
                      {fiveWhysData.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveWhyInvestigation(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <FiveWhysRecursiveRenderer
                      entry={entry}
                      level={1}
                      basePath={[index]}
                      onUpdate={handleUpdate}
                      onAddNode={handleAddNode}
                      onRemoveNode={handleRemoveNode}
                      onAddSubAnalysis={handleAddSubAnalysis}
                      onSetRootCause={handleSetRootCause}
                    />
                </div>
            ))}
        </div>
        <div className="pt-4 border-t">
          <Button variant="outline" className="w-full" onClick={handleAddWhyInvestigation}>
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
