'use client';
import type { FC } from 'react';
import { useState, useEffect } from 'react';
import type { FiveWhyEntry, FiveWhysData } from '@/types/rca';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, HelpCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface FiveWhysInteractiveProps {
  fiveWhysData: FiveWhysData;
  onSetFiveWhysData: (data: FiveWhysData) => void;
  eventFocusDescription: string;
}

const generateStableId = (() => {
  let counter = 0;
  return () => `5why-stable-${counter++}`;
})();


export const FiveWhysInteractive: FC<FiveWhysInteractiveProps> = ({
  fiveWhysData,
  onSetFiveWhysData,
  eventFocusDescription,
}) => {
  const { toast } = useToast();

  // Use a lazy initializer for useState to ensure server and client start with the same state.
  const [localData, setLocalData] = useState<FiveWhysData>(() => {
    if (fiveWhysData && fiveWhysData.length > 0) {
      return fiveWhysData;
    }
    const initialWhy = eventFocusDescription
      ? `¿Por qué ocurrió: "${eventFocusDescription.slice(0, 70)}${eventFocusDescription.length > 70 ? '...' : ''}"?`
      : '';
    return [{ id: generateStableId(), why: initialWhy, because: '' }];
  });

  // Use useEffect to sync props to local state if the external data changes (e.g., loading a new analysis)
  useEffect(() => {
    // Only update if the incoming data is actually different to prevent infinite loops
    if (JSON.stringify(fiveWhysData) !== JSON.stringify(localData)) {
       if (fiveWhysData && fiveWhysData.length > 0) {
           setLocalData(fiveWhysData);
       } else {
            const initialWhy = eventFocusDescription
            ? `¿Por qué ocurrió: "${eventFocusDescription.slice(0, 70)}${eventFocusDescription.length > 70 ? '...' : ''}"?`
            : '';
            setLocalData([{ id: generateStableId(), why: initialWhy, because: '' }]);
       }
    }
  }, [fiveWhysData, eventFocusDescription, localData]);


  const handleUpdate = (id: string, field: 'why' | 'because', value: string) => {
    const newData = localData.map(entry =>
      entry.id === id ? { ...entry, [field]: value } : entry
    );
    setLocalData(newData);
    onSetFiveWhysData(newData);
  };

  const handleAddEntry = () => {
    const lastEntry = localData.length > 0 ? localData[localData.length - 1] : null;
    const newWhy = lastEntry?.because
      ? `¿Por qué: "${lastEntry.because.slice(0, 70)}${lastEntry.because.length > 70 ? '...' : ''}"?`
      : '';
    const newEntry: FiveWhyEntry = { id: generateStableId(), why: newWhy, because: '' };
    const newData = [...localData, newEntry];
    setLocalData(newData);
    onSetFiveWhysData(newData);
    toast({ title: 'Nuevo "Porqué" añadido' });
  };

  const handleRemoveEntry = (id: string) => {
    if (localData.length <= 1) {
      toast({
        title: "Acción no permitida",
        description: "Debe haber al menos una entrada en el análisis.",
        variant: "destructive"
      });
      return;
    }
    const newData = localData.filter(entry => entry.id !== id);
    setLocalData(newData);
    onSetFiveWhysData(newData);
    toast({ title: 'Entrada eliminada', variant: "destructive" });
  };

  return (
    <Card className="shadow-lg mt-4">
      <CardHeader>
        <CardTitle className="text-xl font-semibold font-headline text-primary flex items-center">
          <HelpCircle className="mr-2 h-6 w-6" />
          Análisis de los 5 Porqués
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {localData.map((entry, index) => (
          <Card key={entry.id} className="p-4 bg-secondary/30">
            <div className="flex justify-between items-center mb-2">
              <p className="font-semibold text-primary">Paso #{index + 1}</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveEntry(entry.id)}
                aria-label={`Eliminar paso #${index + 1}`}
                className="h-7 w-7"
                disabled={localData.length <= 1}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`why-${entry.id}`}>¿Por qué?</Label>
              <Input
                id={`why-${entry.id}`}
                value={entry.why}
                onChange={(e) => handleUpdate(entry.id, 'why', e.target.value)}
                placeholder="Describa la pregunta..."
              />
            </div>
            <div className="space-y-2 mt-2">
              <Label htmlFor={`because-${entry.id}`}>Porque...</Label>
              <Input
                id={`because-${entry.id}`}
                value={entry.because}
                onChange={(e) => handleUpdate(entry.id, 'because', e.target.value)}
                placeholder="Describa la respuesta o causa..."
              />
            </div>
          </Card>
        ))}
        <Button onClick={handleAddEntry} variant="outline" className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Siguiente "Porqué"
        </Button>
      </CardContent>
    </Card>
  );
};
