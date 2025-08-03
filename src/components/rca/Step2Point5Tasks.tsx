'use client';
import { useState, useMemo, FC } from 'react';
import type { FullUserProfile, RCAAnalysisDocument, ActionPlan } from '@/types/rca';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ListTodo, CheckSquare, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid as isValidDate } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// This is a simplified version of the "Mis Tareas" page logic, adapted for the analysis flow.
// It focuses on showing the assigned tasks for the current analysis and allowing evidence management.

interface Step2Point5TasksProps {
  allRcaDocuments: RCAAnalysisDocument[];
  availableUsers: FullUserProfile[];
  userProfile: FullUserProfile | null;
  loadingAuth: boolean;
  isSaving: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSaveAnalysis: (showToast?: boolean) => Promise<void>;
}

export const Step2Point5Tasks: FC<Step2Point5TasksProps> = ({
  allRcaDocuments,
  availableUsers,
  userProfile,
  loadingAuth,
  isSaving,
  onPrevious,
  onNext,
  onSaveAnalysis
}) => {
  const [selectedPlan, setSelectedPlan] = useState<ActionPlan | null>(null);
  const { toast } = useToast();

  const assignedActionPlans = useMemo(() => {
    if (loadingAuth || !userProfile || !userProfile.name || allRcaDocuments.length === 0) {
      return [];
    }
    const plans: ActionPlan[] = [];
    // Since we are in the context of a single analysis, allRcaDocuments should only have one item.
    const rcaDoc = allRcaDocuments[0]; 
    if (rcaDoc && rcaDoc.plannedActions && rcaDoc.plannedActions.length > 0) {
      rcaDoc.plannedActions.forEach(pa => {
        // We show all tasks for the current analysis, not just for the logged-in user.
        const validation = rcaDoc.validations?.find(v => v.actionId === pa.id);
        let estado: ActionPlan['estado'] = 'Pendiente';
        if (validation?.status === 'validated') estado = 'Completado';
        else if (validation?.status === 'rejected') estado = 'Rechazado';
        else if (pa.markedAsReadyAt) estado = 'En Validación';

        plans.push({
          id: pa.id,
          _originalRcaDocId: rcaDoc.eventData.id,
          _originalActionId: pa.id,
          accionResumen: pa.description.substring(0, 50) + (pa.description.length > 50 ? "..." : ""),
          estado,
          plazoLimite: pa.dueDate && isValidDate(parseISO(pa.dueDate)) ? format(parseISO(pa.dueDate), 'dd/MM/yyyy', { locale: es }) : 'N/A',
          asignadoPor: rcaDoc.projectLeader || 'Sistema',
          validatorName: rcaDoc.projectLeader || 'N/A',
          tituloDetalle: rcaDoc.eventData.focusEventDescription || 'Sin título',
          descripcionDetallada: pa.description,
          responsableDetalle: pa.responsible,
          codigoRCA: rcaDoc.eventData.id,
          evidencias: pa.evidencias || [],
          userComments: pa.userComments || '',
        });
      });
    }
    return plans;
  }, [userProfile, allRcaDocuments, loadingAuth]);

  const handleSelectPlan = (plan: ActionPlan) => {
    if (selectedPlan?.id === plan.id) {
      setSelectedPlan(null);
    } else {
      setSelectedPlan(plan);
    }
  };

  if (loadingAuth) {
    return <div className="flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Paso 2.5: Tareas y Evidencias</CardTitle>
        <CardDescription>
            Gestione las tareas del plan de acción para este análisis. Seleccione una tarea para ver sus detalles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[5%]"></TableHead>
              <TableHead className="w-[45%]">Acción (Resumen)</TableHead>
              <TableHead className="w-[25%]">Responsable</TableHead>
              <TableHead className="w-[15%]">Estado</TableHead>
              <TableHead className="w-[10%]">Plazo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignedActionPlans.length > 0 ? assignedActionPlans.map(plan => (
              <TableRow 
                key={plan.id}
                onClick={() => handleSelectPlan(plan)}
                className={cn("cursor-pointer", selectedPlan?.id === plan.id && "bg-accent/50")}
              >
                <TableCell><Checkbox checked={selectedPlan?.id === plan.id} /></TableCell>
                <TableCell className="font-medium">{plan.accionResumen}</TableCell>
                <TableCell>{plan.responsableDetalle}</TableCell>
                <TableCell>
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold",
                    plan.estado === 'Pendiente' && 'bg-orange-100 text-orange-700',
                    plan.estado === 'En Validación' && 'bg-blue-100 text-blue-700',
                    plan.estado === 'Completado' && 'bg-green-100 text-green-700',
                    plan.estado === 'Rechazado' && 'bg-destructive/10 text-destructive'
                  )}>{plan.estado}</span>
                </TableCell>
                <TableCell>{plan.plazoLimite}</TableCell>
              </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                        No hay planes de acción definidos para este análisis.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
        
        {selectedPlan && (
          <Card className="shadow-lg animate-in fade-in-50 duration-300 mt-4">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-primary">Detalle del Plan Seleccionado</CardTitle>
              <CardDescription>ID Acción: {selectedPlan.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div><Label className="font-semibold">Descripción Completa de la Acción:</Label><p className="whitespace-pre-line bg-muted/20 p-2 rounded-md">{selectedPlan.descripcionDetallada}</p></div>
              <div><Label className="font-semibold">Evidencias Adjuntas:</Label>
                {selectedPlan.evidencias.length > 0 ? (
                    <ul className="space-y-1.5 list-disc pl-5 mt-1">
                        {selectedPlan.evidencias.map(ev => (<li key={ev.id}>{ev.userGivenName || ev.nombre}</li>))}
                    </ul>
                ) : <p className="text-xs text-muted-foreground">No hay evidencias adjuntas.</p>}
              </div>
              <div className="pt-2"><Label className="font-semibold text-primary mb-1">[Mis Comentarios Generales para la Tarea]</Label>
                <Textarea value={selectedPlan.userComments || ''} placeholder="Añada sus comentarios sobre el progreso o finalización de esta tarea..." rows={3} className="text-sm" disabled />
                <p className="text-xs text-muted-foreground mt-1">La edición de tareas se realiza desde la sección "Mis Tareas".</p>
              </div>
            </CardContent>
          </Card>
        )}

      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={onPrevious} variant="outline" disabled={isSaving}>Anterior</Button>
        <Button onClick={onNext} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Siguiente
        </Button>
      </CardFooter>
    </Card>
  );
};
