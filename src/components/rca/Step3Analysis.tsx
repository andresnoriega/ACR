
'use client';
import type { FC, ChangeEvent } from 'react';
import type { PlannedAction, AnalysisTechnique, IshikawaData, FiveWhysData, RCAEventData, CTMData, IdentifiedRootCause } from '@/types/rca';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, Trash2, MessageSquare, ShareTree, Link2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { IshikawaDiagramInteractive } from './IshikawaDiagramInteractive';
import { FiveWhysInteractive } from './FiveWhysInteractive';
import { CTMInteractive } from './CTMInteractive';

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
  ctmData: CTMData;
  onSetCtmData: (data: CTMData) => void;
  identifiedRootCauses: IdentifiedRootCause[];
  onAddIdentifiedRootCause: () => void;
  onUpdateIdentifiedRootCause: (id: string, description: string) => void;
  onRemoveIdentifiedRootCause: (id: string) => void;
  plannedActions: PlannedAction[];
  onAddPlannedAction: () => void;
  onUpdatePlannedAction: (index: number, field: keyof Omit<PlannedAction, 'eventId' | 'id'>, value: string | string[]) => void;
  onRemovePlannedAction: (index: number) => void;
  availableUsers: Array<{ id: string; name: string; email: string; }>; 
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
  ctmData,
  onSetCtmData,
  identifiedRootCauses,
  onAddIdentifiedRootCause,
  onUpdateIdentifiedRootCause,
  onRemoveIdentifiedRootCause,
  plannedActions,
  onAddPlannedAction,
  onUpdatePlannedAction,
  onRemovePlannedAction,
  availableUsers, 
  onPrevious,
  onNext,
}) => {
  const handleActionChange = (index: number, field: keyof Omit<PlannedAction, 'eventId' | 'id'>, value: string) => {
    onUpdatePlannedAction(index, field, value);
  };

  const handleActionResponsibleChange = (index: number, value: string) => {
    onUpdatePlannedAction(index, 'responsible', value);
  };

  const handleToggleRootCauseForAction = (actionIndex: number, rootCauseId: string, checked: boolean) => {
    const action = plannedActions[actionIndex];
    const currentRelatedIds = action.relatedRootCauseIds || [];
    let newRelatedIds: string[];

    if (checked) {
      newRelatedIds = [...currentRelatedIds, rootCauseId];
    } else {
      newRelatedIds = currentRelatedIds.filter(id => id !== rootCauseId);
    }
    onUpdatePlannedAction(actionIndex, 'relatedRootCauseIds', newRelatedIds);
  };

  const getPlaceholderForNotes = () => {
    if (analysisTechnique === '') {
       return "Escriba aquí sus notas detalladas sobre la aplicación de la técnica seleccionada o notas generales si no ha elegido una técnica específica...";
    }
    return `Notas para ${analysisTechnique}`;
  };

  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const minDateForPlannedActions = getTodayDateString();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Paso 3: Análisis y Plan de Acción</CardTitle>
        <CardDescription>Seleccione la técnica de análisis, defina la causa raíz y el plan de acción.</CardDescription>
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

        {analysisTechnique === 'CTM' && (
           <CTMInteractive
            focusEventDescription={eventData.focusEventDescription || "Evento Foco (no definido en Paso 1)"}
            ctmData={ctmData}
            onSetCtmData={onSetCtmData}
          />
        )}
        
        {(analysisTechnique === '' || analysisTechniqueNotes.trim() !== '') && (
          <div className="space-y-2 mt-4">
            <Label htmlFor="analysisTechniqueNotes">
              Notas Adicionales del Análisis ({analysisTechnique || 'General'}):
            </Label>
            <Textarea
              id="analysisTechniqueNotes"
              value={analysisTechniqueNotes}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onAnalysisTechniqueNotesChange(e.target.value)}
              placeholder={getPlaceholderForNotes()}
              rows={analysisTechnique === '' ? 10 : 4}
            />
          </div>
        )}
        
        <div className="space-y-4">
          <h3 className="text-lg font-semibold font-headline flex items-center">
            <MessageSquare className="mr-2 h-5 w-5 text-primary" />
            Causas Raíz Identificadas
          </h3>
          {identifiedRootCauses.map((rc, index) => (
            <Card key={rc.id} className="p-4 space-y-3 bg-secondary/40">
              <div className="flex justify-between items-center">
                <Label htmlFor={`rc-desc-${rc.id}`} className="font-medium text-sm text-primary">
                  Causa Raíz #{index + 1}
                </Label>
                <Button variant="ghost" size="icon" onClick={() => onRemoveIdentifiedRootCause(rc.id)} aria-label="Eliminar causa raíz">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <Textarea
                id={`rc-desc-${rc.id}`}
                value={rc.description}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onUpdateIdentifiedRootCause(rc.id, e.target.value)}
                placeholder={`Describa la causa raíz #${index + 1}...`}
                rows={3}
              />
            </Card>
          ))}
          <Button onClick={onAddIdentifiedRootCause} variant="outline" className="w-full">
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Causa Raíz
          </Button>
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
              
              <div className="space-y-2">
                <Label className="flex items-center"><Link2 className="mr-2 h-4 w-4" />Causas Raíz Abordadas</Label>
                <div className="space-y-1.5 max-h-32 overflow-y-auto p-2 border rounded-md bg-background/50">
                  {identifiedRootCauses.length > 0 ? (
                    identifiedRootCauses.map(rc => (
                      <div key={rc.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`pa-${action.id}-rc-${rc.id}`}
                          checked={action.relatedRootCauseIds?.includes(rc.id)}
                          onCheckedChange={(checked) => {
                            handleToggleRootCauseForAction(index, rc.id, checked as boolean);
                          }}
                        />
                        <Label htmlFor={`pa-${action.id}-rc-${rc.id}`} className="text-xs font-normal cursor-pointer flex-grow">
                          {rc.description.substring(0, 60) || `Causa Raíz (ID: ${rc.id.substring(0,5)}... )`}
                          {rc.description.length > 60 ? "..." : ""}
                        </Label>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No hay causas raíz identificadas para vincular.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`pa-resp-${index}`}>Responsable</Label>
                  <Select value={action.responsible} onValueChange={(value) => handleActionResponsibleChange(index, value)}>
                    <SelectTrigger id={`pa-resp-${index}`}>
                      <SelectValue placeholder="-- Seleccione un responsable --" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map(user => (
                        <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                   <p className="text-xs text-muted-foreground">
                    Nota: Lista de usuarios de ejemplo.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`pa-date-${index}`}>Fecha Límite</Label>
                  <Input 
                    id={`pa-date-${index}`} 
                    type="date" 
                    value={action.dueDate} 
                    onChange={(e) => handleActionChange(index, 'dueDate', e.target.value)}
                    min={minDateForPlannedActions}
                  />
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
        <Button onClick={onNext} className="transition-transform hover:scale-105">Guardar y Continuar</Button>
      </CardFooter>
    </Card>
  );
};

