
'use client';
import type { FC } from 'react';
import type { FiveWhysData, FiveWhy } from '@/types/rca';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Trash2, HelpCircle, Check, X, CheckSquare } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { ValidationDialog } from './ValidationDialog';

interface FiveWhysInteractiveProps {
  fiveWhysData: FiveWhysData;
  onAddFiveWhyEntry: () => void;
  onUpdateFiveWhyEntry: (id: string, field: keyof Omit<FiveWhy, 'id'>, value: any) => void;
  onRemoveFiveWhyEntry: (id: string) => void;
  onToggleCauseStatus: (id: string, status: 'accepted' | 'rejected') => void;
  onMarkAsRootCause: (description: string) => void;
}

export const FiveWhysInteractive: FC<FiveWhysInteractiveProps> = ({
  fiveWhysData,
  onAddFiveWhyEntry,
  onUpdateFiveWhyEntry,
  onRemoveFiveWhyEntry,
  onToggleCauseStatus,
  onMarkAsRootCause,
}) => {
  const canAddNextWhy = (): boolean => {
    if (!fiveWhysData || fiveWhysData.length === 0) return true;
    const lastEntry = fiveWhysData[fiveWhysData.length - 1];
    return lastEntry && lastEntry.because && lastEntry.because.trim() !== '';
  };
  
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
            Comience preguntando por qué ocurrió el problema. Valide cada causa; si es correcta (✓), puede marcarla como causa raíz (☑) para añadirla a la lista principal.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
            {fiveWhysData.map((entry, entryIndex) => (
                <Card key={entry.id || entryIndex} className={cn("p-4 shadow-sm transition-all",
                    entry.status === 'accepted' && 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700',
                    entry.status === 'rejected' && 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 opacity-70',
                )}>
                  <CardContent className="p-0 space-y-3">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-primary">Paso #{entryIndex + 1}</p>
                        {fiveWhysData.length > 1 && (
                          <Button variant="ghost" size="icon" onClick={() => onRemoveFiveWhyEntry(entry.id)} className="h-7 w-7">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label htmlFor={`why-${entry.id}`} className="text-sm font-medium">¿Por qué?</label>
                        <Textarea id={`why-${entry.id}`} value={entry.why} onChange={(e) => onUpdateFiveWhyEntry(entry.id, 'why', e.target.value)} placeholder="¿Por qué ocurrió...?" rows={2} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label htmlFor={`because-${entry.id}`} className="text-sm font-medium">Porque... (Causa)</label>
                        </div>
                        <Textarea id={`because-${entry.id}`} value={entry.because} onChange={(e) => onUpdateFiveWhyEntry(entry.id, 'because', e.target.value)} placeholder="Describa la causa..." rows={2} />
                        {entry.validationMethod && <p className="text-xs text-muted-foreground italic pt-1">Justificación: {entry.validationMethod}</p>}
                      </div>
                      <div className="flex items-center gap-1 pt-1">
                          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onToggleCauseStatus(entry.id, 'accepted')} title="Aceptar Causa">
                              <Check className={cn("h-4 w-4", entry.status === 'accepted' ? "text-green-600" : "text-muted-foreground")} />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onToggleCauseStatus(entry.id, 'rejected')} title="Rechazar Causa">
                              <X className={cn("h-4 w-4", entry.status === 'rejected' ? "text-red-600" : "text-muted-foreground")} />
                          </Button>
                          {entry.status === 'accepted' && (
                            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onMarkAsRootCause(entry.because)} title="Marcar como Causa Raíz">
                                <CheckSquare className="h-4 w-4 text-primary" />
                            </Button>
                          )}
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
