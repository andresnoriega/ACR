
'use client';
import { useState, useEffect, useCallback } from 'react';
import type { RCAEventData, ImmediateAction, PlannedAction, Validation, AnalysisTechnique, IshikawaData, FiveWhysData, FiveWhyEntry, CTMData, DetailedFacts, PreservedFact, PreservedFactCategory } from '@/types/rca';
import { StepNavigation } from '@/components/rca/StepNavigation';
import { Step1Initiation } from '@/components/rca/Step1Initiation';
import { Step2Facts } from '@/components/rca/Step2Facts';
import { Step3Analysis } from '@/components/rca/Step3Analysis';
import { Step4Validation } from '@/components/rca/Step4Validation';
import { Step5Results } from '@/components/rca/Step5Results';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

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

const sampleAvailableSites: Array<{ id: string; name: string }> = [
  { id: '1', name: 'Planta Industrial' },
  { id: '2', name: 'Centro Logístico' },
  { id: '3', name: 'Oficina Central' },
  { id: '4', name: 'Almacén Regional Norte' },
];

const sampleAvailableUsers: Array<{ id: string; name: string; email: string }> = [
  { id: '1', name: 'Carlos Ruiz', email: 'carlos.ruiz@example.com' },
  { id: '2', name: 'Ana López', email: 'ana.lopez@example.com' },
  { id: '3', name: 'Luis Torres', email: 'luis.torres@example.com' },
  { id: '4', name: 'Maria Solano', email: 'maria.solano@example.com' },
  { id: '5', name: 'Pedro Gómez', email: 'pedro.gomez@example.com' },
];


