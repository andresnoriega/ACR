
'use client';
import type { FC, ChangeEvent } from 'react';
import { useState, useMemo, useCallback, useEffect } from 'react'; 
import type { PlannedAction, AnalysisTechnique, IshikawaData, FiveWhysData, CTMData, IdentifiedRootCause, FullUserProfile, BrainstormIdea, BrainstormIdeaType, TimelineEvent, Site, RCAEventData } from '@/types/rca';
import { BRAINSTORM_IDEA_TYPES } from '@/types/rca';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from '@/components/ui/select'; 
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, Trash2, MessageSquare, Network, Link2, Save, Send, Loader2, Mail, Sparkles, ClipboardCopy, ChevronLeft, ChevronRight, AlertTriangle, Lightbulb, Edit3, X, HelpCircle, Fish, Share2 as CtmIcon, Wrench, Box, Ruler, Leaf, Users } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { IshikawaDiagramInteractive } from './IshikawaDiagramInteractive';
import { FiveWhysInteractive } from './FiveWhysInteractive';
import { CTMInteractive } from './CTMInteractive';
import TimelineComponent from './TimelineComponent';
import { useToast } from "@/hooks/use-toast";
import { sendEmailAction } from '@/app/actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { suggestLatentRootCauses, type SuggestLatentRootCausesInput } from '@/ai/flows/suggest-root-causes';


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
  availableSites: Site[];
  timelineEvents: TimelineEvent[];
  onSetTimelineEvents: (events: TimelineEvent[]) => void;
  brainstormingIdeas: BrainstormIdea[];
  onAddBrainstormIdea: () => void;
  onUpdateBrainstormIdea: (id: string, field: 'type' | 'description', value: string) => void;
  onRemoveBrainstormIdea: (id: string) => void;
  analysisTechnique: AnalysisTechnique;
  onAnalysisTechniqueChange: (value: AnalysisTechnique) => void;
  analysisTechniqueNotes: string;
  onAnalysisTechniqueNotesChange: (value: string) => void;
  ishikawaData: IshikawaData;
  onSetIshikawaData: (data: IshikawaData) => void;
  fiveWhysData: FiveWhysData;
  onSetFiveWhysData: (data: FiveWhysData) => void;
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
  availableSites,
  timelineEvents,
  onSetTimelineEvents,
  brainstormingIdeas,
  onAddBrainstormIdea,
  onUpdateBrainstormIdea,
  onRemoveBrainstormIdea,
  analysisTechnique,
  onAnalysisTechniqueChange,
  analysisTechniqueNotes,
  onAnalysisTechniqueNotesChange,
  ishikawaData,
  onSetIshikawaData,
  fiveWhysData,
  onSetFiveWhysData,
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
  const { userProfile } = useAuth();
  const [isNotifyTasksDialogOpen, setIsNotifyTasksDialogOpen] = useState(false);
  const [actionsForNotificationDialog, setActionsForNotificationDialog] = useState<PlannedAction[]>([]);
  const [responsibleSearchTerm, setResponsibleSearchTerm] = useState('');
  
  // AI Suggestions State
  const [isSuggestingCauses, setIsSuggestingCauses] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);


  const usersForDropdown = useMemo(() => {
    if (userProfile?.role === 'Super User') {
      return availableUsers;
    }
    const siteDetails = availableSites.find(s => s.name === eventData.place);
    const siteCompany = siteDetails?.empresa;

    if (!siteCompany) {
      return availableUsers.filter(u => !u.empresa);
    }
    return availableUsers.filter(u => u.empresa === siteCompany);
  }, [availableUsers, availableSites, eventData.place, userProfile]);

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

  const handleSaveProgressLocal = async () => {
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
  
  const handleSuggestCauses = async () => {
    setIsSuggestingCauses(true);
    setAiSuggestions([]);
    setCurrentSuggestionIndex(0);
    setShowAiSuggestions(true);

    try {
        const input: SuggestLatentRootCausesInput = {
            focusEventDescription: eventData.focusEventDescription || "No especificado",
            analysisTechnique,
            ishikawaData: analysisTechnique === 'Ishikawa' ? ishikawaData : undefined,
            fiveWhysData: analysisTechnique === '5 Por qué' ? fiveWhysData : undefined,
            ctmData: analysisTechnique === 'CTM' ? ctmData : undefined,
            existingRootCauses: identifiedRootCauses.map(rc => rc.description).filter(Boolean),
        };

        const result = await suggestLatentRootCauses(input);

        if (result && result.suggestedLatentCauses.length > 0) {
            setAiSuggestions(result.suggestedLatentCauses);
        } else {
            setAiSuggestions(["No se pudieron generar sugerencias. Asegúrese de haber validado algunas causas en la técnica de análisis seleccionada."]);
        }
    } catch (error) {
        console.error("Error suggesting causes:", error);
        setAiSuggestions([`Error al contactar la IA: ${(error as Error).message}`]);
    } finally {
        setIsSuggestingCauses(false);
    }
  };
  
  const handleCopySuggestion = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado", description: "Sugerencia copiada al portapapeles." });
  };


  const filteredResponsibles = usersForDropdown.filter(user =>
    user.name.toLowerCase().includes(responsibleSearchTerm.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(responsibleSearchTerm.toLowerCase()))
  );

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Paso 3: Análisis y Plan de Acción</CardTitle>
        <CardDescription>Seleccione la técnica de análisis, defina la causa raíz y el plan de acción.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <TimelineComponent events={timelineEvents} onSetEvents={onSetTimelineEvents} />
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold font-headline text-primary flex items-center">
              <Lightbulb className="mr-2 h-6 w-6" />
              Lluvia de Ideas Inicial (Clasificada)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
              {brainstormingIdeas.map((idea, index) => (
                <Card key={idea.id} className="p-3 bg-card shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium text-sm text-primary">Idea #{index + 1}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveBrainstormIdea(idea.id)}
                      aria-label={`Eliminar idea #${index + 1}`}
                      className="h-7 w-7"
                      disabled={isSaving}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1 sm:col-span-1">
                          <Label htmlFor={`bi-type-${idea.id}`} className="text-xs">Tipo de Idea</Label>
                          <Select
                          value={idea.type}
                          onValueChange={(value) => onUpdateBrainstormIdea(idea.id, 'type', value as BrainstormIdeaType)}
                          disabled={isSaving}
                          >
                          <SelectTrigger id={`bi-type-${idea.id}`} className="h-9 text-xs">
                              <SelectValue placeholder="-- Tipo --" />
                          </SelectTrigger>
                          <SelectContent>
                              {BRAINSTORM_IDEA_TYPES.map(typeOpt => (
                              <SelectItem key={typeOpt} value={typeOpt} className="text-xs">{typeOpt}</SelectItem>
                              ))}
                          </SelectContent>
                          </Select>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                          <Label htmlFor={`bi-desc-${idea.id}`} className="text-xs">Descripción de la Idea</Label>
                          <Textarea
                              id={`bi-desc-${idea.id}`}
                              value={idea.description}
                              onChange={(e) => onUpdateBrainstormIdea(idea.id, 'description', e.target.value)}
                              placeholder="Describa su idea aquí..."
                              rows={2}
                              className="text-xs"
                              disabled={isSaving}
                          />
                      </div>
                  </div>
                </Card>
              ))}
              <Button
                onClick={onAddBrainstormIdea}
                variant="outline"
                className="w-full"
                disabled={isSaving}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Idea a la Lluvia de Ideas
              </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
             <CardTitle className="text-xl font-semibold font-headline text-primary flex items-center">
              <Network className="mr-2 h-6 w-6" />
              Técnica de Análisis Principal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="analysisTechnique">Seleccione una técnica</Label>
              <Select value={analysisTechnique} onValueChange={(value: AnalysisTechnique) => onAnalysisTechniqueChange(value)}>
                <SelectTrigger id="analysisTechnique">
                  <SelectValue placeholder="-- Seleccione una técnica --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ishikawa"><div className="flex items-center"><Fish className="mr-2 h-4 w-4" />Ishikawa</div></SelectItem>
                  <SelectItem value="5 Por qué"><div className="flex items-center"><HelpCircle className="mr-2 h-4 w-4" />5 Por qué</div></SelectItem>
                  <SelectItem value="CTM"><div className="flex items-center"><CtmIcon className="mr-2 h-4 w-4" />Árbol de Causas (CTM)</div></SelectItem>
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
            
            {analysisTechnique === '5 Por qué' && (
                <FiveWhysInteractive 
                    fiveWhysData={fiveWhysData}
                    onSetFiveWhysData={onSetFiveWhysData}
                    eventFocusDescription={eventData.focusEventDescription}
                />
            )}
            
            {analysisTechnique === 'CTM' && (
              <CTMInteractive ctmData={ctmData} onSetCtmData={onSetCtmData} />
            )}
            
             <div className="pt-4 border-t space-y-2">
                 <Button
                    onClick={handleSuggestCauses}
                    variant="outline"
                    disabled={isSaving || !analysisTechnique}
                    title={!analysisTechnique ? "Seleccione una técnica de análisis para habilitar la IA" : "Sugerir causas raíz latentes basadas en la técnica seleccionada"}
                 >
                    <Sparkles className="mr-2 h-4 w-4" /> Sugerir Causas con IA
                </Button>
            </div>

            {(analysisTechnique === '' || analysisTechniqueNotes.trim() !== '') && (
              <div className="space-y-2 pt-4">
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
          </CardContent>
        </Card>

        <Separator className="my-6" />
        
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold font-headline flex items-center">
                    <MessageSquare className="mr-2 h-5 w-5 text-primary" />
                    Causas Raíz Identificadas
                </h3>
            </div>
            {showAiSuggestions && (
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 p-4 relative">
                  <button onClick={() => setShowAiSuggestions(false)} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                  <CardTitle className="text-base font-semibold text-green-800 dark:text-green-200 mb-2">Sugerencias de Causa Raíz por IA</CardTitle>
                  {isSuggestingCauses ? (
                    <div className="flex justify-center items-center h-20">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      <p>Generando sugerencias...</p>
                    </div>
                  ) : aiSuggestions.length > 0 ? (
                    <div className="space-y-2">
                      <div className="p-3 border bg-background rounded-md min-h-[4rem] flex items-center justify-center">
                        <p className="text-center">{aiSuggestions[currentSuggestionIndex]}</p>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <Button variant="ghost" size="sm" onClick={() => setCurrentSuggestionIndex(p => Math.max(0, p - 1))} disabled={currentSuggestionIndex === 0}>
                          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                        </Button>
                        <span className="text-muted-foreground">Sugerencia {currentSuggestionIndex + 1} de {aiSuggestions.length}</span>
                        <Button variant="ghost" size="sm" onClick={() => setCurrentSuggestionIndex(p => Math.min(aiSuggestions.length - 1, p + 1))} disabled={currentSuggestionIndex >= aiSuggestions.length - 1}>
                          Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                      <Button variant="secondary" className="w-full" onClick={() => handleCopySuggestion(aiSuggestions[currentSuggestionIndex])}>
                        <ClipboardCopy className="mr-2 h-4 w-4" /> Copiar Sugerencia
                      </Button>
                       <p className="text-xs text-center text-muted-foreground pt-1">Copie la sugerencia y luego agréguela a la lista de "Causas Raíz Identificadas" si es relevante.</p>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground">No se generaron sugerencias.</p>
                  )}
                </Card>
            )}
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

        <div className="space-y-4">
          <h3 className="text-lg font-semibold font-headline">Plan de Acción Correctivo</h3>
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
                  <Select 
                    value={action.responsible} 
                    onValueChange={(value) => handleActionResponsibleChange(index, value)}
                    onOpenChange={(isOpen) => {
                      if (!isOpen) {
                        setResponsibleSearchTerm(''); 
                      }
                    }}
                  >
                    <SelectTrigger id={`pa-resp-${index}`}>
                      <SelectValue placeholder="-- Seleccione un responsable --" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2 border-b sticky top-0 bg-popover z-10">
                        <Input
                          placeholder="Buscar por nombre o correo..."
                          value={responsibleSearchTerm}
                          onChange={(e) => setResponsibleSearchTerm(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-9 w-full"
                        />
                      </div>
                      <SelectSeparator />
                      <ScrollArea className="max-h-[200px]">
                        {filteredResponsibles.length > 0 ? (
                          filteredResponsibles.map(user => (
                            <SelectItem key={user.id} value={user.name}>{user.name} ({user.email})</SelectItem>
                          ))
                        ) : (
                           <div className="p-2 text-center text-xs text-muted-foreground">
                            {availableUsers.length === 0 ? "No hay usuarios configurados." : "Ningún usuario coincide."}
                          </div>
                        )}
                      </ScrollArea>
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
        <Button onClick={onPrevious} variant="outline" className="w-full sm:w-auto transition-transform hover:scale-105" disabled={isSaving}>Anterior</Button>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={handleSaveProgressLocal} variant="secondary" className="w-full sm:w-auto transition-transform hover:scale-105" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" /> Guardar Avance
            </Button>
            <Button onClick={handleOpenSendTasksDialog} variant="secondary" className="w-full sm:w-auto transition-transform hover:scale-105" disabled={isSaving || uniquePlannedActions.length === 0}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" /> Enviar Tareas
            </Button>
            <Button onClick={handleContinueLocal} className="w-full sm:w-auto transition-transform hover:scale-105" disabled={isSaving}>
                 {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
