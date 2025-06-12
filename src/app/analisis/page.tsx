
'use client';
import { useState, useEffect, useCallback } from 'react';
import type { RCAEventData, ImmediateAction, PlannedAction, Validation, AnalysisTechnique, IshikawaData, FiveWhysData, CTMData, DetailedFacts, PreservedFact, IdentifiedRootCause, FullUserProfile, Site, RCAAnalysisDocument } from '@/types/rca';
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
import { collection, getDocs, query, orderBy, doc, setDoc, getDoc } from "firebase/firestore";
import { Loader2 } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation'; // Added for loading analysis

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
  const [isLoadingPage, setIsLoadingPage] = useState(true); // For overall page load
  const [isSaving, setIsSaving] = useState(false);

  const [availableSitesFromDB, setAvailableSitesFromDB] = useState<Site[]>([]);
  const [availableUsersFromDB, setAvailableUsersFromDB] = useState<FullUserProfile[]>([]);

  // States for each part of the RCA analysis document
  const [eventData, setEventData] = useState<RCAEventData>(initialRCAAnalysisState.eventData);
  const [eventCounter, setEventCounter] = useState(1); // For generating new event IDs locally
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


  const loadAnalysisData = useCallback(async (id: string) => {
    setIsLoadingPage(true);
    try {
      const analysisDocRef = doc(db, "rcaAnalyses", id);
      const docSnap = await getDoc(analysisDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as RCAAnalysisDocument;
        setEventData(data.eventData);
        setImmediateActions(data.immediateActions || []);
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
        setPlannedActions(data.plannedActions || []);
        setValidations(data.validations || []);
        setFinalComments(data.finalComments || '');
        setIsFinalized(data.isFinalized || false);
        setAnalysisDocumentId(id);
        setMaxCompletedStep(4); // Allow navigation to all steps if loading existing
        toast({ title: "Análisis Cargado", description: `Se cargó el análisis ID: ${id}` });
      } else {
        toast({ title: "Análisis No Encontrado", description: `No se encontró un análisis con ID: ${id}. Iniciando nuevo análisis.`, variant: "destructive" });
        // Reset to initial state or handle as new - current logic will keep initial state
        setAnalysisDocumentId(null); // Explicitly set to null if not found
      }
    } catch (error) {
      console.error("Error loading RCA analysis: ", error);
      toast({ title: "Error al Cargar Análisis", description: "No se pudo cargar el análisis desde Firestore.", variant: "destructive" });
    } finally {
      setIsLoadingPage(false);
    }
  }, [toast]);

  useEffect(() => {
    const analysisIdFromParams = searchParams.get('id');
    if (analysisIdFromParams) {
      loadAnalysisData(analysisIdFromParams);
    } else {
      // If no ID, it's a new analysis, ensure eventData.id is potentially set
      if (!eventData.id) {
         // Potentially generate a new one here if needed for a truly new session
         // For now, ensureEventId will handle it on first save/interaction
      }
      setIsLoadingPage(false); // Not loading existing data
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, loadAnalysisData]); // loadAnalysisData is memoized by useCallback

  useEffect(() => {
    const fetchConfigData = async () => {
      // setIsLoadingPage(true) // Keep this if config data is critical before page interaction
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
        toast({ title: "Error al Cargar Configuración", description: "No se pudieron cargar los sitios o usuarios desde Firestore.", variant: "destructive" });
      } finally {
        // setIsLoadingPage(false);
      }
    };
    fetchConfigData();
  }, [toast]);


  const ensureEventId = useCallback((): string => {
    if (!eventData.id) {
      const newEventID = `E-${String(Date.now()).slice(-5)}-${String(eventCounter).padStart(3, '0')}`;
      setEventData(prev => ({ ...prev, id: newEventID }));
      setEventCounter(prev => prev + 1);
      setAnalysisDocumentId(newEventID); // Set the document ID for new analysis
      return newEventID;
    }
    if (!analysisDocumentId && eventData.id) { // If eventData.id exists but analysisDocumentId doesn't (e.g. loading from event page)
        setAnalysisDocumentId(eventData.id);
    }
    return eventData.id;
  }, [eventData.id, eventCounter, analysisDocumentId]);

  const handleSaveAnalysisData = async (showToast: boolean = true) => {
    const currentId = analysisDocumentId || ensureEventId(); // Ensure ID exists
    if (!currentId) {
      toast({ title: "Error Crítico", description: "No se pudo obtener o generar un ID para el análisis.", variant: "destructive" });
      return;
    }
    
    setIsSaving(true);
    const analysisDoc: Omit<RCAAnalysisDocument, 'createdAt' | 'updatedAt'> & Partial<Pick<RCAAnalysisDocument, 'createdAt'>> = {
      eventData,
      immediateActions,
      projectLeader,
      detailedFacts,
      analysisDetails,
      preservedFacts,
      analysisTechnique,
      analysisTechniqueNotes,
      ishikawaData,
      fiveWhysData,
      ctmData,
      identifiedRootCauses,
      plannedActions,
      validations,
      finalComments,
      isFinalized,
      // createdBy: "currentUserId", // Placeholder for actual user auth
    };

    try {
      const docRef = doc(db, "rcaAnalyses", currentId);
      const docSnap = await getDoc(docRef);
      
      const dataToSave: RCAAnalysisDocument = {
        ...analysisDoc,
        updatedAt: new Date().toISOString(),
        createdAt: docSnap.exists() ? docSnap.data().createdAt : new Date().toISOString(),
      };

      await setDoc(docRef, dataToSave, { merge: true });
      if (showToast) {
        toast({ title: "Progreso Guardado", description: `Análisis ${currentId} guardado en Firestore.` });
      }
    } catch (error) {
      console.error("Error saving RCA analysis to Firestore: ", error);
      if (showToast) {
        toast({ title: "Error al Guardar", description: "No se pudo guardar el análisis. Verifique la consola.", variant: "destructive" });
      }
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleGoToStep = (targetStep: number) => {
    if (targetStep > step && targetStep > maxCompletedStep + 1 && targetStep !== 1) {
      return;
    }
    if (targetStep >=1 && !eventData.id && targetStep > 1 ) { 
        ensureEventId();
    }
    setStep(targetStep);
    if (targetStep > maxCompletedStep && targetStep > step ) { 
        setMaxCompletedStep(targetStep -1);
    }
  };

  const handleNextStep = () => {
    const currentId = analysisDocumentId || ensureEventId(); // Ensure ID for context if user proceeds without explicit save
    if (!currentId && step > 1) {
        toast({ title: "Error de Sincronización", description: "Por favor, guarde el evento en el Paso 1 antes de continuar.", variant: "destructive"});
        setStep(1); // Force back to step 1 if ID somehow not set.
        return;
    }
    const newStep = Math.min(step + 1, 5);
    const newMaxCompletedStep = Math.max(maxCompletedStep, step);
    setStep(newStep);
    setMaxCompletedStep(newMaxCompletedStep);
  };

  const handlePreviousStep = () => {
    const newStep = Math.max(step - 1, 1);
    setStep(newStep);
  };
  
  const handleEventDataChange = (field: keyof RCAEventData, value: string | EventType | PriorityType) => {
    setEventData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddImmediateAction = () => {
    const tempEventId = eventData.id || ensureEventId();
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
      const initialWhy = lastEntry && lastEntry.because ? lastEntry.because : '';
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
    setPlannedActions(prev => [...prev, { 
      id: newActionId, 
      eventId: currentEventId, 
      description: '', 
      responsible: '', 
      dueDate: '',
      relatedRootCauseIds: [],
      evidencias: [],
      userComments: '',
    }]);
    setPlannedActionCounter(prev => prev + 1);
  };

  const handleUpdatePlannedAction = (index: number, field: keyof Omit<PlannedAction, 'eventId' | 'id'>, value: string | string[]) => {
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

  const handleToggleValidation = (actionId: string) => {
    setValidations(prev => 
      prev.map(v => v.actionId === actionId ? { ...v, status: v.status === 'pending' ? 'validated' : 'pending' } : v)
    );
     handleSaveAnalysisData(false); // Save validation change silently
  };
  
  const handlePrintReport = () => {
    const nonPrintableElements = document.querySelectorAll('.no-print');
    nonPrintableElements.forEach(el => el.classList.add('hidden'));
    window.print();
    nonPrintableElements.forEach(el => el.classList.remove('hidden'));
  };

  const handleMarkAsFinalized = async () => {
    setIsFinalized(true);
    await handleSaveAnalysisData(false); // Save finalization state
    
    // Update ReportedEvent status if this analysis was linked from /eventos
    if (analysisDocumentId) {
        const reportedEventRef = doc(db, "reportedEvents", analysisDocumentId);
        try {
            await setDoc(reportedEventRef, { status: "Finalizado" }, { merge: true });
            toast({ title: "Proceso Finalizado", description: `El análisis RCA para el evento ${analysisDocumentId} ha sido marcado como finalizado y el estado del evento reportado actualizado.`, className: "bg-primary text-primary-foreground"});
        } catch (error) {
            console.error("Error updating reported event status: ", error);
            toast({ title: "Proceso Finalizado (con error)", description: `El análisis RCA fue finalizado, pero hubo un error al actualizar el estado del evento reportado ID: ${analysisDocumentId}.`, variant:"destructive"});
        }
    } else {
        toast({ title: "Proceso Finalizado", description: `El análisis RCA ha sido marcado como finalizado.`, className: "bg-primary text-primary-foreground"});
    }
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
          onSaveAnalysis={handleSaveAnalysisData}
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
          eventId={analysisDocumentId || eventData.id} // Use analysisDocumentId if available
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
          onSaveAnalysis={handleSaveAnalysisData} // Pass save function for final comments
          isSaving={isSaving}
        />
      )}
    </>
  );
}
