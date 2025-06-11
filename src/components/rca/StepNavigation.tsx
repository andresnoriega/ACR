'use client';
import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import { ClipboardList, FileText, Lightbulb, CheckSquare, Presentation } from 'lucide-react';

interface StepNavigationProps {
  currentStep: number;
  onNavigate: (step: number) => void;
  maxCompletedStep: number;
}

const steps = [
  { number: 1, label: 'Iniciación', icon: ClipboardList },
  { number: 2, label: 'Hechos', icon: FileText },
  { number: 3, label: 'Análisis', icon: Lightbulb },
  { number: 4, label: 'Validación', icon: CheckSquare },
  { number: 5, label: 'Resultados', icon: Presentation },
];

export const StepNavigation: FC<StepNavigationProps> = ({ currentStep, onNavigate, maxCompletedStep }) => {
  return (
    <nav className="flex justify-center space-x-2 mb-6 flex-wrap">
      {steps.map((stepInfo) => (
        <Button
          key={stepInfo.number}
          variant={currentStep === stepInfo.number ? 'default' : 'outline'}
          onClick={() => onNavigate(stepInfo.number)}
          disabled={stepInfo.number > maxCompletedStep + 1 && stepInfo.number !== 1}
          className="flex items-center gap-2 transition-all duration-300 ease-in-out transform hover:scale-105 focus:scale-105 mb-2 sm:mb-0"
        >
          <stepInfo.icon className="h-5 w-5" />
          <span className="hidden sm:inline">Paso {stepInfo.number}:</span> {stepInfo.label}
        </Button>
      ))}
    </nav>
  );
};
