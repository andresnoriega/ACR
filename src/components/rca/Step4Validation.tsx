'use client';
import type { FC } from 'react';
import type { PlannedAction, Validation } from '@/types/rca';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Circle } from 'lucide-react';

interface Step4ValidationProps {
  plannedActions: PlannedAction[];
  validations: Validation[];
  onToggleValidation: (actionId: string) => void;
  onPrevious: () => void;
  onNext: () => void;
}

export const Step4Validation: FC<Step4ValidationProps> = ({
  plannedActions,
  validations,
  onToggleValidation,
  onPrevious,
  onNext,
}) => {
  const getValidationStatus = (actionId: string) => {
    const validation = validations.find(v => v.actionId === actionId);
    return validation ? validation.status : 'pending';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Paso 4: Validación de Acciones</CardTitle>
        <CardDescription>Marque las acciones del plan que han sido validadas como completadas y efectivas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {plannedActions.length === 0 ? (
          <p className="text-muted-foreground">No hay acciones planificadas para validar. Por favor, agréguelas en el Paso 3.</p>
        ) : (
          plannedActions.map((action) => {
            const status = getValidationStatus(action.id);
            return (
              <Card key={action.id} className="p-4 flex items-center justify-between bg-secondary/50 hover:shadow-md transition-shadow">
                <div className="flex-1">
                  <h4 className="font-semibold text-primary">{action.description}</h4>
                  <p className="text-sm text-muted-foreground">Responsable: {action.responsible} | Fecha Límite: {action.dueDate || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">ID: {action.id}</p>
                </div>
                <div className="flex items-center space-x-3">
                   <Label htmlFor={`validation-${action.id}`} className="flex items-center cursor-pointer">
                    <Checkbox
                      id={`validation-${action.id}`}
                      checked={status === 'validated'}
                      onCheckedChange={() => onToggleValidation(action.id)}
                      className="mr-2"
                    />
                    {status === 'validated' ? (
                      <span className="text-accent font-medium flex items-center"><CheckCircle2 className="mr-1 h-5 w-5" /> Validado</span>
                    ) : (
                      <span className="text-muted-foreground flex items-center"><Circle className="mr-1 h-5 w-5" /> Pendiente</span>
                    )}
                  </Label>
                </div>
              </Card>
            );
          })
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={onPrevious} variant="outline" className="transition-transform hover:scale-105">Anterior</Button>
        <Button onClick={onNext} className="transition-transform hover:scale-105">Siguiente</Button>
      </CardFooter>
    </Card>
  );
};
