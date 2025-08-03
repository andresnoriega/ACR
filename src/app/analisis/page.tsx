'use client';
import { Suspense, useState, useEffect, useCallback, useMemo, useRef, ChangeEvent } from 'react';
import type { RCAEventData, ImmediateAction, PlannedAction, Validation, AnalysisTechnique, IshikawaData, FiveWhysData, CTMData, DetailedFacts, IdentifiedRootCause, FullUserProfile, Site, RCAAnalysisDocument, ReportedEvent, ReportedEventStatus, EventType, PriorityType, RejectionDetails, BrainstormIdea, TimelineEvent, InvestigationSession, EfficacyVerification, Evidence } from '@/types/rca';
import { StepNavigation } from '@/components/rca/StepNavigation';
import { Step1Initiation } from '@/components/rca/Step1Initiation';
import { Step2Facts } from '@/components/rca/Step2Facts';
import { Step2Point5Tasks } from '@/components/rca/Step2Point5Tasks';
import { Step3Analysis } from '@/components/rca/Step3Analysis';
import { Step4Validation } from '@/components/rca/Step4Validation';
import { Step5Results } from '@/components/rca/Step5Results';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, doc, setDoc, getDoc, updateDoc, where, type QueryConstraint, arrayUnion, arrayRemove } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Loader2 } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { sanitizeForFirestore } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { sendEmailAction } from '@/app/actions';
import { format, parse, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

const generateClientSideId = (prefix: string) => {
    // This is a safer way to generate client-side IDs to prevent hydration mismatch.
    const randomPart = Math.random().toString(36).substring(2, 9);
    const timePart = Date.now().toString(36);
    return `${prefix}-${timePart}-${randomPart}`;
};


const initialIshikawaData: IshikawaData = [
  { id: 'manpower', name: 'Mano de Obra', causes: [] },
  { id: 'method', name: 'Método', causes: [] },
  { id: 'machinery', name: 'Maquinaria', causes: [] },
  { id: 'material', name: 'Material', causes: [] },
  { id: 'measurement', name: 'Medición', causes: [] },
  { id: 'environment', name: 'Medio Ambiente', causes: [] },
];

const initialFiveWhysData: FiveWhysData = [];

const initialCTMData: CTMData = [];

const initialDetailedFacts: DetailedFacts = {
  quien: '',
  que: '',
  donde: '',
  cuando: '', // Se almacenará como YYYY-MM-DDTHH:MM
  cualCuanto: '',
  como: '',
};

const initialRCAAnalysisState: Omit<RCAAnalysisDocument, 'createdAt' | 'updatedAt' > = {
  eventData: { id: '', place: '', equipo: '', date: '', eventType: '', priority: '', focusEventDescription: '', empresa: undefined },
  immediateActions: [],
  projectLeader: '',
  detailedFacts: { ...initialDetailedFacts },
  investigationObjective: '', // <-- NUEVO ESTADO INICIAL
  investigationSessions: [],
  analysisDetails: '',
  timelineEvents: [],
  brainstormingIdeas: [],
  analysisTechnique: '',
  analysisTechniqueNotes: '',
  ishikawaData: JSON.parse(JSON.stringify(initialIshikawaData)),
  fiveWhysData: JSON.parse(JSON.stringify(initialFiveWhysData)),
  ctmData: JSON.parse(JSON.stringify(initialCTMData)),
  identifiedRootCauses: [],
  plannedActions: [],
  evidences: [],
  validations: [],
  finalComments: '',
  leccionesAprendidas: '',
  isFinalized: false,
  rejectionDetails: undefined,
  createdBy: undefined,
  empresa: undefined,
  efficacyVerification: { status: 'pending', verifiedBy: '', verifiedAt: '', comments: '', verificationDate: '' } // Added
};

// Helper function to convert old 'cuando' string to datetime-local format
function convertOldCuandoToDateTimeLocal(cuandoString: string | undefined): string {
  if (!cuandoString) return "";

  // Check if already in YYYY-MM-DDTHH:MM format
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(cuandoString)) {
    return cuandoString;
  }

  // Attempt to parse "A las HH:MM del DD-MM-YYYY"
  const fullMatch = cuandoString.match(/A las (\d{2}:\d{2}) del (\d{2}-\d{2}-\d{4})/);
  if (fullMatch && fullMatch[1] && fullMatch[2]) {
    const timePart = fullMatch[1];
    const [day, month, year] = fullMatch[2].split('-');
    if (day && month && year) {
      return `${year}-${month}-${day}T${timePart}`;
    }
  }

  // Attempt to parse "DD-MM-YYYY" (assuming default time like 00:00 or keep existing time if any)
  const dateOnlyMatchDMY = cuandoString.match(/^(\d{2}-\d{2}-\d{4})$/);
  if (dateOnlyMatchDMY && dateOnlyMatchDMY[1]) {
    const [day, month, year] = dateOnlyMatchDMY[1].split('-');
    if (day && month && year) {
      return `${year}-${month}-${day}T00:00`; // Default to midnight
    }
  }
  
  // Attempt to parse "YYYY-MM-DD" (assuming default time like 00:00)
  const dateOnlyMatchYMD = cuandoString.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (dateOnlyMatchYMD && dateOnlyMatchYMD[1]) {
      return `${dateOnlyMatchYMD[1]}T00:00`; // Default to midnight
  }

  // If only time "A las HH:MM" - this case is less likely to be useful alone, but handle it
  const timeOnlyMatch = cuandoString.match(/^A las (\d{2}:\d{2})$/);
  if (timeOnlyMatch && timeOnlyMatch[1]) {
    // Cannot form a full datetime-local without a date. Return empty or original.
    return ""; // Or perhaps `cuandoString` if you want to preserve partial data, but input will be blank
  }
  
  // Fallback: if it's some other format or unparseable, return empty so input is blank
  // Or, try to parse as ISO if it's close, then reformat. For simplicity, we'll return empty.
  try {
    const parsedISO = parseISO(cuandoString);
    if(isValid(parsedISO)) {
        return format(parsedISO, "yyyy-MM-dd'T'HH:mm");
    }
  } catch (e) { /* ignore */ }

  return "";
}


function RCAAnalysisPageComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { userProfile, loadingAuth } = useAuth(); 

  const [step, setStep] = useState(1);
  const [maxCompletedStep, setMaxCompletedStep] = useState(0);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [configDataLoaded, setConfigDataLoaded] = useState(false);

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
  const [investigationObjective, setInvestigationObjective] = useState(initialRCAAnalysisState.investigationObjective || '');
  const [investigationSessions, setInvestigationSessions] = useState<InvestigationSession[]>(initialRCAAnalysisState.investigationSessions || []);
  const [analysisDetails, setAnalysisDetails] = useState(initialRCAAnalysisState.analysisDetails);
  const [evidences, setEvidences] = useState<Evidence[]>(initialRCAAnalysisState.evidences || []);


  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>(initialRCAAnalysisState.timelineEvents || []);
  const [brainstormingIdeas, setBrainstormingIdeas] = useState<BrainstormIdea[]>(initialRCAAnalysisState.brainstormingIdeas || []);
  const [analysisTechnique, setAnalysisTechnique] = useState<AnalysisTechnique>(initialRCAAnalysisState.analysisTechnique);
  const [analysisTechniqueNotes, setAnalysisTechniqueNotes] = useState(initialRCAAnalysisState.analysisTechniqueNotes);
  const [ishikawaData, setIshikawaData] = useState<IshikawaData>(JSON.parse(JSON.stringify(initialIshikawaData)));
  const [fiveWhysData, setFiveWhysData] = useState<FiveWhysData>(JSON.parse(JSON.stringify(initialFiveWhysData)));
  const [ctmData, setCtmData] = useState<CTMData>(JSON.parse(JSON.stringify(initialCTMData)));
  const [identifiedRootCauses, setIdentifiedRootCauses] = useState<IdentifiedRootCause[]>(initialRCAAnalysisState.identifiedRootCauses);

  const [plannedActions, setPlannedActions] = useState<PlannedAction[]>(initialRCAAnalysisState.plannedActions);
  const [plannedActionCounter, setPlannedActionCounter] = useState(1);

  const [validations, setValidations] = useState<Validation[]>(initialRCAAnalysisState.validations);
  const [finalComments, setFinalComments] = useState(initialRCAAnalysisState.finalComments);
  const [leccionesAprendidas, setLeccionesAprendidas] = useState(initialRCAAnalysisState.leccionesAprendidas);
  const [isFinalized, setIsFinalized] = useState(initialRCAAnalysisState.isFinalized);
  const [efficacyVerification, setEfficacyVerification] = useState<EfficacyVerification>(initialRCAAnalysisState.efficacyVerification);
  const [analysisDocumentId, setAnalysisDocumentId] = useState<string | null>(null);
  
  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [currentEventStatus, setCurrentEventStatus] = useState<ReportedEventStatus>('Pendiente');
  const [rejectionDetails, setRejectionDetails] = useState<RejectionDetails | undefined>(initialRCAAnalysisState.rejectionDetails);
  const [createdBy, setCreatedBy] = useState<string | undefined>(initialRCAAnalysisState.createdBy);


  const loadAnalysisData = useCallback(async (id: string): Promise<boolean> => {
    if (!userProfile) { // Guard clause to prevent running on logout
      setIsLoadingPage(false);
      return false;
    }
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
        
        // Security check for company access
        if (userProfile && userProfile.role !== 'Super User' && userProfile.empresa) {
          if (data.empresa && data.empresa !== userProfile.empresa) {
            toast({
              title: "Acceso Denegado",
              description: "No tiene permisos para ver análisis de esta empresa.",
              variant: "destructive",
            });
            router.replace('/inicio');
            return false;
          }
        }

        setEventData(data.eventData); // Includes equipo: data.eventData.equipo || ''

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
        
        // Convert 'cuando' for detailedFacts
        const loadedDetailedFacts = data.detailedFacts || { ...initialDetailedFacts };
        if (loadedDetailedFacts.cuando) {
          loadedDetailedFacts.cuando = convertOldCuandoToDateTimeLocal(loadedDetailedFacts.cuando);
        }
        setDetailedFacts(loadedDetailedFacts);
        setInvestigationObjective(data.investigationObjective || '');
        setInvestigationSessions(data.investigationSessions || []);
        setAnalysisDetails(data.analysisDetails || '');
        setEvidences(data.evidences || []);
        setTimelineEvents(data.timelineEvents || []);
        setBrainstormingIdeas(data.brainstormingIdeas || []);
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
        setLeccionesAprendidas(data.leccionesAprendidas || '');
        setIsFinalized(data.isFinalized || false);
        setEfficacyVerification(data.efficacyVerification || { status: 'pending', verifiedBy: '', verifiedAt: '', comments: '', verificationDate: '' });
        setRejectionDetails(data.rejectionDetails);
        setCreatedBy(data.createdBy);
        setAnalysisDocumentId(id);

        if (lastLoadedAnalysisIdRef.current !== null && lastLoadedAnalysisIdRef.current !== id) {
          toast({ title: "Análisis Cargado", description: `Se cargó el análisis ID: ${id}` });
        }
        lastLoadedAnalysisIdRef.current = id;
        
        const isIshikawaPopulated = data.ishikawaData?.some(cat => cat.causes.length > 0);
        const is5WhysPopulated = data.fiveWhysData?.length > 0 && data.fiveWhysData[0] && data.fiveWhysData[0].becauses && data.fiveWhysData[0].becauses.some(b => b.description.trim() !== '');
        const isCtmPopulated = data.ctmData?.some(fm => fm.hypotheses.length > 0);
        const hasAnalysisContent = data.identifiedRootCauses?.length > 0 || isIshikawaPopulated || is5WhysPopulated || isCtmPopulated;
        
        const hasFactsContent = Object.values(data.detailedFacts).some(v => v?.trim());
        const hasTasksContent = !!data.timelineEvents?.length || !!data.brainstormingIdeas?.length || !!data.projectLeader?.trim();
        
        let newMaxCompletedStep = 1;
        if(hasFactsContent) newMaxCompletedStep = 2;
        if(hasTasksContent) newMaxCompletedStep = 3;
        if(hasAnalysisContent) newMaxCompletedStep = 4;
        if(data.validations?.length > 0 && data.plannedActions?.every(pa => data.validations.find(v => v.actionId === pa.id)?.status === 'validated')) newMaxCompletedStep = 5;
        if(data.isFinalized) newMaxCompletedStep = 6;

        setMaxCompletedStep(prevMax => Math.max(prevMax, newMaxCompletedStep));

        return true;
      } else {
        if (lastLoadedAnalysisIdRef.current !== id || lastLoadedAnalysisIdRef.current === null) {
            toast({ title: "Análisis No Encontrado", description: `No se encontró un análisis con ID: ${id}. Iniciando nuevo análisis.`, variant: "destructive" });
            setEventData(initialRCAAnalysisState.eventData);
            setImmediateActions(initialRCAAnalysisState.immediateActions);
            setImmediateActionCounter(1);
            setProjectLeader(initialRCAAnalysisState.projectLeader);
            setDetailedFacts(initialRCAAnalysisState.detailedFacts);
            setInvestigationObjective(initialRCAAnalysisState.investigationObjective || '');
            setInvestigationSessions(initialRCAAnalysisState.investigationSessions || []);
            setAnalysisDetails(initialRCAAnalysisState.analysisDetails);
            setEvidences(initialRCAAnalysisState.evidences || []);
            setTimelineEvents(initialRCAAnalysisState.timelineEvents || []);
            setBrainstormingIdeas(initialRCAAnalysisState.brainstormingIdeas || []);
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
            setLeccionesAprendidas(initialRCAAnalysisState.leccionesAprendidas);
            setIsFinalized(initialRCAAnalysisState.isFinalized);
            setEfficacyVerification(initialRCAAnalysisState.efficacyVerification);
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
        setInvestigationObjective(initialRCAAnalysisState.investigationObjective || '');
        setInvestigationSessions(initialRCAAnalysisState.investigationSessions || []);
        setAnalysisDetails(initialRCAAnalysisState.analysisDetails);
        setEvidences(initialRCAAnalysisState.evidences || []);
        setTimelineEvents(initialRCAAnalysisState.timelineEvents || []);
        setBrainstormingIdeas(initialRCAAnalysisState.brainstormingIdeas || []);
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
        setLeccionesAprendidas(initialRCAAnalysisState.leccionesAprendidas);
        setIsFinalized(initialRCAAnalysisState.isFinalized);
        setEfficacyVerification(initialRCAAnalysisState.efficacyVerification);
        setRejectionDetails(initialRCAAnalysisState.rejectionDetails);
        setCreatedBy(initialRCAAnalysisState.createdBy);
        setCurrentEventStatus('Pendiente');
        setAnalysisDocumentId(null);
        setMaxCompletedStep(0);
      return false;
    } finally {
        setIsLoadingPage(false);
    }
  }, [toast, router, userProfile]);

  const analysisIdFromParams = useMemo(() => searchParams.get('id'), [searchParams]);

 useEffect(() => {
    const currentId = analysisIdFromParams;
    const stepParam = searchParams.get('step');
    const previousLoadedId = lastLoadedAnalysisIdRef.current;

    if (currentId && configDataLoaded) { // Only load if ID exists AND config is loaded
        if (currentId === previousLoadedId && !stepParam) {
             setIsLoadingPage(false);
             return;
        }
        setIsLoadingPage(true);
        loadAnalysisData(currentId).then(success => {
            if (success) {
                if (stepParam) {
                    const targetStep = parseInt(stepParam, 10);
                    if (targetStep >= 1 && targetStep <= 6) {
                        setStep(targetStep);
                    }
                } else if (previousLoadedId === currentId) {
                    setStep(prevStep => (prevStep >= 1 && prevStep <= 6 ? prevStep : 1));
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
    } else if (!currentId) { // No ID, just reset
        if (lastLoadedAnalysisIdRef.current !== null) { 
            setEventData(initialRCAAnalysisState.eventData);
            setImmediateActions(initialRCAAnalysisState.immediateActions);
            setImmediateActionCounter(1);
            setProjectLeader(initialRCAAnalysisState.projectLeader);
            setDetailedFacts(initialRCAAnalysisState.detailedFacts);
            setInvestigationObjective(initialRCAAnalysisState.investigationObjective || '');
            setInvestigationSessions(initialRCAAnalysisState.investigationSessions || []);
            setAnalysisDetails(initialRCAAnalysisState.analysisDetails);
            setEvidences(initialRCAAnalysisState.evidences || []);
            setTimelineEvents(initialRCAAnalysisState.timelineEvents || []);
            setBrainstormingIdeas(initialRCAAnalysisState.brainstormingIdeas || []);
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
            setLeccionesAprendidas(initialRCAAnalysisState.leccionesAprendidas);
            setIsFinalized(initialRCAAnalysisState.isFinalized);
            setEfficacyVerification(initialRCAAnalysisState.efficacyVerification);
            setRejectionDetails(initialRCAAnalysisState.rejectionDetails);
            setCreatedBy(initialRCAAnalysisState.createdBy);
            setCurrentEventStatus('Pendiente');
            setAnalysisDocumentId(null); 
            setMaxCompletedStep(0); 
            setStep(1); 
            lastLoadedAnalysisIdRef.current = null; 
        }
        setIsLoadingPage(false);
    } else {
        // ID exists but config isn't loaded, so we are still loading.
        setIsLoadingPage(true);
    }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [analysisIdFromParams, searchParams, loadAnalysisData, configDataLoaded]);


  useEffect(() => {
    const fetchConfigData = async () => {
      if (!userProfile) return; // Guard clause for user profile

      setIsLoadingPage(true);
      setConfigDataLoaded(false);
      try {
        const sitesQueryConstraints: QueryConstraint[] = [];
        if (userProfile.role !== 'Super User' && userProfile.empresa) {
          sitesQueryConstraints.push(where("empresa", "==", userProfile.empresa));
        }
        const sitesCollectionRef = collection(db, "sites");
        const sitesQuery = query(sitesCollectionRef, ...sitesQueryConstraints);
        const sitesSnapshot = await getDocs(sitesQuery);
        const sitesData = sitesSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Site))
            .sort((a, b) => a.name.localeCompare(b.name));
        setAvailableSitesFromDB(sitesData);

        const usersQueryConstraints: QueryConstraint[] = [];
        if (userProfile.role !== 'Super User' && userProfile.empresa) {
          usersQueryConstraints.push(where("empresa", "==", userProfile.empresa));
        }
        const usersCollectionRef = collection(db, "users");
        const usersQuery = query(usersCollectionRef, ...usersQueryConstraints);
        const usersSnapshot = await getDocs(usersQuery);
        const usersData = usersSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as FullUserProfile))
            .sort((a, b) => a.name.localeCompare(b.name));
        setAvailableUsersFromDB(usersData);

      } catch (error) {
        console.error("Error fetching config data for RCA Analysis: ", error);
        toast({ title: "Error al Cargar Configuración", description: "No se pudieron cargar los sitios o usuarios.", variant: "destructive" });
      } finally {
        setConfigDataLoaded(true);
      }
    };
    if (userProfile) { // Only fetch if user profile is loaded
      fetchConfigData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, userProfile]);


  const ensureEventId = useCallback((): string => {
    let currentGeneratedId = eventData.id;
    if (!currentGeneratedId) {
      currentGeneratedId = `E-${String(Date.now()).slice(-5)}-${String(eventCounter).padStart(3, '0')}`;
      setEventData(prev => ({ ...prev, id: currentGeneratedId! })); 
      setEventCounter(prev => prev + 1);
    }
    let currentCreatedByState = createdBy;
    if (!currentCreatedByState && userProfile?.name) { 
      currentCreatedByState = userProfile.name;
      if (!createdBy) setCreatedBy(currentCreatedByState);
    }
    return currentGeneratedId;
  }, [eventData.id, eventCounter, createdBy, userProfile?.name]);


 const handleSaveAnalysisData = async (
    showToast: boolean = true,
    options?: {
      finalizedOverride?: boolean;
      statusOverride?: ReportedEventStatus;
      rejectionReason?: string;
      validationsOverride?: Validation[];
      plannedActionsOverride?: PlannedAction[];
      suppressNavigation?: boolean; 
      efficacyVerificationOverride?: EfficacyVerification;
    }
  ): Promise<{ success: boolean; newEventId?: string; needsNavigationUrl?: string }> => {
    const { finalizedOverride, statusOverride, rejectionReason: currentRejectionReason, validationsOverride, plannedActionsOverride, suppressNavigation, efficacyVerificationOverride } = options || {};

    let currentId = analysisDocumentId;
    let isNewEventCreation = false;

    if (!currentId) {
      const generatedId = ensureEventId(); 
      currentId = generatedId;
      isNewEventCreation = true;
      setAnalysisDocumentId(currentId); 
    }
    if (!currentId) {
      if (showToast) toast({ title: "Error Crítico", description: "No se pudo obtener o generar un ID para el análisis.", variant: "destructive" });
      return { success: false };
    }

    setIsSaving(true);
    const currentIsFinalized = finalizedOverride !== undefined ? finalizedOverride : isFinalized;
    
    // Get company from selected site to denormalize data
    const siteInfo = availableSitesFromDB.find(s => s.name === eventData.place);
    const siteEmpresa = siteInfo?.empresa;
    const consistentEventData = { ...eventData, id: currentId, empresa: siteEmpresa };

    let currentRejectionDetailsToSave = rejectionDetails;
    if (statusOverride === "Rechazado" && currentRejectionReason) {
      currentRejectionDetailsToSave = {
        reason: currentRejectionReason,
        rejectedBy: userProfile?.name || "Sistema",
        rejectedAt: new Date().toISOString(),
      };
    } else if ( (statusOverride === "En análisis" || statusOverride === "Pendiente" || statusOverride === "Finalizado" || statusOverride === "Verificado") && currentRejectionDetailsToSave ) {
        currentRejectionDetailsToSave = undefined; 
    }

    let currentCreatedByState = createdBy;
    if (!currentCreatedByState && userProfile?.name && isNewEventCreation) { 
      currentCreatedByState = userProfile.name;
      if (!createdBy) setCreatedBy(currentCreatedByState);
    }
    
    const currentEfficacyVerification = efficacyVerificationOverride || efficacyVerification;
    
    let currentPlannedActions = (plannedActionsOverride !== undefined) ? plannedActionsOverride : plannedActions;

    const rcaDocPayload: Partial<RCAAnalysisDocument> = {
      eventData: consistentEventData, immediateActions, projectLeader, detailedFacts, investigationObjective, investigationSessions, analysisDetails,
      timelineEvents, brainstormingIdeas, analysisTechnique, analysisTechniqueNotes, ishikawaData, evidences,
      fiveWhysData, ctmData, identifiedRootCauses, 
      plannedActions: currentPlannedActions,
      validations: (validationsOverride !== undefined) ? validationsOverride : validations,
      finalComments, isFinalized: currentIsFinalized, efficacyVerification: currentEfficacyVerification,
      leccionesAprendidas,
      rejectionDetails: currentRejectionDetailsToSave,
      createdBy: currentCreatedByState,
      empresa: siteEmpresa,
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
      } else if ( (statusOverride === "En análisis" || statusOverride === "Pendiente" || statusOverride === "Finalizado" || statusOverride === "Verificado") && finalComments.startsWith("Evento Rechazado")) {
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

      if (finalCommentsToSave !== finalComments) setFinalComments(finalCommentsToSave);
      if (finalizedOverride !== undefined && isFinalized !== finalizedOverride) setIsFinalized(finalizedOverride);
      if (efficacyVerificationOverride && efficacyVerification !== efficacyVerificationOverride) setEfficacyVerification(efficacyVerificationOverride);
      if (currentRejectionDetailsToSave !== rejectionDetails) setRejectionDetails(currentRejectionDetailsToSave);
      if (validationsOverride !== undefined && validationsOverride !== validations) setValidations(validationsOverride); 
      if (currentPlannedActions !== plannedActions) setPlannedActions(currentPlannedActions);
      if (dataToSave.createdBy && createdBy !== dataToSave.createdBy) setCreatedBy(dataToSave.createdBy);
      if(consistentEventData.id !== eventData.id) setEventData(consistentEventData);


      const reportedEventRef = doc(db, "reportedEvents", currentId);
      const reportedEventSnap = await getDoc(reportedEventRef);
      let statusForReportedEvent: ReportedEventStatus;
      
      const latestRcaDoc = (await getDoc(rcaDocRef)).data() as RCAAnalysisDocument;

      if(statusOverride) {
        statusForReportedEvent = statusOverride;
      } else if (currentEfficacyVerification.status === 'verified') {
        statusForReportedEvent = 'Verificado';
      } else if (currentIsFinalized) {
        statusForReportedEvent = "Finalizado";
      } else if (reportedEventSnap.exists()) {
        statusForReportedEvent = reportedEventSnap.data().status;
        const rcaData = latestRcaDoc;
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
        equipo: consistentEventData.equipo || "No especificado", // Include equipo
        date: consistentEventData.date || new Date().toISOString().split('T')[0],
        type: consistentEventData.eventType || '',
        priority: consistentEventData.priority || '',
        status: statusForReportedEvent,
        description: consistentEventData.focusEventDescription || "Sin descripción detallada.",
        updatedAt: new Date().toISOString(),
        empresa: siteEmpresa,
      };

      const sanitizedReportedEventPayload = sanitizeForFirestore(reportedEventPayload);

      if (!reportedEventSnap.exists()) {
        await setDoc(reportedEventRef, { ...sanitizedReportedEventPayload, createdAt: new Date().toISOString() });
      } else {
        const updatePayload: Partial<ReportedEvent> = {
            title: sanitizedReportedEventPayload.title,
            site: sanitizedReportedEventPayload.site,
            equipo: sanitizedReportedEventPayload.equipo, // Include equipo in update
            date: sanitizedReportedEventPayload.date,
            type: sanitizedReportedEventPayload.type,
            priority: sanitizedReportedEventPayload.priority,
            description: sanitizedReportedEventPayload.description,
            status: statusForReportedEvent,
            updatedAt: new Date().toISOString(),
            empresa: siteEmpresa,
        };
        await updateDoc(reportedEventRef, sanitizeForFirestore(updatePayload));
      }

      let navigationUrl: string | undefined = undefined;
      if (isNewEventCreation) {
        const currentStep = step; 
        const targetUrl = `/analisis?id=${currentId}&step=${currentStep}`;
        lastLoadedAnalysisIdRef.current = currentId; 
        if (!suppressNavigation) {
          router.replace(targetUrl, { scroll: false });
        } else {
          navigationUrl = targetUrl;
        }
      }


      if (showToast) {
        toast({ title: "Progreso Guardado", description: `Análisis ${currentId} guardado. Evento reportado actualizado a estado: ${statusForReportedEvent}.` });
      }
      return { success: true, newEventId: isNewEventCreation ? currentId : undefined, needsNavigationUrl: navigationUrl };
    } catch (error) {
      console.error("Error saving data to Firestore: ", error);
      if (isNewEventCreation) { 
        setAnalysisDocumentId(null); 
        lastLoadedAnalysisIdRef.current = null; 
      }
      if (showToast) {
        toast({ title: "Error al Guardar", description: `No se pudo guardar la información. Error: ${(error as Error).message}`, variant: "destructive" });
      }
      return { success: false };
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSaveFromStep2 = async () => {
    await handleSaveAnalysisData(true);
  };

  const handleApproveEvent = async () => {
    let currentId = analysisDocumentId;
    if (!currentId) { 
        const newId = ensureEventId();
        currentId = newId;
        setAnalysisDocumentId(newId); 
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
    const saveResult = await handleSaveAnalysisData(false, { statusOverride: "En análisis" });
    if (saveResult.success) {
      const finalEventId = saveResult.newEventId || currentId; 
      if(saveResult.newEventId && analysisDocumentId !== finalEventId) setAnalysisDocumentId(finalEventId);

      toast({ title: "Evento Aprobado", description: `El evento ${finalEventId} ha sido marcado como "En análisis".` });
      setCurrentEventStatus("En análisis");
      
      const currentConsistentEventData = { ...eventData, id: finalEventId }; 

      const siteInfo = availableSitesFromDB.find(s => s.name === currentConsistentEventData.place);
      if (siteInfo && siteInfo.empresa) {
        // Only notify Admins and Super Users of the company
        const relevantUsersInCompany = availableUsersFromDB.filter(u => 
            u.empresa === siteInfo.empresa &&
            (u.role === 'Admin' || u.role === 'Super User')
        );
        let emailsSentCount = 0;
        let attemptedEmails = 0;
        for (const user of relevantUsersInCompany) {
          if (user.email && (user.emailNotifications === undefined || user.emailNotifications)) {
            attemptedEmails++;
            const emailSubject = `Evento ACR Aprobado: ${currentConsistentEventData.focusEventDescription.substring(0, 40)}... (ID: ${finalEventId})`;
            const emailBody = `Estimado/a ${user.name},\n\nEl evento "${currentConsistentEventData.focusEventDescription}" (ID: ${finalEventId}) reportado en el sitio "${siteInfo.name}" (Empresa: "${siteInfo.empresa}") ha sido aprobado y ha pasado al estado 'En análisis'.\n\nPuede revisarlo en el sistema.\n\nSaludos,\nSistema Asistente ACR`;
            const emailResult = await sendEmailAction({ to: user.email, subject: emailSubject, body: emailBody });
            if(emailResult.success) emailsSentCount++;
          }
        }
        if (attemptedEmails > 0) {
          toast({ title: "Notificaciones de Aprobación", description: `${emailsSentCount} de ${attemptedEmails} correos de notificación procesados para los Administradores de la empresa '${siteInfo.empresa}'.` });
        } else {
          toast({ title: "Notificación", description: `No se encontraron Administradores elegibles para notificar en la empresa '${siteInfo.empresa}'.`, variant: "default" });
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
        const newId = ensureEventId();
        currentId = newId;
        setAnalysisDocumentId(newId); 
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
    let rcaDocCreatorEmail: string | null = null;
    let creatorProfileForEmail: FullUserProfile | undefined = undefined;
    
    let rcaDocCreatorIdentifier = createdBy; 
    
    if (!rcaDocCreatorIdentifier && currentId) { 
        try {
            const rcaDocRef = doc(db, "rcaAnalyses", currentId);
            const rcaDocSnap = await getDoc(rcaDocRef);
            if (rcaDocSnap.exists()) {
                const rcaData = rcaDocSnap.data() as RCAAnalysisDocument;
                rcaDocCreatorIdentifier = rcaData.createdBy; 
                if (rcaData.createdBy && createdBy !== rcaData.createdBy) {
                    setCreatedBy(rcaData.createdBy); 
                }
            }
        } catch (fetchError) {
            console.error("Error fetching RCA document for creator info:", fetchError);
        }
    }

    if (rcaDocCreatorIdentifier) {
      creatorProfileForEmail = availableUsersFromDB.find(u => u.name === rcaDocCreatorIdentifier);
      if (creatorProfileForEmail) {
        rcaDocCreatorName = creatorProfileForEmail.name;
        rcaDocCreatorEmail = creatorProfileForEmail.email || null;
      } else {
        rcaDocCreatorName = rcaDocCreatorIdentifier; 
      }
    }


    const saveResult = await handleSaveAnalysisData(
      false,
      { finalizedOverride: true, statusOverride: "Rechazado", rejectionReason: rejectionReason }
    );

    if (saveResult.success) {
      const finalEventId = saveResult.newEventId || currentId;
      if(saveResult.newEventId && analysisDocumentId !== finalEventId) setAnalysisDocumentId(finalEventId);

      toast({ title: "Evento Rechazado", description: `El evento ${finalEventId} ha sido marcado como rechazado.` });
      setCurrentEventStatus("Rechazado"); 

      let emailNotificationStatus = `Evento ${finalEventId} rechazado. `;
      if (creatorProfileForEmail && rcaDocCreatorEmail && (creatorProfileForEmail.emailNotifications === undefined || creatorProfileForEmail.emailNotifications)) {
        const emailSubject = `Evento ACR Rechazado: ${eventData.focusEventDescription.substring(0, 40)}... (ID: ${finalEventId})`;
        const rejectedByName = userProfile?.name || "Sistema";
        const formattedRejectionDate = new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });
        const emailBody = `Estimado/a ${rcaDocCreatorName},\n\nEl evento "${eventData.focusEventDescription}" (ID: ${finalEventId}) que usted creó/reportó ha sido rechazado.\n\nMotivo del Rechazo: ${rejectionReason}\nRechazado por: ${rejectedByName}\nFecha de Rechazo: ${formattedRejectionDate}\n\nPor favor, revise los detalles en el sistema si es necesario.\n\nSaludos,\nSistema Asistente ACR`;
        const emailResult = await sendEmailAction({ to: rcaDocCreatorEmail, subject: emailSubject, body: emailBody });
        if (emailResult.success) {
          emailNotificationStatus += `Notificación de rechazo enviada al creador del evento: ${rcaDocCreatorName}.`;
        } else {
          emailNotificationStatus += `No se pudo enviar correo de rechazo al creador del evento (${rcaDocCreatorName}): ${emailResult.message}`;
        }
      } else {
        emailNotificationStatus += `No se pudo notificar al creador del evento (${rcaDocCreatorName || 'No Identificado'}) por correo (no encontrado, sin email, o notificaciones desactivadas).`;
      }
       toast({ title: "Resultado de Rechazo", description: emailNotificationStatus, variant: "default", duration: 7000 });

      setRejectionReason('');
      setIsRejectConfirmOpen(false);
    } else {
      toast({ title: "Error al Rechazar", description: "No se pudo actualizar el estado del evento.", variant: "destructive" });
    }
    setIsSaving(false);
  };


  const isStep4ValidForNavigation = useMemo(() => {
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
    if (!eventData.equipo.trim()) missingFields.push("Equipo"); // Added Equipo validation
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
    if (step === 1) { 
      if (currentEventStatus === 'Pendiente') {
        return { isValid: false, message: "Este evento debe ser aprobado antes de continuar con el análisis." };
      }
      if (currentEventStatus === 'Rechazado') {
        return { isValid: false, message: "Este evento ha sido rechazado y no puede continuar el análisis." };
      }
    }
    return { isValid: true };
  };

  const handleGoToStep = async (targetStep: number) => {
    if (targetStep >= 5 && !isStep4ValidForNavigation) {
      toast({
        title: "Validación Requerida en Paso 4",
        description: "Asegúrese de que todas las causas raíz descritas estén abordadas por un plan de acción antes de continuar.",
        variant: "destructive",
        duration: 7000
      });
      return;
    }

    if (targetStep > maxCompletedStep + 1 && targetStep !== 1) {
      return;
    }

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
    
    setStep(targetStep);
    if (analysisDocumentId) {
      router.replace(`/analisis?id=${analysisDocumentId}&step=${targetStep}`, { scroll: false });
    }
  };


  const handleNextStep = async () => {
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
    
    if (step === 2) {
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
          return;
        }
    } else if (step === 4) {
      if (!isStep4ValidForNavigation) {
        toast({
          title: "Revisión Necesaria en Paso 4",
          description: "Verifique que todas las causas raíz descritas estén abordadas por un plan de acción completo.",
          variant: "destructive",
          duration: 7000,
        });
        return;
      }
    } else if (step === 5) {
      if (plannedActions.length > 0) {
        const allActionsDecided = plannedActions.every(pa => {
          if (!pa || !pa.id) return true; 
          const validationEntry = validations.find(v => v && v.actionId === pa.id);
          return validationEntry && (validationEntry.status === 'validated' || validationEntry.status === 'rejected');
        });

        if (!allActionsDecided) {
          toast({
            title: "Acciones Pendientes de Decisión",
            description: "Todas las acciones planificadas deben estar validadas o rechazadas para continuar al Paso 6.",
            variant: "destructive",
          });
          return;
        }
      }
    }
    
    await handleSaveAnalysisData(false);

    const newStep = Math.min(step + 1, 6);
    setStep(newStep);
    setMaxCompletedStep(Math.max(maxCompletedStep, step));
    if (analysisDocumentId) {
        router.replace(`/analisis?id=${analysisDocumentId}&step=${newStep}`, { scroll: false });
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
    if (!tempEventId && analysisDocumentId) tempEventId = analysisDocumentId;
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

  const onDetailedFactChange = (field: keyof DetailedFacts, value: string) => {
    setDetailedFacts(prev => ({ ...prev, [field]: value }));
  };

  const handleAddEvidence = (newEvidence: Evidence) => {
    setEvidences(prev => [...(prev || []), newEvidence]);
  };

  const handleRemoveEvidence = (id: string) => {
    setEvidences(prev => (prev || []).filter(e => e.id !== id));
    toast({ title: "Evidencia Eliminada Localmente", variant: "destructive" });
  };


  const handleAnalysisTechniqueChange = (value: AnalysisTechnique) => {
    setAnalysisTechnique(value);
    
    if (value === 'Ishikawa') {
        const isIshikawaEmpty = !ishikawaData || ishikawaData.every(cat => cat.causes.length === 0);
        if (isIshikawaEmpty) {
            setIshikawaData(JSON.parse(JSON.stringify(initialIshikawaData)));
        }
    } else if (value === '5 Por qué') {
        const is5WhysEmpty = !fiveWhysData || fiveWhysData.length === 0;
        if (is5WhysEmpty) {
            setFiveWhysData([]);
        }
    } else if (value === 'CTM') {
        const isCtmEmpty = !ctmData || ctmData.length === 0;
        if (isCtmEmpty) {
            setCtmData(JSON.parse(JSON.stringify(initialCTMData)));
        }
    }
  };

  const handleAddIdentifiedRootCause = () => {
    setIdentifiedRootCauses(prev => [...prev, { id: generateClientSideId('rc'), description: '' }]);
  };

  const handleUpdateIdentifiedRootCause = (id: string, description: string) => {
    setIdentifiedRootCauses(prev => prev.map(rc => rc.id === id ? { ...rc, description } : rc));
  };

  const handleRemoveIdentifiedRootCause = (id: string) => {
    setIdentifiedRootCauses(prev => prev.filter(rc => rc.id !== id));
  };

  const handleAddPlannedAction = () => {
    let currentEventId = analysisDocumentId;
    if (!currentEventId && eventData.id) currentEventId = eventData.id;
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

  const handleAddBrainstormIdea = () => {
    setBrainstormingIdeas(prev => [...prev, { id: generateClientSideId('bi'), type: '', description: '' }]);
  };

  const handleUpdateBrainstormIdea = (id: string, field: 'type' | 'description', value: string) => {
    setBrainstormingIdeas(prev => prev.map(idea => idea.id === id ? { ...idea, [field]: value } : idea));
  };

  const handleRemoveBrainstormIdea = (id: string) => {
    setBrainstormingIdeas(prev => prev.filter(idea => idea.id !== id));
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

  const handleToggleValidation = useCallback(async (actionId: string, newStatus: Validation['status'], rejectionReasonInput?: string) => {
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
        } else { 
          updatedValidation.validatedAt = undefined;
          updatedValidation.rejectedAt = undefined;
          updatedValidation.rejectionReason = undefined;
        }
        return updatedValidation;
      }
      return v;
    });
    
    let finalPlannedActions = plannedActions;
    if (newStatus === 'rejected') {
      finalPlannedActions = plannedActions.map(action => {
        if (action.id === actionId) {
          return { ...action, markedAsReadyAt: undefined };
        }
        return action;
      });
    }

    setValidations(newValidationsArray);
    if (newStatus === 'rejected') {
      setPlannedActions(finalPlannedActions);
    }
    
    const saveResult = await handleSaveAnalysisData(
      false, 
      { 
        validationsOverride: newValidationsArray,
        plannedActionsOverride: finalPlannedActions
      }
    );
    
    if (saveResult.success && newStatus === 'rejected') {
      const rejectedAction = finalPlannedActions.find(pa => pa.id === actionId);
      if (rejectedAction && rejectedAction.responsible) {
        const responsibleUser = availableUsersFromDB.find(u => u.name === rejectedAction.responsible);
        if (responsibleUser && responsibleUser.email && (responsibleUser.emailNotifications === undefined || responsibleUser.emailNotifications)) {
          toast({ title: "Acción Rechazada", description: `Enviando notificación a ${responsibleUser.name}...`, variant: "destructive" });
          const emailSubject = `Acción RCA Rechazada: ${rejectedAction.description.substring(0, 30)}...`;
          const validationLink = `${window.location.origin}/usuario/planes`;
          const emailBody = `Estimado/a ${responsibleUser.name},\n\nLa siguiente acción planificada del evento "${eventData.focusEventDescription}" ha sido RECHAZADA:\n\nAcción: ${rejectedAction.description}\n\nMotivo del Rechazo:\n${rejectionReasonInput}\n\nPor favor, revise la tarea en el sistema para tomar las medidas necesarias. Puede ver sus tareas en el siguiente enlace:\n${validationLink}\n\nSaludos,\nSistema Asistente ACR`;

          const emailResult = await sendEmailAction({
            to: responsibleUser.email,
            subject: emailSubject,
            body: emailBody
          });

          if (emailResult.success) {
            toast({ title: "Notificación Enviada", description: `Se ha notificado a ${responsibleUser.name} sobre el rechazo.` });
          } else {
            toast({ title: "Error de Notificación", description: `No se pudo enviar el correo: ${emailResult.message}`, variant: "destructive" });
          }

        } else {
          toast({ title: "Notificación no enviada", description: "No se pudo encontrar el responsable, su correo, o tiene las notificaciones desactivadas.", variant: "destructive" });
        }
      }
    } else if (!saveResult.success && newStatus === 'rejected') {
      toast({ title: "Error al Guardar", description: "No se pudo guardar el estado de rechazo. Revirtiendo cambio.", variant: "destructive"});
      setValidations(validations);
      setPlannedActions(plannedActions);
    }
  }, [validations, plannedActions, handleSaveAnalysisData, toast, availableUsersFromDB, eventData.focusEventDescription]);


  const handlePrintReport = () => {
    const nonPrintableElements = document.querySelectorAll('.no-print');
    nonPrintableElements.forEach(el => el.classList.add('hidden'));
    window.print();
    nonPrintableElements.forEach(el => el.classList.remove('hidden'));
  };

  const handleMarkAsFinalized = async () => {
    let currentId = analysisDocumentId;
    if (!currentId && eventData.id) currentId = eventData.id;
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

    const saveResult = await handleSaveAnalysisData(false, { finalizedOverride: true, statusOverride: "Finalizado" });
    const finalEventId = saveResult.newEventId || currentId;
    if(saveResult.newEventId && analysisDocumentId !== finalEventId) setAnalysisDocumentId(finalEventId);

    if (saveResult.success) {
      toast({ title: "Proceso Finalizado", description: `Análisis ${finalEventId} marcado como finalizado y evento reportado actualizado.`, className: "bg-primary text-primary-foreground"});
    } else {
      setIsFinalized(false);
      toast({ title: "Error al Finalizar", description: "No se pudo guardar el estado finalizado del análisis. Intente de nuevo.", variant: "destructive" });
    }
    setIsSaving(false);
  };
  
  const handleVerifyEfficacy = async (comments: string) => {
    const verificationData: EfficacyVerification = {
      ...efficacyVerification,
      status: 'verified',
      comments,
      verifiedAt: new Date().toISOString(),
      verifiedBy: userProfile!.name,
    };
    const saveResult = await handleSaveAnalysisData(false, {
      efficacyVerificationOverride: verificationData,
      statusOverride: 'Verificado',
    });
    if(saveResult.success){
        toast({ title: "Eficacia Verificada", description: "El análisis ha sido verificado con éxito." });
    } else {
        toast({ title: "Error", description: "No se pudo guardar la verificación de eficacia.", variant: "destructive" });
    }
  };

  const handlePlanEfficacyVerification = async (responsible: string, verificationDate: string) => {
    const verificationData: EfficacyVerification = {
      ...efficacyVerification,
      verifiedBy: responsible,
      verificationDate: verificationDate,
    };
    const saveResult = await handleSaveAnalysisData(false, {
      efficacyVerificationOverride: verificationData,
    });
    if(saveResult.success){
        toast({ title: "Planificación Guardada", description: "Se ha guardado la planificación de la verificación." });
    } else {
        toast({ title: "Error", description: "No se pudo guardar la planificación.", variant: "destructive" });
    }
  };


  useEffect(() => {
    if (step > maxCompletedStep) {
      setMaxCompletedStep(step -1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentRcaDocument: RCAAnalysisDocument | null = analysisDocumentId ? {
      eventData,
      immediateActions,
      projectLeader,
      detailedFacts,
      investigationObjective,
      investigationSessions,
      analysisDetails,
      timelineEvents,
      brainstormingIdeas,
      analysisTechnique,
      analysisTechniqueNotes,
      ishikawaData,
      fiveWhysData,
      ctmData,
      identifiedRootCauses,
      plannedActions,
      evidences,
      validations,
      finalComments,
      leccionesAprendidas,
      isFinalized,
      rejectionDetails,
      efficacyVerification,
      createdAt: '', 
      updatedAt: '', 
  } : null;


  if (isLoadingPage || loadingAuth) {
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
        <h1 className="text-3xl sm:text-4xl font-bold font-headline text-primary">Analizador ACR Avanzado</h1>
        <p className="text-muted-foreground mt-1">
          Herramienta de Análisis de Causa Raíz con gráficos. ID Análisis: <span className="font-semibold text-primary">{analysisDocumentId || eventData.id || "Nuevo Análisis"}</span>
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
         isStep4Valid={isStep4ValidForNavigation}
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
            validateStep1PreRequisites={validateStep1PreRequisites} 
          />
        )}
      </div>
      <div className={step === 2 ? "" : "print:hidden"}>
      {step === 2 && (
        <Step2Facts
          detailedFacts={detailedFacts}
          onDetailedFactChange={onDetailedFactChange}
          projectLeader={projectLeader}
          onProjectLeaderChange={handleProjectLeaderChange}
          investigationObjective={investigationObjective}
          onInvestigationObjectiveChange={setInvestigationObjective}
          analysisDetails={analysisDetails}
          onAnalysisDetailsChange={setAnalysisDetails}
          evidences={evidences}
          onAddEvidence={handleAddEvidence}
          onRemoveEvidence={handleRemoveEvidence}
          availableUsers={availableUsersFromDB}
          availableSites={availableSitesFromDB}
          investigationSessions={investigationSessions}
          onSetInvestigationSessions={setInvestigationSessions}
          onPrevious={handlePreviousStep}
          onNext={handleNextStep}
          onSaveAnalysis={handleSaveFromStep2}
          isSaving={isSaving}
        />
      )}
      </div>
      <div className={step === 3 ? "" : "print:hidden"}>
       {step === 3 && currentRcaDocument && (
          <Step2Point5Tasks
            allRcaDocuments={[currentRcaDocument]}
            availableUsers={availableUsersFromDB}
            userProfile={userProfile}
            loadingAuth={loadingAuth}
            isSaving={isSaving}
            onPrevious={handlePreviousStep}
            onNext={() => handleGoToStep(4)}
            onSaveAnalysis={handleSaveAnalysisData}
            availableSites={availableSitesFromDB}
          />
       )}
      </div>
      <div className={step === 4 ? "" : "print:hidden"}>
      {step === 4 && (
        <Step3Analysis
          eventData={eventData}
          availableSites={availableSitesFromDB}
          timelineEvents={timelineEvents}
          onSetTimelineEvents={setTimelineEvents}
          brainstormingIdeas={brainstormingIdeas}
          onAddBrainstormIdea={handleAddBrainstormIdea}
          onUpdateBrainstormIdea={handleUpdateBrainstormIdea}
          onRemoveBrainstormIdea={handleRemoveBrainstormIdea}
          analysisTechnique={analysisTechnique}
          onAnalysisTechniqueChange={handleAnalysisTechniqueChange}
          analysisTechniqueNotes={analysisTechniqueNotes}
          onAnalysisTechniqueNotesChange={setAnalysisTechniqueNotes}
          ishikawaData={ishikawaData}
          onSetIshikawaData={setIshikawaData}
          fiveWhysData={fiveWhysData}
          onSetFiveWhysData={setFiveWhysData}
          ctmData={ctmData}
          onSetCtmData={setCtmData}
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
      <div className={step === 5 ? "" : "print:hidden"}>
      {step === 5 && (
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
      {step === 6 && (
        <Step5Results
          eventId={analysisDocumentId || eventData.id}
          eventData={eventData}
          availableSites={availableSitesFromDB}
          projectLeader={projectLeader}
          investigationSessions={investigationSessions}
          detailedFacts={detailedFacts}
          analysisDetails={analysisDetails}
          analysisTechnique={analysisTechnique}
          analysisTechniqueNotes={analysisTechniqueNotes}
          ishikawaData={ishikawaData}
          fiveWhysData={fiveWhysData}
          ctmData={ctmData}
          timelineEvents={timelineEvents}
          brainstormingIdeas={brainstormingIdeas}
          identifiedRootCauses={identifiedRootCauses}
          plannedActions={plannedActions}
          evidences={evidences}
          finalComments={finalComments}
          onFinalCommentsChange={setFinalComments}
          leccionesAprendidas={leccionesAprendidas}
          onLeccionesAprendidasChange={setLeccionesAprendidas}
          onPrintReport={handlePrintReport}
          availableUsers={availableUsersFromDB}
          isFinalized={isFinalized}
          onMarkAsFinalized={handleMarkAsFinalized}
          onSaveAnalysis={handleSaveAnalysisData}
          isSaving={isSaving}
          investigationObjective={investigationObjective}
          efficacyVerification={efficacyVerification}
          onVerifyEfficacy={handleVerifyEfficacy}
          onPlanEfficacyVerification={handlePlanEfficacyVerification}
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
              ID Evento: {analysisDocumentId || eventData.id || 'N/A'}. Esta acción marcará el evento como rechazado y finalizado. No podrá ser modificado posteriormente.
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

export default function RCAAnalysisPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando analizador...</p>
      </div>
    }>
      <RCAAnalysisPageComponent />
    </Suspense>
  );
}
