
'use client';
import { useState, useMemo, FC, ChangeEvent, useEffect } from 'react';
import type { FullUserProfile, RCAAnalysisDocument, PlannedAction as FirestorePlannedAction, Evidence as FirestoreEvidence, InvestigationSession, Site } from '@/types/rca';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ListTodo, CheckSquare, XCircle, Link2, ExternalLink, Paperclip, FileText, ImageIcon, CheckCircle2, Save, MessageSquare, Trash2, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid as isValidDate } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from "@/hooks/use-toast";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { sanitizeForFirestore } from '@/lib/utils';
import { sendEmailAction } from '@/app/actions';
import { InvestigationTeamManager } from './InvestigationTeamManager';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

let idCounter = Date.now();
const generateClientSideId = (prefix: string) => {
    idCounter++;
    return `${prefix}-${idCounter}`;
};


// Define el tipo para las props de ActionPlanCard
interface ActionPlan {
    id: string;
    _originalRcaDocId: string;
    _originalActionId: string;
    accionResumen: string;
    estado: 'Pendiente' | 'En proceso' | 'En Validación' | 'Completado' | 'Rechazado';
    plazoLimite: string; // 'dd/MM/yyyy'
    asignadoPor: string;
    validatorName: string;
    tituloDetalle: string;
    descripcionDetallada: string;
    responsableDetalle: string;
    codigoRCA: string;
    evidencias: FirestoreEvidence[];
    userComments: string;
}


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

// Helper component for individual action cards
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
    <Card className="shadow-lg animate-in fade-in-50 duration-300">
      <CardHeader>
        <div className='flex justify-between items-start'>
            <div>
                <CardTitle className="text-lg font-semibold text-primary">{plan.accionResumen}</CardTitle>
                <CardDescription>ID Acción: {plan.id}</CardDescription>
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
        <div><Label className="font-semibold">Descripción Completa:</Label><p className="whitespace-pre-line bg-muted/20 p-2 rounded-md">{plan.descripcionDetallada}</p></div>
        <div><Label className="font-semibold">Responsable:</Label> <p>{plan.responsableDetalle}</p></div>
        <div><Label className="font-semibold">Plazo límite:</Label> <p>{plan.plazoLimite}</p></div>
        
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


interface Step2Point5TasksProps {
  allRcaDocuments: RCAAnalysisDocument[];
  availableUsers: FullUserProfile[];
  userProfile: FullUserProfile | null;
  loadingAuth: boolean;
  isSaving: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSaveAnalysis: (showToast?: boolean) => Promise<{ success: boolean; newEventId?: string; needsNavigationUrl?: string } | void>;
  projectLeader: string;
  onProjectLeaderChange: (value: string) => void;
  investigationSessions: InvestigationSession[];
  onSetInvestigationSessions: (sessions: InvestigationSession[]) => void;
  availableSites: Site[];
}

