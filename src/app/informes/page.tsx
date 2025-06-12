
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { PieChart as PieChartIcon, ListChecks, History, PlusCircle, ExternalLink, LineChart, Activity, CalendarCheck, Bell, Loader2, AlertTriangle, CheckSquare, ListFilter as FilterIcon, Globe, CalendarDays, Flame, Search, RefreshCcw } from 'lucide-react';
import type { ReportedEvent, RCAAnalysisDocument, PlannedAction, Validation, Site, ReportedEventType, PriorityType, ReportedEventStatus } from '@/types/rca';
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
const statusOptions: ReportedEventStatus[] = ['Pendiente', 'En análisis', 'Finalizado'];
const ALL_FILTER_VALUE = "__ALL__";
const NO_SITES_PLACEHOLDER_VALUE = "__NO_SITES_PLACEHOLDER__";

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
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  type: ReportedEventType;
  priority: PriorityType;
  status: ReportedEventStatus;
}

export default function DashboardRCAPage() {
  const { toast } = useToast();

  const [actionStatsData, setActionStatsData] = useState<ActionStatsData | null>(null);
  const [analisisEnCurso, setAnalisisEnCurso] = useState<AnalisisEnCursoItem[]>([]);
  const [planesAccionPendientes, setPlanesAccionPendientes] = useState<PlanAccionPendienteItem[]>([]);
  const [actividadReciente, setActividadReciente] = useState<ActividadRecienteItem[]>([]);
  
  const [availableSites, setAvailableSites] = useState<Site[]>([]);
  const [isLoadingSites, setIsLoadingSites] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [filters, setFilters] = useState<DashboardFilters>({
    site: '',
    dateFrom: undefined,
    dateTo: undefined,
    type: '' as ReportedEventType,
    priority: '' as PriorityType,
    status: '' as ReportedEventStatus,
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
    if (currentFilters.site) {
      baseQueryConstraints.push(where("eventData.site", "==", currentFilters.site));
    }
    if (currentFilters.dateFrom) {
      baseQueryConstraints.push(where("eventData.date", ">=", format(currentFilters.dateFrom, "yyyy-MM-dd")));
    }
    if (currentFilters.dateTo) {
      baseQueryConstraints.push(where("eventData.date", "<=", format(currentFilters.dateTo, "yyyy-MM-dd")));
    }
    if (currentFilters.type) {
      baseQueryConstraints.push(where("eventData.eventType", "==", currentFilters.type));
    }
    if (currentFilters.priority) {
      baseQueryConstraints.push(where("eventData.priority", "==", currentFilters.priority));
    }
    if (currentFilters.status) {
      if (currentFilters.status === 'Finalizado') {
        baseQueryConstraints.push(where("isFinalized", "==", true));
      } else { 
        const isFinalizedFalseAlreadyPresent = baseQueryConstraints.some(
            (c: any) => (c._fieldPath?.toString() === 'isFinalized' || c._field === 'isFinalized') && c._op === '==' && c._value === false
        );
        if (!isFinalizedFalseAlreadyPresent) {
            baseQueryConstraints.push(where("isFinalized", "==", false));
        }
      }
    }

    // Fetch Action Stats
    try {
      const rcaAnalysesRef = collection(db, "rcaAnalyses");
      const actionStatsQuery = query(rcaAnalysesRef, ...baseQueryConstraints);
      const querySnapshot = await getDocs(actionStatsQuery);
      
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
      setActionStatsData({ totalAcciones, accionesPendientes, accionesValidadas });
    } catch (error) {
      console.error("Error fetching action stats for dashboard: ", error);
      setActionStatsData({ totalAcciones: 0, accionesPendientes: 0, accionesValidadas: 0 }); 
      toast({ title: "Error al Cargar Estadísticas de Acciones", description: (error as Error).message, variant: "destructive" });
    }

    // Fetch Analisis En Curso
    try {
      const analisisQueryConstraints = [...baseQueryConstraints];
      let shouldFetchAnalisis = true;

      const isFinalizedFilterApplied = analisisQueryConstraints.some(
        (c: any) => (c._fieldPath?.toString() === 'isFinalized' || c._field === 'isFinalized')
      );

      if (currentFilters.status === 'Finalizado' && isFinalizedFilterApplied) {
         // isFinalized == true is already applied by the status filter
      } else if (currentFilters.status && currentFilters.status !== 'Finalizado' && isFinalizedFilterApplied) {
        // isFinalized == false is already applied by the status filter
      } else if (!isFinalizedFilterApplied) {
         if (!currentFilters.status) { 
             analisisQueryConstraints.push(where("isFinalized", "==", false));
        }
      }
      
      if (currentFilters.status === 'Finalizado') {
        setAnalisisEnCurso([]);
        shouldFetchAnalisis = false;
      }


      if (shouldFetchAnalisis) {
        let effectiveAnalisisQueryConstraints = [...analisisQueryConstraints];
        const existingOrderByIndex = effectiveAnalisisQueryConstraints.findIndex((c: any) => c._op === 'orderBy' && (c._fieldPath?.toString() === 'updatedAt' || c._field === 'updatedAt'));
        if (existingOrderByIndex > -1) {
            effectiveAnalisisQueryConstraints.splice(existingOrderByIndex, 1);
        }
        effectiveAnalisisQueryConstraints.push(orderBy("updatedAt", "desc"));
        
        const rcaAnalysesRef = collection(db, "rcaAnalyses");
        const q = query(rcaAnalysesRef, ...effectiveAnalisisQueryConstraints);
        const querySnapshot = await getDocs(q);
        console.log(`[fetchAnalisisEnCurso] Found ${querySnapshot.docs.length} documents.`);
        
        const analysesData = querySnapshot.docs.map(docSnap => {
          const doc = docSnap.data() as RCAAnalysisDocument;
          const id = docSnap.id;
          let proyecto = doc.eventData?.focusEventDescription || `Análisis ID: ${id.substring(0,8)}...`;
          let currentStep = 1; 
          if (doc.finalComments && doc.finalComments.trim() !== '') currentStep = 5;
          else if (doc.validations && doc.validations.length > 0 && doc.plannedActions && doc.plannedActions.length > 0) currentStep = 4;
          else if (doc.analysisTechnique || (doc.analysisTechniqueNotes && doc.analysisTechniqueNotes.trim() !== '') || (doc.identifiedRootCauses && doc.identifiedRootCauses.length > 0) || (doc.plannedActions && doc.plannedActions.length > 0)) currentStep = 3;
          else if (doc.projectLeader || (doc.detailedFacts && Object.values(doc.detailedFacts).some(v => !!v)) || (doc.analysisDetails && doc.analysisDetails.trim() !== '') || (doc.preservedFacts && doc.preservedFacts.length > 0)) currentStep = 2;
          
          const progreso = Math.round((currentStep / 5) * 100);
          return { id, proyecto, currentStep, progreso };
        });
        setAnalisisEnCurso(analysesData);
      }
    } catch (error) {
      console.error("Error fetching analisis en curso: ", error);
      setAnalisisEnCurso([]);
      toast({ title: "Error al Cargar Análisis en Curso", description: (error as Error).message, variant: "destructive" });
    }

    // Fetch Planes de Acción Activos
    try {
      const planesQueryConstraints = [...baseQueryConstraints];
      let shouldFetchPlanes = true;
      
      const isFinalizedFilterAppliedForPlanes = planesQueryConstraints.some(
        (c: any) => (c._fieldPath?.toString() === 'isFinalized' || c._field === 'isFinalized')
      );

      if (currentFilters.status === 'Finalizado' && isFinalizedFilterAppliedForPlanes) {
         // isFinalized == true is already applied
      } else if (currentFilters.status && currentFilters.status !== 'Finalizado' && isFinalizedFilterAppliedForPlanes) {
        // isFinalized == false is already applied
      } else if (!isFinalizedFilterAppliedForPlanes) {
        if (!currentFilters.status) { 
            planesQueryConstraints.push(where("isFinalized", "==", false));
        }
      }

      if (currentFilters.status === 'Finalizado') {
        setPlanesAccionPendientes([]);
        shouldFetchPlanes = false; 
      }
      
      if (shouldFetchPlanes) {
        let effectivePlanesQueryConstraints = [...planesQueryConstraints];
        const existingOrderByIndex = effectivePlanesQueryConstraints.findIndex((c: any) => c._op === 'orderBy' && (c._fieldPath?.toString() === 'updatedAt' || c._field === 'updatedAt'));
        if (existingOrderByIndex > -1) {
            effectivePlanesQueryConstraints.splice(existingOrderByIndex, 1);
        }
        effectivePlanesQueryConstraints.push(orderBy("updatedAt", "desc"));
        
        const rcaAnalysesRef = collection(db, "rcaAnalyses");
        const q = query(rcaAnalysesRef, ...effectivePlanesQueryConstraints);
        const querySnapshot = await getDocs(q);
        const planes: PlanAccionPendienteItem[] = [];
        querySnapshot.forEach(docSnap => {
          const rcaDoc = docSnap.data() as RCAAnalysisDocument;
          rcaDoc.plannedActions?.forEach(action => {
            const validation = rcaDoc.validations?.find(v => v.actionId === action.id);
            if (!validation || validation.status === 'pending') {
              planes.push({
                actionId: action.id,
                rcaId: docSnap.id,
                accion: action.description,
                responsable: action.responsible,
                fechaLimite: action.dueDate && isValid(parseISO(action.dueDate)) ? format(parseISO(action.dueDate), 'dd/MM/yyyy', { locale: es }) : 'N/A',
                estado: 'Activa',
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
            } catch (e) { /* Silently ignore */ }
            return 0; 
        }).slice(0, 5));
      }
    } catch (error) {
      console.error("Error fetching planes de acción: ", error);
      setPlanesAccionPendientes([]);
      toast({ title: "Error al Cargar Planes de Acción", description: (error as Error).message, variant: "destructive" });
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
  
  const handleDateFromChange = (date: Date | undefined) => {
    setFilters(prev => ({ ...prev, dateFrom: date }));
  };

  const handleDateToChange = (date: Date | undefined) => {
    setFilters(prev => ({ ...prev, dateTo: date }));
  };

  const applyFilters = () => {
    toast({ title: "Aplicando Filtros...", description: "Recargando datos del dashboard." });
    fetchAllDashboardData(filters);
  };

  const clearFilters = () => {
    const emptyFilters: DashboardFilters = { 
        site: '', 
        dateFrom: undefined, 
        dateTo: undefined, 
        type: '' as ReportedEventType, 
        priority: '' as PriorityType, 
        status: '' as ReportedEventStatus 
    };
    setFilters(emptyFilters);
    toast({ title: "Filtros Limpiados", description: "Recargando todos los datos del dashboard." });
    fetchAllDashboardData(emptyFilters);
  };

  const renderActividadIcon = (tipo: ActividadRecienteItem['tipoIcono']) => {
    switch (tipo) {
      case 'evento': return <ListFilterIcon className="text-muted-foreground" />;
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
      { name: 'Pendientes', value: actionStatsData.accionesPendientes, color: 'hsl(var(--chart-4))' }, // orange-yellow
      { name: 'Validadas', value: actionStatsData.accionesValidadas, color: 'hsl(var(--chart-2))' },   // moss green
    ].filter(item => item.value > 0); 
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
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
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
            <Label htmlFor="filter-date-from" className="flex items-center mb-1">
              <CalendarDays className="mr-1.5 h-4 w-4 text-muted-foreground"/>Fecha desde del Evento
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="filter-date-from" variant="outline" className="w-full justify-start text-left font-normal" disabled={isLoading}>
                  {filters.dateFrom ? format(filters.dateFrom, "PPP", { locale: es }) : <span>Seleccione fecha desde</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent 
                  mode="single" 
                  selected={filters.dateFrom} 
                  onSelect={handleDateFromChange} 
                  initialFocus 
                  locale={es}
                  disabled={{ after: new Date() }} 
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label htmlFor="filter-date-to" className="flex items-center mb-1">
              <CalendarDays className="mr-1.5 h-4 w-4 text-muted-foreground"/>Fecha hasta del Evento
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="filter-date-to" variant="outline" className="w-full justify-start text-left font-normal" disabled={isLoading}>
                  {filters.dateTo ? format(filters.dateTo, "PPP", { locale: es }) : <span>Seleccione fecha hasta</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent 
                  mode="single" 
                  selected={filters.dateTo} 
                  onSelect={handleDateToChange} 
                  initialFocus 
                  locale={es} 
                  disabled={{ after: new Date() }}
                />
              </PopoverContent>
            </Popover>
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
          <div>
            <Label htmlFor="filter-status" className="flex items-center mb-1"><Activity className="mr-1.5 h-4 w-4 text-muted-foreground"/>Estado</Label>
            <Select
              value={filters.status || ALL_FILTER_VALUE}
              onValueChange={(val) => handleFilterChange('status', val as ReportedEventStatus | typeof ALL_FILTER_VALUE)}
              disabled={isLoading}
            >
              <SelectTrigger id="filter-status"><SelectValue placeholder="Todos los estados" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>Todos los estados</SelectItem>
                {statusOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
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
            <PieChartIcon className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Resumen de Acciones Correctivas</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          {isLoadingData ? (
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
                        {`${(percent * 100).toFixed(0)}%`}
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

