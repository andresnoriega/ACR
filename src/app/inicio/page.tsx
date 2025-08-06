'use client';

import { useMemo, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ListOrdered, PieChart, BarChart as BarChartIcon, CheckSquare, ListTodo, ShieldCheck } from 'lucide-react';
import type { RCAAnalysisDocument, Site } from '@/types/rca';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, type QueryConstraint } from "firebase/firestore";
import Link from 'next/link';

export default function InicioPage() {
  const { userProfile, loadingAuth } = useAuth();
  const router = useRouter();

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [allRcaDocs, setAllRcaDocs] = useState<RCAAnalysisDocument[]>([]);
  const [availableSites, setAvailableSites] = useState<Site[]>([]);

  const fetchDashboardData = useCallback(async () => {
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
        setAvailableSites(sitesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Site)));

        const rcaCollectionRef = collection(db, "rcaAnalyses");
        const rcaQueryConstraints: QueryConstraint[] = [];
        if (userProfile.role !== 'Super User' && userProfile.empresa) {
            rcaQueryConstraints.push(where('empresa', '==', userProfile.empresa));
        }
        const rcaQuery = query(rcaCollectionRef, ...rcaQueryConstraints);
        const rcaSnapshot = await getDocs(rcaQuery);
        setAllRcaDocs(rcaSnapshot.docs.map(doc => doc.data() as RCAAnalysisDocument));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoadingData(false);
    }
  }, [loadingAuth, userProfile]);

  useEffect(() => {
    if (!loadingAuth && !userProfile) {
      router.replace('/login');
    } else if (userProfile) {
      fetchDashboardData();
    }
  }, [loadingAuth, userProfile, router, fetchDashboardData]);

  const summaryData = useMemo(() => {
    const total = allRcaDocs.length;
    const pendientes = allRcaDocs.filter(e => !e.isFinalized && !e.rejectionDetails).length;
    const finalizados = allRcaDocs.filter(e => e.isFinalized && !e.rejectionDetails).length;
    const verificados = allRcaDocs.filter(e => e.efficacyVerification?.status === 'verified').length;
    
    const allActions = allRcaDocs.flatMap(doc => doc.plannedActions || []);
    const totalAcciones = allActions.length;
    const accionesValidadas = allActions.filter(a => {
        const validation = allRcaDocs.find(d => d.eventData.id === a.eventId)?.validations.find(v => v.actionId === a.id);
        return validation?.status === 'validated';
    }).length;
    const accionesPendientes = totalAcciones - accionesValidadas;

    return { total, pendientes, finalizados, verificados, totalAcciones, accionesPendientes, accionesValidadas };
  }, [allRcaDocs]);

  if (loadingAuth || isLoadingData) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-8">
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-bold font-headline text-primary">
          Bienvenido, {userProfile?.name || 'Usuario'}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Aquí tiene un resumen del estado actual del sistema Asistente ACR.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><PieChart className="mr-2 h-5 w-5" />Resumen de Análisis</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-secondary/40 rounded-lg">
                <p className="text-3xl font-bold text-foreground">{summaryData.total}</p>
                <p className="text-sm text-muted-foreground">Total de Análisis</p>
            </div>
            <div className="p-4 bg-yellow-400/20 rounded-lg">
                <p className="text-3xl font-bold text-yellow-600">{summaryData.pendientes}</p>
                <p className="text-sm text-muted-foreground">Análisis Pendientes</p>
            </div>
            <div className="p-4 bg-green-400/20 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{summaryData.finalizados}</p>
                <p className="text-sm text-muted-foreground">Análisis Finalizados</p>
            </div>
            <div className="p-4 bg-blue-400/20 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">{summaryData.verificados}</p>
                <p className="text-sm text-muted-foreground">Análisis Verificados</p>
            </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center"><BarChartIcon className="mr-2 h-5 w-5" />Resumen de Acciones</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-secondary/40 rounded-lg">
                <p className="text-3xl font-bold text-foreground">{summaryData.totalAcciones}</p>
                <p className="text-sm text-muted-foreground">Total de Acciones</p>
            </div>
            <div className="p-4 bg-yellow-400/20 rounded-lg">
                <p className="text-3xl font-bold text-yellow-600">{summaryData.accionesPendientes}</p>
                <p className="text-sm text-muted-foreground">Acciones Pendientes</p>
            </div>
            <div className="p-4 bg-green-400/20 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{summaryData.accionesValidadas}</p>
                <p className="text-sm text-muted-foreground">Acciones Validadas</p>
            </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ListOrdered className="h-6 w-6 text-primary" />Ver Eventos</CardTitle>
            <CardDescription>Consulte la lista de todos los eventos reportados, filtre y comience un nuevo análisis.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/eventos">Ir a Eventos</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ListTodo className="h-6 w-6 text-primary" />Mis Tareas</CardTitle>
            <CardDescription>Vea y gestione todas las acciones correctivas que le han sido asignadas.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
                <Link href="/usuario/planes">Ir a Mis Tareas</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckSquare className="h-6 w-6 text-primary" />Tareas por Validar</CardTitle>
            <CardDescription>Si es líder de proyecto o admin, revise las tareas listas para su validación.</CardDescription>
          </CardHeader>
          <CardContent>
             <Button asChild className="w-full">
                <Link href="/usuario/planes?tab=validation">Ir a Validaciones</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}