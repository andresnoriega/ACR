'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Zap, Target, Lightbulb, CheckSquare, BarChart3, Loader2 } from 'lucide-react';
import Image from 'next/image';

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
          <div className="pt-4">
            <Button asChild size="lg" className="transition-transform hover:scale-105">
              <Link href="/login">Comenzar Ahora</Link>
            </Button>
          </div>
        </header>

        <section className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-center">¿Por qué Asistente ACR?</h2>
              <p className="text-muted-foreground text-center">Simplifique la complejidad, encuentre la verdadera causa raíz y prevenga la recurrencia.</p>
              <ul className="space-y-3 pt-4">
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1"><Target className="h-6 w-6 text-accent" /></div>
                  <div>
                    <h4 className="font-semibold">Análisis Guiado</h4>
                    <p className="text-sm text-muted-foreground">Siga un proceso estructurado en 5 pasos que asegura que no se omita ninguna información crítica.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1"><Lightbulb className="h-6 w-6 text-accent" /></div>
                  <div>
                    <h4 className="font-semibold">Potenciado con IA</h4>
                    <p className="text-sm text-muted-foreground">Obtenga sugerencias inteligentes de causas raíz y genere borradores de resúmenes ejecutivos.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1"><CheckSquare className="h-6 w-6 text-accent" /></div>
                  <div>
                    <h4 className="font-semibold">Gestión Centralizada</h4>
                    <p className="text-sm text-muted-foreground">Cree planes de acción, asigne responsables y dé seguimiento al estado de validación de cada tarea.</p>
                  </div>
                </li>
              </ul>
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
