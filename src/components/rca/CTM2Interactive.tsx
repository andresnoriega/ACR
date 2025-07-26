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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';

let idCounter = Date.now();
const generateClientSideId = (prefix: string) => {
    idCounter++;
    return `${prefix}-${idCounter}`;
};


interface CtmValidationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (method: string) => void;
  isProcessing: boolean;
}

const CtmValidationDialog: FC<CtmValidationDialogProps> = ({ isOpen, onOpenChange, onConfirm, isProcessing }) => {
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
          <DialogTitle>Confirmar Validación/Rechazo de Porque</DialogTitle>
          <DialogDescription>
            Por favor, ingrese el método o justificación utilizado para validar o rechazar este "porque".
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="ctmValidationMethod">Método de Validación/Rechazo <span className="text-destructive">*</span></Label>
          <Textarea
            id="ctmValidationMethod"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="Ej: Revisión de bitácora, entrevista con operador, evidencia física encontrada, etc."
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


interface CTM2InteractiveProps {
  ctm2Data: CTMData;
  onSetCtm2Data: (data: CTMData) => void;
}


export const CTM2Interactive: FC<CTM2InteractiveProps> = ({ ctm2Data, onSetCtm2Data }) => {
  const [validationState, setValidationState] = useState<{ path: (string | number)[]; status: Hypothesis['status'] } | null>(null);
  const [isProcessingValidation, setIsProcessingValidation] = useState(false);
  
  const [internalData, setInternalData] = useState<CTMData>(() => Array.isArray(ctm2Data) ? ctm2Data : []);

  useEffect(() => {
      setInternalData(Array.isArray(ctm2Data) ? ctm2Data : []);
  }, [ctm2Data]);


  const handleUpdate = (path: (string | number)[], value: string) => {
    const newData: CTMData = JSON.parse(JSON.stringify(internalData));
    let current: any = newData;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = { ...current[path[path.length - 1]], description: value };
    setInternalData(newData);
    onSetCtm2Data(newData);
  };

  const handleToggleStatus = (path: (string | number)[], status: 'accepted' | 'rejected' | 'pending') => {
      const newData: CTMData = JSON.parse(JSON.stringify(internalData));
      let current: any = newData;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      const itemToUpdate = current[path[path.length - 1]];
      
      if (itemToUpdate.status === status) {
        // If clicking the same status button, toggle back to pending
        itemToUpdate.status = 'pending';
        itemToUpdate.validationMethod = undefined;
        setInternalData(newData);
        onSetCtm2Data(newData);
      } else {
        // Otherwise, open dialog to confirm new status
        setValidationState({ path, status });
      }
  };

  const handleConfirmValidation = useCallback((method: string) => {
    if (!validationState) return;
    setIsProcessingValidation(true);
    const { path, status } = validationState;
    
    const newData: CTMData = JSON.parse(JSON.stringify(internalData));
    let parent: any = newData;
    for (let i = 0; i < path.length - 1; i++) {
        parent = parent[path[i]];
    }
    const finalKey = path[path.length - 1];
    const itemToUpdate = parent[finalKey];
    
    itemToUpdate.status = status;
    itemToUpdate.validationMethod = method;

    setInternalData(newData);
    onSetCtm2Data(newData);
    setIsProcessingValidation(false);
    setValidationState(null);
  }, [internalData, onSetCtm2Data, validationState]);

  const handleAdd = (path: (string | number)[]) => {
    const newData: CTMData = JSON.parse(JSON.stringify(internalData));

    // Special case for CTM.2: Adding a new top-level "Por Qué" from an accepted "Porque"
    if(path.length === 4 && path[1] === 'hypotheses' && path[3] === 'physicalCauses') {
        const fmIndex = path[0] as number;
        const hypIndex = path[2] as number;
        
        const fm = newData[fmIndex];
        const hyp = fm?.hypotheses[hypIndex];
        
        if (hyp && hyp.status === 'accepted') {
            const newWhyDescription = `¿Por qué: "${hyp.description.substring(0, 50)}..."?`;
            newData.push({ id: generateClientSideId('fm'), description: newWhyDescription, hypotheses: [] });
            setInternalData(newData);
            onSetCtm2Data(newData);
            return;
        }
    }


    let parent: any = newData;
    let lastKey = path.length > 0 ? path[path.length - 1] : null;
    
    for (let i = 0; i < path.length - 1; i++) {
      parent = parent[path[i]];
    }

    if (lastKey === null) { 
      newData.push({ id: generateClientSideId('fm'), description: 'Nuevo Por Qué', hypotheses: [] });
    } else {
      let targetArray;
      if (typeof lastKey === 'string') {
        targetArray = parent[lastKey];
      } else if (typeof lastKey === 'number') {
        parent = parent[lastKey]; 
        if ('physicalCauses' in parent) targetArray = parent.physicalCauses;
        else if ('hypotheses' in parent) targetArray = parent.hypotheses;
      }
      
      if (!Array.isArray(targetArray)) {
         console.error("Target for adding is not an array", path, parent);
         return;
      }

      if ('physicalCauses' in parent) {
        if (!parent.physicalCauses) parent.physicalCauses = [];
        parent.physicalCauses.push({ id: generateClientSideId('pc'), description: '', humanCauses: [] });
      } else if ('hypotheses' in parent) {
        if (!parent.hypotheses) parent.hypotheses = [];
        parent.hypotheses.push({ id: generateClientSideId('hyp'), description: 'Nuevo Porque', physicalCauses: [], status: 'pending' });
      }
    }

    setInternalData(newData);
    onSetCtm2Data(newData);
  };

  const handleRemove = (path: (string | number)[]) => {
    const newData: CTMData = JSON.parse(JSON.stringify(internalData));
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
      {(physicalCauses || []).map((pc, pcIndex) => (
        <div key={pc.id} className="space-y-1">
          <Label className="text-xs font-semibold flex items-center text-orange-600 dark:text-orange-400">
            <Wrench className="mr-1 h-3 w-3" /> Causa Física #{pcIndex + 1}
          </Label>
           <div className="flex items-center gap-2">
            <Input value={pc.description} onChange={(e) => handleUpdate([...path, pcIndex], e.target.value)} className="h-8 text-xs" />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRemove([...path, pcIndex])}><Trash2 className="h-3 w-3 text-destructive" /></Button>
          </div>
        </div>
      ))}
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
              <BrainCircuit className="mr-2 h-4 w-4" /> Porque #{fmIndex + 1}.{hypIndex + 1}
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <Textarea 
                value={hyp.description} 
                onChange={(e) => handleUpdate([...path, hypIndex], e.target.value)} 
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
            {renderPhysicalCauses(hyp.physicalCauses, [...path, hypIndex, 'physicalCauses'], hyp.status === 'accepted')}
          </Card>
        ))}
        <Button size="sm" variant="outline" className="text-sm h-8" onClick={() => handleAdd(path)}><PlusCircle className="mr-2 h-4 w-4" /> Añadir Porque</Button>
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
          <Button onClick={() => handleAdd([])} variant="outline" size="sm">
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
                      <Input value={fm.description} onChange={(e) => handleUpdate([fmIndex], e.target.value)} className="text-sm"/>
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
        <CtmValidationDialog
          isOpen={!!validationState}
          onOpenChange={() => setValidationState(null)}
          onConfirm={handleConfirmValidation}
          isProcessing={isProcessingValidation}
        />
      )}
    </>
  );
};
