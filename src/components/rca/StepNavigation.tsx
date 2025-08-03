'use client';
import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import { ClipboardList, FileText, ListTodo, Lightbulb, CheckSquare, Presentation } from 'lucide-react';

interface StepNavigationProps {
  currentStep: number;
  onNavigate: (step: number) => void;
  maxCompletedStep: number;
  isStep4Valid?: boolean;
}

const steps = [
  { number: 1, label: 'Iniciación', icon: ClipboardList },
  { number: 2, label: 'Hechos', icon: FileText },
  { number: 3, label: 'Análisis', icon: Lightbulb },
  { number: 4, label: 'Validación', icon: CheckSquare },
  { number: 5, label: 'Resultados', icon: Presentation },
];

export const StepNavigation: FC<StepNavigationProps> = ({ currentStep, onNavigate, maxCompletedStep, isStep4Valid }) => {
  
  const isStepButtonDisabled = (stepNumber: number): boolean => {
    // A step is disabled if it's further than the next logical step.
    let disabled = stepNumber > maxCompletedStep + 1 && stepNumber !== 1;
    
    // Specifically for step 4 (Validation), it should be disabled if we are on step 3 (Analysis) and it's not valid to proceed.
    if (stepNumber >= 4 && currentStep === 3 && isStep4Valid !== undefined && !isStep4Valid) {
      disabled = true;
    }
    return disabled;
  };
  
  return (
    <nav className="flex justify-center space-x-2 mb-6 flex-wrap">
       {steps.map((stepInfo) => {
        // Determine the actual component step number. The UI shows 1-5, but logic might be 1-6.
        // Let's adjust what `currentStep` means for the UI.
        let displayStep = currentStep;
        if (currentStep === 3) displayStep = 2.5; // Tareas is like a sub-step of 2
        else if (currentStep > 3) displayStep = currentStep - 1;


        return (
          <Button
            key={stepInfo.number}
            variant={displayStep === stepInfo.number ? 'default' : 'outline'}
            onClick={() => {
                // When clicking, we need to map back to the logical step number
                let targetStep = stepInfo.number;
                if (targetStep >= 3) targetStep = stepInfo.number + 1;
                onNavigate(targetStep);
            }}
            disabled={isStepButtonDisabled(stepInfo.number + (stepInfo.number >= 3 ? 1: 0) )}
            className="flex items-center gap-2 transition-all duration-300 ease-in-out transform hover:scale-105 focus:scale-105 mb-2 sm:mb-0"
        >
            <stepInfo.icon className="h-5 w-5" />
            <span className="hidden sm:inline">Paso {stepInfo.number}:</span> {stepInfo.label}
          </Button>
        );
      })}
    </nav>
  );
};