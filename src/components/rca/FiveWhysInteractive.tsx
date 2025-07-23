
'use client';
import { FC, useCallback, useMemo, useState, useEffect } from 'react';
import type { FiveWhyEntry, FiveWhysData } from '@/types/rca';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Trash2, HelpCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface FiveWhysInteractiveProps {
  fiveWhysData: FiveWhysData;
  onSetFiveWhysData: (data: FiveWhysData) => void;
  eventFocusDescription?: string;
}

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const FiveWhysInteractive: FC<FiveWhysInteractiveProps> = ({ fiveWhysData, onSetFiveWhysData, eventFocusDescription }) => {

  const [localData, setLocalData] = useState<FiveWhysData>(() => {
    if (fiveWhysData && fiveWhysData.length > 0) {
      return fiveWhysData;
    }
    const initialWhy = eventFocusDescription
      ? `¿Por qué ocurrió: "${eventFocusDescription.substring(0, 70)}${eventFocusDescription.length > 70 ? "..." : ""}"?`
      : '';
    return [{ id: generateId('5why'), why: initialWhy, because: '' }];
  });

  useEffect(() => {
    onSetFiveWhysData(localData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localData]);


  const handleUpdateEntry = (id: string, field: 'why' | 'because', value: string) => {
    setLocalData(prevData =>
      prevData.map(entry =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
  };

  const handleAddEntry = () => {
    setLocalData(prevData => {
        const lastEntry = prevData.length > 0 ? prevData[prevData.length - 1] : null;
        const initialWhy = lastEntry && lastEntry.because 
            ? `¿Por qué: "${lastEntry.because.substring(0, 70)}${lastEntry.because.length > 70 ? '...' : ''}"?` 
            : '';
        return [...prevData, { id: generateId('5why'), why: initialWhy, because: '' }];
    });
  };

  const handleRemoveEntry = (id: string) => {
    setLocalData(prevData => prevData.filter(entry => entry.id !== id));
  };

  return (
    <div className="space-y-4 mt-4 p-4 border rounded-lg shadow-sm bg-background">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-lg font-semibold font-headline text-primary flex items-center">
          <HelpCircle className="mr-2 h-5 w-5" /> 5 Porqués
        </h3>
        <Button onClick={handleAddEntry} variant="outline" size="sm">
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Porqué
        </Button>
      </div>
      <div className="space-y-4">
        {localData.map((entry, index) => (
          <Card key={entry.id} className="p-4 bg-secondary/30">
            <div className="flex justify-between items-center mb-2">
                <p className="font-semibold text-primary">Paso #{index + 1}</p>
                {localData.length > 1 && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRemoveEntry(entry.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor={`why-${entry.id}`} className="text-sm font-medium">¿Por qué?</Label>
                <Textarea
                  id={`why-${entry.id}`}
                  value={entry.why}
                  onChange={(e) => handleUpdateEntry(entry.id, 'why', e.target.value)}
                  placeholder="Pregunta del porqué..."
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`because-${entry.id}`} className="text-sm font-medium">Porque...</Label>
                <Textarea
                  id={`because-${entry.id}`}
                  value={entry.because}
                  onChange={(e) => handleUpdateEntry(entry.id, 'because', e.target.value)}
                  placeholder="Respuesta o causa..."
                  rows={2}
                />
              </div>
            </div>
          </Card>
        ))}
        {localData.length === 0 && (
            <div className="text-center text-muted-foreground italic py-4">
                Haga clic en "Añadir Porqué" para comenzar el análisis.
            </div>
        )}
      </div>
    </div>
  );
};

