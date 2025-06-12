
'use client';

import { useState, useMemo, useEffect, useCallback, ChangeEvent } from 'react';
import type { FullUserProfile, RCAAnalysisDocument, PlannedAction as FirestorePlannedAction, Evidence as FirestoreEvidence, Validation } from '@/types/rca';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ListTodo, FileText, ImageIcon, Paperclip, UploadCloud, CheckCircle2, Save, Info, MessageSquare, UserCog, Loader2, CalendarCheck, History, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { format, parseISO, isValid as isValidDate } from 'date-fns';
import { es } from 'date-fns/locale';

interface ActionPlan {
  id: string;
  accionResumen: string;
  estado: 'Pendiente' | 'En proceso' | 'Completado';
  plazoLimite: string;
  asignadoPor: string;
  tituloDetalle: string;
  descripcionDetallada: string;
  responsableDetalle: string;
  codigoRCA: string;
  evidencias: FirestoreEvidence[];
  userComments?: string;
  userMarkedReadyDate?: string;
  validationDate?: string;
  ultimaActualizacion: {
    usuario: string;
    mensaje: string;
    fechaRelativa: string;
  };
  _originalRcaDocId: string;
  _originalActionId: string;
}

const NONE_USER_VALUE = "--NONE--";

export default function UserActionPlansPage() {
  const { toast } = useToast();

  const [availableUsers, setAvailableUsers] = useState<FullUserProfile[]>([]);
  const [selectedSimulatedUserName, setSelectedSimulatedUserName] = useState<string | null>(null);
  const [allRcaDocuments, setAllRcaDocuments] = useState<RCAAnalysisDocument[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingActions, setIsLoadingActions] = useState(true);
  const [isUpdatingAction, setIsUpdatingAction] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<ActionPlan | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [evidenceComment, setEvidenceComment] = useState(''); // State for evidence comment

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const usersCollectionRef = collection(db, "users");
      const q = query(usersCollectionRef, orderBy("name", "asc"));
      const querySnapshot = await getDocs(q);
      const usersData = querySnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() } as FullUserProfile));
      setAvailableUsers(usersData);
    } catch (error) {
      console.error("Error fetching users: ", error);
      toast({ title: "Error al Cargar Usuarios", description: "No se pudieron cargar los usuarios.", variant: "destructive" });
    } finally {
      setIsLoadingUsers(false);
    }
  }, [toast]);

  const fetchRcaDocuments = useCallback(async () => {
    setIsLoadingActions(true);
    try {
      const rcaCollectionRef = collection(db, "rcaAnalyses");
      const q = query(rcaCollectionRef, orderBy("updatedAt", "desc"));
      const querySnapshot = await getDocs(q);
      const rcaData = querySnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() } as RCAAnalysisDocument));
      setAllRcaDocuments(rcaData);
    } catch (error) {
      console.error("Error fetching RCA documents: ", error);
      toast({ title: "Error al Cargar Análisis RCA", description: "No se pudieron cargar los documentos de análisis.", variant: "destructive" });
    } finally {
      setIsLoadingActions(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
    fetchRcaDocuments();
  }, [fetchUsers, fetchRcaDocuments]);

  const currentUserActionPlans = useMemo(() => {
    if (!selectedSimulatedUserName || allRcaDocuments.length === 0) {
      return [];
    }
    const plans: ActionPlan[] = [];
    const uniqueTracker = new Set<string>();

    allRcaDocuments.forEach(rcaDoc => {
      if (rcaDoc.plannedActions && rcaDoc.plannedActions.length > 0) {
        rcaDoc.plannedActions.forEach(pa => {
          if (pa.responsible === selectedSimulatedUserName) {
            const uniqueKey = pa.id; // Use pa.id as it should be globally unique
            if (!uniqueTracker.has(uniqueKey)) {
              uniqueTracker.add(uniqueKey);

              let estado: ActionPlan['estado'] = 'Pendiente';
              let validationTimestamp: string | undefined = undefined;
              let userMarkedReadyTimestamp: string | undefined = undefined;

              const validation = rcaDoc.validations?.find(v => v.actionId === pa.id);

              if (validation?.status === 'validated') {
                estado = 'Completado';
                if (validation.validatedAt && isValidDate(parseISO(validation.validatedAt))) {
                  validationTimestamp = format(parseISO(validation.validatedAt), 'dd/MM/yyyy HH:mm', { locale: es });
                }
              } else if ((pa.userComments && pa.userComments.trim() !== '') || (pa.evidencias && pa.evidencias.length > 0) || pa.markedAsReadyAt) {
                estado = 'En proceso';
              }

              if (pa.markedAsReadyAt && isValidDate(parseISO(pa.markedAsReadyAt))) {
                userMarkedReadyTimestamp = format(parseISO(pa.markedAsReadyAt), 'dd/MM/yyyy HH:mm', { locale: es });
              }

              plans.push({
                id: pa.id,
                _originalRcaDocId: rcaDoc.eventData.id,
                _originalActionId: pa.id,
                accionResumen: pa.description.substring(0, 50) + (pa.description.length > 50 ? "..." : ""),
                estado,
                plazoLimite: pa.dueDate && isValidDate(parseISO(pa.dueDate)) ? format(parseISO(pa.dueDate), 'dd/MM/yyyy', { locale: es }) : 'N/A',
                asignadoPor: rcaDoc.projectLeader || 'Sistema',
                tituloDetalle: rcaDoc.eventData.focusEventDescription || 'Sin título',
                descripcionDetallada: pa.description,
                responsableDetalle: pa.responsible,
                codigoRCA: rcaDoc.eventData.id,
                evidencias: pa.evidencias || [],
                userComments: pa.userComments || '',
                userMarkedReadyDate: userMarkedReadyTimestamp,
                validationDate: validationTimestamp,
                ultimaActualizacion: {
                  usuario: 'Sistema',
                  mensaje: 'Actualizado',
                  fechaRelativa: rcaDoc.updatedAt && isValidDate(parseISO(rcaDoc.updatedAt)) ? format(parseISO(rcaDoc.updatedAt), 'dd/MM/yyyy HH:mm', { locale: es }) : 'N/A',
                }
              });
            }
          }
        });
      }
    });
    return plans.sort((a, b) => {
      const dateA = a.plazoLimite !== 'N/A' ? parseISO(a.plazoLimite.split('/').reverse().join('-')) : null;
      const dateB = b.plazoLimite !== 'N/A' ? parseISO(b.plazoLimite.split('/').reverse().join('-')) : null;
      if (dateA && dateB) {
        if (dateA.getTime() !== dateB.getTime()) return dateA.getTime() - dateB.getTime();
      } else if (dateA) return -1;
      else if (dateB) return 1;
      return a.tituloDetalle.localeCompare(b.tituloDetalle);
    });
  }, [selectedSimulatedUserName, allRcaDocuments]);


  const summary = useMemo(() => {
    return {
      pendientes: currentUserActionPlans.filter(p => p.estado === 'Pendiente').length,
      enProceso: currentUserActionPlans.filter(p => p.estado === 'En proceso').length,
      completadas: currentUserActionPlans.filter(p => p.estado === 'Completado').length,
    };
  }, [currentUserActionPlans]);

  const handleSelectPlan = (plan: ActionPlan) => {
    setSelectedPlan(plan);
    setFileToUpload(null);
    setEvidenceComment(''); // Reset evidence comment when selecting a new plan
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFileToUpload(event.target.files[0]);
    } else {
      setFileToUpload(null);
    }
  };

  const updateActionInFirestore = async (
    rcaDocId: string,
    actionId: string,
    updates: Partial<FirestorePlannedAction>
  ): Promise<boolean> => {
    setIsUpdatingAction(true);
    try {
      const rcaDocRef = doc(db, "rcaAnalyses", rcaDocId);
      const rcaDocData = allRcaDocuments.find(d => d.eventData.id === rcaDocId);
      if (!rcaDocData) {
        toast({ title: "Error", description: "No se encontró el documento RCA para actualizar.", variant: "destructive" });
        setIsUpdatingAction(false);
        return false;
      }

      const updatedPlannedActions = rcaDocData.plannedActions.map(action => {
        if (action.id === actionId) {
          const actionWithOtherUpdates = { ...action, ...updates };

          if (actionWithOtherUpdates.evidencias && Array.isArray(actionWithOtherUpdates.evidencias)) {
            const seenEvidenceIds = new Set<string>();
            actionWithOtherUpdates.evidencias = actionWithOtherUpdates.evidencias.filter(ev => {
              if (!ev || typeof ev.id !== 'string') return false;
              if (seenEvidenceIds.has(ev.id)) {
                return false;
              }
              seenEvidenceIds.add(ev.id);
              return true;
            });
          }
          return actionWithOtherUpdates;
        }
        return action;
      });

      await updateDoc(rcaDocRef, {
        plannedActions: updatedPlannedActions,
        updatedAt: new Date().toISOString()
      });

      setAllRcaDocuments(prevDocs =>
        prevDocs.map(d =>
          d.eventData.id === rcaDocId
            ? { ...d, plannedActions: updatedPlannedActions, updatedAt: new Date().toISOString() }
            : d
        )
      );

      if (selectedPlan && selectedPlan._originalRcaDocId === rcaDocId && selectedPlan._originalActionId === actionId) {
        const newSelectedPlanDataFirestore = updatedPlannedActions.find(pa => pa.id === actionId);
        if (newSelectedPlanDataFirestore) {
          let newEstado: ActionPlan['estado'] = 'Pendiente';
          let validationTimestamp: string | undefined = undefined;
          const validation = rcaDocData.validations?.find(v => v.actionId === actionId);

          if (validation?.status === 'validated') {
            newEstado = 'Completado';
            if (validation.validatedAt && isValidDate(parseISO(validation.validatedAt))) {
              validationTimestamp = format(parseISO(validation.validatedAt), 'dd/MM/yyyy HH:mm', { locale: es });
            }
          } else if ((newSelectedPlanDataFirestore.userComments && newSelectedPlanDataFirestore.userComments.trim() !== '') ||
            (newSelectedPlanDataFirestore.evidencias && newSelectedPlanDataFirestore.evidencias.length > 0) ||
            newSelectedPlanDataFirestore.markedAsReadyAt) {
            newEstado = 'En proceso';
          }

          let userMarkedReadyTimestamp: string | undefined = undefined;
          if (newSelectedPlanDataFirestore.markedAsReadyAt && isValidDate(parseISO(newSelectedPlanDataFirestore.markedAsReadyAt))) {
            userMarkedReadyTimestamp = format(parseISO(newSelectedPlanDataFirestore.markedAsReadyAt), 'dd/MM/yyyy HH:mm', { locale: es });
          }

          setSelectedPlan(prev => prev ? ({
            ...prev,
            evidencias: newSelectedPlanDataFirestore.evidencias || [], // Ensure evidences array is updated
            userComments: newSelectedPlanDataFirestore.userComments || '', // Ensure comments are updated
            estado: newEstado,
            userMarkedReadyDate: userMarkedReadyTimestamp,
            validationDate: validationTimestamp,
            ultimaActualizacion: {
              usuario: selectedSimulatedUserName || "Sistema",
              mensaje: "Datos actualizados en Firestore.",
              fechaRelativa: format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })
            }
          }) : null);
        }
      }
      return true;
    } catch (error) {
      console.error("Error updating action in Firestore: ", error);
      toast({ title: "Error al Actualizar", description: "No se pudo actualizar la acción en la base de datos.", variant: "destructive" });
      return false;
    } finally {
      setIsUpdatingAction(false);
    }
  };


  const handleUploadEvidence = async () => {
    if (!selectedPlan || !fileToUpload) {
      toast({ title: "Error", description: "Seleccione un plan y un archivo.", variant: "destructive" });
      return;
    }

    const newEvidence: FirestoreEvidence = {
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      nombre: fileToUpload.name,
      tipo: (fileToUpload.name.split('.').pop()?.toLowerCase() as FirestoreEvidence['tipo']) || 'other',
      comment: evidenceComment.trim() || undefined,
    };

    const currentEvidences = selectedPlan.evidencias || [];
    const success = await updateActionInFirestore(selectedPlan._originalRcaDocId, selectedPlan._originalActionId, {
      evidencias: [...currentEvidences, newEvidence]
    });

    if (success) {
      toast({ title: "Evidencia (Simulación)", description: `Archivo "${fileToUpload.name}" ${newEvidence.comment ? `con comentario "${newEvidence.comment.substring(0,20)}..." ` : ""}registrado para "${selectedPlan.tituloDetalle}".` });
      setFileToUpload(null);
      setEvidenceComment(''); // Clear comment field
      const fileInput = document.getElementById('evidence-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  };

  const handleRemoveEvidence = async (evidenceIdToRemove: string) => {
    if (!selectedPlan) return;

    const updatedEvidences = selectedPlan.evidencias.filter(ev => ev.id !== evidenceIdToRemove);
    const success = await updateActionInFirestore(selectedPlan._originalRcaDocId, selectedPlan._originalActionId, {
      evidencias: updatedEvidences
    });

    if (success) {
      toast({ title: "Evidencia Eliminada", description: `La evidencia ha sido eliminada del plan "${selectedPlan.tituloDetalle}".`, variant: 'destructive' });
    }
  };


  const handleUserCommentsChangeAndSave = async (comments: string) => {
    if (!selectedPlan) return;

    const success = await updateActionInFirestore(selectedPlan._originalRcaDocId, selectedPlan._originalActionId, {
      userComments: comments
    });

    if (success) {
      toast({ title: "Comentarios Guardados", description: `Se guardaron los comentarios para el plan "${selectedPlan.tituloDetalle}".` });
    }
  };

  const handleSignalTaskReadyForValidation = async () => {
    if (!selectedPlan) return;
    if (selectedPlan.estado === 'Completado') {
      toast({ title: "Acción ya Completada", description: "Esta tarea ya ha sido validada y completada.", variant: "default" });
      return;
    }

    let commentsToSave = selectedPlan.userComments || "";
    if (selectedPlan.estado === 'Pendiente' && !commentsToSave.trim() && (!selectedPlan.evidencias || selectedPlan.evidencias.length === 0) && !selectedPlan.userMarkedReadyDate) {
      commentsToSave = (commentsToSave ? commentsToSave + "\n\n" : "") + `[Sistema] Tarea marcada como lista para validación por ${selectedSimulatedUserName || 'el responsable'} el ${new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.`;
    }

    const updatesForAction: Partial<FirestorePlannedAction> = {
      userComments: commentsToSave,
      markedAsReadyAt: new Date().toISOString(),
    };

    const success = await updateActionInFirestore(selectedPlan._originalRcaDocId, selectedPlan._originalActionId, updatesForAction);

    if (success) {
      toast({
        title: "Tarea Lista para Validación",
        description: `La tarea "${selectedPlan.tituloDetalle}" se ha actualizado. El Líder del Proyecto la revisará.`
      });
    }
  };


  const getEvidenceIcon = (tipo?: FirestoreEvidence['tipo']) => {
    if (!tipo) return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />;
    switch (tipo) {
      case 'pdf': return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-red-600" />;
      case 'jpg': case 'jpeg': case 'png': return <ImageIcon className="h-4 w-4 mr-2 flex-shrink-0 text-blue-600" />;
      case 'doc': case 'docx': return <Paperclip className="h-4 w-4 mr-2 flex-shrink-0 text-sky-700" />;
      default: return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />;
    }
  };

  const isLoading = isLoadingUsers || isLoadingActions;
  const validUsersForSelect = useMemo(() => availableUsers.filter(user => user.name && user.name.trim() !== ""), [availableUsers]);


  return (
    <div className="space-y-6 py-8">
      <header className="text-center mb-6">
        <h1 className="text-3xl font-bold font-headline text-primary">
          Mis Planes de Acción
        </h1>
        <p className="text-sm text-muted-foreground">Gestione las tareas que le han sido asignadas.</p>
      </header>

      <Card className="shadow-md">
        <CardHeader>
          <Label htmlFor="simulatedUser" className="flex items-center font-medium text-primary">
            <UserCog className="mr-2 h-5 w-5" />
            Visualizar Tareas Asignadas a:
          </Label>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedSimulatedUserName || NONE_USER_VALUE}
            onValueChange={(value) => {
              setSelectedSimulatedUserName(value === NONE_USER_VALUE ? null : value);
              setSelectedPlan(null);
            }}
            disabled={isLoadingUsers}
          >
            <SelectTrigger id="simulatedUser" className="max-w-md">
              <SelectValue placeholder="-- Seleccione un Usuario --" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_USER_VALUE}>-- Ninguno --</SelectItem>
              {validUsersForSelect.length > 0
                ? validUsersForSelect.map(user => (
                  user.name && user.name.trim() !== "" && (
                    <SelectItem key={user.id} value={user.name}>
                      {user.name} ({user.email})
                    </SelectItem>
                  )
                ))
                : (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                    {availableUsers.length === 0 ? "No hay usuarios configurados" : "No hay usuarios con nombres válidos"}
                  </div>
                )
              }
            </SelectContent>
          </Select>
          {isLoadingUsers && <p className="text-xs text-muted-foreground mt-1 flex items-center"><Loader2 className="h-3 w-3 animate-spin mr-1" />Cargando usuarios...</p>}
        </CardContent>
      </Card>


      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-primary">Resumen Rápido (Para: {selectedSimulatedUserName || "Nadie"})</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-secondary/40 rounded-md">
            <p className="text-2xl font-bold text-destructive">{isLoadingActions ? <Loader2 className="h-6 w-6 animate-spin inline" /> : summary.pendientes}</p>
            <p className="text-xs text-muted-foreground">Acciones Pendientes</p>
          </div>
          <div className="p-3 bg-secondary/40 rounded-md">
            <p className="text-2xl font-bold text-yellow-600">{isLoadingActions ? <Loader2 className="h-6 w-6 animate-spin inline" /> : summary.enProceso}</p>
            <p className="text-xs text-muted-foreground">En Proceso</p>
          </div>
          <div className="p-3 bg-secondary/40 rounded-md">
            <p className="text-2xl font-bold text-green-600">{isLoadingActions ? <Loader2 className="h-6 w-6 animate-spin inline" /> : summary.completadas}</p>
            <p className="text-xs text-muted-foreground">Completadas</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-primary">Lista de Planes de Acción Asignados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingActions ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Cargando acciones...</p>
            </div>
          ) : !selectedSimulatedUserName ? (
            <p className="text-center text-muted-foreground py-10">Por favor, seleccione un usuario para ver sus tareas asignadas.</p>
          ) : currentUserActionPlans.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">No hay planes de acción asignados a {selectedSimulatedUserName}.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[35%]">Acción (Resumen)</TableHead>
                    <TableHead className="w-[15%]">Estado</TableHead>
                    <TableHead className="w-[15%]">Plazo Límite</TableHead>
                    <TableHead className="w-[20%]">Asignado Por (Líder RCA)</TableHead>
                    <TableHead className="w-[15%]">ID RCA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentUserActionPlans.map((plan) => (
                    <TableRow
                      key={plan.id}
                      onClick={() => handleSelectPlan(plan)}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        selectedPlan?.id === plan.id && selectedPlan?._originalRcaDocId === plan._originalRcaDocId && "bg-accent/50 hover:bg-accent/60"
                      )}
                    >
                      <TableCell className="font-medium">{plan.accionResumen}</TableCell>
                      <TableCell>
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold",
                          plan.estado === 'Pendiente' && 'bg-red-100 text-red-700',
                          plan.estado === 'En proceso' && 'bg-yellow-100 text-yellow-700',
                          plan.estado === 'Completado' && 'bg-green-100 text-green-700'
                        )}>
                          {plan.estado}
                        </span>
                      </TableCell>
                      <TableCell>{plan.plazoLimite}</TableCell>
                      <TableCell>{plan.asignadoPor}</TableCell>
                      <TableCell className="font-mono text-xs">{plan.codigoRCA.substring(0, 8)}...</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPlan && (
        <Card className="shadow-lg animate-in fade-in-50 duration-300">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary">Detalle del Plan Seleccionado</CardTitle>
            <CardDescription>ID Acción: {selectedPlan.id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <Label className="font-semibold">Título del RCA:</Label>
              <p>{selectedPlan.tituloDetalle} (ID RCA: {selectedPlan.codigoRCA})</p>
            </div>
            <div>
              <Label className="font-semibold">Descripción Completa de la Acción:</Label>
              <p className="whitespace-pre-line bg-muted/20 p-2 rounded-md">{selectedPlan.descripcionDetallada}</p>
            </div>
            <div><Label className="font-semibold">Responsable:</Label> <p>{selectedPlan.responsableDetalle}</p></div>
            <div><Label className="font-semibold">Estado Actual:</Label> <p>{selectedPlan.estado}</p></div>
            <div><Label className="font-semibold">Plazo límite:</Label> <p>{selectedPlan.plazoLimite}</p></div>

            {selectedPlan.userMarkedReadyDate && (
              <div>
                <Label className="font-semibold flex items-center"><History className="mr-1.5 h-4 w-4 text-blue-600" />Marcado como Listo el:</Label>
                <p className="text-blue-700">{selectedPlan.userMarkedReadyDate}</p>
              </div>
            )}
            {selectedPlan.estado === 'Completado' && selectedPlan.validationDate && (
              <div>
                <Label className="font-semibold flex items-center"><CalendarCheck className="mr-1.5 h-4 w-4 text-green-600" />Fecha de Validación Final:</Label>
                <p className="text-green-700">{selectedPlan.validationDate}</p>
              </div>
            )}

            <div className="pt-2">
              <h4 className="font-semibold text-primary mb-1">[Evidencias Adjuntas]</h4>
              {selectedPlan.evidencias.length > 0 ? (
                <ul className="space-y-1.5">
                  {selectedPlan.evidencias.map(ev => (
                    <li key={ev.id} className="flex items-start justify-between text-xs border p-2 rounded-md bg-muted/10">
                      <div className="flex-grow">
                        <div className="flex items-center">
                           {getEvidenceIcon(ev.tipo)}
                           <span className="font-medium">{ev.nombre}</span>
                        </div>
                        {ev.comment && <p className="text-xs text-muted-foreground ml-[calc(1rem+0.5rem)] mt-0.5">Comentario: {ev.comment}</p>}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-2 shrink-0 hover:bg-destructive/10"
                        onClick={() => handleRemoveEvidence(ev.id)}
                        disabled={isUpdatingAction || selectedPlan.estado === 'Completado'}
                        aria-label="Eliminar evidencia"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-muted-foreground">No hay evidencias adjuntas.</p>}
            </div>

            <div className="pt-2">
              <h4 className="font-semibold text-primary mb-1">[Adjuntar nueva evidencia]</h4>
              <div className="space-y-2">
                <Input
                  id="evidence-file-input"
                  type="file"
                  onChange={handleFileChange}
                  className="text-xs h-9"
                  disabled={isUpdatingAction || selectedPlan.estado === 'Completado'}
                />
                <Input
                  type="text"
                  placeholder="Comentario para esta evidencia (opcional)..."
                  value={evidenceComment}
                  onChange={(e) => setEvidenceComment(e.target.value)}
                  className="text-xs h-9"
                  disabled={isUpdatingAction || selectedPlan.estado === 'Completado'}
                />
                <Button
                  size="sm"
                  onClick={handleUploadEvidence}
                  disabled={!fileToUpload || isUpdatingAction || selectedPlan.estado === 'Completado'}
                  className="w-full sm:w-auto"
                >
                  {isUpdatingAction && fileToUpload ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-1.5 h-4 w-4" />} Subir Evidencia
                </Button>
              </div>
              {fileToUpload && <p className="text-xs text-muted-foreground mt-1">Archivo seleccionado: {fileToUpload.name}</p>}
            </div>

            <div className="pt-2">
              <h4 className="font-semibold text-primary mb-1 flex items-center">
                <MessageSquare className="mr-1.5 h-4 w-4" />
                [Mis Comentarios Generales para la Tarea]
              </h4>
              <Textarea
                value={selectedPlan.userComments || ''}
                onChange={(e) => setSelectedPlan(prev => prev ? { ...prev, userComments: e.target.value } : null)}
                placeholder="Añada sus comentarios sobre el progreso o finalización de esta tarea..."
                rows={3}
                className="text-sm"
                disabled={isUpdatingAction || selectedPlan.estado === 'Completado'}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleUserCommentsChangeAndSave(selectedPlan.userComments || '')}
                className="mt-2"
                disabled={isUpdatingAction || selectedPlan.estado === 'Completado' || selectedPlan.userComments === (allRcaDocuments.find(d => d.eventData.id === selectedPlan._originalRcaDocId)?.plannedActions.find(pa => pa.id === selectedPlan._originalActionId)?.userComments || '')}
              >
                {isUpdatingAction && selectedPlan.userComments !== (allRcaDocuments.find(d => d.eventData.id === selectedPlan._originalRcaDocId)?.plannedActions.find(pa => pa.id === selectedPlan._originalActionId)?.userComments || '') ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />} Guardar Comentarios
              </Button>
            </div>

            <div className="pt-2">
              <h4 className="font-semibold text-primary mb-1">[Actualizar estado de esta tarea]</h4>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleSignalTaskReadyForValidation}
                  disabled={isUpdatingAction || selectedPlan.estado === 'Completado'}
                  title={selectedPlan.estado === 'Completado' ? "Esta tarea ya ha sido validada y no puede modificarse." : "Indicar que ha completado su parte de la tarea y está lista para ser validada por el Líder del Proyecto."}
                >
                  {isUpdatingAction ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
                  Marcar como listo para validación
                </Button>
              </div>
            </div>

            <div className="pt-2">
              <h4 className="font-semibold text-primary mb-1">[Notas del sistema]</h4>
              <div className="text-xs bg-secondary/30 p-2 rounded-md">
                <p>Última actualización del RCA: {selectedPlan.ultimaActualizacion.fechaRelativa}</p>
                {selectedPlan.estado === 'Completado' && <p className="text-green-600 font-medium">Esta acción ha sido validada y marcada como completada en el análisis RCA.</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700">
        <CardContent className="pt-4">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2.5 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-0.5">Nota sobre la funcionalidad</h3>
              <p className="text-xs text-blue-600 dark:text-blue-400/90">
                Seleccione un usuario para ver sus tareas. Puede adjuntar (simulado) evidencias con comentarios opcionales y eliminar evidencias.
                Al marcar "listo para validación", se registrará la fecha y hora actual, y si la tarea estaba 'Pendiente' y sin otros datos, se añadirá una nota automática.
                Estos cambios se guardarán en el documento de Análisis de Causa Raíz correspondiente en Firestore.
                La validación final para el estado 'Completado' (con su propia fecha de validación) se realiza en el Paso 4 del flujo de Análisis RCA por el líder del proyecto.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
