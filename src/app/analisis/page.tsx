
'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { RCAEventData, ImmediateAction, PlannedAction, Validation, AnalysisTechnique, IshikawaData, FiveWhysData, CTMData, DetailedFacts, PreservedFact, IdentifiedRootCause, FullUserProfile, Site, RCAAnalysisDocument, ReportedEvent, ReportedEventStatus, EventType, PriorityType, RejectionDetails } from '@/types/rca';
import { StepNavigation } from '@/components/rca/StepNavigation';
import { Step1Initiation } from '@/components/rca/Step1Initiation';
import { Step2Facts } from '@/components/rca/Step2Facts';
import { Step3Analysis } from '@/components/rca/Step3Analysis';
import { Step4Validation } from '@/components/rca/Step4Validation';
import { Step5Results } from '@/components/rca/Step5Results';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { Loader2 } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { sanitizeForFirestore } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { sendEmailAction } from '@/app/actions';

const initialIshikawaData: IshikawaData = [
  { id: 'manpower', name: 'Mano de Obra', causes: [] },
  { id: 'method', name: 'Método', causes: [] },
  { id: 'machinery', name: 'Maquinaria', causes: [] },
  { id: 'material', name: 'Material', causes: [] },
  { id: 'measurement', name: 'Medición', causes: [] },
  { id: 'environment', name: 'Medio Ambiente', causes: [] },
];

const initialFiveWhysData: FiveWhysData = [
  { id: `5why-${Date.now()}`, why: '', because: '' }
];

const initialCTMData: CTMData = [];

const initialDetailedFacts: DetailedFacts = {
  quien: '',
  que: '',
  donde: '',
  cuando: '',
  cualCuanto: '',
  como: '',
};

const initialRCAAnalysisState: Omit<RCAAnalysisDocument, 'createdAt' | 'updatedAt' > = {
  eventData: { id: '', place: '', date: '', eventType: '', priority: '', focusEventDescription: '' },
  immediateActions: [],
  projectLeader: '',
  detailedFacts: { ...initialDetailedFacts },
  analysisDetails: '',
  preservedFacts: [],
  analysisTechnique: '',
  analysisTechniqueNotes: '',
  ishikawaData: JSON.parse(JSON.stringify(initialIshikawaData)),
  fiveWhysData: JSON.parse(JSON.stringify(initialFiveWhysData)),
  ctmData: JSON.parse(JSON.stringify(initialCTMData)),
  identifiedRootCauses: [],
  plannedActions: [],
  validations: [],
  finalComments: '',
  isFinalized: false,
  rejectionDetails: undefined,
  createdBy: undefined,
};


