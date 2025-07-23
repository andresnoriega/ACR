
'use client';
import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, HelpCircle } from 'lucide-react';
import type { FiveWhyEntry, FiveWhysData } from '@/types/rca';

// Use a stable counter for new IDs to avoid hydration mismatch.
let idCounter = 0;
const generateStableId = () => `5why-stable-${idCounter++}`;

interface FiveWhysInteractiveProps {
  fiveWhysData: FiveWhysData;
  onSetFiveWhysData: (data: FiveWhysData) => void;
  eventFocusDescription: string;
}

export const FiveWhysInteractive: FC<FiveWhysInteractiveProps> = ({
  fiveWhysData,
  onSetFiveWhysData,
  eventFocusDescription,
}) => {
  // Use a lazy initializer for useState. This runs ONLY ONCE on initial render,
  // on both the server and the client, ensuring the initial state is identical
  // and preventing hydration errors.
  const [localData, setLocalData] = useState<FiveWhysData>(() => {
    if (fiveWhysData && fiveWhysData.length > 0) {
      return fiveWhysData;
    }
    // If the data is empty, create the first entry here.
    const initialWhyText = eventFocusDescription
      ? `¿Por qué ocurrió: "${eventFocusDescription.substring(0, 70)}${eventFocusDescription.length > 70 ? '...' : ''}"?`
      : '';
    return [{ id: generateStableId(), why: initialWhyText, because: '' }];
  });

  // Effect to sync parent state with local state when localData changes
  useEffect(() => {
    onSetFiveWhysData(localData);
  }, [localData, onSetFiveWhysData]);
  
  // Effect to update local state if parent prop changes (e.g., loading a different analysis)
  useEffect(() => {
    // Only update if the parent data is meaningfully different
    if (JSON.stringify(fiveWhysData) !== JSON.stringify(localData)) {
      if (fiveWhysData && fiveWhysData.length > 0) {
        setLocalData(fiveWhysData);
      } else {
        const initialWhyText = eventFocusDescription
          ? `¿Por qué ocurrió: "${eventFocusDescription.substring(0, 70)}${eventFocusDescription.length > 70 ? '...' : ''}"?`
          : '';
        setLocalData([{ id: generateStableId(), why: initialWhyText, because: '' }]);
      }
    }
  }, [fiveWhysData, eventFocusDescription]);


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
      const initialWhy = lastEntry?.because
        ? `¿Por qué: "${lastEntry.because.substring(0, 70)}${lastEntry.because.length > 70 ? '...' : ''}"?`
        : '';
      const newEntry: FiveWhyEntry = {
        id: generateStableId(),
        why: initialWhy,
        because: '',
      };
      return [...prevData, newEntry];
    });
  };

  const handleRemoveEntry = (id: string) => {
    setLocalData(prevData => prevData.filter(entry => entry.id !== id));
  };

  return (
    <div className="space-y-6 mt-4 p-4 border rounded-lg shadow-sm bg-background">
      <h3 className="text-lg font-semibold font-headline text-center text-primary flex items-center justify-center">
        <HelpCircle className="mr-2 h-5 w-5" /> 5 Porqués
      </h3>
      <div className="space-y-4">
        {localData.map((entry, index) => (
          <Card key={entry.id} className="p-4 bg-secondary/30">
            <div className="flex justify-between items-center mb-2">
              <p className="font-semibold text-primary">Paso #{index + 1}</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveEntry(entry.id)}
                aria-label="Eliminar paso"
                className="h-7 w-7"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`why-${entry.id}`}>¿Por qué?</Label>
              <Input
                id={`why-${entry.id}`}
                value={entry.why}
                onChange={(e) => handleUpdateEntry(entry.id, 'why', e.target.value)}
                placeholder="Pregunta 'Por qué'..."
              />
            </div>
            <div className="space-y-2 mt-2">
              <Label htmlFor={`because-${entry.id}`}>Porque...</Label>
              <Textarea
                id={`because-${entry.id}`}
                value={entry.because}
                onChange={(e) => handleUpdateEntry(entry.id, 'because', e.target.value)}
                placeholder="Respuesta 'Porque'..."
                rows={2}
              />
            </div>
          </Card>
        ))}
      </div>
      <Button onClick={handleAddEntry} variant="outline" className="w-full mt-4">
        <PlusCircle className="mr-2 h-4 w-4" /> Añadir Siguiente Porqué
      </Button>
    </div>
  );
};
