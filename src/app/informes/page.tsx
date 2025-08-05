
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/hooks/use-toast";
import type { ReportedEvent, ReportedEventType, PriorityType, Site } from '@/types/rca';
import { ListOrdered, PieChart, BarChart, ListFilter, Globe, CalendarDays, AlertTriangle, Flame, ActivityIcon, Search, RefreshCcw, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, where, type QueryConstraint } from "firebase/firestore";
import { useAuth } from '@/contexts/AuthContext';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, isValid as isValidDate } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';


const eventTypeOptions: ReportedEventType[] = ['Incidente', 'Falla de Equipo', 'Accidente', 'No Conformidad', 'Evento Operacional'];
const priorityOptions: PriorityType[] = ['Alta', 'Media', 'Baja'];

const ALL_FILTER_VALUE = "__ALL__";
const NO_SITES_PLACEHOLDER_VALUE = "__NO_SITES_PLACEHOLDER__";

interface Filters {
  site: string;
  dateRange: DateRange | undefined;
  type: ReportedEventType | '';
  priority: PriorityType | '';
}

export default function InformesPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { userProfile, loadingAuth } = useAuth();

  const [allEvents, setAllEvents] = useState<ReportedEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<ReportedEvent[]>([]);
  const [availableSites, setAvailableSites] = useState<Site[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [filters, setFilters] = useState<Filters>({
    site: '',
    dateRange: undefined,
    type: '',
    priority: '',
  });

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

      const eventsCollectionRef = collection(db, "reportedEvents");
      const eventsQueryConstraints: QueryConstraint[] = [];
      if (userProfile.role !== 'Super User' && userProfile.empresa) {
        eventsQueryConstraints.push(where('empresa', '==', userProfile.empresa));
      }
      const eventsQuery = query(eventsCollectionRef, ...eventsQueryConstraints);
      
      const eventsSnapshot = await getDocs(eventsQuery);
      const rawEventsData = eventsSnapshot.docs.map(doc => {
        const data = doc.data();
        let eventDate = data.date;
        if (data.date && typeof data.date.toDate === 'function') {
          eventDate = data.date.toDate().toISOString().split('T')[0];
        }
        return { id: doc.id, ...data, date: eventDate } as ReportedEvent;
      });

      rawEventsData.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });
      
      setAllEvents(rawEventsData);
      setFilteredEvents(rawEventsData);
    } catch (error) {
      console.error("Error fetching data for reports: ", error);
      toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar los datos para los informes.", variant: "destructive" });
      setAllEvents([]);
      setFilteredEvents([]);
    } finally {
      setIsLoadingData(false);
    }
  }, [toast, loadingAuth, userProfile]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleFilterChange = (field: keyof Filters, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value === ALL_FILTER_VALUE ? '' : value }));
  };

  const applyFilters = useCallback(() => {
    let events = [...allEvents];
    if (filters.site) {
      events = events.filter(e => e.site === filters.site);
    }
    if (filters.dateRange?.from) {
      events = events.filter(e => {
        const eventDate = parseISO(e.date);
        if (!isValidDate(eventDate)) return false;
        const fromDate = filters.dateRange!.from!;
        const toDate = filters.dateRange!.to || fromDate;
        return eventDate >= fromDate && eventDate <= toDate;
      });
    }
    if (filters.type) {
      events = events.filter(e => e.type === filters.type);
    }
    if (filters.priority) {
      events = events.filter(e => e.priority === filters.priority);
    }
    setFilteredEvents(events);
    toast({ title: "Filtros Aplicados", description: `${events.length} eventos encontrados.` });
  }, [filters, allEvents, toast]);

  const clearFilters = () => {
    setFilters({ site: '', dateRange: undefined, type: '', priority: '' });
    setFilteredEvents(allEvents);
    toast({ title: "Filtros Limpiados" });
  };

  const summaryData = useMemo(() => {
    const dataSet = filters.site || filters.dateRange || filters.type || filters.priority ? filteredEvents : allEvents;
    return {
      total: dataSet.length,
      pendientes: dataSet.filter(e => e.status === 'Pendiente').length,
      enAnalisis: dataSet.filter(e => e.status === 'En análisis').length,
      enValidacion: dataSet.filter(e => e.status === 'En validación').length,
      finalizados: dataSet.filter(e => e.status === 'Finalizado').length,
      verificados: dataSet.filter(e => e.status === 'Verificado').length,
      rechazados: dataSet.filter(e => e.status === 'Rechazado').length,
    }
  }, [allEvents, filteredEvents, filters]);


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
          <BarChart className="h-10 w-10" />
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

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <PieChart className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Resumen de Datos Filtrados</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 text-center">
          <div className="p-4 bg-secondary/40 rounded-lg">
            <p className="text-3xl font-bold text-foreground">{summaryData.total}</p>
            <p className="text-sm text-muted-foreground">Total Eventos</p>
          </div>
          <div className="p-4 bg-destructive/10 rounded-lg">
            <p className="text-3xl font-bold text-destructive">{summaryData.pendientes}</p>
            <p className="text-sm text-muted-foreground">Pendientes</p>
          </div>
          <div className="p-4 bg-yellow-400/20 rounded-lg">
            <p className="text-3xl font-bold text-yellow-600">{summaryData.enAnalisis}</p>
            <p className="text-sm text-muted-foreground">En Análisis</p>
          </div>
          <div className="p-4 bg-blue-400/20 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{summaryData.enValidacion}</p>
            <p className="text-sm text-muted-foreground">En Validación</p>
          </div>
          <div className="p-4 bg-green-400/20 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{summaryData.finalizados}</p>
            <p className="text-sm text-muted-foreground">Finalizados</p>
          </div>
          <div className="p-4 bg-indigo-400/20 rounded-lg">
            <p className="text-3xl font-bold text-indigo-600">{summaryData.verificados}</p>
            <p className="text-sm text-muted-foreground">Verificados</p>
          </div>
          <div className="p-4 bg-slate-400/20 rounded-lg">
            <p className="text-3xl font-bold text-slate-600">{summaryData.rechazados}</p>
            <p className="text-sm text-muted-foreground">Rechazados</p>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Eventos por Estado</CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-center text-muted-foreground py-10">Visualización de gráfico en desarrollo.</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Eventos por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground py-10">Visualización de gráfico en desarrollo.</p>
          </CardContent>
        </Card>
      </div>
      
       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Navegación Rápida</CardTitle>
          <CardDescription>Acceda directamente a las secciones principales para gestionar los eventos.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button onClick={() => router.push('/eventos')}>Ver Lista de Eventos</Button>
          <Button onClick={() => router.push('/analisis')} variant="outline">Iniciar Nuevo Análisis</Button>
          <Button onClick={() => router.push('/usuario/planes')} variant="outline">Ver Mis Tareas</Button>
        </CardContent>
      </Card>

    </div>
  );
}

    