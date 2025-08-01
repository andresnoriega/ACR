'use client';
import type { FC, ChangeEvent } from 'react';
import { useState, useMemo, useEffect } from 'react';
import type { RCAEventData, DetailedFacts, AnalysisTechnique, IshikawaData, CTMData, PlannedAction, IdentifiedRootCause, FullUserProfile, PreservedFact, Site, InvestigationSession, EfficacyVerification } from '@/types/rca'; // Added PreservedFact, InvestigationSession
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Printer, Send, CheckCircle, FileText, BarChart3, Search, Settings, Zap, Target, Users, Mail, Link2, Loader2, Save, Sparkles, HardHat, ShieldCheck } from 'lucide-react'; // Added HardHat
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";
import { sendEmailAction } from '@/app/actions';
import { generateRcaInsights, type GenerateRcaInsightsInput } from '@/ai/flows/generate-rca-insights';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';

interface Step5ResultsProps {
  eventId: string;
  eventData: RCAEventData;
  availableSites: Site[];
  projectLeader: string;
  investigationSessions: InvestigationSession[]; // <-- Added Prop
  detailedFacts: DetailedFacts;
  analysisDetails: string;
  analysisTechnique: AnalysisTechnique;
  analysisTechniqueNotes: string;
  ishikawaData: IshikawaData;
  ctmData: CTMData;
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
  investigationObjective: string; // <-- Added Prop
  efficacyVerification: EfficacyVerification; // <-- Added Prop
  onVerifyEfficacy: (comments: string, verificationDate: string) => Promise<void>;
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

// --- EfficacyVerificationDialog Component ---
const EfficacyVerificationDialog: FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (comments: string, verificationDate: string) => void;
  isProcessing: boolean;
}> = ({ isOpen, onClose, onConfirm, isProcessing }) => {
  const [comments, setComments] = useState('');
  const [verificationDate, setVerificationDate] = useState('');

  const handleConfirm = () => {
    if (comments.trim() && verificationDate) {
      onConfirm(comments, verificationDate);
    }
  };

  useEffect(() => {
    if (isOpen) {
        setComments('');
        setVerificationDate(new Date().toISOString().split('T')[0]); // Default to today
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar Verificación de Eficacia</DialogTitle>
          <DialogDescription>
            Por favor, añada sus comentarios y la fecha de la verificación.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <Label htmlFor="efficacy-date">Fecha de Verificación <span className="text-destructive">*</span></Label>
            <Input 
              id="efficacy-date"
              type="date"
              value={verificationDate}
              onChange={(e) => setVerificationDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="efficacy-comments">Comentarios de Verificación <span className="text-destructive">*</span></Label>
            <Textarea
              id="efficacy-comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Ej: Se confirmó en terreno que la nueva guarda está instalada y el personal fue capacitado en el nuevo procedimiento. El objetivo se considera cumplido."
              rows={4}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!comments.trim() || !verificationDate || isProcessing}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar y Verificar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export const Step5Results: FC<Step5ResultsProps> = ({
  eventId,
  eventData,
  availableSites,
  projectLeader,
  investigationSessions, // <-- Destructure prop
  detailedFacts,
  analysisDetails,
  analysisTechnique,
  analysisTechniqueNotes,
  ishikawaData,
  ctmData,
  identifiedRootCauses,
  plannedActions,
  preservedFacts, // Destructure preservedFacts
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
  const [isVerificationDialogOpen, setIsVerificationDialogOpen] = useState(false);

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

  const formatIshikawaForReport = () => {
    let content = "";
    ishikawaData.forEach(category => {
      content += `\nCategoría ${category.name}:\n`;
      if (category.causes.length > 0) {
        category.causes.forEach((cause, index) => {
          if (cause.description.trim()) content += `  - Causa ${index + 1}: ${cause.description.trim()}\n`;
        });
      } else {
        content += "  (Sin causas identificadas para esta categoría)\n";
      }
    });
    return content;
  };

  const formatCTMForReport = () => {
    const formatLevel = (items: any[], prefix = "", levelName: string): string => {
      let content = "";
      items.forEach((item, idx) => {
        if (item.description.trim()) {
          content += `${prefix}- ${levelName} ${idx + 1}: ${item.description.trim()}\n`;
          if (item.hypotheses?.length) content += formatLevel(item.hypotheses, prefix + "  ", "Hipótesis");
          else if (item.physicalCauses?.length) content += formatLevel(item.physicalCauses, prefix + "  ", "Causa Física");
          else if (item.humanCauses?.length) content += formatLevel(item.humanCauses, prefix + "  ", "Causa Humana");
          else if (item.latentCauses?.length) content += formatLevel(item.latentCauses, prefix + "  ", "Causa Latente");
        }
      });
      return content;
    };
    const ctmTree = formatLevel(ctmData, "", "Modo de Falla");
    return ctmTree.trim() ? ctmTree : "(No se definieron elementos para el Árbol de Causas)";
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
        equipo: eventData.equipo || undefined, // Add equipo to AI input
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
      if(result.success) emailsSentCount++;
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
            // If event has no company, show users with no company to avoid data leaks
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

  const handleConfirmVerification = async (comments: string, verificationDate: string) => {
    setIsVerifying(true);
    await onVerifyEfficacy(comments, verificationDate);
    setIsVerificationDialogOpen(false);
    setIsVerifying(false);
  };

  const canUserVerify = useMemo(() => {
    if (!userProfile) return false;
    if (userProfile.role === 'Super User') return true;
    if (userProfile.role === 'Admin') return true;
    return userProfile.name === projectLeader;
  }, [userProfile, projectLeader]);
  
  const isBusy = isSaving || isSendingEmails || isFinalizing || isGeneratingInsights || isVerifying;

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
              <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0">
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
              
              {investigationSessions && investigationSessions.length > 0 && (
                <>
                  <p className="font-medium mt-2 mb-1">Equipo de Investigación:</p>
                  <div className="pl-2 mb-2 space-y-2">
                    {investigationSessions.map((session, index) => (
                      <div key={session.id} className="text-xs border rounded-md p-2 bg-secondary/30">
                        <p className="font-semibold text-primary">Sesión #{index + 1} - Fecha: {format(parseISO(session.sessionDate), 'dd/MM/yyyy')}</p>
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
              <p className="pl-2 whitespace-pre-line">{analysisDetails || formatDetailedFacts()}</p>
              
              {preservedFacts && preservedFacts.length > 0 && (
                <>
                  <p className="font-medium mt-2 mb-1">Hechos Preservados / Documentación Adjunta:</p>
                  <ul className="list-disc pl-6 space-y-1 text-xs">
                    {preservedFacts.map(fact => (
                      <li key={fact.id}>
                        <strong>{fact.userGivenName || fact.fileName || 'Documento sin nombre especificado'}</strong> (Categoría: {fact.category || 'N/A'})
                        {fact.description && <p className="pl-2 text-muted-foreground italic">"{fact.description}"</p>}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </SectionContent>
          </section>
          <Separator className="my-4" />

          <section>
            <SectionTitle title="Análisis" icon={Settings}/>
            <SectionContent>
              <p className="font-medium mt-2 mb-1">Objetivo de la Investigación:</p>
              <p className="pl-2 mb-2 whitespace-pre-line">{investigationObjective || "No se definió un objetivo explícito para la investigación."}</p>
            
              <p className="font-medium mb-1">Análisis Preliminar Realizado:</p>
              <p className="pl-2 mb-2 whitespace-pre-line">{analysisDetails || "No se proporcionaron detalles del análisis preliminar."}</p>

              <p className="font-medium mb-1">Técnica de Análisis Principal Utilizada:</p>
              <p className="pl-2 mb-2 font-semibold">{analysisTechnique || "No seleccionada"}</p>

              {analysisTechnique === 'Ishikawa' && (
                <>
                  <p className="font-medium mt-2 mb-1">Detalles del Diagrama de Ishikawa:</p>
                  <pre className="pl-2 whitespace-pre-wrap text-xs bg-secondary/30 p-2 rounded-md">{formatIshikawaForReport()}</pre>
                </>
              )}
              {analysisTechnique === 'CTM' && (
                <>
                  <p className="font-medium mt-2 mb-1">Detalles del Árbol de Causas (CTM):</p>
                  <pre className="pl-2 whitespace-pre-wrap text-xs bg-secondary/30 p-2 rounded-md">{formatCTMForReport()}</pre>
                </>
              )}
              {analysisTechniqueNotes.trim() && (
                   <>
                  <p className="font-medium mt-2 mb-1">Notas Adicionales del Análisis ({analysisTechnique || 'General'}):</p>
                  <p className="pl-2 whitespace-pre-line">{analysisTechniqueNotes}</p>
                </>
              )}
            </SectionContent>
          </section>
          <Separator className="my-4" />

          <section>
            <SectionTitle title="Causas Raíz" icon={Zap}/>
            <SectionContent>
              {identifiedRootCauses.length > 0 ? (
                <ul className="list-disc pl-6 space-y-1">
                  {identifiedRootCauses.map((rc, index) => (
                    rc.description.trim() && <li key={rc.id}><strong>Causa Raíz #{index + 1}:</strong> {rc.description}</li>
                  ))}
                   {identifiedRootCauses.every(rc => !rc.description.trim()) && <p>Se han añadido entradas de causa raíz pero ninguna tiene descripción.</p>}
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
          
          {isFinalized && (
            <>
                <Separator className="my-4" />
                <section>
                    <SectionTitle title="Verificación de la Eficacia del Análisis" icon={ShieldCheck} />
                    <Card className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700">
                        <CardContent className="pt-4">
                            <p className="text-sm font-semibold mb-1">Objetivo de la Investigación a Verificar:</p>
                            <p className="text-sm text-muted-foreground italic mb-3">"{investigationObjective || 'No se definió un objetivo explícito para la investigación.'}"</p>
                            
                            {efficacyVerification.status === 'verified' ? (
                                <div>
                                    <p className="text-sm font-semibold text-green-600">Eficacia Verificada por: {efficacyVerification.verifiedBy} el {efficacyVerification.verificationDate ? format(parseISO(efficacyVerification.verificationDate), "dd 'de' MMMM, yyyy") : "Fecha no registrada"}</p>
                                    <p className="text-sm mt-1">Comentarios de Verificación:</p>
                                    <p className="text-sm p-2 bg-background rounded-md whitespace-pre-wrap">{efficacyVerification.comments}</p>
                                </div>
                            ) : (
                                <>
                                    {canUserVerify ? (
                                        <Button onClick={() => setIsVerificationDialogOpen(true)} disabled={isBusy}>
                                            Confirmar Verificación de Eficacia
                                        </Button>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Esperando verificación por parte del Líder de Proyecto ({projectLeader}) o un Administrador.</p>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </section>
            </>
          )}

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
      
      <EfficacyVerificationDialog
        isOpen={isVerificationDialogOpen}
        onClose={() => setIsVerificationDialogOpen(false)}
        onConfirm={handleConfirmVerification}
        isProcessing={isVerifying}
      />
    </>
  );
};
