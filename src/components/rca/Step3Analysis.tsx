
'use client';
import type { FC, ChangeEvent } from 'react';
import type { PlannedAction, AnalysisTechnique, IshikawaData, FiveWhysData, RCAEventData, CTMData, IdentifiedRootCause, FullUserProfile } from '@/types/rca';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, Trash2, MessageSquare, ShareTree, Link2, Save, Send } from 'lucide-react'; // Added Save, Send
import { Textarea } from '@/components/ui/textarea';
import { IshikawaDiagramInteractive } from './IshikawaDiagramInteractive';
import { FiveWhysInteractive } from './FiveWhysInteractive';
import { CTMInteractive } from './CTMInteractive';
import { useToast } from "@/hooks/use-toast";

interface Step3AnalysisProps {
  eventData: RCAEventData;
  analysisTechnique: AnalysisTechnique;
  onAnalysisTechniqueChange: (value: AnalysisTechnique) => void;
  analysisTechniqueNotes: string;
  onAnalysisTechniqueNotesChange: (value: string) => void;
  ishikawaData: IshikawaData;
  onSetIshikawaData: (data: IshikawaData) => void;
  fiveWhysData: FiveWhysData;
  onAddFiveWhyEntry: () => void;
  onUpdateFiveWhyEntry: (id: string, field: 'why' | 'because', value: string) => void;
  onRemoveFiveWhyEntry: (id: string) => void;
  ctmData: CTMData;
  onSetCtmData: (data: CTMData) => void;
  identifiedRootCauses: IdentifiedRootCause[];
  onAddIdentifiedRootCause: () => void;
  onUpdateIdentifiedRootCause: (id: string, description: string) => void;
  onRemoveIdentifiedRootCause: (id: string) => void;
  plannedActions: PlannedAction[];
  onAddPlannedAction: () => void;
  onUpdatePlannedAction: (index: number, field: keyof Omit<PlannedAction, 'eventId' | 'id'>, value: string | string[]) => void;
  onRemovePlannedAction: (index: number) => void;
  availableUsers: FullUserProfile[];
  onPrevious: () => void;
  onNext: () => void;
}

