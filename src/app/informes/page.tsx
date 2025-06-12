
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart as PieChartIcon, ListChecks, History, PlusCircle, ExternalLink, LineChart, Activity, CalendarCheck, Bell, Loader2, AlertTriangle, CheckSquare, ListFilter as FilterIcon, Globe, Flame, Search, RefreshCcw, Percent, FileText, ListTodo, BarChart3 as RCASummaryIcon } from 'lucide-react';
import type { ReportedEvent, RCAAnalysisDocument, PlannedAction, Validation, Site, ReportedEventType, PriorityType } from '@/types/rca';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, Timestamp, where, orderBy, limit, QueryConstraint } from "firebase/firestore";
import { format, parseISO, isValid, formatDistanceToNowStrict } from "date-fns";
import { es } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
} from 'recharts';

const eventTypeOptions: ReportedEventType[] = ['Incidente', 'Fallo', 'Accidente', 'No Conformidad'];
const priorityOptions: PriorityType[] = ['Alta', 'Media', 'Baja'];
const ALL_FILTER_VALUE = "__ALL__";
const NO_SITES_PLACEHOLDER_VALUE = "__NO_SITES_PLACEHOLDER__";

interface ActionStatsData {
  totalAcciones: number;
  accionesPendientes: number;
  accionesValidadas: number;
}

interface RCASummaryData {
  totalRCAs: number;
  accionesPendientesEnRCAPendientes: number;
  accionesValidadasEnRCAFinalizados: number;
}

interface AnalisisEnCursoItem {
  id: string;
  proyecto: string;
  currentStep: number;
  progreso: number;
}

interface PlanAccionPendienteItem {
  rcaId: string;
  actionId: string;
  accion: string;
  responsable: string;
  fechaLimite: string;
  estado: 'Activa' | 'Validada'; 
  rcaTitle: string;
}

interface ActividadRecienteItem {
  id: string;
  descripcion: string;
  tiempo: string; 
  tipoIcono: 'evento' | 'analisis' | 'finalizado';
  originalTimestamp: string; 
}

interface DashboardFilters {
  site: string;
  type: ReportedEventType;
  priority: PriorityType;
}

