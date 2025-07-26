
'use client';
import { FC, useCallback, useState, useEffect, useRef } from 'react';
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
import { PlusCircle, Trash2, GitBranchPlus, BrainCircuit, Check, X } from 'lucide-react';
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

export const CTM2Interactive: FC<CTM2InteractiveProps> = ({ ctm2Data, onSetCtm2Data, focusEventDescription }) => {
  const [validationState, setValidationState] = useState<{ path: (string | number)[]; status: Hypothesis['status'] } | null>(null);
  const [isProcessingValidation, setIsProcessingValidation] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current && (!ctm2Data || ctm2Data.length === 0)) {
      const initialWhyDescription = `¿Por qué ocurrió: "${focusEventDescription}"?`;
      const initialFailureMode: FailureMode = {
        id: generateClientSideId('fm'),
        description: initialWhyDescription,
        hypotheses: [],
      };
      onSetCtm2Data([initialFailureMode]);
      hasInitialized.current = true;
    }
  }, [ctm2Data, onSetCtm2Data, focusEventDescription]);
  
  const handleUpdate = useCallback((path: (string | number)[], value: string) => {
      onSetCtm2Data(currentData => {
        const newData = JSON.parse(JSON.stringify(currentData));
        let current = newData;
        for (let i = 0; i < path.length - 1; i++) {
          current = current[path[i]];
        }
        current[path[path.length - 1]].description = value;
        return newData;
      });
  }, [onSetCtm2Data]);


  const handleAdd = useCallback((path: (string | number)[], baseDescription: string) => {
    onSetCtm2Data(currentData => {
        const newData = JSON.parse(JSON.stringify(currentData || []));
        let current = newData;
        for (let i = 0; i < path.length; i++) {
            current = current[path[i]];
        }
        
        const lastSegment = path[path.length-1];

        if (lastSegment === 'hypotheses') {
          if (!Array.isArray(current)) current = [];
          current.push({ id: generateClientSideId('hyp'), description: 'Nuevo porque', failureModes: [], status: 'pending' });
        } else if (lastSegment === 'failureModes') {
          if (!Array.isArray(current)) current = [];
          const newWhyDescription = `¿Por qué: "${baseDescription.substring(0, 50)}..."?`;
          current.push({ id: generateClientSideId('fm'), description: newWhyDescription, hypotheses: [] });
        }
        return newData;
    });
  }, [onSetCtm2Data]);

  const handleRemove = useCallback((path: (string | number)[]) => {
      onSetCtm2Data(currentData => {
        const newData = JSON.parse(JSON.stringify(currentData));
        let parent = newData;
        for (let i = 0; i < path.length - 1; i++) {
            parent = parent[path[i]];
        }
        const indexToRemove = path[path.length - 1] as number;
        parent.splice(indexToRemove, 1);
        return newData;
      });
  }, [onSetCtm2Data]);

   const handleToggleStatus = useCallback((path: (string | number)[], status: 'accepted' | 'rejected' | 'pending') => {
    const newData = JSON.parse(JSON.stringify(ctm2Data));
    let current: any = newData;
    for (let i = 0; i < path.length; i++) {
        if(current === undefined) return;
        current = current[path[i]];
    }
    
    if (current && current.status === status) {
        current.status = 'pending';
        current.validationMethod = undefined;
        onSetCtm2Data(newData);
    } else {
        setValidationState({ path, status });
    }
  }, [ctm2Data, onSetCtm2Data]);

  const handleConfirmValidation = useCallback((method: string) => {
    if (!validationState) return;
    setIsProcessingValidation(true);
    const { path, status } = validationState;
    
    onSetCtm2Data(currentData => {
        const newData = JSON.parse(JSON.stringify(currentData));
        let current: any = newData;
        for (let i = 0; i < path.length; i++) {
          if(current === undefined) return currentData; // abort if path invalid
          current = current[path[i]];
        }
        if (current) {
          current.status = status;
          current.validationMethod = method;
        }
        return newData;
    });
    
    setValidationState(null); 
    setIsProcessingValidation(false);
  }, [onSetCtm2Data, validationState]);

  const renderHypotheses = (hypotheses: Hypothesis[], path: (string | number)[], numberingPrefix: string) => {
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
                        onChange={(e) => handleUpdate([...path, hypIndex, 'description'], e.target.value)}
                        rows={1} 
                        className={cn(
                          "text-sm",
                          hyp.status === 'accepted' ? 'bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-600' : 
                          hyp.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-600 opacity-80' : ''
                        )}
                      />
                      <div className="flex flex-col gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRemove([...path, hypIndex])}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        <Button size="icon" variant={hyp.status === 'accepted' ? 'secondary' : 'ghost'} className="h-7 w-7" onClick={() => handleToggleStatus([...path, hypIndex], 'accepted')}><Check className="h-4 w-4 text-green-600"/></Button>
                        <Button size="icon" variant={hyp.status === 'rejected' ? 'secondary' : 'ghost'} className="h-7 w-7" onClick={() => handleToggleStatus([...path, hypIndex], 'rejected')}><X className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                    {hyp.validationMethod && (
                      <div className="text-xs text-muted-foreground pt-2 mt-2 border-t">
                        <span className="font-semibold">Justificación V/R:</span> {hyp.validationMethod}
                      </div>
                    )}
                     {hyp.status === 'accepted' && (
                        <>
                          {renderFailureModes(hyp.failureModes || [], [...path, hypIndex, 'failureModes'], `${currentPrefix}.`)}
                          <Button size="sm" variant="outline" className="text-xs h-7 mt-2" onClick={() => handleAdd([...path, hypIndex, 'failureModes'], hyp.description)}><PlusCircle className="mr-1 h-3 w-3" /> Añadir Por Qué</Button>
                        </>
                    )}
                  </Card>
              );
          })}
          <Button size="sm" variant="outline" className="text-sm h-8" onClick={() => handleAdd(path, '')}><PlusCircle className="mr-2 h-4 w-4" /> Añadir porque</Button>
        </div>
      );
  }
  
  const renderFailureModes = (failureModes: FailureMode[], path: (string | number)[], numberingPrefix: string) => {
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
                                    <Button size="icon" variant="ghost" className="h-7 w-7 ml-2 shrink-0" onClick={(e) => {e.stopPropagation(); handleRemove([...path, fmIndex]);}}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>
                                <AccordionContent className="pl-2">
                                    <div className="space-y-2 p-2 border-l-2">
                                    <Label>Descripción del Por Qué</Label>
                                    <Input value={fm.description} onChange={(e) => handleUpdate([...path, fmIndex, 'description'], e.target.value)} className="text-sm"/>
                                    {renderHypotheses(fm.hypotheses || [], [...path, fmIndex, 'hypotheses'], `${currentPrefix}.`)}
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

  const safeCtm2Data = Array.isArray(ctm2Data) ? ctm2Data : [];

  return (
    <>
      <div className="space-y-4 mt-4 p-4 border rounded-lg shadow-sm bg-background">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h3 className="text-lg font-semibold font-headline text-primary flex items-center">
            <GitBranchPlus className="mr-2 h-5 w-5" /> Árbol de Causas (CTM.2)
          </h3>
          <Button onClick={() => handleAdd([], '')} variant="outline" size="sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Por Qué
          </Button>
        </div>
        
        {safeCtm2Data.length === 0 ? (
          <div className="text-center text-muted-foreground italic py-4 w-full">
            Haga clic en "Añadir Por Qué" para comenzar a construir el árbol.
          </div>
        ) : (
          <div className="flex space-x-4 overflow-x-auto py-2">
            {safeCtm2Data.map((fm, fmIndex) => {
              const title = `Por Qué #${fmIndex + 1}`; 
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
                                {renderHypotheses(fm.hypotheses || [], [fmIndex, 'hypotheses'], `${fmIndex + 1}.`)}
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
