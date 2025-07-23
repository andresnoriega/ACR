'use client';
import type { FC } from 'react';
import { useState } from 'react';
import type { FiveWhyEntry } from '@/types/rca';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, HelpCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const generateStableId = () => `5why-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const FiveWhysInteractive: FC<{
  fiveWhysData: FiveWhyEntry[];
  onSetFiveWhysData: (data: FiveWhyEntry[]) => void;
  eventFocusDescription: string;
}> = ({ fiveWhysData, onSetFiveWhysData, eventFocusDescription }) => {
  const [internalData, setInternalData] = useState<FiveWhyEntry[]>(() => {
    if (fiveWhysData && fiveWhysData.length > 0) {
      return fiveWhysData;
    }
    const initialWhy = eventFocusDescription
      ? `¿Por qué ocurrió: "${eventFocusDescription.substring(0, 70)}${eventFocusDescription.length > 70 ? '...' : ''}"?`
      : '';
    return [{ id: generateStableId(), why: initialWhy, because: '' }];
  });

  const handleUpdate = (index: number, field: 'why' | 'because', value: string) => {
    const newData = [...internalData];
    newData[index] = { ...newData[index], [field]: value };
    setInternalData(newData);
    onSetFiveWhysData(newData);
  };

  const handleAddEntry = () => {
    const lastEntry = internalData.length > 0 ? internalData[internalData.length - 1] : null;
    const newWhy = lastEntry?.because
      ? `¿Por qué: "${lastEntry.because.substring(0, 70)}${lastEntry.because.length > 70 ? '...' : ''}"?`
      : '';

    const newEntry: FiveWhyEntry = {
      id: generateStableId(),
      why: newWhy,
      because: '',
    };
    const newData = [...internalData, newEntry];
    setInternalData(newData);
    onSetFiveWhysData(newData);
  };

  const handleRemoveEntry = (indexToRemove: number) => {
    if (internalData.length <= 1) return;
    const newData = internalData.filter((_, index) => index !== indexToRemove);
    setInternalData(newData);
    onSetFiveWhysData(newData);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold font-headline text-primary flex items-center">
          <HelpCircle className="mr-2 h-6 w-6" />
          5 Porqués
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {internalData.map((entry, index) => (
          <div key={entry.id} className="p-3 border rounded-md bg-secondary/30 space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor={`why-${entry.id}`} className="font-semibold text-primary">
                #{index + 1} ¿Por qué?
              </Label>
              {internalData.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleRemoveEntry(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
            <Textarea
              id={`why-${entry.id}`}
              value={entry.why}
              onChange={(e) => handleUpdate(index, 'why', e.target.value)}
              placeholder="Describa el 'porqué'..."
              rows={2}
            />
            <div className="pl-4">
              <Label htmlFor={`because-${entry.id}`} className="font-semibold">
                Porque...
              </Label>
              <Textarea
                id={`because-${entry.id}`}
                value={entry.because}
                onChange={(e) => handleUpdate(index, 'because', e.target.value)}
                placeholder="Describa la causa o razón..."
                rows={2}
              />
            </div>
          </div>
        ))}
        <Button onClick={handleAddEntry} variant="outline" className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Siguiente ¿Por qué?
        </Button>
      </CardContent>
    </Card>
  );
};
