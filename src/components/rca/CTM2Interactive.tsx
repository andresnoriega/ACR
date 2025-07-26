
'use client';
import { FC, useCallback, useMemo, useState, useEffect } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { CTMData, FailureMode, Hypothesis } from '@/types/rca';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { PlusCircle, Trash2, Share2, Check, X, GitBranchPlus, BrainCircuit, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ValidationDialog } from './ValidationDialog';

let idCounter = Date.now();
const generateClientSideId = (prefix: string) => {
    idCounter++;
    return `${prefix}-${idCounter}`;
};

const CTM2RecursiveRenderer: FC<{
    items: any[];
    level: 'failureMode' | 'hypothesis';
    path: (string | number)[];
    numberingPrefix?: string;
    onUpdate: (path: (string | number)[], value: string) => void;
    onAdd: (path: (string | number)[], description: string) => void;
    onRemove: (path: (string | number)[]) => void;
    onToggleStatus: (path: (string | number)[], status: Hypothesis['status']) => void;
}> = ({
    items,
    level,
    path,
    numberingPrefix = '',
    onUpdate,
    onAdd,
    onRemove,
    onToggleStatus
}) => {
    
    if (level === 'failureMode') {
        const failureModes = items as FailureMode[];
        return (
             <div className="space-y-3 pl-4 border-l-2 border-dashed border-gray-400 ml-4 mt-2">
                {failureModes.map((fm, fmIndex) => {
                    const currentPrefix = `${numberingPrefix}${fmIndex + 1}`;
                    const title = `Por Qué #${currentPrefix}`;
                    return (
                        <div key={fm.id}>
                            <Accordion type="single" collapsible defaultValue="item-1">
                                <AccordionItem value="item-1">
                                    <div className="flex items-center w-full">
                                        <AccordionTrigger className="flex-grow">
                                            <span className="font-semibold flex items-center">
                                                <GitBranchPlus className="mr-2 h-4 w-4" /> 
                                                {title}
                                            </span>
                                        </AccordionTrigger>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 ml-2 shrink-0" onClick={(e) => {e.stopPropagation(); onRemove([...path, fmIndex]);}}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </div>
                                    <AccordionContent className="pl-2">
                                        <div className="space-y-2 p-2 border-l-2">
                                        <Label>Descripción del Por Qué</Label>
                                        <Input value={fm.description} onChange={(e) => onUpdate([...path, fmIndex, 'description'], e.target.value)} className="text-sm"/>
                                        <CTM2RecursiveRenderer
                                            items={fm.hypotheses || []}
                                            level="hypothesis"
                                            path={[...path, fmIndex, 'hypotheses']}
                                            numberingPrefix={`${currentPrefix}.`}
                                            onUpdate={onUpdate}
                                            onAdd={onAdd}
                                            onRemove={onRemove}
                                            onToggleStatus={onToggleStatus}
                                          />
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </div>
                    );
                })}
            </div>
        );
    }
    
    if (level === 'hypothesis') {
      const hypotheses = items as Hypothesis[];
      return (
        <div className="pl-4 border-l-2 border-teal-500/50 ml-4 mt-2 space-y-3">
          {(hypotheses || []).map((hyp, hypIndex) => {
              const currentPrefix = `${numberingPrefix}${hypIndex + 1}`;
              return (
                  <Card key={hyp.id} className="p-3 bg-card">
                    <Label className="text-sm font-semibold flex items-center text-teal-700 dark:text-teal-300">
                      <BrainCircuit className="mr-2 h-4 w-4" /> porque #{currentPrefix}
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Textarea 
                        value={hyp.description} 
                        onChange={(e) => onUpdate([...path, hypIndex, 'description'], e.target.value)}
                        rows={1} 
                        className={cn(
                          "text-sm",
                          hyp.status === 'accepted' ? 'bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-600' : 
                          hyp.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-600 opacity-80' : ''
                        )}
                      />
                      <div className="flex flex-col gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onRemove([...path, hypIndex])}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        <Button size="icon" variant={hyp.status === 'accepted' ? 'secondary' : 'ghost'} className="h-7 w-7" onClick={() => onToggleStatus([...path, hypIndex], 'accepted')}><Check className="h-4 w-4 text-green-600"/></Button>
                        <Button size="icon" variant={hyp.status === 'rejected' ? 'secondary' : 'ghost'} className="h-7 w-7" onClick={() => onToggleStatus([...path, hypIndex], 'rejected')}><X className="h-4 w-4 text-destructive" /></Button>
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
                            items={hyp.failureModes || []}
                            level="failureMode"
                            path={[...path, hypIndex, 'failureModes']}
                            numberingPrefix={`${currentPrefix}.`}
                            onUpdate={onUpdate}
                            onAdd={onAdd}
                            onRemove={onRemove}
                            onToggleStatus={onToggleStatus}
                          />
                          <Button size="sm" variant="outline" className="text-xs h-7 mt-2" onClick={() => onAdd([...path, hypIndex, 'failureModes'], hyp.description)}><PlusCircle className="mr-1 h-3 w-3" /> Añadir Por Qué</Button>
                        </>
                    )}
                  </Card>
              );
          })}
          <Button size="sm" variant="outline" className="text-sm h-8" onClick={() => onAdd(path, '')}><PlusCircle className="mr-2 h-4 w-4" /> Añadir porque</Button>
        </div>
      );
    }

    return null;
};


