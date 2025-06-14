
'use client';
import type { FC, ChangeEvent } from 'react';
import { useState, useMemo } from 'react'; // Added useMemo
import type { RCAEventData, DetailedFacts, AnalysisTechnique, IshikawaData, FiveWhysData, CTMData, PlannedAction, IdentifiedRootCause, FullUserProfile } from '@/types/rca';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Printer, Send, CheckCircle, FileText, BarChart3, Search, Settings, Zap, Target, Users, Mail, Link2, Loader2, Save, Wand2 } from 'lucide-react'; // Added Wand2
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";
import { sendEmailAction } from '@/app/actions';
import { generateRcaInsights, type GenerateRcaInsightsInput } from '@/ai/flows/generate-rca-insights'; // AI Flow

interface Step5ResultsProps {
  eventId: string;
  eventData: RCAEventData;
  detailedFacts: DetailedFacts;
  analysisDetails: string;
  analysisTechnique: AnalysisTechnique;
  analysisTechniqueNotes: string;
  ishikawaData: IshikawaData;
  fiveWhysData: FiveWhysData;
  ctmData: CTMData;
  identifiedRootCauses: IdentifiedRootCause[];
  plannedActions: PlannedAction[];
  finalComments: string;
  onFinalCommentsChange: (value: string) => void;
  onPrintReport: () => void;
  availableUsers: FullUserProfile[];
  isFinalized: boolean;
  onMarkAsFinalized: () => Promise<void>;
  onSaveAnalysis: (showToast?: boolean) => Promise<void>;
  isSaving: boolean;
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
  detailedFacts,
  analysisDetails,
  analysisTechnique,
  analysisTechniqueNotes,
  ishikawaData,
  fiveWhysData,
  ctmData,
  identifiedRootCauses,
  plannedActions,
  finalComments,
  onFinalCommentsChange,
  onPrintReport,
  availableUsers,
  isFinalized,
  onMarkAsFinalized,
  onSaveAnalysis,
  isSaving,
}) => {
  const { toast } = useToast();
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [selectedUserEmails, setSelectedUserEmails] = useState<string[]>([]);
  const [emailSearchTerm, setEmailSearchTerm] = useState('');
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false); // AI State

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

  const formatFiveWhysForReport = () => {
    let content = "";
    fiveWhysData.forEach((entry, index) => {
      if (entry.why.trim() || entry.because.trim()) {
        content += `\nNivel ${index + 1}:\n  Por qué?: ${entry.why.trim() || '(No especificado)'}\n  Porque: ${entry.because.trim() || '(No especificado)'}\n`;
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

  const generateReportText = (): string => {
    let report = `INFORME FINAL DE ANÁLISIS DE CAUSA RAÍZ\n`;
    report += `Evento ID: ${eventId || "No generado"}\n`;
    report += `Título: Análisis del Incidente "${eventData.focusEventDescription || 'No Especificado'}"\n\n`;
    report += `INTRODUCCIÓN / COMENTARIOS FINALES:\n${finalComments || "No proporcionados."}\n\n`;
    report += `HECHOS:\n`;
    report += `  Evento Foco: ${eventData.focusEventDescription || "No definido."}\n`;
    report += `  Descripción Detallada del Fenómeno:\n  ${formatDetailedFacts().replace(/\n/g, '\n  ')}\n\n`;
    report += `ANÁLISIS:\n`;
    report += `  Análisis Preliminar Realizado:\n  ${analysisDetails || "No se proporcionaron detalles."}\n`;
    report += `  Técnica de Análisis Principal Utilizada: ${analysisTechnique || "No seleccionada"}\n`;
    if (analysisTechnique === 'Ishikawa') report += `  Detalles del Diagrama de Ishikawa:\n${formatIshikawaForReport().replace(/\n/g, '\n  ')}\n`;
    if (analysisTechnique === 'WhyWhy') report += `  Detalles del Análisis de los 5 Porqués:\n${formatFiveWhysForReport().replace(/\n/g, '\n  ')}\n`;
    if (analysisTechnique === 'CTM') report += `  Detalles del Árbol de Causas (CTM):\n${formatCTMForReport().replace(/\n/g, '\n  ')}\n`;
    if (analysisTechniqueNotes.trim()) report += `  Notas Adicionales del Análisis (${analysisTechnique || 'General'}):\n  ${analysisTechniqueNotes.replace(/\n/g, '\n  ')}\n`;
    report += `\nCAUSAS RAÍZ IDENTIFICADAS:\n`;
    if (identifiedRootCauses.length > 0 && identifiedRootCauses.some(rc => rc.description.trim())) {
      identifiedRootCauses.forEach((rc, index) => {
        if (rc.description.trim()) report += `  - Causa Raíz #${index + 1}: ${rc.description}\n`;
      });
    } else {
      report += `  No se han definido causas raíz específicas.\n`;
    }
    report += `\nACCIONES RECOMENDADAS (PLAN DE ACCIÓN):\n`;
    if (uniquePlannedActions.length > 0) { 
      uniquePlannedActions.forEach(action => {
        report += `  - Acción: ${action.description}\n`;
        report += `    Responsable: ${action.responsible || 'N/A'} | Fecha Límite: ${action.dueDate || 'N/A'}\n`;
        if (action.relatedRootCauseIds && action.relatedRootCauseIds.length > 0) {
          report += `    Aborda Causas Raíz:\n`;
          action.relatedRootCauseIds.forEach(rcId => {
            const cause = identifiedRootCauses.find(c => c.id === rcId);
            report += `      * ${cause ? cause.description : `ID: ${rcId} (no encontrada)`}\n`;
          });
        }
      });
    } else {
      report += `  No se han definido acciones planificadas.\n`;
    }
    return report;
  };

  const handleGenerateInsights = async () => {
    setIsGeneratingInsights(true);
    try {
      const factsSummary = formatDetailedFacts();
      const rootCauses = identifiedRootCauses.map(rc => rc.description).filter(desc => desc.trim() !== '');
      const actionsSummary = uniquePlannedActions.map(pa => pa.description).filter(desc => desc.trim() !== '');

      const input: GenerateRcaInsightsInput = {
        focusEventDescription: eventData.focusEventDescription || "No especificado",
        detailedFactsSummary: factsSummary,
        analysisTechnique: analysisTechnique || undefined,
        analysisTechniqueNotes: analysisTechniqueNotes || undefined,
        identifiedRootCauses: rootCauses.length > 0 ? rootCauses : ["No se identificaron causas raíz específicas."],
        plannedActionsSummary: actionsSummary.length > 0 ? actionsSummary : ["No se definieron acciones planificadas específicas."],
      };

      const result = await generateRcaInsights(input);
      onFinalCommentsChange(result.summary);
      toast({
        title: "Resumen Generado con IA",
        description: "El borrador del resumen ha sido insertado en 'Comentarios Finales'. Por favor, revíselo y edítelo según sea necesario.",
      });
    } catch (error) {
      console.error("Error generating RCA insights:", error);
      toast({
        title: "Error al Generar Resumen con IA",
        description: (error as Error).message || "No se pudo generar el resumen. Inténtelo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingInsights(false);
    }
  };

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

    const reportText = generateReportText();
    const emailSubject = `Informe RCA: ${eventData.focusEventDescription || `Evento ID ${eventId}`}`;
    let emailsSentCount = 0;

    for (const email of selectedUserEmails) {
      const result = await sendEmailAction({
        to: email,
        subject: emailSubject,
        body: `Estimado/a,\n\nAdjunto (simulado) encontrará el informe de Análisis de Causa Raíz para el evento: "${eventData.focusEventDescription || eventId}".\n\n--- INICIO DEL INFORME ---\n${reportText}\n--- FIN DEL INFORME ---\n\nSaludos,\nSistema RCA Assistant`,
      });
      if(result.success) emailsSentCount++;
    }

    toast({
        title: "Envío de Informes (Simulación)",
        description: `${emailsSentCount} de ${selectedUserEmails.length} correos fueron procesados "exitosamente". Verifique la consola del servidor.`
    });
    setIsSendingEmails(false);
    setIsEmailDialogOpen(false);
  };


  const filteredUsers = useMemo(() => {
    if (!availableUsers || !Array.isArray(availableUsers)) return [];
    return availableUsers.filter(user =>
      user.name.toLowerCase().includes(emailSearchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(emailSearchTerm.toLowerCase())
    );
  }, [availableUsers, emailSearchTerm]);

  const handleSelectAllUsers = (checked: boolean) => {
    if (checked) {
      setSelectedUserEmails(filteredUsers.map(user => user.email));
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
    return filteredUsers.every(user => selectedUserEmails.includes(user.email));
  }, [filteredUsers, selectedUserEmails]);

  const handleFinalize = async () => {
    setIsFinalizing(true);
    await onMarkAsFinalized();
    setIsFinalizing(false);
  };

  const handleSaveFinalComments = async () => {
    await onSaveAnalysis();
  };

  const isBusy = isSaving || isSendingEmails || isFinalizing || isGeneratingInsights;

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
            <div className="flex justify-between items-center mb-2">
              <SectionTitle title="Introducción / Comentarios Finales" icon={BarChart3} className="mb-0"/>
              {!isFinalized && (
                <Button 
                  onClick={handleGenerateInsights} 
                  size="sm" 
                  variant="outline" 
                  disabled={isBusy}
                  className="ml-auto"
                >
                  {isGeneratingInsights ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  Generar Borrador con IA
                </Button>
              )}
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
            {!isFinalized && (
                <Button onClick={handleSaveFinalComments} size="sm" variant="outline" className="mt-2" disabled={isBusy}>
                    {isSaving && finalComments !== (eventData as any).finalComments && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" /> Guardar Comentarios
                </Button>
            )}
          </section>
          <Separator className="my-4" />

          <section>
            <SectionTitle title="Hechos" icon={Search}/>
            <SectionContent>
              <p className="font-medium mb-1">Evento Foco:</p>
              <p className="pl-2 mb-2">{eventData.focusEventDescription || "No definido."}</p>
              <p className="font-medium mb-1">Descripción Detallada del Fenómeno:</p>
              <p className="pl-2 whitespace-pre-line">{formatDetailedFacts()}</p>
            </SectionContent>
          </section>
          <Separator className="my-4" />

          <section>
            <SectionTitle title="Análisis" icon={Settings}/>
            <SectionContent>
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
              {analysisTechnique === 'WhyWhy' && (
                <>
                  <p className="font-medium mt-2 mb-1">Detalles del Análisis de los 5 Porqués:</p>
                  <pre className="pl-2 whitespace-pre-wrap text-xs bg-secondary/30 p-2 rounded-md">{formatFiveWhysForReport()}</pre>
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
                      checked={selectedUserEmails.includes(user.email)}
                      onCheckedChange={(checked) => handleUserSelectionChange(user.email, checked as boolean)}
                    />
                    <Label htmlFor={`user-email-${user.id}`} className="text-sm cursor-pointer flex-grow">
                      {user.name} <span className="text-xs text-muted-foreground">({user.email})</span>
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
              Enviar (Simulación)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
