'use client';
import { FC, useCallback } from 'react';
import type { FiveWhysData, FiveWhy } from '@/types/rca';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Trash2, HelpCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';


// --- Main Component ---
interface FiveWhysInteractiveProps {
  fiveWhysData: FiveWhysData;
  onAddFiveWhyEntry: () => void;
  onUpdateFiveWhyEntry: (id: string, field: keyof Omit<FiveWhy, 'id'>, value: any) => void;
  onRemoveFiveWhyEntry: (id: string) => void;
}

export const FiveWhysInteractive: FC<FiveWhysInteractiveProps> = ({
  fiveWhysData,
  onAddFiveWhyEntry,
  onUpdateFiveWhyEntry,
  onRemoveFiveWhyEntry,
}) => {
  
  // Defensive check to ensure fiveWhysData is always an array.
  const safeFiveWhysData = Array.isArray(fiveWhysData) ? fiveWhysData : [];

  const canAddNextWhy = useCallback((): boolean => {
    if (safeFiveWhysData.length === 0) {
      return true; // Can always add the first one
    }
    const lastEntry = safeFiveWhysData[safeFiveWhysData.length - 1];
    // A simple logic: you can add a new "why" if the last one has a "because".
    return lastEntry && lastEntry.because && lastEntry.because.trim() !== '';
  }, [safeFiveWhysData]);
  
  return (
      <div className="space-y-4 mt-4 p-4 border rounded-lg shadow-sm bg-background">
        <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold font-headline text-primary">
            Análisis de los 5 Porqués
            </h3>
        </div>
        <Alert>
          <HelpCircle className="h-4 w-4" />
          <AlertTitle>¿Cómo usar esta herramienta?</AlertTitle>
          <AlertDescription>
            Comience preguntando por qué ocurrió el problema. Responda en el campo "Porque...". Puede continuar añadiendo "porqués" para profundizar en la causa raíz.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
            {safeFiveWhysData.map((entry, entryIndex) => (
                <Card key={entry.id || entryIndex} className={cn("p-4 shadow-sm transition-all")}>
                  <CardContent className="p-0 space-y-3">
                      <div className="flex justify-between items-center">
                      <p className="font-semibold text-primary">Paso #{entryIndex + 1}</p>
                      {safeFiveWhysData.length > 1 && (
                          <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemoveFiveWhyEntry(entry.id)}
                          className="h-7 w-7"
                          >
                          <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                      )}
                      </div>
                      <div className="space-y-2">
                      <label htmlFor={`why-${entry.id}`} className="text-sm font-medium">
                          ¿Por qué?
                      </label>
                      <Textarea
                          id={`why-${entry.id}`}
                          value={entry.why}
                          onChange={(e) => onUpdateFiveWhyEntry(entry.id, 'why', e.target.value)}
                          placeholder="¿Por qué ocurrió...?"
                          rows={2}
                      />
                      </div>
                      <div className="space-y-2">
                      <div className="flex justify-between items-center">
                          <label htmlFor={`because-${entry.id}`} className="text-sm font-medium">
                          Porque... (Causa)
                          </label>
                      </div>
                      <Textarea
                          id={`because-${entry.id}`}
                          value={entry.because}
                          onChange={(e) => onUpdateFiveWhyEntry(entry.id, 'because', e.target.value)}
                          placeholder="Describa la causa..."
                          rows={2}
                      />
                      </div>
                  </CardContent>
                </Card>
            ))}
             <Button onClick={onAddFiveWhyEntry} variant="outline" className="w-full" disabled={!canAddNextWhy()}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Siguiente Porqué
            </Button>
        </div>
      </div>
  );
};
