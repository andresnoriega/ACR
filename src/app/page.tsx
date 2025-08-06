'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Layers, BrainCircuit, Activity, Shield, ClipboardCheck, Workflow, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const FeatureCard = ({ icon: Icon, title, children }: { icon: React.ElementType, title: string, children: React.ReactNode }) => (
  <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
    <CardContent className="p-6 text-center">
      <div className="mb-4 inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{children}</p>
    </CardContent>
  </Card>
);

export default function PublicHomePage() {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth && currentUser) {
      router.replace('/inicio');
    }
  }, [currentUser, loadingAuth, router]);

  if (loadingAuth || currentUser) {
     return (
      <div className="flex h-screen w-full flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando aplicación...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-primary">
            <Layers className="h-6 w-6" />
            <span className="font-headline text-xl">Asistente ACR</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Iniciar Sesión</Link>
            </Button>
            <Button asChild>
              <Link href="/registro">Registrarse</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-grow">
        <section className="py-20 text-center bg-secondary/30">
          <div className="container">
            <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary mb-4 leading-tight">
              Simplifica tu Análisis de Causa Raíz (ACR)
            </h1>
            <p className="max-w-3xl mx-auto text-lg text-muted-foreground mb-8">
              Asistente ACR es una herramienta intuitiva que te guía para identificar el origen de los problemas, definir acciones efectivas y prevenir su recurrencia, potenciando la mejora continua en tu organización.
            </p>
            <Button asChild size="lg">
              <Link href="/registro">
                Comienza Ahora <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="py-20">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold font-headline">Funcionalidades Clave</h2>
              <p className="text-muted-foreground mt-2">Descubre cómo Asistente ACR potencia tus análisis.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard icon={Workflow} title="Análisis Guiado en 5 Pasos">
                Sigue un flujo de trabajo estructurado, desde la iniciación del evento hasta la validación de resultados, asegurando un análisis completo.
              </FeatureCard>
              <FeatureCard icon={BrainCircuit} title="Asistencia con IA">
                Obtén sugerencias de causas raíz latentes y genera borradores de resúmenes ejecutivos con inteligencia artificial para acelerar tu análisis.
              </FeatureCard>
              <FeatureCard icon={ClipboardCheck} title="Gestión de Planes de Acción">
                Define, asigna y da seguimiento a las acciones correctivas. Los responsables pueden adjuntar evidencias y marcar tareas para su validación.
              </FeatureCard>
              <FeatureCard icon={Layers} title="Informes y Dashboards">
                Visualiza el estado de tus análisis y planes de acción con gráficos y resúmenes. Exporta tus datos y comparte informes completos.
              </FeatureCard>
               <FeatureCard icon={Activity} title="Colaboración en Equipo">
                Gestiona roles y permisos para tu equipo. Define líderes de proyecto y equipos de investigación para cada análisis.
              </FeatureCard>
               <FeatureCard icon={Shield} title="Técnicas de Análisis Integradas">
                Utiliza herramientas interactivas como Ishikawa, 5 Porqués y Árbol de Causas (CTM) para explorar y documentar las causas de forma visual.
              </FeatureCard>
            </div>
          </div>
        </section>
        
        <section className="py-20 bg-secondary/30">
           <div className="container text-center">
             <h2 className="text-3xl font-bold font-headline">Transforma Problemas en Oportunidades</h2>
             <p className="max-w-3xl mx-auto text-lg text-muted-foreground mt-4">
                Deja de tratar solo los síntomas. Con Asistente ACR, obtienes las herramientas para descubrir las causas fundamentales, implementar soluciones duraderas y fomentar una cultura de mejora continua.
             </p>
           </div>
        </section>
      </main>

       <footer className="py-6 border-t">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Asistente ACR. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
