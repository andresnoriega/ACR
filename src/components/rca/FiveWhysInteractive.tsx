'use client';
import type { FC, ChangeEvent } from 'react';
import type { FiveWhysData } from '@/types/rca';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Trash2, HelpCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface FiveWhysInteractiveProps {
  fiveWhysData: FiveWhysData;
  onAddFiveWhyEntry: () => void;
  onUpdateFiveWhyEntry: (id: string, field: 'why' | 'because', value: string) => void;
  onRemoveFiveWhyEntry: (id: string) => void;
}

export const FiveWhysInteractive: FC<FiveWhysInteractiveProps> = ({
  fiveWhysData,
  onAddFiveWhyEntry,
  onUpdateFiveWhyEntry,
  onRemoveFiveWhyEntry,
}) => {
  return (
    <div className="space-y-4 mt-4 p-4 border rounded-lg shadow-sm bg-background">
      <h3 className="text-lg font-semibold font-headline text-primary">
        Análisis de los 5 Porqués
      </h3>
      <Alert>
        <HelpCircle className="h-4 w-4" />
        <AlertTitle>¿Cómo usar esta herramienta?</AlertTitle>
        <AlertDescription>
          Comience preguntando por qué ocurrió el problema (Evento Foco). Luego, tome la respuesta (el "porque") y úsela como base para la siguiente pregunta "por qué". Repita hasta llegar a la causa raíz fundamental.
        </AlertDescription>
      </Alert>
      {fiveWhysData.map((entry, index) => (
        <Card key={entry.id} className="p-4 shadow-sm">
          <CardContent className="p-0 space-y-3">
            <div className="flex justify-between items-center">
              <p className="font-semibold text-primary">Paso #{index + 1}</p>
              {fiveWhysData.length > 1 && (
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
              <label htmlFor={`because-${entry.id}`} className="text-sm font-medium">
                Porque... (Causa)
              </label>
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
      <Button onClick={onAddFiveWhyEntry} variant="outline" className="w-full">
        <PlusCircle className="mr-2 h-4 w-4" /> Añadir Siguiente Porqué
      </Button>
    </div>
  );
};
