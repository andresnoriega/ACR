
'use client';
import type { FC, ChangeEvent } from 'react';
import type { PlannedAction, AIInsights, AnalysisTechnique, IshikawaData, FiveWhysData, RCAEventData } from '@/types/rca';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Sparkles, Trash2, Loader2, Brain } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from '@/components/ui/textarea';
import { IshikawaDiagramInteractive } from './IshikawaDiagramInteractive';
import { FiveWhysInteractive } from './FiveWhysInteractive';

interface Step3AnalysisProps {
  eventData: RCAEventData;
  analysisTechnique: AnalysisTechnique;
  onAnalysisTechniqueChange: (value: AnalysisTechnique) => void;
  analysisTechniqueNotes: string;
  onAnalysisTechniqueNotesChange: (value: string) => void;
  ishikawaData: IshikawaData;
  onSetIshikawaData: (data: IshikawaData) => void;
  fiveWhysData: FiveWhysData;
  onAddFiveWhyEntry: () => void;
  onUpdateFiveWhyEntry: (id: string, field: 'why' | 'because', value: string) => void;
  onRemoveFiveWhyEntry: (id: string) => void;
  aiInsights: AIInsights | null;
  onGenerateAIInsights: () => void;
  isGeneratingInsights: boolean;
  plannedActions: PlannedAction[];
  onAddPlannedAction: () => void;
  onUpdatePlannedAction: (index: number, field: keyof PlannedAction, value: string) => void;
  onRemovePlannedAction: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
}

