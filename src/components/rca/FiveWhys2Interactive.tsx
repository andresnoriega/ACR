'use client';
import { FC, useState, useEffect, useCallback } from 'react';
import type { FiveWhys2Data, WhyNode, WhyBecausePair } from '@/types/rca';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { PlusCircle, Trash2, GitBranchPlus, HelpCircle, CornerDownRight, Check, X, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';

// A simple client-side ID generator to prevent hydration issues.
let idCounter = Date.now();
const generateClientSideId = (prefix: string) => `_why2_${prefix}_${idCounter++}`;


// --- Validation Dialog (Local to this component) ---
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
          <Label htmlFor="why2ValidationMethod">Método de Validación/Rechazo <span className="text-destructive">*</span></Label>
          <Textarea
            id="why2ValidationMethod"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="Ej: Revisión de bitácora, entrevista, evidencia física, etc."
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


// --- Recursive Component for Rendering a "Why" Node ---
interface WhyNodeComponentProps {
    node: WhyNode;
    level: number;
    path: number[]; 
    onUpdate: (path: number[], newWhyText: string) => void;
    onUpdateBecause: (path: number[], becauseIndex: number, newBecauseText: string) => void;
    onAddBecause: (path: number[]) => void;
    onRemoveBecause: (path: number[], becauseIndex: number) => void;
    onAddNextWhy: (path: number[], becauseIndex: number) => void;
    onRemoveNode: (path: number[]) => void;
    onToggleBecauseStatus: (path: number[], becauseIndex: number, status: 'accepted' | 'rejected') => void;
}

const WhyNodeComponent: FC<WhyNodeComponentProps> = ({ 
    node, level, path, onUpdate, onUpdateBecause, onAddBecause, onRemoveBecause, onAddNextWhy, onRemoveNode, onToggleBecauseStatus
}) => {
    return (
        <Card className="p-3 bg-card shadow-sm w-full">
            <div className="flex justify-between items-start mb-2">
                <Label htmlFor={`why-desc-${node.id}`} className="font-semibold text-primary flex items-center">
                    <GitBranchPlus className="mr-2 h-4 w-4" /> ¿Por qué #{level}?
                </Label>
                {level > 1 && (
                    <Button
                        variant="ghost" size="icon" onClick={() => onRemoveNode(path)}
                        aria-label={`Eliminar por qué #${level}`} className="h-7 w-7"
                    >
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                )}
            </div>
            <Textarea
                id={`why-desc-${node.id}`}
                value={node.why}
                onChange={(e) => onUpdate(path, e.target.value)}
                placeholder="Describa el porqué o la causa..."
                rows={2}
                className="text-sm w-full"
            />
            
            <div className="pl-6 mt-3 border-l-2 border-primary/20 space-y-3">
                {node.becauses.map((becausePair, becauseIndex) => (
                    <Card key={becausePair.id} className={cn("p-2", 
                        becausePair.status === 'accepted' ? 'bg-green-50 dark:bg-green-900/20' : 
                        becausePair.status === 'rejected' ? 'bg-red-50 dark:bg-red-900/20 opacity-70' : 'bg-card'
                    )}>
                        <div className="flex items-start gap-2">
                            <CornerDownRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1.5"/>
                            <Textarea
                                value={becausePair.because}
                                onChange={(e) => onUpdateBecause(path, becauseIndex, e.target.value)}
                                placeholder="Porque... (describa la causa)"
                                rows={1}
                                className="text-sm flex-grow"
                            />
                            <div className="flex flex-col gap-0.5">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onToggleBecauseStatus(path, becauseIndex, 'accepted')}><Check className={cn("h-3 w-3", becausePair.status === 'accepted' ? "text-green-600" : "text-muted-foreground")} /></Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onToggleBecauseStatus(path, becauseIndex, 'rejected')}><X className={cn("h-3 w-3", becausePair.status === 'rejected' ? "text-red-600" : "text-muted-foreground")} /></Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemoveBecause(path, becauseIndex)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                            </div>
                        </div>
                        {becausePair.validationMethod && (
                            <p className="text-xs text-muted-foreground italic pl-6 pt-1">Justificación: {becausePair.validationMethod}</p>
                        )}
                        <div className="pl-8 mt-2">
                            {becausePair.nextWhy && (
                                <WhyNodeComponent 
                                    node={becausePair.nextWhy}
                                    level={level + 1}
                                    path={[...path, becauseIndex]}
                                    onUpdate={onUpdate}
                                    onUpdateBecause={onUpdateBecause}
                                    onAddBecause={onAddBecause}
                                    onRemoveBecause={onRemoveBecause}
                                    onAddNextWhy={onAddNextWhy}
                                    onRemoveNode={onRemoveNode}
                                    onToggleBecauseStatus={onToggleBecauseStatus}
                                />
                            )}
                        </div>
                    </Card>
                ))}
                 <Button
                    size="sm" variant="outline" className="text-xs h-7 ml-6"
                    onClick={() => onAddBecause(path)}
                >
                    <PlusCircle className="mr-1 h-3 w-3" /> Añadir Causa (Porque...)
                </Button>
            </div>
        </Card>
    );
};


