
'use client';
import { FC, useState, useEffect } from 'react';
import type { FiveWhyEntry } from '@/types/rca';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, HelpCircle } from 'lucide-react';

interface FiveWhysInteractiveProps {
  focusEventDescription: string;
  fiveWhysData: FiveWhyEntry[];
  onSetFiveWhysData: (data: FiveWhyEntry[]) => void;
  onAddFiveWhyEntry: () => void;
  onUpdateFiveWhyEntry: (id: string, field: 'why' | 'because', value: string) => void;
  onRemoveFiveWhyEntry: (id: string) => void;
}

export const FiveWhysInteractive: FC<FiveWhysInteractiveProps> = ({
  focusEventDescription,
  fiveWhysData,
  onSetFiveWhysData,
  onAddFiveWhyEntry,
  onUpdateFiveWhyEntry,
  onRemoveFiveWhyEntry,
}) => {
  // Effect to initialize the first "Why" if data is empty and focus event exists
  useEffect(() => {
    if ((!fiveWhysData || fiveWhysData.length === 0) && focusEventDescription) {
      const whyText = `¿Por qué ocurrió: "${focusEventDescription.substring(0, 70)}${focusEventDescription.length > 70 ? "..." : ""}"?`;
      onSetFiveWhysData([{ id: `5why-${Date.now()}`, why: whyText, because: '' }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusEventDescription]);

  return (
    <div className="space-y-4 mt-4 p-4 border rounded-lg shadow-sm bg-background">
      <h3 className="text-lg font-semibold font-headline text-center text-primary flex items-center justify-center">
        <HelpCircle className="mr-2 h-5 w-5" /> Análisis de los 5 Porqués
      </h3>

      <div className="space-y-3">
        {fiveWhysData.map((entry, index) => (
          <div key={entry.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start p-3 border rounded-md bg-secondary/30">
            <div className="space-y-1">
              <Label htmlFor={`why-${entry.id}`} className="font-medium text-sm">
                ¿Por qué? #{index + 1}
              </Label>
              <Textarea
                id={`why-${entry.id}`}
                value={entry.why}
                onChange={(e) => onUpdateFiveWhyEntry(entry.id, 'why', e.target.value)}
                placeholder={`¿Por qué ocurrió el evento anterior?`}
                rows={3}
                className="bg-background"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label htmlFor={`because-${entry.id}`} className="font-medium text-sm">
                  Porque...
                </Label>
                {fiveWhysData.length > 1 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => onRemoveFiveWhyEntry(entry.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
              <Textarea
                id={`because-${entry.id}`}
                value={entry.because}
                onChange={(e) => onUpdateFiveWhyEntry(entry.id, 'because', e.target.value)}
                placeholder="Describa la razón directa..."
                rows={3}
                className="bg-background"
              />
            </div>
          </div>
        ))}
      </div>

      <Button onClick={onAddFiveWhyEntry} variant="outline" className="w-full">
        <PlusCircle className="mr-2 h-4 w-4" /> Añadir Siguiente "¿Por qué?"
      </Button>
    </div>
  );
};