export default function RCAAnalysisPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { userProfile } = useAuth(); 

  const [step, setStep] = useState(1);
  const [maxCompletedStep, setMaxCompletedStep] = useState(0);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const lastLoadedAnalysisIdRef = useRef<string | null>(null);

  const [availableSitesFromDB, setAvailableSitesFromDB] = useState<Site[]>([]);
  const [availableUsersFromDB, setAvailableUsersFromDB] = useState<FullUserProfile[]>([]);

  // States for each part of the RCA analysis document
  const [eventData, setEventData] = useState<RCAEventData>(initialRCAAnalysisState.eventData);
  const [eventCounter, setEventCounter] = useState(1);
  const [immediateActions, setImmediateActions] = useState<ImmediateAction[]>(initialRCAAnalysisState.immediateActions);
  const [immediateActionCounter, setImmediateActionCounter] = useState(1);

  const [projectLeader, setProjectLeader] = useState(initialRCAAnalysisState.projectLeader);
  const [detailedFacts, setDetailedFacts] = useState<DetailedFacts>(initialRCAAnalysisState.detailedFacts);
  const [analysisDetails, setAnalysisDetails] = useState(initialRCAAnalysisState.analysisDetails);
  const [preservedFacts, setPreservedFacts] = useState<PreservedFact[]>(initialRCAAnalysisState.preservedFacts);

  const [analysisTechnique, setAnalysisTechnique] = useState<AnalysisTechnique>(initialRCAAnalysisState.analysisTechnique);
  const [analysisTechniqueNotes, setAnalysisTechniqueNotes] = useState(initialRCAAnalysisState.analysisTechniqueNotes);
  const [ishikawaData, setIshikawaData] = useState<IshikawaData>(initialRCAAnalysisState.ishikawaData);
  const [fiveWhysData, setFiveWhysData] = useState<FiveWhysData>(initialRCAAnalysisState.fiveWhysData);
  const [ctmData, setCtmData] = useState<CTMData>(initialRCAAnalysisState.ctmData);
  const [identifiedRootCauses, setIdentifiedRootCauses] = useState<IdentifiedRootCause[]>(initialRCAAnalysisState.identifiedRootCauses);

  const [plannedActions, setPlannedActions] = useState<PlannedAction[]>(initialRCAAnalysisState.plannedActions);
  const [plannedActionCounter, setPlannedActionCounter] = useState(1);

  const [validations, setValidations] = useState<Validation[]>(initialRCAAnalysisState.validations);
  const [finalComments, setFinalComments] = useState(initialRCAAnalysisState.finalComments);
  const [isFinalized, setIsFinalized] = useState(initialRCAAnalysisState.isFinalized);
  const [analysisDocumentId, setAnalysisDocumentId] = useState<string | null>(null);
  
  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [currentEventStatus, setCurrentEventStatus] = useState<ReportedEventStatus>('Pendiente');
  const [rejectionDetails, setRejectionDetails] = useState<RejectionDetails | undefined>(initialRCAAnalysisState.rejectionDetails);
  const [createdBy, setCreatedBy] = useState<string | undefined>(initialRCAAnalysisState.createdBy);


  const loadAnalysisData = useCallback(async (id: string): Promise<boolean> => {
    setIsLoadingPage(true);
    try {
      const analysisDocRef = doc(db, "rcaAnalyses", id);
      const docSnap = await getDoc(analysisDocRef);

      const reportedEventRef = doc(db, "reportedEvents", id);
      const reportedEventSnap = await getDoc(reportedEventRef);
      if (reportedEventSnap.exists()) {
        setCurrentEventStatus(reportedEventSnap.data().status as ReportedEventStatus);
      } else {
        setCurrentEventStatus('Pendiente');
      }


      if (docSnap.exists()) {
        const data = docSnap.data() as RCAAnalysisDocument;
        setEventData(data.eventData);

        const loadedImmediateActions = data.immediateActions || [];
        setImmediateActions(loadedImmediateActions);
        if (loadedImmediateActions.length > 0) {
            let maxCounter = 0;
            loadedImmediateActions.forEach(act => {
                if (act.id && typeof act.id === 'string') {
                    const parts = act.id.split('-IMA-');
                    if (parts.length === 2) {
                        const num = parseInt(parts[1], 10);
                        if (!isNaN(num) && num > maxCounter) {
                            maxCounter = num;
                        }
                    }
                }
            });
            setImmediateActionCounter(maxCounter + 1);
        } else {
            setImmediateActionCounter(1);
        }

        setProjectLeader(data.projectLeader || '');
        setDetailedFacts(data.detailedFacts || { ...initialDetailedFacts });
        setAnalysisDetails(data.analysisDetails || '');
        setPreservedFacts(data.preservedFacts || []);
        setAnalysisTechnique(data.analysisTechnique || '');
        setAnalysisTechniqueNotes(data.analysisTechniqueNotes || '');
        setIshikawaData(data.ishikawaData || JSON.parse(JSON.stringify(initialIshikawaData)));
        setFiveWhysData(data.fiveWhysData || JSON.parse(JSON.stringify(initialFiveWhysData)));
        setCtmData(data.ctmData || JSON.parse(JSON.stringify(initialCTMData)));
        setIdentifiedRootCauses(data.identifiedRootCauses || []);

        const loadedPlannedActions = data.plannedActions || [];
        setPlannedActions(loadedPlannedActions);
        if (loadedPlannedActions.length > 0) {
            let maxCounter = 0;
            loadedPlannedActions.forEach(pa => {
                 if (pa.id && typeof pa.id === 'string') {
                    const parts = pa.id.split('-PA-');
                    if (parts.length === 2) {
                        const num = parseInt(parts[1], 10);
                        if (!isNaN(num) && num > maxCounter) {
                            maxCounter = num;
                        }
                    }
                }
            });
            setPlannedActionCounter(maxCounter + 1);
        } else {
            setPlannedActionCounter(1);
        }

        setValidations(data.validations || []);
        setFinalComments(data.finalComments || '');
        setIsFinalized(data.isFinalized || false);
        setRejectionDetails(data.rejectionDetails);
        setCreatedBy(data.createdBy);
        setAnalysisDocumentId(id);

        if (lastLoadedAnalysisIdRef.current !== null && lastLoadedAnalysisIdRef.current !== id) {
          toast({ title: "Análisis Cargado", description: `Se cargó el análisis ID: ${id}` });
        }
        lastLoadedAnalysisIdRef.current = id;
        setMaxCompletedStep(prevMax => Math.max(prevMax, data.isFinalized ? 5 : (data.validations?.length > 0 && data.plannedActions?.every(pa => data.validations.find(v => v.actionId === pa.id)?.status === 'validated') ? 4 : (data.identifiedRootCauses?.length > 0 ? 3 : (data.projectLeader ? 2 : 1)))));
        return true;
      } else {
        // Only show "Not Found" and reset if the ID is different from what we might have just tried to create
        // OR if there was no previous loaded ID (meaning it's a direct navigation to a non-existent ID).
        if (lastLoadedAnalysisIdRef.current !== id || lastLoadedAnalysisIdRef.current === null) {
            toast({ title: "Análisis No Encontrado", description: `No se encontró un análisis con ID: ${id}. Iniciando nuevo análisis.`, variant: "destructive" });
            setEventData(initialRCAAnalysisState.eventData);
            setImmediateActions(initialRCAAnalysisState.immediateActions);
            setImmediateActionCounter(1);
            setProjectLeader(initialRCAAnalysisState.projectLeader);
            setDetailedFacts(initialRCAAnalysisState.detailedFacts);
            setAnalysisDetails(initialRCAAnalysisState.analysisDetails);
            setPreservedFacts(initialRCAAnalysisState.preservedFacts);
            setAnalysisTechnique(initialRCAAnalysisState.analysisTechnique);
            setAnalysisTechniqueNotes(initialRCAAnalysisState.analysisTechniqueNotes);
            setIshikawaData(JSON.parse(JSON.stringify(initialIshikawaData)));
            setFiveWhysData(JSON.parse(JSON.stringify(initialFiveWhysData)));
            setCtmData(JSON.parse(JSON.stringify(initialCTMData)));
            setIdentifiedRootCauses(initialRCAAnalysisState.identifiedRootCauses);
            setPlannedActions(initialRCAAnalysisState.plannedActions);
            setPlannedActionCounter(1);
            setValidations(initialRCAAnalysisState.validations);
            setFinalComments(initialRCAAnalysisState.finalComments);
            setIsFinalized(initialRCAAnalysisState.isFinalized);
            setRejectionDetails(initialRCAAnalysisState.rejectionDetails);
            setCreatedBy(initialRCAAnalysisState.createdBy);
            setCurrentEventStatus('Pendiente');
            setAnalysisDocumentId(null);
            setMaxCompletedStep(0);
            lastLoadedAnalysisIdRef.current = null;
            router.replace('/analisis', { scroll: false });
        }
        return false;
      }
    } catch (error) {
      console.error("Error loading RCA analysis: ", error);
      toast({ title: "Error al Cargar Análisis", description: "No se pudo cargar el análisis desde Firestore.", variant: "destructive" });
        setEventData(initialRCAAnalysisState.eventData);
        setImmediateActions(initialRCAAnalysisState.immediateActions);
        setImmediateActionCounter(1);
        setProjectLeader(initialRCAAnalysisState.projectLeader);
        setDetailedFacts(initialRCAAnalysisState.detailedFacts);
        setAnalysisDetails(initialRCAAnalysisState.analysisDetails);
        setPreservedFacts(initialRCAAnalysisState.preservedFacts);
        setAnalysisTechnique(initialRCAAnalysisState.analysisTechnique);
        setAnalysisTechniqueNotes(initialRCAAnalysisState.analysisTechniqueNotes);
        setIshikawaData(JSON.parse(JSON.stringify(initialIshikawaData)));
        setFiveWhysData(JSON.parse(JSON.stringify(initialFiveWhysData)));
        setCtmData(JSON.parse(JSON.stringify(initialCTMData)));
        setIdentifiedRootCauses(initialRCAAnalysisState.identifiedRootCauses);
        setPlannedActions(initialRCAAnalysisState.plannedActions);
        setPlannedActionCounter(1);
        setValidations(initialRCAAnalysisState.validations);
        setFinalComments(initialRCAAnalysisState.finalComments);
        setIsFinalized(initialRCAAnalysisState.isFinalized);
        setRejectionDetails(initialRCAAnalysisState.rejectionDetails);
        setCreatedBy(initialRCAAnalysisState.createdBy);
        setCurrentEventStatus('Pendiente');
        setAnalysisDocumentId(null);
        setMaxCompletedStep(0);
      return false;
    } finally {
        setIsLoadingPage(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, router]);

  const analysisIdFromParams = useMemo(() => searchParams.get('id'), [searchParams]);

 useEffect(() => {
    const currentId = analysisIdFromParams;
    const stepParam = searchParams.get('step');
    const previousLoadedId = lastLoadedAnalysisIdRef.current;

    if (currentId) {
        if (currentId === previousLoadedId && !stepParam) {
             setIsLoadingPage(false);
             return;
        }
        setIsLoadingPage(true);
        loadAnalysisData(currentId).then(success => {
            if (success) {
                if (stepParam) {
                    const targetStep = parseInt(stepParam, 10);
                    if (targetStep >= 1 && targetStep <= 5) {
                        setStep(targetStep);
                    }
                } else if (previousLoadedId === currentId) {
                    setStep(prevStep => (prevStep >= 1 && prevStep <= 5 ? prevStep : 1));
                } else {
                    setStep(1);
                }
            } else {
                if (currentId !== previousLoadedId) { 
                    setStep(1);
                    setMaxCompletedStep(0);
                }
            }
        }).finally(() => {
            setIsLoadingPage(false);
        });
    } else { 
        if (lastLoadedAnalysisIdRef.current !== null) {
            setIsLoadingPage(true); 
            setEventData(initialRCAAnalysisState.eventData);
            setImmediateActions(initialRCAAnalysisState.immediateActions);
            setImmediateActionCounter(1);
            setProjectLeader(initialRCAAnalysisState.projectLeader);
            setDetailedFacts(initialRCAAnalysisState.detailedFacts);
            setAnalysisDetails(initialRCAAnalysisState.analysisDetails);
            setPreservedFacts(initialRCAAnalysisState.preservedFacts);
            setAnalysisTechnique(initialRCAAnalysisState.analysisTechnique);
            setAnalysisTechniqueNotes(initialRCAAnalysisState.analysisTechniqueNotes);
            setIshikawaData(JSON.parse(JSON.stringify(initialIshikawaData)));
            setFiveWhysData(JSON.parse(JSON.stringify(initialFiveWhysData)));
            setCtmData(JSON.parse(JSON.stringify(initialCTMData)));
            setIdentifiedRootCauses(initialRCAAnalysisState.identifiedRootCauses);
            setPlannedActions(initialRCAAnalysisState.plannedActions);
            setPlannedActionCounter(1);
            setValidations(initialRCAAnalysisState.validations);
            setFinalComments(initialRCAAnalysisState.finalComments);
            setIsFinalized(initialRCAAnalysisState.isFinalized);
            setRejectionDetails(initialRCAAnalysisState.rejectionDetails);
            setCreatedBy(initialRCAAnalysisState.createdBy);
            setCurrentEventStatus('Pendiente');
            setAnalysisDocumentId(null);
            setMaxCompletedStep(0);
            setStep(1);
            lastLoadedAnalysisIdRef.current = null; 
            setIsLoadingPage(false);
        } else {
             setIsLoadingPage(false);
             setStep(1);
             setMaxCompletedStep(0);
        }
    }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [analysisIdFromParams, searchParams]);


  useEffect(() => {
    const fetchConfigData = async () => {
      try {
        const sitesCollectionRef = collection(db, "sites");
        const sitesQuery = query(sitesCollectionRef, orderBy("name", "asc"));
        const sitesSnapshot = await getDocs(sitesQuery);
        const sitesData = sitesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Site));
        setAvailableSitesFromDB(sitesData);

        const usersCollectionRef = collection(db, "users");
        const usersQuery = query(usersCollectionRef, orderBy("name", "asc"));
        const usersSnapshot = await getDocs(usersQuery);
        const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FullUserProfile));
        setAvailableUsersFromDB(usersData);

      } catch (error) {
        console.error("Error fetching config data for RCA Analysis: ", error);
        toast({ title: "Error al Cargar Configuración", description: "No se pudieron cargar los sitios o usuarios.", variant: "destructive" });
      }
    };
    fetchConfigData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);


  const ensureEventId = useCallback((): string => {
    const newEventID = `E-${String(Date.now()).slice(-5)}-${String(eventCounter).padStart(3, '0')}`;
    setEventData(prev => ({ ...prev, id: newEventID }));
    setEventCounter(prev => prev + 1);
    if (!createdBy && userProfile?.name) { 
      setCreatedBy(userProfile.name);
    }
    return newEventID;
  }, [eventCounter, createdBy, userProfile?.name]);

 const handleSaveAnalysisData = async (
    showToast: boolean = true,
    finalizedOverride?: boolean,
    statusOverride?: ReportedEventStatus,
    currentRejectionReason?: string,
    validationsOverride?: Validation[]
  ): Promise<boolean> => {
    let currentId = analysisDocumentId;
    let isNewEventCreation = false;

    if (!currentId) {
      currentId = ensureEventId(); // Generates ID, updates eventData.id, eventCounter, createdBy
      setAnalysisDocumentId(currentId); // Set main analysisDocumentId state
      isNewEventCreation = true;
    }
    if (!currentId) {
      if (showToast) toast({ title: "Error Crítico", description: "No se pudo obtener o generar un ID para el análisis.", variant: "destructive" });
      return false;
    }

    setIsSaving(true);
    const currentIsFinalized = finalizedOverride !== undefined ? finalizedOverride : isFinalized;
    const consistentEventData = { ...eventData, id: currentId }; 

    let currentRejectionDetailsToSave = rejectionDetails;
    if (statusOverride === "Rechazado" && currentRejectionReason) {
      currentRejectionDetailsToSave = {
        reason: currentRejectionReason,
        rejectedBy: userProfile?.name || "Sistema",
        rejectedAt: new Date().toISOString(),
      };
    } else if (statusOverride === "En análisis" || statusOverride === "Pendiente" || statusOverride === "Finalizado") {
        currentRejectionDetailsToSave = undefined; 
    }

    let currentCreatedByState = createdBy;
    if (!currentCreatedByState && userProfile?.name) {
      currentCreatedByState = userProfile.name;
      if (!createdBy) setCreatedBy(currentCreatedByState);
    }


    const rcaDocPayload: Partial<RCAAnalysisDocument> = {
      eventData: consistentEventData, immediateActions, projectLeader, detailedFacts, analysisDetails,
      preservedFacts, analysisTechnique, analysisTechniqueNotes, ishikawaData,
      fiveWhysData, ctmData, identifiedRootCauses, plannedActions,
      validations: (validationsOverride !== undefined) ? validationsOverride : validations,
      finalComments, isFinalized: currentIsFinalized,
      rejectionDetails: currentRejectionDetailsToSave,
      createdBy: currentCreatedByState, 
    };

    try {
      const rcaDocRef = doc(db, "rcaAnalyses", currentId);
      const rcaDocSnap = await getDoc(rcaDocRef);

      let finalCommentsToSave = finalComments;
      if (statusOverride === "Rechazado" && currentRejectionReason) {
          const rejecterName = userProfile?.name || "Sistema";
          let baseRejectMsg = `Evento Rechazado por ${rejecterName} el ${new Date().toLocaleDateString('es-CL')}.`;
          if (currentRejectionReason) {
            baseRejectMsg += `\nMotivo: ${currentRejectionReason}`;
          }
          finalCommentsToSave = `${baseRejectMsg}${finalComments && !finalComments.startsWith('Evento Rechazado') ? `\n\nComentarios Adicionales Previos:\n${finalComments}` : ''}`;
      } else if ( (statusOverride === "En análisis" || statusOverride === "Pendiente" || statusOverride === "Finalizado") && finalComments.startsWith("Evento Rechazado")) {
           finalCommentsToSave = finalComments.split("\n\nComentarios Adicionales Previos:\n")[1] || "";
      }


      const dataToSave: RCAAnalysisDocument = {
        ...(rcaDocPayload as Omit<RCAAnalysisDocument, 'createdAt' | 'updatedAt'>),
        finalComments: finalCommentsToSave,
        updatedAt: new Date().toISOString(),
        createdAt: rcaDocSnap.exists() && rcaDocSnap.data().createdAt ? rcaDocSnap.data().createdAt : new Date().toISOString(),
        createdBy: (rcaDocSnap.exists() && rcaDocSnap.data().createdBy) ? rcaDocSnap.data().createdBy : currentCreatedByState,
      };

      const sanitizedDataToSave = sanitizeForFirestore(dataToSave);
      await setDoc(rcaDocRef, sanitizedDataToSave, { merge: true });

      if (finalCommentsToSave !== finalComments) {
          setFinalComments(finalCommentsToSave);
      }
      if (finalizedOverride !== undefined && isFinalized !== finalizedOverride) {
        setIsFinalized(finalizedOverride);
      }
      if (currentRejectionDetailsToSave !== rejectionDetails) {
         setRejectionDetails(currentRejectionDetailsToSave);
      }
      if (validationsOverride !== undefined && validationsOverride !== validations) {
        setValidations(validationsOverride); 
      }
      if (dataToSave.createdBy && createdBy !== dataToSave.createdBy) {
        setCreatedBy(dataToSave.createdBy);
      }


      const reportedEventRef = doc(db, "reportedEvents", currentId);
      const reportedEventSnap = await getDoc(reportedEventRef);
      let statusForReportedEvent: ReportedEventStatus;

      if(statusOverride) {
        statusForReportedEvent = statusOverride;
      } else if (currentIsFinalized) {
        statusForReportedEvent = "Finalizado";
      } else if (reportedEventSnap.exists()) {
        statusForReportedEvent = reportedEventSnap.data().status;
        const rcaData = sanitizedDataToSave;
        if (rcaData.plannedActions && rcaData.plannedActions.length > 0) {
            const allActionsValidatedInSave = rcaData.plannedActions.every(pa => {
                const validationEntry = rcaData.validations.find(v => v.actionId === pa.id);
                return validationEntry && validationEntry.status === 'validated';
            });
             const anyActionRejected = rcaData.validations.some(v => v.status === 'rejected');

            if (allActionsValidatedInSave && !anyActionRejected) { 
                statusForReportedEvent = "En validación";
            } else if (statusForReportedEvent === "Pendiente" && (rcaData.projectLeader || rcaData.identifiedRootCauses?.length > 0)) {
                 statusForReportedEvent = "En análisis";
            }
        } else if (statusForReportedEvent === "Pendiente" && (rcaData.projectLeader || rcaData.identifiedRootCauses?.length > 0)) {
            statusForReportedEvent = "En análisis";
        }
      } else {
        statusForReportedEvent = "Pendiente";
      }
      setCurrentEventStatus(statusForReportedEvent);

      const reportedEventPayload: ReportedEvent = {
        id: currentId,
        title: consistentEventData.focusEventDescription || "Evento sin título asignado",
        site: consistentEventData.place || "Sin sitio especificado",
        date: consistentEventData.date || new Date().toISOString().split('T')[0],
        type: consistentEventData.eventType || '',
        priority: consistentEventData.priority || '',
        status: statusForReportedEvent,
        description: consistentEventData.focusEventDescription || "Sin descripción detallada.",
        updatedAt: new Date().toISOString(),
      };

      const sanitizedReportedEventPayload = sanitizeForFirestore(reportedEventPayload);

      if (!reportedEventSnap.exists()) {
        await setDoc(reportedEventRef, { ...sanitizedReportedEventPayload, createdAt: new Date().toISOString() });
      } else {
        const updatePayload: Partial<ReportedEvent> = {
            title: sanitizedReportedEventPayload.title,
            site: sanitizedReportedEventPayload.site,
            date: sanitizedReportedEventPayload.date,
            type: sanitizedReportedEventPayload.type,
            priority: sanitizedReportedEventPayload.priority,
            description: sanitizedReportedEventPayload.description,
            status: statusForReportedEvent,
            updatedAt: new Date().toISOString(),
        };
        await updateDoc(reportedEventRef, sanitizeForFirestore(updatePayload));
      }

      if (isNewEventCreation) {
        lastLoadedAnalysisIdRef.current = currentId;
        router.replace(`/analisis?id=${currentId}&step=${step}`, { scroll: false });
      }

      if (showToast) {
        toast({ title: "Progreso Guardado", description: `Análisis ${currentId} guardado. Evento reportado actualizado a estado: ${statusForReportedEvent}.` });
      }
      return true;
    } catch (error) {
      console.error("Error saving data to Firestore: ", error);
      if (isNewEventCreation) { 
        setAnalysisDocumentId(null);
        lastLoadedAnalysisIdRef.current = null; 
      }
      if (showToast) {
        toast({ title: "Error al Guardar", description: `No se pudo guardar la información. Error: ${(error as Error).message}`, variant: "destructive" });
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveFromStep2 = async (showToast: boolean = true) => {
    const saveSuccess = await handleSaveAnalysisData(showToast); 
    if (!saveSuccess) return;

    if (analysisDocumentId) {
      setIsSaving(true);
      try {
        const reportedEventRef = doc(db, "reportedEvents", analysisDocumentId);
        const reportedEventSnap = await getDoc(reportedEventRef);
        if (reportedEventSnap.exists() && reportedEventSnap.data().status === "Pendiente") {
          await updateDoc(reportedEventRef, sanitizeForFirestore({ status: "En análisis", updatedAt: new Date().toISOString() }));
          setCurrentEventStatus("En análisis"); 
          if (showToast) {
            toast({ title: "Estado Actualizado", description: `El evento ${analysisDocumentId} ahora está "En análisis".` });
          }
        }
      } catch (error) {
        console.error("Error updating ReportedEvent status from Step 2: ", error);
        if (showToast) {
          toast({ title: "Error al Actualizar Estado", description: "No se pudo actualizar el estado del evento reportado.", variant: "destructive" });
        }
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleApproveEvent = async () => {
    let currentId = analysisDocumentId;
    if (!currentId) { 
        currentId = ensureEventId();
        setAnalysisDocumentId(currentId);
    }
    if (!currentId) {
      toast({ title: "Error", description: "No se puede aprobar un evento sin ID.", variant: "destructive" });
      return;
    }

    if (currentEventStatus !== 'Pendiente') {
      toast({ title: "Acción no Válida", description: `El evento ya está "${currentEventStatus}". No se puede aprobar.`, variant: "default" });
      return;
    }
    setIsSaving(true);
    const success = await handleSaveAnalysisData(false, undefined, "En análisis");
    if (success) {
      toast({ title: "Evento Aprobado", description: `El evento ${currentId} ha sido marcado como "En análisis".` });
      setCurrentEventStatus("En análisis");

      const siteInfo = availableSitesFromDB.find(s => s.name === eventData.place);
      if (siteInfo && siteInfo.empresa) {
        const usersInCompany = availableUsersFromDB.filter(u => u.empresa === siteInfo.empresa);
        let emailsSentCount = 0;
        let attemptedEmails = 0;
        for (const user of usersInCompany) {
          if (user.email && (user.emailNotifications === undefined || user.emailNotifications)) {
            attemptedEmails++;
            const emailSubject = `Evento RCA Aprobado: ${eventData.focusEventDescription.substring(0, 40)}... (ID: ${currentId})`;
            const emailBody = `Estimado/a ${user.name},\n\nEl evento "${eventData.focusEventDescription}" (ID: ${currentId}) reportado en el sitio "${siteInfo.name}" (Empresa: "${siteInfo.empresa}") ha sido aprobado y ha pasado al estado 'En análisis'.\n\nPuede revisarlo en el sistema.\n\nSaludos,\nSistema RCA Assistant`;
            const emailResult = await sendEmailAction({ to: user.email, subject: emailSubject, body: emailBody });
            if(emailResult.success) emailsSentCount++;
          }
        }
        if (attemptedEmails > 0) {
          toast({ title: "Notificaciones de Aprobación", description: `${emailsSentCount} de ${attemptedEmails} correos de notificación procesados para usuarios de la empresa '${siteInfo.empresa}'.` });
        } else {
          toast({ title: "Notificación", description: `No se encontraron usuarios elegibles para notificar en la empresa '${siteInfo.empresa}'.`, variant: "default" });
        }
      } else {
        toast({ title: "Notificación Parcial", description: "No se pudo determinar la empresa del sitio o no hay usuarios de esa empresa configurados para notificar.", variant: "default" });
      }
    } else {
      toast({ title: "Error al Aprobar", description: "No se pudo actualizar el estado del evento.", variant: "destructive" });
    }
    setIsSaving(false);
  };

  const handleRejectEvent = async () => {
    let currentId = analysisDocumentId;
    if (!currentId) { 
        currentId = ensureEventId();
        setAnalysisDocumentId(currentId);
    }
     if (!currentId) {
      toast({ title: "Error", description: "No se puede rechazar un evento sin ID.", variant: "destructive" });
      setIsRejectConfirmOpen(false);
      setRejectionReason('');
      return;
    }
    if (!rejectionReason.trim()) {
        toast({ title: "Motivo Requerido", description: "Por favor, ingrese un motivo para el rechazo.", variant: "destructive" });
        return;
    }

    setIsSaving(true);
    
    let rcaDocCreatorName = 'Creador Desconocido';
    let rcaDocCreatorId = createdBy; // User NAME

    if (rcaDocCreatorId) { // if createdBy (name) is already in state
      const creatorUser = availableUsersFromDB.find(u => u.name === rcaDocCreatorId);
      if (creatorUser) rcaDocCreatorName = creatorUser.name;
    } else { // Try to fetch from DB if not in state
        try {
            const rcaDocRef = doc(db, "rcaAnalyses", currentId);
            const rcaDocSnap = await getDoc(rcaDocRef);
            if (rcaDocSnap.exists()) {
                const rcaData = rcaDocSnap.data() as RCAAnalysisDocument;
                rcaDocCreatorId = rcaData.createdBy; // This should be the name
                if (rcaDocCreatorId) {
                  const creatorUser = availableUsersFromDB.find(u => u.name === rcaDocCreatorId);
                  rcaDocCreatorName = creatorUser ? creatorUser.name : 'Creador Desconocido (No encontrado)';
                  if (rcaData.createdBy && createdBy !== rcaData.createdBy) {
                      setCreatedBy(rcaData.createdBy); 
                  }
                }
            }
        } catch (fetchError) {
            console.error("Error fetching RCA document for creator info:", fetchError);
        }
    }

    const success = await handleSaveAnalysisData(
      false,
      true, 
      "Rechazado",
      rejectionReason
    );

    if (success) {
      toast({ title: "Evento Rechazado", description: `El evento ${currentId} ha sido marcado como rechazado.` });
      setCurrentEventStatus("Rechazado"); 

      const creatorNameToNotify = rcaDocCreatorId; 
      const creatorProfile = availableUsersFromDB.find(u => u.name === creatorNameToNotify);
      
      let emailNotificationStatus = `Evento ${currentId} rechazado. `;
      if (creatorProfile && creatorProfile.email && (creatorProfile.emailNotifications === undefined || creatorProfile.emailNotifications)) {
        const emailSubject = `Evento RCA Rechazado: ${eventData.focusEventDescription.substring(0, 40)}... (ID: ${currentId})`;
        const rejectedByName = userProfile?.name || "Sistema";
        const formattedRejectionDate = new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });
        const emailBody = `Estimado/a ${creatorProfile.name},\n\nEl evento "${eventData.focusEventDescription}" (ID: ${currentId}) que usted creó/reportó ha sido rechazado.\n\nMotivo del Rechazo: ${rejectionReason}\nRechazado por: ${rejectedByName}\nFecha de Rechazo: ${formattedRejectionDate}\n\nPor favor, revise los detalles en el sistema si es necesario.\n\nSaludos,\nSistema RCA Assistant`;
        const emailResult = await sendEmailAction({ to: creatorProfile.email, subject: emailSubject, body: emailBody });
        if (emailResult.success) {
          emailNotificationStatus += `Notificación de rechazo enviada a ${creatorProfile.name} (creador del evento).`;
        } else {
          emailNotificationStatus += `No se pudo enviar correo de rechazo a ${creatorProfile.name} (creador del evento): ${emailResult.message}`;
        }
      } else {
        emailNotificationStatus += `No se pudo notificar al creador del evento (${creatorNameToNotify || 'No Identificado'}) por correo (no encontrado o notificaciones desactivadas).`;
      }
       toast({ title: "Resultado de Rechazo", description: emailNotificationStatus, variant: "default", duration: 7000 });

      setRejectionReason('');
      setIsRejectConfirmOpen(false);
    } else {
      toast({ title: "Error al Rechazar", description: "No se pudo actualizar el estado del evento.", variant: "destructive" });
    }
    setIsSaving(false);
  };


  const isStep3ValidForNavigation = useMemo(() => {
    const describedRootCauses = identifiedRootCauses.filter(rc => rc.description && rc.description.trim() !== '');

    if (identifiedRootCauses.length > 0 && describedRootCauses.length === 0) {
      if (identifiedRootCauses[0] && !identifiedRootCauses[0].description?.trim()) {
        return false;
      }
    } else if (identifiedRootCauses.length === 0 && plannedActions.length > 0) {
      return false;
    }


    if (plannedActions.length > 0) {
      for (const action of plannedActions) {
        if (!action.description.trim()) return false;
        if (!action.relatedRootCauseIds || action.relatedRootCauseIds.length === 0) return false;
        if (!action.responsible) return false;
        if (!action.dueDate) return false;
      }
    }

    if (describedRootCauses.length > 0) {
      const allAddressedRootCauseIds = new Set<string>();
      plannedActions.forEach(action => {
        action.relatedRootCauseIds?.forEach(rcId => allAddressedRootCauseIds.add(rcId));
      });

      for (const rc of describedRootCauses) {
        if (!allAddressedRootCauseIds.has(rc.id)) {
          return false;
        }
      }
    }
    return true;
  }, [identifiedRootCauses, plannedActions]);

  const validateStep1PreRequisites = (): { isValid: boolean, message?: string } => {
    const missingFields = [];
    if (!eventData.place) missingFields.push("Lugar del Evento");
    if (!eventData.date) missingFields.push("Fecha del Evento");
    if (!eventData.eventType) missingFields.push("Tipo de Evento");
    if (!eventData.priority) missingFields.push("Prioridad");
    if (!eventData.focusEventDescription.trim()) missingFields.push("Descripción del Evento Foco");

    if (missingFields.length > 0) {
      return {
        isValid: false,
        message: `Complete los campos obligatorios del Paso 1: ${missingFields.join(', ')}.`,
      };
    }
    if (currentEventStatus === 'Pendiente') {
      return { isValid: false, message: "Este evento debe ser aprobado antes de continuar con el análisis." };
    }
    if (currentEventStatus === 'Rechazado') {
      return { isValid: false, message: "Este evento ha sido rechazado y no puede continuar el análisis." };
    }
    return { isValid: true };
  };


  const handleGoToStep = async (targetStep: number) => {
    if (targetStep === 4 && step === 3 && !isStep3ValidForNavigation) {
       toast({
        title: "Validación Requerida en Paso 3",
        description: "Asegúrese de que todas las causas raíz descritas estén abordadas por un plan de acción antes de continuar al paso 4.",
        variant: "destructive",
        duration: 7000
      });
      return;
    }

    if (targetStep > step && targetStep > maxCompletedStep + 1 && targetStep !== 1) {
      return;
    }

    // Validaciones específicas al intentar avanzar desde el Paso 1
    if (step === 1 && targetStep > 1) {
      const step1Validation = validateStep1PreRequisites();
      if (!step1Validation.isValid) {
        toast({
          title: "Acción Requerida en Paso 1",
          description: step1Validation.message,
          variant: "destructive",
        });
        return;
      }
    }
    
    let currentId = analysisDocumentId;
    let isNewEventForNav = false;
    if (targetStep >=1 && !currentId && targetStep > 1 ) {
        currentId = ensureEventId();
        setAnalysisDocumentId(currentId); 
        isNewEventForNav = true;
    }

    if (isNewEventForNav && currentId) {
       const saveSuccess = await handleSaveAnalysisData(false);
       if (!saveSuccess) {
         if (analysisDocumentId === currentId) setAnalysisDocumentId(null); // Revert ID if save failed
         return;
       }
    }

    router.replace(`/analisis?id=${currentId || analysisDocumentId}&step=${targetStep}`, { scroll: false });
    setStep(targetStep);
    if (targetStep > maxCompletedStep && targetStep > step ) {
        setMaxCompletedStep(targetStep -1);
    }
  };

  const handleNextStep = async () => {
    // Validaciones específicas al intentar avanzar desde el Paso 1
    if (step === 1) {
      const step1Validation = validateStep1PreRequisites();
      if (!step1Validation.isValid) {
        toast({
          title: "Acción Requerida en Paso 1",
          description: step1Validation.message,
          variant: "destructive",
        });
        return;
      }
    }
    
    let currentId = analysisDocumentId;
    let isNewEventCreation = false;
    if (!currentId && step >= 1) { 
        currentId = ensureEventId();
        setAnalysisDocumentId(currentId);
        isNewEventCreation = true;
    }
    
    if (!currentId && step >= 1) { 
        toast({ title: "Error de Sincronización", description: "Por favor, complete el Paso 1 para generar un ID antes de continuar.", variant: "destructive"});
        setStep(1);
        return;
    }

    let saveSuccess = false;
    if (step === 1) {
      saveSuccess = await handleSaveAnalysisData(false);
    } else if (step === 2) {
      await handleSaveFromStep2(false);
      saveSuccess = true;
    } else if (step === 3) {
       if (!isStep3ValidForNavigation) {
         toast({
            title: "Revisión Necesaria en Paso 3",
            description: "Verifique que todas las causas raíz descritas estén abordadas por un plan de acción completo.",
            variant: "destructive",
            duration: 7000
          });
        return;
      }
      saveSuccess = await handleSaveAnalysisData(false);
    } else if (step === 4) {
        if (plannedActions.length > 0) {
            const allActionsDecided = plannedActions.every(pa => {
                if (!pa || !pa.id) return true;
                const validationEntry = validations.find(v => v && v.actionId === pa.id);
                return validationEntry && (validationEntry.status === 'validated' || validationEntry.status === 'rejected');
            });

            if (!allActionsDecided) {
                toast({
                    title: "Acciones Pendientes de Decisión",
                    description: "Todas las acciones planificadas deben estar validadas o rechazadas para continuar al Paso 5.",
                    variant: "destructive",
                });
                return;
            }
        }
        saveSuccess = await handleSaveAnalysisData(false);
    } else {
      saveSuccess = true;
    }

    if (saveSuccess || (step !== 1 && step !== 2 && step !==3 && step !==4) ) {
      const newStep = Math.min(step + 1, 5);
      const newMaxCompletedStep = Math.max(maxCompletedStep, step);
      setStep(newStep);
      setMaxCompletedStep(newMaxCompletedStep);
       if (currentId && (analysisDocumentId || isNewEventCreation)) {
         const idForNav = analysisDocumentId || currentId;
         router.replace(`/analisis?id=${idForNav}&step=${newStep}`, { scroll: false });
       }
    }
  };

  const handlePreviousStep = () => {
    const newStep = Math.max(step - 1, 1);
    setStep(newStep);
    if (analysisDocumentId) {
      router.replace(`/analisis?id=${analysisDocumentId}&step=${newStep}`, { scroll: false });
    } else if (step === 1) {
       const currentIdParam = searchParams.get('id');
       if (currentIdParam) router.replace(`/analisis?id=${currentIdParam}`, { scroll: false });
       else router.replace('/analisis', { scroll: false });
    }
  };

  const handleEventDataChange = (field: keyof RCAEventData, value: string | EventType | PriorityType) => {
    setEventData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddImmediateAction = () => {
    let tempEventId = eventData.id;
    if (!tempEventId) {
        tempEventId = ensureEventId(); 
        setAnalysisDocumentId(tempEventId); 
    }
    const newActionId = `${tempEventId}-IMA-${String(immediateActionCounter).padStart(3, '0')}`;
    setImmediateActions(prev => [...prev, { id: newActionId, eventId: tempEventId, description: '', responsible: '', dueDate: '' }]);
    setImmediateActionCounter(prev => prev + 1);
  };

  const handleUpdateImmediateAction = (index: number, field: keyof Omit<ImmediateAction, 'eventId' | 'id'>, value: string) => {
    setImmediateActions(prev => prev.map((act, i) => i === index ? { ...act, [field]: value } : act));
  };

  const handleRemoveImmediateAction = (index: number) => {
    setImmediateActions(prev => prev.filter((_, i) => i !== index));
  };

  const handleProjectLeaderChange = (value: string) => {
    setProjectLeader(value);
  };

  const handleDetailedFactChange = (field: keyof DetailedFacts, value: string) => {
    setDetailedFacts(prev => ({ ...prev, [field]: value }));
  };

  const handleAddPreservedFact = (fact: Omit<PreservedFact, 'id' | 'uploadDate' | 'eventId'>) => {
    let currentEventId = analysisDocumentId;
    if (!currentEventId) {
      currentEventId = ensureEventId();
      setAnalysisDocumentId(currentEventId);
    }
    if (!currentEventId) {
      toast({ title: "Error", description: "ID de evento no encontrado para asociar el hecho preservado.", variant: "destructive" });
      return;
    }
    const newFact: PreservedFact = {
      ...fact,
      id: `${currentEventId}-pf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      uploadDate: new Date().toISOString(),
      eventId: currentEventId,
    };
    setPreservedFacts(prev => [...prev, newFact]);
    toast({ title: "Hecho Preservado Añadido", description: `Se añadió "${newFact.userGivenName}".` });
  };

  const handleRemovePreservedFact = (id: string) => {
    setPreservedFacts(prev => prev.filter(fact => fact.id !== id));
    toast({ title: "Hecho Preservado Eliminado", variant: 'destructive'});
  };

  const handleAnalysisTechniqueChange = (value: AnalysisTechnique) => {
    setAnalysisTechnique(value);
    setAnalysisTechniqueNotes('');
    if (value === 'Ishikawa') {
      setIshikawaData(JSON.parse(JSON.stringify(initialIshikawaData)));
    } else if (value === 'WhyWhy') {
      const newFiveWhysData = JSON.parse(JSON.stringify(initialFiveWhysData));
       if (eventData.focusEventDescription) {
         newFiveWhysData[0].why = `¿Por qué ocurrió: "${eventData.focusEventDescription.substring(0,70)}${eventData.focusEventDescription.length > 70 ? "..." : ""}"?`;
       }
      setFiveWhysData(newFiveWhysData);
    } else if (value === 'CTM') {
      setCtmData(JSON.parse(JSON.stringify(initialCTMData)));
    }
  };

  const handleSetIshikawaData = (newData: IshikawaData) => {
    setIshikawaData(newData);
  };

  const handleAddFiveWhyEntry = () => {
    setFiveWhysData(prev => {
      const lastEntry = prev.length > 0 ? prev[prev.length - 1] : null;
      const initialWhy = lastEntry && lastEntry.because ? `¿Por qué: "${lastEntry.because.substring(0,70)}${lastEntry.because.length > 70 ? "..." : ""}"?` : '';
      return [...prev, { id: `5why-${Date.now()}-${Math.random().toString(36).substring(2,7)}`, why: initialWhy, because: '' }];
    });
  };

  const handleUpdateFiveWhyEntry = (id: string, field: 'why' | 'because', value: string) => {
    setFiveWhysData(prev => prev.map(entry => entry.id === id ? { ...entry, [field]: value } : entry));
  };

  const handleRemoveFiveWhyEntry = (id: string) => {
    setFiveWhysData(prev => prev.filter(entry => entry.id !== id));
  };

  const handleSetCtmData = (newData: CTMData) => {
    setCtmData(newData);
  };

  const handleAddIdentifiedRootCause = () => {
    setIdentifiedRootCauses(prev => [...prev, { id: `rc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, description: '' }]);
  };

  const handleUpdateIdentifiedRootCause = (id: string, description: string) => {
    setIdentifiedRootCauses(prev => prev.map(rc => rc.id === id ? { ...rc, description } : rc));
  };

  const handleRemoveIdentifiedRootCause = (id: string) => {
    setIdentifiedRootCauses(prev => prev.filter(rc => rc.id !== id));
  };

  const handleAddPlannedAction = () => {
    let currentEventId = analysisDocumentId;
    if (!currentEventId) {
        currentEventId = ensureEventId();
        setAnalysisDocumentId(currentEventId);
    }
    if (!currentEventId) {
      toast({ title: "Error", description: "No se pudo generar/obtener ID de evento para la acción planificada.", variant: "destructive" });
      return;
    }
    const newActionId = `${currentEventId}-PA-${String(plannedActionCounter).padStart(3, '0')}`;
    const newAction: PlannedAction = {
      id: newActionId,
      eventId: currentEventId,
      description: '',
      responsible: '',
      dueDate: '',
      relatedRootCauseIds: [],
      evidencias: [],
      userComments: '',
      isNotificationSent: false,
    };
    setPlannedActions(prev => [...prev, newAction]);
    setPlannedActionCounter(prev => prev + 1);
  };

  const handleUpdatePlannedAction = (index: number, field: keyof Omit<PlannedAction, 'eventId' | 'id'>, value: string | string[] | boolean) => {
    setPlannedActions(prev => prev.map((act, i) => i === index ? { ...act, [field]: value } : act));
  };

  const handleRemovePlannedAction = (index: number) => {
    setPlannedActions(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    setValidations(prevValidations => {
      const newValidations = plannedActions.map(pa => {
        const existingValidation = prevValidations.find(v => v.actionId === pa.id);
        return existingValidation || { actionId: pa.id, eventId: pa.eventId, status: 'pending' };
      });
      return newValidations.filter(v => plannedActions.some(pa => pa.id === v.actionId));
    });
  }, [plannedActions]);

  const handleToggleValidation = async (actionId: string, newStatus: Validation['status'], rejectionReasonInput?: string) => {
    const newValidationsArray = validations.map(v => {
      if (v.actionId === actionId) {
        const nowISO = new Date().toISOString();
        let updatedValidation: Validation = { ...v, status: newStatus };

        if (newStatus === 'validated') {
          updatedValidation.validatedAt = nowISO;
          updatedValidation.rejectedAt = undefined;
          updatedValidation.rejectionReason = undefined;
        } else if (newStatus === 'rejected') {
          updatedValidation.validatedAt = undefined;
          updatedValidation.rejectedAt = nowISO;
          updatedValidation.rejectionReason = rejectionReasonInput || "Motivo no especificado";
        } else { // 'pending'
          updatedValidation.validatedAt = undefined;
          updatedValidation.rejectedAt = undefined;
          updatedValidation.rejectionReason = undefined;
        }
        return updatedValidation;
      }
      return v;
    });
    
    setValidations(newValidationsArray);

    await handleSaveAnalysisData(
      false, 
      undefined, 
      undefined, 
      undefined, 
      newValidationsArray 
    );
  };

  const handlePrintReport = () => {
    const nonPrintableElements = document.querySelectorAll('.no-print');
    nonPrintableElements.forEach(el => el.classList.add('hidden'));
    window.print();
    nonPrintableElements.forEach(el => el.classList.remove('hidden'));
  };

  const handleMarkAsFinalized = async () => {
    let currentId = analysisDocumentId;
    if (!currentId) {
      currentId = ensureEventId();
      setAnalysisDocumentId(currentId);
    }

    if (!currentId) {
        toast({ title: "Error", description: "No se pudo obtener el ID del análisis para finalizar.", variant: "destructive" });
        setIsSaving(false);
        return;
    }

    setIsSaving(true);
    setIsFinalized(true); 

    const success = await handleSaveAnalysisData(false, true, "Finalizado");

    if (success) {
      toast({ title: "Proceso Finalizado", description: `Análisis ${currentId} marcado como finalizado y evento reportado actualizado.`, className: "bg-primary text-primary-foreground"});
    } else {
      setIsFinalized(false);
      toast({ title: "Error al Finalizar", description: "No se pudo guardar el estado finalizado del análisis. Intente de nuevo.", variant: "destructive" });
    }
    setIsSaving(false);
  };

  useEffect(() => {
    if (step > maxCompletedStep) {
      setMaxCompletedStep(step -1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  if (isLoadingPage) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando datos de análisis y configuración...</p>
      </div>
    );
  }

  return (
    <>
      <header className="text-center mb-8 no-print">
        <h1 className="text-3xl sm:text-4xl font-bold font-headline text-primary">Analizador RCA Avanzado</h1>
        <p className="text-muted-foreground mt-1">
          Herramienta de Análisis de Causa Raíz con gráficos. ID Análisis: <span className="font-semibold text-primary">{analysisDocumentId || "Nuevo Análisis"}</span>
          {analysisDocumentId && currentEventStatus && (
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                currentEventStatus === 'Rechazado' ? 'bg-destructive text-destructive-foreground' :
                currentEventStatus === 'Finalizado' ? 'bg-green-500 text-green-50' :
                'bg-secondary text-secondary-foreground'}`}>
                Estado: {currentEventStatus}
            </span>
          )}
        </p>
      </header>

      <div className="no-print">
        <StepNavigation
         currentStep={step}
         onNavigate={handleGoToStep}
         maxCompletedStep={maxCompletedStep}
         isStep3Valid={isStep3ValidForNavigation}
        />
        <Separator className="my-6" />
      </div>

      <div className={step === 1 ? "" : "print:hidden"}>
        {step === 1 && (
          <Step1Initiation
            eventData={eventData}
            onEventDataChange={handleEventDataChange}
            immediateActions={immediateActions}
            onAddImmediateAction={handleAddImmediateAction}
            onUpdateImmediateAction={handleUpdateImmediateAction}
            onRemoveImmediateAction={handleRemoveImmediateAction}
            availableSites={availableSitesFromDB}
            availableUsers={availableUsersFromDB}
            onContinue={handleNextStep}
            onForceEnsureEventId={ensureEventId}
            onSaveAnalysis={handleSaveAnalysisData}
            isSaving={isSaving}
            onApproveEvent={handleApproveEvent}
            onRejectEvent={() => {
              setRejectionReason(''); 
              setIsRejectConfirmOpen(true);
            }}
            isEventFinalized={isFinalized}
            currentEventStatus={currentEventStatus}
          />
        )}
      </div>
      <div className={step === 2 ? "" : "print:hidden"}>
      {step === 2 && (
        <Step2Facts
          projectLeader={projectLeader}
          onProjectLeaderChange={handleProjectLeaderChange}
          availableUsers={availableUsersFromDB}
          detailedFacts={detailedFacts}
          onDetailedFactChange={handleDetailedFactChange}
          analysisDetails={analysisDetails}
          onAnalysisDetailsChange={setAnalysisDetails}
          preservedFacts={preservedFacts}
          onAddPreservedFact={handleAddPreservedFact}
          onRemovePreservedFact={handleRemovePreservedFact}
          onPrevious={handlePreviousStep}
          onNext={handleNextStep}
          onSaveAnalysis={handleSaveFromStep2}
          isSaving={isSaving}
        />
      )}
      </div>
      <div className={step === 3 ? "" : "print:hidden"}>
      {step === 3 && (
        <Step3Analysis
          eventData={eventData}
          analysisTechnique={analysisTechnique}
          onAnalysisTechniqueChange={handleAnalysisTechniqueChange}
          analysisTechniqueNotes={analysisTechniqueNotes}
          onAnalysisTechniqueNotesChange={setAnalysisTechniqueNotes}
          ishikawaData={ishikawaData}
          onSetIshikawaData={handleSetIshikawaData}
          fiveWhysData={fiveWhysData}
          onAddFiveWhyEntry={handleAddFiveWhyEntry}
          onUpdateFiveWhyEntry={handleUpdateFiveWhyEntry}
          onRemoveFiveWhyEntry={handleRemoveFiveWhyEntry}
          ctmData={ctmData}
          onSetCtmData={handleSetCtmData}
          identifiedRootCauses={identifiedRootCauses}
          onAddIdentifiedRootCause={handleAddIdentifiedRootCause}
          onUpdateIdentifiedRootCause={handleUpdateIdentifiedRootCause}
          onRemoveIdentifiedRootCause={handleRemoveIdentifiedRootCause}
          plannedActions={plannedActions}
          onAddPlannedAction={handleAddPlannedAction}
          onUpdatePlannedAction={handleUpdatePlannedAction}
          onRemovePlannedAction={handleRemovePlannedAction}
          availableUsers={availableUsersFromDB}
          onPrevious={handlePreviousStep}
          onNext={handleNextStep}
          onSaveAnalysis={handleSaveAnalysisData}
          isSaving={isSaving}
        />
      )}
      </div>
      <div className={step === 4 ? "" : "print:hidden"}>
      {step === 4 && (
        <Step4Validation
          plannedActions={plannedActions}
          validations={validations}
          onToggleValidation={handleToggleValidation}
          projectLeader={projectLeader}
          availableUserProfiles={availableUsersFromDB}
          onPrevious={handlePreviousStep}
          onNext={handleNextStep}
          onSaveAnalysis={handleSaveAnalysisData}
          isSaving={isSaving}
        />
      )}
      </div>
      {step === 5 && (
        <Step5Results
          eventId={analysisDocumentId || eventData.id}
          eventData={eventData}
          detailedFacts={detailedFacts}
          analysisDetails={analysisDetails}
          analysisTechnique={analysisTechnique}
          analysisTechniqueNotes={analysisTechniqueNotes}
          ishikawaData={ishikawaData}
          fiveWhysData={fiveWhysData}
          ctmData={ctmData}
          identifiedRootCauses={identifiedRootCauses}
          plannedActions={plannedActions}
          preservedFacts={preservedFacts}
          finalComments={finalComments}
          onFinalCommentsChange={setFinalComments}
          onPrintReport={handlePrintReport}
          availableUsers={availableUsersFromDB}
          isFinalized={isFinalized}
          onMarkAsFinalized={handleMarkAsFinalized}
          onSaveAnalysis={handleSaveAnalysisData}
          isSaving={isSaving}
        />
      )}
      <AlertDialog open={isRejectConfirmOpen} onOpenChange={(open) => {
        if(!isSaving) {
          setIsRejectConfirmOpen(open);
          if (!open) setRejectionReason('');
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Rechazo de Evento</AlertDialogTitle>
            <AlertDialogDescription>
              ID Evento: {analysisDocumentId || 'N/A'}. Esta acción marcará el evento como rechazado y finalizado. No podrá ser modificado posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 my-4">
            <Label htmlFor="rejectionReasonDialog">Motivo del Rechazo <span className="text-destructive">*</span></Label>
            <Textarea
              id="rejectionReasonDialog"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explique por qué se rechaza este evento..."
              rows={3}
              disabled={isSaving}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                if (!isSaving) {
                  setRejectionReason('');
                  setIsRejectConfirmOpen(false); 
                }
              }}
              disabled={isSaving}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectEvent}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={isSaving || !rejectionReason.trim()}
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sí, Rechazar Evento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
