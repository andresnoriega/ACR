
'use client';
import type { FC, ChangeEvent } from 'react';
import { useState, useMemo } from 'react';
import type { RCAEventData, DetailedFacts, AnalysisTechnique, IshikawaData, FiveWhysData, CTMData, PlannedAction, IdentifiedRootCause } from '@/types/rca';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Printer, Send, CheckCircle, FileText, BarChart3, Search, Settings, Zap, Target, Users, Mail } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";

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
  availableUsers: Array<{ id: string; name: string; email: string; }>;
  isFinalized: boolean;
  onMarkAsFinalized: () => void;
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
}) => {
  const { toast } = useToast();
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [selectedUserEmails, setSelectedUserEmails] = useState<string[]>([]);
  const [emailSearchTerm, setEmailSearchTerm] = useState('');

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
  
  const handleOpenEmailDialog = () => {
    setSelectedUserEmails([]);
    setEmailSearchTerm('');
    setIsEmailDialogOpen(true);
  };

  const handleConfirmSendEmail = () => {
    if (selectedUserEmails.length === 0) {
      toast({ title: "No se seleccionaron destinatarios", description: "Por favor, seleccione al menos un destinatario.", variant: "destructive" });
      return;
    }
    const selectedUsersData = availableUsers.filter(u => selectedUserEmails.includes(u.email));
    const recipientNames = selectedUsersData.map(u => u.name).join(', ');
    toast({ title: "Simulación de Envío de Correo", description: `Correo "enviado" a: ${recipientNames || 'seleccionados'}. Destinatarios: ${selectedUserEmails.join(', ')}`});
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
            <SectionTitle title="Introducción" icon={BarChart3}/>
            <Textarea
              id="finalComments"
              value={finalComments}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onFinalCommentsChange(e.target.value)}
              placeholder="Escriba aquí la introducción, resumen ejecutivo o comentarios finales del análisis..."
              rows={5}
              className="text-sm"
            />
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
              {plannedActions.length > 0 ? (
                <>
                  <p className="font-medium mb-1">Plan de Acción Definido:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    {plannedActions.map(action => (
                      <li key={action.id}>
                        {action.description} (Responsable: {action.responsible || 'N/A'}, Fecha Límite: {action.dueDate || 'N/A'})
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
          <Button onClick={onPrintReport} variant="default" className="w-full sm:w-auto">
            <Printer className="mr-2 h-4 w-4" /> Exportar a PDF
          </Button>
          <Button onClick={handleOpenEmailDialog} variant="outline" className="w-full sm:w-auto">
            <Send className="mr-2 h-4 w-4" /> Enviar por correo
          </Button>
          <Button 
            onClick={onMarkAsFinalized} 
            variant="secondary" 
            className="w-full sm:w-auto"
            disabled={isFinalized}
          >
            <CheckCircle className="mr-2 h-4 w-4" /> 
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
                checked={areAllFilteredUsersSelected}
                onCheckedChange={(checked) => handleSelectAllUsers(checked as boolean)} 
              />
              <Label htmlFor="select-all-emails" className="text-sm font-medium">
                Seleccionar Todos ({filteredUsers.length}) / Deseleccionar Todos
              </Label>
            </div>
            <ScrollArea className="h-[200px] w-full rounded-md border p-2">
              {filteredUsers.length > 0 ? (
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
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="button" onClick={handleConfirmSendEmail}>Enviar (Simulación)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
