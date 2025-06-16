
'use client';
import type { FC } from 'react';
import { useMemo, useState } from 'react';
import type { PlannedAction, Validation, FullUserProfile, Evidence } from '@/types/rca';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
 Accordion,
 AccordionContent,
 AccordionItem,
} from "@/components/ui/accordion";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown, CheckCircle2, Circle, Eye, FileText, ImageIcon, Paperclip, Loader2, Save, MessageSquare, CalendarCheck, History, Info } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { format, parseISO, isValid as isValidDate } from 'date-fns';
import { es } from 'date-fns/locale';
// Assuming useAuth might be needed if we were to get the current logged-in user's profile directly here.
// import { useAuth } from '@/contexts/AuthContext';


interface Step4ValidationProps {
  plannedActions: PlannedAction[];
  validations: Validation[];
  onToggleValidation: (actionId: string) => void;
  projectLeader: string;
  availableUserProfiles: FullUserProfile[]; 
  onPrevious: () => void;
  onNext: () => void;
  onSaveAnalysis: (showToast?: boolean) => Promise<void>;
  isSaving: boolean;
}

const getEvidenceIconLocal = (tipo?: Evidence['tipo']) => {
  if (!tipo) return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />;
  switch (tipo.toLowerCase()) {
    case 'pdf': return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-red-600" />;
    case 'jpg': case 'jpeg': case 'png': case 'gif': return <ImageIcon className="h-4 w-4 mr-2 flex-shrink-0 text-blue-600" />;
    case 'doc': case 'docx': return <Paperclip className="h-4 w-4 mr-2 flex-shrink-0 text-sky-700" />;
    default: return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />;
  }
};

