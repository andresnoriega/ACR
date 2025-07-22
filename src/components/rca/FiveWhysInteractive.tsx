'use client';
import { FC, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { FiveWhyEntry, FiveWhyNode } from '@/types/rca';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, HelpCircle, Check, X, Loader2, ChevronDown, GitBranch, Target, GripVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from "@/hooks/use-toast";

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// --- RootCauseConfirmationDialog Component ---
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
          <DialogTitle>Confirmar Causa Raíz</DialogTitle>
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
            <Button type="button" variant="outline" disabled={isProcessing}>Cancelar</Button>
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

const getNodeByPath = (data: any[], path: (string | number)[]): any => {
    let current: any = { responses: data };
    for (const key of path) {
      if (current === undefined || current === null) return null;
      if(current.responses) {
        current = current.responses[key as number];
      } else if (current.subAnalysis) {
        current = current.subAnalysis;
        // if subAnalysis, the next key is 'responses' so we need to handle that.
        if (path[path.indexOf(key) + 1] === 'responses') {
           // Do nothing, the next loop will handle it.
        } else {
           // if it's not responses, it's a direct property access on subAnalysis
           current = current[path[path.indexOf(key) + 1]];
           // to avoid processing the next key twice
           path.splice(path.indexOf(key) + 1, 1);
        }
      } else {
         return null;
      }
    }
    return current;
};

// Helper to get the parent array and the index of the node to modify.
const getParentArrayAndIndex = (data: any[], path: (string | number)[]): { parentArray: any[], index: number } | null => {
    if (path.length === 0) return null;
    let current = { responses: data };
    for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        if (current === undefined || current === null) return null;
        if (current.responses) {
            current = current.responses[key as number];
        } else if (current.subAnalysis) {
            current = current.subAnalysis;
        } else {
            return null;
        }
    }
    const lastKey = path[path.length - 1];
    if (current && Array.isArray(current.responses) && typeof lastKey === 'number') {
        return { parentArray: current.responses, index: lastKey };
    }
    return null;
};


