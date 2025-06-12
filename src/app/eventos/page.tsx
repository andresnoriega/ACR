
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import type { ReportedEvent, ReportedEventType, ReportedEventStatus, PriorityType } from '@/types/rca';
import { ListOrdered, PieChart, ListFilter, Globe, CalendarDays, AlertTriangle, Flame, ActivityIcon, Search, RefreshCcw, PlayCircle, CheckSquare, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

// Sample data - in a real app, this would come from a backend/state management
const sampleSites: Array<{ id: string; name: string }> = [
  { id: '1', name: 'Planta Norte' },
  { id: '2', name: 'Centro' },
  { id: '3', name: 'Planta Sur' },
  { id: '4', name: 'Oficina Central' },
];

const initialReportedEvents: ReportedEvent[] = [
  { id: 'E-001', title: 'Fuga en válvula X', site: 'Planta Norte', date: '2025-06-10', type: 'Incidente', priority: 'Alta', status: 'Pendiente', description: 'Se detectó una fuga considerable en la válvula de control principal del sector A. Requiere atención inmediata.' },
  { id: 'E-003', title: 'Caída de operario', site: 'Centro', date: '2025-06-08', type: 'Accidente', priority: 'Alta', status: 'Pendiente', description: 'Un operario sufrió una caída desde una altura de 2 metros mientras realizaba mantenimiento en la plataforma 3. Se aplicaron primeros auxilios.' },
  { id: 'E-005', title: 'Error eléctrico en línea 3', site: 'Planta Sur', date: '2025-06-05', type: 'Fallo', priority: 'Media', status: 'En análisis', description: 'La línea de producción 3 experimentó un fallo eléctrico intermitente, causando paradas no programadas.' },
  { id: 'E-007', title: 'Sobrecalentamiento motor', site: 'Planta Norte', date: '2025-06-02', type: 'Incidente', priority: 'Baja', status: 'Finalizado', description: 'El motor de la bomba B-102 mostró signos de sobrecalentamiento. Se realizó mantenimiento y ya está operativo.' },
  { id: 'E-008', title: 'Derrame químico menor', site: 'Planta Sur', date: '2025-05-28', type: 'Incidente', priority: 'Media', status: 'Pendiente', description: 'Pequeño derrame de sustancia X en el almacén de químicos. Área contenida.' },
  { id: 'E-009', title: 'Falla en sensor de presión', site: 'Centro', date: '2025-05-25', type: 'Fallo', priority: 'Alta', status: 'En análisis', description: 'El sensor de presión PT-501 de la caldera principal está arrojando lecturas erráticas.' },
];

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
  const [allEvents, setAllEvents] = useState<ReportedEvent[]>(initialReportedEvents);
  const [filteredEvents, setFilteredEvents] = useState<ReportedEvent[]>(initialReportedEvents);
  const [selectedEvent, setSelectedEvent] = useState<ReportedEvent | null>(null);
  const [isDetailsCardVisible, setIsDetailsCardVisible] = useState(false);
  
  const [filters, setFilters] = useState<Filters>({
    site: '',
    date: undefined,
    type: '',
    priority: '',
    status: '',
  });

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
        return format(dateObj, 'dd/MM/yyyy');
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
    if (selectedEvent && selectedEvent.status === 'Pendiente') {
      toast({ title: "Iniciando Análisis RCA", description: `Navegando a análisis para el evento ${selectedEvent.title}.`});
      router.push('/analisis'); 
    } else if (selectedEvent) {
        toast({ title: "Acción no permitida", description: `El evento "${selectedEvent.title}" no está pendiente. Su estado es: ${selectedEvent.status}.`, variant: "destructive"});
    } else {
      toast({ title: "Ningún Evento Seleccionado", description: "Por favor, seleccione un evento pendiente para iniciar el análisis.", variant: "destructive" });
    }
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
          Visualice y gestione todos los eventos reportados en el sistema.
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
                {sampleSites.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
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
              {filteredEvents.length > 0 ? (
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
                    No hay eventos que coincidan con los filtros seleccionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex justify-start gap-2 pt-4 border-t">
             <Button 
                variant="default" 
                size="sm" 
                onClick={handleStartRCA} 
                disabled={!selectedEvent || selectedEvent.status !== 'Pendiente'}
             >
                <PlayCircle className="mr-2"/> Iniciar Análisis RCA
            </Button>
             <Button variant="secondary" size="sm" onClick={() => toast({title: "Simulación", description: "Marcar evento como revisado."})} disabled={!selectedEvent}>
                <CheckSquare className="mr-2"/> Marcar como Revisado
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
