
'use client';
import { FC, useCallback, useMemo, useState, useEffect } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { FiveWhysData, FiveWhyEntry } from '@/types/rca';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Trash2, Share2, Check, X, GitBranchPlus, BrainCircuit, Wrench, User, Building, Loader2, HelpCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';


interface FiveWhysInteractiveProps {
  fiveWhysData: FiveWhysData;
  onSetFiveWhysData: (data: FiveWhysData) => void;
  eventFocusDescription: string;
}

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const FiveWhysInteractive: FC<FiveWhysInteractiveProps> = ({ fiveWhysData, onSetFiveWhysData, eventFocusDescription }) => {

  const handleUpdate = (index: number, field: 'why' | 'because', value: string) => {
    const newData = [...fiveWhysData];
    newData[index] = { ...newData[index], [field]: value };
    onSetFiveWhysData(newData);
  };

  const handleAdd = () => {
    const lastEntry = fiveWhysData.length > 0 ? fiveWhysData[fiveWhysData.length - 1] : null;
    const initialWhy = lastEntry?.because ? `¿Por qué (${lastEntry.because.substring(0, 50)}...)?` : '';
    const newEntry: FiveWhyEntry = {
      id: generateId('5why'),
      why: initialWhy,
      because: '',
    };
    onSetFiveWhysData([...fiveWhysData, newEntry]);
  };
  
  const handleRemove = (id: string) => {
    const newData = fiveWhysData.filter(entry => entry.id !== id);
    onSetFiveWhysData(newData);
  };

  useEffect(() => {
    if (!fiveWhysData || fiveWhysData.length === 0) {
      const initialWhy = eventFocusDescription
        ? `¿Por qué ocurrió: "${eventFocusDescription.slice(0, 70)}${eventFocusDescription.length > 70 ? '...' : ''}"?`
        : '';
      onSetFiveWhysData([{ id: generateId('5why'), why: initialWhy, because: '' }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventFocusDescription]);


  return (
    <>
      <div className="space-y-4 mt-4 p-4 border rounded-lg shadow-sm bg-background">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h3 className="text-lg font-semibold font-headline text-primary flex items-center">
            <HelpCircle className="mr-2 h-5 w-5" /> 5 Porqués
          </h3>
          <Button onClick={handleAdd} variant="outline" size="sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Paso
          </Button>
        </div>
        <div className="space-y-3">
          {(fiveWhysData || []).map((entry, index) => (
            <Card key={entry.id} className="p-3">
               <div className="flex justify-between items-center mb-2">
                  <p className="font-semibold text-primary">Paso #{index + 1}</p>
                   <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRemove(entry.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
               </div>
               <div className="space-y-2">
                 <div>
                    <Label htmlFor={`why-${entry.id}`} className="text-sm">¿Por qué?</Label>
                    <Textarea
                      id={`why-${entry.id}`}
                      value={entry.why}
                      onChange={(e) => handleUpdate(index, 'why', e.target.value)}
                      placeholder="Pregunta del porqué..."
                      rows={2}
                    />
                 </div>
                 <div>
                    <Label htmlFor={`because-${entry.id}`} className="text-sm">Porque...</Label>
                    <Textarea
                      id={`because-${entry.id}`}
                      value={entry.because}
                      onChange={(e) => handleUpdate(index, 'because', e.target.value)}
                      placeholder="Respuesta o causa directa..."
                      rows={2}
                    />
                 </div>
               </div>
            </Card>
          ))}
          {(!fiveWhysData || fiveWhysData.length === 0) && (
            <div className="text-center text-muted-foreground italic py-4 w-full">
              Haga clic en "Añadir Paso" para comenzar el análisis de los 5 Porqués.
            </div>
          )}
        </div>
      </div>
    </>
  );
};
