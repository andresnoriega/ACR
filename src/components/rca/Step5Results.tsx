
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  leccionesAprendidas: string;
  onLeccionesAprendidasChange: (value: string) => void;
  onPrintReport: () => void;
  availableUsers: FullUserProfile[];
  isFinalized: boolean;
  onMarkAsFinalized: () => Promise<void>;
  onSaveAnalysis: (showToast?: boolean) => Promise<void>;
  isSaving: boolean;
  investigationObjective: string;
  efficacyVerification: EfficacyVerification;
  onVerifyEfficacy: (comments: string) => Promise<void>;
  onPlanEfficacyVerification: (responsible: string, verificationDate: string) => Promise<void>;
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
  leccionesAprendidas,
  onLeccionesAprendidasChange,
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
  const [verificationComments, setVerificationComments] = useState('');
  
  // State for the new verification planning fields
  const [verificationResponsible, setVerificationResponsible] = useState('');
  const [verificationDate, setVerificationDate] = useState('');
  const [minDateForVerification, setMinDateForVerification] = useState('');

  useEffect(() => {
    // Set minimum date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setMinDateForVerification(tomorrow.toISOString().split('T')[0]);
  }, []);

  const safeEfficacyVerification = useMemo(() => {
    if (efficacyVerification && typeof efficacyVerification === 'object') {
      return efficacyVerification;
    }
    return { status: 'pending', verifiedBy: '', verifiedAt: '', comments: '', verificationDate: '' };
  }, [efficacyVerification]);
  
  useEffect(() => {
    setVerificationComments(safeEfficacyVerification.comments || investigationObjective || '');
    setVerificationResponsible(safeEfficacyVerification.verifiedBy || projectLeader || '');
    setVerificationDate(safeEfficacyVerification.verificationDate || '');
  }, [safeEfficacyVerification, investigationObjective, projectLeader]);

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
      setSelectedUserEmails(prev => prev.filter(email => email !== email));
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

  const handlePlanVerification = async () => {
    if (!verificationResponsible || !verificationDate) {
      toast({ title: "Campos requeridos", description: "Debe seleccionar un responsable y una fecha de verificación.", variant: "destructive" });
      return;
    }
    setIsVerifying(true);
    await onPlanEfficacyVerification(verificationResponsible, verificationDate);
    setIsVerifying(false);
  };
  
  const handleConfirmVerifyEfficacy = async () => {
    if (!verificationComments.trim()) {
      toast({ title: "Comentarios requeridos", description: "Debe ingresar sus comentarios de verificación.", variant: "destructive" });
      return;
    }
    setIsVerifying(true);
    await onVerifyEfficacy(verificationComments);
    setIsVerifying(false);
  };


  const canUserVerify = useMemo(() => {
    if (!userProfile) return false;
    if (userProfile.role === 'Super User') return true;
    if (userProfile.role === 'Admin') return true;
    // The responsible person for verification is now stored in `verifiedBy` during planning.
    return userProfile.name === safeEfficacyVerification.verifiedBy;
  }, [userProfile, safeEfficacyVerification.verifiedBy]);

  const isBusy = isSaving || isSendingEmails || isFinalizing || isGeneratingInsights || isVerifying;

  const isIshikawaWithData = ishikawaData && ishikawaData.some(cat => cat.causes.some(c => c.description.trim() !== ''));
  const is5WhysWithData = fiveWhysData && fiveWhysData.some(entry => entry.why.trim() !== '' && entry.becauses.some(b => b.description.trim() !== ''));
  const isCtmWithData = ctmData && ctmData.some(fm => fm.description.trim() !== '' && fm.hypotheses.some(h => h.description.trim() !== ''));

  return (
    <>
      <Card id="printable-report-area">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl sm:text-3xl font-bold font-headline text-primary">
            | Paso 5: Presentación de Resultados |
          </CardTitle>
          <CardDescription>Informe Final del Análisis de Causa Raíz. Evento ID: <span className="font-semibold text-primary">{eventId || "No generado"}</span></CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-4 md:px-6 py-6">
          <section>
            <SectionTitle title={`Título: Análisis del Incidente "${eventData.focusEventDescription || 'No Especificado'}"`} icon={FileText}/>
            <Separator className="my-2" />
          </section>

          <section>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
              <SectionTitle title="Introducción / Comentarios Finales" icon={BarChart3} className="mb-0 sm:mb-2"/>
              <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0 no-print">
                <Button
                  onClick={handleGenerateInsights}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={isBusy || isFinalized}
                  title="Generar un borrador para la sección de Comentarios Finales usando IA."
                >
                  {isGeneratingInsights ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Generar Borrador con IA
                </Button>
                {!isFinalized && (
                  <Button onClick={handleSaveFinalComments} size="sm" variant="outline" className="w-full sm:w-auto" disabled={isBusy}>
                    {isSaving && finalComments !== (eventData as any).finalComments && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" /> Guardar Comentarios
                  </Button>
                )}
              </div>
            </div>
            <Textarea
              id="finalComments"
              value={finalComments}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onFinalCommentsChange(e.target.value)}
              placeholder="Escriba aquí la introducción, resumen ejecutivo o comentarios finales del análisis..."
              rows={8}
              className="text-sm"
              disabled={isFinalized || isBusy}
            />
          </section>
          <Separator className="my-4" />

          <section>
            <SectionTitle title="Hechos" icon={Search}/>
            <SectionContent>
              <p className="font-medium mb-1">Evento Foco:</p>
              <p className="pl-2 mb-2">{eventData.focusEventDescription || "No definido."}</p>
              <p className="font-medium mb-1">Lugar:</p>
              <p className="pl-2 mb-2">{eventData.place || "No definido."}</p>
              <p className="font-medium mb-1 flex items-center"><HardHat className="mr-1.5 h-4 w-4 text-primary"/>Equipo Involucrado:</p>
              <p className="pl-2 mb-2">{eventData.equipo || "No definido."}</p>

              <p className="font-medium mt-2 mb-1">Líder del Proyecto:</p>
              <p className="pl-2 mb-2">{projectLeader || "No asignado."}</p>

              {(investigationSessions ?? []).length > 0 && (
                <>
                  <p className="font-medium mt-2 mb-1">Equipo de Investigación:</p>
                  <div className="pl-2 mb-2 space-y-2">
                    {investigationSessions.map((session, index) => (
                      <div key={session.id} className="text-xs border rounded-md p-2 bg-secondary/30">
                        <p className="font-semibold text-primary">Sesión #{index + 1} - Fecha: {format(parseISO(session.sessionDate), 'dd/MM/yyyy', { locale: es })}</p>
                        <ul className="list-disc pl-5 mt-1">
                          {session.members.map(member => (
                            <li key={member.id}>
                              {member.name} ({member.position}, {member.site}) - Rol: {member.role}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <p className="font-medium mt-2 mb-1">Descripción Detallada del Fenómeno:</p>
              <p className="pl-2 whitespace-pre-line">{analysisDetails}</p>

              <p className="font-medium mt-2 mb-1">Objetivo de la Investigación:</p>
              <p className="pl-2 mb-2 whitespace-pre-line">{investigationObjective || "No se definió un objetivo explícito para la investigación."}</p>
            </SectionContent>
          </section>
          <Separator className="my-4" />

          <section>
            <SectionTitle title="Análisis de Causas" icon={Settings} />
            <div className="space-y-4">
              {isIshikawaWithData && (
                <div className="text-xs space-y-2 border-l-2 pl-3">
                  <h4 className="font-semibold text-primary flex items-center mb-1 text-base"><Fish className="mr-2 h-4 w-4" />Análisis Ishikawa (Causas Validadas)</h4>
                  {ishikawaData.filter(cat => cat.causes.some(c => c.status === 'accepted')).map(category => (
                    <div key={category.id}>
                      <h5 className='font-semibold flex items-center'><Wrench className="mr-1.5 h-3.5 w-3.5" />{category.name}</h5>
                      <ul className='list-disc pl-5'>
                        {category.causes.filter(c => c.status === 'accepted').map(cause => (
                          <li key={cause.id} className='text-green-700 font-medium'>
                            {cause.description} {cause.validationMethod && <span className='text-muted-foreground italic text-xs'>- Justificación: {cause.validationMethod}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {is5WhysWithData && (
                <div className='text-xs space-y-3 border-l-2 pl-3'>
                  <h4 className="font-semibold text-primary flex items-center mb-2 text-base"><HelpIcon5Whys className="mr-2 h-4 w-4" />Análisis 5 Porqués</h4>
                  {fiveWhysData.map((entry, idx) => (
                    <div key={entry.id}>
                      <h5 className='font-semibold'><HelpIcon5Whys className="mr-1.5 h-3.5 w-3.5 inline-block"/>Por qué #{idx + 1}: {entry.why}</h5>
                      {entry.becauses.filter(b => b.description.trim()).map((because, bIdx) => (
                        <p key={because.id} className={cn('pl-4', because.status === 'accepted' ? 'text-green-700 font-medium' : because.status === 'rejected' ? 'text-red-700 line-through' : '')}>
                          <strong className="mr-1">Porque {idx+1}.{bIdx+1}:</strong>{because.description} {because.validationMethod && <span className='text-muted-foreground italic text-xs'>- Justificación: {because.validationMethod}</span>}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              
              {isCtmWithData && (
                  <div className='text-xs space-y-3 border-l-2 pl-3'>
                      <h4 className="font-semibold text-primary flex items-center mb-2 text-base"><CtmIcon className="mr-2 h-4 w-4" />Análisis de Árbol de Causas (CTM)</h4>
                      {ctmData.map((fm, fmIdx) => (
                          <div key={fm.id}>
                              <h5 className='font-semibold'><CtmIcon className="mr-1.5 h-3.5 w-3.5 inline-block"/>Modo de Falla #{fmIdx+1}: {fm.description}</h5>
                              {fm.hypotheses.filter(h => h.description.trim()).map((hyp, hIdx) => (
                                  <div key={hyp.id} className={cn('pl-4', hyp.status === 'rejected' && 'opacity-50')}>
                                      <p className='font-medium'>- Hipótesis #{hIdx+1}: {hyp.description}</p>
                                  </div>
                              ))}
                          </div>
                      ))}
                  </div>
              )}

              {analysisTechniqueNotes && analysisTechniqueNotes.trim() && (
                <div className="mt-4 border-l-2 pl-3">
                  <h4 className="font-semibold text-primary mb-1 text-base">Notas Adicionales del Análisis</h4>
                  <p className="whitespace-pre-wrap text-xs bg-secondary/30 p-2 rounded-md">{analysisTechniqueNotes}</p>
                </div>
              )}

              { !isIshikawaWithData && !is5WhysWithData && !isCtmWithData && !(analysisTechniqueNotes && analysisTechniqueNotes.trim()) && (
                  <p className="text-sm text-muted-foreground">No se ha registrado información en las técnicas de análisis.</p>
              )}
            </div>
          </section>

          <Separator className="my-4" />

          <section>
            <SectionTitle title="Causas Raíz" icon={Zap}/>
            <SectionContent>
              {identifiedRootCauses && identifiedRootCauses.length > 0 && identifiedRootCauses.some(rc => rc.description.trim()) ? (
                <ul className="list-disc pl-6 space-y-1">
                  {identifiedRootCauses.map((rc, index) => (
                    rc.description.trim() && <li key={rc.id}><strong>Causa Raíz #{index + 1}:</strong> {rc.description}</li>
                  ))}
                </ul>
              ) : (
                <p>No se han definido causas raíz específicas.</p>
              )}
            </SectionContent>
          </section>
          <Separator className="my-4" />

          <section>
            <SectionTitle title="Acciones Recomendadas" icon={Target}/>
            <SectionContent>
              {uniquePlannedActions.length > 0 ? (
                <>
                  <p className="font-medium mb-1">Plan de Acción Definido:</p>
                  <ul className="list-none pl-0 space-y-2">
                    {uniquePlannedActions.map(action => (
                      <li key={action.id} className="border-b pb-2 mb-2">
                        <span className="font-semibold">{action.description}</span>
                        <p className="text-xs text-muted-foreground">Responsable: {action.responsible || 'N/A'} | Fecha Límite: {action.dueDate || 'N/A'}</p>
                        {action.relatedRootCauseIds && action.relatedRootCauseIds.length > 0 && (
                          <div className="mt-1">
                            <span className="text-xs font-medium text-primary flex items-center"><Link2 className="h-3 w-3 mr-1"/>Aborda Causas Raíz:</span>
                            <ul className="list-disc pl-5 text-xs">
                              {action.relatedRootCauseIds.map(rcId => {
                                const cause = identifiedRootCauses.find(c => c.id === rcId);
                                return cause ? <li key={rcId}>{cause.description}</li> : <li key={rcId}>ID: {rcId} (no encontrada)</li>;
                              })}
                            </ul>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p>No se han definido acciones planificadas.</p>
              )}
            </SectionContent>
          </section>
          <Separator className="my-4" />

          <section>
            <SectionTitle title="Verificación de la Eficacia del Análisis" icon={ShieldCheck} />
            <Card className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700">
              <CardContent className="pt-4 space-y-3">
                 <div>
                  <h4 className="font-semibold text-primary flex items-center mb-1"><Target className="mr-2 h-4 w-4" />Objetivo de la Investigación a Verificar</h4>
                  <p className="text-sm p-2 bg-background rounded-md whitespace-pre-wrap">{investigationObjective || "No se definió un objetivo explícito para la investigación."}</p>
                </div>
                {safeEfficacyVerification.status === 'verified' ? (
                  <div className="space-y-2">
                     <p className="font-semibold text-primary flex items-center"><Users className="mr-2 h-4 w-4" />Responsable de Verificación: <span className="font-normal text-foreground ml-1">{safeEfficacyVerification.verifiedBy || 'No asignado'}</span></p>
                    <p className="font-semibold text-primary flex items-center"><CalendarCheck className="mr-2 h-4 w-4" />Fecha de Verificación: <span className="font-normal text-foreground ml-1">{safeEfficacyVerification.verifiedAt ? format(parseISO(safeEfficacyVerification.verifiedAt), "dd 'de' MMMM, yyyy", {locale: es}) : "Fecha no registrada"}</span></p>
                    <p className="text-sm font-semibold text-green-600">Eficacia Verificada</p>
                    <p className="text-sm mt-1">Comentarios de Verificación:</p>
                    <p className="text-sm p-2 bg-background rounded-md whitespace-pre-wrap">{safeEfficacyVerification.comments}</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="verification-responsible">Responsable de Verificación</Label>
                        <Select
                          value={verificationResponsible}
                          onValueChange={setVerificationResponsible}
                          disabled={isBusy}
                        >
                          <SelectTrigger id="verification-responsible">
                            <SelectValue placeholder="-- Seleccione responsable --" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableUsers.map(user => (
                              <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="verification-date">Fecha Planificada</Label>
                        <Input
                          id="verification-date"
                          type="date"
                          value={verificationDate}
                          onChange={(e) => setVerificationDate(e.target.value)}
                          min={minDateForVerification}
                          disabled={isBusy}
                        />
                      </div>
                    </div>
                    {canUserVerify ? (
                      <div className="space-y-2 pt-2">
                        <Label htmlFor="verification-comments">Comentarios de Verificación (al confirmar)</Label>
                        <Textarea
                          id="verification-comments"
                          value={verificationComments}
                          onChange={(e) => setVerificationComments(e.target.value)}
                          placeholder="Se cumple el objetivo, no se registran nuevos eventos"
                          rows={4}
                          disabled={isBusy}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={handlePlanVerification} disabled={isBusy || !verificationResponsible || !verificationDate} variant="secondary">
                            <Save className="mr-2 h-4 w-4"/> Guardar Planificación
                          </Button>
                          <Button onClick={handleConfirmVerifyEfficacy} disabled={isBusy || !verificationComments.trim() || !safeEfficacyVerification.verificationDate}>
                            <CheckSquare className="mr-2 h-4 w-4" /> Confirmar Verificación
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-2">Esperando planificación y verificación por parte del Líder de Proyecto ({projectLeader}) o un Administrador.</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </section>
          {/* === NUEVA SECCIÓN: Lecciones Aprendidas === */}
          <section>
            <SectionTitle title="Lecciones Aprendidas" icon={Lightbulb} />
            <SectionContent>
              <Textarea
                id="lecciones-aprendidas"
                value={leccionesAprendidas}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onLeccionesAprendidasChange(e.target.value)}
                placeholder="Describe aquí las lecciones aprendidas relevantes, sugerencias para el futuro o recomendaciones institucionales..."
                rows={5}
                className="text-sm"
                disabled={isFinalized || isBusy}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Comparte aprendizajes, buenas prácticas o mejoras detectadas durante el análisis que puedan ser útiles para la organización.
              </p>
            </SectionContent>
          </section>
          <Separator className="my-4" />

          {/* ...Anexos igual que antes... */}
          <section>
            <SectionTitle title="Anexos" icon={FileText}/>
            {(timelineEvents?.length > 0) || (brainstormingIdeas?.length > 0) || (preservedFacts?.length > 0) ? (
              <div className="space-y-4">
                {timelineEvents && timelineEvents.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-primary flex items-center mb-2"><CalendarClock className="mr-2 h-4 w-4" />Línea de Tiempo</h4>
                    <ul className="list-disc pl-5 space-y-1 text-xs border rounded-md p-3 bg-secondary/20">
                      {timelineEvents.map(event => (
                        <li key={event.id}>
                          <strong>{format(parseISO(event.datetime), 'dd/MM/yyyy HH:mm', { locale: es })}:</strong> {event.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {brainstormingIdeas && brainstormingIdeas.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-primary flex items-center mb-2"><Lightbulb className="mr-2 h-4 w-4" />Lluvia de Ideas</h4>
                    <ul className="list-disc pl-5 space-y-1 text-xs border rounded-md p-3 bg-secondary/20">
                      {brainstormingIdeas.map(idea => (
                        <li key={idea.id}>
                          <strong>[{idea.type || 'Sin tipo'}]:</strong> {idea.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {preservedFacts && preservedFacts.length > 0 && (
                  <div>
                    <p className="font-medium mt-2 mb-1">Hechos Preservados / Documentación Adjunta:</p>
                    <ul className="list-disc pl-6 space-y-1 text-xs">
                      {preservedFacts.map(fact => (
                        <li key={fact.id}>
                          <strong>{fact.userGivenName || fact.fileName || 'Documento sin nombre especificado'}</strong> (Categoría: {fact.category || 'N/A'})
                          {fact.description && <p className="pl-2 text-muted-foreground italic">"{fact.description}"</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay anexos para mostrar.</p>
            )}
          </section>
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
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center"><Mail className="mr-2 h-5 w-5" />Enviar Informe por Correo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder="Buscar por nombre o correo..."
              value={emailSearchTerm}
              onChange={(e) => setEmailSearchTerm(e.target.value)}
            />
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all-emails"
                checked={areAllFilteredUsersSelected && filteredUsers.length > 0}
                onCheckedChange={(checked) => handleSelectAllUsers(checked as boolean)}
                disabled={filteredUsers.length === 0}
              />
              <Label htmlFor="select-all-emails" className="text-sm font-medium">
                Seleccionar Todos ({filteredUsers.length}) / Deseleccionar Todos
              </Label>
            </div>
            <ScrollArea className="h-[200px] w-full rounded-md border p-2">
              {availableUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hay usuarios configurados para enviar correos.</p>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map(user => (
                  <div key={user.id} className="flex items-center space-x-2 p-1.5 hover:bg-accent rounded-md">
                    <Checkbox
                      id={`user-email-${user.id}`}
                      checked={user.email ? selectedUserEmails.includes(user.email) : false}
                      onCheckedChange={(checked) => {
                        if (user.email) handleUserSelectionChange(user.email, checked as boolean);
                      }}
                      disabled={!user.email}
                    />
                    <Label htmlFor={`user-email-${user.id}`} className="text-sm cursor-pointer flex-grow">
                      {user.name} <span className="text-xs text-muted-foreground">({user.email || 'Sin correo'})</span>
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No hay usuarios que coincidan con la búsqueda.</p>
              )}
            </ScrollArea>
            <div>
              <p className="text-xs text-muted-foreground">
                Seleccionados: {selectedUserEmails.length} de {availableUsers ? availableUsers.length : 0} usuarios.
              </p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSendingEmails}>Cancelar</Button>
            </DialogClose>
            <Button type="button" onClick={handleConfirmSendEmail} disabled={isSendingEmails}>
              {isSendingEmails && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
