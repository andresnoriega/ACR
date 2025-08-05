
'use client';

import { useState, useMemo, useCallback, useEffect, FC } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/hooks/use-toast";
import type { ReportedEvent, ReportedEventType, PriorityType, Site, RCAAnalysisDocument, IdentifiedRootCause, PlannedAction } from '@/types/rca';
import { ListOrdered, PieChart as PieChartIcon, BarChart as BarChartIcon, ListFilter, Globe, CalendarDays, AlertTriangle, Flame, ActivityIcon, Search, RefreshCcw, Loader2, FileDown, History, ChevronsRight, Home, ListChecks, Bell, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, where, type QueryConstraint } from "firebase/firestore";
import { useAuth } from '@/contexts/AuthContext';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, isValid as isValidDate } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Progress } from '@/components/ui/progress';
import { BarChart, PieChart, Pie, Cell, Legend, ResponsiveContainer, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';


const eventTypeOptions: ReportedEventType[] = ['Incidente', 'Falla de Equipo', 'Accidente', 'No Conformidad', 'Evento Operacional', 'No Conformidad Potencial', 'Hallazgo'];
const priorityOptions: PriorityType[] = ['Alta', 'Media', 'Baja'];

const ALL_FILTER_VALUE = "__ALL__";
const NO_SITES_PLACEHOLDER_VALUE = "__NO_SITES_PLACEHOLDER__";

interface Filters {
  site: string;
  dateRange: DateRange | undefined;
  type: ReportedEventType | '';
  priority: PriorityType | '';
}

interface RootCauseSummary extends IdentifiedRootCause {
  eventDate: string;
  site: string;
  equipo: string;
}

// --- Tipos para Ordenamiento ---
type SortableRootCauseKey = 'eventDate' | 'site' | 'equipo' | 'description';
interface SortConfigRootCause {
  key: SortableRootCauseKey | null;
  direction: 'ascending' | 'descending';
}

type SortableAnalysisInProgressKey = 'proyecto' | 'paso' | 'progreso';
interface SortConfigAnalysis {
  key: SortableAnalysisInProgressKey | null;
  direction: 'ascending' | 'descending';
}

type SortableActionPlanKey = 'idEvento' | 'idAccion' | 'descripcion' | 'responsable' | 'fechaLimite' | 'estado';
interface SortConfigActionPlan {
    key: SortableActionPlanKey | null;
    direction: 'ascending' | 'descending';
}

// --- Chart Components ---

const RcaStatusChart: FC<{ data: { name: string; value: number; fill: string; }[] }> = ({ data }) => {
  const chartConfig = {
    pendientes: { label: "ACR Pendientes", color: "hsl(var(--chart-4))" },
    finalizados: { label: "ACR Finalizados", color: "hsl(var(--chart-2))" },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gráfico Estado de Análisis de Causa Raíz</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, value, percent }) => `${value} (${(percent * 100).toFixed(0)}%)`}
            >
              {data.map((entry) => (
                <Cell key={`cell-${entry.name}`} fill={entry.fill} />
              ))}
            </Pie>
            <Legend />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};


