
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
import { ListOrdered, PieChart, ListFilter, Globe, CalendarDays, AlertTriangle, Flame, ActivityIcon, Search, RefreshCcw, PlayCircle, Info, Loader2, Eye, Fingerprint } from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { Input } from '@/components/ui/input';

const eventTypeOptions: ReportedEventType[] = ['Incidente', 'Fallo', 'Accidente', 'No Conformidad'];
const priorityOptions: PriorityType[] = ['Alta', 'Media', 'Baja'];
const statusOptions: ReportedEventStatus[] = ['Pendiente', 'En análisis', 'En validación', 'Finalizado'];

const ALL_FILTER_VALUE = "__ALL__"; 

interface Filters {
  site: string;
  date: Date | undefined;
  type: ReportedEventType;
  priority: PriorityType;
  status: ReportedEventStatus;
  eventId: string;
}

async function updateEventStatusInFirestore(eventId: string, newStatus: ReportedEventStatus, toastInstance: ReturnType<typeof useToast>['toast']) {
  const eventRef = doc(db, "reportedEvents", eventId);
  try {
    await updateDoc(eventRef, { status: newStatus, updatedAt: new Date().toISOString() });
    // Also update the corresponding rcaAnalysis document if setting to "Finalizado" from here
    if (newStatus === "Finalizado") {
        const rcaRef = doc(db, "rcaAnalyses", eventId);
        await updateDoc(rcaRef, { isFinalized: true, updatedAt: new Date().toISOString() });
    }
    return true;
  } catch (error) {
    console.error("Error updating event status in Firestore: ", error);
    toastInstance({ title: "Error al Actualizar Estado", description: "No se pudo actualizar el estado del evento en Firestore.", variant: "destructive" });
    return false;
  }
}


