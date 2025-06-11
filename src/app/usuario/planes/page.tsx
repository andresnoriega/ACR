
'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ListTodo, PlusCircle, FileText, Image as ImageIcon, Paperclip, Download, Eye, UploadCloud, CheckCircle2, Save, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Evidence {
  id: string;
  nombre: string;
  tipo: 'pdf' | 'jpg' | 'docx' | 'other';
  accionLabel: 'Descargar' | 'Ver';
  link?: string; 
}

interface ActionPlan {
  id: string;
  accionResumen: string; 
  estado: 'Pendiente' | 'En proceso' | 'Completado';
  plazoLimite: string;
  asignadoPor: string; 
  tituloDetalle: string; 
  descripcionDetallada: string;
  responsableDetalle: string; 
  codigoRCA?: string;
  evidencias: Evidence[];
  ultimaActualizacion: {
    usuario: string;
    mensaje: string;
    fechaRelativa: string; 
  };
}

const sampleActionPlansData: ActionPlan[] = [
  { 
    id: 'ap1', 
    accionResumen: 'Revisar manual de operaciones', 
    estado: 'Pendiente', 
    plazoLimite: '15/06/2025', 
    asignadoPor: 'Carlos Ruiz',
    tituloDetalle: 'Revisión Exhaustiva del Manual de Operaciones Estándar',
    descripcionDetallada: 'Actualizar el manual de operaciones para incluir los nuevos procedimientos de seguridad y verificar la conformidad con la normativa vigente.',
    responsableDetalle: 'Equipo de Calidad',
    codigoRCA: 'RCA-2025-007',
    evidencias: [
      { id: 'e1-1', nombre: 'Manual_actual_v3.pdf', tipo: 'pdf', accionLabel: 'Descargar' },
      { id: 'e1-2', nombre: 'Propuesta_cambios.docx', tipo: 'docx', accionLabel: 'Ver' },
    ],
    ultimaActualizacion: { usuario: 'Sistema', mensaje: 'Plan de acción creado.', fechaRelativa: 'hace 3 días' }
  },
  { 
    id: 'ap2', 
    accionResumen: 'Capacitar equipo en mantenimiento', 
    estado: 'En proceso', 
    plazoLimite: '10/06/2025', 
    asignadoPor: 'Ana López',
    tituloDetalle: 'Capacitar equipo en mantenimiento preventivo',
    descripcionDetallada: 'Entrenamiento obligatorio a todo el personal técnico sobre los nuevos procedimientos de mantenimiento preventivo para la maquinaria crítica.',
    responsableDetalle: 'Ana López',
    codigoRCA: 'RCA-2025-008',
    evidencias: [
      { id: 'e2-1', nombre: 'Informe_capacitacion_v1.pdf', tipo: 'pdf', accionLabel: 'Descargar' },
      { id: 'e2-2', nombre: 'Foto_sesion_1.jpg', tipo: 'jpg', accionLabel: 'Ver' },
      { id: 'e2-3', nombre: 'Notas_adicionales.docx', tipo: 'docx', accionLabel: 'Ver' },
    ],
    ultimaActualizacion: { usuario: 'Ana López', mensaje: 'Se inició la sesión de capacitación', fechaRelativa: '(hoy)' }
  },
  { 
    id: 'ap3', 
    accionResumen: 'Realizar auditoría interna', 
    estado: 'Completado', 
    plazoLimite: '05/06/2025', 
    asignadoPor: 'Luis Torres',
    tituloDetalle: 'Ejecución de Auditoría Interna Post-Incidente',
    descripcionDetallada: 'Auditoría interna completa para verificar la implementación de las acciones correctivas y la efectividad de las mismas.',
    responsableDetalle: 'Luis Torres',
    codigoRCA: 'RCA-2025-009',
    evidencias: [
      { id: 'e3-1', nombre: 'Reporte_auditoria_final.pdf', tipo: 'pdf', accionLabel: 'Descargar' },
      { id: 'e3-2', nombre: 'Checklist_verificacion.docx', tipo: 'docx', accionLabel: 'Ver' },
    ],
    ultimaActualizacion: { usuario: 'Luis Torres', mensaje: 'Auditoría completada y reporte subido.', fechaRelativa: 'ayer' }
  },
];

