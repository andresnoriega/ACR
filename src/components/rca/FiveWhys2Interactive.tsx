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
import { PlusCircle, Trash2, Share2, Check, X, GitBranchPlus, BrainCircuit, Wrench, User, Building, Loader2, HelpCircle } from 'lucide-react';
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
          <DialogTitle>Confirmar Validación/Rechazo de Hipótesis</DialogTitle>
          <DialogDescription>
            Por favor, ingrese el método o justificación utilizado para validar o rechazar esta hipótesis.
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


interface FiveWhys2InteractiveProps {
  whyWhy2Data: CTMData;
  onSetWhyWhy2Data: (data: CTMData) => void;
  focusEventDescription: string;
}


export const FiveWhys2Interactive: FC<FiveWhys2InteractiveProps> = ({ whyWhy2Data, onSetWhyWhy2Data, focusEventDescription }) => {
  const [validationState, setValidationState] = useState<{ path: (string | number)[]; status: Hypothesis['status'] } | null>(null);
  const [isProcessingValidation, setIsProcessingValidation] = useState(false);
  
  const [internalData, setInternalData] = useState<CTMData>(() => whyWhy2Data || []);

  useEffect(() => {
      onSetWhyWhy2Data(internalData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internalData]);


  const handleUpdate = (path: (string | number)[], value: string) => {
    const newData = JSON.parse(JSON.stringify(internalData));
    let current: any = newData;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = { ...current[path[path.length - 1]], description: value };
    setInternalData(newData);
  };

  const handleToggleStatus = (path: (string | number)[], status: 'accepted' | 'rejected' | 'pending') => {
      const newData = JSON.parse(JSON.stringify(internalData));
      let current: any = newData;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      const itemToUpdate = current[path[path.length - 1]];
      
      if (itemToUpdate.status === status) {
        itemToUpdate.status = 'pending';
        itemToUpdate.validationMethod = undefined;
        setInternalData(newData);
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
    
    itemToUpdate.status = status;
    itemToUpdate.validationMethod = method;

    setInternalData(newData);
    setIsProcessingValidation(false);
    setValidationState(null);
  }, [internalData, validationState]);

  const handleAdd = (path: (string | number)[]) => {
    const newData = JSON.parse(JSON.stringify(internalData));

    // Special case for adding the very first "Por qué"
    if (path.length === 0 && newData.length === 0) {
        newData.push({ 
            id: generateClientSideId('fm'), 
            description: `¿Por qué ocurrió: "${focusEventDescription}"?`, 
            hypotheses: [] 
        });
        setInternalData(newData);
        return;
    }


    let parent: any = newData;
    let lastKey = path.length > 0 ? path[path.length - 1] : null;
    
    for (let i = 0; i < path.length - 1; i++) {
      parent = parent[path[i]];
    }

    if (lastKey === null) { // Adding a new "Por qué" to the root
      newData.push({ id: generateClientSideId('fm'), description: 'Nuevo Por qué', hypotheses: [] });
    } else {
      let targetArray;
      if (typeof lastKey === 'string') {
        targetArray = parent[lastKey];
      } else if (typeof lastKey === 'number') {
        parent = parent[lastKey];
        if ('latentCauses' in parent) targetArray = parent.latentCauses;
        else if ('humanCauses' in parent) targetArray = parent.humanCauses;
        else if ('physicalCauses' in parent) targetArray = parent.physicalCauses;
        else if ('hypotheses' in parent) targetArray = parent.hypotheses;
      }
      
      if (!Array.isArray(targetArray)) {
         console.error("Target for adding is not an array", path, parent);
         return;
      }

      if ('latentCauses' in parent) {
        if (!parent.latentCauses) parent.latentCauses = [];
        parent.latentCauses.push({ id: generateClientSideId('lc'), description: 'Nueva Causa Latente' });
      } else if ('humanCauses' in parent) {
        if (!parent.humanCauses) parent.humanCauses = [];
        parent.humanCauses.push({ id: generateClientSideId('hc'), description: 'Nueva Causa Humana', latentCauses: [] });
      } else if ('physicalCauses' in parent) {
        if (!parent.physicalCauses) parent.physicalCauses = [];
        parent.physicalCauses.push({ id: generateClientSideId('pc'), description: 'Nueva Causa Física', humanCauses: [] });
      } else if ('hypotheses' in parent) {
        if (!parent.hypotheses) parent.hypotheses = [];
        parent.hypotheses.push({ id: generateClientSideId('hyp'), description: 'Nueva Hipótesis', physicalCauses: [], status: 'pending' });
      }
    }

    setInternalData(newData);
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
  };
  
  const renderLatentCauses = (latentCauses: LatentCause[] | undefined, path: (string | number)[]) => (
    <div className="pl-4 border-l ml-4 mt-2 space-y-2">
      {(latentCauses || []).map((lc, lcIndex) => (
        <div key={lc.id} className="space-y-1">
          <Label className="text-xs font-semibold flex items-center text-purple-600 dark:text-purple-400">
            <Building className="mr-1 h-3 w-3" /> Causa Latente #{lcIndex + 1}
          </Label>
           <div className="flex items-center gap-2">
            <Input value={lc.description} onChange={(e) => handleUpdate([...path, lcIndex], e.target.value)} className="h-8 text-xs" />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRemove([...path, lcIndex])}><Trash2 className="h-3 w-3 text-destructive" /></Button>
          </div>
        </div>
      ))}
      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleAdd(path)}><PlusCircle className="mr-1 h-3 w-3" /> Añadir C. Latente</Button>
    </div>
  );

  const renderHumanCauses = (humanCauses: HumanCause[] | undefined, path: (string | number)[]) => (
    <div className="pl-4 border-l ml-4 mt-2 space-y-2">
      {(humanCauses || []).map((hc, hcIndex) => (
        <div key={hc.id} className="space-y-1">
          <Label className="text-xs font-semibold flex items-center text-yellow-600 dark:text-yellow-400">
            <User className="mr-1 h-3 w-3" /> Causa Humana #{hcIndex + 1}
          </Label>
          <div className="flex items-center gap-2">
            <Input value={hc.description} onChange={(e) => handleUpdate([...path, hcIndex], e.target.value)} className="h-8 text-xs" />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRemove([...path, hcIndex])}><Trash2 className="h-3 w-3 text-destructive" /></Button>
          </div>
          {renderLatentCauses(hc.latentCauses, [...path, hcIndex, 'latentCauses'])}
        </div>
      ))}
      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleAdd(path)}><PlusCircle className="mr-1 h-3 w-3" /> Añadir C. Humana</Button>
    </div>
  );

  const renderPhysicalCauses = (physicalCauses: PhysicalCause[] | undefined, path: (string | number)[]) => (
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
          {renderHumanCauses(pc.humanCauses, [...path, pcIndex, 'humanCauses'])}
        </div>
      ))}
      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleAdd(path)}><PlusCircle className="mr-1 h-3 w-3" /> Añadir C. Física</Button>
    </div>
  );
  
  const renderHypotheses = (hypotheses: Hypothesis[] | undefined, path: (string | number)[]) => (
      <div className="pl-4 border-l-2 border-teal-500/50 ml-4 mt-2 space-y-3">
        {(hypotheses || []).map((hyp, hypIndex) => (
          <Card key={hyp.id} className={cn("p-3", hyp.status === 'accepted' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' : hyp.status === 'rejected' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 opacity-70' : 'bg-card')}>
            <Label className="text-sm font-semibold flex items-center text-teal-700 dark:text-teal-300">
              <BrainCircuit className="mr-2 h-4 w-4" /> Hipótesis #{hypIndex + 1}
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <Textarea value={hyp.description} onChange={(e) => handleUpdate([...path, hypIndex], e.target.value)} rows={1} className="text-sm" />
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
            {hyp.status !== 'rejected' && renderPhysicalCauses(hyp.physicalCauses, [...path, hypIndex, 'physicalCauses'])}
          </Card>
        ))}
        <Button size="sm" variant="outline" className="text-sm h-8" onClick={() => handleAdd(path)}><PlusCircle className="mr-2 h-4 w-4" /> Añadir Hipótesis</Button>
      </div>
  );


  return (
    <>
      <div className="space-y-4 mt-4 p-4 border rounded-lg shadow-sm bg-background">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h3 className="text-lg font-semibold font-headline text-primary flex items-center">
            <HelpCircle className="mr-2 h-5 w-5" /> 5 Porqués 2.0 (Basado en CTM)
          </h3>
        </div>
        <div className="space-y-4">
          {internalData.map((fm, fmIndex) => (
            <Card key={fm.id} className="p-4">
              <Accordion type="single" collapsible defaultValue="item-1">
                <AccordionItem value="item-1">
                  <div className="flex items-center w-full">
                    <AccordionTrigger className="flex-grow">
                      <span className="font-semibold flex items-center text-lg"><GitBranchPlus className="mr-2 h-5 w-5" /> Por qué #{fmIndex + 1}</span>
                    </AccordionTrigger>
                    <Button size="icon" variant="ghost" className="h-8 w-8 ml-2 shrink-0" onClick={(e) => {e.stopPropagation(); handleRemove([fmIndex]);}}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                  <AccordionContent className="pl-2 pt-2">
                    <div className="space-y-2 p-2 border-l-2">
                      <Label>Descripción del Por qué</Label>
                      <Textarea value={fm.description} onChange={(e) => handleUpdate([fmIndex], e.target.value)} className="text-sm" rows={2}/>
                      {renderHypotheses(fm.hypotheses, [fmIndex, 'hypotheses'])}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          ))}
          {internalData.length === 0 && (
            <div className="text-center text-muted-foreground italic py-4 w-full">
              Haga clic en "Añadir Por qué" para comenzar. El primero se basará en la Descripción del Evento Foco.
            </div>
          )}
           <Button onClick={() => handleAdd([])} variant="outline" className="w-full">
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Por qué
          </Button>
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