interface CTM2InteractiveProps {
  ctm2Data: CTMData;
  onSetCtm2Data: (data: CTMData) => void;
  focusEventDescription: string;
}

export const CTM2Interactive: FC<CTM2InteractiveProps> = ({ ctm2Data, onSetCtm2Data, focusEventDescription }) => {
  const [validationState, setValidationState] = useState<{ path: (string | number)[]; status: Hypothesis['status'] } | null>(null);
  const [isProcessingValidation, setIsProcessingValidation] = useState(false);
  
  const [internalData, setInternalData] = useState<CTMData>(() => ctm2Data || []);
  
  useEffect(() => {
    // If ctm2Data is empty and there's a description, initialize with the first question.
    // This solves the production issue where the component might not initialize correctly.
    if ((!ctm2Data || ctm2Data.length === 0) && focusEventDescription) {
        const initialEntry = {
            id: generateClientSideId('fm'),
            description: `¿Por qué ocurrió: "${focusEventDescription}"?`,
            hypotheses: []
        };
        onSetCtm2Data([initialEntry]);
    } else if (JSON.stringify(ctm2Data) !== JSON.stringify(internalData)) {
      setInternalData(Array.isArray(ctm2Data) ? ctm2Data : []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctm2Data, focusEventDescription]);

 const handleUpdate = (path: (string | number)[], value: string) => {
    const newData = JSON.parse(JSON.stringify(internalData));
    let current: any = newData;
    
    for (let i = 0; i < path.length - 1; i++) {
        parent = parent[path[i]];
    }
    const finalKey = path[path.length - 1];
    
    if(current && typeof current === 'object' && finalKey in current) {
      const itemToUpdate = current[finalKey];
      if(itemToUpdate && typeof itemToUpdate === 'object'){
         itemToUpdate.description = value;
      }
    } else {
       console.error("Could not update property. Path:", path, "Current Object:", JSON.parse(JSON.stringify(current)));
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
    for (let i = 0; i < path.length; i++) {
      if(current === undefined) return;
      current = current[path[i]];
    }
    
    if (current) {
      current.status = status;
      current.validationMethod = method;
    }

    onSetCtm2Data(newData);
    setValidationState(null); 
    setIsProcessingValidation(false);
  }, [internalData, onSetCtm2Data, validationState]);


  const handleAdd = useCallback((path: (string | number)[], baseDescription: string) => {
    const newData = JSON.parse(JSON.stringify(internalData));
    let parentOfTarget: any = newData;

    for (let i = 0; i < path.length - 1; i++) {
        if (!parentOfTarget || parentOfTarget[path[i]] === undefined) {
            console.error("Path is invalid during traversal", path, parentOfTarget);
            return;
        }
        parentOfTarget = parentOfTarget[path[i]];
    }
    
    const lastKey = path[path.length - 1];
    const container = parentOfTarget[lastKey];

    if (lastKey === 'hypotheses' && Array.isArray(container)) {
        container.push({ id: generateClientSideId('hyp'), description: 'Nuevo porque', failureModes: [], status: 'pending' });
    } else if (lastKey === 'failureModes' && Array.isArray(container)) {
        const newWhyDescription = `¿Por qué: "${baseDescription.substring(0, 50)}..."?`;
        container.push({ id: generateClientSideId('fm'), description: newWhyDescription, hypotheses: [] });
    } else {
       console.error("Unknown add target or target is not an array. Path:", path, "Container:", container);
    }

    onSetCtm2Data(newData);
  }, [internalData, onSetCtm2Data]);


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
  
  const handleAddFailureMode = useCallback(() => {
    const newWhyDescription = `¿Por qué ocurrió: "${focusEventDescription || 'el evento foco'}"?`;
    const newFailureMode: FailureMode = {
        id: generateClientSideId('fm'),
        description: newWhyDescription,
        hypotheses: [],
    };
    onSetCtm2Data([...internalData, newFailureMode]);
  }, [internalData, onSetCtm2Data, focusEventDescription]);
  
  const safeInternalData = Array.isArray(internalData) ? internalData : [];

  return (
    <>
      <div className="space-y-4 mt-4 p-4 border rounded-lg shadow-sm bg-background">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h3 className="text-lg font-semibold font-headline text-primary flex items-center">
            <Share2 className="mr-2 h-5 w-5" /> Árbol de Causas (CTM.2)
          </h3>
          <Button onClick={handleAddFailureMode} variant="outline" size="sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Por Qué
          </Button>
        </div>
        
        {safeInternalData.length === 0 ? (
          <div className="text-center text-muted-foreground italic py-4 w-full">
            Haga clic en "Añadir Por Qué" para comenzar a construir el árbol.
          </div>
        ) : (
          <div className="flex space-x-4 overflow-x-auto py-2">
            {safeInternalData.map((fm, fmIndex) => {
              const title = "Por Qué #1";
              return (
                <div key={fm.id} className="min-w-[22rem] flex-shrink-0">
                    <Accordion type="single" collapsible defaultValue="item-1">
                        <AccordionItem value="item-1">
                            <div className="flex items-center w-full">
                                <AccordionTrigger className="flex-grow">
                                    <span className="font-semibold flex items-center"><GitBranchPlus className="mr-2 h-4 w-4" /> {title}</span>
                                </AccordionTrigger>
                                <Button size="icon" variant="ghost" className="h-7 w-7 ml-2 shrink-0" onClick={(e) => {e.stopPropagation(); handleRemove([fmIndex]);}}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                            <AccordionContent className="pl-2">
                                <div className="space-y-2 p-2 border-l-2">
                                <Label>Descripción del Por Qué</Label>
                                <Input value={fm.description} onChange={(e) => handleUpdate([fmIndex, 'description'], e.target.value)} className="text-sm"/>
                                <CTM2RecursiveRenderer
                                    items={fm.hypotheses || []}
                                    level="hypothesis"
                                    path={[fmIndex, 'hypotheses']}
                                    numberingPrefix={`${fmIndex + 1}.`}
                                    onUpdate={handleUpdate}
                                    onAdd={handleAdd}
                                    onRemove={handleRemove}
                                    onToggleStatus={handleToggleStatus}
                                  />
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            )})}
          </div>
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
