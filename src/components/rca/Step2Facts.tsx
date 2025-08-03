'use client';

import type { FC, ChangeEvent } from 'react';
import { useState, useEffect, useMemo } from 'react';
import type { DetailedFacts, FullUserProfile, RCAEventData, Site, InvestigationSession, Evidence } from '@/types/rca'; 
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCircle, Save, Loader2, Target, ClipboardList, Sparkles, FileArchive, Trash2, FileText, ImageIcon, Paperclip, Link2, ExternalLink } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { InvestigationTeamManager } from './InvestigationTeamManager';
import { paraphrasePhenomenon, type ParaphrasePhenomenonInput } from '@/ai/flows/paraphrase-phenomenon';

const getEvidenceIconLocal = (tipo?: Evidence['tipo']) => {
  if (!tipo) return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />;
  const safeTipo = tipo?.toLowerCase() || 'other';
  switch (safeTipo) {
    case 'link': return <Link2 className="h-4 w-4 mr-2 flex-shrink-0 text-indigo-600" />;
    case 'pdf': return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-red-600" />;
    case 'jpg': case 'jpeg': case 'png': case 'gif': return <ImageIcon className="h-4 w-4 mr-2 flex-shrink-0 text-blue-600" />;
    case 'doc': case 'docx': return <Paperclip className="h-4 w-4 mr-2 flex-shrink-0 text-sky-700" />;
    default: return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />;
  }
};