export const Step3Analysis: FC<Step3AnalysisProps> = ({
  eventData,
  analysisTechnique,
  onAnalysisTechniqueChange,
  analysisTechniqueNotes,
  onAnalysisTechniqueNotesChange,
  ishikawaData,
  onSetIshikawaData,
  fiveWhysData,
  onAddFiveWhyEntry,
  onUpdateFiveWhyEntry,
  onRemoveFiveWhyEntry,
  aiInsights,
  onGenerateAIInsights,
  isGeneratingInsights,
  plannedActions,
  onAddPlannedAction,
  onUpdatePlannedAction,
  onRemovePlannedAction,
  onPrevious,
  onNext,
}) => {
  const handleActionChange = (index: number, field: keyof PlannedAction, value: string) => {
    onUpdatePlannedAction(index, field, value);
  };

  const getPlaceholderForNotes = () => {
    if (analysisTechnique === 'CTM') {
      return `Ejemplo de estructura para Árbol de Causas:\n\nEvento Foco: ${eventData.focusEventDescription || '(Defina el evento foco en Paso 1)'}\n\n- Causa Nivel 1 (Ej: Modo de Falla 1)\n  - Causa Nivel 2 (Ej: Hipótesis 1)\n    - Causa Nivel 3 (Ej: Desbalanceo)\n      - Causa Nivel 4 (Ej: No hay Procedimiento)\n  - Causa Nivel 2 (Ej: Fatiga)\n    - Causa Nivel 3 (Ej: Desalineamiento)\n      - Causa Nivel 4 (Ej: Mal montaje)\n        - Causa Nivel 5 (Ej: Mal Entrenamiento)\n        - Causa Nivel 5 (Ej: Malas Herramientas)\n\n- Causa Nivel 1 (Ej: Rotura de Rodamiento)\n  - ... (continúa la estructura)\n\nUtilice guiones (-) e indentación para definir la jerarquía.\nLa IA utilizará esta estructura para entender las relaciones causales.`;
    }
    return "Escriba aquí sus notas detalladas sobre la aplicación de la técnica seleccionada o notas generales si no ha elegido una técnica específica...";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Paso 3: Análisis y Plan de Acción</CardTitle>
        <CardDescription>Seleccione la técnica de análisis, genere ideas con IA y defina el plan de acción.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="analysisTechnique">Técnica de Análisis Principal</Label>
          <Select value={analysisTechnique} onValueChange={(value: AnalysisTechnique) => onAnalysisTechniqueChange(value)}>
            <SelectTrigger id="analysisTechnique">
              <SelectValue placeholder="-- Seleccione una técnica --" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WhyWhy">5 Porqués</SelectItem>
              <SelectItem value="Ishikawa">Ishikawa (Diagrama de Causa-Efecto)</SelectItem>
              <SelectItem value="CTM">Árbol de Causas (CTM)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {analysisTechnique === 'Ishikawa' && (
          <IshikawaDiagramInteractive
            focusEventDescription={eventData.focusEventDescription || "Evento Foco (no definido en Paso 1)"}
            ishikawaData={ishikawaData}
            onSetIshikawaData={onSetIshikawaData}
          />
        )}

        {analysisTechnique === 'WhyWhy' && (
          <FiveWhysInteractive
            focusEventDescription={eventData.focusEventDescription || "Evento Foco (no definido en Paso 1)"}
            fiveWhysData={fiveWhysData}
            onAddFiveWhyEntry={onAddFiveWhyEntry}
            onUpdateFiveWhyEntry={onUpdateFiveWhyEntry}
            onRemoveFiveWhyEntry={onRemoveFiveWhyEntry}
          />
        )}

        {(analysisTechnique === 'CTM' || analysisTechnique === '') && (
          <div className="space-y-2 mt-4">
            <Label htmlFor="analysisTechniqueNotes">
              {analysisTechnique === 'CTM' ? 'Desarrollo del Árbol de Causas (CTM):' : 'Notas Generales de Análisis:'}
            </Label>
            <Textarea
              id="analysisTechniqueNotes"
              value={analysisTechniqueNotes}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onAnalysisTechniqueNotesChange(e.target.value)}
              placeholder={getPlaceholderForNotes()}
              rows={10}
            />
          </div>
        )}
        
        <div className="space-y-4">
          <h3 className="text-lg font-semibold font-headline flex items-center"><Brain className="mr-2 h-5 w-5 text-primary" />Asistente IA para RCA</h3>
          <Button onClick={onGenerateAIInsights} disabled={isGeneratingInsights} className="w-full sm:w-auto">
            {isGeneratingInsights ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generar Ideas con IA
          </Button>
          {aiInsights && (
            <Alert variant="default" className="mt-4 bg-accent/20 border-accent">
              <Sparkles className="h-5 w-5 text-accent" />
              <AlertTitle className="font-headline text-accent">Perspectivas Generadas por IA</AlertTitle>
              <AlertDescription className="space-y-3">
                <div>
                  <h4 className="font-semibold">Resumen del Evento:</h4>
                  <p className="text-sm">{aiInsights.summary}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Posibles Causas Raíz:</h4>
                  <p className="text-sm whitespace-pre-line">{aiInsights.potentialRootCauses}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Recomendaciones Sugeridas:</h4>
                  <p className="text-sm whitespace-pre-line">{aiInsights.recommendations}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold font-headline">Plan de Acción Correctiva</h3>
          {plannedActions.map((action, index) => (
            <Card key={action.id} className="p-4 space-y-3 bg-secondary/50">
               <div className="flex justify-between items-center">
                <p className="font-medium text-sm text-primary">Acción Planificada #{index + 1} (ID: {action.id})</p>
                 <Button variant="ghost" size="icon" onClick={() => onRemovePlannedAction(index)} aria-label="Eliminar acción planificada">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`pa-desc-${index}`}>Descripción de la Acción</Label>
                <Input id={`pa-desc-${index}`} value={action.description} onChange={(e) => handleActionChange(index, 'description', e.target.value)} placeholder="Detalle de la acción correctiva" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`pa-resp-${index}`}>Responsable</Label>
                  <Input id={`pa-resp-${index}`} value={action.responsible} onChange={(e) => handleActionChange(index, 'responsible', e.target.value)} placeholder="Nombre del responsable" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`pa-date-${index}`}>Fecha Límite</Label>
                  <Input id={`pa-date-${index}`} type="date" value={action.dueDate} onChange={(e) => handleActionChange(index, 'dueDate', e.target.value)} />
                </div>
              </div>
            </Card>
          ))}
          <Button onClick={onAddPlannedAction} variant="outline">
            <PlusCircle className="mr-2 h-4 w-4" /> Agregar Acción al Plan
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={onPrevious} variant="outline" className="transition-transform hover:scale-105">Anterior</Button>
        <Button onClick={onNext} className="transition-transform hover:scale-105">Siguiente</Button>
      </CardFooter>
    </Card>
  );
};

