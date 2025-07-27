'use client';
import { FC, ChangeEvent, useState } from 'react';
import type { IshikawaData, IshikawaCategory, IshikawaCause } from '@/types/rca';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, CornerDownRight, Users, Network, Wrench, Box, Ruler, Leaf, Check, X, Loader2, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ValidationDialog } from './ValidationDialog';

// --- Ayuda Contextual Ishikawa ---
const IshikawaContextualHelp: FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed top-8 right-8 z-50 max-w-sm bg-background border rounded shadow-xl p-5 text-sm animate-in fade-in transition-all">
    <div className="flex gap-2 items-center mb-2">
      <HelpCircle className="h-5 w-5 text-blue-600" />
      <span className="font-bold text-blue-700">Ayuda Contextual: Ishikawa</span>
    </div>
    <div className="mb-3">
      El diagrama de Ishikawa (Espina de Pescado) te ayuda a analizar todas las causas que contribuyen al problema principal. ¿Cómo usarlo?
    </div>
    <ul className="list-disc ml-5 space-y-1 mb-3">
      <li><b><Users className="inline h-4 w-4 mr-1" /> Mano de Obra:</b> Causas relacionadas con personas, equipos humanos y capacitación.</li>
      <li><b><Network className="inline h-4 w-4 mr-1" /> Método:</b> Procesos, procedimientos, instrucciones, formas de trabajo.</li>
      <li><b><Wrench className="inline h-4 w-4 mr-1" /> Maquinaria:</b> Estado, mantenimiento y operación de equipos y herramientas.</li>
      <li><b><Box className="inline h-4 w-4 mr-1" /> Material:</b> Calidad, cantidad y características del material usado.</li>
      <li><b><Ruler className="inline h-4 w-4 mr-1" /> Medición:</b> Instrumentos, calibración y procedimientos de medición.</li>
      <li><b><Leaf className="inline h-4 w-4 mr-1" /> Entorno:</b> Condiciones ambientales, temperatura, humedad, etc.</li>
      <li>
        Usa <PlusCircle className="inline h-4 w-4" /> para agregar causas, <Trash2 className="inline h-4 w-4 text-destructive" /> para eliminarlas, y valida (<Check className="inline h-4 w-4 text-green-600" />) o rechaza (<X className="inline h-4 w-4 text-red-600" />) cada causa con justificación.
      </li>
    </ul>
    <div className="mb-2 text-xs text-muted-foreground">
      Tip: Para validar/rechazar una causa, registra la justificación: inspección, entrevista, revisión documental, etc.
    </div>
    <Button size="sm" className="w-full mt-2" variant="secondary" onClick={onClose}>
      Cerrar ayuda
    </Button>
  </div>
);

