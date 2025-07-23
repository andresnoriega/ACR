
'use client';
import type { FC, ChangeEvent } from 'react';
import { useState, useEffect, useMemo } from 'react';
import type { DetailedFacts, PreservedFact, PreservedFactCategory, FullUserProfile, RCAEventData, Site, InvestigationSession } from '@/types/rca'; 
import { PRESERVED_FACT_CATEGORIES } from '@/types/rca';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, PlusCircle, Trash2, FileText, Paperclip, UserCircle, Save, Loader2, ExternalLink, Users, Target, ClipboardList, Sparkles } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { InvestigationTeamManager } from './InvestigationTeamManager';
import { paraphrasePhenomenon, type ParaphrasePhenomenonInput } from '@/ai/flows/paraphrase-phenomenon';

interface Step2FactsProps {
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
  onAddPreservedFact: (factData: Omit<PreservedFact, 'id' | 'uploadDate' | 'eventId' | 'downloadURL' | 'storagePath'>, file: File | null) => void;
  onRemovePreservedFact: (id: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onSaveAnalysis: (showToast?: boolean) => Promise<void>;
  isSaving: boolean;
}

const PreservedFactDialog: FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (factData: Omit<PreservedFact, 'id' | 'uploadDate' | 'eventId' | 'downloadURL' | 'storagePath'>, file: File | null) => void;
}> = ({ open, onOpenChange, onSave }) => {
  const [userGivenName, setUserGivenName] = useState('');
  const [category, setCategory] = useState<PreservedFactCategory | ''>('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const [isSubmittingFact, setIsSubmittingFact] = useState(false);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 700 * 1024) { // 700KB limit
        toast({
          title: "Archivo Demasiado Grande",
          description: "El archivo no puede superar los 700 KB.",
          variant: "destructive",
        });
        setSelectedFile(null);
        event.target.value = ''; // Reset file input
        return;
      }
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleSubmit = () => {
    if (!userGivenName.trim()) {
      toast({ title: "Error", description: "El nombre del documento es obligatorio.", variant: "destructive" });
      return;
    }
    if (!category) {
      toast({ title: "Error", description: "La categoría es obligatoria.", variant: "destructive" });
      return;
    }
    if (!selectedFile) {
        toast({ title: "Error", description: "Debe seleccionar un archivo para adjuntar.", variant: "destructive" });
        return;
    }

    setIsSubmittingFact(true);
    onSave({
      userGivenName,
      category,
      description,
      fileName: selectedFile.name,
      fileType: selectedFile.type,
      fileSize: selectedFile.size,
    }, selectedFile);

    setUserGivenName('');
    setCategory('');
    setDescription('');
    setSelectedFile(null);
    if (document.getElementById('pf-file')) {
      (document.getElementById('pf-file') as HTMLInputElement).value = '';
    }
    setIsSubmittingFact(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if(!isSubmittingFact) onOpenChange(isOpen); }}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center"><Paperclip className="mr-2 h-5 w-5" />Añadir Hecho Preservado</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="pf-name">Nombre <span className="text-destructive">*</span></Label>
            <Input id="pf-name" value={userGivenName} onChange={(e) => setUserGivenName(e.target.value)} placeholder="Ej: Informe Técnico Bomba X" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pf-category">Categoría <span className="text-destructive">*</span></Label>
            <Select value={category} onValueChange={(value) => setCategory(value as PreservedFactCategory)}>
              <SelectTrigger>
                <SelectValue placeholder="-- Seleccione una categoría --" />
              </SelectTrigger>
              <SelectContent>
                {PRESERVED_FACT_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pf-file">Archivo <span className="text-destructive">*</span></Label>
            <Input id="pf-file" type="file" onChange={handleFileChange} />
          </div>
          {selectedFile && (
            <div className="col-span-4 text-xs text-muted-foreground">
              <p>Archivo: {selectedFile.name} ({selectedFile.type}, {(selectedFile.size / 1024).toFixed(2)} KB)</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="pf-description">Descripción</Label>
            <Textarea id="pf-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalles adicionales sobre el hecho o documento..." />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmittingFact}>Cancelar</Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit} disabled={isSubmittingFact || !selectedFile}>
            {isSubmittingFact && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Hecho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export const Step2Facts: FC<Step2FactsProps> = ({
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
  onAddPreservedFact,
  onRemovePreservedFact,
  onPrevious,
  onNext,
  onSaveAnalysis,
  isSaving,
}) => {
  const [isAddFactDialogOpen, setIsAddFactDialogOpen] = useState(false);
  const { toast } = useToast();
  const [clientSideMaxDateTime, setClientSideMaxDateTime] = useState<string | undefined>(undefined);
  const { userProfile } = useAuth();
  const [isParaphrasing, setIsParaphrasing] = useState(false);

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
  
  const constructedPhenomenonDescription = `La desviación ocurrió de la siguiente manera: "${detailedFacts.como || 'CÓMO (no especificado)'}".
El evento identificado fue: "${detailedFacts.que || 'QUÉ (no especificado)'}".
Esto tuvo lugar en: "${detailedFacts.donde || 'DÓNDE (no especificado)'}".
Sucedió el: "${formatDateTimeLocalForDisplay(detailedFacts.cuando)}".
El impacto o tendencia fue: "${detailedFacts.cualCuanto || 'CUÁL/CUÁNTO (no especificado)'}".
Las personas o equipos implicados fueron: "${detailedFacts.quien || 'QUIÉN (no especificado)'}".`;

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
    const hasLeader = !!projectLeader;
    const hasAnyDetailedFact = Object.values(detailedFacts).some(value => typeof value === 'string' && value.trim() !== '');
    const hasAnalysisDetailsText = analysisDetails.trim() !== '';
    const hasAnyPreservedFacts = preservedFacts.length > 0;
    const hasInvestigationTeam = investigationSessions.length > 0;

    if (!hasLeader && !hasAnyDetailedFact && !hasAnalysisDetailsText && !hasAnyPreservedFacts && !hasInvestigationTeam) {
      toast({
        title: "Nada que guardar",
        description: "No se ha ingresado información nueva o modificado datos existentes en este paso.",
        variant: "default",
      });
      return;
    }
    await onSaveAnalysis();
  };

  const handleNextWithSave = async () => {
    if (!validateFieldsForNext()) {
      return;
    }
    await onSaveAnalysis(false);
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
        onDetailedFactChange('que', result.paraphrasedText);
        toast({ title: "Asistente IA", description: "El campo 'QUÉ' ha sido actualizado con la descripción parafraseada." });
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
                <Label className="font-semibold">DESCRIPCIÓN DEL FENÓMENO (Auto-generado)</Label>
                <Button variant="outline" size="sm" onClick={handleParaphrasePhenomenon} disabled={isParaphrasing || isSaving}>
                  {isParaphrasing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Parafrasear con IA
                </Button>
              </div>
              <Alert variant="default" className="bg-background">
                <AlertDescription className="whitespace-pre-line">
                  {detailedFacts.como || detailedFacts.que || detailedFacts.donde || detailedFacts.cuando || detailedFacts.cualCuanto || detailedFacts.quien ? 
                  constructedPhenomenonDescription : 
                  "Complete los campos anteriores para generar la descripción."}
                </AlertDescription>
              </Alert>
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
            
            <div className="pt-4">
              <h3 className="text-lg font-semibold font-headline flex items-center mb-3"><FileText className="mr-2 h-5 w-5 text-primary" />Preservación de los Hechos</h3>
              <Button onClick={() => setIsAddFactDialogOpen(true)} variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" /> Añadir Hecho Preservado
              </Button>
            </div>
            <PreservedFactDialog 
                open={isAddFactDialogOpen} 
                onOpenChange={setIsAddFactDialogOpen} 
                onSave={onAddPreservedFact}
            />
            {preservedFacts.length === 0 && (
                <p className="text-sm text-muted-foreground">No se han añadido hechos preservados aún.</p>
            )}
            <div className="space-y-3">
                {preservedFacts.map(fact => (
                    <Card key={fact.id} className="p-4 bg-secondary/30">
                        <div className="flex justify-between items-start">
                            <div className="flex-grow">
                                <p className="font-semibold text-primary">{fact.userGivenName}</p>
                                <p className="text-xs text-muted-foreground">Categoría: {fact.category}</p>
                                {fact.fileName && <p className="text-xs text-muted-foreground">Archivo: {fact.fileName} ({fact.fileType}, {fact.fileSize ? (fact.fileSize / 1024).toFixed(2) : 0} KB)</p>}
                                {fact.description && <p className="text-sm mt-1">{fact.description}</p>}
                                <p className="text-xs text-muted-foreground mt-1">Cargado: {format(parseISO(fact.uploadDate), "dd/MM/yyyy HH:mm", { locale: es })}</p>
                                {fact.downloadURL && (
                                    <Button asChild variant="link" size="sm" className="p-0 h-auto text-xs mt-1">
                                        <a href={fact.downloadURL} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-1 h-3 w-3" />Ver/Descargar</a>
                                    </Button>
                                )}
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => onRemovePreservedFact(fact.id)} aria-label="Eliminar hecho preservado">
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
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
  );
};