const ActionStatusChart: FC<{ data: { name: string; value: number; fill: string; }[] }> = ({ data }) => {
   const chartConfig = {
    pendientes: { label: "Pendientes", color: "hsl(var(--chart-4))" },
    validadas: { label: "Validadas", color: "hsl(var(--chart-2))" },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gráfico Estado de Acciones Correctivas</CardTitle>
      </CardHeader>
      <CardContent>
         <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
           <PieChart>
             <ChartTooltip
                 cursor={false}
                 content={<ChartTooltipContent hideLabel />}
               />
             <Pie
               data={data}
               dataKey="value"
               nameKey="name"
               cx="50%"
               cy="50%"
               outerRadius={80}
               label={({ name, value, percent }) => `${value} (${(percent * 100).toFixed(0)}%)`}
             >
               {data.map((entry) => (
                 <Cell key={`cell-${entry.name}`} fill={entry.fill} />
               ))}
             </Pie>
             <Legend />
           </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

const EventosPorSitioYEquipoChart: FC<{ data: RCAAnalysisDocument[] }> = ({ data }) => {
  const [drilldownLevel, setDrilldownLevel] = useState<'sitio' | 'equipo'>('sitio');
  const [selectedSite, setSelectedSite] = useState<string | null>(null);

  const handleBarClick = (barData: any) => {
    if (drilldownLevel === 'sitio' && barData && barData.name) {
      setSelectedSite(barData.name);
      setDrilldownLevel('equipo');
    }
  };

  const resetDrilldown = () => {
    setSelectedSite(null);
    setDrilldownLevel('sitio');
  };

  const chartData = useMemo(() => {
    if (drilldownLevel === 'sitio') {
      const counts = data.reduce((acc, doc) => {
        const site = doc.eventData?.place || 'Sin Sitio';
        acc[site] = (acc[site] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });
      return Object.entries(counts).map(([name, value]) => ({ name, Eventos: value }));
    } else if (drilldownLevel === 'equipo' && selectedSite) {
      const counts = data
        .filter(doc => (doc.eventData?.place || 'Sin Sitio') === selectedSite)
        .reduce((acc, doc) => {
          const equipo = doc.eventData?.equipo || 'Sin Equipo';
          acc[equipo] = (acc[equipo] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number });
      return Object.entries(counts).map(([name, value]) => ({ name, Eventos: value }));
    }
    return [];
  }, [data, drilldownLevel, selectedSite]);
  
  const chartTitle = drilldownLevel === 'sitio' 
    ? "Eventos por Sitio" 
    : `Eventos por Equipo en "${selectedSite}"`;
    
  const chartConfig = {
    Eventos: {
      label: "Eventos",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;


  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{chartTitle}</CardTitle>
          {drilldownLevel === 'equipo' && (
            <Button variant="outline" size="sm" onClick={resetDrilldown}>
              <Home className="mr-2 h-4 w-4" /> Volver a Sitios
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
            <BarChart data={chartData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" type="category" tick={{ fontSize: 12 }} interval={0} />
              <YAxis dataKey="Eventos" type="number" allowDecimals={false} />
              <ChartTooltip
                  cursor={false}
                  content={
                  <ChartTooltipContent
                      labelFormatter={(label) => chartData.find((d) => d.name === label)?.name || label}
                      formatter={(value) => `${value} Eventos`}
                      hideIndicator
                  />
                  }
              />
              <Legend />
              <Bar 
                dataKey="Eventos" 
                fill="var(--color-Eventos)"
                radius={4} 
                onClick={(payload) => handleBarClick(payload)}
                cursor={drilldownLevel === 'sitio' ? 'pointer' : 'default'}
              />
            </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};


export default function InformesPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { userProfile, loadingAuth } = useAuth();

  const [allRcaDocs, setAllRcaDocs] = useState<RCAAnalysisDocument[]>([]);
  const [filteredRcaDocs, setFilteredRcaDocs] = useState<RCAAnalysisDocument[]>([]);
  const [availableSites, setAvailableSites] = useState<Site[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [filters, setFilters] = useState<Filters>({
    site: '',
    dateRange: undefined,
    type: '',
    priority: '',
  });

  const [sortConfigRootCauses, setSortConfigRootCauses] = useState<SortConfigRootCause>({ key: 'eventDate', direction: 'descending' });
  const [sortConfigAnalysis, setSortConfigAnalysis] = useState<SortConfigAnalysis>({ key: 'proyecto', direction: 'ascending' });
  const [sortConfigActionPlan, setSortConfigActionPlan] = useState<SortConfigActionPlan>({ key: 'fechaLimite', direction: 'ascending' });


  const fetchAllData = useCallback(async () => {
    if (loadingAuth || !userProfile) {
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    try {
      const sitesCollectionRef = collection(db, "sites");
      const sitesQueryConstraints: QueryConstraint[] = [];
      if (userProfile.role !== 'Super User' && userProfile.empresa) {
        sitesQueryConstraints.push(where("empresa", "==", userProfile.empresa));
      }
      const sitesQuery = query(sitesCollectionRef, ...sitesQueryConstraints);
      const sitesSnapshot = await getDocs(sitesQuery);
      const userAllowedSites = sitesSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Site))
        .sort((a, b) => a.name.localeCompare(b.name));
      setAvailableSites(userAllowedSites);

      const rcaCollectionRef = collection(db, "rcaAnalyses");
      const rcaQueryConstraints: QueryConstraint[] = [];
      if (userProfile.role !== 'Super User' && userProfile.empresa) {
        rcaQueryConstraints.push(where('empresa', '==', userProfile.empresa));
      }
      const rcaQuery = query(rcaCollectionRef, ...rcaQueryConstraints);
      
      const rcaSnapshot = await getDocs(rcaQuery);
      const rawRcaData = rcaSnapshot.docs.map(doc => {
        const data = doc.data();
        let eventDate = data.eventData?.date;
        if (eventDate && typeof eventDate.toDate === 'function') {
          eventDate = eventDate.toDate().toISOString().split('T')[0];
        }
        return { 
          id: doc.id, 
          ...data,
          eventData: {
            ...data.eventData,
            date: eventDate,
          } 
        } as RCAAnalysisDocument;
      });

      rawRcaData.sort((a, b) => {
        const dateA = a.eventData?.date ? new Date(a.eventData.date).getTime() : 0;
        const dateB = b.eventData?.date ? new Date(b.eventData.date).getTime() : 0;
        return dateB - dateA;
      });
      
      setAllRcaDocs(rawRcaData);
      setFilteredRcaDocs(rawRcaData);
    } catch (error) {
      console.error("Error fetching data for reports: ", error);
      toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar los datos para los informes.", variant: "destructive" });
      setAllRcaDocs([]);
      setFilteredRcaDocs([]);
    } finally {
      setIsLoadingData(false);
    }
  }, [toast, loadingAuth, userProfile]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const applyFilters = useCallback(() => {
    let docs = [...allRcaDocs];
    if (filters.site) {
      docs = docs.filter(doc => doc.eventData?.place === filters.site);
    }
    if (filters.dateRange?.from) {
      docs = docs.filter(doc => {
        if (!doc.eventData?.date) return false;
        const eventDate = parseISO(doc.eventData.date);
        if (!isValidDate(eventDate)) return false;
        const fromDate = filters.dateRange!.from!;
        const toDate = filters.dateRange!.to || fromDate;
        return eventDate >= fromDate && eventDate <= toDate;
      });
    }
    if (filters.type) {
      docs = docs.filter(doc => doc.eventData?.eventType === filters.type);
    }
    if (filters.priority) {
      docs = docs.filter(doc => doc.eventData?.priority === filters.priority);
    }
    setFilteredRcaDocs(docs);
    toast({ title: "Filtros Aplicados", description: `${docs.length} análisis encontrados.` });
  }, [filters, allRcaDocs, toast]);

  const clearFilters = () => {
    setFilters({ site: '', dateRange: undefined, type: '', priority: '' });
    setFilteredRcaDocs(allRcaDocs);
    toast({ title: "Filtros Limpiados" });
  };
  
  const summaryData = useMemo(() => {
    const dataSet = filteredRcaDocs;
    const total = dataSet.length;
    const pendientes = dataSet.filter(e => !e.isFinalized && !e.rejectionDetails).length;
    const finalizados = dataSet.filter(e => e.isFinalized && !e.rejectionDetails).length;
    const verificados = dataSet.filter(e => e.efficacyVerification?.status === 'verified').length;
    const cumplimiento = total > 0 ? (verificados / total) * 100 : 0;

    const allActions = dataSet.flatMap(doc => doc.plannedActions || []);
    const totalAcciones = allActions.length;
    const accionesValidadas = allActions.filter(a => {
        const validation = dataSet.find(d => d.eventData.id === a.eventId)?.validations.find(v => v.actionId === a.id);
        return validation?.status === 'validated';
    }).length;
    const accionesPendientes = totalAcciones - accionesValidadas;
    const cumplimientoAcciones = totalAcciones > 0 ? (accionesValidadas / totalAcciones) * 100 : 0;

    return { total, pendientes, finalizados, verificados, cumplimiento, totalAcciones, accionesPendientes, accionesValidadas, cumplimientoAcciones };
  }, [filteredRcaDocs]);

  const { rcaStatusChartData, actionStatusChartData } = useMemo(() => {
    const rcaData = [
      { name: 'ACR Pendientes', value: summaryData.pendientes, fill: 'hsl(var(--chart-4))' },
      { name: 'ACR Finalizados', value: summaryData.finalizados, fill: 'hsl(var(--chart-2))' },
    ].filter(item => item.value > 0);

    const actionData = [
      { name: 'Pendientes', value: summaryData.accionesPendientes, fill: 'hsl(var(--chart-4))' },
      { name: 'Validadas', value: summaryData.accionesValidadas, fill: 'hsl(var(--chart-2))' },
    ].filter(item => item.value > 0);

    return { rcaStatusChartData: rcaData, actionStatusChartData: actionData };
  }, [summaryData]);


  const rootCauseSummaryData = useMemo(() => {
    return filteredRcaDocs.flatMap(doc => 
        (doc.identifiedRootCauses || [])
            .filter(rc => rc.description.trim() !== '')
            .map(rc => ({
                ...rc,
                eventDate: doc.eventData.date,
                site: doc.eventData.place,
                equipo: doc.eventData.equipo,
            }))
    );
  }, [filteredRcaDocs]);

  const requestSortRootCauses = (key: SortableRootCauseKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfigRootCauses.key === key && sortConfigRootCauses.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfigRootCauses({ key, direction });
  };

  const sortedRootCauseSummaryData = useMemo(() => {
    let sortableItems = [...rootCauseSummaryData];
    if (sortConfigRootCauses.key) {
      sortableItems.sort((a, b) => {
        const key = sortConfigRootCauses.key!;
        const valA = a[key] ?? '';
        const valB = b[key] ?? '';
        
        if (key === 'eventDate') {
          const dateA = valA ? parseISO(valA as string).getTime() : 0;
          const dateB = valB ? parseISO(valB as string).getTime() : 0;
          return dateA - dateB;
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
          return valA.localeCompare(valB, undefined, { numeric: true });
        }
        
        return 0;
      });

      if (sortConfigRootCauses.direction === 'descending') {
        sortableItems.reverse();
      }
    }
    return sortableItems;
  }, [rootCauseSummaryData, sortConfigRootCauses]);

  const renderSortIconRootCauses = (columnKey: SortableRootCauseKey) => {
    if (sortConfigRootCauses.key !== columnKey) {
      return <ChevronsUpDown className="h-4 w-4 opacity-30 ml-1" />;
    }
    return sortConfigRootCauses.direction === 'ascending' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const handleExportRootCauses = () => {
    if (sortedRootCauseSummaryData.length === 0) {
      toast({ title: "Sin Datos para Exportar", description: "No hay causas raíz en la tabla para exportar.", variant: "default" });
      return;
    }
    const dataToExport = sortedRootCauseSummaryData.map(item => ({
      'Fecha Evento': item.eventDate ? format(parseISO(item.eventDate), "dd/MM/yyyy") : 'N/A',
      'Sitio/Planta': item.site,
      'Equipo': item.equipo,
      'Causa Raíz Identificada': item.description
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    worksheet['!cols'] = [ { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 60 } ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Causas Raíz");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([excelBuffer]), `Resumen_Causas_Raiz_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const analysesEnCursoRaw = useMemo(() => {
    return filteredRcaDocs
      .filter(doc => !doc.isFinalized && !doc.rejectionDetails)
      .map(doc => {
        const totalSteps = 5;
        const hasStep3Content = doc.identifiedRootCauses?.length > 0 || doc.ishikawaData?.some(c => c.causes.length > 0) || doc.fiveWhysData?.length > 0 || doc.ctmData?.length > 0;
        const currentStep = doc.isFinalized ? 5 : doc.validations?.some(v => v.status === 'validated') ? 4 : hasStep3Content ? 3 : (doc.projectLeader || doc.detailedFacts.como) ? 2 : 1;
        const progress = (currentStep / totalSteps) * 100;
        return {
          id: doc.eventData.id,
          proyecto: doc.eventData.focusEventDescription,
          paso: currentStep,
          progreso: progress,
        };
      });
  }, [filteredRcaDocs]);

  const requestSortAnalysis = (key: SortableAnalysisInProgressKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfigAnalysis.key === key && sortConfigAnalysis.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfigAnalysis({ key, direction });
  };
  
  const sortedAnalysesEnCurso = useMemo(() => {
      let sortableItems = [...analysesEnCursoRaw];
      if (sortConfigAnalysis.key) {
          sortableItems.sort((a, b) => {
              const valA = a[sortConfigAnalysis.key!];
              const valB = b[sortConfigAnalysis.key!];
              if (typeof valA === 'number' && typeof valB === 'number') {
                  return valA - valB;
              }
              if (typeof valA === 'string' && typeof valB === 'string') {
                  return valA.localeCompare(valB);
              }
              return 0;
          });
          if (sortConfigAnalysis.direction === 'descending') {
              sortableItems.reverse();
          }
      }
      return sortableItems;
  }, [analysesEnCursoRaw, sortConfigAnalysis]);

  const renderSortIconAnalysis = (columnKey: SortableAnalysisInProgressKey) => {
      if (sortConfigAnalysis.key !== columnKey) {
          return <ChevronsUpDown className="h-4 w-4 opacity-30 ml-1" />;
      }
      return sortConfigAnalysis.direction === 'ascending' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const activeActionPlansRaw = useMemo(() => {
    return filteredRcaDocs
      .filter(doc => !doc.isFinalized)
      .flatMap(doc => (doc.plannedActions || []).map(action => ({
        idAccion: action.id,
        idEvento: doc.eventData.id,
        descripcion: action.description,
        responsable: action.responsible,
        fechaLimite: action.dueDate,
        tituloRCA: doc.eventData.focusEventDescription,
        estado: 'Activa'
      })))
      .filter(action => {
        const rcaDoc = filteredRcaDocs.find(d => d.eventData.id === action.idEvento);
        if (!rcaDoc) return false;
        const validation = rcaDoc.validations.find(v => v.actionId === action.idAccion);
        return !validation || validation.status !== 'validated';
      })
      .slice(0, 5);
  }, [filteredRcaDocs]);
  
  const requestSortActionPlan = (key: SortableActionPlanKey) => {
      let direction: 'ascending' | 'descending' = 'ascending';
      if (sortConfigActionPlan.key === key && sortConfigActionPlan.direction === 'ascending') {
          direction = 'descending';
      }
      setSortConfigActionPlan({ key, direction });
  };

  const sortedActiveActionPlans = useMemo(() => {
    let sortableItems = [...activeActionPlansRaw];
    if (sortConfigActionPlan.key) {
        sortableItems.sort((a, b) => {
            const key = sortConfigActionPlan.key!;
            const valA = a[key] || '';
            const valB = b[key] || '';
            if (key === 'fechaLimite') {
                const dateA = valA ? parseISO(valA as string).getTime() : 0;
                const dateB = valB ? parseISO(valB as string).getTime() : 0;
                return dateA - dateB;
            }
            if (typeof valA === 'string' && typeof valB === 'string') {
                return valA.localeCompare(valB, undefined, { numeric: true });
            }
            return 0;
        });
        if (sortConfigActionPlan.direction === 'descending') {
            sortableItems.reverse();
        }
    }
    return sortableItems;
  }, [activeActionPlansRaw, sortConfigActionPlan]);

  const renderSortIconActionPlan = (columnKey: SortableActionPlanKey) => {
      if (sortConfigActionPlan.key !== columnKey) {
          return <ChevronsUpDown className="h-4 w-4 opacity-30 ml-1" />;
      }
      return sortConfigActionPlan.direction === 'ascending' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const handleFilterChange = (field: keyof Filters, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value === ALL_FILTER_VALUE ? '' : value }));
  };

  const isLoading = isLoadingData || loadingAuth;

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando datos para informes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-8">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
          <BarChartIcon className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary">
          Dashboard de Informes
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Visualice un resumen del estado general de los análisis de causa raíz en el sistema.
        </p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ListFilter className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Filtros de Búsqueda</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
          <div>
            <Label htmlFor="filter-site" className="flex items-center mb-1"><Globe className="mr-1.5 h-4 w-4 text-muted-foreground"/>Sitio/Planta</Label>
            <Select value={filters.site || ALL_FILTER_VALUE} onValueChange={(val) => handleFilterChange('site', val)}>
              <SelectTrigger id="filter-site"><SelectValue placeholder="Todos los sitios" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>Todos los sitios</SelectItem>
                {availableSites.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                {availableSites.length === 0 && <SelectItem value={NO_SITES_PLACEHOLDER_VALUE} disabled>No hay sitios</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="filter-type" className="flex items-center mb-1"><AlertTriangle className="mr-1.5 h-4 w-4 text-muted-foreground"/>Tipo de Evento</Label>
            <Select value={filters.type || ALL_FILTER_VALUE} onValueChange={(val) => handleFilterChange('type', val as ReportedEventType | typeof ALL_FILTER_VALUE)}>
              <SelectTrigger id="filter-type"><SelectValue placeholder="Todos los tipos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>Todos los tipos</SelectItem>
                {eventTypeOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="filter-priority" className="flex items-center mb-1"><Flame className="mr-1.5 h-4 w-4 text-muted-foreground"/>Prioridad</Label>
            <Select value={filters.priority || ALL_FILTER_VALUE} onValueChange={(val) => handleFilterChange('priority', val as PriorityType | typeof ALL_FILTER_VALUE)}>
              <SelectTrigger id="filter-priority"><SelectValue placeholder="Todas las prioridades" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>Todas las prioridades</SelectItem>
                {priorityOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
           <div>
            <Label htmlFor="filter-date-range" className="flex items-center mb-1"><CalendarDays className="mr-1.5 h-4 w-4 text-muted-foreground"/>Rango de Fechas</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="filter-date-range" variant="outline" className="w-full justify-start text-left font-normal">
                  {filters.dateRange?.from ? (
                    filters.dateRange.to ? (
                      `${format(filters.dateRange.from, "LLL dd, y", {locale: es})} - ${format(filters.dateRange.to, "LLL dd, y", {locale: es})}`
                    ) : (
                      format(filters.dateRange.from, "LLL dd, y", {locale: es})
                    )
                  ) : (
                    <span>Seleccione un rango</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={filters.dateRange?.from}
                  selected={filters.dateRange}
                  onSelect={(range) => handleFilterChange('dateRange', range)}
                  numberOfMonths={2}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
        <CardFooter className="flex justify-start gap-3 pt-4 border-t">
          <Button onClick={applyFilters}><Search className="mr-2"/>Aplicar Filtros</Button>
          <Button onClick={clearFilters} variant="outline"><RefreshCcw className="mr-2"/>Limpiar Filtros</Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Análisis de Causa Raíz</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="p-3 bg-secondary/40 rounded-lg text-center"><p className="text-2xl font-bold">{summaryData.total}</p><p className="text-xs text-muted-foreground">Total ACR (Activos)</p></div>
          <div className="p-3 bg-yellow-400/10 rounded-lg text-center"><p className="text-2xl font-bold">{summaryData.pendientes}</p><p className="text-xs text-muted-foreground">ACR Pendientes</p></div>
          <div className="p-3 bg-green-400/10 rounded-lg text-center"><p className="text-2xl font-bold">{summaryData.finalizados}</p><p className="text-xs text-muted-foreground">ACR Finalizados</p></div>
          <div className="p-3 bg-blue-400/10 rounded-lg text-center"><p className="text-2xl font-bold">{summaryData.verificados}</p><p className="text-xs text-muted-foreground">ACR Verificados</p></div>
          <div className="p-3 bg-primary/10 rounded-lg text-center"><p className="text-2xl font-bold">{summaryData.cumplimiento.toFixed(1)}%</p><p className="text-xs text-muted-foreground">Cumplimiento ACR</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><History className="mr-2 h-5 w-5" />Resumen de Acciones Correctivas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-secondary/40 rounded-lg text-center"><p className="text-2xl font-bold">{summaryData.totalAcciones}</p><p className="text-xs text-muted-foreground">Total de Acciones</p></div>
          <div className="p-3 bg-yellow-400/10 rounded-lg text-center"><p className="text-2xl font-bold text-yellow-600">{summaryData.accionesPendientes}</p><p className="text-xs text-muted-foreground">Acciones Pendientes</p></div>
          <div className="p-3 bg-green-400/10 rounded-lg text-center"><p className="text-2xl font-bold text-green-600">{summaryData.accionesValidadas}</p><p className="text-xs text-muted-foreground">Acciones Validadas</p></div>
          <div className="p-3 bg-blue-400/10 rounded-lg text-center"><p className="text-2xl font-bold text-blue-600">{summaryData.cumplimientoAcciones.toFixed(1)}%</p><p className="text-xs text-muted-foreground">Cumplimiento</p></div>
        </CardContent>
      </Card>
      
      <div className="grid md:grid-cols-2 gap-8">
        <RcaStatusChart data={rcaStatusChartData} />
        <ActionStatusChart data={actionStatusChartData} />
      </div>

      <EventosPorSitioYEquipoChart data={filteredRcaDocs} />

      <Card>
        <CardHeader>
          <CardTitle>Resumen de Causas Raíz Identificadas</CardTitle>
          <CardDescription>Una lista de todas las causas raíz identificadas en los análisis que coinciden con los filtros actuales.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => requestSortRootCauses('eventDate')}>
                          <div className="flex items-center">Fecha Evento {renderSortIconRootCauses('eventDate')}</div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => requestSortRootCauses('site')}>
                           <div className="flex items-center">Sitio/Planta {renderSortIconRootCauses('site')}</div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => requestSortRootCauses('equipo')}>
                           <div className="flex items-center">Equipo {renderSortIconRootCauses('equipo')}</div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => requestSortRootCauses('description')}>
                           <div className="flex items-center">Causa Raíz Identificada {renderSortIconRootCauses('description')}</div>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedRootCauseSummaryData.length > 0 ? (
                        sortedRootCauseSummaryData.map((rc, index) => (
                            <TableRow key={`${rc.id}-${index}`}>
                                <TableCell>{rc.eventDate ? format(parseISO(rc.eventDate), "dd/MM/yyyy") : 'N/A'}</TableCell>
                                <TableCell>{rc.site}</TableCell>
                                <TableCell>{rc.equipo}</TableCell>
                                <TableCell>{rc.description}</TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground h-24">No se encontraron causas raíz con los filtros actuales.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
        <CardFooter className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleExportRootCauses} disabled={sortedRootCauseSummaryData.length === 0}>
                <FileDown className="mr-2 h-4 w-4"/>
                Exportar a Excel
            </Button>
        </CardFooter>
      </Card>

      <Card>
          <CardHeader>
              <CardTitle>Análisis en Curso</CardTitle>
              <CardDescription>Lista de análisis ACR que están actualmente en progreso, obtenidos de Firestore.</CardDescription>
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => requestSortAnalysis('proyecto')}>
                              <div className="flex items-center">Proyecto/Evento {renderSortIconAnalysis('proyecto')}</div>
                          </TableHead>
                          <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => requestSortAnalysis('paso')}>
                              <div className="flex items-center">Paso Actual {renderSortIconAnalysis('paso')}</div>
                          </TableHead>
                          <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => requestSortAnalysis('progreso')}>
                              <div className="flex items-center">Progreso Estimado {renderSortIconAnalysis('progreso')}</div>
                          </TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {sortedAnalysesEnCurso.length > 0 ? (
                          sortedAnalysesEnCurso.map(doc => (
                            <TableRow key={doc.id}>
                                <TableCell className="font-medium">{doc.proyecto}</TableCell>
                                <TableCell>Paso {doc.paso} de 5</TableCell>
                                <TableCell><Progress value={doc.progreso} className="w-[60%]" /></TableCell>
                            </TableRow>
                          ))
                      ) : (
                          <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground h-24">No hay análisis en curso que coincidan con los filtros actuales.</TableCell>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><ListChecks className="mr-2 h-5 w-5"/>Planes de Acción Activos</CardTitle>
          <CardDescription>Acciones de análisis no finalizados que aún no han sido validadas (máx. 5).</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => requestSortActionPlan('idEvento')}>
                    <div className="flex items-center">ID Evento {renderSortIconActionPlan('idEvento')}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => requestSortActionPlan('idAccion')}>
                    <div className="flex items-center">ID Acción {renderSortIconActionPlan('idAccion')}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => requestSortActionPlan('descripcion')}>
                    <div className="flex items-center">Acción (Análisis: Título ACR) {renderSortIconActionPlan('descripcion')}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => requestSortActionPlan('responsable')}>
                    <div className="flex items-center">Responsable {renderSortIconActionPlan('responsable')}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => requestSortActionPlan('fechaLimite')}>
                    <div className="flex items-center">Fecha Límite {renderSortIconActionPlan('fechaLimite')}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => requestSortActionPlan('estado')}>
                    <div className="flex items-center">Estado Acción {renderSortIconActionPlan('estado')}</div>
                </TableHead>
                <TableHead className="text-right">Recordatorio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedActiveActionPlans.length > 0 ? (
                sortedActiveActionPlans.map(action => (
                  <TableRow key={action.idAccion}>
                    <TableCell className="font-mono text-xs">{action.idEvento.substring(0, 8)}...</TableCell>
                    <TableCell className="font-mono text-xs">{action.idAccion.substring(0, 8)}...</TableCell>
                    <TableCell>
                      <p className="font-medium">{action.descripcion}</p>
                      <p className="text-xs text-muted-foreground">Del Análisis: {action.tituloRCA}</p>
                    </TableCell>
                    <TableCell>{action.responsable}</TableCell>
                    <TableCell>{action.fechaLimite ? format(parseISO(action.fechaLimite), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                        {action.estado}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" title="Enviar recordatorio">
                        <Bell className="h-4 w-4"/>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                    No hay planes de acción activos que mostrar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex justify-end">
            <Button variant="outline" size="sm">
                <FileDown className="mr-2 h-4 w-4"/>
                Exportar Excel (Todos los Activos)
            </Button>
        </CardFooter>
      </Card>

    </div>
  );
}
