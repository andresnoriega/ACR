
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
import { ListTodo, FileText, ImageIcon, Paperclip, UploadCloud, CheckCircle2, Save, Info, MessageSquare, UserCog, Loader2, CalendarCheck, History, Trash2, Mail, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { format, parseISO, isValid as isValidDate } from 'date-fns';
import { es } from 'date-fns/locale';
import { sendEmailAction } from '@/app/actions';
import { sanitizeForFirestore } from '@/lib/utils';

interface ActionPlan {
  id: string;
  accionResumen: string;
  estado: 'Pendiente' | 'En proceso' | 'En Validación' | 'Completado';
  plazoLimite: string;
  asignadoPor: string; 
  validatorName?: string; 
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

type SortableActionPlanKey = 'accionResumen' | 'id' | 'estado' | 'plazoLimite' | 'validatorName' | 'codigoRCA';

interface SortConfig {
  key: SortableActionPlanKey | null;
  direction: 'ascending' | 'descending';
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
  const [evidenceComment, setEvidenceComment] = useState('');
  
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'plazoLimite', direction: 'ascending' });

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
            const uniqueKey = pa.id;
            if (!uniqueTracker.has(uniqueKey)) {
              uniqueTracker.add(uniqueKey);

              let estado: ActionPlan['estado'] = 'Pendiente';
              let userMarkedReadyTimestamp: string | undefined = undefined;
              let validationTimestamp: string | undefined = undefined;
              
              const validation = rcaDoc.validations?.find(v => v.actionId === pa.id);

              if (validation?.status === 'validated') {
                estado = 'Completado';
                if (validation.validatedAt && isValidDate(parseISO(validation.validatedAt))) {
                  validationTimestamp = format(parseISO(validation.validatedAt), 'dd/MM/yyyy HH:mm', { locale: es });
                }
              } else if (pa.evidencias && pa.evidencias.length > 0) {
                estado = 'En Validación';
              } else if ((pa.userComments && pa.userComments.trim() !== '') || pa.markedAsReadyAt) {
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
                validatorName: rcaDoc.projectLeader || 'N/A',
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
    return plans;
  }, [selectedSimulatedUserName, allRcaDocuments]);

  const requestSort = (key: SortableActionPlanKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedActionPlans = useMemo(() => {
    let sortableItems = [...currentUserActionPlans];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key!];
        const valB = b[sortConfig.key!];
  
        if (sortConfig.key === 'plazoLimite') {
          const dateAStr = String(valA);
          const dateBStr = String(valB);
          const dateA = dateAStr === 'N/A' ? null : parseISO(dateAStr.split('/').reverse().join('-'));
          const dateB = dateBStr === 'N/A' ? null : parseISO(dateBStr.split('/').reverse().join('-'));
  
          if (dateA === null && dateB === null) return 0;
          if (dateA === null) return 1; 
          if (dateB === null) return -1;
          if (isValidDate(dateA) && isValidDate(dateB)) {
            return dateA.getTime() - dateB.getTime();
          }
          return 0;
        }
  
        if (typeof valA === 'string' && typeof valB === 'string') {
          return valA.localeCompare(valB);
        }
        if (typeof valA === 'number' && typeof valB === 'number') { // Should not happen with current keys
          return valA - valB;
        }
        
        const strA = String(valA ?? '').toLowerCase();
        const strB = String(valB ?? '').toLowerCase();
        if (strA < strB) return -1;
        if (strA > strB) return 1;
        return 0;
      });
  
      if (sortConfig.direction === 'descending') {
        sortableItems.reverse();
      }
    }
    return sortableItems;
  }, [currentUserActionPlans, sortConfig]);


  const summary = useMemo(() => {
    return {
      pendientes: currentUserActionPlans.filter(p => p.estado === 'Pendiente').length,
      enProceso: currentUserActionPlans.filter(p => p.estado === 'En proceso').length,
      enValidacion: currentUserActionPlans.filter(p => p.estado === 'En Validación').length,
      completadas: currentUserActionPlans.filter(p => p.estado === 'Completado').length,
    };
  }, [currentUserActionPlans]);

  const handleSelectPlan = (plan: ActionPlan) => {
    setSelectedPlan(plan);
    setFileToUpload(null);
    setEvidenceComment('');
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
          let actionWithOtherUpdates = { ...action, ...updates };

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
      
      const dataToUpdate = {
        plannedActions: updatedPlannedActions,
        updatedAt: new Date().toISOString()
      };
      const sanitizedDataToUpdate = sanitizeForFirestore(dataToUpdate);
      await updateDoc(rcaDocRef, sanitizedDataToUpdate);


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
          const validation = rcaDocData.validations?.find(v => v.actionId === actionId);

          if (validation?.status === 'validated') {
            newEstado = 'Completado';
          } else if (newSelectedPlanDataFirestore.evidencias && newSelectedPlanDataFirestore.evidencias.length > 0) {
            newEstado = 'En Validación';
          } else if ((newSelectedPlanDataFirestore.userComments && newSelectedPlanDataFirestore.userComments.trim() !== '') ||
            newSelectedPlanDataFirestore.markedAsReadyAt) {
            newEstado = 'En proceso';
          }
          
          let userMarkedReadyTimestamp: string | undefined = undefined;
          if (newSelectedPlanDataFirestore.markedAsReadyAt && isValidDate(parseISO(newSelectedPlanDataFirestore.markedAsReadyAt))) {
            userMarkedReadyTimestamp = format(parseISO(newSelectedPlanDataFirestore.markedAsReadyAt), 'dd/MM/yyyy HH:mm', { locale: es });
          }
          
          let validationTimestamp: string | undefined = undefined;
          if (validation?.validatedAt && isValidDate(parseISO(validation.validatedAt))) {
            validationTimestamp = format(parseISO(validation.validatedAt), 'dd/MM/yyyy HH:mm', { locale: es });
          }


          setSelectedPlan(prev => prev ? ({
            ...prev,
            evidencias: newSelectedPlanDataFirestore.evidencias || [],
            userComments: newSelectedPlanDataFirestore.userComments || '',
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
      toast({ title: "Error al Actualizar", description: `No se pudo actualizar la acción en la base de datos. Error: ${(error as Error).message}`, variant: "destructive" });
      return false;
    } finally {
      setIsUpdatingAction(false);
    }
  };

  const handleRemoveEvidence = async (evidenceIdToRemove: string) => {
    if (!selectedPlan) return;

    const updatedEvidences = selectedPlan.evidencias.filter(ev => ev.id !== evidenceIdToRemove);
    const success = await updateActionInFirestore(selectedPlan._originalRcaDocId, selectedPlan._originalActionId, {
      evidencias: updatedEvidences
    });

    if (success) {
      toast({ title: "Evidencia Eliminada", description: `La evidencia ha sido eliminada del plan "${selectedPlan.tituloDetalle}". El estado de la tarea puede haber cambiado.` , variant: 'destructive' });
    }
  };

  const handleSignalTaskReadyForValidation = async () => {
    if (!selectedPlan) return;
    if (selectedPlan.estado === 'Completado') {
      toast({ title: "Acción ya Completada", description: "Esta tarea ya ha sido validada y completada.", variant: "default" });
      return;
    }
    setIsUpdatingAction(true);
  
    const currentDateISO = new Date().toISOString();
    const formattedCurrentDate = format(parseISO(currentDateISO), 'dd/MM/yyyy HH:mm', { locale: es });
  
    let updatesForAction: Partial<FirestorePlannedAction> = {
      markedAsReadyAt: currentDateISO,
    };
  
    // 1. Incorporar lógica de subida de evidencia
    let newEvidencesArray = selectedPlan.evidencias || [];
    if (fileToUpload) {
      const newEvidencePayload: FirestoreEvidence = {
        id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        nombre: fileToUpload.name,
        tipo: (fileToUpload.name.split('.').pop()?.toLowerCase() as FirestoreEvidence['tipo']) || 'other',
      };
      const trimmedEvidenceComment = evidenceComment.trim();
      if (trimmedEvidenceComment) {
        newEvidencePayload.comment = trimmedEvidenceComment;
      }
      newEvidencesArray = [...newEvidencesArray, newEvidencePayload];
      updatesForAction.evidencias = newEvidencesArray;
    }
  
    // 2. Incorporar guardado de comentarios del usuario
    let commentsToSave = selectedPlan.userComments || "";
    if (selectedPlan.userComments && selectedPlan.userComments.trim()) {
        updatesForAction.userComments = selectedPlan.userComments.trim();
    } else {
      // Si no hay comentarios del usuario y es la primera vez que se marca lista, o no hay evidencias.
      if (selectedPlan.estado === 'Pendiente' && (!newEvidencesArray || newEvidencesArray.length === 0)) {
         commentsToSave = (commentsToSave ? commentsToSave + "\n\n" : "") + `[Sistema] Tarea marcada como lista para validación por ${selectedSimulatedUserName || 'el responsable'} el ${formattedCurrentDate}.`;
         if (fileToUpload) commentsToSave += ` Se adjuntó evidencia: ${fileToUpload.name}.`;
         updatesForAction.userComments = commentsToSave;
      } else if (fileToUpload) { // Si hay archivo pero no comentarios, añadir nota sobre el archivo
         commentsToSave = (commentsToSave ? commentsToSave + "\n\n" : "") + `[Sistema] Evidencia '${fileToUpload.name}' adjuntada por ${selectedSimulatedUserName || 'el responsable'} el ${formattedCurrentDate}.`;
         updatesForAction.userComments = commentsToSave;
      }
    }
      
    const updateSuccess = await updateActionInFirestore(selectedPlan._originalRcaDocId, selectedPlan._originalActionId, updatesForAction);
  
    if (updateSuccess) {
      let notificationMessage = `La tarea "${selectedPlan.accionResumen || selectedPlan.descripcionDetallada.substring(0,30)+"..."}" se ha actualizado y está lista para validación.`;
      if (fileToUpload) notificationMessage += ` Evidencia "${fileToUpload.name}" registrada.`;
      if (selectedPlan.userComments && selectedPlan.userComments.trim()) notificationMessage += ` Comentarios guardados.`;
      
      setFileToUpload(null);
      setEvidenceComment('');
      const fileInput = document.getElementById('evidence-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
  
      const validatorProfile = availableUsers.find(u => u.name === selectedPlan.validatorName);
      if (validatorProfile && validatorProfile.email) {
        const emailSubject = `Acción Lista para Validación: ${selectedPlan.accionResumen || selectedPlan.descripcionDetallada.substring(0,30)+"..."} (RCA: ${selectedPlan.codigoRCA})`;
        
        let evidencesList = "No se adjuntaron evidencias.";
        if (newEvidencesArray.length > 0) {
            evidencesList = newEvidencesArray.map(ev => 
                `- ${ev.nombre} (${ev.tipo || 'desconocido'}): ${ev.comment || "Sin comentario"}`
            ).join("\n");
        }
  
        const emailBody = `Estimado/a ${validatorProfile.name},\n\nEl usuario ${selectedSimulatedUserName || 'el responsable'} ha marcado la siguiente acción como lista para su validación:\n\nEvento RCA: ${selectedPlan.tituloDetalle} (ID: ${selectedPlan.codigoRCA})\nAcción Planificada: ${selectedPlan.descripcionDetallada}\nFecha de Cierre (Usuario): ${formattedCurrentDate}\n\nComentarios del Usuario:\n${updatesForAction.userComments || "Sin comentarios adicionales."}\n\nEvidencias Adjuntas:\n${evidencesList}\n\nPor favor, proceda a validar esta acción en el sistema RCA Assistant. Puede acceder directamente mediante el siguiente enlace:\n/analisis?id=${selectedPlan.codigoRCA}&step=4\n\nSaludos,\nSistema RCA Assistant`;
  
        const emailResult = await sendEmailAction({
          to: validatorProfile.email,
          subject: emailSubject,
          body: emailBody,
        });
  
        if (emailResult.success) {
          notificationMessage += ` Se envió una notificación por correo a ${validatorProfile.name}.`;
        } else {
          notificationMessage += ` No se pudo enviar la notificación por correo a ${validatorProfile.name} (${emailResult.message}).`;
        }
      } else {
        notificationMessage += ` No se encontró el correo del validador (${selectedPlan.validatorName || 'No asignado'}) para enviar la notificación.`;
      }
      toast({ title: "Tarea Lista para Validación", description: notificationMessage, duration: 7000 });
  
    } else {
      toast({ title: "Error", description: "No se pudo actualizar la tarea. Intente de nuevo.", variant: "destructive" });
    }
    setIsUpdatingAction(false);
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

  const renderSortIcon = (columnKey: SortableActionPlanKey) => {
    if (sortConfig.key === columnKey) {
      return sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
    }
    return <ChevronsUpDown className="h-3 w-3 opacity-30" />;
  };

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
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-secondary/40 rounded-md">
            <p className="text-2xl font-bold text-destructive">{isLoadingActions ? <Loader2 className="h-6 w-6 animate-spin inline" /> : summary.pendientes}</p>
            <p className="text-xs text-muted-foreground">Acciones Pendientes</p>
          </div>
          <div className="p-3 bg-secondary/40 rounded-md">
            <p className="text-2xl font-bold text-yellow-600">{isLoadingActions ? <Loader2 className="h-6 w-6 animate-spin inline" /> : summary.enProceso}</p>
            <p className="text-xs text-muted-foreground">En Proceso</p>
          </div>
          <div className="p-3 bg-secondary/40 rounded-md">
            <p className="text-2xl font-bold text-blue-600">{isLoadingActions ? <Loader2 className="h-6 w-6 animate-spin inline" /> : summary.enValidacion}</p>
            <p className="text-xs text-muted-foreground">En Validación</p>
          </div>
          <div className="p-3 bg-secondary/40 rounded-md">
            <p className="text-2xl font-bold text-green-600">{isLoadingActions ? <Loader2 className="h-6 w-6 animate-spin inline" /> : summary.completadas}</p>
            <p className="text-xs text-muted-foreground">Completadas</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-primary">Planes de Acción Asignados y por Validar</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingActions ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Cargando acciones...</p>
            </div>
          ) : !selectedSimulatedUserName ? (
            <p className="text-center text-muted-foreground py-10">Por favor, seleccione un usuario para ver sus tareas asignadas.</p>
          ) : sortedActionPlans.length === 0 && currentUserActionPlans.length > 0 ? (
            <p className="text-center text-muted-foreground py-10">No hay planes de acción que coincidan con los criterios de ordenamiento actuales (aunque existen para el usuario).</p>
          ) : currentUserActionPlans.length === 0 ? (
             <p className="text-center text-muted-foreground py-10">No hay planes de acción asignados a {selectedSimulatedUserName}.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[20%] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSort('accionResumen')}>
                      <div className="flex items-center gap-1">Acción (Resumen) {renderSortIcon('accionResumen')}</div>
                    </TableHead>
                    <TableHead className="w-[15%] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSort('id')}>
                      <div className="flex items-center gap-1">ID Acción {renderSortIcon('id')}</div>
                    </TableHead>
                    <TableHead className="w-[15%] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSort('estado')}>
                      <div className="flex items-center gap-1">Estado {renderSortIcon('estado')}</div>
                    </TableHead>
                    <TableHead className="w-[15%] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSort('plazoLimite')}>
                      <div className="flex items-center gap-1">Plazo Límite {renderSortIcon('plazoLimite')}</div>
                    </TableHead>
                    <TableHead className="w-[15%] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSort('validatorName')}>
                      <div className="flex items-center gap-1">Validador {renderSortIcon('validatorName')}</div>
                    </TableHead>
                    <TableHead className="w-[15%] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSort('codigoRCA')}>
                      <div className="flex items-center gap-1">ID RCA {renderSortIcon('codigoRCA')}</div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedActionPlans.map((plan) => (
                    <TableRow
                      key={`${plan._originalRcaDocId}-${plan.id}`}
                      onClick={() => handleSelectPlan(plan)}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        selectedPlan?.id === plan.id && selectedPlan?._originalRcaDocId === plan._originalRcaDocId && "bg-accent/50 hover:bg-accent/60"
                      )}
                    >
                      <TableCell className="font-medium">{plan.accionResumen}</TableCell>
                      <TableCell className="font-mono text-xs">{plan.id.substring(0,15)}{plan.id.length > 15 ? "..." : ""}</TableCell>
                      <TableCell>
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold",
                          plan.estado === 'Pendiente' && 'bg-red-100 text-red-700',
                          plan.estado === 'En proceso' && 'bg-yellow-100 text-yellow-700',
                          plan.estado === 'En Validación' && 'bg-blue-100 text-blue-700',
                          plan.estado === 'Completado' && 'bg-green-100 text-green-700'
                        )}>
                          {plan.estado}
                        </span>
                      </TableCell>
                      <TableCell>{plan.plazoLimite}</TableCell>
                      <TableCell>{plan.validatorName || 'N/A'}</TableCell>
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
            <div><Label className="font-semibold">Validador Asignado:</Label> <p>{selectedPlan.validatorName || 'No asignado'}</p></div>
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
              </div>
              {fileToUpload && <p className="text-xs text-muted-foreground mt-1">Archivo seleccionado: {fileToUpload.name}</p>}
            </div>

            <div className="pt-2">
              <div className="flex justify-between items-center mb-1">
                <h4 className="font-semibold text-primary flex items-center">
                  <MessageSquare className="mr-1.5 h-4 w-4" />
                  [Mis Comentarios Generales para la Tarea]
                </h4>
              </div>
              <Textarea
                value={selectedPlan.userComments || ''}
                onChange={(e) => setSelectedPlan(prev => prev ? { ...prev, userComments: e.target.value } : null)}
                placeholder="Añada sus comentarios sobre el progreso o finalización de esta tarea..."
                rows={3}
                className="text-sm"
                disabled={isUpdatingAction || selectedPlan.estado === 'Completado'}
              />
            </div>

            <div className="pt-2">
              <h4 className="font-semibold text-primary mb-1">[Actualizar estado de esta tarea]</h4>
              <div className="flex gap-2">
                 <Button
                  size="sm"
                  variant="default"
                  onClick={handleSignalTaskReadyForValidation}
                  disabled={isUpdatingAction || selectedPlan.estado === 'Completado'}
                  title={selectedPlan.estado === 'Completado' ? "Esta tarea ya ha sido validada y no puede modificarse." : "Guardar evidencias, comentarios y marcar la tarea como lista para ser validada por el Líder del Proyecto."}
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
                Al marcar "listo para validación", se guardarán las evidencias adjuntas (si las hay), los comentarios ingresados, se registrará la fecha y hora, y se enviará (simulación) un correo al validador con detalles de la tarea, comentarios, lista de evidencias y un enlace al Paso 4 del análisis.
                La validación final para el estado 'Completado' se realiza en el Paso 4 del flujo de Análisis RCA por el líder del proyecto.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