export default function DashboardRCAPage() {
  const { toast } = useToast();

  const [actionStatsData, setActionStatsData] = useState<ActionStatsData | null>(null);
  const [rcaSummaryData, setRcaSummaryData] = useState<RCASummaryData | null>(null);
  const [analisisEnCurso, setAnalisisEnCurso] = useState<AnalisisEnCursoItem[]>([]);
  const [planesAccionPendientes, setPlanesAccionPendientes] = useState<PlanAccionPendienteItem[]>([]);
  const [actividadReciente, setActividadReciente] = useState<ActividadRecienteItem[]>([]);
  
  const [availableSites, setAvailableSites] = useState<Site[]>([]);
  const [isLoadingSites, setIsLoadingSites] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [filters, setFilters] = useState<DashboardFilters>({
    site: '',
    type: '' as ReportedEventType,
    priority: '' as PriorityType,
  });

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

  const fetchAllDashboardData = useCallback(async (currentFilters: DashboardFilters) => {
    setIsLoadingData(true);
    
    const baseQueryConstraints: QueryConstraint[] = [];
    if (currentFilters.site && currentFilters.site !== ALL_FILTER_VALUE) {
      baseQueryConstraints.push(where("eventData.site", "==", currentFilters.site));
    }
    if (currentFilters.type && currentFilters.type !== ALL_FILTER_VALUE) {
      baseQueryConstraints.push(where("eventData.eventType", "==", currentFilters.type));
    }
    if (currentFilters.priority && currentFilters.priority !== ALL_FILTER_VALUE) {
      baseQueryConstraints.push(where("eventData.priority", "==", currentFilters.priority));
    }

    try {
      const rcaAnalysesRef = collection(db, "rcaAnalyses");
      const dataQuery = query(rcaAnalysesRef, ...baseQueryConstraints);
      const querySnapshot = await getDocs(dataQuery);
      
      let totalAcciones = 0;
      let accionesPendientesGlobal = 0;
      let accionesValidadasGlobal = 0;

      let totalRCAs = querySnapshot.size;
      let accionesPendientesEnRCAPendientes = 0;
      let accionesValidadasEnRCAFinalizados = 0;

      const currentAnalysesInProgress: AnalisisEnCursoItem[] = [];
      const currentPendingActionPlans: PlanAccionPendienteItem[] = [];

      querySnapshot.forEach(docSnap => {
        const rcaDoc = docSnap.data() as RCAAnalysisDocument;
        const rcaId = docSnap.id;

        // Calculations for Resumen de Acciones Correctivas & Cumplimiento
        if (rcaDoc.plannedActions && rcaDoc.plannedActions.length > 0) {
          rcaDoc.plannedActions.forEach(action => {
            totalAcciones++;
            const validation = rcaDoc.validations?.find(v => v.actionId === action.id);
            const isActionValidated = validation && validation.status === 'validated';
            
            if (isActionValidated) {
              accionesValidadasGlobal++;
            } else {
              accionesPendientesGlobal++;
            }

            // Calculations for Resumen de Análisis de Causa Raíz
            if (!rcaDoc.isFinalized && !isActionValidated) {
              accionesPendientesEnRCAPendientes++;
            }
            if (rcaDoc.isFinalized && isActionValidated) {
              accionesValidadasEnRCAFinalizados++;
            }

            // For Planes de Acción Activos (only if RCA is not finalized and action is pending)
            if (!rcaDoc.isFinalized && !isActionValidated) {
                 currentPendingActionPlans.push({
                    actionId: action.id,
                    rcaId: rcaId,
                    accion: action.description,
                    responsable: action.responsible,
                    fechaLimite: action.dueDate && isValid(parseISO(action.dueDate)) ? format(parseISO(action.dueDate), 'dd/MM/yyyy', { locale: es }) : 'N/A',
                    estado: 'Activa',
                    rcaTitle: rcaDoc.eventData?.focusEventDescription || `Análisis ID ${rcaId.substring(0,8)}...`
                });
            }
          });
        }
        
        // For Analisis En Curso
        if (!rcaDoc.isFinalized) {
            let proyecto = rcaDoc.eventData?.focusEventDescription || `Análisis ID: ${rcaId.substring(0,8)}...`;
            let currentStep = 1; 
            if (rcaDoc.finalComments && rcaDoc.finalComments.trim() !== '') currentStep = 5;
            else if (rcaDoc.validations && rcaDoc.validations.length > 0 && rcaDoc.plannedActions && rcaDoc.plannedActions.length > 0) currentStep = 4;
            else if (rcaDoc.analysisTechnique || (rcaDoc.analysisTechniqueNotes && rcaDoc.analysisTechniqueNotes.trim() !== '') || (rcaDoc.identifiedRootCauses && rcaDoc.identifiedRootCauses.length > 0) || (rcaDoc.plannedActions && rcaDoc.plannedActions.length > 0)) currentStep = 3;
            else if (rcaDoc.projectLeader || (rcaDoc.detailedFacts && Object.values(rcaDoc.detailedFacts).some(v => !!v)) || (rcaDoc.analysisDetails && rcaDoc.analysisDetails.trim() !== '') || (rcaDoc.preservedFacts && rcaDoc.preservedFacts.length > 0)) currentStep = 2;
            
            const progreso = Math.round((currentStep / 5) * 100);
            currentAnalysesInProgress.push({ id: rcaId, proyecto, currentStep, progreso });
        }
      });

      setActionStatsData({ totalAcciones, accionesPendientes: accionesPendientesGlobal, accionesValidadas: accionesValidadasGlobal });
      setRcaSummaryData({ totalRCAs, accionesPendientesEnRCAPendientes, accionesValidadasEnRCAFinalizados });
      
      // Sort and limit "Análisis en Curso"
      currentAnalysesInProgress.sort((a,b) => {
        const rcaA = querySnapshot.docs.find(d => d.id === a.id)?.data() as RCAAnalysisDocument | undefined;
        const rcaB = querySnapshot.docs.find(d => d.id === b.id)?.data() as RCAAnalysisDocument | undefined;
        const dateA = rcaA?.updatedAt ? parseISO(rcaA.updatedAt).getTime() : 0;
        const dateB = rcaB?.updatedAt ? parseISO(rcaB.updatedAt).getTime() : 0;
        return dateB - dateA; // Descending by updatedAt
      });
      setAnalisisEnCurso(currentAnalysesInProgress);


      // Sort and limit "Planes de Acción Activos"
      currentPendingActionPlans.sort((a,b) => {
          try {
              const dateAStr = a.fechaLimite.split('/').reverse().join('-');
              const dateBStr = b.fechaLimite.split('/').reverse().join('-');
              const dateA = a.fechaLimite !== 'N/A' ? parseISO(dateAStr) : null;
              const dateB = b.fechaLimite !== 'N/A' ? parseISO(dateBStr) : null;
              if (dateA && isValid(dateA) && dateB && isValid(dateB)) return dateA.getTime() - dateB.getTime(); // Ascending by due date
              if (dateA && isValid(dateA)) return -1; 
              if (dateB && isValid(dateB)) return 1;  
          } catch (e) { /* Silently ignore */ }
          return 0; 
      });
      setPlanesAccionPendientes(currentPendingActionPlans.slice(0, 5));

    } catch (error) {
      console.error("Error fetching dashboard data: ", error);
      setActionStatsData({ totalAcciones: 0, accionesPendientes: 0, accionesValidadas: 0 }); 
      setRcaSummaryData({ totalRCAs: 0, accionesPendientesEnRCAPendientes: 0, accionesValidadasEnRCAFinalizados: 0 });
      setAnalisisEnCurso([]);
      setPlanesAccionPendientes([]);
      toast({ title: "Error al Cargar Datos del Dashboard", description: (error as Error).message, variant: "destructive" });
    }
    setIsLoadingData(false);
  }, [toast]);

  useEffect(() => {
    fetchAllDashboardData(filters); 
    const fetchSitesData = async () => {
      setIsLoadingSites(true);
      try {
        const sitesCollectionRef = collection(db, "sites");
        const q = query(sitesCollectionRef, orderBy("name", "asc"));
        const querySnapshot = await getDocs(q);
        const sitesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Site));
        setAvailableSites(sitesData);
      } catch (error) {
        console.error("Error fetching sites: ", error);
        toast({ title: "Error al Cargar Sitios", description: "No se pudieron cargar los sitios para el filtro.", variant: "destructive" });
      } finally {
        setIsLoadingSites(false);
      }
    };
    fetchSitesData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    const fetchActividadReciente = async () => {
      const actividades: ActividadRecienteItem[] = [];
      try {
        const eventsRef = collection(db, "reportedEvents");
        // Note: Filtering recent activity by dashboard filters might be complex due to different data structures.
        // For now, recent activity remains unfiltered by the dashboard's main filters.
        const eventsQuery = query(eventsRef, orderBy("updatedAt", "desc"), limit(3));
        const eventsSnapshot = await getDocs(eventsQuery);
        eventsSnapshot.forEach(docSnap => {
          const event = docSnap.data() as ReportedEvent;
          const timestamp = event.updatedAt || event.createdAt || new Date().toISOString();
          let desc = `Evento '${event.title || 'Sin Título'}'`;
          const isNew = !event.updatedAt || !event.createdAt || (new Date(event.createdAt!).getTime() === new Date(event.updatedAt!).getTime());
          if (isNew) desc += ` registrado.`;
          else desc += ` actualizado (Estado: ${event.status}).`;
          actividades.push({ id: `evt-${docSnap.id}`, descripcion: desc, tiempo: formatRelativeTime(timestamp), tipoIcono: event.status === 'Finalizado' ? 'finalizado' : 'evento', originalTimestamp: timestamp });
        });

        const analysesRef = collection(db, "rcaAnalyses");
        const analysesQuery = query(analysesRef, orderBy("updatedAt", "desc"), limit(3));
        const analysesSnapshot = await getDocs(analysesQuery);
        analysesSnapshot.forEach(docSnap => {
          const analysis = docSnap.data() as RCAAnalysisDocument;
          const timestamp = analysis.updatedAt || analysis.createdAt || new Date().toISOString();
           actividades.push({ id: `rca-${docSnap.id}`, descripcion: `Análisis '${analysis.eventData?.focusEventDescription || `ID ${docSnap.id.substring(0,8)}...`}' actualizado.`, tiempo: formatRelativeTime(timestamp), tipoIcono: analysis.isFinalized ? 'finalizado' : 'analisis', originalTimestamp: timestamp });
        });
        actividades.sort((a, b) => parseISO(b.originalTimestamp).getTime() - parseISO(a.originalTimestamp).getTime());
        setActividadReciente(actividades.slice(0, 5));
      } catch (error) {
        console.error("Error fetching actividad reciente: ", error);
        setActividadReciente([]);
        toast({ title: "Error al Cargar Actividad Reciente", description: (error as Error).message, variant: "destructive" });
      }
    };
    fetchActividadReciente();
  }, [toast]);


  const handleFilterChange = (field: keyof DashboardFilters, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value === ALL_FILTER_VALUE ? '' : value }));
  };
  
  const applyFilters = () => {
    toast({ title: "Aplicando Filtros...", description: "Recargando datos del dashboard." });
    fetchAllDashboardData(filters);
  };

  const clearFilters = () => {
    const emptyFilters: DashboardFilters = { 
        site: '', 
        type: '' as ReportedEventType, 
        priority: '' as PriorityType, 
    };
    setFilters(emptyFilters);
    toast({ title: "Filtros Limpiados", description: "Recargando todos los datos del dashboard." });
    fetchAllDashboardData(emptyFilters);
  };

  const renderActividadIcon = (tipo: ActividadRecienteItem['tipoIcono']) => {
    switch (tipo) {
      case 'evento': return <ListChecks className="text-muted-foreground" />;
      case 'analisis': return <Activity className="text-blue-500" />;
      case 'finalizado': return <CheckSquare className="text-green-500" />;
      default: return <Bell className="text-muted-foreground" />;
    }
  };
  
  const isLoading = isLoadingData || isLoadingSites;
  const validSites = useMemo(() => availableSites.filter(s => s.name && s.name.trim() !== ""), [availableSites]);

  const pieChartData = useMemo(() => {
    if (!actionStatsData || actionStatsData.totalAcciones === 0) {
      return [];
    }
    return [
      { name: 'Pendientes', value: actionStatsData.accionesPendientes, color: 'hsl(var(--chart-4))' }, 
      { name: 'Validadas', value: actionStatsData.accionesValidadas, color: 'hsl(var(--chart-2))' },   
    ].filter(item => item.value > 0); 
  }, [actionStatsData]);

  const cumplimientoPorcentaje = useMemo(() => {
    if (!actionStatsData || actionStatsData.totalAcciones === 0) {
      return 0;
    }
    return (actionStatsData.accionesValidadas / actionStatsData.totalAcciones) * 100;
  }, [actionStatsData]);


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
            <FilterIcon className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Filtros de Búsqueda</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
          <div>
            <Label htmlFor="filter-site" className="flex items-center mb-1"><Globe className="mr-1.5 h-4 w-4 text-muted-foreground"/>Sitio/Planta</Label>
            <Select
              value={filters.site || ALL_FILTER_VALUE}
              onValueChange={(val) => handleFilterChange('site', val)}
              disabled={isLoadingSites}
            >
              <SelectTrigger id="filter-site"><SelectValue placeholder="Todos los sitios" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>Todos los sitios</SelectItem>
                {validSites.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                {validSites.length === 0 && (
                  <SelectItem value={NO_SITES_PLACEHOLDER_VALUE} disabled>
                    {availableSites.length === 0 ? "No hay sitios configurados" : "No hay sitios válidos para mostrar"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="filter-type" className="flex items-center mb-1"><AlertTriangle className="mr-1.5 h-4 w-4 text-muted-foreground"/>Tipo de Evento</Label>
            <Select
              value={filters.type || ALL_FILTER_VALUE}
              onValueChange={(val) => handleFilterChange('type', val as ReportedEventType | typeof ALL_FILTER_VALUE)}
              disabled={isLoading}
            >
              <SelectTrigger id="filter-type"><SelectValue placeholder="Todos los tipos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>Todos los tipos</SelectItem>
                {eventTypeOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="filter-priority" className="flex items-center mb-1"><Flame className="mr-1.5 h-4 w-4 text-muted-foreground"/>Prioridad</Label>
            <Select
              value={filters.priority || ALL_FILTER_VALUE}
              onValueChange={(val) => handleFilterChange('priority', val as PriorityType | typeof ALL_FILTER_VALUE)}
              disabled={isLoading}
            >
              <SelectTrigger id="filter-priority"><SelectValue placeholder="Todas las prioridades" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>Todas las prioridades</SelectItem>
                {priorityOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="flex justify-start gap-3 pt-4 border-t">
          <Button onClick={applyFilters} disabled={isLoading}><Search className="mr-2"/>Aplicar Filtros</Button>
          <Button onClick={clearFilters} variant="outline" disabled={isLoading}><RefreshCcw className="mr-2"/>Limpiar Filtros</Button>
        </CardFooter>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <RCASummaryIcon className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Resumen de Análisis de Causa Raíz</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {isLoadingData ? (
            [...Array(4)].map((_, i) => (
              <div key={`rca-load-${i}`} className="p-4 bg-secondary/30 rounded-lg flex flex-col items-center justify-center h-24">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ))
          ) : rcaSummaryData ? (
            <>
              <div className="p-4 bg-secondary/40 rounded-lg">
                <div className="flex items-center justify-center mb-1"><FileText className="h-5 w-5 text-primary mr-1.5"/></div>
                <p className="text-3xl font-bold text-primary">{rcaSummaryData.totalRCAs}</p>
                <p className="text-sm text-muted-foreground">Total RCA</p>
              </div>
              <div className="p-4 bg-yellow-400/20 rounded-lg">
                <div className="flex items-center justify-center mb-1"><ListTodo className="h-5 w-5 text-yellow-600 mr-1.5"/></div>
                <p className="text-3xl font-bold text-yellow-600">{rcaSummaryData.accionesPendientesEnRCAPendientes}</p>
                <p className="text-sm text-muted-foreground">RCA Pendientes</p>
              </div>
              <div className="p-4 bg-green-400/20 rounded-lg">
                <div className="flex items-center justify-center mb-1"><CheckSquare className="h-5 w-5 text-green-600 mr-1.5"/></div>
                <p className="text-3xl font-bold text-green-600">{rcaSummaryData.accionesValidadasEnRCAFinalizados}</p>
                <p className="text-sm text-muted-foreground">Acciones Validadas (RCA Finalizados)</p>
              </div>
              <div className="p-4 bg-blue-400/20 rounded-lg">
                <div className="flex items-center justify-center mb-1"><Percent className="h-5 w-5 text-blue-600 mr-1.5"/></div>
                <p className="text-3xl font-bold text-blue-600">{cumplimientoPorcentaje.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Cumplimiento (Global Acciones)</p>
              </div>
            </>
          ) : (
             <div className="col-span-full p-4 bg-secondary/30 rounded-lg text-center">
                <p className="text-muted-foreground">No se pudieron cargar las estadísticas de RCA.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <PieChartIcon className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Resumen de Acciones Correctivas</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {isLoadingData ? (
            <>
              {[...Array(4)].map((_, i) => (
                <div key={`action-load-${i}`} className="p-4 bg-secondary/30 rounded-lg flex flex-col items-center justify-center h-24">
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
              <div className="p-4 bg-blue-400/20 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">{cumplimientoPorcentaje.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Cumplimiento</p>
              </div>
            </>
          ) : (
             <div className="col-span-full p-4 bg-secondary/30 rounded-lg text-center">
                <p className="text-muted-foreground">No se pudieron cargar las estadísticas de acciones.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoadingData ? (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Gráfico Estado de Acciones Correctivas</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : actionStatsData && actionStatsData.totalAcciones > 0 && pieChartData.length > 0 ? (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Gráfico Estado de Acciones Correctivas</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }) => {
                    const RADIAN = Math.PI / 180;
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    if (value === 0) return null; 
                    return (
                      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px" fontWeight="bold">
                        {`${value} (${(percent * 100).toFixed(0)}%)`}
                      </text>
                    );
                  }}
                  outerRadius={100}
                  fill="#8884d8" 
                  dataKey="value"
                  nameKey="name"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                  }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <RechartsLegend
                  formatter={(value, entry) => {
                    const { color } = entry;
                    return <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>;
                  }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
         <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Gráfico Estado de Acciones Correctivas</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">No hay datos de acciones para mostrar en el gráfico.</p>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader>
           <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Análisis en Curso</CardTitle>
          </div>
           <CardDescription>Lista de análisis RCA que están actualmente en progreso, obtenidos de Firestore.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingData ? (
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
                      No hay análisis en curso que coincidan con los filtros o no se pudieron cargar.
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
         {isLoadingData ? (
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
                       No hay planes de acción activos que coincidan con los filtros o no se pudieron cargar.
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
        {isLoadingData ? ( 
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
