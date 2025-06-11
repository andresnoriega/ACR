
'use client';
import { useState, useEffect, useCallback } from 'react';
import type { RCAEventData, ImmediateAction, PlannedAction, Validation, AIInsights, AnalysisTechnique, IshikawaData, FiveWhysData, FiveWhyEntry, CTMData, FailureMode, Hypothesis, PhysicalCause, HumanCause, LatentCause, DetailedFacts } from '@/types/rca';
import { StepNavigation } from '@/components/rca/StepNavigation';
import { Step1Initiation } from '@/components/rca/Step1Initiation';
import { Step2Facts } from '@/components/rca/Step2Facts';
import { Step3Analysis } from '@/components/rca/Step3Analysis';
import { Step4Validation } from '@/components/rca/Step4Validation';
import { Step5Results } from '@/components/rca/Step5Results';
import { getAIInsightsAction } from '@/app/actions';
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

export default function RCAHomePage() {
  const [step, setStep] = useState(1);
  const [maxCompletedStep, setMaxCompletedStep] = useState(0);
  const { toast } = useToast();

  // State for RCA data
  const [eventData, setEventData] = useState<RCAEventData>({
    id: '',
    place: '',
    date: '',
    focusEventDescription: '',
  });
  const [eventCounter, setEventCounter] = useState(1); // For generating unique event IDs
  const [immediateActions, setImmediateActions] = useState<ImmediateAction[]>([]);
  const [immediateActionCounter, setImmediateActionCounter] = useState(1);

  // Step 2 State
  const [detailedFacts, setDetailedFacts] = useState<DetailedFacts>(initialDetailedFacts);
  const [analysisDetails, setAnalysisDetails] = useState(''); // This remains for 'Análisis Realizado'

  // Step 3 State
  const [analysisTechnique, setAnalysisTechnique] = useState<AnalysisTechnique>('');
  const [analysisTechniqueNotes, setAnalysisTechniqueNotes] = useState('');
  const [ishikawaData, setIshikawaData] = useState<IshikawaData>(JSON.parse(JSON.stringify(initialIshikawaData)));
  const [fiveWhysData, setFiveWhysData] = useState<FiveWhysData>(JSON.parse(JSON.stringify(initialFiveWhysData)));
  const [ctmData, setCtmData] = useState<CTMData>(JSON.parse(JSON.stringify(initialCTMData)));
  const [userDefinedRootCause, setUserDefinedRootCause] = useState('');
  
  const [aiInsights, setAIInsights] = useState<AIInsights | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [plannedActions, setPlannedActions] = useState<PlannedAction[]>([]);
  const [plannedActionCounter, setPlannedActionCounter] = useState(1);

  // Step 4 State
  const [validations, setValidations] = useState<Validation[]>([]);
  // Step 5 State
  const [finalComments, setFinalComments] = useState(''); // This will be used as "Introducción" in Step 5

  const ensureEventId = useCallback(() => {
    if (!eventData.id) {
      const newEventID = `E-${String(eventCounter).padStart(5, '0')}`;
      setEventData(prev => ({ ...prev, id: newEventID }));
      setEventCounter(prev => prev + 1);
      return newEventID;
    }
    return eventData.id;
  }, [eventData.id, eventCounter]);


  const handleGoToStep = (targetStep: number) => {
    if (targetStep > step && targetStep > maxCompletedStep + 1 && targetStep !== 1) {
      return;
    }
    if (targetStep >=1 && !eventData.id && targetStep > 1 ) { 
        ensureEventId();
    }
    if (targetStep >=3 && !eventData.id ) { // Ensure ID if jumping to step 3 or later
      ensureEventId();
    }
    setStep(targetStep);
    if (targetStep > maxCompletedStep && targetStep > step ) { // Only update if moving forward to uncompleted step
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
  
  // Step 1 Logic
  const handleEventDataChange = (field: keyof RCAEventData, value: string) => {
    setEventData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddImmediateAction = () => {
    const newActionId = `IMA-${String(immediateActionCounter).padStart(3, '0')}`;
    setImmediateActions(prev => [...prev, { id: newActionId, description: '', responsible: '', dueDate: '' }]);
    setImmediateActionCounter(prev => prev + 1);
  };

  const handleUpdateImmediateAction = (index: number, field: keyof ImmediateAction, value: string) => {
    setImmediateActions(prev => prev.map((act, i) => i === index ? { ...act, [field]: value } : act));
  };
  
  const handleRemoveImmediateAction = (index: number) => {
    setImmediateActions(prev => prev.filter((_, i) => i !== index));
  };

  // Step 2 Logic
  const handleDetailedFactChange = (field: keyof DetailedFacts, value: string) => {
    setDetailedFacts(prev => ({ ...prev, [field]: value }));
  };

  // Step 3 Logic
  const handleAnalysisTechniqueChange = (value: AnalysisTechnique) => {
    setAnalysisTechnique(value);
    // Reset notes and specific technique data when technique changes
    setAnalysisTechniqueNotes(''); 
    if (value === 'Ishikawa') {
      setIshikawaData(JSON.parse(JSON.stringify(initialIshikawaData))); 
    } else if (value === 'WhyWhy') {
      setFiveWhysData(JSON.parse(JSON.stringify(initialFiveWhysData)));
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

  const handleGenerateAIInsights = async () => {
    const constructedDetailedFactsString = `Un evento, identificado como "${detailedFacts.que || 'QUÉ (no especificado)'}", tuvo lugar en "${detailedFacts.donde || 'DÓNDE (no especificado)'}" el "${detailedFacts.cuando || 'CUÁNDO (no especificado)'}". La desviación ocurrió de la siguiente manera: "${detailedFacts.como || 'CÓMO (no especificado)'}". El impacto o tendencia fue: "${detailedFacts.cualCuanto || 'CUÁL/CUÁNTO (no especificado)'}". Las personas o equipos implicados fueron: "${detailedFacts.quien || 'QUIÉN (no especificado)'}".`;

    if (!eventData.focusEventDescription && !constructedDetailedFactsString && !analysisDetails && !userDefinedRootCause) {
      toast({ title: "Información Insuficiente", description: "Por favor, complete la descripción del evento, hechos, análisis o causa raíz definida para generar ideas.", variant: "destructive" });
      return;
    }
    setIsGeneratingInsights(true);
    setAIInsights(null);
    
    let analysisPayload = `${analysisDetails || 'Análisis preliminar no detallado.'}\n\nTÉCNICA DE ANÁLISIS PRINCIPAL: ${analysisTechnique || 'No especificada'}`;
    
    if (analysisTechnique === 'Ishikawa') {
      let ishikawaContent = "\n\nDETALLES DEL DIAGRAMA DE ISHIKAWA (6M):\n";
      ishikawaData.forEach(category => {
        ishikawaContent += `\nCategoría: ${category.name}\n`;
        if (category.causes.length > 0) {
          category.causes.forEach((cause, index) => {
            if (cause.description.trim()) {
              ishikawaContent += `  - Causa ${index + 1}: ${cause.description.trim()}\n`;
            }
          });
        } else {
          ishikawaContent += "  (Sin causas identificadas para esta categoría)\n";
        }
      });
      analysisPayload += ishikawaContent;
    } else if (analysisTechnique === 'WhyWhy') {
      let fiveWhysContent = "\n\nDETALLES DEL ANÁLISIS DE LOS 5 PORQUÉS:\n";
      fiveWhysData.forEach((entry, index) => {
        if (entry.why.trim() || entry.because.trim()) {
           fiveWhysContent += `\nNivel ${index + 1}:\n  Por qué?: ${entry.why.trim() || '(No especificado)'}\n  Porque: ${entry.because.trim() || '(No especificado)'}\n`;
        }
      });
      analysisPayload += fiveWhysContent;
    } else if (analysisTechnique === 'CTM') {
      let ctmContent = "\n\nDETALLES DEL ÁRBOL DE CAUSAS (CTM):\n";
      const formatCTMLevel = (items: any[], prefix = "", levelName: string): string => {
        let content = "";
        items.forEach((item, index) => {
          if (item.description.trim()) {
            content += `${prefix}- ${levelName} ${index + 1}: ${item.description.trim()}\n`;
            if (item.hypotheses && item.hypotheses.length > 0) {
              content += formatCTMLevel(item.hypotheses, prefix + "  ", "Hipótesis");
            } else if (item.physicalCauses && item.physicalCauses.length > 0) {
              content += formatCTMLevel(item.physicalCauses, prefix + "  ", "Causa Física");
            } else if (item.humanCauses && item.humanCauses.length > 0) {
              content += formatCTMLevel(item.humanCauses, prefix + "  ", "Causa Humana");
            } else if (item.latentCauses && item.latentCauses.length > 0) {
              content += formatCTMLevel(item.latentCauses, prefix + "  ", "Causa Latente");
            }
          }
        });
        return content;
      };
      ctmContent += formatCTMLevel(ctmData, "", "Modo de Falla");
      analysisPayload += (ctmContent.trim().endsWith("(CTM):") ? '(No se definieron elementos para el Árbol de Causas)' : ctmContent);
    }
    
    // Include generic notes if analysisTechniqueNotes has content, regardless of specific technique
    if (analysisTechniqueNotes.trim()) {
      analysisPayload += `\n\nNOTAS ADICIONALES DEL ANÁLISIS (${analysisTechnique || 'General'}):\n${analysisTechniqueNotes}`;
    }


    const factsForAI = `${eventData.focusEventDescription || 'Evento no descrito.'}\n\nDESCRIPCIÓN DEL FENÓMENO (Hechos Observados):\n${constructedDetailedFactsString || 'Hechos no detallados.'}`;
    
    const inputForAI: Parameters<typeof getAIInsightsAction>[0] = {
      facts: factsForAI,
      analysis: analysisPayload,
      userDefinedRootCause: userDefinedRootCause || undefined,
    };

    const result = await getAIInsightsAction(inputForAI);
    if ('error' in result) {
      toast({ title: "Error de IA", description: result.error, variant: "destructive" });
    } else {
      setAIInsights(result);
      toast({ title: "Ideas Generadas", description: "Se han generado nuevas perspectivas usando IA.", className: "bg-accent text-accent-foreground" });
    }
    setIsGeneratingInsights(false);
  };
  
  const handleAddPlannedAction = () => {
    const currentEventId = ensureEventId(); 
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


  // Step 4 Logic - Update validations whenever planned actions change
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
  
  // Step 5 Logic
  const handlePrintReport = () => {
    const nonPrintableElements = document.querySelectorAll('.no-print');
    nonPrintableElements.forEach(el => el.classList.add('hidden'));
    
    // Ensure the report area is styled for printing
    const reportArea = document.getElementById('printable-report-area');
    if (reportArea) {
      // Temporarily adjust styles for printing if needed
    }

    window.print();

    nonPrintableElements.forEach(el => el.classList.remove('hidden'));
     if (reportArea) {
      // Revert temporary styles if any
    }
  };

  useEffect(() => {
    if (step > maxCompletedStep) {
      setMaxCompletedStep(step -1); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 print-container">
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
            onNext={handleNextStep}
          />
        )}
      </div>
      <div className={step === 2 ? "" : "print:hidden"}>
      {step === 2 && (
        <Step2Facts
          detailedFacts={detailedFacts}
          onDetailedFactChange={handleDetailedFactChange}
          analysisDetails={analysisDetails}
          onAnalysisDetailsChange={setAnalysisDetails}
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
          aiInsights={aiInsights}
          onGenerateAIInsights={handleGenerateAIInsights}
          isGeneratingInsights={isGeneratingInsights}
          plannedActions={plannedActions}
          onAddPlannedAction={handleAddPlannedAction}
          onUpdatePlannedAction={handleUpdatePlannedAction}
          onRemovePlannedAction={handleRemovePlannedAction}
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
          aiInsights={aiInsights}
          plannedActions={plannedActions}
          finalComments={finalComments}
          onFinalCommentsChange={setFinalComments}
          onPrintReport={handlePrintReport}
        />
      )}
    </div>
  );
}
