
'use client';

import type { FC, ChangeEvent } from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { DetailedFacts, FullUserProfile, Site, InvestigationSession, Evidence, ActionPlan, PlannedAction as FirestorePlannedAction, Validation } from '@/types/rca';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCircle, Save, Loader2, Target, ClipboardList, Sparkles, FolderKanban, CheckCircle2, MessageSquare, ExternalLink, Link2, Trash2, FileText, ImageIcon, Paperclip, CheckSquare, XCircle, ListTodo } from 'lucide-react';
import { format, parseISO, isValid as isValidDate } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { paraphrasePhenomenon, type ParaphrasePhenomenonInput } from '@/ai/flows/paraphrase-phenomenon';
import { InvestigationTeamManager } from './InvestigationTeamManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { sanitizeForFirestore } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { sendEmailAction } from '@/app/actions';


let idCounter = Date.now();
const generateClientSideId = (prefix: string) => {
    idCounter++;
    return `${prefix}-${idCounter}`;
};

// ------ CARD DE PLAN DE ACCIÓN INDIVIDUAL ------

const getEvidenceIconLocal = (tipo?: FirestoreEvidence['tipo']) => {
    if (!tipo) return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />;
    switch (tipo) {
      case 'link': return <Link2 className="h-4 w-4 mr-2 flex-shrink-0 text-indigo-600" />;
      case 'pdf': return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-red-600" />;
      case 'jpg': case 'jpeg': case 'png': return <ImageIcon className="h-4 w-4 mr-2 flex-shrink-0 text-blue-600" />;
      case 'doc': case 'docx': return <Paperclip className="h-4 w-4 mr-2 flex-shrink-0 text-sky-700" />;
      default: return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />;
    }
};

interface ActionPlanCardProps {
  plan: ActionPlan;
  availableUsers: FullUserProfile[];
  userProfile: FullUserProfile | null;
  onUpdate: (updatedPlan: ActionPlan, newFile?: File | null, newEvidenceComment?: string) => Promise<void>;
  onRemoveEvidence: (plan: ActionPlan, evidenceId: string) => Promise<void>;
}