export const Step3Analysis: FC<Step3AnalysisProps> = ({
  eventData,
  analysisTechnique,
  onAnalysisTechniqueChange,
  analysisTechniqueNotes,
  onAnalysisTechniqueNotesChange,
  ishikawaData,
  onSetIshikawaData,
  fiveWhysData,
  onAddFiveWhyEntry,
  onUpdateFiveWhyEntry,
  onRemoveFiveWhyEntry,
  ctmData,
  onSetCtmData,
  identifiedRootCauses,
  onAddIdentifiedRootCause,
  onUpdateIdentifiedRootCause,
  onRemoveIdentifiedRootCause,
  plannedActions,
  onAddPlannedAction,
  onUpdatePlannedAction,
  onRemovePlannedAction,
  availableUsers,
  onPrevious,
  onNext,
}) => {
  const { toast } = useToast();

  const handleActionChange = (index: number, field: keyof Omit<PlannedAction, 'eventId' | 'id'>, value: string) => {
    onUpdatePlannedAction(index, field, value);
  };

  const handleActionResponsibleChange = (index: number, value: string) => {
    onUpdatePlannedAction(index, 'responsible', value);
  };

  const handleToggleRootCauseForAction = (actionIndex: number, rootCauseId: string, checked: boolean) => {
    const action = plannedActions[actionIndex];
    const currentRelatedIds = action.relatedRootCauseIds || [];
    let newRelatedIds: string[];

    if (checked) {
      newRelatedIds = [...currentRelatedIds, rootCauseId];
    } else {
      newRelatedIds = currentRelatedIds.filter(id => id !== rootCauseId);
    }
    onUpdatePlannedAction(actionIndex, 'relatedRootCauseIds', newRelatedIds);
  };

  const getPlaceholderForNotes = () => {
    if (analysisTechnique === '') {
       return "Escriba aquí sus notas detalladas sobre la aplicación de la técnica seleccionada o notas generales si no ha elegido una técnica específica...";
    }
    return `Notas para ${analysisTechnique}`;
  };

  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const minDateForPlannedActions = getTodayDateString();

  const validateStepContinue = (): boolean => {
    if (identifiedRootCauses.length === 0) {
      toast({
        title: "Campo Obligatorio Faltante",
        description: "Debe añadir al menos una Causa Raíz Identificada.",
        variant: "destructive",
      });
      return false;
    }
    for (const rc of identifiedRootCauses) {
      if (!rc.description.trim()) {
        toast({
          title: "Campo Obligatorio Faltante",
          description: `La Causa Raíz ID: ${rc.id.substring(0,7)}... debe tener una descripción.`,
          variant: "destructive",
        });
        return false;
      }
    }

    if (plannedActions.length > 0) {
      for (let i = 0; i < plannedActions.length; i++) {
        const action = plannedActions[i];
        const actionLabel = action.description.trim() ? `"${action.description.substring(0,30)}..."` : `Nº ${i + 1}`;
        
        if (!action.description.trim()) {
          toast({
            title: "Campo Obligatorio Faltante",
            description: `La Acción Planificada ${actionLabel} requiere una descripción.`,
            variant: "destructive",
          });
          return false;
        }
        if (!action.relatedRootCauseIds || action.relatedRootCauseIds.length === 0) {
          toast({
            title: "Campo Obligatorio Faltante",
            description: `La Acción Planificada ${actionLabel} debe abordar al menos una Causa Raíz.`,
            variant: "destructive",
          });
          return false;
        }
        if (!action.responsible) {
          toast({
            title: "Campo Obligatorio Faltante",
            description: `La Acción Planificada ${actionLabel} requiere un responsable.`,
            variant: "destructive",
          });
          return false;
        }
        if (!action.dueDate) {
          toast({
            title: "Campo Obligatorio Faltante",
            description: `La Acción Planificada ${actionLabel} requiere una fecha límite.`,
            variant: "destructive",
          });
          return false;
        }
      }
    }
    return true;
  }

  const handleSaveProgress = () => {
    // Basic validation: at least one root cause if others are empty
    if (identifiedRootCauses.length === 0 && plannedActions.length === 0 && analysisTechniqueNotes.trim() === '') {
        toast({
            title: "Nada que guardar",
            description: "No hay información significativa para guardar en este paso.",
            variant: "default"
        });
        return;
    }
    // Check if root causes have descriptions if they exist
    for (const rc of identifiedRootCauses) {
      if (!rc.description.trim()) {
        toast({
          title: "Guardado Parcial (Advertencia)",
          description: `La Causa Raíz ID: ${rc.id.substring(0,7)}... no tiene descripción. Se guardó el resto.`,
          variant: "default",
        });
        // Continue saving other data
      }
    }
    toast({
      title: "Progreso Guardado",
      description: "El estado actual del análisis ha sido guardado (simulación).",
    });
  };

  const handleSendTasks = () => {
    if (plannedActions.length === 0) {
      toast({
        title: "Sin Tareas para Enviar",
        description: "No hay acciones planificadas definidas.",
        variant: "default"
      });
      return;
    }

    let tasksSentCount = 0;
    plannedActions.forEach(action => {
      if (action.responsible && action.description.trim() && action.dueDate) {
        const responsibleUser = availableUsers.find(user => user.name === action.responsible);
        if (responsibleUser && responsibleUser.email) {
          toast({
            title: "Simulación de Envío de Correo (Tarea)",
            description: `Tarea enviada a ${responsibleUser.name} (${responsibleUser.email}): "${action.description.substring(0, 50)}${action.description.length > 50 ? "..." : ""}".`,
            duration: 4000,
          });
          tasksSentCount++;
        } else {
           toast({
            title: "Error al Enviar Tarea",
            description: `No se pudo encontrar el correo para el responsable de la tarea: "${action.description.substring(0, 50)}...".`,
            variant: "destructive",
            duration: 4000,
          });
        }
      } else if (action.responsible) { // Has responsible but other fields missing
         toast({
            title: "Tarea Incompleta",
            description: `La tarea para ${action.responsible} no se puede enviar porque falta descripción o fecha límite.`,
            variant: "destructive",
            duration: 4000,
          });
      }
    });

    if (tasksSentCount === 0 && plannedActions.some(pa => !pa.responsible)) {
         toast({
            title: "Tareas No Enviadas",
            description: "Algunas tareas no pudieron ser enviadas porque no tienen un responsable asignado, o les falta descripción/fecha.",
            variant: "default"
        });
    } else if (tasksSentCount > 0) {
         toast({
            title: "Envío de Tareas Procesado",
            description: `${tasksSentCount} tarea(s) fueron "enviadas".`,
        });
    }
  };

  const handleContinue = () => {
    if (!validateStepContinue()) {
      return;
    }
    if (plannedActions.length === 0 && identifiedRootCauses.length > 0 && identifiedRootCauses.every(rc => rc.description.trim())) {
        toast({
            title: "Advertencia: Sin Plan de Acción",
            description: "Ha identificado causas raíz pero no ha definido un plan de acción. ¿Desea continuar?",
            action: (
                <Button onClick={onNext} size="sm">Sí, continuar</Button>
            ),
            duration: 8000,
        });
        return; 
    }
    onNext();
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Paso 3: Análisis y Plan de Acción</CardTitle>
        <CardDescription>Seleccione la técnica de análisis, defina la causa raíz y el plan de acción.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="analysisTechnique">Técnica de Análisis Principal</Label>
          <Select value={analysisTechnique} onValueChange={(value: AnalysisTechnique) => onAnalysisTechniqueChange(value)}>
            <SelectTrigger id="analysisTechnique">
              <SelectValue placeholder="-- Seleccione una técnica --" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WhyWhy">5 Porqués</SelectItem>
              <SelectItem value="Ishikawa">Ishikawa (Diagrama de Causa-Efecto)</SelectItem>
              <SelectItem value="CTM">Árbol de Causas (CTM)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {analysisTechnique === 'Ishikawa' && (
          <IshikawaDiagramInteractive
            focusEventDescription={eventData.focusEventDescription || "Evento Foco (no definido en Paso 1)"}
            ishikawaData={ishikawaData}
            onSetIshikawaData={onSetIshikawaData}
          />
        )}

        {analysisTechnique === 'WhyWhy' && (
          <FiveWhysInteractive
            focusEventDescription={eventData.focusEventDescription || "Evento Foco (no definido en Paso 1)"}
            fiveWhysData={fiveWhysData}
            onAddFiveWhyEntry={onAddFiveWhyEntry}
            onUpdateFiveWhyEntry={onUpdateFiveWhyEntry}
            onRemoveFiveWhyEntry={onRemoveFiveWhyEntry}
          />
        )}

        {analysisTechnique === 'CTM' && (
           <CTMInteractive
            focusEventDescription={eventData.focusEventDescription || "Evento Foco (no definido en Paso 1)"}
            ctmData={ctmData}
            onSetCtmData={onSetCtmData}
          />
        )}
        
        {(analysisTechnique === '' || analysisTechniqueNotes.trim() !== '') && (
          <div className="space-y-2 mt-4">
            <Label htmlFor="analysisTechniqueNotes">
              Notas Adicionales del Análisis ({analysisTechnique || 'General'}):
            </Label>
            <Textarea
              id="analysisTechniqueNotes"
              value={analysisTechniqueNotes}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onAnalysisTechniqueNotesChange(e.target.value)}
              placeholder={getPlaceholderForNotes()}
              rows={analysisTechnique === '' ? 10 : 4}
            />
          </div>
        )}
        
        <div className="space-y-4">
          <h3 className="text-lg font-semibold font-headline flex items-center">
            <MessageSquare className="mr-2 h-5 w-5 text-primary" />
            Causas Raíz Identificadas <span className="text-destructive text-xs ml-1">(Al menos una, con descripción) *</span>
          </h3>
          {identifiedRootCauses.map((rc, index) => (
            <Card key={rc.id} className="p-4 space-y-3 bg-secondary/40">
              <div className="flex justify-between items-center">
                <Label htmlFor={`rc-desc-${rc.id}`} className="font-medium text-sm text-primary">
                  Causa Raíz #{index + 1} <span className="text-destructive">*</span>
                </Label>
                <Button variant="ghost" size="icon" onClick={() => onRemoveIdentifiedRootCause(rc.id)} aria-label="Eliminar causa raíz">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <Textarea
                id={`rc-desc-${rc.id}`}
                value={rc.description}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onUpdateIdentifiedRootCause(rc.id, e.target.value)}
                placeholder={`Describa la causa raíz #${index + 1}...`}
                rows={3}
              />
            </Card>
          ))}
          <Button onClick={onAddIdentifiedRootCause} variant="outline" className="w-full">
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Causa Raíz
          </Button>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold font-headline">Plan de Acción Correctiva</h3>
          {plannedActions.map((action, index) => (
            <Card key={action.id} className="p-4 space-y-3 bg-secondary/50">
               <div className="flex justify-between items-center">
                <p className="font-medium text-sm text-primary">Acción Planificada #{index + 1} (ID: {action.id})</p>
                 <Button variant="ghost" size="icon" onClick={() => onRemovePlannedAction(index)} aria-label="Eliminar acción planificada">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`pa-desc-${index}`}>Descripción de la Acción <span className="text-destructive">*</span></Label>
                <Input id={`pa-desc-${index}`} value={action.description} onChange={(e) => handleActionChange(index, 'description', e.target.value)} placeholder="Detalle de la acción correctiva" />
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center"><Link2 className="mr-2 h-4 w-4" />Causas Raíz Abordadas <span className="text-destructive">*</span></Label>
                <div className="space-y-1.5 max-h-32 overflow-y-auto p-2 border rounded-md bg-background/50">
                  {identifiedRootCauses.length > 0 ? (
                    identifiedRootCauses.filter(rc => rc.description.trim() !== '').map(rc => (
                      <div key={rc.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`pa-${action.id}-rc-${rc.id}`}
                          checked={action.relatedRootCauseIds?.includes(rc.id)}
                          onCheckedChange={(checked) => {
                            handleToggleRootCauseForAction(index, rc.id, checked as boolean);
                          }}
                        />
                        <Label htmlFor={`pa-${action.id}-rc-${rc.id}`} className="text-xs font-normal cursor-pointer flex-grow">
                          {rc.description.substring(0, 60) || `Causa Raíz (ID: ${rc.id.substring(0,5)}... )`}
                          {rc.description.length > 60 ? "..." : ""}
                        </Label>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No hay causas raíz identificadas (con descripción) para vincular.</p>
                  )}
                   {identifiedRootCauses.length > 0 && identifiedRootCauses.every(rc => rc.description.trim() === '') && (
                    <p className="text-xs text-muted-foreground">Añada descripciones a las causas raíz para poder vincularlas.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`pa-resp-${index}`}>Responsable <span className="text-destructive">*</span></Label>
                  <Select value={action.responsible} onValueChange={(value) => handleActionResponsibleChange(index, value)}>
                    <SelectTrigger id={`pa-resp-${index}`}>
                      <SelectValue placeholder="-- Seleccione un responsable --" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map(user => (
                        <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                   <p className="text-xs text-muted-foreground">
                    Nota: Lista de usuarios de ejemplo.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`pa-date-${index}`}>Fecha Límite <span className="text-destructive">*</span></Label>
                  <Input
                    id={`pa-date-${index}`}
                    type="date"
                    value={action.dueDate}
                    onChange={(e) => handleActionChange(index, 'dueDate', e.target.value)}
                    min={minDateForPlannedActions}
                  />
                </div>
              </div>
            </Card>
          ))}
          <Button onClick={onAddPlannedAction} variant="outline">
            <PlusCircle className="mr-2 h-4 w-4" /> Agregar Acción al Plan
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between gap-2 pt-4 border-t">
        <Button onClick={onPrevious} variant="outline" className="w-full sm:w-auto transition-transform hover:scale-105">Anterior</Button>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={handleSaveProgress} variant="secondary" className="w-full sm:w-auto transition-transform hover:scale-105">
                <Save className="mr-2 h-4 w-4" /> Guardar Avance
            </Button>
            <Button onClick={handleSendTasks} variant="secondary" className="w-full sm:w-auto transition-transform hover:scale-105">
                <Send className="mr-2 h-4 w-4" /> Enviar Tareas
            </Button>
            <Button onClick={handleContinue} className="w-full sm:w-auto transition-transform hover:scale-105">Continuar</Button>
        </div>
      </CardFooter>
    </Card>
  );
};

    