
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
import type { ReportedEvent, ReportedEventType, ReportedEventStatus, PriorityType, Site } from '@/types/rca';
import { ListOrdered, PieChart, ListFilter, Globe, CalendarDays, AlertTriangle, Flame, ActivityIcon, Search, RefreshCcw, PlayCircle, Info, Loader2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, where, Timestamp, doc, updateDoc } from "firebase/firestore";

const eventTypeOptions: ReportedEventType[] = ['Incidente', 'Fallo', 'Accidente', 'No Conformidad'];
const priorityOptions: PriorityType[] = ['Alta', 'Media', 'Baja'];
const statusOptions: ReportedEventStatus[] = ['Pendiente', 'En análisis', 'Finalizado'];

const ALL_FILTER_VALUE = "__ALL__"; 

interface Filters {
  site: string;
  date: Date | undefined;
  type: ReportedEventType;
  priority: PriorityType;
  status: ReportedEventStatus;
}

export default function EventosReportadosPage() {
  const { toast } = useToast();
  const router = useRouter();
  
  const [allEvents, setAllEvents] = useState<ReportedEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<ReportedEvent[]>([]);
  const [availableSites, setAvailableSites] = useState<Site[]>([]);
  
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingSites, setIsLoadingSites] = useState(true);

  const [selectedEvent, setSelectedEvent] = useState<ReportedEvent | null>(null);
  const [isDetailsCardVisible, setIsDetailsCardVisible] = useState(false);
  
  const [filters, setFilters] = useState<Filters>({
    site: '',
    date: undefined,
    type: '',
    priority: '',
    status: '',
  });

  const fetchEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    try {
      const eventsCollectionRef = collection(db, "reportedEvents");
      const q = query(eventsCollectionRef, orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);
      const eventsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        let eventDate = data.date;
        if (data.date && typeof data.date.toDate === 'function') { 
          eventDate = format(data.date.toDate(), 'yyyy-MM-dd');
        }
        return { id: doc.id, ...data, date: eventDate } as ReportedEvent;
      });
      setAllEvents(eventsData);
      setFilteredEvents(eventsData); 
    } catch (error) {
      console.error("Error fetching reported events: ", error);
      toast({ title: "Error al Cargar Eventos", description: "No se pudieron cargar los eventos desde Firestore.", variant: "destructive" });
      setAllEvents([]);
      setFilteredEvents([]);
    } finally {
      setIsLoadingEvents(false);
    }
  }, [toast]);

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

    fetchEvents();
    fetchSitesData();
  }, [fetchEvents, toast]);


  const summaryData = useMemo(() => ({
    total: allEvents.length,
    pendientes: allEvents.filter(e => e.status === 'Pendiente').length,
    enAnalisis: allEvents.filter(e => e.status === 'En análisis').length,
    finalizados: allEvents.filter(e => e.status === 'Finalizado').length,
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
    setFilteredEvents(events);
    setSelectedEvent(null); 
    setIsDetailsCardVisible(false);
    toast({ title: "Filtros Aplicados", description: `${events.length} eventos encontrados.` });
  }, [filters, allEvents, toast]);

  const clearFilters = () => {
    setFilters({ site: '', date: undefined, type: '', priority: '', status: '' });
    setFilteredEvents(allEvents);
    setSelectedEvent(null); 
    setIsDetailsCardVisible(false);
    toast({ title: "Filtros Limpiados" });
  };

  const getStatusBadgeVariant = (status: ReportedEventStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Pendiente': return 'destructive';
      case 'En análisis': return 'secondary'; 
      case 'Finalizado': return 'default'; 
      default: return 'outline';
    }
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

  const handleStartRCA = async () => {
    if (selectedEvent && selectedEvent.status === 'Pendiente') {
      try {
        const eventRef = doc(db, "reportedEvents", selectedEvent.id);
        await updateDoc(eventRef, { status: "En análisis" });
        
        const updatedSelectedEvent = { ...selectedEvent, status: "En análisis" as ReportedEventStatus };
        
        setAllEvents(prevEvents => prevEvents.map(ev => 
          ev.id === selectedEvent.id ? updatedSelectedEvent : ev
        ));
        setFilteredEvents(prevFiltered => prevFiltered.map(ev => 
          ev.id === selectedEvent.id ? updatedSelectedEvent : ev
        ));
        setSelectedEvent(updatedSelectedEvent);

        toast({ title: "Investigación Iniciada", description: `El evento ${selectedEvent.title} ahora está "En análisis".`});
        router.push(`/analisis?id=${selectedEvent.id}`); 
      } catch (error) {
        console.error("Error updating event status to 'En análisis':", error);
        toast({ title: "Error", description: "No se pudo actualizar el estado del evento.", variant: "destructive" });
      }
    } else if (selectedEvent) {
        toast({ title: "Acción no permitida", description: `El evento "${selectedEvent.title}" no está pendiente. Su estado es: ${selectedEvent.status}.`, variant: "destructive"});
    } else {
      toast({ title: "Ningún Evento Seleccionado", description: "Por favor, seleccione un evento pendiente para iniciar el análisis.", variant: "destructive" });
    }
  };
  
  const handleViewAnalysis = () => {
    if (selectedEvent) {
        toast({ title: "Navegando al Análisis", description: `Abriendo análisis para el evento ${selectedEvent.title}.`});
        router.push(`/analisis?id=${selectedEvent.id}`);
    } else {
         toast({ title: "Ningún Evento Seleccionado", description: "Por favor, seleccione un evento.", variant: "destructive" });
    }
  };

  const isLoading = isLoadingEvents || isLoadingSites;

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando datos de eventos y configuración...</p>
      </div>
    );
  }

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
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-secondary/40 rounded-lg">
            <p className="text-3xl font-bold text-foreground">{summaryData.total}</p>
            <p className="text-sm text-muted-foreground">Total de Eventos</p>
          </div>
          <div className="p-4 bg-destructive/10 rounded-lg">
            <p className="text-3xl font-bold text-destructive">{summaryData.pendientes}</p>
            <p className="text-sm text-muted-foreground">Pendientes</p>
          </div>
          <div className="p-4 bg-yellow-400/20 rounded-lg"> 
            <p className="text-3xl font-bold text-yellow-600">{summaryData.enAnalisis}</p>
            <p className="text-sm text-muted-foreground">En Análisis</p>
          </div>
          <div className="p-4 bg-green-400/20 rounded-lg"> 
            <p className="text-3xl font-bold text-green-600">{summaryData.finalizados}</p>
            <p className="text-sm text-muted-foreground">Finalizados</p>
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
                {availableSites.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                 {availableSites.length === 0 && <SelectItem value="" disabled>No hay sitios configurados</SelectItem>}
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
                <Calendar mode="single" selected={filters.date} onSelect={handleDateChange} initialFocus locale={es} />
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
                  <TableHead className="w-[10%]">ID</TableHead>
                  <TableHead className="w-[25%]">Título</TableHead>
                  <TableHead className="w-[15%]">Sitio</TableHead>
                  <TableHead className="w-[10%]">Fecha</TableHead>
                  <TableHead className="w-[10%]">Tipo</TableHead>
                  <TableHead className="w-[10%]">Prioridad</TableHead>
                  <TableHead className="w-[15%]">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingEvents ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-24">
                      <div className="flex justify-center items-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                        Cargando eventos...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredEvents.length > 0 ? (
                  filteredEvents.map((event) => (
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
                        /></TableCell><TableCell className="font-mono text-xs">{event.id}</TableCell><TableCell className="font-medium">{event.title}</TableCell><TableCell>{event.site}</TableCell><TableCell>{formatDateForDisplay(event.date)}</TableCell><TableCell>{event.type}</TableCell><TableCell>{event.priority}</TableCell><TableCell><Badge variant={getStatusBadgeVariant(event.status)}>{event.status}</Badge></TableCell></TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
                      No hay eventos que coincidan con los filtros seleccionados o no hay eventos en la base de datos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex justify-start gap-2 pt-4 border-t">
          {selectedEvent ? (() => {
            let buttonText = "";
            let buttonIcon = PlayCircle;
            let buttonVariant: "default" | "outline" = "default";
            let buttonOnClick = () => {};

            if (selectedEvent.status === 'Pendiente') {
              buttonText = "Continuar Investigación";
              buttonIcon = PlayCircle;
              buttonOnClick = handleStartRCA;
            } else if (selectedEvent.status === 'En análisis') {
              buttonText = "Continuar Investigación";
              buttonIcon = PlayCircle;
              buttonOnClick = handleViewAnalysis;
            } else if (selectedEvent.status === 'Finalizado') {
              buttonText = "Revisar Investigación";
              buttonIcon = Eye;
              buttonVariant = "outline";
              buttonOnClick = handleViewAnalysis;
            }
            const IconComponent = buttonIcon;
            return (
              <Button variant={buttonVariant} size="sm" onClick={buttonOnClick}>
                <IconComponent className="mr-2" /> {buttonText}
              </Button>
            );
          })() : (
            <Button variant="default" size="sm" disabled>
              <PlayCircle className="mr-2" /> Seleccione un evento
            </Button>
          )}
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
            <div><strong>Fecha:</strong> {formatDateForDisplay(selectedEvent.date)}</div>
            <div><strong>Tipo:</strong> {selectedEvent.type}</div>
            <div><strong>Prioridad:</strong> {selectedEvent.priority}</div>
            <div><strong>Estado:</strong> <Badge variant={getStatusBadgeVariant(selectedEvent.status)}>{selectedEvent.status}</Badge></div>
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

