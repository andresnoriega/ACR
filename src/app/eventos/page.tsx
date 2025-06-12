
'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, isValid as isValidDate } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ReportedEvent, ReportedEventType, ReportedEventStatus, PriorityType } from '@/types/rca';
import { ListOrdered, PieChart, ListFilter, Globe, CalendarDays, AlertTriangle, Flame, ActivityIcon, Search, RefreshCcw, Eye, PlayCircle, CheckSquare } from 'lucide-react';

// Sample data - in a real app, this would come from a backend/state management
const sampleSites: Array<{ id: string; name: string }> = [
  { id: '1', name: 'Planta Norte' },
  { id: '2', name: 'Centro' },
  { id: '3', name: 'Planta Sur' },
  { id: '4', name: 'Oficina Central' },
];

const initialReportedEvents: ReportedEvent[] = [
  { id: 'E-001', title: 'Fuga en válvula X', site: 'Planta Norte', date: '2025-06-10', type: 'Incidente', priority: 'Alta', status: 'Pendiente' },
  { id: 'E-003', title: 'Caída de operario', site: 'Centro', date: '2025-06-08', type: 'Accidente', priority: 'Alta', status: 'Pendiente' },
  { id: 'E-005', title: 'Error eléctrico en línea 3', site: 'Planta Sur', date: '2025-06-05', type: 'Fallo', priority: 'Media', status: 'En análisis' },
  { id: 'E-007', title: 'Sobrecalentamiento motor', site: 'Planta Norte', date: '2025-06-02', type: 'Incidente', priority: 'Baja', status: 'Finalizado' },
  { id: 'E-008', title: 'Derrame químico menor', site: 'Planta Sur', date: '2025-05-28', type: 'Incidente', priority: 'Media', status: 'Pendiente' },
  { id: 'E-009', title: 'Falla en sensor de presión', site: 'Centro', date: '2025-05-25', type: 'Fallo', priority: 'Alta', status: 'En análisis' },
];

const eventTypeOptions: ReportedEventType[] = ['Incidente', 'Fallo', 'Accidente', 'No Conformidad'];
const priorityOptions: PriorityType[] = ['Alta', 'Media', 'Baja'];
const statusOptions: ReportedEventStatus[] = ['Pendiente', 'En análisis', 'Finalizado'];

const ALL_FILTER_VALUE = "__ALL__"; // Constant for "All" option value

interface Filters {
  site: string;
  date: Date | undefined;
  type: ReportedEventType;
  priority: PriorityType;
  status: ReportedEventStatus;
}

export default function EventosReportadosPage() {
  const { toast } = useToast();
  const [allEvents, setAllEvents] = useState<ReportedEvent[]>(initialReportedEvents);
  const [filteredEvents, setFilteredEvents] = useState<ReportedEvent[]>(initialReportedEvents);
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
    // If the selected value is ALL_FILTER_VALUE, set the filter state to empty string
    // otherwise, use the actual value.
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
    toast({ title: "Filtros Aplicados", description: `${events.length} eventos encontrados.` });
  }, [filters, allEvents, toast]);

  const clearFilters = () => {
    setFilters({ site: '', date: undefined, type: '', priority: '', status: '' });
    setFilteredEvents(allEvents);
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
              value={filters.site || ALL_FILTER_VALUE} // Use ALL_FILTER_VALUE if filter is empty
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
                <TableHead className="w-[10%]">ID</TableHead>
                <TableHead className="w-[25%]">Título</TableHead>
                <TableHead className="w-[15%]">Sitio</TableHead>
                <TableHead className="w-[15%]">Fecha</TableHead>
                <TableHead className="w-[10%]">Tipo</TableHead>
                <TableHead className="w-[10%]">Prioridad</TableHead>
                <TableHead className="w-[15%]">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.length > 0 ? (
                filteredEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-mono text-xs">{event.id}</TableCell>
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell>{event.site}</TableCell>
                    <TableCell>{formatDateForDisplay(event.date)}</TableCell>
                    <TableCell>{event.type}</TableCell>
                    <TableCell>{event.priority}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(event.status)}>{event.status}</Badge></TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                    No hay eventos que coincidan con los filtros seleccionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex justify-start gap-2 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={() => toast({title: "Simulación", description: "Mostrar detalles del evento seleccionado."})}>
                <Eye className="mr-2"/> Ver Detalles
            </Button>
             <Button variant="default" size="sm" onClick={() => toast({title: "Simulación", description: "Iniciar análisis RCA para el evento seleccionado."})}>
                <PlayCircle className="mr-2"/> Iniciar Análisis RCA
            </Button>
             <Button variant="secondary" size="sm" onClick={() => toast({title: "Simulación", description: "Marcar evento como revisado."})}>
                <CheckSquare className="mr-2"/> Marcar como Revisado
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

    