const FiveWhysRecursiveRenderer: FC<{
  entry: FiveWhyEntry,
  level: number,
  basePath: (string | number)[],
  onUpdate: (path: (string | number)[], value: any, field: keyof FiveWhyNode | 'why' | 'isCollapsed' | 'width') => void,
  onAddNode: (path: (string | number)[]) => void,
  onRemoveNode: (path: (string | number)[]) => void,
  onAddSubAnalysis: (path: (string | number)[]) => void,
  onSetRootCause: (path: (string | number)[]) => void,
  onSetStatus: (path: (string | number)[], status: FiveWhyNode['status']) => void,
}> = ({ entry, level, basePath, onUpdate, onAddNode, onRemoveNode, onAddSubAnalysis, onSetRootCause, onSetStatus }) => {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const resizingNodeIndex = useRef<number | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);
  
  const handleMouseDown = (e: React.MouseEvent, index: number) => {
    const cardElement = cardRefs.current[index];
    if (cardElement) {
        resizingNodeIndex.current = index;
        startX.current = e.clientX;
        startWidth.current = cardElement.offsetWidth;
        document.body.style.cursor = 'ew-resize';
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (resizingNodeIndex.current === null) return;
    
    const dx = e.clientX - startX.current;
    const newWidth = Math.max(280, startWidth.current + dx); // Minimum width
    const nodePath = [...basePath, 'responses', resizingNodeIndex.current];
    onUpdate(nodePath, `${newWidth}px`, 'width');
  }, [basePath, onUpdate]);

  const handleMouseUp = useCallback(() => {
    document.body.style.cursor = 'default';
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    resizingNodeIndex.current = null;
  }, [handleMouseMove]);


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
        onChange={(e) => onUpdate([...basePath], e.target.value, 'why')}
        placeholder="Describa la pregunta..."
        rows={2}
      />
      
      <div className="flex flex-wrap gap-4 items-start">
        {(entry.responses || []).map((node, nodeIndex) => {
          const nodePath = [...basePath, 'responses', nodeIndex];
          return (
            <Card
                key={node.id}
                ref={el => cardRefs.current[nodeIndex] = el}
                className={cn(
                    "relative p-3 space-y-2 flex-grow min-w-[280px]",
                    node.status === 'accepted' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' :
                    node.status === 'rejected' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 opacity-70' :
                    'bg-card',
                    node.isRootCause && 'ring-2 ring-amber-400 border-amber-400'
                )}
                style={{ width: node.width || 'auto', flexBasis: 'auto', flexGrow: 1 }}
            >
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
                  <Button size="xs" variant={node.status === 'accepted' ? 'secondary' : 'outline'} className="text-xs h-7" onClick={() => onSetStatus(nodePath, 'accepted')}><Check className="mr-1 h-3 w-3" /> Validar</Button>
                  <Button size="xs" variant={node.status === 'rejected' ? 'secondary' : 'outline'} className="text-xs h-7" onClick={() => onSetStatus(nodePath, 'rejected')}><X className="mr-1 h-3 w-3" /> Rechazar</Button>
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
                    onSetStatus={onSetStatus}
                  />
                )}
              </div>
               <div 
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize group"
                  onMouseDown={(e) => handleMouseDown(e, nodeIndex)}
                >
                   <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </div>
                </div>
            </Card>
          );
        })}
        <Button size="sm" variant="outline" className="text-muted-foreground self-center min-h-[120px] flex-grow" onClick={() => onAddNode([...basePath, 'responses'])}>
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
  const { toast } = useToast();
  const [validationState, setValidationState] = useState<{ path: (string | number)[]; status: FiveWhyNode['status'] } | null>(null);
  const [isProcessingValidation, setIsProcessingValidation] = useState(false);
  const [rootCauseConfirmation, setRootCauseConfirmation] = useState<{ path: (string | number)[] } | null>(null);
  const [isProcessingRootCause, setIsProcessingRootCause] = useState(false);

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
  }, [fiveWhysData, onSetFiveWhysData, initialWhyText]);

 const handleUpdate = useCallback((path: (string|number)[], value: any, field: keyof FiveWhyNode | 'why' | 'isCollapsed' | 'width') => {
    const newData = JSON.parse(JSON.stringify(fiveWhysData));
    let current = { responses: newData };
    
    // Traverse to parent object/array
    for (let i = 0; i < path.length; i++) {
        const key = path[i];
        if (i === path.length - 1) { // Last element in path is the key of the property to update
            (current as any)[key] = { ...(current as any)[key], [field]: value };
            if(field === 'why') { // Special case for top-level why property
                (current.responses[key as number] as any)[field] = value;
            }
        } else {
             if (key === 'subAnalysis') {
                current = (current as any).subAnalysis;
            } else if (Array.isArray(current.responses)) {
                current = current.responses[key as number];
            } else {
                console.error("Invalid path structure", path);
                return;
            }
        }
    }
    
    let nodeToUpdate: any;
    if (path.length === 1 && field === 'why') { // Top level 'why'
       nodeToUpdate = newData[path[0] as number];
    } else { // Nested property
        let parent = newData;
        for(let i=0; i<path.length-1; i++) {
            parent = parent[path[i] as any];
        }
        nodeToUpdate = parent[path[path.length - 1] as any];
    }

    if(nodeToUpdate) {
       nodeToUpdate[field] = value;
    }


    onSetFiveWhysData(newData);
}, [fiveWhysData, onSetFiveWhysData]);


  const handleSetStatus = useCallback((path: (string | number)[], status: FiveWhyNode['status']) => {
      const newData = JSON.parse(JSON.stringify(fiveWhysData));
      const nodeToUpdate = getNodeByPath(newData, path);

      if (nodeToUpdate && nodeToUpdate.status === status) {
        // Toggle back to pending if clicking the same status
        nodeToUpdate.status = 'pending';
        nodeToUpdate.validationMethod = undefined;
        onSetFiveWhysData(newData);
      } else {
        setValidationState({ path, status });
      }
  }, [fiveWhysData, onSetFiveWhysData]);


  const handleConfirmValidation = useCallback((method: string) => {
    if (!validationState) return;
    setIsProcessingValidation(true);
    
    const newData = JSON.parse(JSON.stringify(fiveWhysData));
    const { path, status } = validationState;
    const nodeToUpdate = getNodeByPath(newData, path);
    if(nodeToUpdate) {
      nodeToUpdate.status = status;
      nodeToUpdate.validationMethod = method;
    }
    onSetFiveWhysData(newData);
    setIsProcessingValidation(false);
    setValidationState(null);
  }, [validationState, fiveWhysData, onSetFiveWhysData]);


  const handleAddNode = useCallback((path: (string | number)[]) => {
     const newData = JSON.parse(JSON.stringify(fiveWhysData));
     const parentResponsesArray = getNodeByPath(newData, path);
     if (parentResponsesArray && Array.isArray(parentResponsesArray)) {
        parentResponsesArray.push({
            id: generateId('node'),
            description: '',
            isRootCause: false,
            isCollapsed: false,
            status: 'pending',
            width: 'auto'
        });
     }
     onSetFiveWhysData(newData);
  }, [fiveWhysData, onSetFiveWhysData]);


 const handleRemoveNode = useCallback((path: (string | number)[]) => {
    const newData = JSON.parse(JSON.stringify(fiveWhysData));
    const result = getParentArrayAndIndex(newData, path);
    if (result) {
        result.parentArray.splice(result.index, 1);
        onSetFiveWhysData(newData);
    } else {
        console.error("Could not remove node at path:", path);
    }
}, [fiveWhysData, onSetFiveWhysData]);


  const handleAddSubAnalysis = useCallback((path: (string|number)[]) => {
    const newData = JSON.parse(JSON.stringify(fiveWhysData));
    const node = getNodeByPath(newData, path);
    if (node) {
        node.subAnalysis = {
          id: generateId('why'),
          why: `¿Por qué: "${node.description.substring(0, 50)}..."?`,
          responses: [],
        };
        node.isCollapsed = false;
    }
    onSetFiveWhysData(newData);
  }, [fiveWhysData, onSetFiveWhysData]);
  
  const handleSetRootCause = useCallback((path: (string | number)[]) => {
    const newData = JSON.parse(JSON.stringify(fiveWhysData));
    const nodeToCheck = getNodeByPath(newData, path);

    if (nodeToCheck && nodeToCheck.status === 'rejected') {
        toast({
            title: "Acción no permitida",
            description: "No se puede establecer una causa rechazada como causa raíz.",
            variant: "destructive"
        });
        return;
    }
    if (nodeToCheck && nodeToCheck.status !== 'accepted') {
        toast({
            title: "Validación Requerida",
            description: "Una causa debe ser validada antes de poder ser designada como causa raíz.",
            variant: "destructive"
        });
        return;
    }
    
    setRootCauseConfirmation({ path });
    
  }, [fiveWhysData, toast]);

  const confirmSetRootCause = useCallback(() => {
    if (!rootCauseConfirmation) return;
    setIsProcessingRootCause(true);
    
    const newData = JSON.parse(JSON.stringify(fiveWhysData));
    const path = rootCauseConfirmation.path;
    
    // Function to clear all other root causes
    const clearOtherRootCauses = (entryOrNode: any) => {
        if(entryOrNode.isRootCause !== undefined) entryOrNode.isRootCause = false;
        if (entryOrNode.responses) {
            entryOrNode.responses.forEach(clearOtherRootCauses);
        }
        if(entryOrNode.subAnalysis){
            clearOtherRootCauses(entryOrNode.subAnalysis);
        }
    };
    newData.forEach(clearOtherRootCauses);

    // Set the new root cause
    const nodeToUpdate = getNodeByPath(newData, path);
    if(nodeToUpdate){
      nodeToUpdate.isRootCause = true;
      if (nodeToUpdate.status !== 'accepted') {
          nodeToUpdate.status = 'accepted';
      }
    }
    onSetFiveWhysData(newData);
    setIsProcessingRootCause(false);
    setRootCauseConfirmation(null);
  }, [rootCauseConfirmation, fiveWhysData, onSetFiveWhysData]);


  
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
                      onSetStatus={handleSetStatus}
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
        
        {rootCauseConfirmation && (
          <RootCauseConfirmationDialog
            isOpen={!!rootCauseConfirmation}
            onOpenChange={() => setRootCauseConfirmation(null)}
            onConfirm={confirmSetRootCause}
            isProcessing={isProcessingRootCause}
          />
        )}
      </CardContent>
    </Card>
  );
};