export default function UserActionPlansPage() {
  const { toast } = useToast();
  const [actionPlansList, setActionPlansList] = useState<ActionPlan[]>(sampleActionPlansData);
  const [selectedPlan, setSelectedPlan] = useState<ActionPlan | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  const summary = useMemo(() => {
    return {
      pendientes: actionPlansList.filter(p => p.estado === 'Pendiente').length,
      enProceso: actionPlansList.filter(p => p.estado === 'En proceso').length,
      completadas: actionPlansList.filter(p => p.estado === 'Completado').length,
    };
  }, [actionPlansList]);

  const handleSelectPlan = (plan: ActionPlan) => {
    setSelectedPlan(plan);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFileToUpload(event.target.files[0]);
    } else {
      setFileToUpload(null);
    }
  };

  const handleUploadEvidence = () => {
    if (!selectedPlan) return;
    if (!fileToUpload) {
      toast({ title: "Error", description: "Por favor, seleccione un archivo para subir.", variant: "destructive" });
      return;
    }
    // Simulate upload
    const newEvidence: Evidence = {
        id: `ev-${Date.now()}`,
        nombre: fileToUpload.name,
        tipo: fileToUpload.name.endsWith('.pdf') ? 'pdf' : fileToUpload.name.endsWith('.jpg') || fileToUpload.name.endsWith('.jpeg') ? 'jpg' : fileToUpload.name.endsWith('.docx') ? 'docx' : 'other',
        accionLabel: 'Descargar', // Default or determine based on type
    };

    setActionPlansList(prevPlans =>
        prevPlans.map(p =>
            p.id === selectedPlan.id
                ? { ...p, evidencias: [...p.evidencias, newEvidence] }
                : p
        )
    );
    setSelectedPlan(prev => prev ? { ...prev, evidencias: [...prev.evidencias, newEvidence] } : null);

    toast({ title: "Simulación", description: `Archivo "${fileToUpload.name}" subido para "${selectedPlan.tituloDetalle}".` });
    setFileToUpload(null);
    const fileInput = document.getElementById('evidence-file-input') as HTMLInputElement;
    if (fileInput) {
        fileInput.value = '';
    }
  };

  const getEvidenceIcon = (tipo: Evidence['tipo']) => {
    switch (tipo) {
      case 'pdf': return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-red-600" />;
      case 'jpg': return <ImageIcon className="h-4 w-4 mr-2 flex-shrink-0 text-blue-600" />;
      case 'docx': return <Paperclip className="h-4 w-4 mr-2 flex-shrink-0 text-sky-700" />;
      default: return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />;
    }
  };
  
  const handleUpdateStatus = (newStatus: ActionPlan['estado']) => {
    if (!selectedPlan) return;

    setActionPlansList(prevPlans => 
      prevPlans.map(plan => 
        plan.id === selectedPlan.id ? { ...plan, estado: newStatus, ultimaActualizacion: { usuario: 'Usuario Actual', mensaje: `Estado cambiado a ${newStatus}.`, fechaRelativa: '(ahora)'} } : plan
      )
    );
    
    setSelectedPlan(prev => prev ? {...prev, estado: newStatus, ultimaActualizacion: { usuario: 'Usuario Actual', mensaje: `Estado cambiado a ${newStatus}.`, fechaRelativa: '(ahora)'}} : null);
    
    toast({ title: "Estado Actualizado", description: `El plan "${selectedPlan.tituloDetalle}" se marcó como "${newStatus}".` });
  };

  return (
    <div className="space-y-6 py-8">
      <header className="text-center mb-6">
        <h1 className="text-3xl font-bold font-headline text-primary">
          Mis Planes de Acción
        </h1>
      </header>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-primary">[Resumen Rápido]</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-secondary/40 rounded-md">
            <p className="text-2xl font-bold text-destructive">{summary.pendientes}</p>
            <p className="text-xs text-muted-foreground">Acciones Pendientes</p>
          </div>
          <div className="p-3 bg-secondary/40 rounded-md">
            <p className="text-2xl font-bold text-yellow-600">{summary.enProceso}</p>
            <p className="text-xs text-muted-foreground">En Proceso</p>
          </div>
          <div className="p-3 bg-secondary/40 rounded-md">
            <p className="text-2xl font-bold text-green-600">{summary.completadas}</p>
            <p className="text-xs text-muted-foreground">Completadas</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-primary">Lista de Planes de Acción</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Acción</TableHead>
                  <TableHead className="w-[15%]">Estado</TableHead>
                  <TableHead className="w-[20%]">Plazo Límite</TableHead>
                  <TableHead className="w-[25%]">Asignado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actionPlansList.map((plan) => (
                  <TableRow 
                    key={plan.id} 
                    onClick={() => handleSelectPlan(plan)}
                    className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        selectedPlan?.id === plan.id && "bg-accent/50 hover:bg-accent/60"
                    )}
                  >
                    <TableCell className="font-medium">{plan.accionResumen}</TableCell>
                    <TableCell>
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold",
                        plan.estado === 'Pendiente' && 'bg-red-100 text-red-700',
                        plan.estado === 'En proceso' && 'bg-yellow-100 text-yellow-700',
                        plan.estado === 'Completado' && 'bg-green-100 text-green-700'
                      )}>
                        {plan.estado}
                      </span>
                    </TableCell>
                    <TableCell>{plan.plazoLimite}</TableCell>
                    <TableCell>{plan.asignadoPor}</TableCell>
                  </TableRow>
                ))}
                 {actionPlansList.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            No hay planes de acción para mostrar.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex justify-start gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => toast({ title: 'Simulación', description: 'Abrir formulario para nuevo plan.'})}>
              <PlusCircle className="mr-1.5 h-4 w-4" /> Nuevo Plan
            </Button>
            <Button 
              size="sm" 
              disabled={!selectedPlan}
              onClick={() => { if (selectedPlan) toast({ title: 'Detalles', description: `Mostrando detalles para ${selectedPlan.accionResumen}`})}}
            >
              Ver Detalles
            </Button>
        </CardFooter>
      </Card>

      {selectedPlan && (
        <Card className="shadow-lg animate-in fade-in-50 duration-300">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary">Detalle del Plan Seleccionado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <Label className="font-semibold">Título:</Label>
              <p>{selectedPlan.tituloDetalle}</p>
            </div>
            <div>
              <Label className="font-semibold">Descripción:</Label>
              <p className="whitespace-pre-line">{selectedPlan.descripcionDetallada}</p>
            </div>
            <div><Label className="font-semibold">Responsable:</Label> <p>{selectedPlan.responsableDetalle}</p></div>
            <div><Label className="font-semibold">Estado:</Label> <p>{selectedPlan.estado}</p></div>
            <div><Label className="font-semibold">Plazo límite:</Label> <p>{selectedPlan.plazoLimite}</p></div>
            {selectedPlan.codigoRCA && (
              <div><Label className="font-semibold">Código RCA:</Label> <p>{selectedPlan.codigoRCA}</p></div>
            )}

            <div className="pt-2">
              <h4 className="font-semibold text-primary mb-1">[Evidencias Adjuntas]</h4>
              {selectedPlan.evidencias.length > 0 ? (
                <ul className="space-y-1.5">
                  {selectedPlan.evidencias.map(ev => (
                    <li key={ev.id} className="flex items-center text-xs">
                      {getEvidenceIcon(ev.tipo)}
                      <span className="flex-grow">{ev.nombre}</span>
                      <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => toast({title: "Simulación", description: `${ev.accionLabel} archivo ${ev.nombre}`})}>
                        ({ev.accionLabel})
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-muted-foreground">No hay evidencias adjuntas.</p>}
            </div>

            <div className="pt-2">
              <h4 className="font-semibold text-primary mb-1">[Adjuntar nueva evidencia]</h4>
              <div className="flex items-center gap-2">
                <Input id="evidence-file-input" type="file" onChange={handleFileChange} className="text-xs h-9 flex-grow" />
                <Button size="sm" onClick={handleUploadEvidence} disabled={!fileToUpload}>
                  <UploadCloud className="mr-1.5 h-4 w-4" /> Subir
                </Button>
              </div>
              {fileToUpload && <p className="text-xs text-muted-foreground mt-1">Archivo seleccionado: {fileToUpload.name}</p>}
            </div>
            
            <div className="pt-2">
              <h4 className="font-semibold text-primary mb-1">[Actualizar estado]</h4>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleUpdateStatus('Completado')}>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" /> Marcar como completado
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleUpdateStatus('En proceso')}>
                  <Save className="mr-1.5 h-4 w-4" /> Guardar progreso
                </Button>
              </div>
            </div>

            <div className="pt-2">
              <h4 className="font-semibold text-primary mb-1">[Notas del sistema]</h4>
              <div className="text-xs bg-secondary/30 p-2 rounded-md">
                <p>Última actualización: {selectedPlan.ultimaActualizacion.usuario} - "{selectedPlan.ultimaActualizacion.mensaje}" {selectedPlan.ultimaActualizacion.fechaRelativa}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700">
        <CardContent className="pt-4">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2.5 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-0.5">Nota sobre la interactividad</h3>
              <p className="text-xs text-blue-600 dark:text-blue-400/90">
                Esta es una maqueta visual. Algunas acciones como "Subir Evidencia" o "Guardar Progreso" están simuladas y mostrarán notificaciones.
                La selección de un plan en la tabla superior mostrará sus detalles a continuación. La actualización de estados sí se refleja en la tabla y el resumen.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