const ActionPlanCard: FC<ActionPlanCardProps> = ({ plan, availableUsers, userProfile, onUpdate, onRemoveEvidence }) => {
  const [localPlan, setLocalPlan] = useState(plan);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [evidenceComment, setEvidenceComment] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    setLocalPlan(plan);
  }, [plan]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    await onUpdate(localPlan, fileToUpload, evidenceComment);
    setIsUpdating(false);
    setFileToUpload(null);
    setEvidenceComment('');
    const fileInput = document.getElementById(`evidence-file-input-${plan.id}`) as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };
  
  const handleInternalRemoveEvidence = async (evidenceId: string) => {
    setIsUpdating(true);
    await onRemoveEvidence(plan, evidenceId);
    setIsUpdating(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFileToUpload(event.target.files[0]);
    } else {
      setFileToUpload(null);
    }
  };


  return (
    <Card className="shadow-lg animate-in fade-in-50 duration-300 bg-card">
      <CardHeader>
        <div className='flex justify-between items-start'>
            <div>
                <CardTitle className="text-lg font-semibold text-primary">{plan.accionResumen}</CardTitle>
            </div>
            <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold",
                plan.estado === 'Pendiente' && 'bg-orange-100 text-orange-700',
                 plan.estado === 'En proceso' && 'bg-yellow-100 text-yellow-700',
                plan.estado === 'En Validación' && 'bg-blue-100 text-blue-700',
                plan.estado === 'Completado' && 'bg-green-100 text-green-700',
                plan.estado === 'Rechazado' && 'bg-destructive/10 text-destructive'
            )}>{plan.estado}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        
        <div className="pt-2"><h4 className="font-semibold text-primary mb-1">[Evidencias Adjuntas]</h4>
            {localPlan.evidencias.length > 0 ? (<ul className="space-y-1.5">
                {localPlan.evidencias.map(ev => (<li key={ev.id} className="flex items-start justify-between text-xs border p-2 rounded-md bg-muted/10">
                    <div className="flex-grow"><div className="flex items-center">{getEvidenceIconLocal(ev.tipo)}<span className="font-medium">{ev.nombre}</span></div>
                      {ev.comment && <p className="text-xs text-muted-foreground ml-[calc(1rem+0.5rem)] mt-0.5">Comentario: {ev.comment}</p>}</div>
                    <div className="flex-shrink-0 ml-2">
                        <Button asChild variant="link" size="sm" className="p-0 h-auto text-xs mr-2"><a href={ev.dataUrl} target="_blank" rel="noopener noreferrer" download={ev.nombre}><ExternalLink className="mr-1 h-3 w-3" />Ver/Descargar</a></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/10" onClick={() => handleInternalRemoveEvidence(ev.id)} disabled={isUpdating || localPlan.estado === 'Completado' || localPlan.estado === 'Rechazado'} aria-label="Eliminar evidencia"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                    </li>))}</ul>
            ) : <p className="text-xs text-muted-foreground">No hay evidencias adjuntas.</p>}
        </div>
        
        <div className="pt-2"><h4 className="font-semibold text-primary mb-1">[Adjuntar nueva evidencia]</h4>
            <div className="space-y-2">
              <Label htmlFor={`evidence-file-input-${plan.id}`}>Archivo de Evidencia</Label>
              <Input id={`evidence-file-input-${plan.id}`} type="file" onChange={handleFileChange} className="text-xs h-9" disabled={isUpdating || localPlan.estado === 'Completado' || localPlan.estado === 'Rechazado'} />
              <Label htmlFor={`evidence-comment-${plan.id}`}>Comentario para esta evidencia (opcional)</Label>
              <Input id={`evidence-comment-${plan.id}`} type="text" placeholder="Ej: Foto de la reparación, documento de capacitación..." value={evidenceComment} onChange={(e) => setEvidenceComment(e.target.value)} className="text-xs h-9" disabled={isUpdating || localPlan.estado === 'Completado' || localPlan.estado === 'Rechazado'} />
            </div>
            {fileToUpload && <p className="text-xs text-muted-foreground mt-1">Archivo seleccionado: {fileToUpload.name}</p>}
        </div>

        <div className="pt-2">
            <div className="flex justify-between items-center mb-1">
                <h4 className="font-semibold text-primary flex items-center"><MessageSquare className="mr-1.5 h-4 w-4" />[Comentarios Generales]</h4>
            </div>
            <Textarea value={localPlan.userComments || ''} onChange={(e) => setLocalPlan(prev => ({ ...prev, userComments: e.target.value }))} placeholder="Añada sus comentarios sobre el progreso..." rows={3} className="text-sm" disabled={isUpdating || localPlan.estado === 'Completado' || localPlan.estado === 'Rechazado'} />
        </div>
        
        <div className="pt-2">
            <h4 className="font-semibold text-primary mb-1">[Actualizar estado]</h4>
            <div className="flex items-center gap-2">
                <Button size="sm" variant="default" onClick={handleUpdate} disabled={isUpdating || ['Completado', 'En Validación', 'Rechazado'].includes(localPlan.estado) || (!fileToUpload && plan.userComments === localPlan.userComments)} title={localPlan.estado === 'Completado' ? "Esta tarea ya ha sido validada." : ['En Validación', 'Rechazado'].includes(localPlan.estado) ? `La tarea ya está en estado '${localPlan.estado}'` : (!fileToUpload && plan.userComments === localPlan.userComments) ? "Debe adjuntar un archivo o modificar los comentarios para actualizar." : "Guardar y marcar la tarea como lista para validación."}>
                  {isUpdating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />} 
                  {isUpdating ? 'Procesando...' : 'Marcar como listo para validación'}
                </Button>
                {localPlan.estado === 'En Validación' && (<span className="text-xs text-green-600 flex items-center ml-2 p-1.5 bg-green-50 border border-green-200 rounded-md"><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Listo para Validar</span>)}
            </div>
        </div>
      </CardContent>
    </Card>
  );
};


// ------ COMPONENTE PRINCIPAL ------
export const Step2Facts: FC<{
  detailedFacts: DetailedFacts;
  onDetailedFactChange: (field: keyof DetailedFacts, value: string) => void;
  projectLeader: string;
  onProjectLeaderChange: (value: string) => void;
  investigationObjective: string;
  onInvestigationObjectiveChange: (value: string) => void;
  investigationSessions: InvestigationSession[];
  onSetInvestigationSessions: (sessions: InvestigationSession[]) => void;
  analysisDetails: string;
  onAnalysisDetailsChange: (value: string) => void;
  availableUsers: FullUserProfile[];
  availableSites: Site[];
  isSaving: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSaveAnalysis: () => Promise<void>;
  allRcaDocuments: any[];
  userProfile: FullUserProfile | null;
  loadingAuth: boolean;
  plannedActions: FirestorePlannedAction[];
  validations: Validation[];
}> = ({
  detailedFacts,
  onDetailedFactChange,
  projectLeader,
  onProjectLeaderChange,
  investigationObjective,
  onInvestigationObjectiveChange,
  investigationSessions,
  onSetInvestigationSessions,
  analysisDetails,
  onAnalysisDetailsChange,
  availableUsers,
  availableSites,
  isSaving,
  onPrevious,
  onNext,
  onSaveAnalysis,
  allRcaDocuments,
  userProfile,
  loadingAuth,
  plannedActions,
  validations
}) => {
  const { toast } = useToast();
  const [clientSideMaxDateTime, setClientSideMaxDateTime] = useState<string | undefined>(undefined);
  const [isParaphrasing, setIsParaphrasing] = useState(false);
  
  const assignedActionPlans: ActionPlan[] = useMemo(() => {
    if (loadingAuth || !userProfile || !userProfile.name || !Array.isArray(plannedActions)) {
      return [];
    }
    return plannedActions.map(pa => {
      const validation = validations.find(v => v.actionId === pa.id);
      let estado: ActionPlan['estado'] = 'Pendiente';
      const isMarkedReady = pa.markedAsReadyAt && isValidDate(parseISO(pa.markedAsReadyAt));
      
      if (validation?.status === 'validated') {
        estado = 'Completado';
      } else if (validation?.status === 'rejected') {
        estado = 'Rechazado';
      } else if (isMarkedReady) {
        estado = 'En Validación';
      } else if ((pa.evidencias && pa.evidencias.length > 0) || (pa.userComments && pa.userComments.trim() !== '')) {
        estado = 'En proceso';
      }

      return {
        id: pa.id,
        _originalRcaDocId: pa.eventId,
        _originalActionId: pa.id,
        accionResumen: pa.description.substring(0, 50) + (pa.description.length > 50 ? "..." : ""),
        estado,
        plazoLimite: pa.dueDate && isValidDate(parseISO(pa.dueDate)) ? format(parseISO(pa.dueDate), 'dd/MM/yyyy', { locale: es }) : 'N/A',
        asignadoPor: projectLeader || 'Sistema',
        validatorName: projectLeader || 'N/A',
        tituloDetalle: allRcaDocuments[0]?.eventData.focusEventDescription || 'Sin título',
        descripcionDetallada: pa.description,
        responsableDetalle: pa.responsible,
        codigoRCA: pa.eventId,
        evidencias: pa.evidencias || [],
        userComments: pa.userComments || '',
      };
    });
  }, [userProfile, loadingAuth, plannedActions, validations, projectLeader, allRcaDocuments]);


  const handleUpdateAction = async (updatedPlan: ActionPlan, newFile?: File | null, newEvidenceComment?: string) => {
    // This function seems complex for this component. The logic should ideally live in the parent `analisis/page.tsx`.
    // For now, it will just toast a message.
    toast({ title: "Funcionalidad en Desarrollo", description: "La actualización de tareas se gestiona en la sección 'Mis Tareas'." });
  };

  const handleRemoveActionEvidence = async (plan: ActionPlan, evidenceId: string) => {
    toast({ title: "Funcionalidad en Desarrollo", description: "La gestión de evidencias de tareas se realiza en 'Mis Tareas'." });
  };


  const usersForDropdown = useMemo(() => {
    if (userProfile?.role === 'Super User') {
      return availableUsers;
    }
    return availableUsers;
  }, [availableUsers, userProfile]);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setClientSideMaxDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: keyof DetailedFacts) => {
    onDetailedFactChange(field, e.target.value);
  };
  
  const formatDateTimeLocalForDisplay = (dateTimeLocalString: string): string => {
    if (!dateTimeLocalString) return 'CUÁNDO (no especificado)';
    try {
      const date = parseISO(dateTimeLocalString);
      if (isValidDate(date)) {
        return format(date, "dd-MM-yyyy 'a las' HH:mm", { locale: es });
      }
    } catch (e) { /* ignore error, return original or placeholder */ }
    return dateTimeLocalString; // Fallback
  };
  
  const constructedPhenomenonDescription = useMemo(() => {
    return `La desviación ocurrió de la siguiente manera: "${detailedFacts.como || 'CÓMO (no especificado)'}".
El evento identificado fue: "${detailedFacts.que || 'QUÉ (no especificado)'}".
Esto tuvo lugar en: "${detailedFacts.donde || 'DÓNDE (no especificado)'}".
Sucedió el: "${formatDateTimeLocalForDisplay(detailedFacts.cuando)}".
El impacto o tendencia fue: "${detailedFacts.cualCuanto || 'CUÁL/CUÁNTO (no especificado)'}".
Las personas o equipos implicados fueron: "${detailedFacts.quien || 'QUIÉN (no especificado)'}".`;
  }, [detailedFacts]);

  useEffect(() => {
    if (!analysisDetails || analysisDetails.startsWith("La desviación ocurrió de la siguiente manera:")) {
        onAnalysisDetailsChange(constructedPhenomenonDescription);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [constructedPhenomenonDescription]);

  const validateFieldsForNext = (): boolean => {
    const missingFields = [];
    if (!detailedFacts.como.trim()) missingFields.push("Hechos Detallados: CÓMO");
    if (!detailedFacts.que.trim()) missingFields.push("Hechos Detallados: QUÉ");
    if (!detailedFacts.donde.trim()) missingFields.push("Hechos Detallados: DÓNDE");
    if (!detailedFacts.cuando.trim()) missingFields.push("Hechos Detallados: CUÁNDO");
    if (!detailedFacts.cualCuanto.trim()) missingFields.push("Hechos Detallados: CUÁL/CUÁNTO");
    if (!detailedFacts.quien.trim()) missingFields.push("Hechos Detallados: QUIÉN");
    
    if (missingFields.length > 0) {
      toast({
        title: "Campos Obligatorios Faltantes",
        description: `Por favor, complete los siguientes campos del Paso 2: ${missingFields.join(', ')}.`,
        variant: "destructive",
        duration: 7000,
      });
      return false;
    }
    return true;
  };


  const handleNextWithSave = async () => {
    if (!validateFieldsForNext()) return;
    onNext();
  };

  const handleParaphrasePhenomenon = async () => {
    setIsParaphrasing(true);
    try {
      const input: ParaphrasePhenomenonInput = {
        quien: detailedFacts.quien || undefined,
        que: detailedFacts.que || undefined,
        donde: detailedFacts.donde || undefined,
        cuando: detailedFacts.cuando || undefined,
        cualCuanto: detailedFacts.cualCuanto || undefined,
        como: detailedFacts.como || undefined,
      };

      const result = await paraphrasePhenomenon(input);

      if (result && result.paraphrasedText) {
        onAnalysisDetailsChange(result.paraphrasedText);
        toast({ title: "Asistente IA", description: "La descripción del fenómeno ha sido actualizada con la versión parafraseada." });
      } else {
        toast({ title: "Error de IA", description: "No se pudo obtener una respuesta de la IA.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error paraphrasing phenomenon:", error);
      toast({ title: "Error de IA", description: `Ocurrió un error al contactar la IA: ${(error as Error).message}`, variant: "destructive" });
    } finally {
      setIsParaphrasing(false);
    }
  };

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Paso 2: Hechos y Análisis Preliminar</CardTitle>
        <CardDescription>Recopile y documente todos los hechos relevantes sobre el evento.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="facts">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="facts">Hechos Detallados</TabsTrigger>
            <TabsTrigger value="preservation">Preservación de Hechos</TabsTrigger>
          </TabsList>
          <TabsContent value="facts" className="mt-4">
             <div className="space-y-4">
                <Card className="shadow-inner">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold flex items-center">
                            <UserCircle className="mr-2 h-5 w-5 text-primary" />
                            Líder del Proyecto
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                         <Select value={projectLeader} onValueChange={onProjectLeaderChange}>
                            <SelectTrigger id="projectLeader">
                            <SelectValue placeholder="-- Seleccione un líder --" />
                            </SelectTrigger>
                            <SelectContent>
                            {usersForDropdown.length > 0 ? (
                                usersForDropdown.map(user => (
                                <SelectItem key={user.id} value={user.name}>{user.name} ({user.role})</SelectItem>
                                ))
                            ) : (
                                <SelectItem value="" disabled>No hay líderes disponibles para esta empresa</SelectItem>
                            )}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                <Card className="shadow-inner">
                    <CardContent className="pt-6">
                        <InvestigationTeamManager
                            sessions={investigationSessions}
                            onSetSessions={onSetInvestigationSessions}
                            availableUsers={availableUsers}
                            availableSites={availableSites}
                            isSaving={isSaving}
                        />
                    </CardContent>
                </Card>

                <Card className="shadow-inner">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold flex items-center">
                            <ClipboardList className="mr-2 h-5 w-5 text-primary"/>
                            Hechos Detallados
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="como">CÓMO (ocurrió la desviación) <span className="text-destructive">*</span></Label>
                        <Input id="como" value={detailedFacts.como} onChange={(e) => handleInputChange(e, 'como')} placeholder="Ej: Durante operación normal" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="que">QUÉ (ocurrió) <span className="text-destructive">*</span></Label>
                        <Textarea id="que" value={detailedFacts.que} onChange={(e) => handleInputChange(e, 'que')} placeholder="Ej: Trip por alta Temperatura Descanso 1" rows={2} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="donde">DÓNDE (ocurrió) <span className="text-destructive">*</span></Label>
                        <Input id="donde" value={detailedFacts.donde} onChange={(e) => handleInputChange(e, 'donde')} placeholder="Ej: Planta Teno, Sistema Calcinación, Horno" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cuando-input">CUÁNDO (Fecha y Hora) <span className="text-destructive">*</span></Label>
                        <Input 
                            id="cuando-input" 
                            type="datetime-local"
                            value={detailedFacts.cuando} 
                            onChange={(e) => handleInputChange(e, 'cuando')}
                            max={clientSideMaxDateTime}
                            className="flex-grow"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cualCuanto">CUÁL/CUÁNTO (tendencia e impacto) <span className="text-destructive">*</span></Label>
                        <Input id="cualCuanto" value={detailedFacts.cualCuanto} onChange={(e) => handleInputChange(e, 'cualCuanto')} placeholder="Ej: Evento único / 2 Días de detención" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quien">QUIÉN <span className="text-destructive">*</span></Label>
                        <Input id="quien" value={detailedFacts.quien} onChange={(e) => handleInputChange(e, 'quien')} placeholder="Personas o equipos implicados (Ej: N/A, Operador Turno A)" />
                      </div>
                    </CardContent>
                </Card>

                <Card className="shadow-inner">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-lg font-semibold">DESCRIPCIÓN DEL FENÓMENO</CardTitle>
                            <Button variant="outline" size="sm" onClick={handleParaphrasePhenomenon} disabled={isParaphrasing || isSaving}>
                              {isParaphrasing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                              Parafrasear con IA
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                          id="analysisDetails"
                          value={analysisDetails}
                          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onAnalysisDetailsChange(e.target.value)}
                          placeholder="La descripción del fenómeno aparecerá aquí. Puede editarla manualmente o usar la IA."
                          rows={4}
                          className="bg-background"
                        />
                    </CardContent>
                </Card>

                 <Card className="shadow-inner">
                    <CardHeader>
                         <CardTitle className="text-lg font-semibold flex items-center">
                          <Target className="mr-2 h-4 w-4 text-primary" />
                          Objetivo de la Investigación
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                          id="investigationObjective"
                          value={investigationObjective}
                          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onInvestigationObjectiveChange(e.target.value)}
                          placeholder="Defina el alcance y el objetivo principal de este análisis de causa raíz..."
                          rows={3}
                        />
                    </CardContent>
                </Card>
            </div>
          </TabsContent>
          <TabsContent value="preservation">
            <Card className="shadow-inner bg-secondary/20 mt-4">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-primary flex items-center">
                  <ListTodo className="mr-2 h-5 w-5" /> Tareas del Plan de Acción
                </CardTitle>
              </CardHeader>
              <CardContent>
                 <div className="mt-6 pt-6 border-t">
                    {assignedActionPlans.length > 0 ? (
                      <div className="space-y-4">
                          {assignedActionPlans.map(plan => (
                          <ActionPlanCard
                              key={plan.id}
                              plan={plan}
                              availableUsers={availableUsers}
                              userProfile={userProfile}
                              onUpdate={handleUpdateAction}
                              onRemoveEvidence={handleRemoveActionEvidence}
                          />
                          ))}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-10">
                          <p>No hay planes de acción definidos para este análisis.</p>
                          <p className="text-xs mt-1">Vaya al Paso 3 para añadirlos.</p>
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between gap-2 pt-4 border-t">
        <Button onClick={onPrevious} variant="outline" className="w-full sm:w-auto transition-transform hover:scale-105" disabled={isSaving}>Anterior</Button>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={onSaveAnalysis} variant="secondary" className="w-full sm:w-auto transition-transform hover:scale-105" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" /> Guardar Avance
            </Button>
            <Button onClick={handleNextWithSave} className="w-full sm:w-auto transition-transform hover:scale-105" disabled={isSaving}>
                 {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Siguiente
            </Button>
        </div>
      </CardFooter>
    </Card>
    </>
  );
};
