
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { PieChart, ClipboardList, ListChecks, History, PlusCircle, ExternalLink, LineChart, Activity, CalendarCheck, Bell } from 'lucide-react';

const staticStats = {
  eventosNotificados: 4, // Cambiado de proyectosActivos
  enTratamiento: 3,    // Cambiado de finalizados
  enValidacion: 1,
};

const staticAnalisisEnCurso = [
  { id: '1', proyecto: 'Incidente Válvula X', estado: 'En Análisis', progreso: 60 },
  { id: '2', proyecto: 'Caída de operario Y', estado: 'Iniciado', progreso: 20 },
  { id: '3', proyecto: 'Error eléctrico Z', estado: 'En Validación', progreso: 80 },
];

const staticPlanesAccion = [
  { id: 'pa1', accion: 'Implementar mantenimiento preventivo', responsable: 'Luis T.', fechaLimite: '15/06/2025', estado: 'En proceso' },
  { id: 'pa2', accion: 'Capacitación del equipo', responsable: 'Ana L.', fechaLimite: '10/06/2025', estado: 'Pendiente' },
];

const staticUltimosEventos = [
  { id: 'ev1', descripcion: 'Carlos Ruiz inició un nuevo análisis', tiempo: 'hace 2 horas' },
  { id: 'ev2', descripcion: 'Se validó la causa raíz del proyecto "Caída de operario"', tiempo: 'ayer' },
  { id: 'ev3', descripcion: 'Luis Torres actualizó el estado de una acción', tiempo: 'hace 5 horas' },
];

export default function DashboardRCAPage() {
  return (
    <div className="space-y-6 py-8">
      <header className="text-center mb-8 space-y-2">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
          <LineChart className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary">
          Dashboard RCA
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Resumen general de la actividad de Análisis de Causa Raíz.
        </p>
      </header>

      {/* Resumen Estadístico */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <PieChart className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Resumen Estadístico</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-secondary/40 rounded-lg">
            <p className="text-3xl font-bold text-primary">{staticStats.eventosNotificados}</p>
            <p className="text-sm text-muted-foreground">Eventos Notificados</p> {/* Cambiado */}
          </div>
          <div className="p-4 bg-secondary/40 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{staticStats.enTratamiento}</p>
            <p className="text-sm text-muted-foreground">En Tratamiento</p> {/* Cambiado */}
          </div>
          <div className="p-4 bg-secondary/40 rounded-lg">
            <p className="text-3xl font-bold text-yellow-600">{staticStats.enValidacion}</p>
            <p className="text-sm text-muted-foreground">En Validación</p>
          </div>
        </CardContent>
      </Card>

      {/* Análisis en Curso */}
      <Card className="shadow-lg">
        <CardHeader>
           <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Análisis en Curso</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Proyecto</TableHead>
                <TableHead className="w-[30%]">Estado</TableHead>
                <TableHead className="w-[30%]">Progreso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staticAnalisisEnCurso.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.proyecto}</TableCell>
                  <TableCell>{item.estado}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={item.progreso} className="h-2.5" />
                      <span className="text-xs text-muted-foreground">{item.progreso}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {staticAnalisisEnCurso.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                    No hay análisis en curso.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Planes de Acción Pendientes */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <CalendarCheck className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Planes de Acción Pendientes</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Acción</TableHead>
                <TableHead className="w-[20%]">Responsable</TableHead>
                <TableHead className="w-[20%]">Fecha Límite</TableHead>
                <TableHead className="w-[20%]">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staticPlanesAccion.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.accion}</TableCell>
                  <TableCell>{item.responsable}</TableCell>
                  <TableCell>{item.fechaLimite}</TableCell>
                  <TableCell>{item.estado}</TableCell>
                </TableRow>
              ))}
              {staticPlanesAccion.length === 0 && (
                 <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                    No hay planes de acción pendientes.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex justify-start gap-2 pt-4 border-t">
          <Button variant="outline" size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Nueva Acción
          </Button>
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
            Ver todos <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </CardFooter>
      </Card>
      
      {/* Últimos Eventos Registrados */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Últimos Eventos Registrados</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {staticUltimosEventos.map((evento) => (
              <li key={evento.id} className="flex items-start text-sm">
                <History className="h-4 w-4 text-muted-foreground mr-2.5 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-foreground">{evento.descripcion}</span>
                  <span className="text-muted-foreground text-xs ml-1">({evento.tiempo})</span>
                </div>
              </li>
            ))}
            {staticUltimosEventos.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No hay eventos recientes.</p>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
