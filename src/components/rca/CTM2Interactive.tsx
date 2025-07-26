
'use client';
import { FC, useCallback, useMemo, useState, useEffect } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { CTMData, FailureMode, Hypothesis, PhysicalCause, HumanCause, LatentCause } from '@/types/rca';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Trash2, Share2, Check, X, GitBranchPlus, BrainCircuit, Wrench, User, Building, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ValidationDialog } from './ValidationDialog';

let idCounter = Date.now();
const generateClientSideId = (prefix: string) => {
    idCounter++;
    return `${prefix}-${idCounter}`;
};

interface CTM2InteractiveProps {
  ctm2Data: CTMData;
  onSetCtm2Data: (data: CTMData) => void;
  focusEventDescription: string;
}

const CTM2RecursiveRenderer: FC<{
    failureModes: FailureMode[];
    path: (string | number)[];
    numberingPrefix?: string;
    onUpdate: (path: (string | number)[], value: string) => void;
    onAdd: (path: (string | number)[]) => void;
    onRemove: (path: (string | number)[]) => void;
    onToggleStatus: (path: (string | number)[], status: Hypothesis['status']) => void;
}> = ({
    failureModes,
    path,
    numberingPrefix = '',
    onUpdate,
    onAdd,
    onRemove,
    onToggleStatus
}) => {
    
    const renderHypotheses = (hypotheses: Hypothesis[] | undefined, currentPath: (string | number)[], prefix: string) => (
      <div className="pl-4 border-l-2 border-teal-500/50 ml-4 mt-2 space-y-3">
        {(hypotheses || []).map((hyp, hypIndex) => (
          <Card key={hyp.id} className="p-3 bg-card">
            <Label className="text-sm font-semibold flex items-center text-teal-700 dark:text-teal-300">
              <BrainCircuit className="mr-2 h-4 w-4" /> porque #{prefix}{hypIndex + 1}
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <Textarea 
                value={hyp.description} 
                onChange={(e) => onUpdate([...currentPath, hypIndex, 'description'], e.target.value)} 
                rows={1} 
                className={cn(
                  "text-sm",
                  hyp.status === 'accepted' ? 'bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-600' : 
                  hyp.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-600 opacity-80' : ''
                )}
              />
              <div className="flex flex-col gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onRemove([...currentPath, hypIndex])}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                <Button size="icon" variant={hyp.status === 'accepted' ? 'secondary' : 'ghost'} className="h-7 w-7" onClick={() => onToggleStatus([...currentPath, hypIndex], 'accepted')}><Check className="h-4 w-4 text-green-600"/></Button>
                <Button size="icon" variant={hyp.status === 'rejected' ? 'secondary' : 'ghost'} className="h-7 w-7" onClick={() => onToggleStatus([...currentPath, hypIndex], 'rejected')}><X className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
            {hyp.validationMethod && (
              <div className="text-xs text-muted-foreground pt-2 mt-2 border-t">
                <span className="font-semibold">Justificación V/R:</span> {hyp.validationMethod}
              </div>
            )}
             {hyp.status === 'accepted' && (
                <>
                  <CTM2RecursiveRenderer
                    failureModes={hyp.failureModes || []}
                    path={[...currentPath, hypIndex, 'failureModes']}
                    numberingPrefix={`${prefix}${hypIndex + 1}.`}
                    onUpdate={onUpdate}
                    onAdd={onAdd}
                    onRemove={onRemove}
                    onToggleStatus={onToggleStatus}
                  />
                  <Button size="sm" variant="outline" className="text-xs h-7 mt-2" onClick={() => onAdd([...currentPath, hypIndex, 'failureModes'])}><PlusCircle className="mr-1 h-3 w-3" /> Añadir Por Qué</Button>
                </>
            )}
          </Card>
        ))}
        <Button size="sm" variant="outline" className="text-sm h-8" onClick={() => onAdd(currentPath)}><PlusCircle className="mr-2 h-4 w-4" /> Añadir porque</Button>
      </div>
    );
    
    return (
        <div className={cn("space-y-3", numberingPrefix ? "pl-4 border-l-2 border-dashed border-gray-400 ml-4 mt-2" : "flex space-x-4 overflow-x-auto py-2")}>
            {(failureModes || []).map((fm, fmIndex) => (
                <div key={fm.id} className={cn(!numberingPrefix && "min-w-[20rem] flex-shrink-0")}>
                    <Accordion type="single" collapsible defaultValue="item-1">
                        <AccordionItem value="item-1">
                            <div className="flex items-center w-full">
                                <AccordionTrigger className="flex-grow">
                                    <span className="font-semibold flex items-center"><GitBranchPlus className="mr-2 h-4 w-4" /> Por Qué #{numberingPrefix}{fmIndex + 1}</span>
                                </AccordionTrigger>
                                <Button size="icon" variant="ghost" className="h-7 w-7 ml-2 shrink-0" onClick={(e) => {e.stopPropagation(); onRemove([...path, fmIndex]);}}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                            <AccordionContent className="pl-2">
                                <div className="space-y-2 p-2 border-l-2">
                                <Label>Descripción del Por Qué</Label>
                                <Input value={fm.description} onChange={(e) => onUpdate([...path, fmIndex, 'description'], e.target.value)} className="text-sm"/>
                                {renderHypotheses(fm.hypotheses, [...path, fmIndex, 'hypotheses'], `${numberingPrefix}${fmIndex + 1}.`)}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            ))}
        </div>
    );
};


