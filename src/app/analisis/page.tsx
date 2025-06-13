
'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { RCAEventData, ImmediateAction, PlannedAction, Validation, AnalysisTechnique, IshikawaData, FiveWhysData, CTMData, DetailedFacts, PreservedFact, IdentifiedRootCause, FullUserProfile, Site, RCAAnalysisDocument, ReportedEvent, ReportedEventStatus, EventType, PriorityType } from '@/types/rca';
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


  const loadAnalysisData = useCallback(async (id: string): Promise<boolean> => {
    setIsLoadingPage(true);
    try {
      const analysisDocRef = doc(db, "rcaAnalyses", id);
      const docSnap = await getDoc(analysisDocRef);

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
        setAnalysisDocumentId(id);
        setMaxCompletedStep(4); 
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
        setAnalysisDocumentId(null);
        setMaxCompletedStep(0);
        router.replace('/analisis', undefined);
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
        setAnalysisDocumentId(null);
        setMaxCompletedStep(0);
      return false;
    } finally {
        setIsLoadingPage(false);
    }
  }, [toast, router]);

  const analysisIdFromParams = useMemo(() => searchParams.get('id'), [searchParams]);

 useEffect(() => {
    const currentId = analysisIdFromParams;
    const stepParam = searchParams.get('step');

    if (currentId) {
        if (currentId !== lastLoadedAnalysisIdRef.current) {
            setIsLoadingPage(true);
            loadAnalysisData(currentId).then(success => {
                if (success) {
                    if (lastLoadedAnalysisIdRef.current !== currentId) {
                         toast({ title: "Análisis Cargado", description: `Se cargó el análisis ID: ${currentId}` });
                         lastLoadedAnalysisIdRef.current = currentId;
                    }
                    if (stepParam) {
                        const targetStep = parseInt(stepParam, 10);
                        if (targetStep >= 1 && targetStep <= 5) {
                            setStep(targetStep);
                            setMaxCompletedStep(prev => Math.max(prev, targetStep -1));
                        }
                    } else {
                         setStep(1);
                    }
                } else {
                    if (lastLoadedAnalysisIdRef.current === currentId) { // Only reset if we failed to load the same ID again
                        lastLoadedAnalysisIdRef.current = null;
                    }
                    setStep(1);
                    setMaxCompletedStep(0);
                }
            }).finally(() => {
                setIsLoadingPage(false);
            });
        } else {
             setIsLoadingPage(false); // Already loaded this ID
             if (stepParam) {
                const targetStep = parseInt(stepParam, 10);
                if (targetStep >= 1 && targetStep <= 5 && targetStep !== step) {
                    setStep(targetStep);
                    setMaxCompletedStep(prev => Math.max(prev, targetStep -1));
                }
             }
        }
    } else { // No ID in params, reset everything for a new analysis
        if (lastLoadedAnalysisIdRef.current !== null) { // If we were previously on an existing analysis
            setIsLoadingPage(true); // Show loader briefly for reset
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
            setAnalysisDocumentId(null);
            setMaxCompletedStep(0);
            setStep(1);
            lastLoadedAnalysisIdRef.current = null;
            setIsLoadingPage(false);
        } else { // Already in a new/reset state
             setIsLoadingPage(false);
             setStep(1);
             setMaxCompletedStep(0);
        }
    }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [analysisIdFromParams, searchParams, router, loadAnalysisData]);


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
  }, [toast]);


  const ensureEventId = useCallback((): string => {
    if (!eventData.id) {
      const newEventID = `E-${String(Date.now()).slice(-5)}-${String(eventCounter).padStart(3, '0')}`;
      setEventData(prev => ({ ...prev, id: newEventID }));
      setEventCounter(prev => prev + 1);
      setAnalysisDocumentId(newEventID); // Also set the main document ID state
      router.replace(`/analisis?id=${newEventID}`, { scroll: false }); // Update URL immediately
      return newEventID;
    }
    if (!analysisDocumentId && eventData.id) { // Sync if eventData.id exists but analysisDocumentId is null
        setAnalysisDocumentId(eventData.id);
    }
    return eventData.id;
  }, [eventData.id, eventCounter, analysisDocumentId, router]);

 const handleSaveAnalysisData = async (showToast: boolean = true, finalizedOverride?: boolean): Promise<boolean> => {
    const currentId = analysisDocumentId || ensureEventId();
    if (!currentId) {
      if (showToast) toast({ title: "Error Crítico", description: "No se pudo obtener o generar un ID para el análisis.", variant: "destructive" });
      return false;
    }

    setIsSaving(true);
    const currentIsFinalized = finalizedOverride !== undefined ? finalizedOverride : isFinalized;

    // Ensure eventData.id is consistent with the document ID before saving
    const consistentEventData = { ...eventData, id: currentId };

    const analysisDocPayload: Omit<RCAAnalysisDocument, 'createdAt' | 'updatedAt' | 'createdBy'> = {
      eventData: consistentEventData, immediateActions, projectLeader, detailedFacts, analysisDetails,
      preservedFacts, analysisTechnique, analysisTechniqueNotes, ishikawaData,
      fiveWhysData, ctmData, identifiedRootCauses, plannedActions,
      validations, finalComments, isFinalized: currentIsFinalized,
    };

    try {
      const rcaDocRef = doc(db, "rcaAnalyses", currentId);
      const rcaDocSnap = await getDoc(rcaDocRef);

      const dataToSave: RCAAnalysisDocument = {
        ...(analysisDocPayload as RCAAnalysisDocument), // Cast since we are fulfilling all required fields
        updatedAt: new Date().toISOString(),
        createdAt: rcaDocSnap.exists() && rcaDocSnap.data().createdAt ? rcaDocSnap.data().createdAt : new Date().toISOString(),
        // createdBy could be added here if needed
      };
      
      const sanitizedDataToSave = sanitizeForFirestore(dataToSave);
      await setDoc(rcaDocRef, sanitizedDataToSave, { merge: true });

      const reportedEventRef = doc(db, "reportedEvents", currentId);
      const reportedEventSnap = await getDoc(reportedEventRef);

      let statusForReportedEvent: ReportedEventStatus;

      if (currentIsFinalized) {
        statusForReportedEvent = "Finalizado";
      } else if (reportedEventSnap.exists()) {
        statusForReportedEvent = reportedEventSnap.data().status;
      } else {
        statusForReportedEvent = "Pendiente"; // Default if new
      }

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
        await setDoc(reportedEventRef, { ...sanitizedReportedEventPayload, status: "Pendiente", createdAt: new Date().toISOString() });
      } else {
        // Prepare update object, only include fields that might change
        const updatePayload: Partial<ReportedEvent> = {
            title: sanitizedReportedEventPayload.title,
            site: sanitizedReportedEventPayload.site,
            date: sanitizedReportedEventPayload.date,
            type: sanitizedReportedEventPayload.type,
            priority: sanitizedReportedEventPayload.priority,
            description: sanitizedReportedEventPayload.description,
            status: statusForReportedEvent, // This status is critical
            updatedAt: new Date().toISOString(),
        };
        await updateDoc(reportedEventRef, sanitizeForFirestore(updatePayload));
      }

      if (showToast) {
        toast({ title: "Progreso Guardado", description: `Análisis ${currentId} guardado. Evento reportado actualizado.` });
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

  const handleGoToStep = (targetStep: number) => {
    if (targetStep > step && targetStep > maxCompletedStep + 1 && targetStep !== 1) {
      // Prevent skipping steps not yet enabled, unless going back to step 1
      return;
    }
    if (targetStep >=1 && !eventData.id && targetStep > 1 ) { // ensure ID if moving past step 1
        ensureEventId();
    }
    setStep(targetStep);
    if (targetStep > maxCompletedStep && targetStep > step ) { // If moving forward to a new step
        setMaxCompletedStep(targetStep -1);
    }
    // Update URL if analysis ID exists
    if (analysisDocumentId) {
      router.replace(`/analisis?id=${analysisDocumentId}&step=${targetStep}`, { scroll: false });
    }
  };

  const handleNextStep = async () => {
    const currentId = analysisDocumentId || ensureEventId(); // Ensure ID if we are on step 1 and trying to move
    if (!currentId && step >= 1) { // Should generally not happen if ensureEventId is called correctly
        toast({ title: "Error de Sincronización", description: "Por favor, complete el Paso 1 para generar un ID antes de continuar.", variant: "destructive"});
        setStep(1); // Force back to step 1 if ID somehow missing
        return;
    }

    let saveSuccess = false;
    if (step === 1) {
      saveSuccess = await handleSaveAnalysisData(false); // Save silently
    } else if (step === 2) {
      await handleSaveFromStep2(false); // This already saves analysisData and updates reportedEvent status
      saveSuccess = true; // Assume success for now, as it handles its own toasts for critical errors
    } else if (step === 3) {
      saveSuccess = await handleSaveAnalysisData(false);
    } else if (step === 4) {
        saveSuccess = await handleSaveAnalysisData(false);
    }
    // For step 5, no save is strictly needed on "next" as it's the last step.
    // Saving is handled by "Finalizar" or explicit save buttons.
    else {
      saveSuccess = true; // Allow moving from step 5 (though there's no "next")
    }

    if (saveSuccess || (step !== 1 && step !== 2 && step !==3 && step !==4) ) { // Allow moving forward if save was not strictly required or succeeded
      const newStep = Math.min(step + 1, 5);
      const newMaxCompletedStep = Math.max(maxCompletedStep, step); // Current step is now completed
      setStep(newStep);
      setMaxCompletedStep(newMaxCompletedStep);
       if (currentId) { // currentId should be valid here
         router.replace(`/analisis?id=${currentId}&step=${newStep}`, { scroll: false });
       }
    }
  };

  const handlePreviousStep = () => {
    const newStep = Math.max(step - 1, 1);
    setStep(newStep);
    if (analysisDocumentId) {
      router.replace(`/analisis?id=${analysisDocumentId}&step=${newStep}`, { scroll: false });
    } else if (step === 1) { // If on step 1 and going previous (conceptually, to dashboard or new analysis)
       const currentIdParam = searchParams.get('id');
       if (currentIdParam) router.replace(`/analisis?id=${currentIdParam}`, { scroll: false }); // Stay on current ID if exists (e.g. user typed URL)
       else router.replace('/analisis', { scroll: false }); // Go to base /analisis (new)
    }
  };

  const handleEventDataChange = (field: keyof RCAEventData, value: string | EventType | PriorityType) => {
    setEventData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddImmediateAction = () => {
    const tempEventId = eventData.id || ensureEventId(); // Ensure an ID exists
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
    const currentEventId = ensureEventId();
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
    setAnalysisTechniqueNotes(''); // Reset notes when technique changes
    if (value === 'Ishikawa') {
      setIshikawaData(JSON.parse(JSON.stringify(initialIshikawaData))); // Reset to initial state
    } else if (value === 'WhyWhy') {
      const newFiveWhysData = JSON.parse(JSON.stringify(initialFiveWhysData));
       if (eventData.focusEventDescription) { // Pre-fill first "why" if event description exists
         newFiveWhysData[0].why = `¿Por qué ocurrió: "${eventData.focusEventDescription.substring(0,70)}${eventData.focusEventDescription.length > 70 ? "..." : ""}"?`;
       }
      setFiveWhysData(newFiveWhysData);
    } else if (value === 'CTM') {
      setCtmData(JSON.parse(JSON.stringify(initialCTMData))); // Reset CTM
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
    const currentEventId = ensureEventId();
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
      // markedAsReadyAt is not set initially
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
        return existingValidation || { actionId: pa.id, eventId: pa.eventId, status: 'pending' /* validatedAt ommitted */ };
      });
      // Ensure only validations for existing planned actions are kept
      return newValidations.filter(v => plannedActions.some(pa => pa.id === v.actionId));
    });
  }, [plannedActions]);


  const handleToggleValidation = async (actionId: string) => {
    setValidations(prev =>
      prev.map(v => {
        if (v.actionId === actionId) {
          const newStatus = v.status === 'pending' ? 'validated' : 'pending';
          const newValidatedAt = newStatus === 'validated' ? new Date().toISOString() : v.validatedAt;
          return {
            ...v,
            status: newStatus,
            validatedAt: newValidatedAt
          };
        }
        return v;
      })
    );
     await handleSaveAnalysisData(false); // Save changes silently after toggling
  };

  const handlePrintReport = () => {
    const nonPrintableElements = document.querySelectorAll('.no-print');
    nonPrintableElements.forEach(el => el.classList.add('hidden'));
    window.print();
    nonPrintableElements.forEach(el => el.classList.remove('hidden'));
  };

  const handleMarkAsFinalized = async () => {
    const currentEventIdUsedForToast = analysisDocumentId || eventData.id;
    setIsSaving(true); // Use isSaving for this operation as well
    const currentId = analysisDocumentId || ensureEventId(); // Ensure we have an ID

    if (!currentId) {
        toast({ title: "Error", description: "No se pudo obtener el ID del análisis para finalizar.", variant: "destructive" });
        setIsSaving(false);
        return;
    }

    setIsFinalized(true); // Optimistically set state

    const success = await handleSaveAnalysisData(false, true); // Pass finalizedOverride as true

    if (success) {
      toast({ title: "Proceso Finalizado", description: `Análisis ${currentEventIdUsedForToast || currentId} marcado como finalizado y evento reportado actualizado.`, className: "bg-primary text-primary-foreground"});
    } else {
      setIsFinalized(false); // Revert if save failed
      toast({ title: "Error al Finalizar", description: "No se pudo guardar el estado finalizado del análisis. Intente de nuevo.", variant: "destructive" });
    }
    setIsSaving(false);
  };


  useEffect(() => {
    // This effect ensures maxCompletedStep is at least the current step minus one.
    // Useful if landing on a step directly via URL.
    if (step > maxCompletedStep) {
      setMaxCompletedStep(step -1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Ran once on mount, potentially adjusted by other logic later

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
        <p className="text-muted-foreground mt-1">Herramienta de Análisis de Causa Raíz con gráficos. ID Análisis: <span className="font-semibold text-primary">{analysisDocumentId || "Nuevo Análisis"}</span></p>
      </header>

      <div className="no-print">
        <StepNavigation currentStep={step} onNavigate={handleGoToStep} maxCompletedStep={maxCompletedStep} />
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
          currentSimulatedUser={currentSimulatedUser}
          onSetCurrentSimulatedUser={setCurrentSimulatedUser}
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
    </>
  );
}

