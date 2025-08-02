
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart as PieChartIcon, ListChecks, PlusCircle, ExternalLink, LineChart, Activity, CalendarCheck, Bell, Loader2, AlertTriangle, CheckSquare, ListFilter as FilterIcon, Globe, Flame, Search, RefreshCcw, Percent, FileText, ListTodo, BarChart3 as RCASummaryIcon, FileDown, ArrowUp, ArrowDown, ChevronsUpDown, XCircle, ShieldCheck, Calendar as CalendarIcon } from 'lucide-react';
import type { ReportedEvent, RCAAnalysisDocument, PlannedAction, Validation, Site, ReportedEventType, PriorityType, ReportedEventStatus, FullUserProfile } from '@/types/rca';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, Timestamp, where, orderBy, limit, QueryConstraint } from "firebase/firestore";
import { format, parseISO, isValid, formatDistanceToNowStrict, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, sub } from "date-fns";
import { es } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ResponsiveContainer,
} from 'recharts';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useAuth } from '@/contexts/AuthContext';
import { sendEmailAction } from '@/app/actions';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { type DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';


const eventTypeOptions: ReportedEventType[] = ['Incidente', 'Falla de Equipo', 'Accidente', 'No Conformidad', 'Evento Operacional'];
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
  rcaPendientes: number;
  rcaFinalizados: number;
  rcaVerificados: number; // New field
  rcaCompletionRate?: number;
}

interface AnalisisEnCursoItem {
  id: string;
  proyecto: string;
  currentStep: number;
  progreso: number;
  updatedAt: string; // ISO string for sorting
}

interface PlanAccionPendienteItem {
  rcaId: string;
  actionId: string;
  accion: string;
  responsable: string;
  fechaLimite: string; // 'dd/MM/yyyy' or 'N/A'
  estado: 'Activa' | 'Validada';
  rcaTitle: string;
}

interface DashboardFilters {
  site: string;
  type: ReportedEventType;
  priority: PriorityType;
  dateRange?: DateRange;
}


type SortableAnalisisEnCursoKey = 'proyecto' | 'currentStep' | 'progreso' | 'updatedAt';
interface SortConfigAnalisisEnCurso {
  key: SortableAnalisisEnCursoKey | null;
  direction: 'ascending' | 'descending';
}

type SortablePlanesAccionKey = 'rcaId' | 'actionId' | 'accion' | 'rcaTitle' | 'responsable' | 'fechaLimite' | 'estado';
interface SortConfigPlanesAccion {
  key: SortablePlanesAccionKey | null;
  direction: 'ascending' | 'descending';
}