export const CTM2Interactive: FC<CTM2InteractiveProps> = ({ ctm2Data, onSetCtm2Data, focusEventDescription }) => {
  const [validationState, setValidationState] = useState<{ path: (string | number)[]; status: Hypothesis['status'] } | null>(null);
  const [isProcessingValidation, setIsProcessingValidation] = useState(false);
  
  const [internalData, setInternalData] = useState<CTMData>([]);
  
  useEffect(() => {
    if (JSON.stringify(ctm2Data) !== JSON.stringify(internalData)) {
      setInternalData(Array.isArray(ctm2Data) ? ctm2Data : []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctm2Data]);

 const handleUpdate = (path: (string | number)[], value: string) => {
    const newData = JSON.parse(JSON.stringify(internalData));
    let current: any = newData;
    
    for (let i = 0; i < path.length - 1; i++) {
        const segment = path[i];
        if (current[segment] === undefined) {
            console.error("Path is invalid during update traversal", path);
            return;
        }
        current = current[segment];
    }
    const finalKey = path[path.length - 1];
    if (current && typeof current === 'object' && finalKey in current) {
       current[finalKey] = value;
    }

    onSetCtm2Data(newData);
};

  const handleToggleStatus = (path: (string | number)[], status: 'accepted' | 'rejected' | 'pending') => {
    const newData = JSON.parse(JSON.stringify(internalData));
    let current: any = newData;

    for (let i = 0; i < path.length - 1; i++) {
        if(current === undefined) return;
        current = current[path[i]];
    }
    const itemToUpdate = current[path[path.length - 1]];
    
    if (itemToUpdate && itemToUpdate.status === status) {
        itemToUpdate.status = 'pending';
        itemToUpdate.validationMethod = undefined;
        onSetCtm2Data(newData);
    } else {
        setValidationState({ path, status });
    }
  };

  const handleConfirmValidation = useCallback((method: string) => {
    if (!validationState) return;
    setIsProcessingValidation(true);
    const { path, status } = validationState;
    
    const newData = JSON.parse(JSON.stringify(internalData));
    let current: any = newData;
    for (let i = 0; i < path.length -1; i++) {
      if(current === undefined) return;
      current = current[path[i]];
    }
    const itemToUpdate = current[path[path.length - 1]];
    
    if (itemToUpdate) {
      itemToUpdate.status = status;
      itemToUpdate.validationMethod = method;
    }

    onSetCtm2Data(newData);
    setValidationState(null); 
    setIsProcessingValidation(false);
  }, [internalData, onSetCtm2Data, validationState]);

  const handleAdd = useCallback((path: (string | number)[]) => {
      const newData = JSON.parse(JSON.stringify(internalData));
      let parentOfTarget: any = newData;
      let targetArray: any[] | undefined;

      if (path.length === 0) {
          // Adding a top-level FailureMode
          targetArray = newData;
      } else {
          // Navigate to the parent of the array we want to modify
          let parent = newData;
          for (let i = 0; i < path.length - 1; i++) {
              parent = parent[path[i] as any];
          }
          parentOfTarget = parent;
          targetArray = parentOfTarget[path[path.length - 1] as any];
      }
      
      if (!Array.isArray(targetArray)) {
         console.error("Target for adding is not an array", path, parentOfTarget);
         return;
      }

      const finalSegment = path.length > 0 ? path[path.length - 1] : null;

      if (finalSegment === null) { // Adding top-level FM
          const newWhyDescription = `¿Por qué ocurrió: "${focusEventDescription || 'el evento foco'}"?`;
          targetArray.push({ id: generateClientSideId('fm'), description: newWhyDescription, hypotheses: [] });
      } else if (finalSegment === 'hypotheses') { // Adding a Hypothesis to a FM
          targetArray.push({ id: generateClientSideId('hyp'), description: 'Nuevo porque', failureModes: [], status: 'pending' });
      } else if (finalSegment === 'failureModes') { // Adding a nested FM to a Hypothesis
          const parentHypothesis = parentOfTarget;
          const newWhyDescription = `¿Por qué: "${parentHypothesis.description.substring(0, 50)}..."?`;
          targetArray.push({ id: generateClientSideId('fm'), description: newWhyDescription, hypotheses: [] });
      }

      onSetCtm2Data(newData);
  }, [internalData, onSetCtm2Data, focusEventDescription]);


  const handleRemove = (path: (string | number)[]) => {
    const newData = JSON.parse(JSON.stringify(internalData));
    let parent: any = newData;
    for (let i = 0; i < path.length - 1; i++) {
        parent = parent[path[i]];
    }
    const indexToRemove = path[path.length - 1] as number;
    parent.splice(indexToRemove, 1);
    onSetCtm2Data(newData);
  };
  
  const safeInternalData = Array.isArray(internalData) ? internalData : [];

  return (
    <>
      <div className="space-y-4 mt-4 p-4 border rounded-lg shadow-sm bg-background">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h3 className="text-lg font-semibold font-headline text-primary flex items-center">
            <Share2 className="mr-2 h-5 w-5" /> Árbol de Causas (CTM.2)
          </h3>
          <Button onClick={() => handleAdd([])} variant="outline" size="sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Por Qué
          </Button>
        </div>
        
        {safeInternalData.length === 0 ? (
          <div className="text-center text-muted-foreground italic py-4 w-full">
            Haga clic en "Añadir Por Qué" para comenzar a construir el árbol.
          </div>
        ) : (
          <CTM2RecursiveRenderer
            failureModes={safeInternalData}
            path={[]}
            onUpdate={handleUpdate}
            onAdd={handleAdd}
            onRemove={handleRemove}
            onToggleStatus={handleToggleStatus}
          />
        )}
      </div>
      {validationState && (
        <ValidationDialog
          isOpen={!!validationState}
          onOpenChange={(open) => { if(!isProcessingValidation) setValidationState(null)}}
          onConfirm={handleConfirmValidation}
          isProcessing={isProcessingValidation}
          title="Confirmar Validación/Rechazo de porque"
          description="Por favor, ingrese el método o justificación utilizado para validar o rechazar este 'porque'."
          placeholder="Ej: Revisión de bitácora, entrevista con operador, evidencia física encontrada, etc."
        />
      )}
    </>
  );
};
