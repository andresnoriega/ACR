
'use client';
import type { FC } from 'react';
import { useCallback, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, HelpCircle } from 'lucide-react';
import type { FiveWhysData, FiveWhyEntry } from '@/types/rca';

interface FiveWhysInteractiveProps {
  fiveWhysData: FiveWhysData;
  onSetFiveWhysData: (data: FiveWhysData) => void;
  eventFocusDescription: string;
}

const generateId = () => `5why-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const FiveWhysInteractive: FC<FiveWhysInteractiveProps> = ({
  fiveWhysData,
  onSetFiveWhysData,
  eventFocusDescription,
}) => {

  // Correct way to initialize state to prevent render-time updates
  useEffect(() => {
    if (fiveWhysData.length === 0) {
      const initialWhyText = eventFocusDescription
        ? `¿Por qué ocurrió: "${eventFocusDescription.substring(0, 70)}${eventFocusDescription.length > 70 ? '...' : ''}"?`
        : '';
      onSetFiveWhysData([{ id: generateId(), why: initialWhyText, because: '' }]);
    }
  }, [fiveWhysData, onSetFiveWhysData, eventFocusDescription]);

  const handleUpdateEntry = (id: string, field: 'why' | 'because', value: string) => {
    const newData = fiveWhysData.map(entry =>
      entry.id === id ? { ...entry, [field]: value } : entry
    );
    onSetFiveWhysData(newData);
  };

  const handleAddEntry = () => {
    const lastEntry = fiveWhysData.length > 0 ? fiveWhysData[fiveWhysData.length - 1] : null;
    const initialWhy = lastEntry?.because
      ? `¿Por qué: "${lastEntry.because.substring(0, 70)}${lastEntry.because.length > 70 ? '...' : ''}"?`
      : '';
    const newEntry: FiveWhyEntry = {
      id: generateId(),
      why: initialWhy,
      because: '',
    };
    onSetFiveWhysData([...fiveWhysData, newEntry]);
  };

  const handleRemoveEntry = (id: string) => {
    const newData = fiveWhysData.filter(entry => entry.id !== id);
    onSetFiveWhysData(newData);
  };

  return (
    <div className="space-y-6 mt-4 p-4 border rounded-lg shadow-sm bg-background">
      <h3 className="text-lg font-semibold font-headline text-center text-primary flex items-center justify-center">
        <HelpCircle className="mr-2 h-5 w-5" /> 5 Porqués
      </h3>
      <div className="space-y-4">
        {fiveWhysData.map((entry, index) => (
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
