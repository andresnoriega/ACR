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
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">¿Por qué Asistente ACR?</h2>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">Simplifique la complejidad, encuentre la verdadera causa raíz y prevenga la recurrencia con nuestras poderosas herramientas.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center h-16 w-16 bg-primary/10 rounded-full mb-4">
                  <Target className="h-8 w-8 text-primary" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Análisis Guiado y Estructurado</h4>
              <p className="text-sm text-muted-foreground">Siga un proceso metódico de 5 pasos que le asegura no omitir información crítica. Desde la descripción del evento hasta la validación de acciones, cada etapa está diseñada para maximizar la efectividad del análisis.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center h-16 w-16 bg-primary/10 rounded-full mb-4">
                <Lightbulb className="h-8 w-8 text-primary" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Potenciado con Inteligencia Artificial</h4>
              <p className="text-sm text-muted-foreground">Obtenga sugerencias inteligentes de causas raíz latentes y genere borradores de resúmenes ejecutivos con un solo clic. Deje que la IA acelere su proceso de análisis y le ayude a descubrir insights ocultos.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center h-16 w-16 bg-primary/10 rounded-full mb-4">
                  <CheckSquare className="h-8 w-8 text-primary" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Gestión Centralizada de Tareas</h4>
              <p className="text-sm text-muted-foreground">Cree planes de acción, asigne responsables y dé seguimiento al estado de validación de cada tarea desde un único lugar. Asegure la rendición de cuentas y el cumplimiento de las soluciones propuestas.</p>
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
