
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


export const CTM2Interactive: FC<CTM2InteractiveProps> = ({ ctm2Data, onSetCtm2Data, focusEventDescription }) => {
  const [validationState, setValidationState] = useState<{ path: (string | number)[]; status: Hypothesis['status'] } | null>(null);
  const [isProcessingValidation, setIsProcessingValidation] = useState(false);
  
  const [internalData, setInternalData] = useState<CTMData>([]);
  
  useEffect(() => {
    // Initialize internal state only once or when the external data fundamentally changes (e.g., new analysis loaded)
    setInternalData(Array.isArray(ctm2Data) ? JSON.parse(JSON.stringify(ctm2Data)) : []);
  }, [ctm2Data]);


  const handleUpdate = (path: (string | number)[], value: string) => {
    const newData = JSON.parse(JSON.stringify(internalData));
    let current: any = newData;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    const finalKey = path[path.length - 1];
    
    // Ensure we are updating the description property of the object
    if (current[finalKey] && typeof current[finalKey] === 'object') {
       current[finalKey].description = value;
    }

    setInternalData(newData);
    onSetCtm2Data(newData);
  };

  const handleToggleStatus = (path: (string | number)[], status: 'accepted' | 'rejected' | 'pending') => {
    const newData = JSON.parse(JSON.stringify(internalData));
    let current: any = newData;
    // Correctly traverse to the item that needs to be updated
    for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
    }
    const itemToUpdate = current[path[path.length - 1]];

    if (!itemToUpdate) {
        console.error("Item to update not found at path:", path);
        return;
    }

    if (itemToUpdate.status === status) {
        itemToUpdate.status = 'pending';
        itemToUpdate.validationMethod = undefined;
        setInternalData(newData);
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
    let parent: any = newData;
    for (let i = 0; i < path.length - 1; i++) {
        parent = parent[path[i]];
    }
    const finalKey = path[path.length - 1];
    const itemToUpdate = parent[finalKey];
    
    if (itemToUpdate) {
      itemToUpdate.status = status;
      itemToUpdate.validationMethod = method;
    }

    setInternalData(newData);
    onSetCtm2Data(newData);
    setValidationState(null); // Close the dialog
    setIsProcessingValidation(false);
  }, [internalData, onSetCtm2Data, validationState]);

  const handleAdd = (path: (string | number)[]) => {
    const newData = JSON.parse(JSON.stringify(internalData));
    let parent: any = newData;
    let targetArray;

    if (path.length === 0) { // Top-level button "Añadir Por Qué"
        const newWhyDescription = 'Nuevo Por Qué';
        newData.push({ id: generateClientSideId('fm'), description: newWhyDescription, hypotheses: [] });
        setInternalData(newData);
        onSetCtm2Data(newData);
        return;
    }

    for (let i = 0; i < path.length - 1; i++) {
        parent = parent[path[i]];
    }
    const lastKey = path[path.length - 1];
    
    if (typeof lastKey === 'string') {
      targetArray = parent[lastKey];
    } else {
        const hyp = parent[lastKey];
        if (hyp && hyp.status === 'accepted') {
            const desc = hyp.description || 'Causa Aprobada';
            const newWhyDescription = `¿Por qué: "${desc.substring(0, 50)}..."?`;
            if (!hyp.hypotheses) hyp.hypotheses = [];
            hyp.hypotheses.push({ id: generateClientSideId('hyp'), description: newWhyDescription, physicalCauses: [], status: 'pending' });
            setInternalData(newData);
            onSetCtm2Data(newData);
            return;
        }
        targetArray = parent[lastKey].hypotheses;
    }
    
    if (!Array.isArray(targetArray)) {
       console.error("Target for adding is not an array", path, parent);
       return;
    }

    targetArray.push({ id: generateClientSideId('hyp'), description: 'Nuevo Porque', physicalCauses: [], status: 'pending' });
    
    setInternalData(newData);
    onSetCtm2Data(newData);
  };
  
  const handleAddFailureMode = () => {
    const newData = JSON.parse(JSON.stringify(internalData));
    newData.push({
        id: generateClientSideId('fm'),
        description: `Nueva línea de investigación`,
        hypotheses: []
    });
    setInternalData(newData);
    onSetCtm2Data(newData);
  };


  const handleRemove = (path: (string | number)[]) => {
    const newData = JSON.parse(JSON.stringify(internalData));
    let current: any = newData;
    for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
    }
    const indexToRemove = path[path.length - 1] as number;
    current.splice(indexToRemove, 1);
    setInternalData(newData);
    onSetCtm2Data(newData);
  };
  
  const renderPhysicalCauses = (physicalCauses: PhysicalCause[] | undefined, path: (string | number)[], isParentAccepted: boolean) => (
    <div className="pl-4 border-l ml-4 mt-2 space-y-2">
      {isParentAccepted && (
        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleAdd(path)}><PlusCircle className="mr-1 h-3 w-3" /> Añadir Por Qué</Button>
      )}
    </div>
  );
  
  const renderHypotheses = (hypotheses: Hypothesis[] | undefined, path: (string | number)[], fmIndex: number) => (
      <div className="pl-4 border-l-2 border-teal-500/50 ml-4 mt-2 space-y-3">
        {(hypotheses || []).map((hyp, hypIndex) => (
          <Card key={hyp.id} className="p-3 bg-card">
            <Label className="text-sm font-semibold flex items-center text-teal-700 dark:text-teal-300">
              <BrainCircuit className="mr-2 h-4 w-4" /> porque #{fmIndex + 1}.{hypIndex + 1}
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
            {renderPhysicalCauses(hyp.hypotheses, [...path, hypIndex], hyp.status === 'accepted')}
          </Card>
        ))}
        <Button size="sm" variant="outline" className="text-sm h-8" onClick={() => handleAdd(path)}><PlusCircle className="mr-2 h-4 w-4" /> Añadir porque</Button>
      </div>
  );

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
        <div className="flex space-x-4 overflow-x-auto py-2">
          {safeInternalData.map((fm, fmIndex) => (
            <div key={fm.id} className="min-w-[20rem] flex-shrink-0">
              <Accordion type="single" collapsible defaultValue="item-1">
                <AccordionItem value="item-1">
                  <div className="flex items-center w-full">
                    <AccordionTrigger className="flex-grow">
                      <span className="font-semibold flex items-center"><GitBranchPlus className="mr-2 h-4 w-4" /> Por Qué #{fmIndex + 1}</span>
                    </AccordionTrigger>
                    <Button size="icon" variant="ghost" className="h-7 w-7 ml-2 shrink-0" onClick={(e) => {e.stopPropagation(); handleRemove([fmIndex]);}}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                  <AccordionContent className="pl-2">
                    <div className="space-y-2 p-2 border-l-2">
                      <Label>Descripción del Por Qué</Label>
                      <Input value={fm.description} onChange={(e) => handleUpdate([fmIndex, 'description'], e.target.value)} className="text-sm"/>
                      {renderHypotheses(fm.hypotheses, [fmIndex, 'hypotheses'], fmIndex)}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          ))}
          {safeInternalData.length === 0 && (
            <div className="text-center text-muted-foreground italic py-4 w-full">
              Haga clic en "Añadir Por Qué" para comenzar a construir el árbol.
            </div>
          )}
        </div>
      </div>
      {validationState && (
        <ValidationDialog
          isOpen={!!validationState}
          onOpenChange={(open) => {if (!isProcessingValidation) setValidationState(null)}}
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
