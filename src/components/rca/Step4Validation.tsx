
'use client';
import type { FC } from 'react';
import { useMemo } from 'react';
import type { PlannedAction, Validation, FullUserProfile, Evidence } from '@/types/rca'; // Added Evidence
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"; // Added Accordion
import { CheckCircle2, Circle, UserCog, Eye, FileText, ImageIcon, Paperclip } from 'lucide-react'; // Added Eye and file icons
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils'; // Added cn

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

const NONE_USER_VALUE = "--NONE--";

// Helper function to get icon based on evidence type (replicated for simplicity)
const getEvidenceIcon = (tipo?: Evidence['tipo']) => {
  if (!tipo) return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />;
  switch (tipo) {
    case 'pdf': return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-red-600" />;
    case 'jpg': return <ImageIcon className="h-4 w-4 mr-2 flex-shrink-0 text-blue-600" />;
    case 'docx': return <Paperclip className="h-4 w-4 mr-2 flex-shrink-0 text-sky-700" />;
    default: return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />;
  }
};

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

  const canSimulatedUserValidateActions = useMemo(() => {
    if (!currentSimulatedUser) {
      return false;
    }
    const userProfile = availableUserProfiles.find(u => u.name === currentSimulatedUser);
    if (!userProfile) {
      return false;
    }
    const isLeader = userProfile.name === projectLeader;
    const isAdminWithTotalEdit = userProfile.role === 'Admin' && userProfile.permissionLevel === 'Total';
    return isLeader || isAdminWithTotalEdit;
  }, [currentSimulatedUser, availableUserProfiles, projectLeader]);

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
    let hasPermission = false;
    if (userProfile) {
        const isLeader = userProfile.name === projectLeader;
        const isAdminWithTotalEdit = userProfile.role === 'Admin' && userProfile.permissionLevel === 'Total';
        hasPermission = isLeader || isAdminWithTotalEdit;
    }

    if (hasPermission) {
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
          Seleccione un perfil para simular la validación. Solo el Líder del Proyecto o un Administrador con Edición Total pueden validar. Expanda cada acción para ver detalles.
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

        <div className="space-y-2 pt-4 border-t">
          {plannedActions.length === 0 ? (
            <p className="text-muted-foreground">No hay acciones planificadas para validar. Por favor, agréguelas en el Paso 3.</p>
          ) : (
            <Accordion type="multiple" className="w-full">
              {plannedActions.map((action) => {
                const status = getValidationStatus(action.id);
                return (
                  <AccordionItem value={action.id} key={action.id} className="border-b">
                    <Card className="shadow-none border-0 rounded-none">
                      <AccordionTrigger className="p-4 hover:no-underline w-full">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex-1 text-left">
                            <h4 className="font-semibold text-primary">{action.description}</h4>
                            <p className="text-xs text-muted-foreground">Responsable: {action.responsible} | Límite: {action.dueDate || 'N/A'} | ID: {action.id.substring(0,10)}...</p>
                          </div>
                          <div className="flex items-center space-x-3 ml-4 shrink-0">
                            <Label htmlFor={`validation-${action.id}`} className={cn(`flex items-center text-sm`,!canSimulatedUserValidateActions ? 'cursor-not-allowed opacity-70' : 'cursor-pointer')}
                              onClick={(e) => e.stopPropagation()} // Prevent accordion toggle when clicking label
                            >
                              <Checkbox
                                id={`validation-${action.id}`}
                                checked={status === 'validated'}
                                onCheckedChange={() => handleValidationToggleAttempt(action.id)}
                                className="mr-2"
                                disabled={!canSimulatedUserValidateActions}
                                onClick={(e) => e.stopPropagation()} // Prevent accordion toggle
                              />
                              {status === 'validated' ? (
                                <span className="text-accent font-medium flex items-center"><CheckCircle2 className="mr-1 h-5 w-5" /> Validado</span>
                              ) : (
                                <span className="text-muted-foreground flex items-center"><Circle className="mr-1 h-5 w-5" /> Pendiente</span>
                              )}
                            </Label>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-4 pt-0">
                        <div className="space-y-3 text-xs pl-2 border-l-2 border-primary/30 ml-1">
                          <div>
                            <h5 className="font-semibold text-primary/90 mb-1">Evidencias Adjuntas:</h5>
                            {action.evidencias && action.evidencias.length > 0 ? (
                              <ul className="space-y-1">
                                {action.evidencias.map(ev => (
                                  <li key={ev.id} className="flex items-center justify-between bg-muted/30 p-1.5 rounded-sm">
                                    <div className="flex items-center">
                                      {getEvidenceIcon(ev.tipo)}
                                      <span>{ev.nombre}</span>
                                    </div>
                                    <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => toast({title: "Simulación", description: `Visualizar/Descargar archivo ${ev.nombre}`})}>
                                      <Eye className="mr-1 h-3 w-3"/>Ver/Descargar
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-muted-foreground">No hay evidencias adjuntas para esta acción.</p>
                            )}
                          </div>
                          <div>
                            <h5 className="font-semibold text-primary/90 mb-1">Comentarios del Usuario (Responsable):</h5>
                            {action.userComments && action.userComments.trim() ? (
                              <p className="whitespace-pre-wrap p-1.5 bg-muted/30 rounded-sm">{action.userComments}</p>
                            ) : (
                              <p className="text-muted-foreground">No hay comentarios del usuario para esta acción.</p>
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </Card>
                  </AccordionItem>
                );
              })}
            </Accordion>
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
