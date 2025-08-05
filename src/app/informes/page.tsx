
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/hooks/use-toast";
import type { ReportedEvent, ReportedEventType, PriorityType, Site, RCAAnalysisDocument, IdentifiedRootCause } from '@/types/rca';
import { ListOrdered, PieChart, BarChart, ListFilter, Globe, CalendarDays, AlertTriangle, Flame, ActivityIcon, Search, RefreshCcw, Loader2, FileDown } from 'lucide-react';
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

interface RootCauseSummary extends IdentifiedRootCause {
  eventDate: string;
  site: string;
  equipo: string;
}

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
    const pendientes = dataSet.filter(e => !e.isFinalized && e.rejectionDetails === undefined).length;
    const finalizados = dataSet.filter(e => e.isFinalized && e.rejectionDetails === undefined).length;
    const verificados = dataSet.filter(e => e.efficacyVerification?.status === 'verified').length;
    const cumplimiento = total > 0 ? (verificados / total) * 100 : 0;

    const allActions = dataSet.flatMap(doc => doc.plannedActions || []);
    const totalAcciones = allActions.length;
    const accionesPendientes = allActions.filter(a => {
        const validation = dataSet.find(d => d.eventData.id === a.eventId)?.validations.find(v => v.actionId === a.id);
        return !validation || validation.status === 'pending' || validation.status === 'rejected';
    }).length;
    const accionesValidadas = totalAcciones - accionesPendientes;
    const cumplimientoAcciones = totalAcciones > 0 ? (accionesValidadas / totalAcciones) * 100 : 0;

    return { total, pendientes, finalizados, verificados, cumplimiento, totalAcciones, accionesPendientes, accionesValidadas, cumplimientoAcciones };
  }, [filteredRcaDocs]);

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

  const handleExportRootCauses = () => {
    if (rootCauseSummaryData.length === 0) {
      toast({ title: "Sin Datos para Exportar", description: "No hay causas raíz en la tabla para exportar.", variant: "default" });
      return;
    }
    const dataToExport = rootCauseSummaryData.map(item => ({
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

  const analysesEnCurso = useMemo(() => {
      return filteredRcaDocs.filter(doc => !doc.isFinalized && !doc.rejectionDetails);
  }, [filteredRcaDocs]);

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
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Gráfico Estado de Análisis de Causa Raíz</CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-center text-muted-foreground py-10">Visualización de gráfico en desarrollo.</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Gráfico Estado de Acciones Correctivas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground py-10">Visualización de gráfico en desarrollo.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen de Causas Raíz Identificadas</CardTitle>
          <CardDescription>Una lista de todas las causas raíz identificadas en los análisis que coinciden con los filtros actuales.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha Evento</TableHead>
                        <TableHead>Sitio/Planta</TableHead>
                        <TableHead>Equipo</TableHead>
                        <TableHead>Causa Raíz Identificada</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rootCauseSummaryData.length > 0 ? (
                        rootCauseSummaryData.map((rc, index) => (
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
            <Button variant="outline" size="sm" onClick={handleExportRootCauses} disabled={rootCauseSummaryData.length === 0}>
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
                          <TableHead>Proyecto/Evento</TableHead>
                          <TableHead>Paso Actual</TableHead>
                          <TableHead>Progreso Estimado</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {analysesEnCurso.length > 0 ? (
                          analysesEnCurso.map(doc => {
                              const totalSteps = 5;
                              const hasStep3Content = doc.identifiedRootCauses?.length > 0 || doc.ishikawaData?.some(c => c.causes.length > 0) || doc.fiveWhysData?.length > 0 || doc.ctmData?.length > 0;
                              const currentStep = doc.isFinalized ? 5 : doc.validations?.some(v => v.status === 'validated') ? 4 : hasStep3Content ? 3 : (doc.projectLeader || doc.detailedFacts.como) ? 2 : 1;
                              const progress = (currentStep / totalSteps) * 100;
                              
                              return (
                                  <TableRow key={doc.eventData.id}>
                                      <TableCell className="font-medium">{doc.eventData.focusEventDescription}</TableCell>
                                      <TableCell>Paso {currentStep} de {totalSteps}</TableCell>
                                      <TableCell><Progress value={progress} className="w-[60%]" /></TableCell>
                                  </TableRow>
                              )
                          })
                      ) : (
                          <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground h-24">No hay análisis en curso que coincidan con los filtros actuales.</TableCell>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>

    </div>
  );
}

