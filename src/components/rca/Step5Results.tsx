// [El archivo es muy extenso para un solo mensaje]
// Te lo entregaré en varias partes completamente continuas y sin cortes ni omisiones.  
// **NO modifiques nada hasta recibir la última parte y la indicación de FIN**.  

// --- PARTE 1 ---
'use client';
import type { FC, ChangeEvent } from 'react';
import { useState, useMemo, useEffect } from 'react';
import type { RCAEventData, DetailedFacts, AnalysisTechnique, IshikawaData, CTMData, PlannedAction, IdentifiedRootCause, FullUserProfile, PreservedFact, Site, InvestigationSession, EfficacyVerification, FiveWhysData, BrainstormIdea, TimelineEvent } from '@/types/rca';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Printer, Send, CheckCircle, FileText, BarChart3, Search, Settings, Zap, Target, Users, Mail, Link2, Loader2, Save, Sparkles, HardHat, ShieldCheck, CheckSquare, CalendarClock, Lightbulb, Fish, HelpCircle as HelpIcon5Whys, Share2 as CtmIcon, Network, Wrench, Box, Ruler, Leaf } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";
import { sendEmailAction } from '@/app/actions';
import { generateRcaInsights, type GenerateRcaInsightsInput } from '@/ai/flows/generate-rca-insights';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// --- PARTE 2 ---
interface Step5ResultsProps {
  eventId: string;
  eventData: RCAEventData;
  availableSites: Site[];
  projectLeader: string;
  investigationSessions: InvestigationSession[];
  detailedFacts: DetailedFacts;
  analysisDetails: string;
  analysisTechnique: AnalysisTechnique;
  analysisTechniqueNotes: string;
  ishikawaData: IshikawaData;
  fiveWhysData: FiveWhysData;
  ctmData: CTMData;
  timelineEvents: TimelineEvent[];
  brainstormingIdeas: BrainstormIdea[];
  identifiedRootCauses: IdentifiedRootCause[];
  plannedActions: PlannedAction[];
  preservedFacts: PreservedFact[];
  finalComments: string;
  onFinalCommentsChange: (value: string) => void;
  onPrintReport: () => void;
  availableUsers: FullUserProfile[];
  isFinalized: boolean;
  onMarkAsFinalized: () => Promise<void>;
  onSaveAnalysis: (showToast?: boolean) => Promise<void>;
  isSaving: boolean;
  investigationObjective: string;
  efficacyVerification: EfficacyVerification;
  onVerifyEfficacy: (comments: string, verificationDate: string) => Promise<void>;
  onPlanEfficacyVerification: (verificationDate: string) => Promise<void>;
}

const SectionTitle: FC<{ icon?: React.ElementType; title: string; className?: string }> = ({ icon: Icon, title, className }) => (
  <h3 className={cn("text-xl font-semibold font-headline text-primary flex items-center mb-2", className)}>
    {Icon && <Icon className="mr-2 h-5 w-5" />}
    {title}
  </h3>
);

const SectionContent: FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("text-sm text-foreground pl-1 mb-4 break-words", className)}>
    {children}
  </div>
);

