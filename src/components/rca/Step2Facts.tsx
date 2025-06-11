
'use client';
import type { FC, ChangeEvent } from 'react';
import type { DetailedFacts } from '@/types/rca';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Step2FactsProps {
  detailedFacts: DetailedFacts;
  onDetailedFactChange: (field: keyof DetailedFacts, value: string) => void;
  analysisDetails: string;
  onAnalysisDetailsChange: (value: string) => void;
  onPrevious: () => void;
  onNext: () => void;
}

const problemIdentificationGuidance = "¿QUE ocurrió? / ¿DONDE ocurrió la desviación (máquina, lugar, material)? ¿En qué parte/lugar del producto/proceso estamos viendo el problema? ¿CUANDO ocurrió (en qué momento del proceso, a qué hora)? / ¿QUIEN, el problema está relacionado con las habilidades de las personas? / ¿COMO ¿Cómo se diferencia el problema del estado normal (óptimo)? ¿La tendencia en la que aparece el problema es aleatoria o sigue un patrón? ¿CUAL es la tendencia? ¿CUANTO impacto ha ocasionado la desviación?";

export const Step2Facts: FC<Step2FactsProps> = ({
  detailedFacts,
  onDetailedFactChange,
  analysisDetails,
  onAnalysisDetailsChange,
  onPrevious,
  onNext,
}) => {
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: keyof DetailedFacts) => {
    onDetailedFactChange(field, e.target.value);
  };

  const constructedPhenomenonDescription = `Durante ${detailedFacts.como || '(cómo ocurrió)'} en ${detailedFacts.donde || '(dónde ocurrió)'}, ${detailedFacts.que || '(qué ocurrió)'}, a las ${detailedFacts.cuando || '(cuándo ocurrió)'} ${detailedFacts.cualCuanto || '(cuál/cuánto impacto)'}.`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Paso 2: Hechos y Análisis Preliminar</CardTitle>
        <CardDescription>{problemIdentificationGuidance}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="quien">QUIÉN</Label>
            <Input id="quien" value={detailedFacts.quien} onChange={(e) => handleInputChange(e, 'quien')} placeholder="Personas o equipos implicados (Ej: N/A, Operador Turno A)" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="como">CÓMO (ocurrió la desviación)</Label>
            <Input id="como" value={detailedFacts.como} onChange={(e) => handleInputChange(e, 'como')} placeholder="Ej: Durante operación normal" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="que">QUÉ (ocurrió)</Label>
            <Textarea id="que" value={detailedFacts.que} onChange={(e) => handleInputChange(e, 'que')} placeholder="Ej: Trip por alta Temperatura Descanso 1" rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="donde">DÓNDE (ocurrió)</Label>
            <Input id="donde" value={detailedFacts.donde} onChange={(e) => handleInputChange(e, 'donde')} placeholder="Ej: Planta Teno, Sistema Calcinación, Horno" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cuando">CUÁNDO (ocurrió)</Label>
            <Input id="cuando" value={detailedFacts.cuando} onChange={(e) => handleInputChange(e, 'cuando')} placeholder="Ej: A las 18:13:26 del 28-05-2021" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cualCuanto">CUÁL/CUÁNTO (tendencia e impacto)</Label>
            <Input id="cualCuanto" value={detailedFacts.cualCuanto} onChange={(e) => handleInputChange(e, 'cualCuanto')} placeholder="Ej: Evento único / 2 Días de detención" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="font-semibold">DESCRIPCIÓN DEL FENÓMENO (Auto-generado)</Label>
          <Alert variant="default" className="bg-secondary/30">
            <AlertDescription>
              {detailedFacts.que || detailedFacts.donde || detailedFacts.cuando || detailedFacts.cualCuanto || detailedFacts.como ? constructedPhenomenonDescription : "Complete los campos anteriores para generar la descripción."}
            </AlertDescription>
          </Alert>
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
