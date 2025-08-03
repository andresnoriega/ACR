'use client';
import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import { ClipboardList, FileText, ListTodo, Lightbulb, CheckSquare, Presentation } from 'lucide-react';
import { cn } from '@/lib/utils';


interface StepNavigationProps {
  currentStep: number;
  onNavigate: (step: number) => void;
  maxCompletedStep: number;
  isStep4Valid?: boolean;
}

const steps = [
  { number: 1, label: 'Iniciación', icon: ClipboardList },
  { number: 2, label: 'Hechos', icon: FileText },
  { number: 3, label: 'Tareas', icon: ListTodo },
  { number: 4, label: 'Análisis', icon: Lightbulb },
  { number: 5, label: 'Validación', icon: CheckSquare },
  { number: 6, label: 'Resultados', icon: Presentation },
];

export const StepNavigation: FC<StepNavigationProps> = ({ currentStep, onNavigate, maxCompletedStep, isStep4Valid }) => {
  
  const isStepButtonDisabled = (stepNumber: number): boolean => {
    if (stepNumber > maxCompletedStep + 1 && stepNumber !== 1) {
      return true;
    }
    
    // Specifically for step 5 (Validation), it should be disabled if we are on step 4 (Analysis) and it's not valid to proceed.
    if (stepNumber >= 5 && currentStep === 4 && isStep4Valid !== undefined && !isStep4Valid) {
      return true;
    }
    return false;
  };
  
  return (
    <nav className="flex justify-center space-x-2 mb-6 flex-wrap">
       {steps.map((stepInfo) => {
        return (
          <Button
            key={stepInfo.number}
            variant={currentStep === stepInfo.number ? 'default' : 'outline'}
            onClick={() => onNavigate(stepInfo.number)}
            disabled={isStepButtonDisabled(stepInfo.number)}
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