export const Step4Validation: FC<Step4ValidationProps> = ({
  plannedActions,
  validations,
  onToggleValidation,
  projectLeader,
  availableUserProfiles, 
  onPrevious,
  onNext,
  onSaveAnalysis,
  isSaving,
}) => {
  const { toast } = useToast();
  const [isSavingLocally, setIsSavingLocally] = useState(false);
  // const { userProfile } = useAuth(); // To get current authenticated user's profile

  const uniquePlannedActions = useMemo(() => {
    if (!Array.isArray(plannedActions)) {
      console.warn("Step4Validation: plannedActions prop is not an array. Defaulting to empty.", plannedActions);
      return [];
    }

    const seenIds = new Set<string>();
    return plannedActions.filter(action => {
      if (!action || !action.id) { 
        console.warn("Step4Validation: Filtered out a malformed planned action (missing action or action.id)", action);
        return false;
      }
      if (seenIds.has(action.id)) {
        return false;
      }
      seenIds.add(action.id);
      return true;
    });
  }, [plannedActions]);

  const getValidationStatus = (actionId: string) => {
    const validation = validations.find(v => v.actionId === actionId);
    return validation ? validation.status : 'pending';
  };
  
  // Simplified permission check: Assumes the user currently logged in IS the project leader or an Admin.
  // A more robust check would involve getting the actual logged-in user's profile from AuthContext.
  // For now, this relies on the projectLeader prop.
  const canValidateActions = (loggedInUserName: string | null): boolean => {
    if (!loggedInUserName) return false; // If no user name is available, can't validate
    
    const currentUserProfile = availableUserProfiles.find(up => up.name === loggedInUserName);
    if (!currentUserProfile) return false; // If profile not found

    if (currentUserProfile.name === projectLeader) return true;
    if (currentUserProfile.role === 'Admin' && currentUserProfile.permissionLevel === 'Total') return true;
    if (currentUserProfile.role === 'Super User') return true; // Super User can validate

    return false;
  };


  const handleValidationToggleAttempt = async (actionId: string) => {
    // This is where you would ideally get the actual logged-in user's name from useAuth()
    // const actualLoggedInUserName = userProfile?.name; 
    // For now, we'll assume this check happens at a higher level or rely on a simplified logic
    // if (!canValidateActions(actualLoggedInUserName)) {
    // For demonstration, let's assume if the page is accessible, they have some rights
    // But the checkbox disabling logic will be more accurate.
    
    const actionToValidate = uniquePlannedActions.find(pa => pa.id === actionId);
    if (!actionToValidate) return;

    const isReadyForValidationByLeader = 
          (actionToValidate.evidencias && actionToValidate.evidencias.length > 0) || 
          (actionToValidate.userComments && actionToValidate.userComments.trim() !== '') || 
          actionToValidate.markedAsReadyAt;

    if(!isReadyForValidationByLeader && getValidationStatus(actionId) === 'pending') {
        toast({
            title: "Acción no Lista",
            description: "Esta acción aún no ha sido marcada como lista por el responsable (no tiene evidencias, comentarios ni fecha de 'listo'). No se puede validar aún.",
            variant: "destructive",
            duration: 6000,
        });
        return;
    }

    // If the user can click the checkbox (it's not disabled), proceed with toggling.
    // The disabling logic of the checkbox itself is the primary client-side gate.
    onToggleValidation(actionId); 
  };


  const handleSaveProgressLocal = async () => {
    setIsSavingLocally(true);
    await onSaveAnalysis(); 
    setIsSavingLocally(false);
  };

  const handleNextLocal = async () => {
    setIsSavingLocally(true);
    await onSaveAnalysis(false); 
    setIsSavingLocally(false);
    onNext();
  };

  const isStepSaving = isSaving || isSavingLocally;


  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Paso 4: Validación de Acciones</CardTitle>
        <CardDescription>
          El Líder del Proyecto o un Administrador (con Edición Total) valida la efectividad de las acciones implementadas. Expanda cada acción para ver detalles.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2 max-w-sm">
           <p className="text-sm text-muted-foreground">
            El líder del proyecto actual es: <strong>{projectLeader || "No asignado"}</strong>.
            La validación debe ser realizada por el Líder del Proyecto o un Administrador/Super User.
          </p>
        </div>

        <div className="space-y-2 pt-4 border-t">
          {uniquePlannedActions.length === 0 ? (
            <p className="text-muted-foreground">No hay acciones planificadas para validar. Por favor, agréguelas en el Paso 3.</p>
          ) : (
            <Accordion type="multiple" className="w-full">
              {uniquePlannedActions.map((action) => {
                const status = getValidationStatus(action.id);
                
                const hasInformationToVisualize = 
                  (action.evidencias && action.evidencias.length > 0) || 
                  (action.userComments && action.userComments.trim() !== '') || 
                  action.markedAsReadyAt;

                const shouldShowVisualIndicator = hasInformationToVisualize && status !== 'validated';
                
                const isReadyForValidationByLeader = 
                  (action.evidencias && action.evidencias.length > 0) || 
                  (action.userComments && action.userComments.trim() !== '') || 
                  action.markedAsReadyAt;
                
                const showNotReadyWarning = !isReadyForValidationByLeader && status !== 'validated';

                // Simplified client-side disabling. Real auth happens at higher level.
                // Assumes if user can access this page and is a leader/admin, they can validate.
                let computedCheckboxDisabled = isStepSaving;
                if (showNotReadyWarning && status !== 'validated') { 
                  computedCheckboxDisabled = true;
                }
                
                return (
                  <AccordionItem value={action.id} key={action.id} className="border-b">
                    <Card className="shadow-none border-0 rounded-none w-full">
                      <AccordionPrimitive.Header className="flex items-center p-4 w-full">
                        <div className="flex-shrink-0 pr-3" title={shouldShowVisualIndicator ? "Esta acción tiene información adjunta (evidencias/comentarios) y está pendiente de validación." : undefined}>
                          {shouldShowVisualIndicator ? (
                            <Info className="h-5 w-5 text-blue-500" />
                          ) : (
                            <div className="w-5 h-5"></div>
                          )}
                        </div>
                        <AccordionPrimitive.Trigger className="flex flex-1 items-center text-left hover:underline focus:outline-none group data-[state=open]:text-primary">
                          <div className="flex-1">
                            <h4 className="font-semibold">{action.description}</h4>
                            <p className="text-xs text-muted-foreground">Responsable: {action.responsible} | Límite: {action.dueDate || 'N/A'} | ID: {action.id.substring(0,10)}...</p>
                          </div>
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </AccordionPrimitive.Trigger>

                        <div className="flex items-center space-x-3 ml-4 shrink-0 pl-2">
                          <Label htmlFor={`validation-${action.id}`} className={cn(`flex items-center text-sm`, computedCheckboxDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer')}>
                            <Checkbox
                              id={`validation-${action.id}`}
                              checked={status === 'validated'}
                              onCheckedChange={() => handleValidationToggleAttempt(action.id)}
                              className="mr-2"
                              disabled={computedCheckboxDisabled}
                              aria-label={status === 'validated' ? 'Desmarcar como validado' : 'Marcar como validado'}
                            />
                            {status === 'validated' ? (
                              <span className="text-accent font-medium flex items-center"><CheckCircle2 className="mr-1 h-5 w-5" /> Validado</span>
                            ) : (
                              <span className="text-muted-foreground flex items-center"><Circle className="mr-1 h-5 w-5" /> Pendiente</span>
                            )}
                          </Label>
                        </div>
                      </AccordionPrimitive.Header>
                      <AccordionContent className="p-4 pt-0">
                        <div className="space-y-4 text-xs pl-2 border-l-2 border-primary/30 ml-1">
                          {action.markedAsReadyAt && isValidDate(parseISO(action.markedAsReadyAt)) && (
                            <div>
                              <h5 className="font-semibold text-primary/90 mb-0.5 flex items-center"><History className="mr-1.5 h-3.5 w-3.5" />Marcado como Listo el:</h5>
                              <p className="ml-5">{format(parseISO(action.markedAsReadyAt), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                            </div>
                          )}
                           {status === 'validated' && validations.find(v=>v.actionId === action.id)?.validatedAt && (
                                <div>
                                    <h5 className="font-semibold text-green-600 mb-0.5 flex items-center">
                                        <CalendarCheck className="mr-1.5 h-3.5 w-3.5" />
                                        Validado el:
                                    </h5>
                                    <p className="ml-5">{format(parseISO(validations.find(v=>v.actionId === action.id)!.validatedAt!), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                                </div>
                            )}


                          <div>
                            <h5 className="font-semibold text-primary/90 mb-0.5 flex items-center"><MessageSquare className="mr-1.5 h-3.5 w-3.5" />Comentarios del Usuario (Responsable):</h5>
                            {action.userComments && action.userComments.trim() ? (
                              <p className="whitespace-pre-wrap p-1.5 bg-muted/30 rounded-sm ml-5">{action.userComments}</p>
                            ) : (
                              <p className="text-muted-foreground ml-5">No hay comentarios del usuario.</p>
                            )}
                          </div>
                          
                          <div>
                            <h5 className="font-semibold text-primary/90 mb-0.5 flex items-center"><FileText className="mr-1.5 h-3.5 w-3.5" />Evidencias Adjuntas:</h5>
                            {action.evidencias && action.evidencias.length > 0 ? (
                              <ul className="space-y-1 ml-5">
                                {action.evidencias.map(ev => (
                                  <li key={ev.id} className="flex items-center justify-between bg-muted/30 p-1.5 rounded-sm">
                                    <div className="flex items-center">
                                      {getEvidenceIconLocal(ev.tipo)}
                                      <span className="text-xs">{ev.nombre}</span>
                                    </div>
                                    <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => toast({title: "Visualización Simulada", description: `Se visualizaría el archivo: ${ev.nombre}`})}>
                                      <Eye className="mr-1 h-3 w-3"/>Ver
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-muted-foreground ml-5">No hay evidencias adjuntas.</p>
                            )}
                          </div>
                          
                          {showNotReadyWarning && (
                             <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded-md border border-yellow-200 ml-5">
                                Esta acción aún no ha sido marcada como lista por el responsable. No se puede validar.
                             </p>
                          )}

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
      <CardFooter className="flex flex-col sm:flex-row justify-between gap-2 pt-4 border-t">
        <Button onClick={onPrevious} variant="outline" className="w-full sm:w-auto transition-transform hover:scale-105" disabled={isStepSaving}>Anterior</Button>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={handleSaveProgressLocal} variant="secondary" className="w-full sm:w-auto transition-transform hover:scale-105" disabled={isStepSaving}>
              {isStepSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" /> Guardar Avance
          </Button>
          <Button onClick={handleNextLocal} className="w-full sm:w-auto transition-transform hover:scale-105" disabled={isStepSaving}>
              {isStepSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Siguiente
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

