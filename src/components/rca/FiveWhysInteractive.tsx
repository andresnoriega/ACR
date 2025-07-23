
'use client';
import type { FC } from 'react';
import { useCallback, useState } from 'react';
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
import { Card } from '@/components/ui/card';
import { PlusCircle, Trash2, HelpCircle } from 'lucide-react';

interface FiveWhysInteractiveProps {
  fiveWhysData: FiveWhysData;
  onSetFiveWhysData: (data: FiveWhysData) => void;
  eventFocusDescription: string;
}

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const FiveWhysInteractive: FC<FiveWhysInteractiveProps> = ({ fiveWhysData, onSetFiveWhysData, eventFocusDescription }) => {

  const handleUpdate = (id: string, field: 'why' | 'because', value: string) => {
    const newData = fiveWhysData.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    );
    onSetFiveWhysData(newData);
  };

  const handleAdd = () => {
    const lastEntry = fiveWhysData.length > 0 ? fiveWhysData[fiveWhysData.length - 1] : null;
    const newWhy = lastEntry?.because
      ? `¿Por qué: "${lastEntry.because.slice(0, 70)}${lastEntry.because.length > 70 ? '...' : ''}"?`
      : '';
      
    const initialWhy = eventFocusDescription 
        ? `¿Por qué ocurrió: "${eventFocusDescription.slice(0, 70)}${eventFocusDescription.length > 70 ? '...' : ''}"?`
        : '';
        
    const newEntry: FiveWhyEntry = { 
        id: generateId('5why'), 
        why: fiveWhysData.length === 0 ? initialWhy : newWhy, 
        because: '' 
    };

    const newData = [...fiveWhysData, newEntry];
    onSetFiveWhysData(newData);
  };

  const handleRemove = (idToRemove: string) => {
    if (fiveWhysData.length <= 1) {
        // Optionally, clear the first entry instead of removing it
        const clearedData = [{ id: fiveWhysData[0].id, why: '', because: '' }];
        onSetFiveWhysData(clearedData);
        return;
    }
    const newData = fiveWhysData.filter(entry => entry.id !== idToRemove);
    onSetFiveWhysData(newData);
  };
  
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
          {(fiveWhysData && fiveWhysData.length > 0) ? (
            fiveWhysData.map((entry, index) => (
                <Accordion key={entry.id || index} type="single" collapsible defaultValue="item-1">
                    <AccordionItem value="item-1">
                        <div className="flex items-center w-full">
                            <AccordionTrigger className="flex-grow">
                                <span className="font-semibold flex items-center">
                                    <HelpCircle className="mr-2 h-4 w-4" /> Porqué #{index + 1}
                                </span>
                            </AccordionTrigger>
                            <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7 ml-2 shrink-0" 
                                onClick={(e) => { e.stopPropagation(); handleRemove(entry.id); }}
                            >
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                        <AccordionContent className="pl-2">
                            <div className="space-y-2 p-2 border-l-2">
                                <div className="space-y-1">
                                    <Label htmlFor={`why-${entry.id}`} className="text-sm">Pregunta (¿Por qué?)</Label>
                                    <Input
                                        id={`why-${entry.id}`}
                                        value={entry.why}
                                        onChange={(e) => handleUpdate(entry.id, 'why', e.target.value)}
                                        className="text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor={`because-${entry.id}`} className="text-sm">Respuesta (Porque...)</Label>
                                    <Input
                                        id={`because-${entry.id}`}
                                        value={entry.because}
                                        onChange={(e) => handleUpdate(entry.id, 'because', e.target.value)}
                                        className="text-sm"
                                    />
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            ))
          ) : (
            <div className="text-center text-muted-foreground italic py-4 w-full">
              Haga clic en "Añadir Paso" para comenzar el análisis de los 5 Porqués.
            </div>
          )}
        </div>
      </div>
    </>
  );
};
