
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, isValid as isValidDate } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ReportedEvent, ReportedEventType, ReportedEventStatus, PriorityType, Site, RCAAnalysisDocument } from '@/types/rca';
import { ListOrdered, PieChart, ListFilter, Globe, CalendarDays, AlertTriangle, Flame, ActivityIcon, Search, RefreshCcw, PlayCircle, Info, Loader2, Eye, Fingerprint, FileDown, ArrowUp, ArrowDown, ChevronsUpDown, XCircle, ShieldAlert, HardHat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, where, QueryConstraint } from "firebase/firestore";
import { Input } from '@/components/ui/input';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useAuth } from '@/contexts/AuthContext';

const eventTypeOptions: ReportedEventType[] = ['Incidente', 'Falla de Equipo', 'Accidente', 'No Conformidad', 'Evento Operacional'];
const priorityOptions: PriorityType[] = ['Alta', 'Media', 'Baja'];
const statusOptions: ReportedEventStatus[] = ['Pendiente', 'En análisis', 'En validación', 'Finalizado', 'Rechazado'];


const ALL_FILTER_VALUE = "__ALL__"; 
const NO_SITES_PLACEHOLDER_VALUE = "__NO_SITES_PLACEHOLDER__";

interface Filters {
  site: string;
  date: Date | undefined;
  type: ReportedEventType;
  priority: PriorityType;
  status: ReportedEventStatus;
  eventId: string;
}

type SortableReportedEventKey = 'id' | 'title' | 'site' | 'date' | 'type' | 'priority' | 'status' | 'equipo';

interface SortConfigReportedEvent {
  key: SortableReportedEventKey | null;
  direction: 'ascending' | 'descending';
}


