
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


interface CTMInteractiveProps {
  ctmData: CTMData;
  onSetCtmData: (data: CTMData) => void;
}

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const CTMInteractive: FC<CTMInteractiveProps> = ({ ctmData, onSetCtmData }) => {
  const [validationState, setValidationState] = useState<{ path: (string | number)[]; status: Hypothesis['status'] } | null>(null);
  const [isProcessingValidation, setIsProcessingValidation] = useState(false);

  const handleUpdate = (path: (string | number)[], value: string) => {
    const newData = JSON.parse(JSON.stringify(ctmData));
    let current: any = newData;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = { ...current[path[path.length - 1]], description: value };
    onSetCtmData(newData);
  };

  const handleToggleStatus = (path: (string | number)[], status: 'accepted' | 'rejected' | 'pending') => {
      const newData = JSON.parse(JSON.stringify(ctmData));
      let current: any = newData;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      const itemToUpdate = current[path[path.length - 1]];
      
      if (itemToUpdate.status === status) {
        // If clicking the same status button, toggle back to pending
        itemToUpdate.status = 'pending';
        itemToUpdate.validationMethod = undefined;
        onSetCtmData(newData);
      } else {
        // Otherwise, open dialog to confirm new status
        setValidationState({ path, status });
      }
  };

  const handleConfirmValidation = useCallback((method: string) => {
    if (!validationState) return;
    setIsProcessingValidation(true);
    const { path, status } = validationState;
    
    const newData = JSON.parse(JSON.stringify(ctmData));
    let parent: any = newData;
    for (let i = 0; i < path.length - 1; i++) {
        parent = parent[path[i]];
    }
    const finalKey = path[path.length - 1];
    const itemToUpdate = parent[finalKey];
    
    itemToUpdate.status = status;
    itemToUpdate.validationMethod = method;

    onSetCtmData(newData);
    setIsProcessingValidation(false);
    setValidationState(null);
  }, [ctmData, onSetCtmData, validationState]);

  const handleAdd = (path: (string | number)[]) => {
    const newData = JSON.parse(JSON.stringify(ctmData));
    let parent: any = newData;
    let lastKey = path.length > 0 ? path[path.length - 1] : null;
    
    // Traverse to the parent of the target array
    for (let i = 0; i < path.length - 1; i++) {
      parent = parent[path[i]];
    }

    if (lastKey === null) { // Adding a new FailureMode to the root
      newData.push({ id: generateId('fm'), description: 'Nuevo Modo de Falla', hypotheses: [] });
    } else {
      let targetArray;
      if (typeof lastKey === 'string') {
        targetArray = parent[lastKey];
      } else if (typeof lastKey === 'number') {
        parent = parent[lastKey]; // Move to the object itself
        if ('latentCauses' in parent) targetArray = parent.latentCauses;
        else if ('humanCauses' in parent) targetArray = parent.humanCauses;
        else if ('physicalCauses' in parent) targetArray = parent.physicalCauses;
        else if ('hypotheses' in parent) targetArray = parent.hypotheses;
      }
      
      if (!Array.isArray(targetArray)) {
         console.error("Target for adding is not an array", path, parent);
         return; // Should not happen with corrected logic
      }

      if ('latentCauses' in parent) {
        if (!parent.latentCauses) parent.latentCauses = [];
        parent.latentCauses.push({ id: generateId('lc'), description: 'Nueva Causa Latente' });
      } else if ('humanCauses' in parent) {
        if (!parent.humanCauses) parent.humanCauses = [];
        parent.humanCauses.push({ id: generateId('hc'), description: 'Nueva Causa Humana', latentCauses: [] });
      } else if ('physicalCauses' in parent) {
        if (!parent.physicalCauses) parent.physicalCauses = [];
        parent.physicalCauses.push({ id: generateId('pc'), description: 'Nueva Causa Física', humanCauses: [] });
      } else if ('hypotheses' in parent) {
        if (!parent.hypotheses) parent.hypotheses = [];
        parent.hypotheses.push({ id: generateId('hyp'), description: 'Nueva Hipótesis', physicalCauses: [], status: 'pending' });
      }
    }

    onSetCtmData(newData);
  };

  const handleRemove = (path: (string | number)[]) => {
    const newData = JSON.parse(JSON.stringify(ctmData));
    let current: any = newData;
    for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
    }
    const indexToRemove = path[path.length - 1] as number;
    current.splice(indexToRemove, 1);
    onSetCtmData(newData);
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
            <Share2 className="mr-2 h-5 w-5" /> Árbol de Causas (CTM)
          </h3>
          <Button onClick={() => handleAdd([])} variant="outline" size="sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Modo de Falla
          </Button>
        </div>
        <div className="flex space-x-4 overflow-x-auto py-2">
          {ctmData.map((fm, fmIndex) => (
            <div key={fm.id} className="min-w-[20rem] flex-shrink-0">
              <Accordion type="single" collapsible defaultValue="item-1">
                <AccordionItem value="item-1">
                  <div className="flex items-center w-full">
                    <AccordionTrigger className="flex-grow">
                      <span className="font-semibold flex items-center"><GitBranchPlus className="mr-2 h-4 w-4" /> Modo de Falla #{fmIndex + 1}</span>
                    </AccordionTrigger>
                    <Button size="icon" variant="ghost" className="h-7 w-7 ml-2 shrink-0" onClick={(e) => {e.stopPropagation(); handleRemove([fmIndex]);}}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                  <AccordionContent className="pl-2">
                    <div className="space-y-2 p-2 border-l-2">
                      <Label>Descripción del Modo de Falla</Label>
                      <Input value={fm.description} onChange={(e) => handleUpdate([fmIndex], e.target.value)} className="text-sm"/>
                      {renderHypotheses(fm.hypotheses, [fmIndex, 'hypotheses'])}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          ))}
          {ctmData.length === 0 && (
            <div className="text-center text-muted-foreground italic py-4 w-full">
              Haga clic en "Añadir Modo de Falla" para comenzar a construir el árbol.
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
