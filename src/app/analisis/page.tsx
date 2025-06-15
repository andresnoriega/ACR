
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

const initialRCAAnalysisState: Omit<RCAAnalysisDocument, 'createdAt' | 'updatedAt' | 'createdBy'> = {
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
};


export default function RCAAnalysisPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

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
  const [currentSimulatedUser, setCurrentSimulatedUser] = useState<string | null>(null);
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
        setAnalysisDocumentId(id);

        if (lastLoadedAnalysisIdRef.current !== null && lastLoadedAnalysisIdRef.current !== id) {
          toast({ title: "Análisis Cargado", description: `Se cargó el análisis ID: ${id}` });
        }
        lastLoadedAnalysisIdRef.current = id;
        setMaxCompletedStep(prevMax => Math.max(prevMax, data.isFinalized ? 5 : (data.validations?.length > 0 && data.plannedActions?.every(pa => data.validations.find(v => v.actionId === pa.id)?.status === 'validated') ? 4 : (data.identifiedRootCauses?.length > 0 ? 3 : (data.projectLeader ? 2 : 1)))));
        return true;
      } else {
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
        setAnalysisDocumentId(null);
        setMaxCompletedStep(0);
        setCurrentEventStatus('Pendiente');
        lastLoadedAnalysisIdRef.current = null;
        router.replace('/analisis', { scroll: false });
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
        setIsLoadingPage(true);
        loadAnalysisData(currentId).then(success => {
            if (success) {
                if (stepParam) {
                    const targetStep = parseInt(stepParam, 10);
                    if (targetStep >= 1 && targetStep <= 5) {
                        setStep(targetStep);
                    }
                } else if (previousLoadedId === currentId) {
                    // If same ID is loaded again (e.g. page refresh on step 3), keep current step
                    setStep(prevStep => (prevStep >= 1 && prevStep <= 5 ? prevStep : 1));
                } else {
                    // New ID loaded without step param, default to step 1
                    setStep(1);
                }
            } else {
                // If loading failed (e.g. non-existent ID)
                if (currentId !== previousLoadedId) { // Reset only if it's a new attempt to load a different (bad) ID
                    setStep(1);
                    setMaxCompletedStep(0);
                }
            }
        }).finally(() => {
            setIsLoadingPage(false);
        });
    } else { // No ID in params
        // If there was a previously loaded ID, means user navigated from an existing analysis to a new one (e.g. "New Analysis" button)
        if (lastLoadedAnalysisIdRef.current !== null) {
            setIsLoadingPage(true); // Show loader while resetting
            // Reset all state to initial
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
            setCurrentEventStatus('Pendiente');
            setAnalysisDocumentId(null);
            setMaxCompletedStep(0);
            setStep(1);
            lastLoadedAnalysisIdRef.current = null; // Clear last loaded ID
            setIsLoadingPage(false);
        } else {
             // No ID in params and no previously loaded ID, just ensure loading is false and step is 1
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

        // Set initial simulated user if not set and users are available
        if (!currentSimulatedUser && usersData.length > 0) {
            // Prioritize Admin user if available
            const adminUser = usersData.find(u => u.role === 'Admin');
            setCurrentSimulatedUser(adminUser ? adminUser.name : usersData[0].name);
        }


      } catch (error) {
        console.error("Error fetching config data for RCA Analysis: ", error);
        toast({ title: "Error al Cargar Configuración", description: "No se pudieron cargar los sitios o usuarios.", variant: "destructive" });
      }
    };
    fetchConfigData();
  }, [toast, currentSimulatedUser]);


  const ensureEventId = useCallback((): string => {
    if (!eventData.id) {
      const newEventID = `E-${String(Date.now()).slice(-5)}-${String(eventCounter).padStart(3, '0')}`;
      setEventData(prev => ({ ...prev, id: newEventID }));
      setEventCounter(prev => prev + 1);
      setAnalysisDocumentId(newEventID); // Also set the main analysisDocumentId
      // Update URL to reflect the new ID
      router.replace(`/analisis?id=${newEventID}`, { scroll: false }); // Use replace to avoid history clutter
      return newEventID;
    }
    if (!analysisDocumentId && eventData.id) { // Sync analysisDocumentId if eventData.id exists but analysisDocumentId is null
        setAnalysisDocumentId(eventData.id);
    }
    return eventData.id;
  }, [eventData.id, eventCounter, analysisDocumentId, router]);

 const handleSaveAnalysisData = async (
    showToast: boolean = true,
    finalizedOverride?: boolean,
    statusOverride?: ReportedEventStatus,
    currentRejectionReason?: string, // For rejected status
    rejectedByUserName?: string | null // For rejected status
  ): Promise<boolean> => {
    const currentId = analysisDocumentId || ensureEventId();
    if (!currentId) {
      if (showToast) toast({ title: "Error Crítico", description: "No se pudo obtener o generar un ID para el análisis.", variant: "destructive" });
      return false;
    }

    setIsSaving(true);
    const currentIsFinalized = finalizedOverride !== undefined ? finalizedOverride : isFinalized;
    // Ensure eventData.id is consistent with currentId, especially if it was just generated
    const consistentEventData = { ...eventData, id: currentId };

    let currentRejectionDetails = rejectionDetails;
    if (statusOverride === "Rechazado" && currentRejectionReason) {
      currentRejectionDetails = {
        reason: currentRejectionReason,
        rejectedBy: rejectedByUserName || "Usuario desconocido", // Use provided or fallback
        rejectedAt: new Date().toISOString(),
      };
    }

    // Construct the full RCA document payload for Firestore
    const rcaDocPayload: Partial<RCAAnalysisDocument> = {
      eventData: consistentEventData, immediateActions, projectLeader, detailedFacts, analysisDetails,
      preservedFacts, analysisTechnique, analysisTechniqueNotes, ishikawaData,
      fiveWhysData, ctmData, identifiedRootCauses, plannedActions,
      validations, finalComments, isFinalized: currentIsFinalized,
      rejectionDetails: currentRejectionDetails, // Include rejection details
    };

    try {
      const rcaDocRef = doc(db, "rcaAnalyses", currentId);
      const rcaDocSnap = await getDoc(rcaDocRef);

      // Adjust finalComments if rejecting
      let finalCommentsToSave = finalComments;
      if (statusOverride === "Rechazado" && currentRejectionReason) {
          const rejecterName = rejectedByUserName || (availableUsersFromDB.find(u => u.name === currentSimulatedUser)?.name || "Usuario desconocido");
          let baseRejectMsg = `Evento Rechazado por ${rejecterName} el ${new Date().toLocaleDateString('es-CL')}.`;
          if (currentRejectionReason) {
            baseRejectMsg += `\nMotivo: ${currentRejectionReason}`;
          }
          // Prepend rejection message, preserve existing comments if they don't already start with a rejection message
          finalCommentsToSave = `${baseRejectMsg}${finalComments && !finalComments.startsWith('Evento Rechazado') ? `\n\nComentarios Adicionales Previos:\n${finalComments}` : ''}`;
      }


      // Prepare the complete document for Firestore
      const dataToSave: RCAAnalysisDocument = {
        ...(rcaDocPayload as Omit<RCAAnalysisDocument, 'createdAt' | 'updatedAt' | 'createdBy'>), // Cast to ensure type compatibility
        finalComments: finalCommentsToSave, // Use adjusted comments
        updatedAt: new Date().toISOString(),
        createdAt: rcaDocSnap.exists() && rcaDocSnap.data().createdAt ? rcaDocSnap.data().createdAt : new Date().toISOString(),
        // createdBy: (currentSimulatedUser or actual user auth ID if available) - consider adding this later
      };

      const sanitizedDataToSave = sanitizeForFirestore(dataToSave);
      await setDoc(rcaDocRef, sanitizedDataToSave, { merge: true });

      // Update local state if it differs from what was saved
      if (eventData.id !== currentId) { // If currentId was just generated by ensureEventId
        setEventData(prev => ({ ...prev, id: currentId }));
      }
      if (!analysisDocumentId && currentId) { // If analysisDocumentId was null but now we have one
        setAnalysisDocumentId(currentId);
      }
      if (finalCommentsToSave !== finalComments) { // If rejection comments were added
          setFinalComments(finalCommentsToSave);
      }
      if (finalizedOverride !== undefined && isFinalized !== finalizedOverride) {
        setIsFinalized(finalizedOverride);
      }
      if (statusOverride === "Rechazado" && rcaDocPayload.rejectionDetails) { // If rejection details were set
        setRejectionDetails(rcaDocPayload.rejectionDetails);
      }


      // Update or Create ReportedEvent
      const reportedEventRef = doc(db, "reportedEvents", currentId);
      const reportedEventSnap = await getDoc(reportedEventRef);
      let statusForReportedEvent: ReportedEventStatus;

      if(statusOverride) {
        statusForReportedEvent = statusOverride; // Use override if provided (e.g., "Rechazado", "Finalizado")
      } else if (currentIsFinalized) {
        statusForReportedEvent = "Finalizado";
      } else if (reportedEventSnap.exists()) {
        // Maintain current status or derive new one based on progress
        statusForReportedEvent = reportedEventSnap.data().status; // Start with existing status
        const rcaData = sanitizedDataToSave; // Use the data we're about to save/just saved
        // Check if all actions are validated
        if (rcaData.plannedActions && rcaData.plannedActions.length > 0) {
            const allActionsValidatedInSave = rcaData.plannedActions.every(pa => {
                const validationEntry = rcaData.validations.find(v => v.actionId === pa.id);
                return validationEntry && validationEntry.status === 'validated';
            });
            if (allActionsValidatedInSave) {
                statusForReportedEvent = "En validación"; // Or "Finalizado" if this save also finalizes
            } else if (statusForReportedEvent === "Pendiente" && (rcaData.projectLeader || rcaData.identifiedRootCauses?.length > 0)) {
                 statusForReportedEvent = "En análisis"; // If was pending and now has leader or causes
            }
        } else if (statusForReportedEvent === "Pendiente" && (rcaData.projectLeader || rcaData.identifiedRootCauses?.length > 0)) {
            statusForReportedEvent = "En análisis";
        }
        // if isFinalized is true (and not overridden by statusOverride), status should be "Finalizado"
        // This logic is covered by currentIsFinalized handling above.
      } else {
        // Default status for new reported event
        statusForReportedEvent = "Pendiente";
      }
      setCurrentEventStatus(statusForReportedEvent); // Update local state for UI


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
        // Prepare only the fields to update to avoid overwriting createdAt
        const updatePayload: Partial<ReportedEvent> = {
            title: sanitizedReportedEventPayload.title,
            site: sanitizedReportedEventPayload.site,
            date: sanitizedReportedEventPayload.date,
            type: sanitizedReportedEventPayload.type,
            priority: sanitizedReportedEventPayload.priority,
            description: sanitizedReportedEventPayload.description,
            status: statusForReportedEvent, // Use the derived status
            updatedAt: new Date().toISOString(),
        };
        await updateDoc(reportedEventRef, sanitizeForFirestore(updatePayload));
      }

      if (showToast) {
        toast({ title: "Progreso Guardado", description: `Análisis ${currentId} guardado. Evento reportado actualizado a estado: ${statusForReportedEvent}.` });
      }
      return true;
    } catch (error) {
      console.error("Error saving data to Firestore: ", error);
      if (showToast) {
        toast({ title: "Error al Guardar", description: `No se pudo guardar la información. Error: ${(error as Error).message}`, variant: "destructive" });
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Specific save handler for Step 2, which might change ReportedEvent status to "En análisis"
  const handleSaveFromStep2 = async (showToast: boolean = true) => {
    const saveSuccess = await handleSaveAnalysisData(showToast); // Use the main save function
    if (!saveSuccess) return;

    // After successful save, check if the status needs to be specifically "En análisis"
    if (analysisDocumentId) {
      setIsSaving(true);
      try {
        const reportedEventRef = doc(db, "reportedEvents", analysisDocumentId);
        const reportedEventSnap = await getDoc(reportedEventRef);
        if (reportedEventSnap.exists() && reportedEventSnap.data().status === "Pendiente") {
          // If it's still "Pendiente" after the save (which means it wasn't updated by other logic in handleSaveAnalysisData)
          // and we're saving from step 2 (implying progress), then set to "En análisis"
          await updateDoc(reportedEventRef, sanitizeForFirestore({ status: "En análisis", updatedAt: new Date().toISOString() }));
          setCurrentEventStatus("En análisis"); // Update local state
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

  const handleRejectEvent = async () => {
    if (!analysisDocumentId) {
      toast({ title: "Error", description: "No se puede rechazar un evento sin ID.", variant: "destructive" });
      setIsRejectConfirmOpen(false);
      setRejectionReason(''); // Clear reason if dialog is closed due to error
      return;
    }
    if (!rejectionReason.trim()) {
        toast({ title: "Motivo Requerido", description: "Por favor, ingrese un motivo para el rechazo.", variant: "destructive" });
        return; // Keep dialog open for user to input reason
    }

    setIsSaving(true);
    const success = await handleSaveAnalysisData(
      false, // showToast
      true,  // finalizedOverride (rejected events are also considered finalized in terms of process)
      "Rechazado", // statusOverride
      rejectionReason, // Pass the reason
      currentSimulatedUser // Pass the user performing the rejection
    );

    if (success) {
      toast({ title: "Evento Rechazado", description: `El evento ${analysisDocumentId} ha sido marcado como rechazado.` });
      setRejectionReason(''); // Clear reason on successful rejection
      setIsRejectConfirmOpen(false); // Close dialog
    } else {
      toast({ title: "Error al Rechazar", description: "No se pudo actualizar el estado del evento.", variant: "destructive" });
      // Do not close dialog on error, allow retry or cancel
    }
    setIsSaving(false);
  };


  const handleGoToStep = (targetStep: number) => {
    if (targetStep > step && targetStep > maxCompletedStep + 1 && targetStep !== 1) {
      // Allow navigating to step 1 anytime.
      // Prevent jumping ahead unless targetStep is the next logical step or a previous one.
      return;
    }
    if (targetStep >=1 && !eventData.id && targetStep > 1 ) { // if trying to go beyond step 1 without ID
        ensureEventId(); // This will generate ID and update URL
    }
    setStep(targetStep);
    if (targetStep > maxCompletedStep && targetStep > step ) { // Only update maxCompleted if moving forward to a new step
        setMaxCompletedStep(targetStep -1);
    }
    // Update URL if analysisDocumentId exists
    if (analysisDocumentId) {
      router.replace(`/analisis?id=${analysisDocumentId}&step=${targetStep}`, { scroll: false });
    }
  };

  const handleNextStep = async () => {
    const currentId = analysisDocumentId || ensureEventId(); // Ensure ID exists, get it or generate
    if (!currentId && step >= 1) { // If still no ID after ensureEventId (should not happen) or trying to proceed from step 1 without one
        toast({ title: "Error de Sincronización", description: "Por favor, complete el Paso 1 para generar un ID antes de continuar.", variant: "destructive"});
        setStep(1); // Force back to step 1
        return;
    }

    let saveSuccess = false;
    if (step === 1) {
      saveSuccess = await handleSaveAnalysisData(false); // Use main save function, silently
    } else if (step === 2) {
      // For step 2, use the specific save handler that might update status to "En análisis"
      await handleSaveFromStep2(false); // Save silently
      saveSuccess = true; // Assume success for navigation if no critical error from save
    } else if (step === 3) {
      saveSuccess = await handleSaveAnalysisData(false); // Use main save function, silently
    } else if (step === 4) {
        // Check if all planned actions are validated before allowing to proceed to Step 5
        if (plannedActions.length > 0) {
            const allValidated = plannedActions.every(pa => {
                // Check if pa and pa.id exist before trying to find a validation
                if (!pa || !pa.id) return true; // Skip if action is malformed or has no ID (should not happen with proper data entry)
                const validationEntry = validations.find(v => v && v.actionId === pa.id);
                return validationEntry && validationEntry.status === 'validated';
            });

            if (!allValidated) {
                toast({
                    title: "Acciones Pendientes",
                    description: "Todas las acciones planificadas deben estar validadas para continuar al Paso 5.",
                    variant: "destructive",
                });
                return; // Stay on Step 4
            }
        }
        saveSuccess = await handleSaveAnalysisData(false); // Use main save function, silently
    } else {
      // For Step 5 (Results), no save action is strictly required on "Next" (which usually means finish/close)
      saveSuccess = true; // Allow proceeding (though there's no step after 5 for 'Next')
    }

    if (saveSuccess || (step !== 1 && step !== 2 && step !==3 && step !==4) ) { // If save was successful OR it's a step where save isn't mandatory for 'Next'
      const newStep = Math.min(step + 1, 5);
      const newMaxCompletedStep = Math.max(maxCompletedStep, step);
      setStep(newStep);
      setMaxCompletedStep(newMaxCompletedStep);
       if (currentId) { // If we have an ID, update the URL
         router.replace(`/analisis?id=${currentId}&step=${newStep}`, { scroll: false });
       }
    }
  };

  const handlePreviousStep = () => {
    const newStep = Math.max(step - 1, 1);
    setStep(newStep);
    if (analysisDocumentId) {
      router.replace(`/analisis?id=${analysisDocumentId}&step=${newStep}`, { scroll: false });
    } else if (step === 1) { // If on step 1 and going "previous" (effectively nowhere but for URL consistency)
       const currentIdParam = searchParams.get('id');
       if (currentIdParam) router.replace(`/analisis?id=${currentIdParam}`, { scroll: false }); // keep id if exists
       else router.replace('/analisis', { scroll: false }); // go to base /analisis
    }
  };

  const handleEventDataChange = (field: keyof RCAEventData, value: string | EventType | PriorityType) => {
    setEventData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddImmediateAction = () => {
    const tempEventId = eventData.id || ensureEventId(); // Make sure eventId exists before adding action
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
    const currentEventId = ensureEventId(); // Ensure an event ID is available
    if (!currentEventId) {
      toast({ title: "Error", description: "ID de evento no encontrado para asociar el hecho preservado.", variant: "destructive" });
      return;
    }
    const newFact: PreservedFact = {
      ...fact,
      id: `${currentEventId}-pf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, // Unique ID with event prefix
      uploadDate: new Date().toISOString(),
      eventId: currentEventId, // Associate with the current event
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
    setAnalysisTechniqueNotes(''); // Reset notes when technique changes
    // Optionally, reset specific technique data if needed
    if (value === 'Ishikawa') {
      setIshikawaData(JSON.parse(JSON.stringify(initialIshikawaData))); // Reset to initial state
    } else if (value === 'WhyWhy') {
      const newFiveWhysData = JSON.parse(JSON.stringify(initialFiveWhysData));
       // Pre-fill first "why" if focus event description exists
       if (eventData.focusEventDescription) {
         newFiveWhysData[0].why = `¿Por qué ocurrió: "${eventData.focusEventDescription.substring(0,70)}${eventData.focusEventDescription.length > 70 ? "..." : ""}"?`;
       }
      setFiveWhysData(newFiveWhysData);
    } else if (value === 'CTM') {
      setCtmData(JSON.parse(JSON.stringify(initialCTMData))); // Reset to initial state
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
    const currentEventId = ensureEventId(); // Ensure an event ID is available
    if (!currentEventId) {
      toast({ title: "Error", description: "No se pudo generar/obtener ID de evento para la acción planificada.", variant: "destructive" });
      return;
    }
    const newActionId = `${currentEventId}-PA-${String(plannedActionCounter).padStart(3, '0')}`;
    const newAction: PlannedAction = {
      id: newActionId,
      eventId: currentEventId, // Associate with current event
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

  // Sync validations with planned actions
  useEffect(() => {
    setValidations(prevValidations => {
      // Create new validation entries for new planned actions
      const newValidations = plannedActions.map(pa => {
        const existingValidation = prevValidations.find(v => v.actionId === pa.id);
        return existingValidation || { actionId: pa.id, eventId: pa.eventId, status: 'pending' };
      });
      // Filter out validations for actions that no longer exist
      return newValidations.filter(v => plannedActions.some(pa => pa.id === v.actionId));
    });
  }, [plannedActions]);


  const handleToggleValidation = async (actionId: string) => {
    setValidations(prev =>
      prev.map(v => {
        if (v.actionId === actionId) {
          const newStatus = v.status === 'pending' ? 'validated' : 'pending';
          // Store validatedAt only when status changes to 'validated'
          const newValidatedAt = newStatus === 'validated' ? new Date().toISOString() : v.validatedAt;
          return {
            ...v,
            status: newStatus,
            validatedAt: newValidatedAt // Persist or set new validatedAt
          };
        }
        return v;
      })
    );
     await handleSaveAnalysisData(false); // Save changes silently after toggling
  };

  const handlePrintReport = () => {
    // Add a class to the body to hide non-printable elements via CSS
    const nonPrintableElements = document.querySelectorAll('.no-print');
    nonPrintableElements.forEach(el => el.classList.add('hidden'));
    window.print();
    // Remove the class after printing
    nonPrintableElements.forEach(el => el.classList.remove('hidden'));
  };

  const handleMarkAsFinalized = async () => {
    const currentEventIdUsedForToast = analysisDocumentId || eventData.id; // Use whichever is available
    setIsSaving(true); // Show saving indicator

    const currentId = analysisDocumentId || ensureEventId(); // Make sure we have an ID

    if (!currentId) {
        toast({ title: "Error", description: "No se pudo obtener el ID del análisis para finalizar.", variant: "destructive" });
        setIsSaving(false);
        return;
    }

    // Set local state immediately for responsiveness, but rely on save function for DB
    setIsFinalized(true); 

    // Call the main save function with finalized override and specific status
    const success = await handleSaveAnalysisData(false, true, "Finalizado");

    if (success) {
      toast({ title: "Proceso Finalizado", description: `Análisis ${currentEventIdUsedForToast || currentId} marcado como finalizado y evento reportado actualizado.`, className: "bg-primary text-primary-foreground"});
    } else {
      setIsFinalized(false); // Revert local state if save failed
      toast({ title: "Error al Finalizar", description: "No se pudo guardar el estado finalizado del análisis. Intente de nuevo.", variant: "destructive" });
    }
    setIsSaving(false); // Hide saving indicator
  };


  // Effect to ensure maxCompletedStep is correctly initialized or updated on component mount/step change
  useEffect(() => {
    if (step > maxCompletedStep) {
      setMaxCompletedStep(step -1); // If current step is beyond max completed, update max
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Ran once on mount, step changes are handled by navigation

  // Determine if the current simulated user can reject
  const canCurrentUserReject = useMemo(() => {
    if (!currentSimulatedUser) return false;
    const userProfile = availableUsersFromDB.find(u => u.name === currentSimulatedUser);
    return userProfile?.role === 'Admin'; // Only Admins can reject
  }, [currentSimulatedUser, availableUsersFromDB]);

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

      {/* Step Navigation */}
      <div className="no-print">
        <StepNavigation currentStep={step} onNavigate={handleGoToStep} maxCompletedStep={maxCompletedStep} />
        <Separator className="my-6" />
      </div>

      {/* Conditional Rendering of Steps */}
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
            onSaveAnalysis={handleSaveAnalysisData} // Pass main save function
            isSaving={isSaving}
            currentSimulatedUser={currentSimulatedUser}
            onSetCurrentSimulatedUser={setCurrentSimulatedUser}
            canCurrentUserReject={canCurrentUserReject}
            onRejectEvent={() => {
              setRejectionReason(''); // Clear reason before opening
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
          onSaveAnalysis={handleSaveFromStep2} // Pass specific save function for Step 2
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
          onSaveAnalysis={handleSaveAnalysisData} // Pass main save function
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
          currentSimulatedUser={currentSimulatedUser}
          onSetCurrentSimulatedUser={setCurrentSimulatedUser}
          onPrevious={handlePreviousStep}
          onNext={handleNextStep}
          onSaveAnalysis={handleSaveAnalysisData} // Pass main save function
          isSaving={isSaving}
        />
      )}
      </div>
      {/* Step 5 is always visible for printing */}
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
          preservedFacts={preservedFacts} // Pass preservedFacts
          finalComments={finalComments}
          onFinalCommentsChange={setFinalComments}
          onPrintReport={handlePrintReport}
          availableUsers={availableUsersFromDB}
          isFinalized={isFinalized}
          onMarkAsFinalized={handleMarkAsFinalized}
          onSaveAnalysis={handleSaveAnalysisData} // Pass main save function
          isSaving={isSaving}
        />
      )}
      {/* AlertDialog for Reject Confirmation */}
      <AlertDialog open={isRejectConfirmOpen} onOpenChange={(open) => {
        if(!isSaving) { // Prevent closing if saving
          setIsRejectConfirmOpen(open);
          if (!open) setRejectionReason(''); // Clear reason if dialog is closed by cancel/overlay click
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
              disabled={isSaving || !rejectionReason.trim()} // Disable if saving or reason is empty
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sí, Rechazar Evento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

