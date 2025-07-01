'use client';
import type { FC, ChangeEvent } from 'react';
import type { FiveWhysData, FiveWhyEntry } from '@/types/rca';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, ArrowRight, HelpCircle } from 'lucide-react';

interface FiveWhysInteractiveProps {
  focusEventDescription: string;
  fiveWhysData: FiveWhysData;
  onAddFiveWhyEntry: () => void;
  onUpdateFiveWhyEntry: (id: string, field: 'why' | 'because', value: string) => void;
  onRemoveFiveWhyEntry: (id: string) => void;
}

export const FiveWhysInteractive: FC<FiveWhysInteractiveProps> = ({
  focusEventDescription,
  fiveWhysData,
  onAddFiveWhyEntry,
  onUpdateFiveWhyEntry,
  onRemoveFiveWhyEntry,
}) => {
  
  const handleWhyChange = (id: string, value: string) => {
    onUpdateFiveWhyEntry(id, 'why', value);
  };

  const handleBecauseChange = (id: string, value: string) => {
    onUpdateFiveWhyEntry(id, 'because', value);
  };

  return (
    <div className="space-y-6 mt-4 p-4 border rounded-lg shadow-sm bg-background">
      <h3 className="text-lg font-semibold font-headline text-center text-primary flex items-center justify-center">
        <HelpCircle className="mr-2 h-5 w-5" /> Análisis de los 5 Porqués
      </h3>

      <Card className="bg-primary/10">
        <CardHeader>
          <CardTitle className="text-md font-semibold text-primary text-center">Evento Foco Inicial</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground text-center">{focusEventDescription || "Defina el evento foco en el Paso 1."}</p>
        </CardContent>
      </Card>

      {fiveWhysData.map((entry, index) => {
        let whyPlaceholder = '';
        if (index === 0) {
          if (focusEventDescription && focusEventDescription.trim()) {
            const desc = focusEventDescription.trim();
            whyPlaceholder = `¿Por qué: "${desc.substring(0, 70)}${desc.length > 70 ? '...' : ''}"?`;
          } else {
            whyPlaceholder = `Pregunta inicial sobre el evento foco...`;
          }
        } else { // index > 0
          const previousBecause = fiveWhysData[index - 1]?.because?.trim();
          if (previousBecause) {
            whyPlaceholder = `¿Por qué: "${previousBecause.substring(0, 70)}${previousBecause.length > 70 ? '...' : ''}"?`;
          } else {
            const previousWhy = fiveWhysData[index - 1]?.why?.trim();
            if (previousWhy) {
              whyPlaceholder = `Siguiente porqué sobre: "${previousWhy.substring(0, 40)}${previousWhy.length > 40 ? '...' : ''}"?`;
            } else {
              whyPlaceholder = `Pregunta ${index + 1} (detalle la causa anterior)...`;
            }
          }
        }

        return (
          <div key={entry.id} className="space-y-3">
            {index > 0 && (
              <div className="flex justify-center my-2">
                <ArrowRight className="h-5 w-5 text-muted-foreground transform rotate-90 sm:rotate-0" />
              </div>
            )}
            <Card className="p-4 bg-secondary/30 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <Label htmlFor={`why-${entry.id}`} className="text-sm font-medium text-primary">
                  {index + 1}. ¿Por qué?
                </Label>
                {fiveWhysData.length > 1 && (
                   <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveFiveWhyEntry(entry.id)}
                      aria-label="Eliminar este porqué"
                      className="h-7 w-7"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                )}
              </div>
              <Input
                id={`why-${entry.id}`}
                value={entry.why}
                onChange={(e: ChangeEvent<HTMLInputElement>) => handleWhyChange(entry.id, e.target.value)}
                placeholder={whyPlaceholder}
                className="mb-2 text-sm"
              />
              
              <Label htmlFor={`because-${entry.id}`} className="text-sm font-medium text-primary">
                Porque...
              </Label>
              <Textarea
                id={`because-${entry.id}`}
                value={entry.because}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleBecauseChange(entry.id, e.target.value)}
                placeholder={`Respuesta / Razón ${index + 1}...`}
                rows={2}
                className="text-sm"
              />
            </Card>
          </div>
        );
      })}

      <Button onClick={onAddFiveWhyEntry} variant="outline" className="w-full mt-4">
        <PlusCircle className="mr-2 h-4 w-4" /> Añadir Siguiente Porqué
      </Button>
    </div>
  );
};
