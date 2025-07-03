'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Zap, Target, Lightbulb, CheckSquare, BarChart3, Loader2 } from 'lucide-react';

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
          <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-4 rounded-full mb-4">
            <Zap className="h-12 w-12" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">
            Bienvenido a Asistente ACR
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            La herramienta inteligente y guiada para transformar incidentes en oportunidades de mejora continua a través del Análisis de Causa Raíz (ACR).
          </p>
          <div className="pt-4">
            <Button asChild size="lg" className="transition-transform hover:scale-105">
              <Link href="/login">Comenzar Ahora</Link>
            </Button>
          </div>
        </header>

        <section className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">¿Por qué Asistente ACR?</h2>
            <p className="text-muted-foreground mt-2">Simplifique la complejidad, encuentre la verdadera causa raíz y prevenga la recurrencia.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 space-y-3">
              <div className="inline-flex items-center justify-center bg-accent/10 text-accent-foreground p-3 rounded-full mb-3">
                <Target className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold">Análisis Guiado</h3>
              <p className="text-muted-foreground">Siga un proceso estructurado en 5 pasos que asegura que no se omita ninguna información crítica, desde la recolección de hechos hasta la validación de soluciones.</p>
            </div>
            <div className="text-center p-6 space-y-3">
              <div className="inline-flex items-center justify-center bg-accent/10 text-accent-foreground p-3 rounded-full mb-3">
                <Lightbulb className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold">Potenciado con IA</h3>
              <p className="text-muted-foreground">Obtenga sugerencias inteligentes de causas raíz latentes y genere borradores de resúmenes ejecutivos para comunicar sus hallazgos de manera efectiva.</p>
            </div>
            <div className="text-center p-6 space-y-3">
              <div className="inline-flex items-center justify-center bg-accent/10 text-accent-foreground p-3 rounded-full mb-3">
                <CheckSquare className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold">Gestión Centralizada</h3>
              <p className="text-muted-foreground">Cree planes de acción, asigne responsables y dé seguimiento al estado de validación de cada tarea, todo en un solo lugar.</p>
            </div>
          </div>
        </section>

        <section className="bg-secondary/50 py-16">
          <div className="container mx-auto text-center px-4">
             <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
                <BarChart3 className="h-8 w-8" />
              </div>
            <h2 className="text-3xl font-bold">Deje de tratar síntomas. Empiece a resolver problemas.</h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              Asistente ACR le proporciona las herramientas y la estructura para ir más allá de lo obvio y descubrir las fallas sistémicas que originan los incidentes.
            </p>
            <div className="mt-8">
              <Button asChild size="lg" className="transition-transform hover:scale-105 shadow-lg">
                <Link href="/registro">Regístrese Gratis</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Fallback for unexpected states, though useEffect should handle it.
  return null;
}