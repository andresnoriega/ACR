
'use client';
import type { FC } from 'react';
import { useState, useEffect } from 'react';
import type { FiveWhyEntry } from '@/types/rca';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, HelpCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const generateClientSideId = (prefix: string) => {
    const randomPart = Math.random().toString(36).substring(2, 9);
    const timePart = Date.now().toString(36);
    return `${prefix}-${timePart}-${randomPart}`;
};

interface FiveWhysInteractiveProps {
  fiveWhysData: FiveWhyEntry[];
  onSetFiveWhysData: (data: FiveWhyEntry[]) => void;
  eventFocusDescription: string;
}

export const FiveWhysInteractive: FC<FiveWhysInteractiveProps> = ({
  fiveWhysData,
  onSetFiveWhysData,
  eventFocusDescription,
}) => {
    const [internalData, setInternalData] = useState<FiveWhyEntry[]>(fiveWhysData || []);

    useEffect(() => {
        if (JSON.stringify(fiveWhysData) !== JSON.stringify(internalData)) {
            setInternalData(fiveWhysData || []);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fiveWhysData]);


    const handleAddEntry = () => {
        const lastEntry = internalData.length > 0 ? internalData[internalData.length - 1] : null;
        const lastWhy = lastEntry?.because ? `¿Por qué: "${lastEntry.because.substring(0, 70)}..."?` : '';
        const newData = [...internalData, { id: generateClientSideId('5why'), why: lastWhy, because: '' }];
        setInternalData(newData);
        onSetFiveWhysData(newData);
    };

    const handleUpdateEntry = (id: string, field: 'why' | 'because', value: string) => {
        const newData = internalData.map(entry => entry.id === id ? { ...entry, [field]: value } : entry);
        setInternalData(newData);
        onSetFiveWhysData(newData);
    };

    const handleRemoveEntry = (id: string) => {
        const newData = internalData.filter(entry => entry.id !== id);
        setInternalData(newData);
        onSetFiveWhysData(newData);
    };

  return (
      <Card className="shadow-lg">
        <CardHeader><CardTitle className="text-xl font-semibold font-headline text-primary flex items-center"><HelpCircle className="mr-2 h-6 w-6" />Análisis de los 5 Porqués</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {internalData.map((entry, index) => (
            <Card key={entry.id} className="p-4 space-y-2 border-border">
              <div className="flex justify-between items-start">
                <div className="space-y-1 flex-grow">
                    <Label htmlFor={`why-${entry.id}`} className="font-semibold text-primary">#{index + 1} ¿Por qué?</Label>
                    <Textarea id={`why-${entry.id}`} value={entry.why} onChange={(e) => handleUpdateEntry(entry.id, 'why', e.target.value)} placeholder={`Ej: ¿Por qué ocurrió: ${eventFocusDescription.substring(0,50)}...?`} rows={2} />
                    <Label htmlFor={`because-${entry.id}`} className="font-semibold text-primary/90">Porque...</Label>
                    <Textarea id={`because-${entry.id}`} value={entry.because} onChange={(e) => handleUpdateEntry(entry.id, 'because', e.target.value)} placeholder="Describa la razón o causa..." rows={2} />
                </div>
                <div className="flex flex-col gap-1 ml-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveEntry(entry.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </Card>
          ))}
          <Button onClick={handleAddEntry} variant="outline" className="w-full">
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Siguiente ¿Por qué?
          </Button>
        </CardContent>
      </Card>
  );
};
