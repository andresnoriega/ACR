
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ListTodo, AlertTriangle, CheckCircle2 } from 'lucide-react';

// Sample data - in a real app, this would come from a backend or global state
const sampleActionPlans = [
  { id: 'pa1', description: 'Implementar mantenimiento preventivo en Válvula X', rcaProject: 'Incidente Válvula X', dueDate: '15/06/2025', status: 'En proceso', priority: 'Alta' },
  { id: 'pa2', description: 'Capacitación del equipo en nuevo protocolo de seguridad', rcaProject: 'Caída de operario Y', dueDate: '10/06/2025', status: 'Pendiente', priority: 'Media' },
  { id: 'pa3', description: 'Revisar y actualizar diagramas eléctricos del Panel Z', rcaProject: 'Error eléctrico Z', dueDate: '30/07/2025', status: 'Completado', priority: 'Media' },
  { id: 'pa4', description: 'Adquirir repuestos para bomba de respaldo Q', rcaProject: 'Falla Bomba Q', dueDate: '01/08/2025', status: 'Pendiente', priority: 'Alta' },
];

export default function UserActionPlansPage() {
  return (
    <div className="space-y-8 py-8">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
          <ListTodo className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary">
          Mis Planes de Acción y Tareas
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Aquí puedes ver y gestionar las acciones correctivas y tareas que te han sido asignadas.
        </p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Tareas Pendientes</CardTitle>
          <CardDescription>Planes de acción que requieren tu atención.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sampleActionPlans.filter(plan => plan.status !== 'Completado').length > 0 ? (
            sampleActionPlans.filter(plan => plan.status !== 'Completado').map(plan => (
              <Card key={plan.id} className="p-4 bg-secondary/40">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-primary">{plan.description}</h3>
                    <p className="text-sm text-muted-foreground">Proyecto RCA: {plan.rcaProject}</p>
                    <p className="text-sm text-muted-foreground">Vence: {plan.dueDate} | Prioridad: {plan.priority}</p>
                    <p className="text-sm font-medium mt-1">
                      Estado: <span className={plan.status === 'En proceso' ? 'text-yellow-600' : 'text-red-600'}>{plan.status}</span>
                    </p>
                  </div>
                  <Button size="sm" variant="outline">Ver Detalles</Button>
                </div>
              </Card>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
              <p className="text-lg font-semibold">¡Todo al día!</p>
              <p className="text-muted-foreground">No tienes tareas pendientes por ahora.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Tareas Completadas</CardTitle>
          <CardDescription>Historial de acciones que ya has finalizado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           {sampleActionPlans.filter(plan => plan.status === 'Completado').length > 0 ? (
            sampleActionPlans.filter(plan => plan.status === 'Completado').map(plan => (
            <Card key={plan.id} className="p-4 bg-green-50 dark:bg-green-900/30 opacity-80">
                 <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-semibold text-green-700 dark:text-green-400">{plan.description}</h3>
                        <p className="text-sm text-muted-foreground">Proyecto RCA: {plan.rcaProject}</p>
                        <p className="text-sm text-muted-foreground">Completado el: {plan.dueDate} (Fecha de vencimiento original)</p>
                    </div>
                     <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 mt-1" />
                </div>
            </Card>
            ))
           ) : (
             <p className="text-muted-foreground text-center py-6">Aún no has completado ninguna tarea.</p>
           )}
        </CardContent>
      </Card>

      <Card className="mt-8 bg-accent/10 border-accent">
        <CardContent className="pt-6">
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-accent-foreground mr-3 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-accent-foreground mb-1">Nota Importante</h3>
              <p className="text-sm text-accent-foreground/90">
                Esta es una vista simplificada. En una aplicación completa, podrías actualizar el estado de tus tareas,
                añadir comentarios, adjuntar evidencia y recibir notificaciones.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
