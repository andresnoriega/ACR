'use client';
import type { FC } from 'react';
import { useState, useCallback } from 'react';
import type { FiveWhysData, FiveWhysEntry, FiveWhysCause } from '@/types/rca';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, HelpCircle, Check, X, AlertTriangle, RotateCcw, HelpCircle as HelpIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { ValidationDialog } from './ValidationDialog';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface FiveWhysInteractiveProps {
  fiveWhysData: FiveWhysData;
  onSetFiveWhysData: (data: FiveWhysData) => void;
  eventFocusDescription: string;
}

type Analysis = {
  id: string;
  data: FiveWhysData;
};

export const FiveWhysInteractive: FC<FiveWhysInteractiveProps> = ({
  fiveWhysData,
  onSetFiveWhysData,
  eventFocusDescription,
}) => {
  const { toast } = useToast();

  const [showHelp, setShowHelp] = useState(false);
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);
  const [diagnosticTechInfo, setDiagnosticTechInfo] = useState<string | null>(null);

  // Inicialización robusta del primer "Por qué"
  const getInitialWhy = () =>
    eventFocusDescription
      ? `¿Por qué ocurrió: ${eventFocusDescription}?`
      : '';

  // Múltiples análisis
  const [analyses, setAnalyses] = useState<Analysis[]>(() => {
    const initialWhy = getInitialWhy();
    let initialData = JSON.parse(JSON.stringify(fiveWhysData || []));
    if (!initialData.length) {
      initialData.push({
        id: `5why-${Date.now()}`,
        why: initialWhy,
        becauses: [{ id: `cause-${Date.now()}`, description: '', status: 'pending' }]
      });
    }
    // Si el primer why está vacío o incorrecto, lo corregimos
    if (!initialData[0].why || initialData[0].why === "") {
      initialData[0].why = initialWhy;
    }
    return [{
      id: `analysis-${Date.now()}`,
      data: initialData.map((entry: any) => ({
        ...entry,
        becauses: Array.isArray(entry.becauses) ? entry.becauses : []
      }))
    }];
  });

  // Para el ValidationDialog
  const [validationState, setValidationState] = useState<{
    analysisIdx: number;
    entryId: string;
    causeId: string;
    status: 'accepted' | 'rejected';
  } | null>(null);
  const [isProcessingValidation, setIsProcessingValidation] = useState(false);

  // Actualiza un análisis específico
  const updateAnalysis = useCallback((idx: number, newData: FiveWhysData) => {
    try {
      const checkedData = newData.map(entry => ({
        ...entry,
        becauses: Array.isArray(entry.becauses) ? entry.becauses : []
      }));
      setAnalyses(prev =>
        prev.map((a, i) => i === idx ? { ...a, data: checkedData } : a)
      );
      if (idx === 0 && typeof onSetFiveWhysData === "function") {
        onSetFiveWhysData(checkedData);
      }
      setDiagnosticError(null);
      setDiagnosticTechInfo(null);
    } catch (e) {
      setDiagnosticError("Error al actualizar el estado interno del componente.");
      setDiagnosticTechInfo(e instanceof Error ? e.message : String(e));
      toast({
        title: "Diagnóstico automático",
        description: "Ocurrió un error al actualizar el estado. Revisa la consola para detalles.",
        variant: "destructive"
      });
    }
  }, [onSetFiveWhysData, toast]);

  // Funciones para un análisis
  const handleAddEntry = (idx: number, fromCauseDescription?: string) => {
    try {
      const newWhy = fromCauseDescription
        ? `¿Por qué: "${fromCauseDescription.substring(0, 70)}..."?`
        : '';
      const newEntry: FiveWhysEntry = {
        id: `5why-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        why: newWhy,
        becauses: [{ id: `cause-${Date.now()}`, description: '', status: 'pending' }],
      };
      const nextData = [...analyses[idx].data, newEntry];
      updateAnalysis(idx, nextData);
    } catch (e) {
      setDiagnosticError("Error inesperado al agregar 'Por qué'.");
      setDiagnosticTechInfo(e instanceof Error ? e.message : String(e));
      toast({
        title: "Diagnóstico automático",
        description: "Error inesperado al agregar 'Por qué'.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateWhy = (idx: number, id: string, value: string) => {
    try {
      const newData = analyses[idx].data.map(entry =>
        entry.id === id ? { ...entry, why: value } : entry
      );
      updateAnalysis(idx, newData);
    } catch (e) {
      setDiagnosticError("Error al actualizar un 'Por qué'.");
      setDiagnosticTechInfo(e instanceof Error ? e.message : String(e));
    }
  };

  const handleRemoveEntry = (idx: number, id: string) => {
    try {
      if (analyses[idx].data.length <= 1) {
        toast({
          title: "Acción no permitida",
          description: "Debe haber al menos una entrada en los 5 Porqués.",
          variant: "destructive"
        });
        return;
      }
      const newData = analyses[idx].data.filter(entry => entry.id !== id);
      updateAnalysis(idx, newData);
    } catch (e) {
      setDiagnosticError("Error inesperado al eliminar 'Por qué'.");
      setDiagnosticTechInfo(e instanceof Error ? e.message : String(e));
    }
  };

  const handleAddBecause = (idx: number, entryId: string) => {
    try {
      const nextData = analyses[idx].data.map(entry => {
        if (entry.id === entryId) {
          const newBecause: FiveWhysCause = { id: `cause-${Date.now()}`, description: '', status: 'pending' };
          const updatedBecauses = Array.isArray(entry.becauses) ? [...entry.becauses, newBecause] : [newBecause];
          return { ...entry, becauses: updatedBecauses };
        }
        return entry;
      });

      const entryBefore = analyses[idx].data.find(e => e.id === entryId);
      const entryAfter = nextData.find(e => e.id === entryId);

      if (
        entryBefore && entryAfter &&
        Array.isArray(entryBefore.becauses) &&
        Array.isArray(entryAfter.becauses) &&
        entryAfter.becauses.length === entryBefore.becauses.length
      ) {
        setDiagnosticError("No se pudo agregar un nuevo 'porque'.");
        setDiagnosticTechInfo("Estado actual: " + JSON.stringify(analyses[idx].data));
        toast({
          title: "Diagnóstico automático",
          description: "No se pudo agregar un nuevo 'porque'.",
          variant: "destructive"
        });
      }
      updateAnalysis(idx, nextData);
    } catch (e) {
      setDiagnosticError("Error inesperado al agregar 'porque'.");
      setDiagnosticTechInfo(e instanceof Error ? e.message : String(e));
      toast({
        title: "Diagnóstico automático",
        description: "Error inesperado al agregar 'porque'.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateBecause = (idx: number, entryId: string, causeId: string, value: string) => {
    try {
      const newData = analyses[idx].data.map(entry => {
        if (entry.id === entryId) {
          const updatedBecauses = Array.isArray(entry.becauses)
            ? entry.becauses.map(cause =>
                cause.id === causeId ? { ...cause, description: value } : cause
              )
            : [];
          return { ...entry, becauses: updatedBecauses };
        }
        return entry;
      });
      updateAnalysis(idx, newData);
    } catch (e) {
      setDiagnosticError("Error al actualizar un 'porque'.");
      setDiagnosticTechInfo(e instanceof Error ? e.message : String(e));
    }
  };

  const handleRemoveBecause = (idx: number, entryId: string, causeId: string) => {
    try {
      const newData = analyses[idx].data.map(entry => {
        if (entry.id === entryId) {
          if (Array.isArray(entry.becauses) && entry.becauses.length > 1) {
            const updatedBecauses = entry.becauses.filter(c => c.id !== causeId);
            return { ...entry, becauses: updatedBecauses };
          }
        }
        return entry;
      });
      updateAnalysis(idx, newData);
    } catch (e) {
      setDiagnosticError("Error al eliminar un 'porque'.");
      setDiagnosticTechInfo(e instanceof Error ? e.message : String(e));
    }
  };

  // Solo valida/rechaza, NO genera automáticamente nuevo "Por qué"
  const handleToggleCauseStatus = (analysisIdx: number, entryId: string, causeId: string, status: 'accepted' | 'rejected') => {
    try {
      const entry = analyses[analysisIdx].data.find(e => e.id === entryId);
      const cause = entry?.becauses?.find(c => c.id === causeId);
      if (!cause) return;
      if (cause.status === status) {
        const newData = analyses[analysisIdx].data.map(e => {
          if (e.id === entryId) {
            return {
              ...e,
              becauses: Array.isArray(e.becauses)
                ? e.becauses.map(c => c.id === causeId ? { ...c, status: 'pending', validationMethod: undefined } : c)
                : []
            };
          }
          return e;
        });
        updateAnalysis(analysisIdx, newData);
      } else {
        setValidationState({ analysisIdx, entryId, causeId, status });
      }
    } catch (e) {
      setDiagnosticError("Error al cambiar el estado de validación/rechazo.");
      setDiagnosticTechInfo(e instanceof Error ? e.message : String(e));
    }
  };

  // Valida/rechaza, no agrega automáticamente nuevo "Por qué"
  const handleConfirmValidation = (method: string) => {
    try {
      if (!validationState) return;
      setIsProcessingValidation(true);
      const { analysisIdx, entryId, causeId, status } = validationState;
      const newData = analyses[analysisIdx].data.map(entry => {
        if (entry.id === entryId) {
          const updatedBecauses = Array.isArray(entry.becauses)
            ? entry.becauses.map(cause => {
                if (cause.id === causeId) {
                  return { ...cause, status, validationMethod: method };
                }
                return cause;
              })
            : [];
          return { ...entry, becauses: updatedBecauses };
        }
        return entry;
      });
      updateAnalysis(analysisIdx, newData);
      setIsProcessingValidation(false);
      setValidationState(null);
    } catch (e) {
      setDiagnosticError("Error inesperado en confirmación de validación/rechazo.");
      setDiagnosticTechInfo(e instanceof Error ? e.message : String(e));
      setIsProcessingValidation(false);
      setValidationState(null);
      toast({
        title: "Diagnóstico automático",
        description: "Error en validación/rechazo.",
        variant: "destructive"
      });
    }
  };

  const handleValidationDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setValidationState(null);
      setIsProcessingValidation(false);
    }
  }, []);

  // Detectar si todas las causas están rechazadas en el análisis
  const isAllRejected = (idx: number) => {
    const flatCauses = analyses[idx].data.flatMap(e => Array.isArray(e.becauses) ? e.becauses : []);
    return flatCauses.length > 0 && flatCauses.every(c => c.status === 'rejected');
  };
  // Detectar si al menos una causa está rechazada en el análisis
  const isAnyRejected = (idx: number) => {
    const flatCauses = analyses[idx].data.flatMap(e => Array.isArray(e.becauses) ? e.becauses : []);
    return flatCauses.length > 0 && flatCauses.some(c => c.status === 'rejected');
  };

  // El botón SIEMPRE visible, pero sólo habilitado cuando al menos una causa está rechazada en el último análisis
  const newAnalysisButtonEnabled = isAnyRejected(analyses.length - 1);

  // Crear nuevo análisis 5 porqués (reiniciar)
  const handleStartNewAnalysis = () => {
    if (!newAnalysisButtonEnabled) return;
    const initialWhy = getInitialWhy();
    const newAnalysis: Analysis = {
      id: `analysis-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      data: [{
        id: `5why-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        why: initialWhy,
        becauses: [{ id: `cause-${Date.now()}`, description: '', status: 'pending' }]
      }]
    };
    setAnalyses(prev => [...prev, newAnalysis]);
    toast({
      title: "Análisis reiniciado",
      description: "Puedes comenzar un nuevo análisis de los 5 Porqués.",
      variant: "default"
    });
  };

  // Ayuda contextual
  const HelpPopover = () => (
    <div className="absolute right-0 top-12 z-30 w-[330px] bg-background border rounded shadow-md p-4 text-sm">
      <div className="flex gap-2 items-center mb-2">
        <HelpIcon className="h-5 w-5 text-blue-600" />
        <span className="font-bold text-blue-700">¿Cómo usar el análisis de 5 Porqués?</span>
      </div>
      <ul className="list-disc ml-5 space-y-1">
        <li>Comienza con una pregunta clave sobre el evento o problema.</li>
        <li>Responde con una causa directa ("Porque...").</li>
        <li>Puedes agregar más causas si hay varias hipótesis.</li>
        <li>Valida o rechaza cada causa según tu investigación.</li>
        <li>Si todas las causas son rechazadas, inicia un nuevo análisis para explorar otra hipótesis.</li>
        <li>Continúa hasta llegar a la causa raíz comprobada.</li>
      </ul>
      <div className="mt-3 text-xs text-muted-foreground">
        <b>Tip:</b> Usa el botón <RotateCcw className="inline h-4 w-4" /> "Iniciar nuevo análisis" para comenzar otro ciclo si es necesario.
      </div>
      <Button className="mt-4 w-full" size="sm" variant="secondary" onClick={() => setShowHelp(false)}>
        Cerrar ayuda
      </Button>
    </div>
  );

  // Visual
  return (
    <>
      {diagnosticError && (
        <div className="bg-red-100 text-red-800 p-2 border-b border-red-400 font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Diagnóstico automático: {diagnosticError}
          {diagnosticTechInfo && (
            <details className="ml-4">
              <summary className="cursor-pointer text-xs text-red-600 underline">Ver detalles técnicos</summary>
              <pre className="text-xs max-w-xl overflow-x-auto">{diagnosticTechInfo}</pre>
            </details>
          )}
        </div>
      )}
      <div className="relative w-full">
        {/* Botón de ayuda contextual y popover */}
        <div className="absolute right-2 top-2 z-30 flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  title="Ver ayuda contextual"
                  onClick={() => setShowHelp(!showHelp)}
                  aria-label="Ayuda contextual"
                >
                  <HelpIcon className="h-5 w-5 text-blue-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={8}>Ayuda contextual sobre el método 5 Porqués</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {/* Botón "Iniciar nuevo análisis" SIEMPRE visible */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleStartNewAnalysis}
                  className="text-xs px-3 shadow"
                  title="Iniciar nuevo análisis"
                  disabled={!newAnalysisButtonEnabled}
                >
                  <RotateCcw className="mr-1 h-4 w-4" />
                  Iniciar nuevo análisis
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={8}>
                Comienza un nuevo ciclo de los 5 Porqués si al menos una causa ha sido rechazada.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {showHelp && <HelpPopover />}
        <div className="flex gap-6 flex-col md:flex-row w-full">
          {analyses.map((analysis, idx) => (
            <div key={analysis.id} className="flex-1 min-w-[320px] max-w-[550px]">
              <div className={cn(
                "space-y-4 p-4 border rounded-lg shadow-sm",
                idx === 0 ? "bg-background" : "bg-secondary/10"
              )}>
                <div className="flex items-center justify-between">
                  <h3 className={cn("text-lg font-semibold font-headline", idx === 0 ? "text-primary" : "text-muted-foreground flex items-center")}>
                    <HelpCircle className="mr-2 h-5 w-5" />
                    {`5 Porqués${idx === 0 ? '' : ` (Nuevo intento)`}`}
                  </h3>
                  {isAllRejected(idx) && (
                    <span className="text-xs text-red-700 font-semibold">Todas las causas rechazadas</span>
                  )}
                </div>
                <div className="space-y-4">
                  {(analysis.data || []).map((entry, index) => (
                    <Card key={entry.id} className="p-4 bg-secondary/30">
                      <div className="flex justify-between items-center mb-2">
                        <p className="font-semibold text-primary">Por qué #{index + 1}</p>
                        {analysis.data.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleRemoveEntry(idx, entry.id)}
                            aria-label="Eliminar este paso"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div>
                          <Label htmlFor={`why-${analysis.id}-${entry.id}`}>¿Por qué?</Label>
                          <Textarea
                            id={`why-${analysis.id}-${entry.id}`}
                            value={entry.why}
                            onChange={(e) => handleUpdateWhy(idx, entry.id, e.target.value)}
                            placeholder="Pregunte '¿Por qué...?'"
                            rows={2}
                          />
                          <div className="mt-1 text-xs text-muted-foreground">
                            Ejemplo: ¿Por qué ocurrió la falla en la máquina? Escribe la pregunta clave que inicia el análisis.
                          </div>
                        </div>
                        <div className="space-y-2 pt-2">
                          {Array.isArray(entry.becauses) && entry.becauses.map((cause, causeIndex) => (
                            <div key={cause.id} className="pl-4 border-l-2 space-y-1">
                              <Label htmlFor={`because-${analysis.id}-${entry.id}-${cause.id}`} className="text-xs font-medium">Porque {index + 1}.{causeIndex + 1}</Label>
                              <div className="flex items-start gap-2">
                                <div className="flex-grow space-y-1">
                                  <Textarea
                                    id={`because-${analysis.id}-${entry.id}-${cause.id}`}
                                    value={cause.description}
                                    onChange={(e) => handleUpdateBecause(idx, entry.id, cause.id, e.target.value)}
                                    placeholder="Responda con la causa directa..."
                                    rows={1}
                                    className={cn("text-sm",
                                      cause.status === 'accepted' && 'border-green-500 ring-green-500 bg-green-50',
                                      cause.status === 'rejected' && 'border-red-500 ring-red-500 bg-red-50 opacity-80'
                                    )}
                                  />
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    Ejemplo: Porque el sensor no envió señal, Porque el operador no recibió alerta, etc.
                                  </div>
                                  {cause.validationMethod && <p className="text-xs text-muted-foreground italic pl-1">Justificación: {cause.validationMethod}</p>}
                                  {cause.status === 'accepted' && (
                                    <Button size="sm" variant="secondary" className="text-xs h-7 mt-1" onClick={() => handleAddEntry(idx, cause.description)}>
                                      <PlusCircle className="mr-1 h-3 w-3" /> Añadir Siguiente "Por qué"
                                    </Button>
                                  )}
                                </div>
                                <div className="flex flex-col gap-1">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleToggleCauseStatus(idx, entry.id, cause.id, 'accepted')} title="Validar Causa">
                                          <Check className={cn("h-3.5 w-3.5", cause.status === 'accepted' ? "text-green-600" : "text-muted-foreground")} />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="right" sideOffset={8}>Marca la causa como validada. Se requiere justificar.</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleToggleCauseStatus(idx, entry.id, cause.id, 'rejected')} title="Rechazar Causa">
                                          <X className={cn("h-3.5 w-3.5", cause.status === 'rejected' ? "text-red-600" : "text-muted-foreground")} />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="right" sideOffset={8}>Rechaza la causa si no es válida.</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveBecause(idx, entry.id, cause.id)} disabled={!Array.isArray(entry.becauses) || entry.becauses.length <= 1} title="Eliminar Causa">
                                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="right" sideOffset={8}>Eliminar esta causa.</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </div>
                            </div>
                          ))}
                          <Button size="sm" variant="outline" className="text-xs h-7 ml-4" onClick={() => handleAddBecause(idx, entry.id)}>
                            <PlusCircle className="mr-1 h-3 w-3" /> Añadir Porque
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <ValidationDialog
        isOpen={!!validationState}
        onOpenChange={handleValidationDialogOpenChange}
        onConfirm={handleConfirmValidation}
        isProcessing={isProcessingValidation}
        title="Confirmar Validación/Rechazo de Causa"
        description="Por favor, ingrese el método o justificación utilizado para validar o rechazar esta causa."
        placeholder="Ej: Inspección visual, análisis de datos, entrevista, etc."
      />
    </>
  );
};