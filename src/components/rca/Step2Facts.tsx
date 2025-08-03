'use client';

import type { FC, ChangeEvent } from 'react';
import { useState, useEffect, useMemo } from 'react';
import type { DetailedFacts, FullUserProfile, Site, InvestigationSession } from '@/types/rca';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCircle, Save, Loader2, Target, ClipboardList, Sparkles } from 'lucide-react';
import { format, parseISO, isValid as isValidDate } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { paraphrasePhenomenon, type ParaphrasePhenomenonInput } from '@/ai/flows/paraphrase-phenomenon';
import { InvestigationTeamManager } from './InvestigationTeamManager';

// ------ COMPONENTE PRINCIPAL ------
export const Step2Facts: FC<{
  detailedFacts: DetailedFacts;
  onDetailedFactChange: (field: keyof DetailedFacts, value: string) => void;
  projectLeader: string;
  onProjectLeaderChange: (value: string) => void;
  investigationObjective: string;
  onInvestigationObjectiveChange: (value: string) => void;
  investigationSessions: InvestigationSession[];
  onSetInvestigationSessions: (sessions: InvestigationSession[]) => void;
  analysisDetails: string;
  onAnalysisDetailsChange: (value: string) => void;
  availableUsers: FullUserProfile[];
  availableSites: Site[];
  isSaving: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSaveAnalysis: () => Promise<void>;
  analysisId: string | null;
}> = ({
  detailedFacts,
  onDetailedFactChange,
  projectLeader,
  onProjectLeaderChange,
  investigationObjective,
  onInvestigationObjectiveChange,
  investigationSessions,
  onSetInvestigationSessions,
  analysisDetails,
  onAnalysisDetailsChange,
  availableUsers,
  availableSites,
  isSaving,
  onPrevious,
  onNext,
  onSaveAnalysis,
  analysisId,
}) => {
  const { toast } = useToast();
  const [clientSideMaxDateTime, setClientSideMaxDateTime] = useState<string | undefined>(undefined);
  const [isParaphrasing, setIsParaphrasing] = useState(false);
  const { userProfile } = useAuth();
  

  const usersForDropdown = useMemo(() => {
    if (userProfile?.role === 'Super User') {
      return availableUsers;
    }
    return availableUsers;
  }, [availableUsers, userProfile]);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setClientSideMaxDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: keyof DetailedFacts) => {
    onDetailedFactChange(field, e.target.value);
  };
  
  const formatDateTimeLocalForDisplay = (dateTimeLocalString: string): string => {
    if (!dateTimeLocalString) return 'CUÁNDO (no especificado)';
    try {
      const date = parseISO(dateTimeLocalString);
      if (isValidDate(date)) {
        return format(date, "dd-MM-yyyy 'a las' HH:mm", { locale: es });
      }
    } catch (e) { /* ignore error, return original or placeholder */ }
    return dateTimeLocalString; // Fallback
  };
  
  const constructedPhenomenonDescription = useMemo(() => {
    return `La desviación ocurrió de la siguiente manera: "${detailedFacts.como || 'CÓMO (no especificado)'}".
El evento identificado fue: "${detailedFacts.que || 'QUÉ (no especificado)'}".
Esto tuvo lugar en: "${detailedFacts.donde || 'DÓNDE (no especificado)'}".
Sucedió el: "${formatDateTimeLocalForDisplay(detailedFacts.cuando)}".
El impacto o tendencia fue: "${detailedFacts.cualCuanto || 'CUÁL/CUÁNTO (no especificado)'}".
Las personas o equipos implicados fueron: "${detailedFacts.quien || 'QUIÉN (no especificado)'}".`;
  }, [detailedFacts]);

  useEffect(() => {
    if (!analysisDetails || analysisDetails.startsWith("La desviación ocurrió de la siguiente manera:")) {
        onAnalysisDetailsChange(constructedPhenomenonDescription);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [constructedPhenomenonDescription]);

  const validateFieldsForNext = (): boolean => {
    const missingFields = [];
    if (!detailedFacts.como.trim()) missingFields.push("Hechos Detallados: CÓMO");
    if (!detailedFacts.que.trim()) missingFields.push("Hechos Detallados: QUÉ");
    if (!detailedFacts.donde.trim()) missingFields.push("Hechos Detallados: DÓNDE");
    if (!detailedFacts.cuando.trim()) missingFields.push("Hechos Detallados: CUÁNDO");
    if (!detailedFacts.cualCuanto.trim()) missingFields.push("Hechos Detallados: CUÁL/CUÁNTO");
    if (!detailedFacts.quien.trim()) missingFields.push("Hechos Detallados: QUIÉN");
    
    if (missingFields.length > 0) {
      toast({
        title: "Campos Obligatorios Faltantes",
        description: `Por favor, complete los siguientes campos del Paso 2: ${missingFields.join(', ')}.`,
        variant: "destructive",
        duration: 7000,
      });
      return false;
    }
    return true;
  };


  const handleNextWithSave = async () => {
    if (!validateFieldsForNext()) return;
    onNext();
  };

  const handleParaphrasePhenomenon = async () => {
    setIsParaphrasing(true);
    try {
      const input: ParaphrasePhenomenonInput = {
        quien: detailedFacts.quien || undefined,
        que: detailedFacts.que || undefined,
        donde: detailedFacts.donde || undefined,
        cuando: detailedFacts.cuando || undefined,
        cualCuanto: detailedFacts.cualCuanto || undefined,
        como: detailedFacts.como || undefined,
      };

      const result = await paraphrasePhenomenon(input);

      if (result && result.paraphrasedText) {
        onAnalysisDetailsChange(result.paraphrasedText);
        toast({ title: "Asistente IA", description: "La descripción del fenómeno ha sido actualizada con la versión parafraseada." });
      } else {
        toast({ title: "Error de IA", description: "No se pudo obtener una respuesta de la IA.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error paraphrasing phenomenon:", error);
      toast({ title: "Error de IA", description: `Ocurrió un error al contactar la IA: ${(error as Error).message}`, variant: "destructive" });
    } finally {
      setIsParaphrasing(false);
    }
  };

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Paso 2: Hechos y Análisis Preliminar</CardTitle>
        <CardDescription>Recopile y documente todos los hechos relevantes sobre el evento.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
            <Card className="shadow-inner">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center">
                        <UserCircle className="mr-2 h-5 w-5 text-primary" />
                        Líder del Proyecto
                    </CardTitle>
                </CardHeader>
                <CardContent>
                      <Select value={projectLeader} onValueChange={onProjectLeaderChange}>
                        <SelectTrigger id="projectLeader">
                        <SelectValue placeholder="-- Seleccione un líder --" />
                        </SelectTrigger>
                        <SelectContent>
                        {usersForDropdown.length > 0 ? (
                            usersForDropdown.map(user => (
                            <SelectItem key={user.id} value={user.name}>{user.name} ({user.role})</SelectItem>
                            ))
                        ) : (
                            <SelectItem value="" disabled>No hay líderes disponibles para esta empresa</SelectItem>
                        )}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            <Card className="shadow-inner">
                <CardContent className="pt-6">
                    <InvestigationTeamManager
                        sessions={investigationSessions}
                        onSetSessions={onSetInvestigationSessions}
                        availableUsers={availableUsers}
                        availableSites={availableSites}
                        isSaving={isSaving}
                    />
                </CardContent>
            </Card>

            <Card className="shadow-inner">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center">
                        <ClipboardList className="mr-2 h-5 w-5 text-primary"/>
                        Hechos Detallados
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="como">CÓMO (ocurrió la desviación) <span className="text-destructive">*</span></Label>
                    <Input id="como" value={detailedFacts.como} onChange={(e) => handleInputChange(e, 'como')} placeholder="Ej: Durante operación normal" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="que">QUÉ (ocurrió) <span className="text-destructive">*</span></Label>
                    <Textarea id="que" value={detailedFacts.que} onChange={(e) => handleInputChange(e, 'que')} placeholder="Ej: Trip por alta Temperatura Descanso 1" rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="donde">DÓNDE (ocurrió) <span className="text-destructive">*</span></Label>
                    <Input id="donde" value={detailedFacts.donde} onChange={(e) => handleInputChange(e, 'donde')} placeholder="Ej: Planta Teno, Sistema Calcinación, Horno" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cuando-input">CUÁNDO (Fecha y Hora) <span className="text-destructive">*</span></Label>
                    <Input 
                        id="cuando-input" 
                        type="datetime-local"
                        value={detailedFacts.cuando} 
                        onChange={(e) => handleInputChange(e, 'cuando')}
                        max={clientSideMaxDateTime}
                        className="flex-grow"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cualCuanto">CUÁL/CUÁNTO (tendencia e impacto) <span className="text-destructive">*</span></Label>
                    <Input id="cualCuanto" value={detailedFacts.cualCuanto} onChange={(e) => handleInputChange(e, 'cualCuanto')} placeholder="Ej: Evento único / 2 Días de detención" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quien">QUIÉN <span className="text-destructive">*</span></Label>
                    <Input id="quien" value={detailedFacts.quien} onChange={(e) => handleInputChange(e, 'quien')} placeholder="Personas o equipos implicados (Ej: N/A, Operador Turno A)" />
                  </div>
                </CardContent>
            </Card>

            <Card className="shadow-inner">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg font-semibold">DESCRIPCIÓN DEL FENÓMENO</CardTitle>
                        <Button variant="outline" size="sm" onClick={handleParaphrasePhenomenon} disabled={isParaphrasing || isSaving}>
                          {isParaphrasing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                          Parafrasear con IA
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Textarea
                      id="analysisDetails"
                      value={analysisDetails}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onAnalysisDetailsChange(e.target.value)}
                      placeholder="La descripción del fenómeno aparecerá aquí. Puede editarla manualmente o usar la IA."
                      rows={4}
                      className="bg-background"
                    />
                </CardContent>
            </Card>

              <Card className="shadow-inner">
                <CardHeader>
                      <CardTitle className="text-lg font-semibold flex items-center">
                      <Target className="mr-2 h-4 w-4 text-primary" />
                      Objetivo de la Investigación
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Textarea
                      id="investigationObjective"
                      value={investigationObjective}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onInvestigationObjectiveChange(e.target.value)}
                      placeholder="Defina el alcance y el objetivo principal de este análisis de causa raíz..."
                      rows={3}
                    />
                </CardContent>
            </Card>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t">
        <Button onClick={onPrevious} variant="outline" className="w-full sm:w-auto mb-2 sm:mb-0 transition-transform hover:scale-105" disabled={isSaving}>Anterior</Button>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto sm:space-x-2">
            <Button onClick={onSaveAnalysis} variant="secondary" className="w-full sm:w-auto transition-transform hover:scale-105" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" /> Guardar Avance
            </Button>
            <Button onClick={handleNextWithSave} className="w-full sm:w-auto transition-transform hover:scale-105" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Siguiente
            </Button>
        </div>
      </CardFooter>
    </Card>
    </>
  );
};
