
'use client';
import type { FC, ChangeEvent } from 'react';
import { useState, useMemo, useCallback, useEffect } from 'react'; 
import type { PlannedAction, AnalysisTechnique, IshikawaData, FiveWhysData, RCAEventData, CTMData, IdentifiedRootCause, FullUserProfile } from '@/types/rca';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, Trash2, MessageSquare, ShareTree, Link2, Save, Send, Loader2, Mail, Sparkles, ClipboardCopy, ChevronLeft, ChevronRight } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { IshikawaDiagramInteractive } from './IshikawaDiagramInteractive';
import { FiveWhysInteractive } from './FiveWhysInteractive';
import { CTMInteractive } from './CTMInteractive';
import { useToast } from "@/hooks/use-toast";
import { sendEmailAction } from '@/app/actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { suggestRootCauses, type SuggestRootCausesInput } from '@/ai/flows/suggest-root-causes'; 

// --- NotifyTasksDialog Component ---
interface NotifyTasksDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  actionsToNotify: PlannedAction[];
  availableUsers: FullUserProfile[];
  eventId: string;
  eventFocusDescription: string;
  identifiedRootCauses: IdentifiedRootCause[];
  onConfirmSend: (selectedActionIds: string[]) => Promise<{ sent: number; failed: number; incomplete: number }>;
}

