
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ShieldCheck, DatabaseZap, AlertTriangle, Trash2, Loader2, ListOrdered, ListFilter, Globe, CalendarDays, Flame, ActivityIcon, Search, RefreshCcw, Fingerprint, FileDown, ArrowUp, ArrowDown, ChevronsUpDown, ChevronDown, ChevronUp, Edit2, Mail } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, getDocs, deleteDoc, doc, WriteBatch, writeBatch, query, orderBy as firestoreOrderBy } from "firebase/firestore";
import type { ReportedEvent, ReportedEventType, ReportedEventStatus, PriorityType, Site, RCAAnalysisDocument } from '@/types/rca';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, isValid as isValidDate } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useRouter } from 'next/navigation';
import { sendEmailAction } from '@/app/actions';


async function deleteAllDocsInCollection(collectionName: string): Promise<{ success: boolean, docsDeleted: number, error?: any }> {
  try {
    const collectionRef = collection(db, collectionName);
    const querySnapshot = await getDocs(collectionRef);
    let docsDeleted = 0;

    if (querySnapshot.empty) {
      return { success: true, docsDeleted: 0 };
    }

    const batches: WriteBatch[] = [];
    let currentBatch = writeBatch(db);
    let operationsInCurrentBatch = 0;

    querySnapshot.forEach((documentSnapshot) => {
      currentBatch.delete(doc(db, collectionName, documentSnapshot.id));
      operationsInCurrentBatch++;
      docsDeleted++;
      if (operationsInCurrentBatch === 499) {
        batches.push(currentBatch);
        currentBatch = writeBatch(db);
        operationsInCurrentBatch = 0;
      }
    });

    if (operationsInCurrentBatch > 0) {
      batches.push(currentBatch);
    }

    for (const batch of batches) {
      await batch.commit();
    }
    
    return { success: true, docsDeleted };
  } catch (error) {
    console.error(`Error deleting collection ${collectionName}:`, error);
    return { success: false, docsDeleted: 0, error };
  }
}

const eventTypeOptions: ReportedEventType[] = ['Incidente', 'Falla de Equipo', 'Accidente', 'No Conformidad', 'Evento Operacional'];
const priorityOptions: PriorityType[] = ['Alta', 'Media', 'Baja'];
const statusOptions: ReportedEventStatus[] = ['Pendiente', 'En análisis', 'En validación', 'Finalizado', 'Rechazado'];
const ALL_FILTER_VALUE = "__ALL__";
const NO_SITES_PLACEHOLDER_VALUE = "__NO_SITES_CONFIGURED__"; 

interface Filters {
  site: string;
  date: Date | undefined;
  type: ReportedEventType;
  priority: PriorityType;
  status: ReportedEventStatus;
  eventId: string;
}

type SortableReportedEventKey = 'id' | 'title' | 'site' | 'date' | 'type' | 'priority' | 'status';

interface SortConfigReportedEvent {
  key: SortableReportedEventKey | null;
  direction: 'ascending' | 'descending';
}

export default function ConfiguracionPrivacidadPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isResetting, setIsResetting] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);

  // States for event listing
  const [allEvents, setAllEvents] = useState<ReportedEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<ReportedEvent[]>([]);
  const [availableSites, setAvailableSites] = useState<Site[]>([]);
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingSites, setIsLoadingSites] = useState(true);
  
  const [filters, setFilters] = useState<Filters>({
    site: '',
    date: undefined,
    type: '',
    priority: '',
    status: '',
    eventId: '',
  });

  const [sortConfigEvents, setSortConfigEvents] = useState<SortConfigReportedEvent>({ key: 'date', direction: 'descending' });
  const [showEventManagementUI, setShowEventManagementUI] = useState(false);

  // State for delete confirmation dialog
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<ReportedEvent | null>(null);


  const fetchAllEventData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const eventsCollectionRef = collection(db, "reportedEvents");
      const eventsQuery = query(eventsCollectionRef, firestoreOrderBy("date", "desc")); 
      const eventsSnapshot = await getDocs(eventsQuery);
      const rawEventsData = eventsSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        let eventDate = data.date;
        if (data.date && typeof data.date.toDate === 'function') { 
          eventDate = format(data.date.toDate(), 'yyyy-MM-dd');
        }
        return { id: docSnap.id, ...data, date: eventDate } as ReportedEvent;
      });
      setAllEvents(rawEventsData);
      setFilteredEvents(rawEventsData);
    } catch (error) {
      console.error("Error fetching event data: ", error);
      toast({ title: "Error al Cargar Eventos", description: "No se pudieron cargar los eventos desde Firestore.", variant: "destructive" });
      setAllEvents([]);
      setFilteredEvents([]);
    } finally {
      setIsLoadingData(false);
    }
  }, [toast]);

  useEffect(() => {
    const fetchSitesData = async () => {
      setIsLoadingSites(true);
      try {
        const sitesCollectionRef = collection(db, "sites");
        const q = query(sitesCollectionRef, firestoreOrderBy("name", "asc"));
        const querySnapshot = await getDocs(q);
        const sitesData = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Site));
        setAvailableSites(sitesData);
      } catch (error) {
        console.error("Error fetching sites: ", error);
        toast({ title: "Error al Cargar Sitios", description: "No se pudieron cargar los sitios para el filtro.", variant: "destructive" });
        setAvailableSites([]);
      } finally {
        setIsLoadingSites(false);
      }
    };

    fetchAllEventData();
    fetchSitesData();
  }, [fetchAllEventData, toast]);

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
    toast({ title: "Filtros Aplicados", description: `${events.length} eventos encontrados.` });
  }, [filters, allEvents, toast]);

  const clearFilters = () => {
    setFilters({ site: '', date: undefined, type: '', priority: '', status: '', eventId: '' });
    setFilteredEvents(allEvents); 
    toast({ title: "Filtros Limpiados" });
  };
  
  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const dateObj = parseISO(dateString); 
      if (isValidDate(dateObj)) {
        return format(dateObj, 'dd/MM/yyyy', { locale: es });
      }
    } catch (error) {}
    return dateString; 
  };

  const handleExportToExcel = () => {
    if (sortedFilteredEvents.length === 0) {
      toast({ title: "Sin Datos para Exportar", description: "No hay eventos en la tabla para exportar.", variant: "default" });
      return;
    }
    const dataToExport = sortedFilteredEvents.map(event => ({
      'ID Evento': event.id, 'Título': event.title, 'Sitio/Planta': event.site,
      'Fecha': formatDateForDisplay(event.date), 'Tipo': event.type, 'Prioridad': event.priority,
      'Estado': event.status, 'Descripción Detallada': event.description || 'N/A',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    worksheet['!cols'] = [ { wch: 15 }, { wch: 40 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 50 } ];
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Eventos Reportados");
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([excelBuffer], {type:"application/octet-stream"}), `Eventos_Reportados_ACR_Privacidad_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: "Exportación Iniciada", description: "El archivo de eventos ha comenzado a descargarse." });
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
        if (typeof valA === 'string' && typeof valB === 'string') return valA.localeCompare(valB);
        const strA = String(valA ?? '').toLowerCase();
        const strB = String(valB ?? '').toLowerCase();
        if (strA < strB) return -1; if (strA > strB) return 1; return 0;
      });
      if (sortConfigEvents.direction === 'descending') sortableItems.reverse();
    }
    return sortableItems;
  }, [filteredEvents, sortConfigEvents]);

  const renderSortIconEvents = (columnKey: SortableReportedEventKey) => {
    if (sortConfigEvents.key === columnKey) {
      return sortConfigEvents.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
    }
    return <ChevronsUpDown className="h-3 w-3 opacity-30" />;
  };

  const renderStatusBadge = (status: ReportedEventStatus) => {
    if (status === 'Pendiente') return <Badge variant="destructive">{status}</Badge>;
    if (status === 'En análisis') return <Badge variant="outline" className={cn("border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:border-yellow-500/60 dark:bg-yellow-500/20 dark:text-yellow-400")}>{status}</Badge>;
    if (status === 'En validación') return <Badge variant="outline" className={cn("border-blue-500/50 bg-blue-500/10 text-blue-700 dark:border-blue-500/60 dark:bg-blue-500/20 dark:text-blue-400")}>{status}</Badge>;
    if (status === 'Finalizado') return <Badge variant="outline" className={cn("border-green-500/50 bg-green-500/10 text-green-700 dark:border-green-500/60 dark:bg-green-500/20 dark:text-green-400")}>{status}</Badge>;
    if (status === 'Rechazado') return <Badge variant="outline" className={cn("border-slate-500/50 bg-slate-500/10 text-slate-700 dark:border-slate-500/60 dark:bg-slate-500/20 dark:text-slate-400")}>{status}</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };
  
  const handleResetData = async (dataType: string) => {
    setIsResetting(true);
    if (dataType === "TODOS los Datos ACR") {
      let rcaAnalysesDeleted = 0; let reportedEventsDeleted = 0; let success = true;
      toast({ title: "Reseteo en Progreso...", description: "Eliminando análisis ACR y eventos reportados...", duration: 7000 });
      const analysesResult = await deleteAllDocsInCollection('rcaAnalyses');
      if (analysesResult.success) rcaAnalysesDeleted = analysesResult.docsDeleted;
      else { success = false; toast({ title: "Error al Resetear Análisis", description: `Error: ${analysesResult.error?.message || 'Desconocido'}`, variant: "destructive" }); }
      if (success) {
        const eventsResult = await deleteAllDocsInCollection('reportedEvents');
        if (eventsResult.success) reportedEventsDeleted = eventsResult.docsDeleted;
        else { success = false; toast({ title: "Error al Resetear Eventos Reportados", description: `Error: ${eventsResult.error?.message || 'Desconocido'}`, variant: "destructive" }); }
      }
      if (success) {
        toast({ title: "Reseteo Completado", description: `Se eliminaron ${rcaAnalysesDeleted} análisis y ${reportedEventsDeleted} eventos.`, variant: "destructive", duration: 5000 });
        fetchAllEventData(); 
      } else toast({ title: "Reseteo Parcial o Fallido", description: "Algunos datos podrían no haber sido eliminados.", variant: "destructive" });
    } else {
      await new Promise(resolve => setTimeout(resolve, 1500)); 
      toast({ title: `Reseteo Simulado: ${dataType}`, description: `Los datos de "${dataType}" han sido reseteados (simulación).`, variant: "destructive", duration: 5000 });
    }
    setIsResetting(false);
  };

  const openDeleteEventDialog = (event: ReportedEvent) => {
    setEventToDelete(event);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;
    setIsDeletingEvent(true);
    try {
      // Delete from reportedEvents
      await deleteDoc(doc(db, "reportedEvents", eventToDelete.id));
      // Delete from rcaAnalyses
      await deleteDoc(doc(db, "rcaAnalyses", eventToDelete.id));
      
      toast({ title: "Evento Eliminado", description: `El evento "${eventToDelete.title}" (ID: ${eventToDelete.id}) y su análisis asociado han sido eliminados.`, variant: "destructive" });
      setEventToDelete(null);
      fetchAllEventData(); // Refresh list
    } catch (error) {
      console.error("Error deleting event and its analysis: ", error);
      toast({ title: "Error al Eliminar", description: "No se pudo eliminar el evento o su análisis asociado.", variant: "destructive" });
    } finally {
      setIsDeletingEvent(false);
      setIsDeleteConfirmOpen(false);
    }
  };

  const handleSendTestEmail = async () => {
    setIsSendingTestEmail(true);
    
    const result = await sendEmailAction({
      to: "TEST_MY_SENDER_ADDRESS", // Special keyword for server to use SENDER_EMAIL_ADDRESS
      subject: "Correo de Prueba - Integración Asistente ACR con MailerSend",
      body: "Este es un correo de prueba enviado desde Asistente ACR para verificar la integración con MailerSend.",
      htmlBody: "<p>Este es un <strong>correo de prueba</strong> enviado desde <strong>Asistente ACR</strong> para verificar la integración con <strong>MailerSend</strong>.</p>",
    });

    if (result.success) {
      toast({
        title: "Correo de Prueba Enviado",
        description: "El correo de prueba ha sido enviado a tu dirección de remitente configurada (`SENDER_EMAIL_ADDRESS`). Por favor, revisa tu bandeja de entrada. Si lo recibes, ahora puedes proceder a verificar la integración en el panel de MailerSend.",
      });
    } else {
      toast({
        title: "Error al Enviar Correo de Prueba",
        description: result.message,
        variant: "destructive",
      });
    }
    setIsSendingTestEmail(false);
  };


  return (
    <div className="space-y-8 py-8">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
          <ShieldCheck className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary">
          Privacidad y Gestión de Datos
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Administre cómo se almacenan y gestionan los datos de su aplicación Asistente ACR.
        </p>
      </header>

      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <DatabaseZap className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Gestión de Datos de Análisis</CardTitle>
          </div>
          <CardDescription>Opciones para gestionar los datos generados por los análisis de causa raíz.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
            <AlertTriangle className="h-5 w-5 !text-destructive" />
            <AlertTitle className="text-destructive">¡Atención! Operaciones Destructivas</AlertTitle>
            <AlertDescription className="text-destructive/90">
              Las acciones de reseteo y eliminación son irreversibles y eliminarán permanentemente los datos seleccionados. Proceda con extrema precaución.
            </AlertDescription>
          </Alert>
          <div className="flex flex-col sm:flex-row justify-between items-center p-4 border rounded-md">
            <div>
              <h4 className="font-semibold">Resetear Todos los Datos de ACR</h4>
              <p className="text-sm text-muted-foreground">Elimina todos los eventos y análisis ACR (Pendientes, En Análisis y Finalizados).</p>
            </div>
             <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="mt-2 sm:mt-0" disabled={isResetting || isDeletingEvent || isSendingTestEmail}>
                  {(isResetting && !isDeletingEvent) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} 
                  Resetear Todo
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿CONFIRMAR RESETEO TOTAL?</AlertDialogTitle>
                  <AlertDialogDescription>¡ADVERTENCIA! Esta acción eliminará TODOS los eventos y análisis ACR del sistema. Esta acción es IRREVERSIBLE.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isResetting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleResetData("TODOS los Datos ACR")} disabled={isResetting} className="bg-destructive hover:bg-destructive/90">
                     {isResetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} SÍ, ESTOY SEGURO
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
        <CardFooter><p className="text-xs text-muted-foreground">Otras opciones de gestión de datos (exportación, retención) podrían añadirse aquí.</p></CardFooter>
      </Card>

      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Mail className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Configuración de Correo</CardTitle>
          </div>
          <CardDescription>Verifique la configuración de envío de correos electrónicos a través de MailerSend.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between items-center p-4 border rounded-md">
            <div>
              <h4 className="font-semibold">Verificar Integración</h4>
              <p className="text-sm text-muted-foreground">Envíe un correo de prueba a su dirección de remitente para confirmar que la API Key y el dominio están configurados correctamente en las variables de entorno.</p>
            </div>
            <Button onClick={handleSendTestEmail} className="mt-2 sm:mt-0" disabled={isSendingTestEmail || isResetting || isDeletingEvent}>
              {isSendingTestEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              Enviar Correo de Prueba
            </Button>
          </div>
        </CardContent>
        <CardFooter><p className="text-xs text-muted-foreground">Requiere las variables `MAILERSEND_API_KEY` y `SENDER_EMAIL_ADDRESS` en el archivo `.env`.</p></CardFooter>
      </Card>

      <div className="mt-8 text-center">
        <Button 
          variant="outline" 
          onClick={() => setShowEventManagementUI(prev => !prev)}
          className="w-full max-w-md mx-auto"
          disabled={isSendingTestEmail || isResetting}
        >
          {showEventManagementUI ? <ChevronUp className="mr-2 h-5 w-5" /> : <ChevronDown className="mr-2 h-5 w-5" />}
          {showEventManagementUI ? 'Ocultar Filtros y Lista de Eventos' : 'Mostrar Filtros y Lista de Eventos'}
        </Button>
      </div>
      
      {showEventManagementUI && (
        <>
          <Card className="shadow-lg mt-6 animate-in fade-in-50 duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <ListFilter className="h-6 w-6 text-primary" />
                <CardTitle className="text-2xl">Filtros de Eventos Registrados</CardTitle>
              </div>
              <CardDescription>Filtre los eventos para visualizarlos en la tabla de abajo.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              <div>
                <Label htmlFor="filter-site-priv" className="flex items-center mb-1"><Globe className="mr-1.5 h-4 w-4 text-muted-foreground"/>Sitio/Planta</Label>
                <Select value={filters.site || ALL_FILTER_VALUE} onValueChange={(val) => handleFilterChange('site', val)} disabled={isLoadingSites || isDeletingEvent || isSendingTestEmail}>
                  <SelectTrigger id="filter-site-priv"><SelectValue placeholder="Todos los sitios" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_FILTER_VALUE}>Todos los sitios</SelectItem>
                    {availableSites.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                    {availableSites.length === 0 && <SelectItem value={NO_SITES_PLACEHOLDER_VALUE} disabled>No hay sitios configurados</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="filter-date-priv" className="flex items-center mb-1"><CalendarDays className="mr-1.5 h-4 w-4 text-muted-foreground"/>Fecha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button id="filter-date-priv" variant="outline" className="w-full justify-start text-left font-normal" disabled={isLoadingData || isDeletingEvent || isSendingTestEmail}>
                      {filters.date ? format(filters.date, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filters.date} onSelect={handleDateChange} initialFocus locale={es} disabled={{ after: new Date() }} /></PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="filter-type-priv" className="flex items-center mb-1"><AlertTriangle className="mr-1.5 h-4 w-4 text-muted-foreground"/>Tipo</Label>
                <Select value={filters.type || ALL_FILTER_VALUE} onValueChange={(val) => handleFilterChange('type', val as ReportedEventType | typeof ALL_FILTER_VALUE)} disabled={isLoadingData || isDeletingEvent || isSendingTestEmail}>
                  <SelectTrigger id="filter-type-priv"><SelectValue placeholder="Todos los tipos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_FILTER_VALUE}>Todos los tipos</SelectItem>
                    {eventTypeOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="filter-priority-priv" className="flex items-center mb-1"><Flame className="mr-1.5 h-4 w-4 text-muted-foreground"/>Prioridad</Label>
                <Select value={filters.priority || ALL_FILTER_VALUE} onValueChange={(val) => handleFilterChange('priority', val as PriorityType | typeof ALL_FILTER_VALUE)} disabled={isLoadingData || isDeletingEvent || isSendingTestEmail}>
                  <SelectTrigger id="filter-priority-priv"><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_FILTER_VALUE}>Todas</SelectItem>
                    {priorityOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="filter-status-priv" className="flex items-center mb-1"><ActivityIcon className="mr-1.5 h-4 w-4 text-muted-foreground"/>Estado</Label>
                <Select value={filters.status || ALL_FILTER_VALUE} onValueChange={(val) => handleFilterChange('status', val as ReportedEventStatus | typeof ALL_FILTER_VALUE)} disabled={isLoadingData || isDeletingEvent || isSendingTestEmail}>
                  <SelectTrigger id="filter-status-priv"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_FILTER_VALUE}>Todos</SelectItem>
                    {statusOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="filter-event-id-priv" className="flex items-center mb-1"><Fingerprint className="mr-1.5 h-4 w-4 text-muted-foreground"/>ID Evento</Label>
                <Input id="filter-event-id-priv" placeholder="Ej: E-12345-001" value={filters.eventId} onChange={(e) => handleFilterChange('eventId', e.target.value)} disabled={isLoadingData || isDeletingEvent || isSendingTestEmail}/>
              </div>
            </CardContent>
            <CardFooter className="flex justify-start gap-3 pt-4 border-t">
              <Button onClick={applyFilters} disabled={isLoadingData || isDeletingEvent || isSendingTestEmail}><Search className="mr-2"/>Aplicar Filtros</Button>
              <Button onClick={clearFilters} variant="outline" disabled={isLoadingData || isDeletingEvent || isSendingTestEmail}><RefreshCcw className="mr-2"/>Limpiar Filtros</Button>
            </CardFooter>
          </Card>

          <Card className="shadow-lg mt-6 animate-in fade-in-50 duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <ListOrdered className="h-6 w-6 text-primary" />
                <CardTitle className="text-2xl">Eventos Registrados en el Sistema</CardTitle>
              </div>
              <CardDescription>Visualice los eventos. Use los filtros de arriba para refinar la búsqueda. Puede eliminar eventos individualmente.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[15%] cursor-pointer hover:bg-muted/50" onClick={() => requestSortEvents('id')}><div className="flex items-center gap-1">ID {renderSortIconEvents('id')}</div></TableHead>
                      <TableHead className="w-[20%] cursor-pointer hover:bg-muted/50" onClick={() => requestSortEvents('title')}><div className="flex items-center gap-1">Título {renderSortIconEvents('title')}</div></TableHead>
                      <TableHead className="w-[15%] cursor-pointer hover:bg-muted/50" onClick={() => requestSortEvents('site')}><div className="flex items-center gap-1">Sitio {renderSortIconEvents('site')}</div></TableHead>
                      <TableHead className="w-[10%] cursor-pointer hover:bg-muted/50" onClick={() => requestSortEvents('date')}><div className="flex items-center gap-1">Fecha {renderSortIconEvents('date')}</div></TableHead>
                      <TableHead className="w-[10%] cursor-pointer hover:bg-muted/50" onClick={() => requestSortEvents('type')}><div className="flex items-center gap-1">Tipo {renderSortIconEvents('type')}</div></TableHead>
                      <TableHead className="w-[10%] cursor-pointer hover:bg-muted/50" onClick={() => requestSortEvents('priority')}><div className="flex items-center gap-1">Prioridad {renderSortIconEvents('priority')}</div></TableHead>
                      <TableHead className="w-[10%] cursor-pointer hover:bg-muted/50" onClick={() => requestSortEvents('status')}><div className="flex items-center gap-1">Estado {renderSortIconEvents('status')}</div></TableHead>
                      <TableHead className="w-[10%] text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingData ? (
                      <TableRow><TableCell colSpan={8} className="text-center h-24"><Loader2 className="h-6 w-6 animate-spin inline mr-2" />Cargando...</TableCell></TableRow>
                    ) : sortedFilteredEvents.length > 0 ? (
                      sortedFilteredEvents.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="font-mono text-xs">{event.id}</TableCell>
                          <TableCell className="font-medium">{event.title}</TableCell>
                          <TableCell>{event.site}</TableCell>
                          <TableCell>{formatDateForDisplay(event.date)}</TableCell>
                          <TableCell>{event.type}</TableCell>
                          <TableCell>{event.priority}</TableCell>
                          <TableCell>{renderStatusBadge(event.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="mr-1 hover:text-primary" onClick={() => router.push(`/analisis?id=${event.id}`)} title="Ver/Editar Análisis" disabled={isSendingTestEmail || isDeletingEvent}>
                                <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => openDeleteEventDialog(event)} disabled={isDeletingEvent || isResetting || isSendingTestEmail} title="Eliminar Evento y Análisis">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground h-24">No hay eventos que coincidan.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end pt-4 border-t">
              <Button variant="outline" size="sm" onClick={handleExportToExcel} disabled={isLoadingData || isDeletingEvent || sortedFilteredEvents.length === 0 || isSendingTestEmail}>
                <FileDown className="mr-1.5 h-3.5 w-3.5" /> Exportar a Excel
              </Button>
            </CardFooter>
          </Card>
        </>
      )}

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Eliminación de Evento</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea eliminar el evento "{eventToDelete?.title}" (ID: {eventToDelete?.id}) y todo su análisis ACR asociado? Esta acción es IRREVERSIBLE.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEventToDelete(null)} disabled={isDeletingEvent || isSendingTestEmail}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isDeletingEvent || isSendingTestEmail}>
              {isDeletingEvent ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
    

    