export default function EventosReportadosPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { userProfile, loadingAuth } = useAuth();
  
  const [allEvents, setAllEvents] = useState<ReportedEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<ReportedEvent[]>([]);
  const [availableSites, setAvailableSites] = useState<Site[]>([]);
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingSites, setIsLoadingSites] = useState(true);
  
  const [selectedEvent, setSelectedEvent] = useState<ReportedEvent | null>(null);
  const [isDetailsCardVisible, setIsDetailsCardVisible] = useState(false);
  
  const [filters, setFilters] = useState<Filters>({
    site: '',
    date: undefined,
    type: '',
    priority: '',
    status: '',
    eventId: '',
  });

  const [sortConfigEvents, setSortConfigEvents] = useState<SortConfigReportedEvent>({ key: 'date', direction: 'descending' });


  const fetchAllData = useCallback(async () => {
    setIsLoadingData(true);
    
    if (loadingAuth || !userProfile) {
        setIsLoadingData(false);
        return;
    }

    try {
      const eventsCollectionRef = collection(db, "reportedEvents");
      const queryConstraints: QueryConstraint[] = [orderBy("date", "desc")];
      
      // Apply company-based filtering for non-Super Users
      if (userProfile.role !== 'Super User' && userProfile.empresa) {
        const companySites = availableSites
          .filter(site => site.empresa === userProfile.empresa)
          .map(site => site.name);

        if (companySites.length > 0) {
          queryConstraints.push(where('site', 'in', companySites));
        } else {
          // If the user's company has no sites configured, they will see no events.
          setAllEvents([]);
          setFilteredEvents([]);
          setIsLoadingData(false);
          return;
        }
      }
      
      const eventsQuery = query(eventsCollectionRef, ...queryConstraints);
      
      const eventsSnapshot = await getDocs(eventsQuery);
      const rawEventsData = eventsSnapshot.docs.map(doc => {
        const data = doc.data();
        let eventDate = data.date;
        if (data.date && typeof data.date.toDate === 'function') { 
          eventDate = format(data.date.toDate(), 'yyyy-MM-dd');
        }
        return { id: doc.id, ...data, date: eventDate } as ReportedEvent;
      });

      setAllEvents(rawEventsData);
      setFilteredEvents(rawEventsData); 
    } catch (error) {
      console.error("Error fetching data: ", error);
      toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar los eventos desde Firestore.", variant: "destructive" });
      setAllEvents([]);
      setFilteredEvents([]);
    } finally {
      setIsLoadingData(false);
    }
  }, [toast, loadingAuth, userProfile, availableSites]);

  useEffect(() => {
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
        setAvailableSites([]);
      } finally {
        setIsLoadingSites(false);
      }
    };

    fetchSitesData();
  }, [toast]);

  useEffect(() => {
    if (!loadingAuth && !isLoadingSites) {
      fetchAllData();
    }
  }, [loadingAuth, isLoadingSites, fetchAllData]);


  const summaryData = useMemo(() => ({
    total: allEvents.length,
    pendientes: allEvents.filter(e => e.status === 'Pendiente').length,
    enAnalisis: allEvents.filter(e => e.status === 'En análisis').length,
    enValidacion: allEvents.filter(e => e.status === 'En validación').length,
    finalizados: allEvents.filter(e => e.status === 'Finalizado').length,
    rechazados: allEvents.filter(e => e.status === 'Rechazado').length,
  }), [allEvents]);

  const handleFilterChange = (field: keyof Filters, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value === ALL_FILTER_VALUE ? '' : value }));
  };
  
  const handleDateChange = (date: Date | undefined) => {
    handleFilterChange('date', date);
  };

  const applyFilters = useCallback(() => {
    let events = [...allEvents]; 
    if (filters.site) {
      events = events.filter(e => e.site === filters.site);
    }
    if (filters.date) {
      const filterDateStr = format(filters.date, 'yyyy-MM-dd');
      events = events.filter(e => e.date === filterDateStr);
    }
    if (filters.type) {
      events = events.filter(e => e.type === filters.type);
    }
    if (filters.priority) {
      events = events.filter(e => e.priority === filters.priority);
    }
    if (filters.status) {
      events = events.filter(e => e.status === filters.status); 
    }
    if (filters.eventId.trim()) {
      events = events.filter(e => e.id.toLowerCase().includes(filters.eventId.trim().toLowerCase()));
    }
    setFilteredEvents(events);
    setSelectedEvent(null); 
    setIsDetailsCardVisible(false);
    toast({ title: "Filtros Aplicados", description: `${events.length} eventos encontrados.` });
  }, [filters, allEvents, toast]);

  const clearFilters = () => {
    setFilters({ site: '', date: undefined, type: '', priority: '', status: '', eventId: '' });
    setFilteredEvents(allEvents); 
    setSelectedEvent(null); 
    setIsDetailsCardVisible(false);
    toast({ title: "Filtros Limpiados" });
  };
  
  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const dateObj = parseISO(dateString); 
      if (isValidDate(dateObj)) {
        return format(dateObj, 'dd/MM/yyyy', { locale: es });
      }
    } catch (error) {
      // If parsing fails, try to return original or a fallback
    }
    return dateString; 
  };

  const handleSelectEvent = (event: ReportedEvent) => {
    if (selectedEvent?.id === event.id) {
      setSelectedEvent(null);
      setIsDetailsCardVisible(false);
    } else {
      setSelectedEvent(event);
      setIsDetailsCardVisible(true);
    }
  };

  const handleStartRCA = () => { 
    if (!selectedEvent) {
      toast({ title: "Acción no Válida", description: "No hay evento seleccionado.", variant: "destructive" });
      return;
    }
    router.push(`/analisis?id=${selectedEvent.id}`);
  };
  
  const handleViewAnalysis = () => {
    if (selectedEvent) {
        if (selectedEvent.status === 'Finalizado' || selectedEvent.status === 'En validación' || selectedEvent.status === 'Rechazado') {
            router.push(`/analisis?id=${selectedEvent.id}&step=5`); // Step 5 is results, good for rejected too for now.
        } else { 
            router.push(`/analisis?id=${selectedEvent.id}`);
        }
    } else {
         toast({ title: "Ningún Evento Seleccionado", description: "Por favor, seleccione un evento.", variant: "destructive" });
    }
  };

  const handleExportToExcel = () => {
    if (sortedFilteredEvents.length === 0) { // Use sortedFilteredEvents
      toast({
        title: "Sin Datos para Exportar",
        description: "No hay eventos en la tabla para exportar.",
        variant: "default",
      });
      return;
    }

    const dataToExport = sortedFilteredEvents.map(event => ({ // Use sortedFilteredEvents
      'ID Evento': event.id,
      'Título': event.title,
      'Sitio/Planta': event.site,
      'Equipo': event.equipo || 'N/A', // Add equipo
      'Fecha': formatDateForDisplay(event.date),
      'Tipo': event.type,
      'Prioridad': event.priority,
      'Estado': event.status,
      'Descripción Detallada': event.description || 'N/A',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Eventos Reportados");

    worksheet['!cols'] = [
      { wch: 20 }, { wch: 40 }, { wch: 25 }, { wch: 25 }, 
      { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 50 },
    ];
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    
    const fileName = `Eventos_Reportados_RCA_${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(dataBlob, fileName);

    toast({
      title: "Exportación Iniciada",
      description: `El archivo ${fileName} ha comenzado a descargarse.`,
    });
  };

  const requestSortEvents = (key: SortableReportedEventKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfigEvents.key === key && sortConfigEvents.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfigEvents({ key, direction });
  };

  const sortedFilteredEvents = useMemo(() => {
    let sortableItems = [...filteredEvents];
    if (sortConfigEvents.key) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfigEvents.key!];
        const valB = b[sortConfigEvents.key!];

        if (sortConfigEvents.key === 'date') {
          const dateA = valA ? parseISO(valA).getTime() : 0;
          const dateB = valB ? parseISO(valB).getTime() : 0;
          return dateA - dateB;
        }
        
        // For other string-based fields
        if (typeof valA === 'string' && typeof valB === 'string') {
          return valA.localeCompare(valB);
        }
        // Fallback for other types or mixed types, though not expected for these keys
        const strA = String(valA ?? '').toLowerCase();
        const strB = String(valB ?? '').toLowerCase();
        if (strA < strB) return -1;
        if (strA > strB) return 1;
        return 0;
      });

      if (sortConfigEvents.direction === 'descending') {
        sortableItems.reverse();
      }
    }
    return sortableItems;
  }, [filteredEvents, sortConfigEvents]);

  const renderSortIconEvents = (columnKey: SortableReportedEventKey) => {
    if (sortConfigEvents.key === columnKey) {
      return sortConfigEvents.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
    }
    return <ChevronsUpDown className="h-3 w-3 opacity-30" />;
  };

  const isLoading = isLoadingData || isLoadingSites || loadingAuth;

  const sitesForFilter = useMemo(() => {
    if (userProfile && userProfile.role !== 'Super User' && userProfile.empresa) {
      return availableSites.filter(site => site.empresa === userProfile.empresa);
    }
    return availableSites;
  }, [availableSites, userProfile]);


  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando datos de eventos y configuración...</p>
      </div>
    );
  }

  const renderStatusBadge = (status: ReportedEventStatus) => {
    if (status === 'Pendiente') {
      return <Badge variant="destructive">{status}</Badge>;
    } else if (status === 'En análisis') {
      return <Badge variant="outline" className={cn("border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:border-yellow-500/60 dark:bg-yellow-500/20 dark:text-yellow-400")}>{status}</Badge>;
    } else if (status === 'En validación') {
      return <Badge variant="outline" className={cn("border-blue-500/50 bg-blue-500/10 text-blue-700 dark:border-blue-500/60 dark:bg-blue-500/20 dark:text-blue-400")}>{status}</Badge>;
    } else if (status === 'Finalizado') {
      return <Badge variant="outline" className={cn("border-green-500/50 bg-green-500/10 text-green-700 dark:border-green-500/60 dark:bg-green-500/20 dark:text-green-400")}>{status}</Badge>;
    } else if (status === 'Rechazado') {
      return <Badge variant="outline" className={cn("border-slate-500/50 bg-slate-500/10 text-slate-700 dark:border-slate-500/60 dark:bg-slate-500/20 dark:text-slate-400")}>{status}</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <div className="space-y-8 py-8">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
          <ListOrdered className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary">
          Eventos Registrados
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Visualice y gestione todos los eventos reportados en el sistema desde Firestore.
        </p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <PieChart className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Resumen Rápido</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
          <div className="p-4 bg-secondary/40 rounded-lg">
            <p className="text-3xl font-bold text-foreground">{summaryData.total}</p>
            <p className="text-sm text-muted-foreground">Total</p>
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
          <div className="p-4 bg-slate-400/20 rounded-lg"> 
            <p className="text-3xl font-bold text-slate-600">{summaryData.rechazados}</p>
            <p className="text-sm text-muted-foreground">Rechazados</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ListFilter className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Filtros de Búsqueda</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
          <div>
            <Label htmlFor="filter-site" className="flex items-center mb-1"><Globe className="mr-1.5 h-4 w-4 text-muted-foreground"/>Sitio/Planta</Label>
            <Select
              value={filters.site || ALL_FILTER_VALUE}
              onValueChange={(val) => handleFilterChange('site', val)}
            >
              <SelectTrigger id="filter-site"><SelectValue placeholder="Todos los sitios" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>Todos los sitios</SelectItem>
                {sitesForFilter.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                 {sitesForFilter.length === 0 && <SelectItem value={NO_SITES_PLACEHOLDER_VALUE} disabled>No hay sitios para mostrar</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="filter-date" className="flex items-center mb-1"><CalendarDays className="mr-1.5 h-4 w-4 text-muted-foreground"/>Fecha del Evento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="filter-date" variant="outline" className="w-full justify-start text-left font-normal">
                  {filters.date ? format(filters.date, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar 
                  mode="single" 
                  selected={filters.date} 
                  onSelect={handleDateChange} 
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
            >
              <SelectTrigger id="filter-priority"><SelectValue placeholder="Todas las prioridades" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>Todas las prioridades</SelectItem>
                {priorityOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="filter-status" className="flex items-center mb-1"><ActivityIcon className="mr-1.5 h-4 w-4 text-muted-foreground"/>Estado</Label>
            <Select
              value={filters.status || ALL_FILTER_VALUE}
              onValueChange={(val) => handleFilterChange('status', val as ReportedEventStatus | typeof ALL_FILTER_VALUE)}
            >
              <SelectTrigger id="filter-status"><SelectValue placeholder="Todos los estados" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>Todos los estados</SelectItem>
                {statusOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="filter-event-id" className="flex items-center mb-1"><Fingerprint className="mr-1.5 h-4 w-4 text-muted-foreground"/>ID del Evento</Label>
            <Input
              id="filter-event-id"
              placeholder="Ej: E-12345-001"
              value={filters.eventId}
              onChange={(e) => handleFilterChange('eventId', e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-start gap-3 pt-4 border-t">
          <Button onClick={applyFilters}><Search className="mr-2"/>Aplicar Filtros</Button>
          <Button onClick={clearFilters} variant="outline"><RefreshCcw className="mr-2"/>Limpiar Filtros</Button>
        </CardFooter>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Lista de Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[5%]"></TableHead>
                  <TableHead className="w-[10%] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSortEvents('id')}>
                    <div className="flex items-center gap-1">ID {renderSortIconEvents('id')}</div>
                  </TableHead>
                  <TableHead className="w-[20%] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSortEvents('title')}>
                    <div className="flex items-center gap-1">Título {renderSortIconEvents('title')}</div>
                  </TableHead>
                  <TableHead className="w-[15%] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSortEvents('site')}>
                    <div className="flex items-center gap-1">Sitio {renderSortIconEvents('site')}</div>
                  </TableHead>
                  <TableHead className="w-[15%] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSortEvents('equipo')}>
                    <div className="flex items-center gap-1">Equipo {renderSortIconEvents('equipo')}</div>
                  </TableHead>
                  <TableHead className="w-[10%] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSortEvents('date')}>
                    <div className="flex items-center gap-1">Fecha {renderSortIconEvents('date')}</div>
                  </TableHead>
                  <TableHead className="w-[10%] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSortEvents('type')}>
                    <div className="flex items-center gap-1">Tipo {renderSortIconEvents('type')}</div>
                  </TableHead>
                  <TableHead className="w-[10%] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSortEvents('priority')}>
                    <div className="flex items-center gap-1">Prioridad {renderSortIconEvents('priority')}</div>
                  </TableHead>
                  <TableHead className="w-[10%] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSortEvents('status')}>
                    <div className="flex items-center gap-1">Estado {renderSortIconEvents('status')}</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingData ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center h-24">
                      <div className="flex justify-center items-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                        Cargando eventos...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : sortedFilteredEvents.length > 0 ? (
                  sortedFilteredEvents.map((event) => (
                    <TableRow
                      key={event.id}
                      onClick={() => handleSelectEvent(event)}
                      className={cn(
                        "cursor-pointer",
                        selectedEvent?.id === event.id
                          ? "bg-accent/40 hover:bg-accent/50"
                          : "hover:bg-muted/50"
                      )}
                    ><TableCell onClick={(e) => e.stopPropagation()} className="p-2"><Checkbox
                          id={`select-event-${event.id}`}
                          checked={selectedEvent?.id === event.id}
                          onCheckedChange={() => handleSelectEvent(event)}
                          aria-label={`Seleccionar evento ${event.title}`}
                        /></TableCell><TableCell className="font-mono text-xs">{event.id}</TableCell><TableCell className="font-medium">{event.title}</TableCell><TableCell>{event.site}</TableCell><TableCell>{event.equipo || 'N/A'}</TableCell><TableCell>{formatDateForDisplay(event.date)}</TableCell><TableCell>{event.type}</TableCell><TableCell>{event.priority}</TableCell><TableCell>{renderStatusBadge(event.status)}</TableCell></TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground h-24">
                      No hay eventos que coincidan con los filtros seleccionados o no hay eventos en la base de datos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex items-center gap-3 pt-4 border-t"> {/* Default justify-start for flex */}
          {(() => {
            if (!selectedEvent) {
              return <Button variant="default" size="sm" disabled><PlayCircle className="mr-2 h-4 w-4" /> Seleccione un evento</Button>;
            }

            let buttonText = "";
            let ButtonIcon = PlayCircle; 
            let buttonVariant: "default" | "outline" | "destructive" = "default";
            let buttonOnClick = () => {};
            let isDisabled = false;
            
            if (selectedEvent.status === 'Finalizado' || selectedEvent.status === 'En validación') {
              buttonText = "Revisar Investigación";
              ButtonIcon = Eye;
              buttonVariant = "outline";
              buttonOnClick = handleViewAnalysis;
            } else if (selectedEvent.status === 'Pendiente') {
              buttonText = "Iniciar Investigación"; 
              ButtonIcon = PlayCircle;
              buttonOnClick = handleStartRCA; 
            } else if (selectedEvent.status === 'En análisis') {
              buttonText = "Continuar Investigación";
              ButtonIcon = PlayCircle;
              buttonOnClick = handleViewAnalysis;
            } else if (selectedEvent.status === 'Rechazado') {
              buttonText = "Evento Rechazado";
              ButtonIcon = XCircle;
              buttonVariant = "destructive";
              isDisabled = true; // Or handleViewAnalysis to see details
              buttonOnClick = handleViewAnalysis; 
            } else { 
              buttonText = "Estado Desconocido";
              ButtonIcon = ShieldAlert;
              isDisabled = true;
            }
            
            return (
              <Button variant={buttonVariant} size="sm" onClick={buttonOnClick} disabled={isDisabled}>
                <ButtonIcon className="mr-2 h-4 w-4" />
                {buttonText}
              </Button>
            );
          })()}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportToExcel}
            disabled={isLoadingData || sortedFilteredEvents.length === 0}
            className="ml-auto" 
          >
            <FileDown className="mr-1.5 h-3.5 w-3.5" /> Exportar a Excel
          </Button>
        </CardFooter>
      </Card>

      {isDetailsCardVisible && selectedEvent && (
        <Card className="shadow-lg mt-6 animate-in fade-in-50 duration-300">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Info className="text-primary" />
              Detalles del Evento Seleccionado: {selectedEvent.title}
            </CardTitle>
            <CardDescription>ID: {selectedEvent.id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div><strong>Sitio:</strong> {selectedEvent.site}</div>
            {selectedEvent.equipo && <div className="flex items-center"><strong><HardHat className="inline mr-1.5 h-4 w-4"/>Equipo:</strong><span className="ml-1">{selectedEvent.equipo}</span></div>}
            <div><strong>Fecha:</strong> {formatDateForDisplay(selectedEvent.date)}</div>
            <div><strong>Tipo:</strong> {selectedEvent.type}</div>
            <div><strong>Prioridad:</strong> {selectedEvent.priority}</div>
            <div><strong>Estado:</strong> {renderStatusBadge(selectedEvent.status)}</div>
            <div>
              <strong>Descripción Inicial:</strong>
              <p className="mt-1 text-sm text-muted-foreground p-2 border rounded-md bg-secondary/30">
                {selectedEvent.description || "No hay descripción detallada disponible."}
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => { setSelectedEvent(null); setIsDetailsCardVisible(false); }}>Cerrar Detalles</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
