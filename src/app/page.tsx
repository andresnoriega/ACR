'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Zap, Target, Lightbulb, CheckSquare, BarChart3, Loader2, ClipboardList, Sparkles, FolderKanban, LineChart, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';


export default function PublicHomePage() {
  const router = useRouter();
  const { currentUser, loadingAuth } = useAuth();

  useEffect(() => {
    // If the user is authenticated, redirect them to the main dashboard.
    if (!loadingAuth && currentUser) {
      router.replace('/inicio');
    }
  }, [currentUser, loadingAuth, router]);

  // While checking auth state, show a loader.
  if (loadingAuth) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando aplicación...</p>
      </div>
    );
  }

  // If the user is not authenticated, show the public landing page.
  if (!currentUser) {
    return (
      <div className="space-y-12 md:space-y-16 py-12 md:py-20">
        <header className="text-center space-y-4 px-4">
          <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
            <Zap className="h-16 w-16" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">
            Bienvenido a Asistente ACR
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            La herramienta inteligente y guiada para transformar incidentes en oportunidades de mejora continua a través del Análisis de Causa Raíz (ACR).
          </p>
        </header>

        <section className="bg-secondary/50 py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-primary">Potencia tu Mejora Continua</h2>
              <p className="text-muted-foreground mt-2 max-w-2xl mx-auto text-lg">Descubra cómo nuestra plataforma estructurada y potenciada con IA puede simplificar la complejidad del análisis de causa raíz.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-8">
              <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 md:col-span-3">
                <CardHeader className="items-center text-center">
                    <div className="flex items-center justify-center h-16 w-16 bg-primary/10 rounded-full mb-4">
                        <ClipboardList className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl">Análisis Guiado y Completo</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="text-base text-muted-foreground">
                    Siga un proceso metódico de 5 pasos. Utilice herramientas como la <strong>Línea de Tiempo</strong>, <strong>Lluvia de Ideas</strong>, los <strong>5 Porqués, Ishikawa o el Árbol de Causas</strong> para encontrar el origen real del problema.
                    </p>
                </CardContent>
              </Card>

              <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 md:col-span-3">
                <CardHeader className="items-center text-center">
                  <div className="flex items-center justify-center h-16 w-16 bg-primary/10 rounded-full mb-4">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Inteligencia Artificial Integrada</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-base text-muted-foreground">
                    Acelere su análisis. Obtenga <strong>sugerencias inteligentes de causas raíz</strong> que podría haber pasado por alto y genere borradores de <strong>resúmenes ejecutivos profesionales</strong> con un solo clic para comunicar sus hallazgos de manera eficiente.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 md:col-span-2">
                <CardHeader className="items-center text-center">
                  <div className="flex items-center justify-center h-16 w-16 bg-primary/10 rounded-full mb-4">
                      <FolderKanban className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Gestión de Tareas y Notificaciones</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-base text-muted-foreground">
                    Defina planes de acción claros, asigne responsables y fechas límite. El sistema se encarga de <strong>notificar automáticamente por correo electrónico</strong> cada nueva tarea, asegurando que todos los involucrados estén informados y den seguimiento centralizado.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 md:col-span-2">
                <CardHeader className="items-center text-center">
                  <div className="flex items-center justify-center h-16 w-16 bg-primary/10 rounded-full mb-4">
                      <LineChart className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Informes y Métricas Clave</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-base text-muted-foreground">
                    Visualice el estado de sus operaciones con un <strong>dashboard de informes</strong> interactivo. Acceda a <strong>gráficos y métricas clave (KPIs)</strong> sobre el estado de sus análisis y el cumplimiento de los planes de acción para tomar decisiones basadas en datos.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 md:col-span-2">
                <CardHeader className="items-center text-center">
                    <div className="flex items-center justify-center h-16 w-16 bg-primary/10 rounded-full mb-4">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl">Cumplimiento Normativo</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="text-base text-muted-foreground">
                      Puedes usar este asistente para dar cumplimento al requisito "No conformidad y acción correctiva" de cualquier sistema de gestión.
                    </p>
                </CardContent>
              </Card>

            </div>
          </div>
        </section>

        <section className="bg-card py-16">
          <div className="container mx-auto text-center px-4">
             <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
                <BarChart3 className="h-8 w-8" />
              </div>
            <h2 className="text-3xl font-bold">Deje de tratar síntomas. Empiece a resolver problemas.</h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto text-lg">
              Asistente ACR le proporciona las herramientas y la estructura para ir más allá de lo obvio y descubrir las fallas sistémicas que originan los incidentes.
            </p>
          </div>
        </section>
      </div>
    );
  }

  // Fallback for unexpected states, though useEffect should handle it.
  return null;
}
