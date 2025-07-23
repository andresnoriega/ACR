
'use client';
import type { FC, ChangeEvent } from 'react';
import type { FiveWhyEntry } from '@/types/rca';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, HelpCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface FiveWhysInteractiveProps {
  fiveWhysData: FiveWhyEntry[];
  onAddEntry: () => void;
  onUpdateEntry: (id: string, field: 'why' | 'because', value: string) => void;
  onRemoveEntry: (id: string) => void;
  eventFocusDescription: string;
}

export const FiveWhysInteractive: FC<FiveWhysInteractiveProps> = ({
  fiveWhysData,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
  eventFocusDescription,
}) => {

  const handleWhyChange = (id: string, value: string) => {
    onUpdateEntry(id, 'why', value);
  };

  const handleBecauseChange = (id: string, value: string) => {
    onUpdateEntry(id, 'because', value);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold font-headline text-primary flex items-center">
          <HelpCircle className="mr-2 h-6 w-6" />
          Análisis de los 5 Porqués
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fiveWhysData.map((entry, index) => (
          <div key={entry.id} className="p-4 space-y-2 border rounded-lg bg-secondary/20">
            <div className="flex justify-between items-center">
              <Label htmlFor={`why-${entry.id}`} className="font-semibold text-primary">
                #{index + 1} ¿Por qué?
              </Label>
              {fiveWhysData.length > 1 && (
                 <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemoveEntry(entry.id)}>
                   <Trash2 className="h-4 w-4 text-destructive" />
                 </Button>
              )}
            </div>
            <Textarea
              id={`why-${entry.id}`}
              value={entry.why}
              onChange={(e) => handleWhyChange(entry.id, e.target.value)}
              placeholder={`Ej: ¿Por qué ocurrió: ${eventFocusDescription.substring(0,50)}...?`}
              rows={2}
            />

            <Label htmlFor={`because-${entry.id}`} className="font-semibold text-primary/90">
              Porque...
            </Label>
            <Textarea
              id={`because-${entry.id}`}
              value={entry.because}
              onChange={(e) => handleBecauseChange(entry.id, e.target.value)}
              placeholder="Describa la razón o causa..."
              rows={2}
            />
          </div>
        ))}
        <Button onClick={onAddEntry} variant="outline" className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Siguiente ¿Por qué?
        </Button>
      </CardContent>
    </Card>
  );
};