export default function DashboardRCAPage() {
  const { toast } = useToast();
  const router = useRouter(); 
  const { userProfile, loadingAuth } = useAuth();

  const [actionStatsData, setActionStatsData] = useState<ActionStatsData | null>(null);
  const [rcaSummaryData, setRcaSummaryData] = useState<RCASummaryData | null>(null);
  const [analisisEnCurso, setAnalisisEnCurso] = useState<AnalisisEnCursoItem[]>([]);
  const [planesAccionPendientes, setPlanesAccionPendientes] = useState<PlanAccionPendienteItem[]>([]);

  const [availableUsers, setAvailableUsers] = useState<FullUserProfile[]>([]);
  const [availableSites, setAvailableSites] = useState<Site[]>([]);
  const [isLoadingSites, setIsLoadingSites] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [remindingActionId, setRemindingActionId] = useState<string | null>(null);

  const [filters, setFilters] = useState<DashboardFilters>({
    site: '',
    type: '' as ReportedEventType,
    priority: '' as PriorityType,
    dateRange: undefined,
  });

  const [sortConfigAnalisis, setSortConfigAnalisis] = useState<SortConfigAnalisisEnCurso>({ key: 'updatedAt', direction: 'descending' });
  const [sortConfigPlanes, setSortConfigPlanes] = useState<SortConfigPlanesAccion>({ key: 'fechaLimite', direction: 'ascending' });


  const fetchAllDashboardData = useCallback(async (currentFilters: DashboardFilters) => {
    setIsLoadingData(true);
    if (loadingAuth || !userProfile) {
      setIsLoadingData(false);
      return;
    }

    let totalAccionesGlobal = 0;
    let accionesPendientesGlobal = 0;
    let accionesValidadasGlobal = 0;
    const currentAnalysesInProgress: AnalisisEnCursoItem[] = [];
    const currentPendingActionPlans: PlanAccionPendienteItem[] = [];
    let currentRcaFinalizadosCount = 0;
    let currentRcaPendientesCount = 0;
    let currentRcaVerificadosCount = 0; // New counter

    try {
      // Fetch users first to have them available for reminders
      const usersQuery = query(collection(db, "users"), orderBy("name", "asc"));
      const usersSnapshot = await getDocs(usersQuery);
      setAvailableUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FullUserProfile)));

      const rcaQueryConstraints: QueryConstraint[] = [];
      const eventQueryConstraintsForCounts: QueryConstraint[] = [];

      // Company Scoping at the query level
      if (userProfile.role !== 'Super User' && userProfile.empresa) {
        rcaQueryConstraints.push(where("empresa", "==", userProfile.empresa));
        eventQueryConstraintsForCounts.push(where("empresa", "==", userProfile.empresa));
      }

      if (currentFilters.site && currentFilters.site !== ALL_FILTER_VALUE) {
        rcaQueryConstraints.push(where("eventData.place", "==", currentFilters.site));
        eventQueryConstraintsForCounts.push(where("site", "==", currentFilters.site));
      }
      if (currentFilters.type && currentFilters.type !== ALL_FILTER_VALUE) {
        rcaQueryConstraints.push(where("eventData.eventType", "==", currentFilters.type));
        eventQueryConstraintsForCounts.push(where("type", "==", currentFilters.type));
      }
      if (currentFilters.priority && currentFilters.priority !== ALL_FILTER_VALUE) {
        rcaQueryConstraints.push(where("eventData.priority", "==", currentFilters.priority));
        eventQueryConstraintsForCounts.push(where("priority", "==", currentFilters.priority));
      }

      // Date Range Filtering (Client-Side)
      const { dateRange } = currentFilters;
      const interval = dateRange?.from && dateRange?.to ? { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) } : null;

      const rcaAnalysesRef = collection(db, "rcaAnalyses");
      const rcaQueryInstance = query(rcaAnalysesRef, ...rcaQueryConstraints);
      const rcaSnapshot = await getDocs(rcaQueryInstance);
      
      const reportedEventsRef = collection(db, "reportedEvents");
      const eventsForCountsQuery = query(reportedEventsRef, ...eventQueryConstraintsForCounts);
      const filteredReportedEventsSnapshot = await getDocs(eventsForCountsQuery);
      
      const reportedEventsMap = new Map<string, ReportedEventStatus>();
      filteredReportedEventsSnapshot.docs
        .filter(doc => {
            if (!interval) return true;
            const eventDate = parseISO(doc.data().date);
            return isValid(eventDate) && isWithinInterval(eventDate, interval);
        })
        .forEach(doc => {
            reportedEventsMap.set(doc.id, doc.data().status as ReportedEventStatus);
        });

      rcaSnapshot.docs
        .filter(docSnap => reportedEventsMap.has(docSnap.id))
        .forEach(docSnap => {
        const rcaDoc = docSnap.data() as RCAAnalysisDocument;
        const rcaId = docSnap.id;
        const eventStatus = reportedEventsMap.get(rcaId);

        if (eventStatus === 'Rechazado') {
          return;
        }
        
        // Finalizados count is now only for those that are finalized but not yet verified
        if (rcaDoc.isFinalized && eventStatus === 'Finalizado') {
          currentRcaFinalizadosCount++;
        }

        if (rcaDoc.plannedActions && rcaDoc.plannedActions.length > 0) {
          rcaDoc.plannedActions.forEach(action => {
            totalAccionesGlobal++;
            const validation = rcaDoc.validations?.find(v => v.actionId === action.id);
            const isActionValidated = validation && validation.status === 'validated';

            if (isActionValidated) {
              accionesValidadasGlobal++;
            } else {
              accionesPendientesGlobal++;
            }

            if (!rcaDoc.isFinalized && !isActionValidated && eventStatus !== 'Rechazado') {
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

        if (!rcaDoc.isFinalized && eventStatus !== 'Rechazado' && eventStatus !== 'Verificado') {
            let proyecto = rcaDoc.eventData?.focusEventDescription || `Análisis ID: ${rcaId.substring(0,8)}...`;
            let currentStep = 1;
            if (rcaDoc.finalComments && rcaDoc.finalComments.trim() !== '') currentStep = 5;
            else if (rcaDoc.validations && rcaDoc.validations.length > 0 && rcaDoc.plannedActions && rcaDoc.plannedActions.length > 0) currentStep = 4;
            else if (rcaDoc.analysisTechnique || (rcaDoc.analysisTechniqueNotes && rcaDoc.analysisTechniqueNotes.trim() !== '') || (rcaDoc.identifiedRootCauses && rcaDoc.identifiedRootCauses.length > 0) || (rcaDoc.plannedActions && rcaDoc.plannedActions.length > 0)) currentStep = 3;
            else if (rcaDoc.projectLeader || (rcaDoc.detailedFacts && Object.values(rcaDoc.detailedFacts).some(v => !!v)) || (rcaDoc.analysisDetails && rcaDoc.analysisDetails.trim() !== '') || (rcaDoc.preservedFacts && rcaDoc.preservedFacts.length > 0)) currentStep = 2;

            const progreso = Math.round((currentStep / 5) * 100);
            currentAnalysesInProgress.push({ 
              id: rcaId, 
              proyecto, 
              currentStep, 
              progreso,
              updatedAt: rcaDoc.updatedAt || new Date(0).toISOString() 
            });
        }
      });

      setActionStatsData({ totalAcciones: totalAccionesGlobal, accionesPendientes: accionesPendientesGlobal, accionesValidadas: accionesValidadasGlobal });
      setAnalisisEnCurso(currentAnalysesInProgress); 
      setPlanesAccionPendientes(currentPendingActionPlans); 
      
      currentRcaPendientesCount = 0;
      reportedEventsMap.forEach((status, eventId) => {
          if ((status === 'Pendiente' || status === 'En análisis' || status === 'En validación')) {
            currentRcaPendientesCount++;
          }
          if (status === 'Verificado') {
              currentRcaVerificadosCount++;
          }
      });

      const currentTotalRCAs = currentRcaPendientesCount + currentRcaFinalizadosCount + currentRcaVerificadosCount;
      const rcaCompletionRateValue = currentTotalRCAs > 0 ? ((currentRcaFinalizadosCount + currentRcaVerificadosCount) / currentTotalRCAs) * 100 : 0;


      setRcaSummaryData({
        totalRCAs: currentTotalRCAs,
        rcaPendientes: currentRcaPendientesCount,
        rcaFinalizados: currentRcaFinalizadosCount,
        rcaVerificados: currentRcaVerificadosCount,
        rcaCompletionRate: rcaCompletionRateValue,
      });

    } catch (error) {
      console.error("Error fetching dashboard data: ", error);
      setActionStatsData({ totalAcciones: 0, accionesPendientes: 0, accionesValidadas: 0 });
      setRcaSummaryData({ totalRCAs: 0, rcaPendientes: 0, rcaFinalizados: 0, rcaVerificados: 0, rcaCompletionRate: 0 });
      setAnalisisEnCurso([]);
      setPlanesAccionPendientes([]);
      toast({ title: "Error al Cargar Datos del Dashboard", description: (error as Error).message, variant: "destructive" });
    }
    setIsLoadingData(false);
  }, [toast, userProfile, loadingAuth]);


  useEffect(() => {
    const fetchSitesData = async () => {
      if (!userProfile) return;
      setIsLoadingSites(true);
      try {
        const sitesCollectionRef = collection(db, "sites");
        const queryConstraints: QueryConstraint[] = [];
        if (userProfile.role !== 'Super User' && userProfile.empresa) {
          queryConstraints.push(where("empresa", "==", userProfile.empresa));
        }
        const q = query(sitesCollectionRef, ...queryConstraints);
        const querySnapshot = await getDocs(q);
        const sitesData = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Site))
            .sort((a,b) => a.name.localeCompare(b.name));
        setAvailableSites(sitesData);
      } catch (error) {
        console.error("Error fetching sites: ", error);
        toast({ title: "Error al Cargar Sitios", description: "No se pudieron cargar los sitios para el filtro.", variant: "destructive" });
      } finally {
        setIsLoadingSites(false);
      }
    };
    fetchSitesData();
  }, [toast, userProfile]);

  useEffect(() => {
    if (!loadingAuth && !isLoadingSites) {
      fetchAllDashboardData(filters);
    }
  }, [loadingAuth, isLoadingSites, fetchAllDashboardData, filters]);


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
        dateRange: undefined,
    };
    setFilters(emptyFilters);
    toast({ title: "Filtros Limpiados", description: "Recargando todos los datos del dashboard." });
    fetchAllDashboardData(emptyFilters);
  };

  const isLoading = isLoadingData || isLoadingSites || loadingAuth;

  const sitesForFilter = useMemo(() => {
    if (userProfile && userProfile.role !== 'Super User' && userProfile.empresa) {
        return availableSites.filter(s => s.empresa === userProfile.empresa && s.name && s.name.trim() !== "");
    }
    return availableSites.filter(s => s.name && s.name.trim() !== "");
  }, [availableSites, userProfile]);


  const actionStatusPieChartData = useMemo(() => {
    if (!actionStatsData || actionStatsData.totalAcciones === 0) {
      return [];
    }
    return [
      { name: 'Pendientes', value: actionStatsData.accionesPendientes, color: 'hsl(var(--chart-4))' },
      { name: 'Validadas', value: actionStatsData.accionesValidadas, color: 'hsl(var(--chart-2))' },
    ].filter(item => item.value > 0);
  }, [actionStatsData]);

  const rcaStatusPieChartData = useMemo(() => {
    if (!rcaSummaryData || (rcaSummaryData.rcaPendientes === 0 && rcaSummaryData.rcaFinalizados === 0 && rcaSummaryData.rcaVerificados === 0)) {
      return [];
    }
    return [
      { name: 'ACR Pendientes', value: rcaSummaryData.rcaPendientes, color: 'hsl(var(--chart-5))' }, 
      { name: 'ACR Finalizados', value: rcaSummaryData.rcaFinalizados, color: 'hsl(var(--chart-2))' },
      { name: 'ACR Verificados', value: rcaSummaryData.rcaVerificados, color: 'hsl(var(--chart-1))' }, // New data for pie chart
    ].filter(item => item.value > 0);
  }, [rcaSummaryData]);


  const cumplimientoPorcentajeAcciones = useMemo(() => {
    if (!actionStatsData || actionStatsData.totalAcciones === 0) {
      return 0;
    }
    return (actionStatsData.accionesValidadas / actionStatsData.totalAcciones) * 100;
  }, [actionStatsData]);

  const requestSortAnalisis = (key: SortableAnalisisEnCursoKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfigAnalisis.key === key && sortConfigAnalisis.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfigAnalisis({ key, direction });
  };

  const sortedAnalisisEnCurso = useMemo(() => {
    let sortableItems = [...analisisEnCurso];
    if (sortConfigAnalisis.key) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfigAnalisis.key!];
        const valB = b[sortConfigAnalisis.key!];

        if (sortConfigAnalisis.key === 'updatedAt') {
          return (parseISO(valA as string).getTime() || 0) - (parseISO(valB as string).getTime() || 0);
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
          return valA - valB;
        }
        if (typeof valA === 'string' && typeof valB === 'string') {
          return valA.localeCompare(valB);
        }
        return 0;
      });
      if (sortConfigAnalisis.direction === 'descending') {
        sortableItems.reverse();
      }
    }
    return sortableItems;
  }, [analisisEnCurso, sortConfigAnalisis]);

  const renderSortIconAnalisis = (columnKey: SortableAnalisisEnCursoKey) => {
    if (sortConfigAnalisis.key === columnKey) {
      return sortConfigAnalisis.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
    }
    return <ChevronsUpDown className="h-3 w-3 opacity-30" />;
  };

  const requestSortPlanes = (key: SortablePlanesAccionKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfigPlanes.key === key && sortConfigPlanes.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfigPlanes({ key, direction });
  };

  const sortedPlanesAccionPendientes = useMemo(() => {
    let sortableItems = [...planesAccionPendientes];
    if (sortConfigPlanes.key) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfigPlanes.key!];
        const valB = b[sortConfigPlanes.key!];

        if (sortConfigPlanes.key === 'fechaLimite') {
          const dateAStr = String(valA);
          const dateBStr = String(valB);
          const dateA = dateAStr === 'N/A' ? null : parseISO(dateAStr.split('/').reverse().join('-'));
          const dateB = dateBStr === 'N/A' ? null : parseISO(dateBStr.split('/').reverse().join('-'));
          if (dateA === null && dateB === null) return 0;
          if (dateA === null) return 1;
          if (dateB === null) return -1;
          if (isValid(dateA) && isValid(dateB)) return dateA.getTime() - dateB.getTime();
          return 0;
        }
        if (typeof valA === 'string' && typeof valB === 'string') {
          return valA.localeCompare(valB);
        }
        return 0;
      });
      if (sortConfigPlanes.direction === 'descending') {
        sortableItems.reverse();
      }
    }
    return sortableItems;
  }, [planesAccionPendientes, sortConfigPlanes]);
  
  const renderSortIconPlanes = (columnKey: SortablePlanesAccionKey) => {
    if (sortConfigPlanes.key === columnKey) {
      return sortConfigPlanes.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
    }
    return <ChevronsUpDown className="h-3 w-3 opacity-30" />;
  };


  const handleExportToExcel = () => {
    if (sortedPlanesAccionPendientes.length === 0) {
      toast({
        title: "Sin Datos para Exportar",
        description: "No hay planes de acción activos para exportar.",
        variant: "default",
      });
      return;
    }

    const dataToExport = sortedPlanesAccionPendientes.map(item => ({
      'ID Evento': item.rcaId,
      'ID Acción': item.actionId,
      'Título ACR': item.rcaTitle,
      'Descripción Acción': item.accion,
      'Responsable': item.responsable,
      'Fecha Límite': item.fechaLimite,
      'Estado Acción': item.estado,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Planes de Acción Activos");

    const columnWidths = [
      { wch: 20 }, { wch: 20 }, { wch: 40 }, { wch: 50 },
      { wch: 25 }, { wch: 15 }, { wch: 15 },
    ];
    worksheet['!cols'] = columnWidths;

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const fileName = `Planes_Accion_Activos_${formattedDate}.xlsx`;

    saveAs(dataBlob, fileName);

    toast({
      title: "Exportación Iniciada",
      description: `El archivo ${fileName} ha comenzado a descargarse.`,
    });
  };

  const handleSendReminder = async (item: PlanAccionPendienteItem) => {
    setRemindingActionId(item.actionId);
    const responsibleUser = availableUsers.find(u => u.name === item.responsable);
    
    if (!responsibleUser || !responsibleUser.email) {
        toast({
            title: "Error de Destinatario",
            description: `No se pudo encontrar un correo para el responsable '${item.responsable}'. No se puede enviar recordatorio.`,
            variant: "destructive"
        });
        setRemindingActionId(null);
        return;
    }

    const emailSubject = `Recordatorio de Tarea Pendiente: ${item.accion.substring(0, 30)}...`;
    const emailBody = `Estimado/a ${item.responsable},\n\nEste es un recordatorio de que tiene una tarea pendiente relacionada con el evento "${item.rcaTitle}" (ID: ${item.rcaId}).\n\nTarea: ${item.accion}\nFecha Límite: ${item.fechaLimite}\n\nPor favor, acceda al sistema para actualizar el estado de esta tarea.\n\nSaludos,\nSistema RCA Assistant`;
    
    const result = await sendEmailAction({
      to: responsibleUser.email,
      subject: emailSubject,
      body: emailBody,
    });

    if (result.success) {
      toast({
        title: "Recordatorio Enviado",
        description: `Se ha enviado un correo de recordatorio a ${item.responsable}.`
      });
    } else {
      toast({
        title: "Error al Enviar Recordatorio",
        description: result.message || "No se pudo enviar el correo.",
        variant: "destructive"
      });
    }
    setRemindingActionId(null);
  };

  const datePresets = [
    { name: "this_week", label: "Esta semana", getRange: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
    { name: "this_month", label: "Este mes", getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
    { name: "this_year", label: "Este año", getRange: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
    { name: "last_7_days", label: "Últimos 7 días", getRange: () => ({ from: sub(new Date(), { days: 6 }), to: new Date() }) },
    { name: "last_30_days", label: "Últimos 30 días", getRange: () => ({ from: sub(new Date(), { days: 29 }), to: new Date() }) },
  ];
  
  return (
    <div className="space-y-6 py-8">
      <header className="text-center mb-8 space-y-2">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
          <LineChart className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary">
          Dashboard ACR
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
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
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
                {sitesForFilter.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                {sitesForFilter.length === 0 && (
                  <SelectItem value={NO_SITES_PLACEHOLDER_VALUE} disabled>
                    {availableSites.length === 0 ? "No hay sitios configurados" : "No hay sitios para su empresa"}
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
          <div className="lg:col-span-1">
            <Label htmlFor="filter-date-range" className="flex items-center mb-1"><CalendarIcon className="mr-1.5 h-4 w-4 text-muted-foreground"/>Rango de Fechas</Label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                    id="filter-date-range"
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.dateRange && "text-muted-foreground"
                    )}
                    >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange?.from ? (
                        filters.dateRange.to ? (
                        <>
                            {format(filters.dateRange.from, "LLL dd, y", { locale: es })} -{" "}
                            {format(filters.dateRange.to, "LLL dd, y", { locale: es })}
                        </>
                        ) : (
                        format(filters.dateRange.from, "LLL dd, y", { locale: es })
                        )
                    ) : (
                        <span>Seleccione un rango</span>
                    )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <div className="flex flex-col">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={filters.dateRange?.from}
                          selected={filters.dateRange}
                          onSelect={(range) => handleFilterChange('dateRange', range)}
                          numberOfMonths={2}
                          locale={es}
                        />
                        <div className="flex flex-wrap justify-center sm:justify-end gap-2 p-2 border-t">
                            {datePresets.map(({ name, label, getRange }) => (
                                <Button
                                key={name}
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFilterChange('dateRange', getRange())}
                                >
                                {label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
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
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
          {isLoadingData ? (
            [...Array(5)].map((_, i) => (
              <div key={`rca-load-${i}`} className="p-4 bg-secondary/30 rounded-lg flex flex-col items-center justify-center h-24">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ))
          ) : rcaSummaryData ? (
            <>
              <div className="p-4 bg-secondary/40 rounded-lg">
                <div className="flex items-center justify-center mb-1"><FileText className="h-5 w-5 text-primary mr-1.5"/></div>
                <p className="text-3xl font-bold text-primary">{rcaSummaryData.totalRCAs}</p>
                <p className="text-sm text-muted-foreground">Total ACR (Activos)</p>
              </div>
              <div className="p-4 bg-yellow-400/20 rounded-lg">
                <div className="flex items-center justify-center mb-1"><ListTodo className="h-5 w-5 text-yellow-600 mr-1.5"/></div>
                <p className="text-3xl font-bold text-yellow-600">{rcaSummaryData.rcaPendientes}</p>
                <p className="text-sm text-muted-foreground">ACR Pendientes</p>
              </div>
              <div className="p-4 bg-green-400/20 rounded-lg">
                <div className="flex items-center justify-center mb-1"><CheckSquare className="h-5 w-5 text-green-600 mr-1.5"/></div>
                <p className="text-3xl font-bold text-green-600">{rcaSummaryData.rcaFinalizados}</p>
                <p className="text-sm text-muted-foreground">ACR Finalizados</p>
              </div>
              <div className="p-4 bg-indigo-400/20 rounded-lg">
                <div className="flex items-center justify-center mb-1"><ShieldCheck className="h-5 w-5 text-indigo-600 mr-1.5"/></div>
                <p className="text-3xl font-bold text-indigo-600">{rcaSummaryData.rcaVerificados}</p>
                <p className="text-sm text-muted-foreground">ACR Verificados</p>
              </div>
              <div className="p-4 bg-blue-400/20 rounded-lg">
                <div className="flex items-center justify-center mb-1"><Percent className="h-5 w-5 text-blue-600 mr-1.5"/></div>
                <p className="text-3xl font-bold text-blue-600">
                  {rcaSummaryData.rcaCompletionRate !== undefined ? rcaSummaryData.rcaCompletionRate.toFixed(1) : '0.0'}%
                </p>
                <p className="text-sm text-muted-foreground">Cumplimiento ACR</p>
              </div>
            </>
          ) : (
             <div className="col-span-full p-4 bg-secondary/30 rounded-lg text-center">
                <p className="text-muted-foreground">No se pudieron cargar las estadísticas de ACR.</p>
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
                <p className="text-3xl font-bold text-blue-600">{cumplimientoPorcentajeAcciones.toFixed(1)}%</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Gráfico Estado de Análisis de Causa Raíz</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isLoadingData ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : rcaSummaryData && rcaStatusPieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={rcaStatusPieChartData}
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
                    {rcaStatusPieChartData.map((entry, index) => (
                      <Cell key={`cell-rca-${index}`} fill={entry.color} />
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
                    formatter={(value) => <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No hay datos de estado ACR para mostrar.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Gráfico Estado de Acciones Correctivas</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isLoadingData ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : actionStatsData && actionStatusPieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={actionStatusPieChartData}
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
                    {actionStatusPieChartData.map((entry, index) => (
                      <Cell key={`cell-action-${index}`} fill={entry.color} />
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
                    formatter={(value) => <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No hay datos de acciones para mostrar.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>


      <Card className="shadow-lg">
        <CardHeader>
           <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Análisis en Curso</CardTitle>
          </div>
           <CardDescription>Lista de análisis ACR que están actualmente en progreso, obtenidos de Firestore.</CardDescription>
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
                <TableRow><TableHead className="w-[40%] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSortAnalisis('proyecto')}><div className="flex items-center gap-1">Proyecto/Evento {renderSortIconAnalisis('proyecto')}</div></TableHead><TableHead className="w-[30%] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSortAnalisis('currentStep')}><div className="flex items-center gap-1">Paso Actual {renderSortIconAnalisis('currentStep')}</div></TableHead><TableHead className="w-[30%] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSortAnalisis('progreso')}><div className="flex items-center gap-1">Progreso Estimado {renderSortIconAnalisis('progreso')}</div></TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {sortedAnalisisEnCurso.length > 0 ? sortedAnalisisEnCurso.map((item) => (
                  <TableRow key={item.id}><TableCell className="font-medium">{item.proyecto}</TableCell><TableCell>Paso {item.currentStep} de 5</TableCell><TableCell><div className="flex items-center gap-2"><Progress value={item.progreso} className="h-2.5" /><span className="text-xs text-muted-foreground">{item.progreso}%</span></div></TableCell></TableRow>
                )) : (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                      No hay análisis en curso que coincidan con los filtros o no se pudieron cargar.
                    </TableCell></TableRow>
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
                    <TableHead className="w-[15%] text-xs cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSortPlanes('rcaId')}><div className="flex items-center gap-1">ID Evento {renderSortIconPlanes('rcaId')}</div></TableHead>
                    <TableHead className="w-[15%] text-xs cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSortPlanes('actionId')}><div className="flex items-center gap-1">ID Acción {renderSortIconPlanes('actionId')}</div></TableHead>
                    <TableHead className="w-[25%] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSortPlanes('accion')}><div className="flex items-center gap-1">Acción (Análisis: <span className="italic text-xs">Título ACR</span>) {renderSortIconPlanes('accion')}</div></TableHead>
                    <TableHead className="w-[15%] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSortPlanes('responsable')}><div className="flex items-center gap-1">Responsable {renderSortIconPlanes('responsable')}</div></TableHead>
                    <TableHead className="w-[10%] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSortPlanes('fechaLimite')}><div className="flex items-center gap-1">Fecha Límite {renderSortIconPlanes('fechaLimite')}</div></TableHead>
                    <TableHead className="w-[10%] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSortPlanes('estado')}><div className="flex items-center gap-1">Estado Acción {renderSortIconPlanes('estado')}</div></TableHead>
                    <TableHead className="w-[10%] text-right">Recordatorio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPlanesAccionPendientes.length > 0 ? sortedPlanesAccionPendientes.slice(0,5).map((item) => ( // Only show top 5
                  <TableRow key={`${item.rcaId}-${item.actionId}`}>
                    <TableCell className="font-mono text-xs">{item.rcaId.substring(0, 8)}...</TableCell>
                    <TableCell className="font-mono text-xs">{item.actionId.substring(0, 8)}...</TableCell>
                    <TableCell className="font-medium text-sm">{item.accion}<p className="text-xs text-muted-foreground italic mt-0.5">Del Análisis: {item.rcaTitle}</p></TableCell>
                    <TableCell className="text-sm">{item.responsable}</TableCell>
                    <TableCell className="text-sm">{item.fechaLimite}</TableCell>
                    <TableCell><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">{item.estado}</span></TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSendReminder(item)}
                        disabled={remindingActionId === item.actionId}
                        title={`Enviar recordatorio a ${item.responsable}`}
                      >
                        {remindingActionId === item.actionId ? <Loader2 className="h-4 w-4 animate-spin"/> : <Bell className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                       No hay planes de acción activos que coincidan con los filtros o no se pudieron cargar.
                    </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter className="flex justify-start gap-2 pt-4 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportToExcel}
            disabled={isLoadingData || sortedPlanesAccionPendientes.length === 0}
          >
            <FileDown className="mr-1.5 h-3.5 w-3.5" /> Exportar Excel (Todos los Activos)
          </Button>
        </CardFooter>
      </Card>

    </div>
  );
}
