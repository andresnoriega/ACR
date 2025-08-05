'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import type { ReportedEvent, ReportedEventType, PriorityType, Site, ReportedEventStatus } from '@/types/rca';
import { ListOrdered, PieChart, BarChart, ListFilter, Globe, CalendarDays, AlertTriangle, Flame, ActivityIcon, Search, RefreshCcw, PlayCircle, Info, Loader2, Eye, Fingerprint, FileDown, ArrowUp, ArrowDown, ChevronsUpDown, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, where, type QueryConstraint } from "firebase/firestore";
import { useAuth } from '@/contexts/AuthContext';


const eventTypeOptions: ReportedEventType[] = ['Incidente', 'Falla de Equipo', 'Accidente', 'No Conformidad', 'Evento Operacional'];
const priorityOptions: PriorityType[] = ['Alta', 'Media', 'Baja'];
const statusOptions: ReportedEventStatus[] = ['Pendiente', 'En análisis', 'En validación', 'Finalizado', 'Rechazado', 'Verificado'];


const ALL_FILTER_VALUE = "__ALL__";
const NO_SITES_PLACEHOLDER_VALUE = "__NO_SITES_PLACEHOLDER__";


export default function InformesPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { userProfile, loadingAuth } = useAuth();

  const [allEvents, setAllEvents] = useState<ReportedEvent[]>([]);
  const [availableSites, setAvailableSites] = useState<Site[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

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
    } catch (error) {
      console.error("Error fetching data for reports: ", error);
      toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar los datos para los informes.", variant: "destructive" });
      setAllEvents([]);
    } finally {
      setIsLoadingData(false);
    }
  }, [toast, loadingAuth, userProfile]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const summaryData = useMemo(() => ({
    total: allEvents.length,
    pendientes: allEvents.filter(e => e.status === 'Pendiente').length,
    enAnalisis: allEvents.filter(e => e.status === 'En análisis').length,
    enValidacion: allEvents.filter(e => e.status === 'En validación').length,
    finalizados: allEvents.filter(e => e.status === 'Finalizado').length,
    verificados: allEvents.filter(e => e.status === 'Verificado').length,
    rechazados: allEvents.filter(e => e.status === 'Rechazado').length,
  }), [allEvents]);

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
            <PieChart className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Resumen Rápido</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 text-center">
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
          <div className="p-4 bg-indigo-400/20 rounded-lg">
            <p className="text-3xl font-bold text-indigo-600">{summaryData.verificados}</p>
            <p className="text-sm text-muted-foreground">Verificados</p>
          </div>
          <div className="p-4 bg-slate-400/20 rounded-lg">
            <p className="text-3xl font-bold text-slate-600">{summaryData.rechazados}</p>
            <p className="text-sm text-muted-foreground">Rechazados</p>
          </div>
        </CardContent>
         <CardFooter>
            <p className="text-xs text-muted-foreground">
              Datos actualizados en tiempo real desde Firestore.
            </p>
          </CardFooter>
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