export default function EventosReportadosPage() {
  const { toast } = useToast();
  const router = useRouter();
  
  const [allEvents, setAllEvents] = useState<ReportedEvent[]>([]);
  const [allRcaAnalyses, setAllRcaAnalyses] = useState<RCAAnalysisDocument[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<ReportedEvent[]>([]);
  const [availableSites, setAvailableSites] = useState<Site[]>([]);
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingSites, setIsLoadingSites] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);


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

  const fetchAllData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      // Fetch Reported Events
      const eventsCollectionRef = collection(db, "reportedEvents");
      const eventsQuery = query(eventsCollectionRef, orderBy("date", "desc"));
      const eventsSnapshot = await getDocs(eventsQuery);
      const rawEventsData = eventsSnapshot.docs.map(doc => {
        const data = doc.data();
        let eventDate = data.date;
        if (data.date && typeof data.date.toDate === 'function') { 
          eventDate = format(data.date.toDate(), 'yyyy-MM-dd');
        }
        return { id: doc.id, ...data, date: eventDate } as ReportedEvent;
      });

      // Fetch RCA Analyses
      const rcaAnalysesCollectionRef = collection(db, "rcaAnalyses");
      const rcaQuery = query(rcaAnalysesCollectionRef); // No specific order needed here, will map by ID
      const rcaSnapshot = await getDocs(rcaQuery);
      const rcaAnalysesData = rcaSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RCAAnalysisDocument));
      setAllRcaAnalyses(rcaAnalysesData); // Store for later use

      // Derive event statuses
      const processedEvents = rawEventsData.map(event => {
        let derivedStatus = event.status;
        if (event.status !== 'Finalizado') {
          const rcaDoc = rcaAnalysesData.find(rca => rca.eventData.id === event.id);
          if (rcaDoc && rcaDoc.plannedActions && rcaDoc.plannedActions.length > 0) {
            const allActionsValidated = rcaDoc.plannedActions.every(pa => {
              const validation = rcaDoc.validations?.find(v => v.actionId === pa.id);
              return validation?.status === 'validated';
            });
            if (allActionsValidated) {
              derivedStatus = 'En validación';
            }
          }
        }
        return { ...event, status: derivedStatus };
      });

      setAllEvents(processedEvents);
      setFilteredEvents(processedEvents); 
    } catch (error) {
      console.error("Error fetching data: ", error);
      toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar los eventos o análisis desde Firestore.", variant: "destructive" });
      setAllEvents([]);
      setFilteredEvents([]);
      setAllRcaAnalyses([]);
    } finally {
      setIsLoadingData(false);
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

    fetchAllData();
    fetchSitesData();
  }, [fetchAllData, toast]);


  const summaryData = useMemo(() => ({
    total: allEvents.length,
    pendientes: allEvents.filter(e => e.status === 'Pendiente').length,
    enAnalisis: allEvents.filter(e => e.status === 'En análisis').length,
    enValidacion: allEvents.filter(e => e.status === 'En validación').length,
    finalizados: allEvents.filter(e => e.status === 'Finalizado').length,
  }), [allEvents]);

  const handleFilterChange = (field: keyof Filters, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value === ALL_FILTER_VALUE ? '' : value }));
  };
  
  const handleDateChange = (date: Date | undefined) => {
    handleFilterChange('date', date);
  };

  const applyFilters = useCallback(() => {
    let events = [...allEvents]; // Use allEvents which has derived statuses
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
      events = events.filter(e => e.status === filters.status); // Filter by derived status
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
    setFilteredEvents(allEvents); // Reset to allEvents with derived statuses
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

  const handleStartRCA = async () => {
    if (!selectedEvent || selectedEvent.status !== 'Pendiente') {
      toast({ title: "Acción no Válida", description: "Esta acción solo es para eventos pendientes.", variant: "destructive" });
      return;
    }
    setIsUpdatingStatus(true);
    const success = await updateEventStatusInFirestore(selectedEvent.id, "En análisis", toast);
    if (success) {
      // Re-fetch or update local state to reflect the new status from DB and potentially derived status
      await fetchAllData(); // Re-fetch all data to ensure statuses are current
      setSelectedEvent(prevSelected => prevSelected ? { ...prevSelected, status: "En análisis" } : null); 
      router.push(`/analisis?id=${selectedEvent.id}`);
    }
    setIsUpdatingStatus(false);
  };
  
  const handleViewAnalysis = () => {
    if (selectedEvent) {
        if (selectedEvent.status === 'Finalizado' || selectedEvent.status === 'En validación') {
            router.push(`/analisis?id=${selectedEvent.id}&step=5`);
        } else { // 'Pendiente' or 'En análisis'
            router.push(`/analisis?id=${selectedEvent.id}`);
        }
    } else {
         toast({ title: "Ningún Evento Seleccionado", description: "Por favor, seleccione un evento.", variant: "destructive" });
    }
  };

  const isLoading = isLoadingData || isLoadingSites;

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
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
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
                {isLoadingData ? (
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
                        /></TableCell><TableCell className="font-mono text-xs">{event.id}</TableCell><TableCell className="font-medium">{event.title}</TableCell><TableCell>{event.site}</TableCell><TableCell>{formatDateForDisplay(event.date)}</TableCell><TableCell>{event.type}</TableCell><TableCell>{event.priority}</TableCell><TableCell>{renderStatusBadge(event.status)}</TableCell></TableRow>
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
          {(() => {
            if (!selectedEvent) {
              return <Button variant="default" size="sm" disabled><PlayCircle className="mr-2 h-4 w-4" /> Seleccione un evento</Button>;
            }

            let buttonText = "";
            let ButtonIcon = PlayCircle; 
            let buttonVariant: "default" | "outline" = "default";
            let buttonOnClick = () => {};
            let isDisabled = false;
            let showLoader = false;

            if (selectedEvent.status === 'Finalizado' || selectedEvent.status === 'En validación') {
              buttonText = "Revisar Investigación";
              ButtonIcon = Eye;
              buttonVariant = "outline";
              buttonOnClick = handleViewAnalysis;
            } else if (selectedEvent.status === 'Pendiente') {
              buttonText = "Iniciar Investigación"; 
              ButtonIcon = PlayCircle;
              buttonOnClick = handleStartRCA;
              isDisabled = isUpdatingStatus;
              showLoader = isUpdatingStatus;
            } else if (selectedEvent.status === 'En análisis') {
              buttonText = "Continuar Investigación";
              ButtonIcon = PlayCircle;
              buttonOnClick = handleViewAnalysis;
            } else { 
              buttonText = "Estado Inválido";
              ButtonIcon = AlertTriangle;
              isDisabled = true;
            }
            
            return (
              <Button variant={buttonVariant} size="sm" onClick={buttonOnClick} disabled={isDisabled}>
                {showLoader ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ButtonIcon className="mr-2 h-4 w-4" />}
                {buttonText}
              </Button>
            );
          })()}
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