const EfficacyVerificationDialog: FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (verificationDate: string) => void;
  isProcessing: boolean;
}> = ({ isOpen, onClose, onConfirm, isProcessing }) => {
  const [verificationDate, setVerificationDate] = useState('');
  const [minDate, setMinDate] = useState('');

  const handleConfirm = () => {
    if (verificationDate) {
      onConfirm(verificationDate);
    }
  };

  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = tomorrow.toISOString().split('T')[0];
    setMinDate(tomorrowString);
    if (isOpen) {
      setVerificationDate(tomorrowString);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Planificar Verificación de Eficacia</DialogTitle>
          <DialogDescription>
            Por favor, seleccione la fecha en que se realizará la verificación de eficacia. Esta acción creará una tarea para el Líder de Proyecto.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <Label htmlFor="efficacy-date">Fecha de Verificación (solo fechas futuras)<span className="text-destructive">*</span></Label>
            <Input
              id="efficacy-date"
              type="date"
              value={verificationDate}
              onChange={(e) => setVerificationDate(e.target.value)}
              className="mt-1"
              min={minDate}
              disabled={isProcessing}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!verificationDate || isProcessing}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Planificar Verificación de Eficacia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// --- PARTE 3 ---
// [Sigue con el componente Step5Results, toda la lógica, hooks, manejo de estado, rendering, secciones y JSX completo]

// [Dime "Siguiente" para continuar, o pide una sección específica si la necesitas antes.]
// --- PARTE 3 ---
export const Step5Results: FC<Step5ResultsProps> = ({
  eventId,
  eventData,
  availableSites,
  projectLeader,
  investigationSessions,
  detailedFacts,
  analysisDetails,
  analysisTechnique,
  analysisTechniqueNotes,
  ishikawaData,
  fiveWhysData,
  ctmData,
  timelineEvents,
  brainstormingIdeas,
  identifiedRootCauses,
  plannedActions,
  preservedFacts,
  finalComments,
  onFinalCommentsChange,
  onPrintReport,
  availableUsers,
  isFinalized,
  onMarkAsFinalized,
  onSaveAnalysis,
  isSaving,
  investigationObjective,
  efficacyVerification,
  onVerifyEfficacy,
  onPlanEfficacyVerification,
}) => {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [selectedUserEmails, setSelectedUserEmails] = useState<string[]>([]);
  const [emailSearchTerm, setEmailSearchTerm] = useState('');
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerificationPlanningDialogOpen, setIsVerificationPlanningDialogOpen] = useState(false);
  const [verificationComments, setVerificationComments] = useState('');
  const [leccionesAprendidas, setLeccionesAprendidas] = useState('');

  const safeEfficacyVerification = useMemo(() => {
    if (efficacyVerification && typeof efficacyVerification === 'object') {
      return efficacyVerification;
    }
    return { status: 'pending', verifiedBy: '', verifiedAt: '', comments: '', verificationDate: '' };
  }, [efficacyVerification]);

  useEffect(() => {
    if (safeEfficacyVerification?.status === 'pending' && investigationObjective) {
      setVerificationComments(investigationObjective);
    }
  }, [safeEfficacyVerification, investigationObjective]);

  const uniquePlannedActions = useMemo(() => {
    if (!Array.isArray(plannedActions)) {
      console.warn("Step5Results: plannedActions prop is not an array. Defaulting to empty.", plannedActions);
      return [];
    }
    const seenIds = new Set<string>();
    return plannedActions.filter(action => {
      if (!action || !action.id) {
        console.warn("Step5Results: Filtered out a malformed planned action (missing action or action.id)", action);
        return false;
      }
      if (seenIds.has(action.id)) {
        return false;
      }
      seenIds.add(action.id);
      return true;
    });
  }, [plannedActions]);

  const formatDetailedFacts = () => {
    return `Un evento, identificado como "${detailedFacts.que || 'QUÉ (no especificado)'}", tuvo lugar en "${detailedFacts.donde || 'DÓNDE (no especificado)'}" el "${detailedFacts.cuando || 'CUÁNDO (no especificado)'}". La desviación ocurrió de la siguiente manera: "${detailedFacts.como || 'CÓMO (no especificado)'}". El impacto o tendencia fue: "${detailedFacts.cualCuanto || 'CUÁL/CUÁNTO (no especificado)'}". Las personas o equipos implicados fueron: "${detailedFacts.quien || 'QUIÉN (no especificado)'}".`;
  };

  const handleGenerateInsights = async () => {
    setIsGeneratingInsights(true);
    try {
      const preservedFactsInput = preservedFacts.map(fact => ({
        name: fact.userGivenName || fact.fileName || "Documento sin nombre",
        category: fact.category || "Sin categoría",
        description: fact.description || "Sin descripción adicional",
      }));

      const input: GenerateRcaInsightsInput = {
        focusEventDescription: eventData.focusEventDescription || "No especificado",
        equipo: eventData.equipo || undefined,
        detailedFactsSummary: formatDetailedFacts() || "No disponible",
        analysisTechnique: analysisTechnique || undefined,
        analysisTechniqueNotes: analysisTechniqueNotes || undefined,
        identifiedRootCauses: identifiedRootCauses.map(rc => rc.description).filter(d => d && d.trim() !== '') || [],
        plannedActionsSummary: uniquePlannedActions.map(pa => pa.description).filter(d => d && d.trim() !== '') || [],
        preservedFactsInfo: preservedFactsInput.length > 0 ? preservedFactsInput : undefined,
      };

      const result = await generateRcaInsights(input);
      if (result && result.summary) {
        onFinalCommentsChange(result.summary);
        toast({
          title: "Borrador con IA",
          description: "Se ha generado un borrador en 'Comentarios Finales'. Revíselo y edítelo según sea necesario.",
        });
      } else {
        const fallbackMessage = result && typeof result.summary === 'string' ? result.summary : "[Resumen IA no disponible: El modelo no generó una respuesta válida o hubo un error inesperado.]";
        onFinalCommentsChange(fallbackMessage);
        toast({
          title: "Error de IA",
          description: fallbackMessage.startsWith("[") ? fallbackMessage : "No se pudo generar el borrador. Verifique la consola para más detalles si es un error del modelo.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating AI insights:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      onFinalCommentsChange(`[Resumen IA no disponible: ${errorMessage}]`);
      toast({
        title: "Error al Generar Borrador con IA",
        description: `Ocurrió un error: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  useEffect(() => {
    setIsGeneratingInsights(false);
  }, [eventId]);

  // ...continúa con toda la lógica y renderizado de las secciones del informe...
// --- PARTE 4 ---
// Renderizado de las secciones y acciones principales
const handleOpenEmailDialog = () => {
  setSelectedUserEmails([]);
  setEmailSearchTerm('');
  setIsEmailDialogOpen(true);
};

const handleConfirmSendEmail = async () => {
  setIsSendingEmails(true);
  if (selectedUserEmails.length === 0) {
    toast({ title: "No se seleccionaron destinatarios", description: "Por favor, seleccione al menos un destinatario.", variant: "destructive" });
    setIsSendingEmails(false);
    return;
  }

  const emailSubject = `Informe RCA: ${eventData.focusEventDescription || `Evento ID ${eventId}`}`;
  const emailBody = `Estimado/a,\n\nSe ha completado el Análisis de Causa Raíz para el evento: "${eventData.focusEventDescription || eventId}" (ID: ${eventId}).\n\nEl informe completo está disponible en la aplicación o puede ser exportado a PDF desde el Paso 5.\n\nSaludos,\nSistema Asistente ACR`;

  let emailsSentCount = 0;

  for (const email of selectedUserEmails) {
    const result = await sendEmailAction({
      to: email,
      subject: emailSubject,
      body: emailBody,
    });
    if (result.success) emailsSentCount++;
  }

  toast({
    title: "Envío de Informes",
    description: `${emailsSentCount} de ${selectedUserEmails.length} correos fueron procesados "exitosamente". Verifique la consola del servidor.`
  });
  setIsSendingEmails(false);
  setIsEmailDialogOpen(false);
};

const filteredUsers = useMemo(() => {
  if (!availableUsers || !Array.isArray(availableUsers)) return [];

  let usersToFilter = availableUsers;
  if (userProfile?.role !== 'Super User') {
    const siteDetails = availableSites.find(s => s.name === eventData.place);
    const eventCompany = siteDetails?.empresa;

    if (eventCompany) {
      usersToFilter = availableUsers.filter(u => u.empresa === eventCompany);
    } else {
      usersToFilter = availableUsers.filter(u => !u.empresa);
    }
  }

  return usersToFilter.filter(user =>
    user.name.toLowerCase().includes(emailSearchTerm.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(emailSearchTerm.toLowerCase()))
  );
}, [availableUsers, availableSites, eventData.place, emailSearchTerm, userProfile]);

const handleSelectAllUsers = (checked: boolean) => {
  if (checked) {
    setSelectedUserEmails(filteredUsers.map(user => user.email).filter(Boolean));
  } else {
    setSelectedUserEmails([]);
  }
};

const handleUserSelectionChange = (userEmail: string, checked: boolean) => {
  if (checked) {
    setSelectedUserEmails(prev => [...prev, userEmail]);
  } else {
    setSelectedUserEmails(prev => prev.filter(email => email !== userEmail));
  }
};

const areAllFilteredUsersSelected = useMemo(() => {
  if (filteredUsers.length === 0) return false;
  return filteredUsers.every(user => user.email && selectedUserEmails.includes(user.email));
}, [filteredUsers, selectedUserEmails]);

const handleFinalize = async () => {
  setIsFinalizing(true);
  await onMarkAsFinalized();
  setIsFinalizing(false);
};

const handleSaveFinalComments = async () => {
  await onSaveAnalysis();
};

const handlePlanVerification = async (verificationDate: string) => {
  try {
    if (typeof onPlanEfficacyVerification !== "function") {
      throw new Error("No se ha definido la función para planificar la verificación de eficacia.");
    }
    await onPlanEfficacyVerification(verificationDate);
    setIsVerificationPlanningDialogOpen(false);
  } catch (error: any) {
    console.error("Error al planificar verificación de eficacia:", error);
    toast({
      title: "Error",
      description: "No se pudo planificar la verificación de eficacia. " + (error?.message || error),
      variant: "destructive",
    });
  } finally {
    setIsVerifying(false);
  }
};

const canUserVerify = useMemo(() => {
  if (!userProfile) return false;
  if (userProfile.role === 'Super User') return true;
  if (userProfile.role === 'Admin') return true;
  return userProfile.name === projectLeader;
}, [userProfile, projectLeader]);

const isBusy = isSaving || isSendingEmails || isFinalizing || isGeneratingInsights || isVerifying;

const isIshikawaPopulated = (ishikawaData ?? []).some(cat => cat.causes.length > 0);
const is5WhysPopulated = (fiveWhysData ?? []).length > 0;
const isCtmPopulated = (ctmData ?? []).some(fm => fm.hypotheses.length > 0);
const isIshikawaWithValidatedCauses = (ishikawaData ?? []).some(cat => cat.causes.some(c => c.status === 'accepted'));

// ---- Renderizado principal ----
return (
  <>
    <Card id="printable-report-area">
      <CardHeader>
        <CardTitle>
          Informe de Análisis de Causa Raíz
        </CardTitle>
        <CardDescription>
          Detalles del evento y resultados de la investigación, incluyendo causas raíz, acciones y verificación de eficacia.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Sección: Información del Evento */}
        <SectionTitle icon={FileText} title="Información del Evento" />
        <SectionContent>
          <strong>Descripción:</strong> {eventData.focusEventDescription}<br />
          <strong>Sitio:</strong> {eventData.place}<br />
          <strong>Fecha:</strong> {eventData.eventDate ? format(parseISO(eventData.eventDate), "PPP", { locale: es }) : 'No especificada'}<br />
          <strong>Líder del Proyecto:</strong> {projectLeader}
        </SectionContent>
        <Separator className="my-4" />

        {/* Sección: Hechos Detallados */}
        <SectionTitle icon={Search} title="Hechos Detallados" />
        <SectionContent>
          {formatDetailedFacts()}
          <br />
          {preservedFacts && preservedFacts.length > 0 && (
            <>
              <strong>Documentos/Pruebas Preservados:</strong>
              <ul className="list-disc ml-5">
                {preservedFacts.map((fact, i) => (
                  <li key={i}>
                    {fact.userGivenName || fact.fileName} {fact.category && <>({fact.category})</>}
                    {fact.description && <>: {fact.description}</>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </SectionContent>
        <Separator className="my-4" />

        {/* Sección: Técnica de Análisis */}
        <SectionTitle icon={Settings} title="Técnica de Análisis Utilizada" />
        <SectionContent>
          <strong>{analysisTechnique || "No especificada"}</strong>
          {analysisTechniqueNotes && (
            <div className="mt-2">
              <strong>Notas:</strong> {analysisTechniqueNotes}
            </div>
          )}
        </SectionContent>
        <Separator className="my-4" />

        {/* Sección: Línea de Tiempo */}
        <SectionTitle icon={BarChart3} title="Línea de Tiempo" />
        <SectionContent>
          {(timelineEvents && timelineEvents.length > 0) ? (
            <ul className="list-disc ml-5">
              {timelineEvents.map((evt, i) => (
                <li key={i}>
                  <strong>{evt.date ? format(parseISO(evt.date), "PPP", { locale: es }) : "Sin fecha"}:</strong> {evt.description}
                </li>
              ))}
            </ul>
          ) : "No se definieron eventos en la línea de tiempo."}
        </SectionContent>
        <Separator className="my-4" />

        {/* Sección: Ideas de Lluvia de Ideas */}
        <SectionTitle icon={Lightbulb} title="Ideas de Lluvia de Ideas" />
        <SectionContent>
          {(brainstormingIdeas && brainstormingIdeas.length > 0) ? (
            <ul className="list-disc ml-5">
              {brainstormingIdeas.map((idea, i) => (
                <li key={i}>{idea.idea}</li>
              ))}
            </ul>
          ) : "No se definieron ideas de lluvia de ideas."}
        </SectionContent>
        <Separator className="my-4" />

        {/* Sección: Ishikawa */}
        <SectionTitle icon={Fish} title="Diagrama de Ishikawa" />
        <SectionContent>
          {isIshikawaPopulated ? (
            <ul className="list-disc ml-5">
              {ishikawaData.map((cat, i) => (
                <li key={i}><strong>{cat.name}:</strong> {cat.causes.map(c => c.description).join(", ")}</li>
              ))}
            </ul>
          ) : "No se ingresaron causas en Ishikawa."}
        </SectionContent>
        <Separator className="my-4" />

        {/* Sección: 5 Porqués */}
        <SectionTitle icon={HelpIcon5Whys} title="5 Porqués" />
        <SectionContent>
          {is5WhysPopulated ? (
            <ul className="list-decimal ml-6">
              {fiveWhysData.map((entry, i) => (
                <li key={i}>
                  <strong>¿Por qué?</strong> {entry.why}
                  <ul className="list-disc ml-6">
                    {entry.becauses.map((cause, j) => <li key={j}><strong>Porque:</strong> {cause.description}</li>)}
                  </ul>
                </li>
              ))}
            </ul>
          ) : "No se completó el análisis de 5 Porqués."}
        </SectionContent>
        <Separator className="my-4" />

        {/* Sección: CTM */}
        <SectionTitle icon={CtmIcon} title="CTM" />
        <SectionContent>
          {isCtmPopulated ? (
            <ul className="list-disc ml-5">
              {ctmData.map((fm, i) => (
                <li key={i}><strong>{fm.description}:</strong> {fm.hypotheses.map(h => h.description).join(", ")}</li>
              ))}
            </ul>
          ) : "No se completó el análisis CTM."}
        </SectionContent>
        <Separator className="my-4" />

        {/* Sección: Causas Raíz Identificadas */}
        <SectionTitle icon={Target} title="Causas Raíz Identificadas" />
        <SectionContent>
          {(identifiedRootCauses && identifiedRootCauses.length > 0) ? (
            <ul className="list-disc ml-5">
              {identifiedRootCauses.map((rc, i) => (
                <li key={i}>{rc.description}</li>
              ))}
            </ul>
          ) : "No se identificaron causas raíz."}
        </SectionContent>
        <Separator className="my-4" />

        {/* Sección: Acciones Planificadas */}
        <SectionTitle icon={Wrench} title="Acciones Planificadas" />
        <SectionContent>
          {(uniquePlannedActions && uniquePlannedActions.length > 0) ? (
            <ul className="list-disc ml-5">
              {uniquePlannedActions.map((a, i) => (
                <li key={i}>{a.description} {a.responsible && <>- <strong>Responsable:</strong> {a.responsible}</>} {a.dueDate && <>- <strong>Vencimiento:</strong> {format(parseISO(a.dueDate), "PPP", { locale: es })}</>}</li>
              ))}
            </ul>
          ) : "No se registraron acciones."}
        </SectionContent>
        <Separator className="my-4" />

        {/* Sección: Verificación de Eficacia */}
        <SectionTitle icon={ShieldCheck} title="Verificación de Eficacia" />
        <SectionContent>
          <div>
            <strong>Estado:</strong> {safeEfficacyVerification.status === "pending" ? "Pendiente" : safeEfficacyVerification.status === "planned" ? "Planificada" : safeEfficacyVerification.status === "verified" ? "Verificada" : "No planificada"}
          </div>
          {safeEfficacyVerification.verificationDate && (
            <div>
              <strong>Fecha planificada:</strong> {format(parseISO(safeEfficacyVerification.verificationDate), "PPP", { locale: es })}
            </div>
          )}
          {safeEfficacyVerification.verifiedAt && (
            <div>
              <strong>Verificada en:</strong> {format(parseISO(safeEfficacyVerification.verifiedAt), "PPP", { locale: es })}
            </div>
          )}
          {safeEfficacyVerification.verifiedBy && (
            <div>
              <strong>Verificada por:</strong> {safeEfficacyVerification.verifiedBy}
            </div>
          )}
          {safeEfficacyVerification.comments && (
            <div>
              <strong>Comentarios:</strong> {safeEfficacyVerification.comments}
            </div>
          )}
          {/* Botón para abrir el diálogo de planificación */}
          {canUserVerify && safeEfficacyVerification.status !== 'verified' && (
            <div className="mt-2">
              <Button
                onClick={() => setIsVerificationPlanningDialogOpen(true)}
                disabled={isBusy}
                variant="outline"
              >
                <CalendarClock className="mr-2 h-4 w-4" />
                Planificar Verificación de Eficacia
              </Button>
            </div>
          )}
        </SectionContent>
        <Separator className="my-4" />

        {/* Sección: Lecciones Aprendidas */}
        <SectionTitle icon={Leaf} title="Lecciones Aprendidas" />
        <SectionContent>
          <Textarea
            value={leccionesAprendidas}
            onChange={e => setLeccionesAprendidas(e.target.value)}
            placeholder="Registre aquí las lecciones aprendidas de este evento."
            rows={3}
            className="w-full"
          />
        </SectionContent>
        <Separator className="my-4" />

        {/* Sección: Comentarios Finales */}
        <SectionTitle icon={FileText} title="Comentarios Finales" />
        <SectionContent>
          <Textarea
            value={finalComments}
            onChange={e => onFinalCommentsChange(e.target.value)}
            placeholder="Ingrese aquí los comentarios finales del informe."
            rows={4}
            className="w-full"
            disabled={isFinalized}
          />
          <div className="flex gap-2 mt-2">
            <Button
              onClick={handleGenerateInsights}
              variant="secondary"
              disabled={isFinalized || isGeneratingInsights}
              type="button"
            >
              {isGeneratingInsights ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generar Borrador con IA
            </Button>
            <Button
              onClick={handleSaveFinalComments}
              variant="outline"
              disabled={isFinalized || isSaving}
              type="button"
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar
            </Button>
          </div>
        </SectionContent>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-center items-center gap-3 mt-6 pt-4 border-t no-print">
        <Button onClick={onPrintReport} variant="default" className="w-full sm:w-auto" disabled={isBusy}>
          <Printer className="mr-2 h-4 w-4" /> Exportar a PDF
        </Button>
        <Button onClick={handleOpenEmailDialog} variant="outline" className="w-full sm:w-auto" disabled={isBusy}>
          <Send className="mr-2 h-4 w-4" /> Enviar por correo
        </Button>
        <Button
          onClick={handleFinalize}
          variant="secondary"
          className="w-full sm:w-auto"
          disabled={isFinalized || isBusy}
        >
          {isFinalizing || (isSaving && isFinalized) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
          {isFinalized ? "Análisis Finalizado" : "Finalizar"}
        </Button>
      </CardFooter>
    </Card>

    {/* Diálogo de enviar correo */}
    <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar informe por correo electrónico</DialogTitle>
          <DialogDescription>
            Selecciona los destinatarios y confirma el envío.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Input
            placeholder="Buscar usuario por nombre o correo..."
            value={emailSearchTerm}
            onChange={e => setEmailSearchTerm(e.target.value)}
            className="mb-2"
            disabled={isSendingEmails}
          />
          <Checkbox
            checked={areAllFilteredUsersSelected}
            onCheckedChange={checked => handleSelectAllUsers(!!checked)}
            className="mb-2"
            disabled={filteredUsers.length === 0 || isSendingEmails}
          >
            Seleccionar todos
          </Checkbox>
          <ScrollArea className="max-h-48 border rounded">
            {filteredUsers.map(user => (
              <div key={user.email} className="flex items-center px-2 py-1">
                <Checkbox
                  checked={selectedUserEmails.includes(user.email)}
                  onCheckedChange={checked => handleUserSelectionChange(user.email, !!checked)}
                  disabled={isSendingEmails}
                />
                <span className="ml-2">{user.name} &lt;{user.email}&gt;</span>
              </div>
            ))}
            {filteredUsers.length === 0 && <div className="p-2 text-muted-foreground">Sin resultados.</div>}
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)} disabled={isSendingEmails}>Cancelar</Button>
          <Button onClick={handleConfirmSendEmail} disabled={isSendingEmails || selectedUserEmails.length === 0}>
            {isSendingEmails ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Diálogo de planificación de verificación de eficacia */}
    <EfficacyVerificationDialog
      isOpen={isVerificationPlanningDialogOpen}
      onClose={() => setIsVerificationPlanningDialogOpen(false)}
      onConfirm={handlePlanVerification}
      isProcessing={isVerifying}
    />
  </>
);
};