// --- Tabla Resumen de Causas Validadas ---
const IshikawaSummaryTable: FC<{ ishikawaData: IshikawaData }> = ({ ishikawaData }) => (
  <div className="mt-8 border rounded-lg bg-secondary/10 p-4 max-w-2xl mx-auto">
    <h4 className="font-bold text-lg mb-4 text-primary">Resumen de Causas Validadas</h4>
    <table className="min-w-full border text-sm bg-background">
      <thead>
        <tr className="bg-secondary">
          <th className="py-2 px-3 border-b text-left">M</th>
          <th className="py-2 px-3 border-b text-left">Causa Validada</th>
          <th className="py-2 px-3 border-b text-left">Justificación</th>
        </tr>
      </thead>
      <tbody>
        {ishikawaData.map(category =>
          category.causes
            .filter(cause => cause.status === 'accepted')
            .map(cause => (
              <tr key={cause.id}>
                <td className="py-2 px-3 border-b font-semibold">{category.name}</td>
                <td className="py-2 px-3 border-b">{cause.description}</td>
                <td className="py-2 px-3 border-b">{cause.validationMethod || "-"}</td>
              </tr>
            ))
        )}
        {ishikawaData.every(cat => !cat.causes.some(c => c.status === 'accepted')) && (
          <tr>
            <td colSpan={3} className="py-4 text-center text-muted-foreground">
              No hay causas validadas.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

// --- Main Ishikawa Component ---
interface IshikawaDiagramInteractiveProps {
  focusEventDescription: string;
  ishikawaData: IshikawaData;
  onSetIshikawaData: (data: IshikawaData) => void;
}

const categoryIcons: { [key: string]: React.ElementType } = {
  manpower: Users,
  method: Network,
  machinery: Wrench,
  material: Box,
  measurement: Ruler,
  environment: Leaf,
};

export const IshikawaDiagramInteractive: FC<IshikawaDiagramInteractiveProps> = ({
  focusEventDescription,
  ishikawaData,
  onSetIshikawaData,
}) => {
  const [validationState, setValidationState] = useState<{ categoryId: string; causeId: string; status: 'accepted' | 'rejected' } | null>(null);
  const [isProcessingValidation, setIsProcessingValidation] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const handleAddCause = (categoryId: string) => {
    const newData = ishikawaData.map(category => {
      if (category.id === categoryId) {
        const newCause: IshikawaCause = {
          id: `cause-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          description: '',
          status: 'pending',
        };
        return { ...category, causes: [...category.causes, newCause] };
      }
      return category;
    });
    onSetIshikawaData(newData);
  };

  const handleUpdateCause = (categoryId: string, causeId: string, value: string) => {
    const newData = ishikawaData.map(category => {
      if (category.id === categoryId) {
        const updatedCauses = category.causes.map(cause =>
          cause.id === causeId ? { ...cause, description: value } : cause
        );
        return { ...category, causes: updatedCauses };
      }
      return category;
    });
    onSetIshikawaData(newData);
  };

  const handleRemoveCause = (categoryId: string, causeId: string) => {
    const newData = ishikawaData.map(category => {
      if (category.id === categoryId) {
        const filteredCauses = category.causes.filter(cause => cause.id !== causeId);
        return { ...category, causes: filteredCauses };
      }
      return category;
    });
    onSetIshikawaData(newData);
  };

  const handleToggleCauseStatus = (categoryId: string, causeId: string, status: 'accepted' | 'rejected') => {
    const category = ishikawaData.find(c => c.id === categoryId);
    const cause = category?.causes.find(c => c.id === causeId);
    if (!cause) return;

    if (cause.status === status) {
      // Toggle back to pending if clicking the same status
      const newData = ishikawaData.map(cat => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            causes: cat.causes.map(c => c.id === causeId ? { ...c, status: 'pending', validationMethod: undefined } : c)
          };
        }
        return cat;
      });
      onSetIshikawaData(newData);
    } else {
      setValidationState({ categoryId, causeId, status });
    }
  };

  const handleConfirmValidation = (method: string) => {
    if (!validationState) return;
    setIsProcessingValidation(true);
    const { categoryId, causeId, status } = validationState;

    const newData = ishikawaData.map(cat => {
      if (cat.id === categoryId) {
        const updatedCauses = cat.causes.map(c => {
          if (c.id === causeId) {
            return { ...c, status, validationMethod: method };
          }
          return c;
        });
        return { ...cat, causes: updatedCauses };
      }
      return cat;
    });

    onSetIshikawaData(newData);
    setIsProcessingValidation(false);
    setValidationState(null);
  };

  const topCategories = ishikawaData.slice(0, 3);
  const bottomCategories = ishikawaData.slice(3, 6);

  const renderCategoryGroup = (categories: IshikawaCategory[]) => (
    <div className={`grid grid-cols-1 md:grid-cols-${categories.length} gap-4 mb-4 relative`}>
      {categories.map((category) => {
        const Icon = categoryIcons[category.id] || CornerDownRight;
        return(
          <Card key={category.id} className="flex flex-col">
            <CardHeader className="pb-2 pt-3 px-4 bg-secondary/30">
              <CardTitle className="text-base font-semibold text-primary flex items-center">
                  <Icon className="mr-2 h-4 w-4" /> 
                  {category.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2 flex-grow">
              {category.causes.map((cause, causeIndex) => (
                <div key={cause.id} className="space-y-1">
                  <div className="flex items-start space-x-2">
                    <CornerDownRight className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
                    <div className="flex-grow space-y-1">
                      <Input
                        id={`cause-${category.id}-${cause.id}`}
                        value={cause.description}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          handleUpdateCause(category.id, cause.id, e.target.value)
                        }
                        placeholder={`Causa #${causeIndex + 1}`}
                        className={cn("h-8 text-xs",
                          cause.status === 'accepted' && 'border-green-500 ring-green-500',
                          cause.status === 'rejected' && 'border-red-500 ring-red-500 opacity-70'
                        )}
                      />
                      {cause.validationMethod && <p className="text-xs text-muted-foreground italic">Justificación: {cause.validationMethod}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveCause(category.id, cause.id)}
                      aria-label="Eliminar causa"
                      className="h-8 w-8 shrink-0"
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                   <div className="flex items-center gap-1 pl-6">
                      <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => handleToggleCauseStatus(category.id, cause.id, 'accepted')}>
                          <Check className={cn("h-3 w-3", cause.status === 'accepted' ? "text-green-600" : "text-muted-foreground")} />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => handleToggleCauseStatus(category.id, cause.id, 'rejected')}>
                          <X className={cn("h-3 w-3", cause.status === 'rejected' ? "text-red-600" : "text-muted-foreground")} />
                      </Button>
                   </div>
                </div>
              ))}
              <Button
                onClick={() => handleAddCause(category.id)}
                variant="outline"
                size="sm"
                className="w-full mt-2 text-xs"
              >
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Añadir Causa
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  );

  return (
    <>
      <div className="space-y-6 mt-4 p-4 border rounded-lg shadow-sm bg-background relative">
        {/* Botón de ayuda contextual */}
        <div className="absolute right-2 top-2 z-40 flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            title="Ver ayuda contextual"
            onClick={() => setShowHelp(true)}
            aria-label="Ayuda contextual"
          >
            <HelpCircle className="h-5 w-5 text-blue-600" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="ml-2"
            onClick={() => setShowSummary(true)}
            aria-label="Generar resumen"
          >
            Generar Resumen
          </Button>
        </div>
        {showHelp && (
          <IshikawaContextualHelp onClose={() => setShowHelp(false)} />
        )}
        <h3 className="text-lg font-semibold font-headline text-center text-primary">
          Diagrama de Ishikawa (Espina de Pescado)
        </h3>
        {renderCategoryGroup(topCategories)}
        <div className="flex items-center my-4">
          <div className="flex-grow border-t-2 border-gray-400"></div>
          <Card className="mx-4 shrink-0 shadow-lg border-primary">
              <CardContent className="p-3">
                  <p className="text-sm font-semibold text-center text-primary-foreground bg-primary px-3 py-1 rounded">
                      {focusEventDescription || "Evento Foco (no definido en Paso 1)"}
                  </p>
              </CardContent>
          </Card>
          <div className="flex-grow border-t-2 border-gray-400"></div>
        </div>
        {renderCategoryGroup(bottomCategories)}
        {showSummary && (
          <IshikawaSummaryTable ishikawaData={ishikawaData} />
        )}
      </div>
      <ValidationDialog
        isOpen={!!validationState}
        onOpenChange={() => setValidationState(null)}
        onConfirm={handleConfirmValidation}
        isProcessing={isProcessingValidation}
        title="Confirmar Validación/Rechazo de Causa"
        description="Por favor, ingrese el método o justificación utilizado para validar o rechazar esta causa."
        placeholder="Ej: Inspección visual, análisis de datos, entrevista, etc."
      />
    </>
  );
};