const NotifyTasksDialog: FC<NotifyTasksDialogProps> = ({
  isOpen,
  onOpenChange,
  actionsToNotify,
  availableUsers,
  eventId,
  eventFocusDescription,
  identifiedRootCauses,
  onConfirmSend,
}) => {
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    setSelectedActionIds([]);
  }, [isOpen, actionsToNotify]);

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedActionIds(actionsToNotify.map(a => a.id));
    } else {
      setSelectedActionIds([]);
    }
  };

  const handleActionSelectionChange = (actionId: string, checked: boolean) => {
    setSelectedActionIds(prev =>
      checked ? [...prev, actionId] : prev.filter(id => id !== actionId)
    );
  };

  const allSelected = actionsToNotify.length > 0 && selectedActionIds.length === actionsToNotify.length;

  const handleSend = async () => {
    setIsSending(true);
    await onConfirmSend(selectedActionIds);
    setIsSending(false);
    onOpenChange(false); 
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center"><Mail className="mr-2 h-5 w-5" />Notificar Tareas Planificadas</DialogTitle>
          <DialogDescription>
            Seleccione las tareas para las cuales desea enviar una notificación por correo electrónico al responsable asignado.
            Solo se muestran tareas con responsable, descripción, fecha límite y que no hayan sido notificadas previamente.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-3">
          {actionsToNotify.length > 0 ? (
            <>
              <div className="flex items-center space-x-2 border-b pb-2 mb-2">
                <Checkbox
                  id="select-all-tasks-notify"
                  checked={allSelected}
                  onCheckedChange={handleToggleSelectAll}
                />
                <Label htmlFor="select-all-tasks-notify" className="text-sm font-medium">
                  {allSelected ? 'Deseleccionar Todo' : 'Seleccionar Todo'} ({selectedActionIds.length}/{actionsToNotify.length})
                </Label>
              </div>
              <ScrollArea className="h-[300px] pr-3">
                <div className="space-y-2">
                  {actionsToNotify.map(action => (
                    <Card key={action.id} className="p-3 bg-muted/30 text-xs">
                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id={`task-notify-${action.id}`}
                          checked={selectedActionIds.includes(action.id)}
                          onCheckedChange={(checked) => handleActionSelectionChange(action.id, checked as boolean)}
                          className="mt-0.5"
                        />
                        <div className="flex-grow">
                          <Label htmlFor={`task-notify-${action.id}`} className="font-semibold block cursor-pointer">
                            {action.description || "Sin descripción"}
                          </Label>
                          <p>ID Acción: {action.id.substring(0, 8)}...</p>
                          <p>Responsable: {action.responsible || "N/A"}</p>
                          <p>Fecha Límite: {action.dueDate || "N/A"}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay acciones planificadas que cumplan los criterios para notificación en este momento.
            </p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSending}>Cancelar</Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleSend}
            disabled={isSending || selectedActionIds.length === 0}
          >
            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar {selectedActionIds.length > 0 ? `(${selectedActionIds.length})` : ''} Notificaciones
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


// --- Step3Analysis Component ---
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
  onUpdatePlannedAction: (index: number, field: keyof Omit<PlannedAction, 'eventId' | 'id'>, value: string | string[] | boolean) => void;
  onRemovePlannedAction: (index: number) => void;
  availableUsers: FullUserProfile[];
  onPrevious: () => void;
  onNext: () => void;
  onSaveAnalysis: (showToast?: boolean) => Promise<void>;
  isSaving: boolean;
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
  onSaveAnalysis,
  isSaving,
}) => {
  const { toast } = useToast();
  const [isNotifyTasksDialogOpen, setIsNotifyTasksDialogOpen] = useState(false);
  const [actionsForNotificationDialog, setActionsForNotificationDialog] = useState<PlannedAction[]>([]);
  const [isSuggestingCauses, setIsSuggestingCauses] = useState(false);
  const [aiSuggestedRootCausesList, setAiSuggestedRootCausesList] = useState<string[]>([]);
  const [currentAiSuggestionIndex, setCurrentAiSuggestionIndex] = useState(0);

  useEffect(() => {
    if (identifiedRootCauses.length === 0) {
      onAddIdentifiedRootCause();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 


  const uniquePlannedActions = useMemo(() => {
    const seenIds = new Set<string>();
    return plannedActions.filter(action => {
      if (seenIds.has(action.id)) {
        return false;
      }
      seenIds.add(action.id);
      return true;
    });
  }, [plannedActions]);

  const handleActionChange = (index: number, field: keyof Omit<PlannedAction, 'eventId' | 'id'>, value: string) => {
    const originalAction = uniquePlannedActions[index];
    if (!originalAction) return;
    const originalIndex = plannedActions.findIndex(pa => pa.id === originalAction.id);
    if (originalIndex === -1) return;
    onUpdatePlannedAction(originalIndex, field, value);
  };

  const handleActionResponsibleChange = (index: number, value: string) => {
    const originalAction = uniquePlannedActions[index];
    if (!originalAction) return;
    const originalIndex = plannedActions.findIndex(pa => pa.id === originalAction.id);
    if (originalIndex === -1) return;
    onUpdatePlannedAction(originalIndex, 'responsible', value);
  };

  const handleToggleRootCauseForAction = (actionOriginalIndex: number, rootCauseId: string, checked: boolean) => {
    const action = plannedActions[actionOriginalIndex]; 
    if (!action) return;

    const currentRelatedIds = action.relatedRootCauseIds || [];
    let newRelatedIds: string[];

    if (checked) {
      newRelatedIds = [...currentRelatedIds, rootCauseId];
    } else {
      newRelatedIds = currentRelatedIds.filter(id => id !== rootCauseId);
    }
    onUpdatePlannedAction(actionOriginalIndex, 'relatedRootCauseIds', newRelatedIds);
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

  const validateFieldsForNext = (): boolean => {
    const describedRootCauses = identifiedRootCauses.filter(rc => rc.description && rc.description.trim() !== '');

    if (describedRootCauses.length === 0) {
      toast({
        title: "Campo Obligatorio Faltante",
        description: "Debe definir y describir al menos la Causa Raíz Principal #1.",
        variant: "destructive",
      });
      return false;
    }
    
    if (uniquePlannedActions.length > 0) {
      for (let i = 0; i < uniquePlannedActions.length; i++) {
        const action = uniquePlannedActions[i];
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
    
    if (describedRootCauses.length > 0) {
        const allAddressedRootCauseIds = new Set<string>();
        uniquePlannedActions.forEach(action => {
            action.relatedRootCauseIds?.forEach(rcId => allAddressedRootCauseIds.add(rcId));
        });

        for (let i = 0; i < describedRootCauses.length; i++) {
            const rc = describedRootCauses[i];
            if (!allAddressedRootCauseIds.has(rc.id)) {
                toast({
                    title: "Causa Raíz Sin Gestionar",
                    description: `Pendiente gestionar Causa Raíz #${i + 1}: "${rc.description.substring(0, 40)}${rc.description.length > 40 ? "..." : ""}". Debe ser abordada por un plan de acción.`,
                    variant: "destructive",
                    duration: 7000,
                });
                return false;
            }
        }
    } else if (describedRootCauses.length > 0 && uniquePlannedActions.length === 0) {
        toast({
            title: "Planes de Acción Requeridos",
            description: "Existen causas raíz definidas. Debe crear al menos un plan de acción para abordarlas antes de continuar.",
            variant: "destructive",
            duration: 7000,
        });
        return false;
    }

    return true;
  }

 const initialFiveWhysWhyText = (focusEventDesc: string): string => {
    if (focusEventDesc) {
      return `¿Por qué ocurrió: "${focusEventDesc.substring(0,70)}${focusEventDesc.length > 70 ? "..." : ""}"?`;
    }
    return '';
  };

  const handleSaveProgressLocal = async () => {
    const isTechniqueSelected = analysisTechnique !== '';
    const hasNotes = analysisTechniqueNotes.trim() !== '';
    
    const hasAnyRootCause = identifiedRootCauses.length > 0 && identifiedRootCauses.some(rc => rc.description.trim() !== '');
    const hasPlannedActions = uniquePlannedActions.length > 0;

    const isIshikawaEdited = ishikawaData.some(cat => cat.causes.some(c => c.description.trim() !== ''));
    const isFiveWhysEdited = fiveWhysData.length > 1 || 
                             (fiveWhysData.length === 1 && (fiveWhysData[0].because.trim() !== '' || (eventData.focusEventDescription && fiveWhysData[0].why.trim() !== initialFiveWhysWhyText(eventData.focusEventDescription).trim() )));
    const isCtmEdited = ctmData.length > 0 && ctmData.some(fm => 
        fm.description.trim() !== '' || 
        fm.hypotheses.some(h => h.description.trim() !== '' || 
            h.physicalCauses.some(pc => pc.description.trim() !== '' ||
                pc.humanCauses.some(hc => hc.description.trim() !== '' || 
                    hc.latentCauses.some(lc => lc.description.trim() !== '')
                )
            )
        )
    );

    if (
      !isTechniqueSelected &&
      !hasNotes &&
      !hasAnyRootCause && 
      !hasPlannedActions &&
      !isIshikawaEdited &&
      !isFiveWhysEdited &&
      !isCtmEdited
    ) {
      toast({
        title: "Nada que guardar",
        description: "No se ha ingresado información nueva o modificado datos existentes en este paso.",
        variant: "default",
      });
      return;
    }
    await onSaveAnalysis(); 
  };

  const handleOpenSendTasksDialog = async () => {
    await onSaveAnalysis(false); 

    const actionsToNotify = uniquePlannedActions.filter(
      action =>
        action && 
        action.responsible &&
        typeof action.description === 'string' && action.description.trim() && 
        action.dueDate &&
        !action.isNotificationSent
    );

    if (actionsToNotify.length === 0) {
      toast({
        title: "Sin Tareas para Notificar",
        description: "Todas las tareas elegibles ya han sido notificadas o no cumplen los criterios (responsable, descripción, fecha límite).",
        variant: "default"
      });
      return;
    }
    setActionsForNotificationDialog(actionsToNotify);
    setIsNotifyTasksDialogOpen(true);
  };
  
  const handleConfirmSendNotificationsInDialog = async (selectedActionIds: string[]) => {
    let tasksSentCount = 0;
    let tasksFailedCount = 0;
    let tasksIncompleteCount = 0; 

    for (const actionId of selectedActionIds) {
      const actionIndex = plannedActions.findIndex(a => a.id === actionId); 
      if (actionIndex === -1) {
          console.warn(`Action with ID ${actionId} not found in plannedActions.`);
          tasksFailedCount++; 
          continue;
      }
      
      const action = plannedActions[actionIndex];

      if (!action || !(typeof action.description === 'string' && action.description.trim()) || !action.responsible || !action.dueDate) {
          console.warn(`Action ${actionId} is missing required fields for notification.`);
          tasksIncompleteCount++;
          continue;
      }
      
      const responsibleUser = availableUsers.find(user => user.name === action.responsible);
      if (!responsibleUser || !responsibleUser.email) {
          console.warn(`Responsible user or email not found for action ${actionId}, responsible: ${action.responsible}`);
          tasksFailedCount++;
          continue;
      }

      const emailSubject = `Tarea Asignada (RCA ${eventData.id || 'Evento Actual'}): ${action.description.substring(0,30)}...`;
      
      const relatedCausesDescriptions = action.relatedRootCauseIds?.map(rcId => {
        const cause = identifiedRootCauses.find(c => c.id === rcId);
        return cause ? cause.description : `ID: ${rcId} (no encontrada)`;
      }).join('\n  - ') || 'N/A';

      const emailBody = `Estimado/a ${responsibleUser.name},\n\nSe le ha asignado la siguiente tarea como parte del análisis de causa raíz para el evento "${eventData.focusEventDescription || 'No especificado'}":\n\nTarea: ${action.description}\nFecha Límite: ${action.dueDate}\nCausas Raíz Relacionadas:\n  - ${relatedCausesDescriptions}\n\nPor favor, acceda al sistema RCA Assistant para más detalles y para actualizar el estado de esta tarea.\n\nSaludos,\nSistema RCA Assistant`;
      
      const result = await sendEmailAction({
        to: responsibleUser.email,
        subject: emailSubject,
        body: emailBody,
      });

      if(result.success) {
        tasksSentCount++;
        onUpdatePlannedAction(actionIndex, 'isNotificationSent', true);
      } else {
        tasksFailedCount++;
      }
    }
    
    if (tasksSentCount > 0) {
        await onSaveAnalysis(false); 
    }

    toast({
        title: "Envío de Tareas Procesado",
        description: `${tasksSentCount} enviada(s). ${tasksFailedCount > 0 ? `${tasksFailedCount} fallaron.` : ''} ${tasksIncompleteCount > 0 ? `${tasksIncompleteCount} incompletas.` : ''}`,
        variant: tasksFailedCount > 0 || tasksIncompleteCount > 0 ? "destructive" : "default",
    });
    return { sent: tasksSentCount, failed: tasksFailedCount, incomplete: tasksIncompleteCount };
  };

  const handleContinueLocal = async () => {
    if (!validateFieldsForNext()) {
      return;
    }
    await onSaveAnalysis(false); 

    if (uniquePlannedActions.length === 0 && identifiedRootCauses.length > 0 && identifiedRootCauses.some(rc => rc.description.trim())) {
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

  const handleSuggestRootCausesClick = async () => {
    setIsSuggestingCauses(true);
    setAiSuggestedRootCausesList([]); 
    try {
      const input: SuggestRootCausesInput = {
        focusEventDescription: eventData.focusEventDescription || "No especificado",
        analysisTechnique: analysisTechnique,
        analysisTechniqueNotes: analysisTechniqueNotes || undefined,
        ishikawaData: analysisTechnique === 'Ishikawa' ? ishikawaData : undefined,
        fiveWhysData: analysisTechnique === 'WhyWhy' ? fiveWhysData : undefined,
        ctmData: analysisTechnique === 'CTM' ? ctmData : undefined,
      };
      const result = await suggestRootCauses(input);
      if (result && result.suggestedRootCauses && result.suggestedRootCauses.length > 0) {
        const validSuggestions = result.suggestedRootCauses.filter(s => !s.startsWith("[Sugerencia IA no disponible") && s.trim() !== "");
        
        if (validSuggestions.length > 0) {
          setAiSuggestedRootCausesList(validSuggestions);
          setCurrentAiSuggestionIndex(0);
          toast({ 
            title: `IA Sugirió ${validSuggestions.length} Posible(s) Causa(s) Raíz Latente(s)`,
            description: "Revise las sugerencias en el nuevo cuadro a continuación.",
          });
        } else if (result.suggestedRootCauses.length === 1 && result.suggestedRootCauses[0].startsWith("[")) {
          toast({ title: "Sugerencias IA", description: result.suggestedRootCauses[0], variant: result.suggestedRootCauses[0].includes("Error") || result.suggestedRootCauses[0].includes("no disponible") ? "destructive" : "default" });
        } else {
          toast({ title: "Sugerencias IA", description: "La IA no generó nuevas sugerencias válidas.", variant: "default" });
        }
      } else {
        toast({ title: "Sugerencias IA", description: "La IA no generó nuevas sugerencias o hubo un error.", variant: "default" });
      }
    } catch (error) {
      console.error("Error al sugerir causas raíz con IA:", error);
      toast({ title: "Error con IA", description: "No se pudieron obtener sugerencias de la IA.", variant: "destructive" });
    }
    setIsSuggestingCauses(false);
  };

  const handleCopySuggestion = () => {
    if (aiSuggestedRootCausesList.length > 0 && currentAiSuggestionIndex < aiSuggestedRootCausesList.length) {
      const suggestionToCopy = aiSuggestedRootCausesList[currentAiSuggestionIndex];
      navigator.clipboard.writeText(suggestionToCopy)
        .then(() => {
          toast({ title: "Sugerencia Copiada", description: "La sugerencia ha sido copiada al portapapeles." });
        })
        .catch(err => {
          console.error('Error al copiar sugerencia: ', err);
          toast({ title: "Error al Copiar", description: "No se pudo copiar la sugerencia.", variant: "destructive" });
        });
    }
  };


  return (
    <>
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
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold font-headline flex items-center">
                    <MessageSquare className="mr-2 h-5 w-5 text-primary" />
                    Causas Raíz Identificadas
                </h3>
                <Button
                    onClick={handleSuggestRootCausesClick}
                    variant="outline"
                    size="sm"
                    disabled={isSaving || isSuggestingCauses}
                    title="Sugerir posibles causas raíz latentes usando IA basado en la información del análisis actual."
                >
                    {isSuggestingCauses ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Sugerir con IA
                </Button>
            </div>

            {identifiedRootCauses.map((rc, index) => (
              <Card key={rc.id} className="p-4 bg-card shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor={`rc-desc-${rc.id}`} className="font-medium text-primary">
                    Causa Raíz #{index + 1} <span className="text-destructive">*</span>
                  </Label>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveIdentifiedRootCause(rc.id)}
                    aria-label={`Eliminar causa raíz #${index + 1}`}
                    className="h-7 w-7"
                    disabled={isSaving}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <Textarea
                  id={`rc-desc-${rc.id}`}
                  value={rc.description}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    onUpdateIdentifiedRootCause(rc.id, e.target.value)
                  }
                  placeholder={`Causa Raíz #${index + 1}: Describa la causa raíz...`}
                  rows={3}
                  className="w-full"
                  disabled={isSaving}
                />
              </Card>
            ))}
            
            <Button
                onClick={onAddIdentifiedRootCause}
                variant="outline"
                className="w-full"
                disabled={isSaving}
            >
                <PlusCircle className="mr-2 h-4 w-4" />
                {identifiedRootCauses.length === 0 ? "Añadir Primera Causa Raíz" : "Añadir Otra Causa Raíz"}
            </Button>
        </div>


        {aiSuggestedRootCausesList.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-md font-semibold text-primary">Sugerencias de Causa Raíz Latente por IA</CardTitle>
                <CardDescription className="text-xs">
                  Estas son sugerencias de causas raíz latentes basadas en la información proporcionada. Revíselas y cópielas a una de las "Causas Raíz Identificadas" si es apropiada, o úselas como inspiración.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-28 w-full rounded-md border p-3 bg-background/50">
                  <p className="text-sm whitespace-pre-wrap">
                    {aiSuggestedRootCausesList[currentAiSuggestionIndex]}
                  </p>
                </ScrollArea>
              </CardContent>
              <CardFooter className="flex justify-between items-center pt-3">
                <Button onClick={handleCopySuggestion} variant="outline" size="sm">
                  <ClipboardCopy className="mr-2 h-4 w-4" /> Copiar Sugerencia
                </Button>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => setCurrentAiSuggestionIndex(prev => Math.max(0, prev - 1))}
                    variant="ghost"
                    size="sm"
                    disabled={currentAiSuggestionIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {currentAiSuggestionIndex + 1} de {aiSuggestedRootCausesList.length}
                  </span>
                  <Button
                    onClick={() => setCurrentAiSuggestionIndex(prev => Math.min(aiSuggestedRootCausesList.length - 1, prev + 1))}
                    variant="ghost"
                    size="sm"
                    disabled={currentAiSuggestionIndex === aiSuggestedRootCausesList.length - 1}
                  >
                    Siguiente <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          )}


        <div className="space-y-4">
          <h3 className="text-lg font-semibold font-headline">Plan de Acción Correctiva</h3>
          {uniquePlannedActions.map((action, index) => (
            <Card key={action.id} className="p-4 space-y-3 bg-secondary/50">
               <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-primary">Acción Planificada #{index + 1}</p>
                    {action.isNotificationSent && (
                        <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">Notificada</span>
                    )}
                </div>
                 <Button variant="ghost" size="icon" onClick={() => {
                    const originalIndex = plannedActions.findIndex(pa => pa.id === action.id);
                    if (originalIndex !== -1) onRemovePlannedAction(originalIndex);
                 }} aria-label="Eliminar acción planificada">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`pa-desc-${index}`}>Descripción de la Acción <span className="text-destructive">*</span></Label>
                <Input id={`pa-desc-${index}`} value={action.description} onChange={(e) => handleActionChange(index, 'description', e.target.value)} placeholder="Detalle de la acción correctiva" />
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center"><Link2 className="mr-2 h-4 w-4" />Causas Raíz Abordadas <span className="text-destructive">*</span></Label>
                {identifiedRootCauses.filter(rc => rc.description && rc.description.trim()).length > 0 ? (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto p-2 border rounded-md bg-background/50">
                    {identifiedRootCauses.map((rc, rc_idx) => {
                       if (rc.description && rc.description.trim()) {
                            const originalActionIndex = plannedActions.findIndex(pa => pa.id === action.id);
                            return (
                                <div key={rc.id} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`pa-${action.id}-rc-${rc.id}`}
                                    checked={action.relatedRootCauseIds?.includes(rc.id)}
                                    onCheckedChange={(checked) => {
                                        if (originalActionIndex !== -1) {
                                            handleToggleRootCauseForAction(originalActionIndex, rc.id, checked as boolean);
                                        }
                                    }}
                                />
                                <Label htmlFor={`pa-${action.id}-rc-${rc.id}`} className="text-xs font-normal cursor-pointer flex-grow">
                                    Causa Raíz #{rc_idx + 1}: {rc.description.substring(0, 50)}
                                    {rc.description.length > 50 ? "..." : ""}
                                </Label>
                                </div>
                            );
                        }
                        return null;
                    })}
                  </div>
                ) : (
                   <p className="text-xs text-muted-foreground">Defina y describa al menos una Causa Raíz para poder vincularla.</p>
                )}
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
                        <SelectItem key={user.id} value={user.name}>{user.name} ({user.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
          <Button onClick={onAddPlannedAction} variant="outline" disabled={isSaving}>
            <PlusCircle className="mr-2 h-4 w-4" /> Agregar Acción al Plan
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between gap-2 pt-4 border-t">
        <Button onClick={onPrevious} variant="outline" className="w-full sm:w-auto transition-transform hover:scale-105" disabled={isSaving || isSuggestingCauses}>Anterior</Button>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={handleSaveProgressLocal} variant="secondary" className="w-full sm:w-auto transition-transform hover:scale-105" disabled={isSaving || isSuggestingCauses}>
                {(isSaving || isSuggestingCauses) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" /> Guardar Avance
            </Button>
            <Button onClick={handleOpenSendTasksDialog} variant="secondary" className="w-full sm:w-auto transition-transform hover:scale-105" disabled={isSaving || isSuggestingCauses || uniquePlannedActions.length === 0}>
                {(isSaving || isSuggestingCauses) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" /> Enviar Tareas
            </Button>
            <Button onClick={handleContinueLocal} className="w-full sm:w-auto transition-transform hover:scale-105" disabled={isSaving || isSuggestingCauses}>
                 {(isSaving || isSuggestingCauses) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 Continuar
            </Button>
        </div>
      </CardFooter>
    </Card>

    <NotifyTasksDialog
        isOpen={isNotifyTasksDialogOpen}
        onOpenChange={setIsNotifyTasksDialogOpen}
        actionsToNotify={actionsForNotificationDialog}
        availableUsers={availableUsers}
        eventId={eventData.id}
        eventFocusDescription={eventData.focusEventDescription}
        identifiedRootCauses={identifiedRootCauses}
        onConfirmSend={handleConfirmSendNotificationsInDialog}
     />
    </>
  );
};
