
'use client';
import type { FC } from 'react';
import type { PlannedAction, Validation, FullUserProfile } from '@/types/rca';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Circle, UserCog } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface Step4ValidationProps {
  plannedActions: PlannedAction[];
  validations: Validation[];
  onToggleValidation: (actionId: string) => void;
  projectLeader: string;
  availableUserProfiles: FullUserProfile[];
  currentSimulatedUser: string | null;
  onSetCurrentSimulatedUser: (userName: string | null) => void;
  onPrevious: () => void;
  onNext: () => void;
}

const NONE_USER_VALUE = "--NONE--"; // Define a constant for the "none" value

export const Step4Validation: FC<Step4ValidationProps> = ({
  plannedActions,
  validations,
  onToggleValidation,
  projectLeader,
  availableUserProfiles,
  currentSimulatedUser,
  onSetCurrentSimulatedUser,
  onPrevious,
  onNext,
}) => {
  const { toast } = useToast();

  const getValidationStatus = (actionId: string) => {
    const validation = validations.find(v => v.actionId === actionId);
    return validation ? validation.status : 'pending';
  };

  const canUserValidate = (currentUserProfile: FullUserProfile | undefined): boolean => {
    if (!currentUserProfile) return false;

    const isLeader = currentUserProfile.name === projectLeader;
    const isAdminWithTotalEdit = currentUserProfile.role === 'Admin' && currentUserProfile.permissionLevel === 'Total';
    
    return isLeader || isAdminWithTotalEdit;
  };

  const handleValidationToggleAttempt = (actionId: string) => {
    if (!currentSimulatedUser) {
      toast({
        title: "Usuario no seleccionado",
        description: "Por favor, seleccione un usuario en 'Actuar como:' para validar.",
        variant: "destructive",
      });
      return;
    }

    const userProfile = availableUserProfiles.find(u => u.name === currentSimulatedUser);
    if (canUserValidate(userProfile)) {
      onToggleValidation(actionId);
    } else {
      toast({
        title: "Permiso Denegado",
        description: "No tiene permisos para validar esta acción.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Paso 4: Validación de Acciones</CardTitle>
        <CardDescription>
          Seleccione un perfil para simular la validación. Solo el Líder del Proyecto o un Administrador con Edición Total pueden validar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2 max-w-sm">
          <Label htmlFor="simulatedUser" className="flex items-center font-medium">
            <UserCog className="mr-2 h-5 w-5 text-primary" />
            Actuar como (Simulación de Usuario):
          </Label>
          <Select
            value={currentSimulatedUser || NONE_USER_VALUE}
            onValueChange={(value) => onSetCurrentSimulatedUser(value === NONE_USER_VALUE ? null : value)}
          >
            <SelectTrigger id="simulatedUser">
              <SelectValue placeholder="-- Seleccione un perfil para simular --" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_USER_VALUE}>-- Ninguno --</SelectItem>
              {availableUserProfiles.map(user => (
                <SelectItem key={user.id} value={user.name}>
                  {user.name} ({user.role} - Edición: {user.permissionLevel})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
           <p className="text-xs text-muted-foreground">
            El líder del proyecto actual es: <strong>{projectLeader || "No asignado"}</strong>.
          </p>
        </div>

        <div className="space-y-4 pt-4 border-t">
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
                        onCheckedChange={() => handleValidationToggleAttempt(action.id)}
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
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={onPrevious} variant="outline" className="transition-transform hover:scale-105">Anterior</Button>
        <Button onClick={onNext} className="transition-transform hover:scale-105">Siguiente</Button>
      </CardFooter>
    </Card>
  );
};
