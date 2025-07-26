'use client';
import type { FC, ChangeEvent } from 'react';
import type { FiveWhysData, FiveWhysEntry, FiveWhysCause } from '@/types/rca';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
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
    let newWhy = '';
    if (lastEntry && lastEntry.becauses && lastEntry.becauses.length > 0) {
      const lastBecause = lastEntry.becauses[lastEntry.becauses.length - 1];
      newWhy = `¿Por qué: "${lastBecause.description.substring(0, 70)}..."?`;
    }
    
    const newEntry: FiveWhysEntry = {
      id: `5why-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      why: newWhy,
      becauses: [{ id: `cause-${Date.now()}`, description: '' }],
    };
    onSetFiveWhysData([...fiveWhysData, newEntry]);
  };

  const handleUpdateWhy = (id: string, value: string) => {
    onSetFiveWhysData(fiveWhysData.map(entry =>
      entry.id === id ? { ...entry, why: value } : entry
    ));
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
    onSetFiveWhysData(fiveWhysData.filter(entry => entry.id !== id));
  };
  
  const handleAddBecause = (entryId: string) => {
    onSetFiveWhysData(fiveWhysData.map(entry => {
      if (entry.id === entryId) {
        const newBecause: FiveWhysCause = { id: `cause-${Date.now()}`, description: '' };
        // Ensure becauses is an array before spreading
        const existingBecauses = Array.isArray(entry.becauses) ? entry.becauses : [];
        return { ...entry, becauses: [...existingBecauses, newBecause] };
      }
      return entry;
    }));
  };
  
  const handleUpdateBecause = (entryId: string, causeId: string, value: string) => {
    onSetFiveWhysData(fiveWhysData.map(entry => {
      if (entry.id === entryId && Array.isArray(entry.becauses)) {
        return { ...entry, becauses: entry.becauses.map(cause =>
          cause.id === causeId ? { ...cause, description: value } : cause
        )};
      }
      return entry;
    }));
  };
  
  const handleRemoveBecause = (entryId: string, causeId: string) => {
     onSetFiveWhysData(fiveWhysData.map(entry => {
      if (entry.id === entryId && Array.isArray(entry.becauses)) {
        if (entry.becauses.length > 1) {
          return { ...entry, becauses: entry.becauses.filter(cause => cause.id !== causeId) };
        }
      }
      return entry;
    }));
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
                  onChange={(e) => handleUpdateWhy(entry.id, e.target.value)}
                  placeholder="Pregunte '¿Por qué...?'"
                  rows={2}
                />
              </div>
              <div className="space-y-2 pt-2">
                <Label>Porque...</Label>
                {Array.isArray(entry.becauses) && entry.becauses.map((cause, causeIndex) => (
                  <div key={cause.id} className="pl-4 border-l-2 space-y-1">
                     <Label htmlFor={`because-${entry.id}-${cause.id}`} className="text-xs font-medium">Porque {index + 1}.{causeIndex + 1}</Label>
                    <div className="flex items-center gap-2">
                       <Textarea
                        id={`because-${entry.id}-${cause.id}`}
                        value={cause.description}
                        onChange={(e) => handleUpdateBecause(entry.id, cause.id, e.target.value)}
                        placeholder="Responda con la causa directa..."
                        rows={1}
                        className="text-sm"
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleRemoveBecause(entry.id, cause.id)} disabled={entry.becauses.length <= 1}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                 <Button size="sm" variant="outline" className="text-xs h-7 ml-4" onClick={() => handleAddBecause(entry.id)}><PlusCircle className="mr-1 h-3 w-3" /> Añadir Porque</Button>
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
