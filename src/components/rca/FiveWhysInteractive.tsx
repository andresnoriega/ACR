
'use client';
import type { FC, ChangeEvent } from 'react';
import { useState } from 'react';
import type { FiveWhysData, FiveWhysEntry } from '@/types/rca';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, HelpCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface FiveWhysInteractiveProps {
  fiveWhysData: FiveWhysData;
  onSetFiveWhysData: (data: FiveWhysData) => void;
}

export const FiveWhysInteractive: FC<FiveWhysInteractiveProps> = ({
  fiveWhysData,
  onSetFiveWhysData,
}) => {
  const { toast } = useToast();

  const handleAddEntry = () => {
    const lastEntry = fiveWhysData.length > 0 ? fiveWhysData[fiveWhysData.length - 1] : null;
    const newWhy = lastEntry?.because ? `¿Por qué: "${lastEntry.because.substring(0, 70)}..."?` : '';
    
    const newEntry: FiveWhysEntry = {
      id: `5why-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      why: newWhy,
      because: '',
    };
    onSetFiveWhysData([...fiveWhysData, newEntry]);
  };

  const handleUpdateEntry = (id: string, field: 'why' | 'because', value: string) => {
    const newData = fiveWhysData.map(entry =>
      entry.id === id ? { ...entry, [field]: value } : entry
    );
    onSetFiveWhysData(newData);
  };

  const handleRemoveEntry = (id: string) => {
    if (fiveWhysData.length <= 1) {
      toast({
        title: "Acción no permitida",
        description: "Debe haber al menos una entrada en los 5 Porqués.",
        variant: "destructive"
      });
      return;
    }
    const newData = fiveWhysData.filter(entry => entry.id !== id);
    onSetFiveWhysData(newData);
  };

  return (
    <div className="space-y-4 mt-4 p-4 border rounded-lg shadow-sm bg-background">
      <h3 className="text-lg font-semibold font-headline text-primary flex items-center">
        <HelpCircle className="mr-2 h-5 w-5" /> 5 Porqués
      </h3>
      <div className="space-y-4">
        {fiveWhysData.map((entry, index) => (
          <Card key={entry.id} className="p-4 bg-secondary/30">
            <div className="flex justify-between items-center mb-2">
              <p className="font-semibold text-primary">Por qué #{index + 1}</p>
              {index > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleRemoveEntry(entry.id)}
                  aria-label="Eliminar este paso"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <div>
                <Label htmlFor={`why-${entry.id}`}>¿Por qué?</Label>
                <Textarea
                  id={`why-${entry.id}`}
                  value={entry.why}
                  onChange={(e) => handleUpdateEntry(entry.id, 'why', e.target.value)}
                  placeholder="Pregunte '¿Por qué...?'"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor={`because-${entry.id}`}>Porque...</Label>
                <Textarea
                  id={`because-${entry.id}`}
                  value={entry.because}
                  onChange={(e) => handleUpdateEntry(entry.id, 'because', e.target.value)}
                  placeholder="Responda con la causa directa..."
                  rows={2}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Button
        onClick={handleAddEntry}
        variant="outline"
        className="w-full mt-4"
      >
        <PlusCircle className="mr-2 h-4 w-4" /> Añadir Siguiente "Por qué"
      </Button>
    </div>
  );
};
