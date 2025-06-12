
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

interface ActionStatsData {
  totalAcciones: number;
  accionesPendientes: number;
  accionesValidadas: number;
}

interface AnalisisEnCursoItem {
  id: string;
  proyecto: string;
  currentStep: number;
  progreso: number;
}

interface PlanAccionPendienteItem {
  actionId: string; // Renombrado de id a actionId para claridad
  accion: string;
  responsable: string;
  fechaLimite: string;
  estado: 'Activa' | 'Validada'; 
  rcaId: string;
  rcaTitle: string;
}

interface ActividadRecienteItem {
  id: string;
  descripcion: string;
  tiempo: string; 
  tipoIcono: 'evento' | 'analisis' | 'finalizado';
  originalTimestamp: string; 
}


export default function DashboardRCAPage() {
  const [actionStatsData, setActionStatsData] = useState<ActionStatsData | null>(null);
  const [isLoadingActionStats, setIsLoadingActionStats] = useState(true);
  
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
    const fetchActionStats = async () => {
      setIsLoadingActionStats(true);
      try {
        const rcaAnalysesRef = collection(db, "rcaAnalyses");
        const querySnapshot = await getDocs(rcaAnalysesRef);
        
        let totalAcciones = 0;
        let accionesPendientes = 0;
        let accionesValidadas = 0;

        querySnapshot.forEach(docSnap => {
          const rcaDoc = docSnap.data() as RCAAnalysisDocument;
          if (rcaDoc.plannedActions && rcaDoc.plannedActions.length > 0) {
            rcaDoc.plannedActions.forEach(action => {
              totalAcciones++;
              const validation = rcaDoc.validations?.find(v => v.actionId === action.id);
              if (validation && validation.status === 'validated') {
                accionesValidadas++;
              } else {
                accionesPendientes++;
              }
            });
          }
        });
        
        setActionStatsData({
          totalAcciones,
          accionesPendientes,
          accionesValidadas,
        });
      } catch (error) {
        console.error("Error fetching action stats for dashboard: ", error);
        setActionStatsData({ totalAcciones: 0, accionesPendientes: 0, accionesValidadas: 0 }); 
      } finally {
        setIsLoadingActionStats(false);
      }
    };

    const fetchAnalisisEnCurso = async () => {
      setIsLoadingAnalisisEnCurso(true);
      try {
        const rcaAnalysesRef = collection(db, "rcaAnalyses");
        const q = query(rcaAnalysesRef, where("isFinalized", "==", false), orderBy("updatedAt", "desc"));
        const querySnapshot = await getDocs(q);
        console.log(`[fetchAnalisisEnCurso] Found ${querySnapshot.docs.length} documents with isFinalized: false.`);
        
        const analysesData = querySnapshot.docs.map(docSnap => {
          const doc = docSnap.data() as RCAAnalysisDocument;
          const id = docSnap.id;
          let proyecto = doc.eventData?.focusEventDescription || `Análisis ID: ${id.substring(0,8)}...`;
          let currentStep = 1;

          if (doc.finalComments && doc.finalComments.trim() !== '') {
            currentStep = 5;
          } else if (doc.validations && doc.validations.length > 0 && doc.plannedActions && doc.plannedActions.length > 0) {
            currentStep = 4;
          } else if (
            doc.analysisTechnique || 
            (doc.analysisTechniqueNotes && doc.analysisTechniqueNotes.trim() !== '') ||
            (doc.identifiedRootCauses && doc.identifiedRootCauses.length > 0) ||
            (doc.plannedActions && doc.plannedActions.length > 0)
          ) {
            currentStep = 3;
          } else if (
            doc.projectLeader ||
            (doc.detailedFacts && Object.values(doc.detailedFacts).some(v => !!v)) ||
            (doc.analysisDetails && doc.analysisDetails.trim() !== '') ||
            (doc.preservedFacts && doc.preservedFacts.length > 0)
          ) {
            currentStep = 2;
          }
          
          const progreso = Math.round((currentStep / 5) * 100);
          
          return { id, proyecto, currentStep, progreso };
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
                actionId: action.id,
                accion: action.description,
                responsable: action.responsible,
                fechaLimite: action.dueDate && isValid(parseISO(action.dueDate)) ? format(parseISO(action.dueDate), 'dd/MM/yyyy', { locale: es }) : 'N/A',
                estado: 'Activa',
                rcaId: docSnap.id,
                rcaTitle: rcaDoc.eventData?.focusEventDescription || `Análisis ID ${docSnap.id.substring(0,8)}...`
              });
            }
          });
        });
        
        setPlanesAccionPendientes(planes.sort((a,b) => {
            try {
                const dateAStr = a.fechaLimite.split('/').reverse().join('-');
                const dateBStr = b.fechaLimite.split('/').reverse().join('-');
                const dateA = a.fechaLimite !== 'N/A' ? parseISO(dateAStr) : null;
                const dateB = b.fechaLimite !== 'N/A' ? parseISO(dateBStr) : null;

                if (dateA && isValid(dateA) && dateB && isValid(dateB)) return dateA.getTime() - dateB.getTime();
                if (dateA && isValid(dateA)) return -1; 
                if (dateB && isValid(dateB)) return 1;  
            } catch (e) { /* Silently ignore parsing errors for sorting */ }
            return 0; 
        }).slice(0, 5)); 
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
        const eventsRef = collection(db, "reportedEvents");
        const eventsQuery = query(eventsRef, orderBy("updatedAt", "desc"), limit(3));
        const eventsSnapshot = await getDocs(eventsQuery);
        eventsSnapshot.forEach(docSnap => {
          const event = docSnap.data() as ReportedEvent;
          const timestamp = event.updatedAt || event.createdAt || new Date().toISOString();
          let desc = `Evento '${event.title || 'Sin Título'}'`;
          const isNew = !event.updatedAt || !event.createdAt || (new Date(event.createdAt).getTime() === new Date(event.updatedAt).getTime());
          if (isNew) { 
            desc += ` registrado.`;
          } else {
             desc += ` actualizado (Estado: ${event.status}).`;
          }
          actividades.push({
            id: `evt-${docSnap.id}`,
            descripcion: desc,
            tiempo: formatRelativeTime(timestamp),
            tipoIcono: event.status === 'Finalizado' ? 'finalizado' : 'evento',
            originalTimestamp: timestamp
          });
        });

        const analysesRef = collection(db, "rcaAnalyses");
        const analysesQuery = query(analysesRef, orderBy("updatedAt", "desc"), limit(3));
        const analysesSnapshot = await getDocs(analysesQuery);
        analysesSnapshot.forEach(docSnap => {
          const analysis = docSnap.data() as RCAAnalysisDocument;
          const timestamp = analysis.updatedAt || analysis.createdAt || new Date().toISOString();
           actividades.push({
            id: `rca-${docSnap.id}`,
            descripcion: `Análisis '${analysis.eventData?.focusEventDescription || `ID ${docSnap.id.substring(0,8)}...`}' actualizado.`,
            tiempo: formatRelativeTime(timestamp),
            tipoIcono: analysis.isFinalized ? 'finalizado' : 'analisis',
            originalTimestamp: timestamp
          });
        });
        
        actividades.sort((a, b) => parseISO(b.originalTimestamp).getTime() - parseISO(a.originalTimestamp).getTime());
        setActividadReciente(actividades.slice(0, 5));

      } catch (error) {
        console.error("Error fetching actividad reciente: ", error);
        setActividadReciente([]);
      } finally {
        setIsLoadingActividadReciente(false);
      }
    };

    fetchActionStats();
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

      
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <PieChart className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Resumen de Acciones Correctivas</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          {isLoadingActionStats ? (
            <>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 bg-secondary/30 rounded-lg flex flex-col items-center justify-center h-24">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ))}
            </>
          ) : actionStatsData ? (
            <>
              <div className="p-4 bg-secondary/40 rounded-lg">
                <p className="text-3xl font-bold text-primary">{actionStatsData.totalAcciones}</p>
                <p className="text-sm text-muted-foreground">Total de Acciones</p>
              </div>
              <div className="p-4 bg-yellow-400/20 rounded-lg">
                <p className="text-3xl font-bold text-yellow-600">{actionStatsData.accionesPendientes}</p>
                <p className="text-sm text-muted-foreground">Acciones Pendientes</p>
              </div>
              <div className="p-4 bg-green-400/20 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{actionStatsData.accionesValidadas}</p>
                <p className="text-sm text-muted-foreground">Acciones Validadas</p>
              </div>
            </>
          ) : (
             <div className="col-span-full p-4 bg-secondary/30 rounded-lg text-center">
                <p className="text-muted-foreground">No se pudieron cargar las estadísticas de acciones.</p>
            </div>
          )}
        </CardContent>
      </Card>

      
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
                  <TableHead className="w-[30%]">Paso Actual</TableHead>
                  <TableHead className="w-[30%]">Progreso Estimado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analisisEnCurso.length > 0 ? analisisEnCurso.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.proyecto}</TableCell>
                    <TableCell>Paso {item.currentStep} de 5</TableCell>
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

      
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ListChecks className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Planes de Acción Activos</CardTitle>
          </div>
          <CardDescription>Acciones de análisis no finalizados que aún no han sido validadas (máx. 5).</CardDescription>
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
                  <TableHead className="w-[15%] text-xs">ID Evento</TableHead>
                  <TableHead className="w-[15%] text-xs">ID Acción</TableHead>
                  <TableHead className="w-[25%]">Acción (Análisis: <span className="italic text-xs">Título RCA</span>)</TableHead>
                  <TableHead className="w-[15%]">Responsable</TableHead>
                  <TableHead className="w-[15%]">Fecha Límite</TableHead>
                  <TableHead className="w-[15%]">Estado Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {planesAccionPendientes.length > 0 ? planesAccionPendientes.map((item) => (
                  <TableRow key={item.actionId}>
                    <TableCell className="font-mono text-xs">{item.rcaId.substring(0, 8)}...</TableCell>
                    <TableCell className="font-mono text-xs">{item.actionId.substring(0, 8)}...</TableCell>
                    <TableCell className="font-medium text-sm">
                      {item.accion}
                      <p className="text-xs text-muted-foreground italic mt-0.5">Del Análisis: {item.rcaTitle}</p>
                    </TableCell>
                    <TableCell className="text-sm">{item.responsable}</TableCell>
                    <TableCell className="text-sm">{item.fechaLimite}</TableCell>
                    <TableCell>
                       <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                        {item.estado}
                       </span>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
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
      
      
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <History className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Actividad Reciente en el Sistema</CardTitle>
          </div>
          <CardDescription>Últimas acciones y actualizaciones importantes en eventos y análisis (máx. 5).</CardDescription>
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

