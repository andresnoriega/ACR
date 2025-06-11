
'use client';
import type { FC, ChangeEvent } from 'react';
import type { RCAEventData, DetailedFacts, AnalysisTechnique, IshikawaData, FiveWhysData, CTMData, PlannedAction } from '@/types/rca';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, Send, CheckCircle, FileText, BarChart3, Search, Settings, Zap, Target } from 'lucide-react';
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
  // aiInsights: AIInsights | null; // AIInsights removed
  plannedActions: PlannedAction[];
  finalComments: string; 
  onFinalCommentsChange: (value: string) => void;
  onPrintReport: () => void;
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
  // aiInsights, // AIInsights removed
  plannedActions,
  finalComments,
  onFinalCommentsChange,
  onPrintReport,
}) => {
  const { toast } = useToast();

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
  
  const handleSendEmail = () => {
    toast({ title: "Función no implementada", description: "La opción 'Enviar por correo' aún no está disponible.", variant: "default"});
  };
  
  const handleFinalize = () => {
     toast({ title: "Proceso Finalizado", description: `El análisis RCA para el evento ${eventId || 'actual'} ha sido marcado como finalizado.`, className: "bg-primary text-primary-foreground"});
  };


  return (
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
            {/* AIInsights related summary removed */}
          </SectionContent>
        </section>
        <Separator className="my-4" />

        <section>
          <SectionTitle title="Causas Raíz" icon={Zap}/>
          <SectionContent>
            {/* AIInsights related root causes removed */}
            <p>Detalle aquí las causas raíz identificadas por su análisis o utilice la sección de Introducción/Comentarios finales.</p>
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
            {/* AIInsights related recommendations removed */}
            {plannedActions.length === 0 && (
                <p>No se han definido acciones recomendadas.</p>
            )}
          </SectionContent>
        </section>

      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-center items-center gap-3 mt-6 pt-4 border-t no-print">
        <Button onClick={onPrintReport} variant="default" className="w-full sm:w-auto">
          <Printer className="mr-2 h-4 w-4" /> Exportar a PDF
        </Button>
        <Button onClick={handleSendEmail} variant="outline" className="w-full sm:w-auto">
          <Send className="mr-2 h-4 w-4" /> Enviar por correo
        </Button>
        <Button onClick={handleFinalize} variant="secondary" className="w-full sm:w-auto">
          <CheckCircle className="mr-2 h-4 w-4" /> Finalizar
        </Button>
      </CardFooter>
    </Card>
  );
};
