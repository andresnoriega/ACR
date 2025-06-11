'use client';
import type { FC, ChangeEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface Step2FactsProps {
  analysisFacts: string;
  onAnalysisFactsChange: (value: string) => void;
  analysisDetails: string;
  onAnalysisDetailsChange: (value: string) => void;
  onPrevious: () => void;
  onNext: () => void;
}

export const Step2Facts: FC<Step2FactsProps> = ({
  analysisFacts,
  onAnalysisFactsChange,
  analysisDetails,
  onAnalysisDetailsChange,
  onPrevious,
  onNext,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Paso 2: Hechos y Análisis Preliminar</CardTitle>
        <CardDescription>Detalle los hechos observados y el análisis inicial realizado.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="analysisFacts">Hechos Observados</Label>
          <Textarea
            id="analysisFacts"
            value={analysisFacts}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onAnalysisFactsChange(e.target.value)}
            placeholder="Liste los hechos concretos y verificables relacionados con el evento..."
            rows={5}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="analysisDetails">Análisis Realizado (Técnicas Usadas y Hallazgos)</Label>
          <Textarea
            id="analysisDetails"
            value={analysisDetails}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onAnalysisDetailsChange(e.target.value)}
            placeholder="Describa el análisis efectuado, qué técnicas se usaron (ej: entrevistas, revisión de logs, etc.) y los hallazgos preliminares..."
            rows={5}
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={onPrevious} variant="outline" className="transition-transform hover:scale-105">Anterior</Button>
        <Button onClick={onNext} className="transition-transform hover:scale-105">Siguiente</Button>
      </CardFooter>
    </Card>
  );
};
