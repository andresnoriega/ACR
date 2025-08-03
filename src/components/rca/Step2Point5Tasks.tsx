'use client';
import { useState, useMemo, FC } from 'react';
import type { FullUserProfile, RCAAnalysisDocument, ActionPlan } from '@/types/rca';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid as isValidDate } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListTodo, CheckSquare, ShieldCheck } from 'lucide-react';

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

  const assignedActionPlans = useMemo(() => {
    if (loadingAuth || !userProfile || !userProfile.name || allRcaDocuments.length === 0) {
      return [];
    }
    const plans: ActionPlan[] = [];
    allRcaDocuments.forEach(rcaDoc => {
      if (rcaDoc.plannedActions && rcaDoc.plannedActions.length > 0) {
        rcaDoc.plannedActions.forEach(pa => {
          if (pa.responsible === userProfile.name) {
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
              // ... other fields as needed
            });
          }
        });
      }
    });
    return plans;
  }, [userProfile, allRcaDocuments, loadingAuth]);

  if (loadingAuth) {
    return <div className="flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Paso 2.5: Tareas y Evidencias</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="assigned" className="w-full">
          <TabsList>
            <TabsTrigger value="assigned" className="flex items-center gap-2">
              <ListTodo className="h-4 w-4" /> Mis Tareas Asignadas ({assignedActionPlans.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="assigned">
            <Card>
              <CardHeader>
                <CardTitle>Planes de Acción Asignados a Mí</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead></TableHead>
                      <TableHead>Acción (Resumen)</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Plazo Límite</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedActionPlans.map(plan => (
                      <TableRow key={plan.id}>
                        <TableCell><Checkbox /></TableCell>
                        <TableCell>{plan.accionResumen}</TableCell>
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
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={onPrevious} variant="outline" disabled={isSaving}>Anterior</Button>
        <Button onClick={onNext} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4" />}
          Siguiente
        </Button>
      </CardFooter>
    </Card>
  );
};
