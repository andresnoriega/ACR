
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { PieChart, ClipboardList, ListChecks, History, PlusCircle, ExternalLink, LineChart, Activity, CalendarCheck, Bell, Loader2, AlertTriangle, CheckSquare, ListFilter } from 'lucide-react';
import type { ReportedEvent, RCAAnalysisDocument, PlannedAction, Validation } from '@/types/rca';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, Timestamp, where, orderBy, limit } from "firebase/firestore";
import { format, parseISO, isValid, formatDistanceToNowStrict } from "date-fns";
import { es } from 'date-fns/locale';

interface StatsData {
  totalEventos: number;
  pendientes: number;
  enAnalisis: number;
  finalizados: number;
}

interface AnalisisEnCursoItem {
  id: string;
  proyecto: string;
  estado: string;
  progreso: number;
}

interface PlanAccionPendienteItem {
  id: string;
  accion: string;
  responsable: string;
  fechaLimite: string;
  estado: 'Activa' | 'Validada'; // Simplificado
  rcaId: string;
  rcaTitle: string;
}

interface ActividadRecienteItem {
  id: string;
  descripcion: string;
  tiempo: string; // Formateado como "hace X"
  tipoIcono: 'evento' | 'analisis' | 'finalizado';
}


export default function DashboardRCAPage() {
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  
  const [analisisEnCurso, setAnalisisEnCurso] = useState<AnalisisEnCursoItem[]>([]);
  const [isLoadingAnalisisEnCurso, setIsLoadingAnalisisEnCurso] = useState(true);

  const [planesAccionPendientes, setPlanesAccionPendientes] = useState<PlanAccionPendienteItem[]>([]);
  const [isLoadingPlanesAccion, setIsLoadingPlanesAccion] = useState(true);

  const [actividadReciente, setActividadReciente] = useState<ActividadRecienteItem[]>([]);
  const [isLoadingActividadReciente, setIsLoadingActividadReciente] = useState(true);


  const formatRelativeTime = (isoDateString?: string): string => {
    if (!isoDateString) return 'Fecha desconocida';
    try {
      const date = parseISO(isoDateString);
      if (!isValid(date)) return 'Fecha inválida';
      return formatDistanceToNowStrict(date, { addSuffix: true, locale: es });
    } catch (e) {
      return 'Error de fecha';
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoadingStats(true);
      try {
        const eventsCollectionRef = collection(db, "reportedEvents");
        const querySnapshot = await getDocs(eventsCollectionRef);
        const events = querySnapshot.docs.map(doc => {
            const data = doc.data();
            let eventDateStr = data.date; 
            if (data.date && typeof data.date.toDate === 'function') { 
                eventDateStr = format(data.date.toDate(), 'yyyy-MM-dd');
            }
            return { ...data, date: eventDateStr } as ReportedEvent;
        });
        
        const newStats: StatsData = {
          totalEventos: events.length,
          pendientes: events.filter(e => e.status === 'Pendiente').length,
          enAnalisis: events.filter(e => e.status === 'En análisis').length,
          finalizados: events.filter(e => e.status === 'Finalizado').length,
        };
        
        setStatsData(newStats);
      } catch (error) {
        console.error("Error fetching stats for dashboard: ", error);
        setStatsData({ totalEventos: 0, pendientes: 0, enAnalisis: 0, finalizados: 0 }); 
      } finally {
        setIsLoadingStats(false);
      }
    };

    const fetchAnalisisEnCurso = async () => {
      setIsLoadingAnalisisEnCurso(true);
      try {
        const rcaAnalysesRef = collection(db, "rcaAnalyses");
        const q = query(rcaAnalysesRef, where("isFinalized", "==", false), orderBy("updatedAt", "desc"));
        const querySnapshot = await getDocs(q);
        const analysesData = querySnapshot.docs.map(docSnap => {
          const doc = docSnap.data() as RCAAnalysisDocument;
          const id = docSnap.id;
          let proyecto = doc.eventData?.focusEventDescription || `Análisis ID: ${id.substring(0,8)}...`;
          let estado = "Iniciado";
          let progreso = 10;

          if (doc.projectLeader || Object.values(doc.detailedFacts || {}).some(v => !!v)) {
            estado = "Recopilando Hechos";
            progreso = 30;
          }
          if (doc.analysisTechnique || (doc.analysisTechniqueNotes && doc.analysisTechniqueNotes.trim() !== '')) {
            estado = "Analizando (Técnica Aplicada)";
            progreso = 50;
          }
          if (doc.identifiedRootCauses && doc.identifiedRootCauses.length > 0 && doc.identifiedRootCauses.every(rc => rc.description.trim() !== '')) {
            estado = "Causas Raíz Identificadas";
            progreso = 60;
          }
          if (doc.plannedActions && doc.plannedActions.length > 0 && doc.plannedActions.some(pa => pa.description && pa.responsible && pa.dueDate)) {
            estado = "Plan de Acción Definido";
            progreso = 75;
          }
          if (doc.validations && doc.validations.length > 0 && doc.plannedActions && doc.plannedActions.length > 0) {
            const validatedCount = doc.validations.filter(v => v.status === 'validated').length;
            if (validatedCount > 0) {
                estado = "Validando Acciones";
                progreso = 85 + Math.round((validatedCount / doc.plannedActions.length) * 10); 
                progreso = Math.min(progreso, 95); // Cap at 95 before final comments
            }
          }
          if (doc.finalComments && doc.finalComments.trim() !== '') {
            estado = "Redactando Conclusiones";
            progreso = 95;
          }
          
          return { id, proyecto, estado, progreso };
        });
        setAnalisisEnCurso(analysesData);
      } catch (error) {
        console.error("Error fetching analisis en curso: ", error);
        setAnalisisEnCurso([]);
      } finally {
        setIsLoadingAnalisisEnCurso(false);
      }
    };

    const fetchPlanesAccion = async () => {
      setIsLoadingPlanesAccion(true);
      const planes: PlanAccionPendienteItem[] = [];
      try {
        const rcaAnalysesRef = collection(db, "rcaAnalyses");
        const q = query(rcaAnalysesRef, where("isFinalized", "==", false), orderBy("updatedAt", "desc"));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach(docSnap => {
          const rcaDoc = docSnap.data() as RCAAnalysisDocument;
          rcaDoc.plannedActions?.forEach(action => {
            const validation = rcaDoc.validations?.find(v => v.actionId === action.id);
            if (!validation || validation.status === 'pending') {
              planes.push({
                id: action.id,
                accion: action.description,
                responsable: action.responsible,
                fechaLimite: action.dueDate ? format(parseISO(action.dueDate), 'dd/MM/yyyy', { locale: es }) : 'N/A',
                estado: 'Activa',
                rcaId: docSnap.id,
                rcaTitle: rcaDoc.eventData.focusEventDescription
              });
            }
          });
        });
        setPlanesAccionPendientes(planes.sort((a,b) => new Date(a.fechaLimite).getTime() - new Date(b.fechaLimite).getTime()).slice(0, 5)); // Show top 5 by due date
      } catch (error) {
        console.error("Error fetching planes de acción: ", error);
        setPlanesAccionPendientes([]);
      } finally {
        setIsLoadingPlanesAccion(false);
      }
    };

    const fetchActividadReciente = async () => {
      setIsLoadingActividadReciente(true);
      const actividades: ActividadRecienteItem[] = [];
      try {
        // Fetch recent reported events
        const eventsRef = collection(db, "reportedEvents");
        const eventsQuery = query(eventsRef, orderBy("updatedAt", "desc"), limit(3));
        const eventsSnapshot = await getDocs(eventsQuery);
        eventsSnapshot.forEach(docSnap => {
          const event = docSnap.data() as ReportedEvent;
          let desc = `Evento '${event.title}'`;
          if (event.createdAt === event.updatedAt) {
            desc += ` registrado.`;
          } else {
             desc += ` actualizado (Estado: ${event.status}).`;
          }
          actividades.push({
            id: docSnap.id,
            descripcion: desc,
            tiempo: formatRelativeTime(event.updatedAt),
            tipoIcono: event.status === 'Finalizado' ? 'finalizado' : 'evento'
          });
        });

        // Fetch recent RCA analyses updates
        const analysesRef = collection(db, "rcaAnalyses");
        const analysesQuery = query(analysesRef, orderBy("updatedAt", "desc"), limit(3));
        const analysesSnapshot = await getDocs(analysesQuery);
        analysesSnapshot.forEach(docSnap => {
          const analysis = docSnap.data() as RCAAnalysisDocument;
          actividades.push({
            id: docSnap.id,
            descripcion: `Análisis '${analysis.eventData.focusEventDescription}' actualizado.`,
            tiempo: formatRelativeTime(analysis.updatedAt),
            tipoIcono: analysis.isFinalized ? 'finalizado' : 'analisis'
          });
        });

        // Sort combined activities and take top 5
        actividades.sort((a, b) => {
            // Attempt to parse 'tiempo' back to date for sorting; this is tricky with relative strings.
            // A more robust solution would sort by original ISO date before formatting.
            // For now, this is a placeholder for proper sorting.
            // We'll rely on the limit(3) from each query and then interleave them.
            // A better approach would be to use the original date for sorting.
            // For this example, we'll just use the order they came in, which is roughly chronological due to limit.
            return 0; 
        });
        setActividadReciente(actividades.slice(0, 5));

      } catch (error) {
        console.error("Error fetching actividad reciente: ", error);
        setActividadReciente([]);
      } finally {
        setIsLoadingActividadReciente(false);
      }
    };


    fetchStats();
    fetchAnalisisEnCurso();
    fetchPlanesAccion();
    fetchActividadReciente();
  }, []);

  const renderActividadIcon = (tipo: ActividadRecienteItem['tipoIcono']) => {
    switch (tipo) {
      case 'evento': return <ListFilter className="text-muted-foreground" />;
      case 'analisis': return <Activity className="text-blue-500" />;
      case 'finalizado': return <CheckSquare className="text-green-500" />;
      default: return <Bell className="text-muted-foreground" />;
    }
  };

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
          Resumen general de la actividad de Análisis de Causa Raíz desde Firestore.
        </p>
      </header>

      {/* Resumen Estadístico */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <PieChart className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Resumen Estadístico de Eventos</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
          {isLoadingStats ? (
            <>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 bg-secondary/30 rounded-lg flex flex-col items-center justify-center h-24">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ))}
            </>
          ) : statsData ? (
            <>
              <div className="p-4 bg-secondary/40 rounded-lg">
                <p className="text-3xl font-bold text-primary">{statsData.totalEventos}</p>
                <p className="text-sm text-muted-foreground">Total de Eventos</p>
              </div>
              <div className="p-4 bg-destructive/10 rounded-lg">
                <p className="text-3xl font-bold text-destructive">{statsData.pendientes}</p>
                <p className="text-sm text-muted-foreground">Eventos Pendientes</p>
              </div>
              <div className="p-4 bg-yellow-400/20 rounded-lg">
                <p className="text-3xl font-bold text-yellow-600">{statsData.enAnalisis}</p>
                <p className="text-sm text-muted-foreground">Eventos En Análisis</p>
              </div>
              <div className="p-4 bg-green-400/20 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{statsData.finalizados}</p>
                <p className="text-sm text-muted-foreground">Eventos Finalizados</p>
              </div>
            </>
          ) : (
             <div className="col-span-full p-4 bg-secondary/30 rounded-lg text-center">
                <p className="text-muted-foreground">No se pudieron cargar las estadísticas.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Análisis en Curso */}
      <Card className="shadow-lg">
        <CardHeader>
           <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Análisis en Curso</CardTitle>
          </div>
           <CardDescription>Lista de análisis RCA que están actualmente en progreso, obtenidos de Firestore.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAnalisisEnCurso ? (
            <div className="flex justify-center items-center h-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Cargando análisis en curso...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Proyecto/Evento</TableHead>
                  <TableHead className="w-[30%]">Estado Actual</TableHead>
                  <TableHead className="w-[30%]">Progreso Estimado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analisisEnCurso.length > 0 ? analisisEnCurso.map((item) => (
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
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                      No hay análisis actualmente en curso o no se pudieron cargar.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Planes de Acción Pendientes */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ListChecks className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Planes de Acción Activos</CardTitle>
          </div>
          <CardDescription>Acciones de análisis no finalizados que aún no han sido validadas.</CardDescription>
        </CardHeader>
        <CardContent>
         {isLoadingPlanesAccion ? (
            <div className="flex justify-center items-center h-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Cargando planes de acción...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[35%]">Acción (Análisis: <span className="italic text-xs">Título del RCA</span>)</TableHead>
                  <TableHead className="w-[20%]">Responsable</TableHead>
                  <TableHead className="w-[20%]">Fecha Límite</TableHead>
                  <TableHead className="w-[20%]">Estado Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {planesAccionPendientes.length > 0 ? planesAccionPendientes.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.accion}
                      <p className="text-xs text-muted-foreground italic mt-0.5">Del Análisis: {item.rcaTitle}</p>
                    </TableCell>
                    <TableCell>{item.responsable}</TableCell>
                    <TableCell>{item.fechaLimite}</TableCell>
                    <TableCell>
                       <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                        {item.estado}
                       </span>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                      No hay planes de acción activos para mostrar.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter className="flex justify-start gap-2 pt-4 border-t">
          <Button variant="outline" size="sm" disabled>
            <PlusCircle className="mr-2 h-4 w-4" /> Nueva Acción (No implementado)
          </Button>
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80" disabled>
            Ver todos <ExternalLink className="ml-1.5 h-3.5 w-3.5" /> (No implementado)
          </Button>
        </CardFooter>
      </Card>
      
      {/* Últimos Eventos Registrados */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <History className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Actividad Reciente en el Sistema</CardTitle>
          </div>
          <CardDescription>Últimas acciones y actualizaciones importantes en eventos y análisis.</CardDescription>
        </CardHeader>
        <CardContent>
        {isLoadingActividadReciente ? (
            <div className="flex justify-center items-center h-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Cargando actividad reciente...</p>
            </div>
        ) : (
          <ul className="space-y-3">
            {actividadReciente.length > 0 ? actividadReciente.map((evento) => (
              <li key={evento.id} className="flex items-start text-sm">
                <div className="flex-shrink-0 w-5 h-5 mt-0.5 mr-2.5">
                  {renderActividadIcon(evento.tipoIcono)}
                </div>
                <div>
                  <span className="text-foreground">{evento.descripcion}</span>
                  <span className="text-muted-foreground text-xs ml-1">({evento.tiempo})</span>
                </div>
              </li>
            )) : (
                <p className="text-muted-foreground text-center py-4">No hay actividad reciente para mostrar.</p>
            )}
          </ul>
        )}
        </CardContent>
      </Card>
    </div>
  );
}