export const Step2Point5Tasks: FC<Step2Point5TasksProps> = ({
  allRcaDocuments,
  availableUsers,
  userProfile,
  loadingAuth,
  isSaving,
  onPrevious,
  onNext,
  onSaveAnalysis,
  projectLeader,
  onProjectLeaderChange,
  investigationSessions,
  onSetInvestigationSessions,
  availableSites,
}) => {
  const { toast } = useToast();
  const [internalDocs, setInternalDocs] = useState(allRcaDocuments);

  useEffect(() => {
    setInternalDocs(allRcaDocuments);
  }, [allRcaDocuments]);
  
  const usersForDropdown = useMemo(() => {
    if (userProfile?.role === 'Super User') {
      return availableUsers;
    }
    return availableUsers;
  }, [availableUsers, userProfile]);


  const assignedActionPlans = useMemo(() => {
    if (loadingAuth || !userProfile || !userProfile.name || internalDocs.length === 0) {
      return [];
    }
    const plans: ActionPlan[] = [];
    const rcaDoc = internalDocs[0];
    if (rcaDoc && rcaDoc.plannedActions && rcaDoc.plannedActions.length > 0) {
      rcaDoc.plannedActions.forEach(pa => {
        const validation = rcaDoc.validations?.find(v => v.actionId === pa.id);
        let estado: ActionPlan['estado'] = 'Pendiente';
        if (validation?.status === 'validated') estado = 'Completado';
        else if (validation?.status === 'rejected') estado = 'Rechazado';
        else if (pa.markedAsReadyAt) estado = 'En Validación';
        else if (pa.evidencias?.length > 0 || pa.userComments?.trim()) estado = 'En proceso';

        plans.push({
          id: pa.id,
          _originalRcaDocId: rcaDoc.eventData.id,
          _originalActionId: pa.id,
          accionResumen: pa.description.substring(0, 50) + (pa.description.length > 50 ? "..." : ""),
          estado,
          plazoLimite: pa.dueDate && isValidDate(parseISO(pa.dueDate)) ? format(parseISO(pa.dueDate), 'dd/MM/yyyy', { locale: es }) : 'N/A',
          asignadoPor: rcaDoc.projectLeader || 'Sistema',
          validatorName: rcaDoc.projectLeader || 'N/A',
          tituloDetalle: rcaDoc.eventData.focusEventDescription || 'Sin título',
          descripcionDetallada: pa.description,
          responsableDetalle: pa.responsible,
          codigoRCA: rcaDoc.eventData.id,
          evidencias: pa.evidencias || [],
          userComments: pa.userComments || '',
        });
      });
    }
    return plans;
  }, [userProfile, internalDocs, loadingAuth]);
  
  const handleUpdateAction = async (updatedPlan: ActionPlan, newFile?: File | null, newEvidenceComment?: string) => {
    if (!userProfile) return;
    
    try {
      let newEvidencePayload: FirestoreEvidence | null = null;
      if (newFile) {
        if (newFile.size > 700 * 1024) {
          toast({ title: "Archivo Demasiado Grande", description: "El archivo de evidencia no puede superar los 700 KB.", variant: "destructive" });
          return;
        }
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(newFile);
        });
        newEvidencePayload = {
          id: generateClientSideId('ev'),
          nombre: newFile.name,
          tipo: (newFile.type.split('/')[1] as FirestoreEvidence['tipo']) || 'other',
          comment: newEvidenceComment,
          dataUrl: dataUrl,
        };
      }

      const rcaDocRef = doc(db, 'rcaAnalyses', updatedPlan._originalRcaDocId);
      const docSnap = await getDoc(rcaDocRef);
      if (!docSnap.exists()) throw new Error("Documento de análisis no encontrado.");

      const currentRcaDoc = docSnap.data() as RCAAnalysisDocument;
      
      const updatedPlannedActions = currentRcaDoc.plannedActions.map(action => {
        if (action.id === updatedPlan._originalActionId) {
          const updatedEvidences = newEvidencePayload ? [...(action.evidencias || []), newEvidencePayload] : action.evidencias;
          return {
            ...action,
            evidencias: updatedEvidences,
            userComments: updatedPlan.userComments,
            markedAsReadyAt: new Date().toISOString()
          };
        }
        return action;
      });

      const finalDoc = { ...currentRcaDoc, plannedActions: updatedPlannedActions, updatedAt: new Date().toISOString() };
      await updateDoc(rcaDocRef, sanitizeForFirestore(finalDoc));
      setInternalDocs([finalDoc]); // Update local state to re-render
      toast({ title: "Tarea Actualizada", description: "La tarea ha sido marcada como lista para validación." });

      // Notify validator
      const validator = availableUsers.find(u => u.name === updatedPlan.validatorName);
      if (validator?.email && (validator.emailNotifications === undefined || validator.emailNotifications)) {
          const emailSubject = `Acción Lista para Validación: ${updatedPlan.accionResumen} (ACR: ${updatedPlan.codigoRCA})`;
          const validationLink = `${window.location.origin}/analisis?id=${updatedPlan._originalRcaDocId}&step=4`;
          const emailBody = `Estimado/a ${validator.name},\n\nEl usuario ${userProfile.name} ha marcado una acción como lista para su validación en el análisis "${updatedPlan.tituloDetalle}".\n\nAcción: ${updatedPlan.descripcionDetallada}\n\nPor favor, acceda al sistema para validar esta acción en el siguiente enlace:\n${validationLink}`;
          sendEmailAction({ to: validator.email, subject: emailSubject, body: emailBody });
      }

    } catch (error) {
      toast({ title: "Error al Actualizar", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handleRemoveEvidence = async (plan: ActionPlan, evidenceId: string) => {
    try {
        const rcaDocRef = doc(db, 'rcaAnalyses', plan._originalRcaDocId);
        const docSnap = await getDoc(rcaDocRef);
        if (!docSnap.exists()) throw new Error("Documento no encontrado.");

        const currentRcaDoc = docSnap.data() as RCAAnalysisDocument;
        const updatedPlannedActions = currentRcaDoc.plannedActions.map(action => {
            if (action.id === plan._originalActionId) {
                return { ...action, evidencias: (action.evidencias || []).filter(e => e.id !== evidenceId) };
            }
            return action;
        });

        const finalDoc = { ...currentRcaDoc, plannedActions: updatedPlannedActions, updatedAt: new Date().toISOString() };
        await updateDoc(rcaDocRef, sanitizeForFirestore(finalDoc));
        setInternalDocs([finalDoc]);
        toast({ title: "Evidencia Eliminada" });
    } catch (error) {
        toast({ title: "Error al Eliminar Evidencia", description: (error as Error).message, variant: "destructive" });
    }
  };

  if (loadingAuth) {
    return <div className="flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Paso 2.5: Equipo y Tareas</CardTitle>
        <CardDescription>
            Defina el líder y el equipo de investigación, y gestione las tareas del plan de acción para este análisis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="projectLeader" className="flex items-center">
                <UserCircle className="mr-2 h-4 w-4 text-primary" />
                Líder del Proyecto <span className="text-destructive">*</span>
              </Label>
              <Select value={projectLeader} onValueChange={onProjectLeaderChange}>
                <SelectTrigger id="projectLeader">
                  <SelectValue placeholder="-- Seleccione un líder --" />
                </SelectTrigger>
                <SelectContent>
                  {usersForDropdown.length > 0 ? usersForDropdown.map(user => (
                    <SelectItem key={user.id} value={user.name}>{user.name} ({user.role})</SelectItem>
                  )) : <SelectItem value="" disabled>No hay líderes disponibles para esta empresa</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            
            <InvestigationTeamManager
              sessions={investigationSessions}
              onSetSessions={onSetInvestigationSessions}
              availableUsers={availableUsers}
              availableSites={availableSites}
              isSaving={isSaving}
            />
        </div>
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
                    onRemoveEvidence={handleRemoveEvidence}
                />
                ))}
            </div>
            ) : (
            <div className="text-center text-muted-foreground py-10">
                No hay planes de acción definidos para este análisis. Vaya al Paso 3 para añadirlos.
            </div>
            )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={onPrevious} variant="outline" disabled={isSaving}>Anterior</Button>
        <Button onClick={onNext} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Siguiente
        </Button>
      </CardFooter>
    </Card>
  );
};