export default function RCAAnalysisPage() {
  const [step, setStep] = useState(1);
  const [maxCompletedStep, setMaxCompletedStep] = useState(0);
  const { toast } = useToast();

  const [eventData, setEventData] = useState<RCAEventData>({
    id: '', 
    place: '',
    date: '',
    focusEventDescription: '',
  });
  const [eventCounter, setEventCounter] = useState(1); 
  const [immediateActions, setImmediateActions] = useState<ImmediateAction[]>([]);
  const [immediateActionCounter, setImmediateActionCounter] = useState(1);

  const [projectLeader, setProjectLeader] = useState('');
  const [detailedFacts, setDetailedFacts] = useState<DetailedFacts>(initialDetailedFacts);
  const [analysisDetails, setAnalysisDetails] = useState(''); 
  const [preservedFacts, setPreservedFacts] = useState<PreservedFact[]>([]);

  const [analysisTechnique, setAnalysisTechnique] = useState<AnalysisTechnique>('');
  const [analysisTechniqueNotes, setAnalysisTechniqueNotes] = useState('');
  const [ishikawaData, setIshikawaData] = useState<IshikawaData>(JSON.parse(JSON.stringify(initialIshikawaData)));
  const [fiveWhysData, setFiveWhysData] = useState<FiveWhysData>(JSON.parse(JSON.stringify(initialFiveWhysData)));
  const [ctmData, setCtmData] = useState<CTMData>(JSON.parse(JSON.stringify(initialCTMData)));
  const [userDefinedRootCause, setUserDefinedRootCause] = useState('');
    
  const [plannedActions, setPlannedActions] = useState<PlannedAction[]>([]);
  const [plannedActionCounter, setPlannedActionCounter] = useState(1);

  const [validations, setValidations] = useState<Validation[]>([]);
  const [finalComments, setFinalComments] = useState(''); 

  const ensureEventId = useCallback(() => {
    if (!eventData.id) {
      const newEventID = `E-${String(eventCounter).padStart(5, '0')}`;
      setEventData(prev => ({ ...prev, id: newEventID }));
      setEventCounter(prev => prev + 1);
      toast({ title: "ID de Evento Generado", description: `Nuevo ID de evento: ${newEventID}` });
      return newEventID;
    }
    return eventData.id;
  }, [eventData.id, eventCounter, toast]);


  const handleGoToStep = (targetStep: number) => {
    if (targetStep > step && targetStep > maxCompletedStep + 1 && targetStep !== 1) {
      return;
    }
    if (targetStep >=1 && !eventData.id && targetStep > 1 ) { 
        ensureEventId();
    }
    if (targetStep >=3 && !eventData.id ) { 
      ensureEventId();
    }
    setStep(targetStep);
    if (targetStep > maxCompletedStep && targetStep > step ) { 
        setMaxCompletedStep(targetStep -1);
    }
  };

  const handleNextStep = () => {
    ensureEventId(); 
    const newStep = Math.min(step + 1, 5);
    const newMaxCompletedStep = Math.max(maxCompletedStep, step);
    setStep(newStep);
    setMaxCompletedStep(newMaxCompletedStep);
  };

  const handlePreviousStep = () => {
    const newStep = Math.max(step - 1, 1);
    setStep(newStep);
  };
  
  const handleEventDataChange = (field: keyof RCAEventData, value: string) => {
    setEventData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddImmediateAction = () => {
    const currentEventId = ensureEventId();
    if (!currentEventId) {
      toast({ title: "Error", description: "No se pudo generar/obtener ID de evento para la acción inmediata.", variant: "destructive" });
      return;
    }
    const newActionId = `${currentEventId}-IMA-${String(immediateActionCounter).padStart(3, '0')}`;
    setImmediateActions(prev => [...prev, { id: newActionId, description: '', responsible: '', dueDate: '' }]);
    setImmediateActionCounter(prev => prev + 1);
  };

  const handleUpdateImmediateAction = (index: number, field: keyof ImmediateAction, value: string) => {
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

  const handleAddPreservedFact = (fact: Omit<PreservedFact, 'id' | 'uploadDate'>) => {
    const currentEventId = eventData.id; // Event ID should exist by Step 2
    if (!currentEventId) {
      toast({ title: "Error", description: "ID de evento no encontrado para asociar el hecho preservado.", variant: "destructive" });
      // Potentially call ensureEventId() here if it's possible to reach Step 2 without an ID, though current logic tries to prevent this.
      // For now, we assume eventData.id is populated by the time we are in Step 2 or adding facts.
      return;
    }
    const newFact: PreservedFact = {
      ...fact,
      id: `${currentEventId}-pf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      uploadDate: new Date().toISOString(),
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
  
  const handleAddPlannedAction = () => {
    const currentEventId = ensureEventId(); 
    if (!currentEventId) { 
      toast({ title: "Error", description: "No se pudo generar/obtener ID de evento para la acción planificada.", variant: "destructive" });
      return;
    }
    const newActionId = `${currentEventId}-PA-${String(plannedActionCounter).padStart(3, '0')}`;
    setPlannedActions(prev => [...prev, { id: newActionId, eventId: currentEventId, description: '', responsible: '', dueDate: '' }]);
    setPlannedActionCounter(prev => prev + 1);
  };

  const handleUpdatePlannedAction = (index: number, field: keyof PlannedAction, value: string) => {
    setPlannedActions(prev => prev.map((act, i) => i === index ? { ...act, [field]: value } : act));
  };

  const handleRemovePlannedAction = (index: number) => {
    setPlannedActions(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    setValidations(prevValidations => {
      const newValidations = plannedActions.map(pa => {
        const existingValidation = prevValidations.find(v => v.actionId === pa.id);
        return existingValidation || { actionId: pa.id, status: 'pending' };
      });
      return newValidations.filter(v => plannedActions.some(pa => pa.id === v.actionId));
    });
  }, [plannedActions]);

  const handleToggleValidation = (actionId: string) => {
    setValidations(prev => 
      prev.map(v => v.actionId === actionId ? { ...v, status: v.status === 'pending' ? 'validated' : 'pending' } : v)
    );
  };
  
  const handlePrintReport = () => {
    const nonPrintableElements = document.querySelectorAll('.no-print');
    nonPrintableElements.forEach(el => el.classList.add('hidden'));
    
    const reportArea = document.getElementById('printable-report-area');
    if (reportArea) {
    }

    window.print();

    nonPrintableElements.forEach(el => el.classList.remove('hidden'));
     if (reportArea) {
    }
  };

  useEffect(() => {
    if (step > maxCompletedStep) {
      setMaxCompletedStep(step -1); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 


  return (
    <>
      <header className="text-center mb-8 no-print">
        <h1 className="text-3xl sm:text-4xl font-bold font-headline text-primary">Analizador RCA Avanzado</h1>
        <p className="text-muted-foreground mt-1">Herramienta de Análisis de Causa Raíz con gráficos</p>
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
            availableSites={sampleAvailableSites}
            availableUsers={sampleAvailableUsers.map(u => ({id: u.id, name: u.name}))}
            onNext={handleNextStep}
          />
        )}
      </div>
      <div className={step === 2 ? "" : "print:hidden"}>
      {step === 2 && (
        <Step2Facts
          projectLeader={projectLeader}
          onProjectLeaderChange={handleProjectLeaderChange}
          availableUsers={sampleAvailableUsers.map(u => ({id: u.id, name: u.name}))}
          detailedFacts={detailedFacts}
          onDetailedFactChange={handleDetailedFactChange}
          analysisDetails={analysisDetails}
          onAnalysisDetailsChange={setAnalysisDetails}
          preservedFacts={preservedFacts}
          onAddPreservedFact={handleAddPreservedFact}
          onRemovePreservedFact={handleRemovePreservedFact}
          onPrevious={handlePreviousStep}
          onNext={handleNextStep}
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
          userDefinedRootCause={userDefinedRootCause}
          onUserDefinedRootCauseChange={setUserDefinedRootCause}
          plannedActions={plannedActions}
          onAddPlannedAction={handleAddPlannedAction}
          onUpdatePlannedAction={handleUpdatePlannedAction}
          onRemovePlannedAction={handleRemovePlannedAction}
          availableUsers={sampleAvailableUsers.map(u => ({id: u.id, name: u.name}))}
          onPrevious={handlePreviousStep}
          onNext={handleNextStep}
        />
      )}
      </div>
      <div className={step === 4 ? "" : "print:hidden"}>
      {step === 4 && (
        <Step4Validation
          plannedActions={plannedActions}
          validations={validations}
          onToggleValidation={handleToggleValidation}
          onPrevious={handlePreviousStep}
          onNext={handleNextStep}
        />
      )}
      </div>
      {step === 5 && (
        <Step5Results
          eventId={eventData.id}
          eventData={eventData}
          detailedFacts={detailedFacts}
          analysisDetails={analysisDetails}
          analysisTechnique={analysisTechnique}
          analysisTechniqueNotes={analysisTechniqueNotes}
          ishikawaData={ishikawaData}
          fiveWhysData={fiveWhysData}
          ctmData={ctmData}
          plannedActions={plannedActions}
          finalComments={finalComments}
          onFinalCommentsChange={setFinalComments}
          onPrintReport={handlePrintReport}
          availableUsers={sampleAvailableUsers} 
        />
      )}
    </>
  );
}
        
    

    