
'use client';
import type { FC } from 'react';
import { FiveWhysData, FiveWhyEntry } from '@/types/rca';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PlusCircle, Trash2, GitBranchPlus, MessageCircle, HelpCircle, ArrowRight } from 'lucide-react';

interface FiveWhysInteractiveProps {
  focusEventDescription: string;
  fiveWhysData: FiveWhysData;
  onSetFiveWhysData: (data: FiveWhysData) => void;
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
      
      <div className="relative w-full overflow-x-auto pb-4">
        <div className="flex items-start space-x-4 min-w-max">
          {(fiveWhysData || []).map((entry, index) => (
            <div key={entry.id} className="flex items-center space-x-4">
              {index > 0 && <ArrowRight className="h-6 w-6 text-primary shrink-0" />}
              <Card className="w-80 shrink-0">
                <CardHeader className="p-3 bg-secondary/40">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base font-semibold text-primary">
                      Paso {index + 1}
                    </CardTitle>
                    {index > 0 && ( // The first one cannot be deleted
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
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor={`why-${entry.id}`} className="font-semibold flex items-center text-primary text-sm">
                      <HelpCircle className="mr-1.5 h-4 w-4" /> ¿Por qué?
                    </Label>
                    <Textarea
                      id={`why-${entry.id}`}
                      value={entry.why}
                      onChange={(e) => onUpdateFiveWhyEntry(entry.id, 'why', e.target.value)}
                      placeholder="Describa el 'porqué'..."
                      rows={3}
                      className="text-sm"
                      disabled={index === 0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`because-${entry.id}`} className="font-semibold flex items-center text-sm">
                      <MessageCircle className="mr-1.5 h-4 w-4" /> Porque...
                    </Label>
                    <Textarea
                      id={`because-${entry.id}`}
                      value={entry.because}
                      onChange={(e) => onUpdateFiveWhyEntry(entry.id, 'because', e.target.value)}
                      placeholder="Describa la razón..."
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
          <div className="flex items-center pl-4">
            <Button
              onClick={onAddFiveWhyEntry}
              variant="outline"
              className="h-full w-40 flex-col"
            >
              <PlusCircle className="h-6 w-6 mb-2" />
              Añadir Siguiente Paso
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
