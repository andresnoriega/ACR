'use client';
import { useState, useMemo, FC, ChangeEvent } from 'react';
import type { FullUserProfile, RCAAnalysisDocument, ActionPlan, Evidence as FirestoreEvidence } from '@/types/rca';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ListTodo, CheckSquare, XCircle, Link2, ExternalLink, Paperclip, FileText, ImageIcon, CheckCircle2, Save, MessageSquare, Trash2 } from 'lucide-react';
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

let idCounter = Date.now();
const generateClientSideId = (prefix: string) => {
    idCounter++;
    return `${prefix}-${idCounter}`;
};


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

interface Step2Point5TasksProps {
  allRcaDocuments: RCAAnalysisDocument[];
  availableUsers: FullUserProfile[];
  userProfile: FullUserProfile | null;
  loadingAuth: boolean;
  isSaving: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSaveAnalysis: (showToast?: boolean) => Promise<{ success: boolean; newEventId?: string; needsNavigationUrl?: string } | void>;
}

export const Step2Point5Tasks: FC<Step2Point5TasksProps> = ({
  allRcaDocuments,
  availableUsers,
  userProfile,
  loadingAuth,
  isSaving,
  onPrevious,
  onNext,
  onSaveAnalysis
}) => {
  const [selectedPlan, setSelectedPlan] = useState<ActionPlan | null>(null);
  const { toast } = useToast();
  const [isUpdatingAction, setIsUpdatingAction] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [evidenceComment, setEvidenceComment] = useState('');

  const assignedActionPlans = useMemo(() => {
    if (loadingAuth || !userProfile || !userProfile.name || allRcaDocuments.length === 0) {
      return [];
    }
    const plans: ActionPlan[] = [];
    const rcaDoc = allRcaDocuments[0]; 
    if (rcaDoc && rcaDoc.plannedActions && rcaDoc.plannedActions.length > 0) {
      rcaDoc.plannedActions.forEach(pa => {
        const validation = rcaDoc.validations?.find(v => v.actionId === pa.id);
        let estado: ActionPlan['estado'] = 'Pendiente';
        if (validation?.status === 'validated') estado = 'Completado';
        else if (validation?.status === 'rejected') estado = 'Rechazado';
        else if (pa.markedAsReadyAt) estado = 'En Validación';

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
  }, [userProfile, allRcaDocuments, loadingAuth]);

  const handleSelectPlan = (plan: ActionPlan) => {
    if (selectedPlan?.id === plan.id) {
      setSelectedPlan(null);
    } else {
      setSelectedPlan(plan);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFileToUpload(event.target.files[0]);
    } else {
      setFileToUpload(null);
    }
  };

  const handleRemoveEvidence = async (evidenceIdToRemove: string) => {
    if (!selectedPlan) return;
    
    setIsUpdatingAction(true);
    const { _originalRcaDocId, _originalActionId } = selectedPlan;

    try {
      const rcaDocRef = doc(db, 'rcaAnalyses', _originalRcaDocId);
      const docSnap = await getDoc(rcaDocRef);

      if (!docSnap.exists()) {
        throw new Error("El documento de análisis no se encontró en la base de datos.");
      }

      const currentRcaDoc = docSnap.data() as RCAAnalysisDocument;
      
      const updatedRcaDoc = {
        ...currentRcaDoc,
        plannedActions: currentRcaDoc.plannedActions.map(action => {
          if (action.id === _originalActionId) {
            const updatedEvidences = (action.evidencias || []).filter(e => e.id !== evidenceIdToRemove);
            return { ...action, evidencias: updatedEvidences };
          }
          return action;
        }),
        updatedAt: new Date().toISOString(),
      };
      
      await updateDoc(rcaDocRef, sanitizeForFirestore(updatedRcaDoc));
      
      toast({ title: "Evidencia Eliminada", variant: 'destructive' });
      // This is a simplified update. A full state sync might be better.
      setSelectedPlan(prev => prev ? { ...prev, evidencias: prev.evidencias.filter(e => e.id !== evidenceIdToRemove) } : null);

    } catch (error) {
      console.error("Error removing evidence:", error);
      toast({ title: "Error", description: `No se pudo eliminar la evidencia: ${(error as Error).message}`, variant: "destructive" });
    } finally {
      setIsUpdatingAction(false);
    }
  };

  const handleSignalTaskReadyForValidation = async () => {
    if (!selectedPlan || !userProfile) return;
    setIsUpdatingAction(true);
    
    try {
      let newEvidencePayload: FirestoreEvidence | null = null;
      if (fileToUpload) {
        if (fileToUpload.size > 700 * 1024) { // 700 KB limit
          toast({
            title: "Archivo Demasiado Grande",
            description: "El archivo de evidencia no puede superar los 700 KB para ser guardado en la base de datos.",
            variant: "destructive",
            duration: 7000,
          });
          setIsUpdatingAction(false);
          return;
        }

        toast({ title: "Procesando archivo...", description: `Convirtiendo ${fileToUpload.name} a Data URL.` });
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(fileToUpload);
        });

        newEvidencePayload = {
          id: generateClientSideId('ev'),
          nombre: fileToUpload.name,
          tipo: (fileToUpload.type.split('/')[1] as FirestoreEvidence['tipo']) || 'other',
          comment: evidenceComment.trim() || undefined,
          dataUrl: dataUrl,
        };
      }

      const rcaDocRef = doc(db, 'rcaAnalyses', selectedPlan._originalRcaDocId);
      const docSnap = await getDoc(rcaDocRef);
      if (!docSnap.exists()) throw new Error("El documento de análisis no se encontró.");

      const currentRcaDoc = docSnap.data() as RCAAnalysisDocument;
      let actionToNotify: ActionPlan | undefined;
      
      const updatedPlannedActions = currentRcaDoc.plannedActions.map(action => {
        if (action.id === selectedPlan._originalActionId) {
          const currentDateISO = new Date().toISOString();
          const updatedEvidences = newEvidencePayload ? [...(action.evidencias || []), newEvidencePayload] : action.evidencias;
          actionToNotify = {
            ...selectedPlan,
            evidencias: updatedEvidences,
            userComments: selectedPlan.userComments,
            estado: 'En Validación'
          };
          return {
              ...action,
              evidencias: updatedEvidences,
              userComments: selectedPlan.userComments,
              markedAsReadyAt: currentDateISO
          }
        }
        return action;
      });
      
      await updateDoc(rcaDocRef, sanitizeForFirestore({
          plannedActions: updatedPlannedActions,
          updatedAt: new Date().toISOString(),
      }));
      
      toast({ title: "Tarea Lista para Validación" });
      setSelectedPlan(prev => prev ? {...prev, estado: 'En Validación'} : null);

      if (fileToUpload) {
          setEvidenceComment('');
          setFileToUpload(null);
          const fileInput = document.getElementById('evidence-file-input') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
      }

      if (actionToNotify) {
        const validatorProfile = availableUsers.find(u => u.name === selectedPlan.validatorName);
        if (validatorProfile?.email && (validatorProfile.emailNotifications === undefined || validatorProfile.emailNotifications)) {
          const emailSubject = `Acción Lista para Validación: ${selectedPlan.accionResumen} (ACR: ${selectedPlan.codigoRCA})`;
          const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
          const validationLink = `${baseUrl}/analisis?id=${selectedPlan._originalRcaDocId}&step=4`;
          const emailBody = `Estimado/a ${validatorProfile.name},\n\nEl usuario ${userProfile.name} ha marcado la siguiente acción como lista para su validación:\n\nEvento ACR: ${selectedPlan.tituloDetalle}\nAcción: ${actionToNotify.descripcionDetallada}\n\nPor favor, acceda al sistema para validar esta acción. Puede ir directamente usando el siguiente enlace:\n${validationLink}\n\nSaludos,\nSistema Asistente ACR`;
          sendEmailAction({ to: validatorProfile.email, subject: emailSubject, body: emailBody });
        }
      }
    } catch (error) {
      console.error("Error in handleSignalTaskReadyForValidation:", error);
      toast({ title: "Error Inesperado", description: `Ocurrió un error al procesar la tarea: ${(error as Error).message}`, variant: "destructive" });
    } finally {
      setIsUpdatingAction(false);
    }
  };


  if (loadingAuth) {
    return <div className="flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Paso 2.5: Tareas y Evidencias</CardTitle>
        <CardDescription>
            Gestione las tareas del plan de acción para este análisis. Seleccione una tarea para ver sus detalles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[5%]"></TableHead>
              <TableHead className="w-[45%]">Acción (Resumen)</TableHead>
              <TableHead className="w-[25%]">Responsable</TableHead>
              <TableHead className="w-[15%]">Estado</TableHead>
              <TableHead className="w-[10%]">Plazo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignedActionPlans.length > 0 ? assignedActionPlans.map(plan => (
              <TableRow 
                key={plan.id}
                onClick={() => handleSelectPlan(plan)}
                className={cn("cursor-pointer", selectedPlan?.id === plan.id && "bg-accent/50")}
              >
                <TableCell><Checkbox checked={selectedPlan?.id === plan.id} /></TableCell>
                <TableCell className="font-medium">{plan.accionResumen}</TableCell>
                <TableCell>{plan.responsableDetalle}</TableCell>
                <TableCell>
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold",
                    plan.estado === 'Pendiente' && 'bg-orange-100 text-orange-700',
                    plan.estado === 'En Validación' && 'bg-blue-100 text-blue-700',
                    plan.estado === 'Completado' && 'bg-green-100 text-green-700',
                    plan.estado === 'Rechazado' && 'bg-destructive/10 text-destructive'
                  )}>{plan.estado}</span>
                </TableCell>
                <TableCell>{plan.plazoLimite}</TableCell>
              </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                        No hay planes de acción definidos para este análisis.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
        
        {selectedPlan && (
          <Card className="shadow-lg animate-in fade-in-50 duration-300 mt-4">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-primary">Detalle del Plan Seleccionado</CardTitle>
              <CardDescription>ID Acción: {selectedPlan.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div><Label className="font-semibold">Descripción Completa de la Acción:</Label><p className="whitespace-pre-line bg-muted/20 p-2 rounded-md">{selectedPlan.descripcionDetallada}</p></div>
              <div className="pt-2"><h4 className="font-semibold text-primary mb-1">[Evidencias Adjuntas]</h4>
                  {selectedPlan.evidencias.length > 0 ? (<ul className="space-y-1.5">
                      {selectedPlan.evidencias.map(ev => (<li key={ev.id} className="flex items-start justify-between text-xs border p-2 rounded-md bg-muted/10">
                          <div className="flex-grow"><div className="flex items-center">{getEvidenceIconLocal(ev.tipo)}<span className="font-medium">{ev.nombre}</span></div>
                            {ev.comment && <p className="text-xs text-muted-foreground ml-[calc(1rem+0.5rem)] mt-0.5">Comentario: {ev.comment}</p>}</div>
                          <div className="flex-shrink-0 ml-2">
                             <Button asChild variant="link" size="sm" className="p-0 h-auto text-xs mr-2"><a href={ev.dataUrl} target="_blank" rel="noopener noreferrer" download={ev.nombre}><ExternalLink className="mr-1 h-3 w-3" />Ver/Descargar</a></Button>
                             <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/10" onClick={() => handleRemoveEvidence(ev.id)} disabled={isUpdatingAction || selectedPlan.estado === 'Completado' || selectedPlan.estado === 'Rechazado'} aria-label="Eliminar evidencia"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </div>
                          </li>))}</ul>
                  ) : <p className="text-xs text-muted-foreground">No hay evidencias adjuntas.</p>}</div>
                <div className="pt-2"><h4 className="font-semibold text-primary mb-1">[Adjuntar nueva evidencia]</h4>
                  <div className="space-y-2">
                    <Label htmlFor="evidence-file-input">Archivo de Evidencia</Label>
                    <Input id="evidence-file-input" type="file" onChange={handleFileChange} className="text-xs h-9" disabled={isUpdatingAction || selectedPlan.estado === 'Completado' || selectedPlan.estado === 'Rechazado'} />
                    <Label htmlFor="evidence-comment">Comentario para esta evidencia (opcional)</Label>
                    <Input id="evidence-comment" type="text" placeholder="Ej: Foto de la reparación, documento de capacitación..." value={evidenceComment} onChange={(e) => setEvidenceComment(e.target.value)} className="text-xs h-9" disabled={isUpdatingAction || selectedPlan.estado === 'Completado' || selectedPlan.estado === 'Rechazado'} />
                  </div>
                  {fileToUpload && <p className="text-xs text-muted-foreground mt-1">Archivo seleccionado: {fileToUpload.name}</p>}
                </div>
              <div className="pt-2"><div className="flex justify-between items-center mb-1"><h4 className="font-semibold text-primary flex items-center"><MessageSquare className="mr-1.5 h-4 w-4" />[Mis Comentarios Generales para la Tarea]</h4></div>
                  <Textarea value={selectedPlan.userComments || ''} onChange={(e) => setSelectedPlan(prev => prev ? { ...prev, userComments: e.target.value } : null)} placeholder="Añada sus comentarios sobre el progreso o finalización de esta tarea..." rows={3} className="text-sm" disabled={isUpdatingAction || selectedPlan.estado === 'Completado' || selectedPlan.estado === 'Rechazado'} /></div>
              <div className="pt-2"><h4 className="font-semibold text-primary mb-1">[Actualizar estado de esta tarea]</h4>
                  <div className="flex items-center gap-2">
                     <Button size="sm" variant="default" onClick={handleSignalTaskReadyForValidation} disabled={isUpdatingAction || ['Completado', 'En Validación', 'Rechazado'].includes(selectedPlan.estado) || (!fileToUpload && !(selectedPlan.userComments && selectedPlan.userComments.trim()))} title={selectedPlan.estado === 'Completado' ? "Esta tarea ya ha sido validada y no puede modificarse." : ['En Validación', 'Rechazado'].includes(selectedPlan.estado) ? `La tarea ya está en estado '${selectedPlan.estado}'` : (!fileToUpload && !(selectedPlan.userComments && selectedPlan.userComments.trim())) ? "Debe adjuntar un archivo o agregar un comentario para marcar la tarea como lista." : "Guardar evidencias, comentarios y marcar la tarea como lista para ser validada por el Líder del Proyecto."}>
                      {isUpdatingAction ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />} 
                      {isUpdatingAction ? 'Procesando...' : 'Marcar como listo para validación'}
                    </Button>
                    {selectedPlan.estado === 'En Validación' && (<span className="text-xs text-green-600 flex items-center ml-2 p-1.5 bg-green-50 border border-green-200 rounded-md"><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Listo para Validar</span>)}</div></div>
            </CardContent>
          </Card>
        )}

      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={onPrevious} variant="outline" disabled={isSaving || isUpdatingAction}>Anterior</Button>
        <Button onClick={onNext} disabled={isSaving || isUpdatingAction}>
          {(isSaving || isUpdatingAction) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Siguiente
        </Button>
      </CardFooter>
    </Card>
  );
};
