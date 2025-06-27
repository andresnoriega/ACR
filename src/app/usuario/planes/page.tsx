
'use client';

import { useState, useMemo, useEffect, useCallback, ChangeEvent } from 'react';
import type { FullUserProfile, RCAAnalysisDocument, PlannedAction as FirestorePlannedAction, Evidence as FirestoreEvidence, Validation } from '@/types/rca';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox'; // Import Checkbox
import { useToast } from '@/hooks/use-toast';
import { ListTodo, FileText, ImageIcon, Paperclip, UploadCloud, CheckCircle2, Save, Info, MessageSquare, UserCog, Loader2, CalendarCheck, History, Trash2, Mail, ArrowUp, ArrowDown, ChevronsUpDown, UserCircle, FolderKanban, CheckSquare, Link2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { format, parseISO, isValid as isValidDate } from 'date-fns';
import { es } from 'date-fns/locale';
import { sendEmailAction } from '@/app/actions';
import { sanitizeForFirestore } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';

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

interface ValidationTask {
  id: string; // Combination of RCA ID and Action ID for uniqueness
  rcaId: string;
  rcaTitle: string;
  actionDescription: string;
  actionResponsible: string;
  actionDueDate: string;
  actionMarkedReadyAt?: string;
}


type SortableActionPlanKey = 'accionResumen' | 'id' | 'estado' | 'plazoLimite' | 'validatorName' | 'codigoRCA';
type SortableValidationTaskKey = 'rcaTitle' | 'actionDescription' | 'actionResponsible' | 'actionMarkedReadyAt';

interface SortConfigAssigned {
  key: SortableActionPlanKey | null;
  direction: 'ascending' | 'descending';
}
interface SortConfigValidation {
  key: SortableValidationTaskKey | null;
  direction: 'ascending' | 'descending';
}


export default function UserActionPlansPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { currentUser, userProfile, loadingAuth } = useAuth();

  const [availableUsers, setAvailableUsers] = useState<FullUserProfile[]>([]);
  const [allRcaDocuments, setAllRcaDocuments] = useState<RCAAnalysisDocument[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingActions, setIsLoadingActions] = useState(true);
  const [isUpdatingAction, setIsUpdatingAction] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const [selectedPlan, setSelectedPlan] = useState<ActionPlan | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [evidenceComment, setEvidenceComment] = useState('');
  
  const [sortConfigAssigned, setSortConfigAssigned] = useState<SortConfigAssigned>({ key: 'plazoLimite', direction: 'ascending' });
  const [sortConfigValidation, setSortConfigValidation] = useState<SortConfigValidation>({ key: 'actionMarkedReadyAt', direction: 'descending' });


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

  const { assignedActionPlans, validationActionPlans } = useMemo(() => {
    if (loadingAuth || !userProfile || !userProfile.name || allRcaDocuments.length === 0) {
      return { assignedActionPlans: [], validationActionPlans: [] };
    }

    const assignedPlans: ActionPlan[] = [];
    const validationTasks: ValidationTask[] = [];
    const uniqueAssignedTracker = new Set<string>();

    allRcaDocuments.forEach(rcaDoc => {
      // Populate Assigned Tasks
      if (rcaDoc.plannedActions && rcaDoc.plannedActions.length > 0) {
        rcaDoc.plannedActions.forEach(pa => {
          if (pa.responsible === userProfile.name) {
            const uniqueKey = pa.id; // Assuming pa.id is unique across all RCAs for assigned tasks
            if (!uniqueAssignedTracker.has(uniqueKey)) {
              uniqueAssignedTracker.add(uniqueKey);
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

              assignedPlans.push({
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

      // Populate Validation Tasks
      const canCurrentUserValidate = userProfile.role === 'Super User' || 
                                   (userProfile.role === 'Admin' && userProfile.permissionLevel === 'Total') ||
                                   rcaDoc.projectLeader === userProfile.name;

      if (canCurrentUserValidate && rcaDoc.plannedActions && rcaDoc.plannedActions.length > 0) {
        rcaDoc.plannedActions.forEach(pa => {
          const validation = rcaDoc.validations?.find(v => v.actionId === pa.id);
          const isReadyForValidation = (pa.evidencias && pa.evidencias.length > 0) || 
                                       (pa.userComments && pa.userComments.trim() !== '') || 
                                       pa.markedAsReadyAt;

          if (isReadyForValidation && validation?.status === 'pending') {
            validationTasks.push({
              id: `${rcaDoc.eventData.id}-${pa.id}`,
              rcaId: rcaDoc.eventData.id,
              rcaTitle: rcaDoc.eventData.focusEventDescription || 'Sin título de RCA',
              actionDescription: pa.description,
              actionResponsible: pa.responsible,
              actionDueDate: pa.dueDate && isValidDate(parseISO(pa.dueDate)) ? format(parseISO(pa.dueDate), 'dd/MM/yyyy', { locale: es }) : 'N/A',
              actionMarkedReadyAt: pa.markedAsReadyAt && isValidDate(parseISO(pa.markedAsReadyAt)) ? format(parseISO(pa.markedAsReadyAt), 'dd/MM/yyyy HH:mm', { locale: es }) : 'No marcado',
            });
          }
        });
      }
    });
    return { assignedActionPlans: assignedPlans, validationActionPlans: validationTasks };
  }, [userProfile, allRcaDocuments, loadingAuth]);


  const requestSortAssigned = (key: SortableActionPlanKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfigAssigned.key === key && sortConfigAssigned.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfigAssigned({ key, direction });
  };

  const sortedAssignedActionPlans = useMemo(() => {
    let sortableItems = [...assignedActionPlans];
    if (sortConfigAssigned.key) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfigAssigned.key!];
        const valB = b[sortConfigAssigned.key!];
  
        if (sortConfigAssigned.key === 'plazoLimite') {
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
        if (typeof valA === 'string' && typeof valB === 'string') return valA.localeCompare(valB);
        const strA = String(valA ?? '').toLowerCase();
        const strB = String(valB ?? '').toLowerCase();
        if (strA < strB) return -1; if (strA > strB) return 1; return 0;
      });
      if (sortConfigAssigned.direction === 'descending') sortableItems.reverse();
    }
    return sortableItems;
  }, [assignedActionPlans, sortConfigAssigned]);

  const requestSortValidation = (key: SortableValidationTaskKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfigValidation.key === key && sortConfigValidation.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfigValidation({ key, direction });
  };
  
  const sortedValidationActionPlans = useMemo(() => {
    let sortableItems = [...validationActionPlans];
    if (sortConfigValidation.key) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfigValidation.key!];
        const valB = b[sortConfigValidation.key!];
        if (sortConfigValidation.key === 'actionMarkedReadyAt') {
          const dateAStr = String(valA);
          const dateBStr = String(valB);
          const dateA = dateAStr === 'No marcado' ? null : parseISO(dateAStr.replace(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2})/, '$3-$2-$1T$4:00'));
          const dateB = dateBStr === 'No marcado' ? null : parseISO(dateBStr.replace(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2})/, '$3-$2-$1T$4:00'));
          if (dateA === null && dateB === null) return 0;
          if (dateA === null) return 1; 
          if (dateB === null) return -1;
          if (isValidDate(dateA) && isValidDate(dateB)) return dateA.getTime() - dateB.getTime();
          return 0;
        }
        if (typeof valA === 'string' && typeof valB === 'string') return valA.localeCompare(valB);
        const strA = String(valA ?? '').toLowerCase();
        const strB = String(valB ?? '').toLowerCase();
        if (strA < strB) return -1; if (strA > strB) return 1; return 0;
      });
      if (sortConfigValidation.direction === 'descending') sortableItems.reverse();
    }
    return sortableItems;
  }, [validationActionPlans, sortConfigValidation]);


  const summary = useMemo(() => {
    return {
      assignedPendientes: assignedActionPlans.filter(p => p.estado === 'Pendiente').length,
      assignedEnProceso: assignedActionPlans.filter(p => p.estado === 'En proceso').length,
      assignedEnValidacion: assignedActionPlans.filter(p => p.estado === 'En Validación').length,
      assignedCompletadas: assignedActionPlans.filter(p => p.estado === 'Completado').length,
      totalValidationPending: validationActionPlans.length,
    };
  }, [assignedActionPlans, validationActionPlans]);

  const handleSelectPlan = (plan: ActionPlan) => {
    if (selectedPlan?.id === plan.id && selectedPlan?._originalRcaDocId === plan._originalRcaDocId) {
      setSelectedPlan(null); // Deselect if already selected
    } else {
      setSelectedPlan(plan);
    }
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
              if (seenEvidenceIds.has(ev.id)) return false;
              seenEvidenceIds.add(ev.id);
              return true;
            });
          }
          return actionWithOtherUpdates;
        }
        return action;
      });
      
      const dataToUpdate = { plannedActions: updatedPlannedActions, updatedAt: new Date().toISOString() };
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
          if (validation?.status === 'validated') newEstado = 'Completado';
          else if (newSelectedPlanDataFirestore.evidencias && newSelectedPlanDataFirestore.evidencias.length > 0) newEstado = 'En Validación';
          else if ((newSelectedPlanDataFirestore.userComments && newSelectedPlanDataFirestore.userComments.trim() !== '') || newSelectedPlanDataFirestore.markedAsReadyAt) newEstado = 'En proceso';
          
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
              usuario: userProfile?.name || "Sistema",
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
    if (!selectedPlan || !userProfile || !userProfile.name) return;
    if (selectedPlan.estado === 'Completado') {
      toast({ title: "Acción ya Completada", description: "Esta tarea ya ha sido validada y completada.", variant: "default" });
      return;
    }

    setIsUpdatingAction(true);
    setUploadProgress(null);
    const currentDateISO = new Date().toISOString();
    const formattedCurrentDate = format(parseISO(currentDateISO), 'dd/MM/yyyy HH:mm', { locale: es });
    let updatesForAction: Partial<FirestorePlannedAction> = { markedAsReadyAt: currentDateISO };
    let newEvidencesArray = selectedPlan.evidencias || [];

    if (fileToUpload) {
      const fileRef = storageRef(storage, `evidence/${selectedPlan._originalRcaDocId}/${Date.now()}-${fileToUpload.name}`);
      const uploadTask = uploadBytesResumable(fileRef, fileToUpload);
      
      let downloadURL: string;
      try {
        downloadURL = await new Promise<string>((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => {
              console.error("Upload error:", error);
              setUploadProgress(null);
              reject(error);
            },
            async () => {
              try {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(url);
              } catch (getUrlError) {
                reject(getUrlError);
              }
            }
          );
        });

        const newEvidencePayload: FirestoreEvidence = {
            id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            nombre: fileToUpload.name,
            tipo: (fileToUpload.type.split('/')[1] as FirestoreEvidence['tipo']) || 'other',
            url: downloadURL,
            comment: evidenceComment.trim() || undefined,
            fileSize: fileToUpload.size,
        };
        newEvidencesArray = [...newEvidencesArray, newEvidencePayload];
      
      } catch (uploadError) {
          console.error("Error uploading evidence file:", uploadError);
          toast({ title: "Error de Carga", description: "No se pudo subir el archivo de evidencia.", variant: "destructive" });
          setIsUpdatingAction(false);
          setUploadProgress(null);
          return;
      }
    }
    
    setUploadProgress(null);
    updatesForAction.evidencias = newEvidencesArray;

    let commentsToSave = selectedPlan.userComments || "";
    if (selectedPlan.userComments && selectedPlan.userComments.trim()) {
        updatesForAction.userComments = selectedPlan.userComments.trim();
    }
    
    if (updatesForAction.userComments === (selectedPlan.userComments || "")) {
        if (selectedPlan.estado === 'Pendiente' || selectedPlan.estado === 'En proceso') {
            commentsToSave = (commentsToSave ? commentsToSave + "\n\n" : "") + `[Sistema] Tarea marcada como lista para validación por ${userProfile.name} el ${formattedCurrentDate}.`;
            updatesForAction.userComments = commentsToSave;
        }
    }


    const updateSuccess = await updateActionInFirestore(selectedPlan._originalRcaDocId, selectedPlan._originalActionId, updatesForAction);
    
    if (updateSuccess) {
      let notificationMessage = `La tarea "${selectedPlan.accionResumen || selectedPlan.descripcionDetallada.substring(0,30)+"..."}" se ha actualizado y está lista para validación.`;
      
      if (fileToUpload) {
        setEvidenceComment('');
        setFileToUpload(null);
        const fileInput = document.getElementById('evidence-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }
      
      const validatorProfile = availableUsers.find(u => u.name === selectedPlan.validatorName);
      if (validatorProfile && validatorProfile.email) {
        const emailSubject = `Acción Lista para Validación: ${selectedPlan.accionResumen || selectedPlan.descripcionDetallada.substring(0,30)+"..."} (RCA: ${selectedPlan.codigoRCA})`;
        let evidencesList = "No se adjuntaron evidencias nuevas.";
        if (newEvidencesArray.length > 0) {
            evidencesList = newEvidencesArray.map(ev => `- ${ev.nombre} (${ev.tipo || 'desconocido'}): ${ev.url || "Sin URL"}`).join("\n");
        }
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const validationLink = `${baseUrl}/analisis?id=${selectedPlan._originalRcaDocId}&step=4`;
        const emailBody = `Estimado/a ${validatorProfile.name},\n\nEl usuario ${userProfile.name} ha marcado la siguiente acción como lista para su validación:\n\nEvento RCA: ${selectedPlan.tituloDetalle} (ID: ${selectedPlan.codigoRCA})\nAcción Planificada: ${selectedPlan.descripcionDetallada}\nFecha de Cierre (Usuario): ${formattedCurrentDate}\n\nComentarios del Usuario:\n${updatesForAction.userComments || "Sin comentarios adicionales."}\n\nEvidencias Adjuntas:\n${evidencesList}\n\nPor favor, proceda a validar esta acción en el sistema RCA Assistant. Puede acceder directamente mediante el siguiente enlace:\n${validationLink}\n\nSaludos,\nSistema RCA Assistant`;
        const emailResult = await sendEmailAction({ to: validatorProfile.email, subject: emailSubject, body: emailBody });
        if (emailResult.success) notificationMessage += ` Se envió una notificación por correo a ${validatorProfile.name}.`;
        else notificationMessage += ` No se pudo enviar la notificación por correo a ${validatorProfile.name} (${emailResult.message}).`;
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
      case 'link': return <Link2 className="h-4 w-4 mr-2 flex-shrink-0 text-indigo-600" />;
      case 'pdf': return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-red-600" />;
      case 'jpg': case 'jpeg': case 'png': return <ImageIcon className="h-4 w-4 mr-2 flex-shrink-0 text-blue-600" />;
      case 'doc': case 'docx': return <Paperclip className="h-4 w-4 mr-2 flex-shrink-0 text-sky-700" />;
      default: return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />;
    }
  };

  const isLoadingPage = loadingAuth || isLoadingUsers || isLoadingActions;

  const renderSortIconAssigned = (columnKey: SortableActionPlanKey) => {
    if (sortConfigAssigned.key === columnKey) {
      return sortConfigAssigned.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
    }
    return <ChevronsUpDown className="h-3 w-3 opacity-30" />;
  };

  const renderSortIconValidation = (columnKey: SortableValidationTaskKey) => {
    if (sortConfigValidation.key === columnKey) {
      return sortConfigValidation.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
    }
    return <ChevronsUpDown className="h-3 w-3 opacity-30" />;
  };


  if (isLoadingPage) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando datos de tareas...</p>
      </div>
    );
  }

  if (!currentUser || !userProfile) {
     return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] text-center">
        <p className="text-lg text-muted-foreground">Debe iniciar sesión para ver sus tareas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-8">
      <header className="text-center mb-6">
        <h1 className="text-3xl font-bold font-headline text-primary flex items-center justify-center">
           <UserCircle className="mr-3 h-8 w-8" /> Mis Tareas y Validaciones
        </h1>
        <p className="text-sm text-muted-foreground">
          Usuario: <span className="font-semibold">{userProfile.name}</span> ({userProfile.email})
        </p>
      </header>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-primary">Resumen Rápido</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
          <div className="p-3 bg-secondary/40 rounded-md">
            <p className="text-2xl font-bold text-destructive">{isLoadingActions ? <Loader2 className="h-6 w-6 animate-spin inline" /> : summary.assignedPendientes}</p>
            <p className="text-xs text-muted-foreground">Asignadas Pendientes</p>
          </div>
          <div className="p-3 bg-secondary/40 rounded-md">
            <p className="text-2xl font-bold text-yellow-600">{isLoadingActions ? <Loader2 className="h-6 w-6 animate-spin inline" /> : summary.assignedEnProceso}</p>
            <p className="text-xs text-muted-foreground">Asignadas En Proceso</p>
          </div>
          <div className="p-3 bg-secondary/40 rounded-md">
            <p className="text-2xl font-bold text-blue-600">{isLoadingActions ? <Loader2 className="h-6 w-6 animate-spin inline" /> : summary.assignedEnValidacion}</p>
            <p className="text-xs text-muted-foreground">Asignadas En Validación</p>
          </div>
          <div className="p-3 bg-secondary/40 rounded-md">
            <p className="text-2xl font-bold text-green-600">{isLoadingActions ? <Loader2 className="h-6 w-6 animate-spin inline" /> : summary.assignedCompletadas}</p>
            <p className="text-xs text-muted-foreground">Asignadas Completadas</p>
          </div>
          <div className="p-3 bg-indigo-400/20 rounded-md">
            <p className="text-2xl font-bold text-indigo-600">{isLoadingActions ? <Loader2 className="h-6 w-6 animate-spin inline" /> : summary.totalValidationPending}</p>
            <p className="text-xs text-muted-foreground">Tareas por Validar</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="assigned" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assigned" className="flex items-center gap-2"><ListTodo className="h-4 w-4" /> Mis Tareas Asignadas ({assignedActionPlans.length})</TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center gap-2"><CheckSquare className="h-4 w-4" /> Tareas por Validar ({validationActionPlans.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="assigned">
          <Card className="shadow-md mt-4">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-primary flex items-center"><ListTodo className="mr-2" /> Planes de Acción Asignados a Mí</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingActions ? (
                <div className="flex justify-center items-center h-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Cargando acciones asignadas...</p></div>
              ) : sortedAssignedActionPlans.length === 0 ? (
                 <p className="text-center text-muted-foreground py-10">No tiene planes de acción asignados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[5%] p-2"></TableHead>
                        <TableHead className="w-[20%] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSortAssigned('accionResumen')}>
                          <div className="flex items-center gap-1">Acción (Resumen) {renderSortIconAssigned('accionResumen')}</div>
                        </TableHead>
                        <TableHead className="w-[15%] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSortAssigned('id')}>
                          <div className="flex items-center gap-1">ID Acción {renderSortIconAssigned('id')}</div>
                        </TableHead>
                        <TableHead className="w-[15%] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSortAssigned('estado')}>
                          <div className="flex items-center gap-1">Estado {renderSortIconAssigned('estado')}</div>
                        </TableHead>
                        <TableHead className="w-[15%] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSortAssigned('plazoLimite')}>
                          <div className="flex items-center gap-1">Plazo Límite {renderSortIconAssigned('plazoLimite')}</div>
                        </TableHead>
                        <TableHead className="w-[15%] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSortAssigned('validatorName')}>
                          <div className="flex items-center gap-1">Validador {renderSortIconAssigned('validatorName')}</div>
                        </TableHead>
                        <TableHead className="w-[15%] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSortAssigned('codigoRCA')}>
                          <div className="flex items-center gap-1">ID RCA {renderSortIconAssigned('codigoRCA')}</div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedAssignedActionPlans.map((plan) => (
                        <TableRow
                          key={`${plan._originalRcaDocId}-${plan.id}`}
                          className={cn(
                            "cursor-pointer hover:bg-muted/50",
                            selectedPlan?.id === plan.id && selectedPlan?._originalRcaDocId === plan._originalRcaDocId && "bg-accent/50 hover:bg-accent/60"
                          )}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()} className="p-2">
                            <Checkbox
                                id={`select-plan-${plan.id}`}
                                checked={selectedPlan?.id === plan.id && selectedPlan?._originalRcaDocId === plan._originalRcaDocId}
                                onCheckedChange={() => handleSelectPlan(plan)}
                                aria-label={`Seleccionar plan ${plan.accionResumen}`}
                              />
                          </TableCell>
                          <TableCell className="font-medium" onClick={() => handleSelectPlan(plan)}>{plan.accionResumen}</TableCell>
                          <TableCell className="font-mono text-xs" onClick={() => handleSelectPlan(plan)}>{plan.id.substring(0,15)}{plan.id.length > 15 ? "..." : ""}</TableCell>
                          <TableCell onClick={() => handleSelectPlan(plan)}>
                            <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold",
                              plan.estado === 'Pendiente' && 'bg-red-100 text-red-700',
                              plan.estado === 'En proceso' && 'bg-yellow-100 text-yellow-700',
                              plan.estado === 'En Validación' && 'bg-blue-100 text-blue-700',
                              plan.estado === 'Completado' && 'bg-green-100 text-green-700'
                            )}>{plan.estado}</span>
                          </TableCell>
                          <TableCell onClick={() => handleSelectPlan(plan)}>{plan.plazoLimite}</TableCell>
                          <TableCell onClick={() => handleSelectPlan(plan)}>{plan.validatorName || 'N/A'}</TableCell>
                          <TableCell className="font-mono text-xs" onClick={() => handleSelectPlan(plan)}>{plan.codigoRCA.substring(0, 8)}...</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedPlan && (
            <Card className="shadow-lg animate-in fade-in-50 duration-300 mt-4">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-primary">Detalle del Plan Seleccionado</CardTitle>
                <CardDescription>ID Acción: {selectedPlan.id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div><Label className="font-semibold">Título del RCA:</Label><p>{selectedPlan.tituloDetalle} (ID RCA: {selectedPlan.codigoRCA})</p></div>
                <div><Label className="font-semibold">Descripción Completa de la Acción:</Label><p className="whitespace-pre-line bg-muted/20 p-2 rounded-md">{selectedPlan.descripcionDetallada}</p></div>
                <div><Label className="font-semibold">Responsable:</Label> <p>{selectedPlan.responsableDetalle}</p></div>
                <div><Label className="font-semibold">Validador Asignado:</Label> <p>{selectedPlan.validatorName || 'No asignado'}</p></div>
                <div><Label className="font-semibold">Estado Actual:</Label> <p>{selectedPlan.estado}</p></div>
                <div><Label className="font-semibold">Plazo límite:</Label> <p>{selectedPlan.plazoLimite}</p></div>
                {selectedPlan.userMarkedReadyDate && (<div><Label className="font-semibold flex items-center"><History className="mr-1.5 h-4 w-4 text-blue-600" />Marcado como Listo el:</Label><p className="text-blue-700">{selectedPlan.userMarkedReadyDate}</p></div>)}
                {selectedPlan.estado === 'Completado' && selectedPlan.validationDate && (<div><Label className="font-semibold flex items-center"><CalendarCheck className="mr-1.5 h-4 w-4 text-green-600" />Fecha de Validación Final:</Label><p className="text-green-700">{selectedPlan.validationDate}</p></div>)}
                <div className="pt-2"><h4 className="font-semibold text-primary mb-1">[Evidencias Adjuntas]</h4>
                  {selectedPlan.evidencias.length > 0 ? (<ul className="space-y-1.5">
                      {selectedPlan.evidencias.map(ev => (<li key={ev.id} className="flex items-start justify-between text-xs border p-2 rounded-md bg-muted/10">
                          <div className="flex-grow"><div className="flex items-center">{getEvidenceIcon(ev.tipo)}<span className="font-medium">{ev.nombre}</span></div>
                            {ev.comment && <p className="text-xs text-muted-foreground ml-[calc(1rem+0.5rem)] mt-0.5">Comentario: {ev.comment}</p>}</div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 ml-2 shrink-0 hover:bg-destructive/10" onClick={() => handleRemoveEvidence(ev.id)} disabled={isUpdatingAction || selectedPlan.estado === 'Completado'} aria-label="Eliminar evidencia"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></li>))}</ul>
                  ) : <p className="text-xs text-muted-foreground">No hay evidencias adjuntas.</p>}</div>
                <div className="pt-2"><h4 className="font-semibold text-primary mb-1">[Adjuntar nueva evidencia]</h4>
                  <div className="space-y-2">
                    <Label htmlFor="evidence-file-input">Archivo de Evidencia</Label>
                    <Input id="evidence-file-input" type="file" onChange={handleFileChange} className="text-xs h-9" disabled={isUpdatingAction || selectedPlan.estado === 'Completado'} />
                    <Label htmlFor="evidence-comment">Comentario para esta evidencia (opcional)</Label>
                    <Input id="evidence-comment" type="text" placeholder="Ej: Foto de la reparación, documento de capacitación..." value={evidenceComment} onChange={(e) => setEvidenceComment(e.target.value)} className="text-xs h-9" disabled={isUpdatingAction || selectedPlan.estado === 'Completado'} />
                  </div>
                  {uploadProgress !== null && (
                    <div className="mt-2 space-y-1">
                      <Label>Progreso de Carga</Label>
                      <Progress value={uploadProgress} />
                      <p className="text-xs text-muted-foreground">{Math.round(uploadProgress)}% completado</p>
                    </div>
                  )}
                  {fileToUpload && uploadProgress === null && <p className="text-xs text-muted-foreground mt-1">Archivo seleccionado: {fileToUpload.name}</p>}
                </div>
                <div className="pt-2"><div className="flex justify-between items-center mb-1"><h4 className="font-semibold text-primary flex items-center"><MessageSquare className="mr-1.5 h-4 w-4" />[Mis Comentarios Generales para la Tarea]</h4></div>
                  <Textarea value={selectedPlan.userComments || ''} onChange={(e) => setSelectedPlan(prev => prev ? { ...prev, userComments: e.target.value } : null)} placeholder="Añada sus comentarios sobre el progreso o finalización de esta tarea..." rows={3} className="text-sm" disabled={isUpdatingAction || selectedPlan.estado === 'Completado'} /></div>
                <div className="pt-2"><h4 className="font-semibold text-primary mb-1">[Actualizar estado de esta tarea]</h4>
                  <div className="flex items-center gap-2">
                     <Button size="sm" variant="default" onClick={handleSignalTaskReadyForValidation} disabled={isUpdatingAction || selectedPlan.estado === 'Completado' || !fileToUpload} title={selectedPlan.estado === 'Completado' ? "Esta tarea ya ha sido validada y no puede modificarse." : !fileToUpload ? "Debe seleccionar un archivo para adjuntar como evidencia." : "Guardar evidencias, comentarios y marcar la tarea como lista para ser validada por el Líder del Proyecto."}>
                      {isUpdatingAction ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />} 
                      {isUpdatingAction ? `Subiendo...${uploadProgress !== null ? ` (${Math.round(uploadProgress)}%)` : ''}` : 'Marcar como listo para validación'}
                    </Button>
                    {selectedPlan.userMarkedReadyDate && (<span className="text-xs text-green-600 flex items-center ml-2 p-1.5 bg-green-50 border border-green-200 rounded-md"><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Listo para Validar</span>)}</div></div>
                <div className="pt-2"><h4 className="font-semibold text-primary mb-1">[Notas del sistema]</h4>
                  <div className="text-xs bg-secondary/30 p-2 rounded-md"><p>Última actualización del RCA: {selectedPlan.ultimaActualizacion.fechaRelativa}</p>
                    {selectedPlan.estado === 'Completado' && <p className="text-green-600 font-medium">Esta acción ha sido validada y marcada como completada en el análisis RCA.</p>}</div></div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="validation">
          <Card className="shadow-md mt-4">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-primary flex items-center"><CheckSquare className="mr-2"/> Tareas Pendientes de Mi Validación</CardTitle>
              <CardDescription>Acciones que otros usuarios han completado y requieren su validación.</CardDescription>
            </CardHeader>
            <CardContent>
            {isLoadingActions ? (
                <div className="flex justify-center items-center h-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Cargando tareas por validar...</p></div>
              ) : sortedValidationActionPlans.length === 0 ? (
                 <p className="text-center text-muted-foreground py-10">No tiene tareas pendientes de su validación en este momento.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[25%] cursor-pointer hover:bg-muted/50" onClick={() => requestSortValidation('rcaTitle')}><div className="flex items-center gap-1">Evento RCA {renderSortIconValidation('rcaTitle')}</div></TableHead>
                        <TableHead className="w-[30%] cursor-pointer hover:bg-muted/50" onClick={() => requestSortValidation('actionDescription')}><div className="flex items-center gap-1">Acción {renderSortIconValidation('actionDescription')}</div></TableHead>
                        <TableHead className="w-[15%] cursor-pointer hover:bg-muted/50" onClick={() => requestSortValidation('actionResponsible')}><div className="flex items-center gap-1">Responsable Acción {renderSortIconValidation('actionResponsible')}</div></TableHead>
                        <TableHead className="w-[15%] cursor-pointer hover:bg-muted/50" onClick={() => requestSortValidation('actionMarkedReadyAt')}><div className="flex items-center gap-1">Fecha Lista {renderSortIconValidation('actionMarkedReadyAt')}</div></TableHead>
                        <TableHead className="w-[15%] text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedValidationActionPlans.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium text-sm">{task.rcaTitle}</TableCell>
                          <TableCell className="text-sm">{task.actionDescription}</TableCell>
                          <TableCell className="text-sm">{task.actionResponsible}</TableCell>
                          <TableCell className="text-sm">{task.actionMarkedReadyAt}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => router.push(`/analisis?id=${task.rcaId}&step=4`)}>
                              Ir a Validar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="mt-6 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700">
        <CardContent className="pt-4">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2.5 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-0.5">Nota sobre la funcionalidad</h3>
              <p className="text-xs text-blue-600 dark:text-blue-400/90">
                Desde "Mis Tareas Asignadas", al marcar "listo para validación", se guardarán las evidencias, comentarios y se enviará un correo al validador (Líder de Proyecto del RCA) con un enlace al Paso 4 del análisis.
                Desde "Tareas por Validar", el botón "Ir a Validar" le llevará directamente al Paso 4 del análisis correspondiente para que pueda realizar la validación.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
