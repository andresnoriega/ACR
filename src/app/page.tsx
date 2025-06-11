
'use client';
import { useState, useEffect, useCallback } from 'react';
import type { RCAEventData, ImmediateAction, PlannedAction, Validation, AIInsights, AnalysisTechnique } from '@/types/rca';
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

  const [analysisFacts, setAnalysisFacts] = useState('');
  const [analysisDetails, setAnalysisDetails] = useState('');

  const [analysisTechnique, setAnalysisTechnique] = useState<AnalysisTechnique>('');
  const [aiInsights, setAIInsights] = useState<AIInsights | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [plannedActions, setPlannedActions] = useState<PlannedAction[]>([]);
  const [plannedActionCounter, setPlannedActionCounter] = useState(1);


  const [validations, setValidations] = useState<Validation[]>([]);
  const [finalComments, setFinalComments] = useState('');

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
    // Prevent skipping uncompleted steps when navigating directly via StepNavigation
    if (targetStep > step && targetStep > maxCompletedStep + 1) {
      return;
    }

    // Ensure event ID exists if navigating to step 3 or later, where it might be needed
    if (targetStep >= 3 && !eventData.id) {
        ensureEventId();
    }
    setStep(targetStep);
  };

  const handleNextStep = () => {
    ensureEventId(); // Ensure ID is set as we progress
    
    // Current step is now considered completed
    setMaxCompletedStep(prevMax => Math.max(prevMax, step));

    if (step < 5) {
      setStep(prevStep => prevStep + 1); // Go to the next step
    }
  };

  const handlePreviousStep = () => {
    if (step > 1) {
      setStep(prevStep => prevStep - 1); // Go to previous step
    }
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

  // Step 3 Logic
  const handleGenerateAIInsights = async () => {
    if (!eventData.focusEventDescription && !analysisFacts && !analysisDetails) {
      toast({ title: "Información Insuficiente", description: "Por favor, complete la descripción del evento, hechos y análisis para generar ideas.", variant: "destructive" });
      return;
    }
    setIsGeneratingInsights(true);
    setAIInsights(null);
    const inputForAI: Parameters<typeof getAIInsightsAction>[0] = {
      facts: `${eventData.focusEventDescription}\n\nHECHOS OBSERVADOS:\n${analysisFacts}`,
      analysis: `${analysisDetails}\n\nTÉCNICA DE ANÁLISIS PRINCIPAL: ${analysisTechnique || 'No especificada'}`,
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
    const currentEventId = ensureEventId(); // Ensure event ID exists
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
      // Filter out validations for actions that no longer exist
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
    // Optional: Hide non-printable elements before printing
    const nonPrintableElements = document.querySelectorAll('.no-print');
    nonPrintableElements.forEach(el => el.classList.add('hidden'));
    
    window.print();

    // Optional: Show non-printable elements again after printing
    nonPrintableElements.forEach(el => el.classList.remove('hidden'));
  };

  // Initialize maxCompletedStep based on the initial step
  useEffect(() => {
    if (step > maxCompletedStep) {
      setMaxCompletedStep(step -1); // Current step is not yet "completed"
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Runs only once on mount


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
      
      {/* Content for each step */}
      {/* This div is for print styling to make sure the current step is what's printed */}
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
          analysisFacts={analysisFacts}
          onAnalysisFactsChange={setAnalysisFacts}
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
          analysisTechnique={analysisTechnique}
          onAnalysisTechniqueChange={setAnalysisTechnique}
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
       {/* Step 5 is always printable if it's the current step */}
      {step === 5 && (
        <Step5Results
          eventId={eventData.id}
          validations={validations}
          finalComments={finalComments}
          onFinalCommentsChange={setFinalComments}
          onPrintReport={handlePrintReport}
          onPrevious={handlePreviousStep}
        />
      )}
    </div>
  );
}

