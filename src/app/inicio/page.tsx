
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Home, BarChart3, FileText, SettingsIcon, Zap, UserCheck, ListOrdered, Loader2 } from 'lucide-react';

export default function InicioPage() {
  const router = useRouter();
  const { currentUser, loadingAuth, userProfile } = useAuth();

  useEffect(() => {
    if (!loadingAuth && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, loadingAuth, router]);

  if (loadingAuth) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando datos de usuario...</p>
      </div>
    );
  }

  if (!currentUser) {
    // This case should be handled by the useEffect redirect, but as a fallback:
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] text-center">
        <p className="text-lg text-muted-foreground mb-4">Debe iniciar sesión para ver esta página.</p>
        <Button asChild><Link href="/login">Ir a Login</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-8">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
          <Zap className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary">
          Bienvenido a RCA Assistant, {userProfile?.name || currentUser.email}!
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Su herramienta intuitiva y eficiente para realizar Análisis de Causa Raíz (RCA) y mejorar continuamente sus procesos.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="h-7 w-7 text-primary" />
              <CardTitle className="text-2xl">Análisis RCA</CardTitle>
            </div>
            <CardDescription>Inicie un nuevo análisis o continúe uno existente, siguiendo un proceso guiado paso a paso.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/analisis" passHref>
              <Button className="w-full" size="lg">
                Ir a Análisis
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <ListOrdered className="h-7 w-7 text-primary" />
              <CardTitle className="text-2xl">Eventos Reportados</CardTitle>
            </div>
            <CardDescription>Visualice y gestione todos los eventos reportados y pendientes de análisis.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/eventos" passHref>
              <Button className="w-full" size="lg">
                Ver Eventos
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-7 w-7 text-primary" />
              <CardTitle className="text-2xl">Informes</CardTitle>
            </div>
            <CardDescription>Visualice y gestione los informes de sus análisis completados.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/informes" passHref>
              <Button className="w-full" size="lg">
                Ver Informes
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <UserCheck className="h-7 w-7 text-primary" />
              <CardTitle className="text-2xl">Menú de Usuario</CardTitle>
            </div>
            <CardDescription>Gestione sus planes de acción y tareas asignadas.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/usuario/planes" passHref>
              <Button className="w-full" size="lg">
                Ir a Mis Tareas
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <SettingsIcon className="h-7 w-7 text-primary" />
              <CardTitle className="text-2xl">Configuración</CardTitle>
            </div>
            <CardDescription>Ajuste las preferencias y configuraciones de la aplicación.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/config" passHref>
              <Button className="w-full" size="lg">
                Ir a Configuración
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mt-8 bg-secondary/30">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-primary mb-2">¿Qué es un Análisis de Causa Raíz?</h3>
          <p className="text-sm text-foreground">
            El Análisis de Causa Raíz (RCA) es un método sistemático para identificar las causas subyacentes de un problema o incidente. 
            En lugar de simplemente tratar los síntomas, el RCA busca encontrar el origen fundamental para implementar soluciones efectivas 
            y prevenir la recurrencia del problema. Esta herramienta le guiará a través de este proceso.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