// ------ COMPONENTE PRINCIPAL ------
export const Step2Facts: FC<{
  eventData: RCAEventData;
  availableSites: Site[];
  projectLeader: string;
  onProjectLeaderChange: (value: string) => void;
  availableUsers: FullUserProfile[];
  detailedFacts: DetailedFacts;
  onDetailedFactChange: (field: keyof DetailedFacts, value: string) => void;
  investigationObjective: string;
  onInvestigationObjectiveChange: (value: string) => void;
  investigationSessions: InvestigationSession[];
  onSetInvestigationSessions: (sessions: InvestigationSession[]) => void;
  analysisDetails: string;
  onAnalysisDetailsChange: (value: string) => void;
  preservedFacts: Evidence[];
  onRemovePreservedFact: (factId: string) => Promise<void>;
  onSaveAnalysis: (showToast?: boolean, newPreservedFact?: Evidence) => Promise<void>;
  isSaving: boolean;
  onPrevious: () => void;
  onNext: () => void;
}> = ({
  eventData,
  availableSites,
  projectLeader,
  onProjectLeaderChange,
  availableUsers,
  detailedFacts,
  onDetailedFactChange,
  investigationObjective,
  onInvestigationObjectiveChange,
  investigationSessions,
  onSetInvestigationSessions,
  analysisDetails,
  onAnalysisDetailsChange,
  preservedFacts,
  onRemovePreservedFact,
  onSaveAnalysis,
  isSaving,
  onPrevious,
  onNext,
}) => {
  const { toast } = useToast();
  const [clientSideMaxDateTime, setClientSideMaxDateTime] = useState<string | undefined>(undefined);
  const { userProfile } = useAuth();
  const [isParaphrasing, setIsParaphrasing] = useState(false);

  // State for the new evidence upload section
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceComment, setEvidenceComment] = useState('');

  const usersForDropdown = useMemo(() => {
    if (userProfile?.role === 'Super User') {
      return availableUsers;
    }
    const siteDetails = availableSites.find(s => s.name === eventData.place);
    const siteCompany = siteDetails?.empresa;

    if (!siteCompany) {
      return availableUsers.filter(u => !u.empresa);
    }
    return availableUsers.filter(u => u.empresa === siteCompany);
  }, [availableUsers, availableSites, eventData.place, userProfile]);

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
      if (isValid(date)) {
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
    if (!projectLeader) missingFields.push("Líder del Proyecto");
    if (!detailedFacts.como.trim()) missingFields.push("CÓMO (ocurrió la desviación)");
    if (!detailedFacts.que.trim()) missingFields.push("QUÉ (ocurrió)");
    if (!detailedFacts.donde.trim()) missingFields.push("DÓNDE (ocurrió)");
    if (!detailedFacts.cuando.trim()) missingFields.push("CUÁNDO (Fecha y Hora)");
    if (!detailedFacts.cualCuanto.trim()) missingFields.push("CUÁL/CUÁNTO (tendencia e impacto)");
    if (!detailedFacts.quien.trim()) missingFields.push("QUIÉN");

    if (missingFields.length > 0) {
      toast({
        title: "Campos Obligatorios Faltantes",
        description: `Por favor, complete los siguientes campos antes de continuar: ${missingFields.join(', ')}.`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSaveProgressLocal = async () => {
    if (evidenceFile) {
        if (evidenceFile.size > 700 * 1024) { // 700 KB limit
            toast({
              title: "Archivo Demasiado Grande",
              description: "El archivo de evidencia no puede superar los 700 KB.",
              variant: "destructive",
            });
            return;
        }
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(evidenceFile);
        });
        const newFact: Evidence = {
            id: `preserved-${Date.now()}`,
            nombre: evidenceFile.name,
            tipo: evidenceFile.type.split('/')[1] as Evidence['tipo'] || 'other',
            comment: evidenceComment.trim() || undefined,
            dataUrl: dataUrl,
        };
        await onSaveAnalysis(true, newFact);
        setEvidenceFile(null);
        setEvidenceComment('');
        const fileInput = document.getElementById('step2-evidence-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    } else {
        await onSaveAnalysis(true);
    }
  };
  
  const handleNextWithSave = async () => {
    if (!validateFieldsForNext()) {
      return;
    }
    if (evidenceFile) {
        if (evidenceFile.size > 700 * 1024) { // 700 KB limit
            toast({
              title: "Archivo Demasiado Grande",
              description: "El archivo de evidencia no puede superar los 700 KB.",
              variant: "destructive",
            });
            return;
        }
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(evidenceFile);
        });
        const newFact: Evidence = {
            id: `preserved-${Date.now()}`,
            nombre: evidenceFile.name,
            tipo: evidenceFile.type.split('/')[1] as Evidence['tipo'] || 'other',
            comment: evidenceComment.trim() || undefined,
            dataUrl: dataUrl,
        };
        await onSaveAnalysis(false, newFact);
    } else {
      await onSaveAnalysis(false);
    }
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
        <div className="space-y-2">
          <Label htmlFor="projectLeader" className="flex items-center">
            <UserCircle className="mr-2 h-4 w-4 text-primary" />
            Líder del Proyecto <span className="text-destructive">*</span>
          </Label>
          <Select value={projectLeader} onValueChange={onProjectLeaderChange}>
            <SelectTrigger id="projectLeader">
              <SelectValue placeholder="-- Seleccione un líder --" />
            </SelectTrigger>
            <SelectContent>
              {usersForDropdown.length > 0 ? usersForDropdown.map(user => (
                <SelectItem key={user.id} value={user.name}>{user.name} ({user.role})</SelectItem>
              )) : <SelectItem value="" disabled>No hay líderes disponibles para esta empresa</SelectItem>}
            </SelectContent>
          </Select>
        </div>

        <InvestigationTeamManager
          sessions={investigationSessions}
          onSetSessions={onSetInvestigationSessions}
          availableUsers={availableUsers}
          availableSites={availableSites}
          isSaving={isSaving}
        />
        
        <Card className="shadow-inner bg-secondary/20">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center">
              <ClipboardList className="mr-2 h-5 w-5 text-primary"/>
              Hechos Detallados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>

            <div className="space-y-2 pt-4">
              <div className="flex justify-between items-center">
                <Label className="font-semibold">DESCRIPCIÓN DEL FENÓMENO</Label>
                <Button variant="outline" size="sm" onClick={handleParaphrasePhenomenon} disabled={isParaphrasing || isSaving}>
                  {isParaphrasing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Parafrasear con IA
                </Button>
              </div>
               <Textarea
                id="analysisDetails"
                value={analysisDetails}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onAnalysisDetailsChange(e.target.value)}
                placeholder="La descripción del fenómeno aparecerá aquí. Puede editarla manualmente o usar la IA."
                rows={4}
                className="bg-background"
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-2">
            <Label htmlFor="investigationObjective" className="flex items-center">
              <Target className="mr-2 h-4 w-4 text-primary" />
              Objetivo de la Investigación
            </Label>
            <Textarea
              id="investigationObjective"
              value={investigationObjective}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onInvestigationObjectiveChange(e.target.value)}
              placeholder="Defina el alcance y el objetivo principal de este análisis de causa raíz..."
              rows={3}
            />
          </div>
        </div>
        
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-semibold font-headline flex items-center">
            <FileArchive className="mr-2 h-5 w-5 text-primary" />
            Preservación de Hechos
          </h3>
          <div className="p-4 border rounded-md bg-secondary/30 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="step2-evidence-file-input">Hecho Preservado</Label>
                <Input 
                  id="step2-evidence-file-input" 
                  type="file" 
                  onChange={(e) => setEvidenceFile(e.target.files ? e.target.files[0] : null)} 
                  className="text-xs h-9" 
                  disabled={isSaving} 
                />
                <Label htmlFor="step2-evidence-comment">Comentario para este hecho (opcional)</Label>
                <Input 
                  id="step2-evidence-comment" 
                  type="text" 
                  placeholder="Ej: Foto de la reparación, documento de capacitación..." 
                  value={evidenceComment} 
                  onChange={(e) => setEvidenceComment(e.target.value)} 
                  className="text-xs h-9" 
                  disabled={isSaving} 
                />
              </div>
          </div>
          {preservedFacts && preservedFacts.length > 0 && (
            <div className="space-y-2 mt-4">
              <h4 className="font-medium text-sm">Hechos Preservados Adjuntos:</h4>
              <ul className="space-y-2">
                {preservedFacts.map((fact) => (
                  <li key={fact.id} className="flex items-center justify-between text-sm border p-2 rounded-md bg-background">
                    <div className="flex items-center">
                      {getEvidenceIconLocal(fact.tipo)}
                      <div className="flex flex-col">
                        <span className="font-medium">{fact.nombre}</span>
                        {fact.comment && <span className="text-xs italic text-muted-foreground">"{fact.comment}"</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button asChild variant="link" size="sm" className="p-0 h-auto text-xs">
                        <a href={fact.dataUrl} target="_blank" rel="noopener noreferrer" download={fact.nombre}>
                          <ExternalLink className="mr-1 h-3 w-3" />Ver/Descargar
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemovePreservedFact(fact.id)} disabled={isSaving}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between gap-2 pt-4 border-t">
        <Button onClick={onPrevious} variant="outline" className="w-full sm:w-auto transition-transform hover:scale-105" disabled={isSaving}>Anterior</Button>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={handleSaveProgressLocal} variant="secondary" className="w-full sm:w-auto transition-transform hover:scale-105" disabled={isSaving}>
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