// --- Main Component ---
interface FiveWhys2InteractiveProps {
  whyWhy2Data: FiveWhys2Data;
  onSetWhyWhy2Data: (data: FiveWhys2Data) => void;
  focusEventDescription: string;
}

export const FiveWhys2Interactive: FC<FiveWhys2InteractiveProps> = ({ whyWhy2Data, onSetWhyWhy2Data, focusEventDescription }) => {
  
  const [internalData, setInternalData] = useState<FiveWhys2Data>([]);
  const [validationState, setValidationState] = useState<{ path: number[], becauseIndex: number, status: 'accepted' | 'rejected' } | null>(null);
  const [isProcessingValidation, setIsProcessingValidation] = useState(false);

  useEffect(() => {
    setInternalData(whyWhy2Data || []);
  }, [whyWhy2Data]);

  const updateParentState = (newData: FiveWhys2Data) => {
    setInternalData(newData);
    onSetWhyWhy2Data(newData);
  };
  
  const getNodeByPath = (data: FiveWhys2Data, path: number[]): WhyNode => {
      let currentNode = data[path[0]];
      for (let i = 1; i < path.length; i++) {
          currentNode = currentNode.becauses[path[i-1]].nextWhy!;
      }
      return currentNode;
  };

  const handleUpdateNode = (path: number[], newWhyText: string) => {
      const newData = JSON.parse(JSON.stringify(internalData));
      const nodeToUpdate = getNodeByPath(newData, path);
      nodeToUpdate.why = newWhyText;
      updateParentState(newData);
  };

  const handleUpdateBecause = (path: number[], becauseIndex: number, newBecauseText: string) => {
      const newData = JSON.parse(JSON.stringify(internalData));
      const nodeToUpdate = getNodeByPath(newData, path);
      nodeToUpdate.becauses[becauseIndex].because = newBecauseText;
      updateParentState(newData);
  };

  const handleAddBecause = (path: number[]) => {
      const newData = JSON.parse(JSON.stringify(internalData));
      const nodeToUpdate = getNodeByPath(newData, path);
      nodeToUpdate.becauses.push({ id: generateClientSideId('bc'), because: '', status: 'pending', nextWhy: undefined });
      updateParentState(newData);
  };

  const handleRemoveBecause = (path: number[], becauseIndex: number) => {
      const newData = JSON.parse(JSON.stringify(internalData));
      const nodeToUpdate = getNodeByPath(newData, path);
      nodeToUpdate.becauses.splice(becauseIndex, 1);
      updateParentState(newData);
  };

  const handleAddNextWhy = (path: number[], becauseIndex: number) => {
      const newData = JSON.parse(JSON.stringify(internalData));
      const nodeToUpdate = getNodeByPath(newData, path);
      const becauseText = nodeToUpdate.becauses[becauseIndex].because;
      nodeToUpdate.becauses[becauseIndex].nextWhy = {
          id: generateClientSideId('why'),
          why: `¿Por qué: "${becauseText}"?`,
          becauses: [{ id: generateClientSideId('bc'), because: '', status: 'pending', nextWhy: undefined }]
      };
      updateParentState(newData);
  };

  const handleRemoveNode = (path: number[]) => {
      const newData = JSON.parse(JSON.stringify(internalData));
      if (path.length === 1) { // Root node
          newData.splice(path[0], 1);
      } else { // Nested node
          const parentPath = path.slice(0, -1);
          const parentNode = getNodeByPath(newData, parentPath);
          const becauseIndexToRemoveFrom = path[path.length - 1];
          parentNode.becauses[becauseIndexToRemoveFrom].nextWhy = undefined;
      }
      updateParentState(newData);
  };

  const addRootWhy = () => {
    const whyText = `¿Por qué ocurrió: "${focusEventDescription}"?`;
    const newRoot: WhyNode = {
      id: generateClientSideId('why'),
      why: whyText,
      becauses: [{ id: generateClientSideId('bc'), because: '', status: 'pending', nextWhy: undefined }],
    };
    updateParentState([...internalData, newRoot]);
  };
  
  const handleToggleBecauseStatus = (path: number[], becauseIndex: number, status: 'accepted' | 'rejected') => {
      const node = getNodeByPath(internalData, path);
      const because = node.becauses[becauseIndex];
      if (because.status === status) {
          const newData = JSON.parse(JSON.stringify(internalData));
          const nodeToUpdate = getNodeByPath(newData, path);
          nodeToUpdate.becauses[becauseIndex].status = 'pending';
          nodeToUpdate.becauses[becauseIndex].validationMethod = undefined;
          updateParentState(newData);
      } else {
          setValidationState({ path, becauseIndex, status });
      }
  };

  const handleConfirmValidation = useCallback((method: string) => {
    if (!validationState) return;
    setIsProcessingValidation(true);
    
    const { path, becauseIndex, status } = validationState;
    const newData = JSON.parse(JSON.stringify(internalData));
    const nodeToUpdate = getNodeByPath(newData, path);
    const becauseToUpdate = nodeToUpdate.becauses[becauseIndex];
    
    becauseToUpdate.status = status;
    becauseToUpdate.validationMethod = method;
    
    // Si la causa es aceptada y no tiene un "siguiente porqué", se lo añadimos
    if (status === 'accepted' && !becauseToUpdate.nextWhy) {
        if(becauseToUpdate.because.trim()){
            becauseToUpdate.nextWhy = {
                id: generateClientSideId('why'),
                why: `¿Por qué: "${becauseToUpdate.because}"?`,
                becauses: [{ id: generateClientSideId('bc'), because: '', status: 'pending', nextWhy: undefined }]
            };
        }
    }


    updateParentState(newData);
    
    setIsProcessingValidation(false);
    setValidationState(null);
  }, [validationState, internalData]);

  return (
    <>
      <div className="space-y-4 mt-4 p-4 border rounded-lg shadow-sm bg-background">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h3 className="text-lg font-semibold font-headline text-primary flex items-center">
            <HelpCircle className="mr-2 h-5 w-5" /> 5 Porqués 2.0 (Anidado)
          </h3>
        </div>
        <div className="space-y-4">
          {internalData.length > 0 ? (
            internalData.map((rootNode, index) => (
              <WhyNodeComponent
                key={rootNode.id}
                node={rootNode}
                level={1}
                path={[index]}
                onUpdate={handleUpdateNode}
                onUpdateBecause={handleUpdateBecause}
                onAddBecause={handleAddBecause}
                onRemoveBecause={handleRemoveBecause}
                onAddNextWhy={handleAddNextWhy}
                onRemoveNode={handleRemoveNode}
                onToggleBecauseStatus={handleToggleBecauseStatus}
              />
            ))
          ) : (
            <div className="text-center text-muted-foreground italic py-4 w-full">
              Haga clic en "Añadir Por qué Inicial" para comenzar.
            </div>
          )}
          <Button onClick={addRootWhy} variant="outline" className="w-full">
            <PlusCircle className="mr-2 h-4 w-4" /> {internalData.length === 0 ? 'Añadir Por qué Inicial' : 'Añadir Otro Problema Raíz'}
          </Button>
        </div>
      </div>

      {validationState && (
        <ValidationDialog 
            isOpen={!!validationState}
            onOpenChange={(open) => {if (!open) setValidationState(null)}}
            onConfirm={handleConfirmValidation}
            isProcessing={isProcessingValidation}
        />
      )}
    </>
  );
};
