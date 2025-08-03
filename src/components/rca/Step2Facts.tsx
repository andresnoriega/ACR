'use client';

import type { FC, ChangeEvent } from 'react';
import { useState, useEffect, useMemo } from 'react';
import type { DetailedFacts, FullUserProfile, RCAEventData, Site, InvestigationSession, PreservedFact, Evidence } from '@/types/rca'; 
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCircle, Save, Loader2, Target, ClipboardList, Sparkles, FileArchive, Trash2, FileText, ImageIcon, Paperclip, Link2, ExternalLink, PlusCircle } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { InvestigationTeamManager } from './InvestigationTeamManager';
import { paraphrasePhenomenon, type ParaphrasePhenomenonInput } from '@/ai/flows/paraphrase-phenomenon';
import { ScrollArea } from '@/components/ui/scroll-area';

const getEvidenceIconLocal = (fileName: string | undefined) => {
    if (!fileName) {
        return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />;
    }
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-red-600" />;
      case 'jpg': case 'jpeg': case 'png': case 'gif': return <ImageIcon className="h-4 w-4 mr-2 flex-shrink-0 text-blue-600" />;
      case 'doc': case 'docx': return <Paperclip className="h-4 w-4 mr-2 flex-shrink-0 text-sky-700" />;
      default: return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />;
    }
};

const factCategories = [
  "Partes, Posición, Personas, Papel y Paradigmas",
  "Fotografías o videos del Evento",
  "Datos operacionales (Sensores, Vibraciones, etc.)",
  "Registro mantenimientos y pruebas realizadas.",
  "Procedimientos.",
  "Entrevistas.",
  "PT, AST, OT",
  "Charlas",
  "Manuales, planos, P&ID, catálogos, Normativa asociada",
  "Otras."
];


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
  preservedFacts: PreservedFact[];
  onRemovePreservedFact: (factId: string) => Promise<void>;
  onSaveWithNewFact: (factMetadata: Omit<PreservedFact, 'id' | 'uploadDate' | 'eventId' | 'downloadURL' | 'storagePath'>, file: File) => Promise<void>;
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
  onSaveWithNewFact,
  isSaving,
  onPrevious,
  onNext,
}) => {
  const { toast } = useToast();
  const [clientSideMaxDateTime, setClientSideMaxDateTime] = useState<string | undefined>(undefined);
  const { userProfile } = useAuth();
  const [isParaphrasing, setIsParaphrasing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // State for the new evidence upload section
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceComment, setEvidenceComment] = useState('');
  const [evidenceCategory, setEvidenceCategory] = useState('');
  const [showNewFactForm, setShowNewFactForm] = useState(false);


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
  
  const handleSaveWithNewFactClick = async () => {
    if (!evidenceFile) {
        toast({ title: "Archivo Requerido", description: "Por favor, seleccione un archivo para guardar el hecho preservado.", variant: "destructive" });
        return;
    }
     if (!evidenceCategory) {
        toast({ title: "Categoría Requerida", description: "Por favor, seleccione una categoría para el hecho preservado.", variant: "destructive" });
        return;
    }
    if (evidenceFile.size > 700 * 1024) { // 700 KB limit
        toast({
          title: "Archivo Demasiado Grande",
          description: "El archivo de evidencia no puede superar los 700 KB.",
          variant: "destructive",
        });
        return;
    }
    
    setIsUploading(true);
    
    try {
      const factMetadata: Omit<PreservedFact, 'id' | 'uploadDate' | 'eventId' | 'downloadURL' | 'storagePath'> = {
        userGivenName: evidenceFile.name,
        category: evidenceCategory,
        comment: evidenceComment.trim() || undefined,
      };
      
      await onSaveWithNewFact(factMetadata, evidenceFile);
      
      // Reset form
      setEvidenceFile(null);
      setEvidenceComment('');
      setEvidenceCategory('');
      setShowNewFactForm(false);
      const fileInput = document.getElementById('step2-evidence-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch(error) {
       console.error("Error during fact preservation:", error);
       // The parent page (analisis) will show the toast for specific errors.
    } finally {
       setIsUploading(false);
    }
  };

  const handleNextWithSave = async () => {
    if (!validateFieldsForNext()) {
      return;
    }
    // Logic now resides in the parent page for onNext
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
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold font-headline flex items-center">
              <FileArchive className="mr-2 h-5 w-5 text-primary" />
              Preservación de Hechos
            </h3>
            <Button variant="outline" size="sm" onClick={() => setShowNewFactForm(prev => !prev)} disabled={isSaving || isUploading}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Hecho
            </Button>
          </div>

          {showNewFactForm && (
            <Card className="p-4 bg-secondary/30 space-y-3 shadow-inner">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="step2-evidence-category">Categoría <span className="text-destructive">*</span></Label>
                    <Select value={evidenceCategory} onValueChange={setEvidenceCategory}>
                        <SelectTrigger id="step2-evidence-category" disabled={isSaving || isUploading}>
                            <SelectValue placeholder="-- Seleccione una categoría --" />
                        </SelectTrigger>
                        <SelectContent>
                            {factCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="step2-evidence-file-input">Hecho Preservado <span className="text-destructive">*</span></Label>
                    <Input
                    id="step2-evidence-file-input"
                    type="file"
                    onChange={(e) => setEvidenceFile(e.target.files ? e.target.files[0] : null)}
                    className="text-xs h-9"
                    disabled={isSaving || isUploading}
                    />
                 </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="step2-evidence-comment">Comentario (opcional)</Label>
                <Input
                  id="step2-evidence-comment"
                  type="text"
                  placeholder="Ej: Foto de la reparación, documento de capacitación..."
                  value={evidenceComment}
                  onChange={(e) => setEvidenceComment(e.target.value)}
                  className="text-xs h-9"
                  disabled={isSaving || isUploading}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveWithNewFactClick} disabled={isSaving || isUploading || !evidenceFile}>
                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowNewFactForm(false)} disabled={isSaving || isUploading}>Cancelar</Button>
              </div>
            </Card>
          )}

          {preservedFacts && preservedFacts.length > 0 && (
            <div className="space-y-2 mt-4">
              <h4 className="font-medium text-sm">Hechos Preservados Adjuntos:</h4>
              <ScrollArea className="h-48 w-full rounded-md border p-3">
                <ul className="space-y-2">
                  {preservedFacts.map((fact) => (
                    <li key={fact.id} className="flex items-start justify-between text-sm border p-2 rounded-md bg-background">
                      <div className="flex items-start">
                        {getEvidenceIconLocal(fact.userGivenName)}
                        <div className="flex flex-col">
                          <span className="font-semibold text-primary">{fact.category || 'Sin categoría'}</span>
                          <span className="font-medium">{fact.userGivenName}</span>
                          {fact.comment && <span className="text-xs italic text-muted-foreground">"{fact.comment}"</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <Button asChild variant="link" size="sm" className="p-0 h-auto text-xs">
                          <a href={fact.downloadURL} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-1 h-3 w-3" />Ver/Descargar
                          </a>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemovePreservedFact(fact.id)} disabled={isSaving || isUploading}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}
        </div>

      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between gap-2 pt-4 border-t">
        <Button onClick={onPrevious} variant="outline" className="w-full sm:w-auto transition-transform hover:scale-105" disabled={isSaving}>Anterior</Button>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={() => onNext()} className="w-full sm:w-auto transition-transform hover:scale-105" disabled={isSaving}>
                 {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Siguiente
            </Button>
        </div>
      </CardFooter>
    </Card>
    </>
  );
};
