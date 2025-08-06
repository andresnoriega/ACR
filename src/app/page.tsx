
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
              Más que un CMMS: La Evolución a la Gestión del Rendimiento de Activos (APM)
            </h1>
            <p className="max-w-3xl mx-auto text-lg text-muted-foreground mb-8">
              Diamant no solo gestiona tu mantenimiento. Lo optimiza. Unifica tus operaciones de CMMS con la inteligencia del APM para maximizar la fiabilidad, predecir fallos y tomar decisiones estratégicas que impulsan tu rentabilidad.
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
              <p className="text-muted-foreground mt-2">Descubre cómo Diamant transforma cada aspecto de tu gestión de mantenimiento.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard icon={Layers} title="Gemelos Digitales Interactivos">
                Visualiza tus activos con diagramas dinámicos que muestran componentes y datos de telemetría en tiempo real, facilitando el diagnóstico.
              </FeatureCard>
              <FeatureCard icon={BrainCircuit} title="Análisis de Confiabilidad (MTBF/MTTR y Disponibilidad)">
                Calcula automáticamente MTBF, MTTR y Disponibilidad. Utiliza el análisis Jack-Knife para identificar activos críticos y tomar decisiones basadas en datos.
              </FeatureCard>
              <FeatureCard icon={Activity} title="Indicadores de Salud">
                Monitoriza la condición de tus activos con un índice de salud en tiempo real, calculado a partir de las variables de telemetría que tú definas.
              </FeatureCard>
              <FeatureCard icon={Shield} title="Gestión de Riesgos">
                Evalúa la criticidad de tus activos con una matriz de riesgo configurable. Prioriza recursos donde más importa.
              </FeatureCard>
              <FeatureCard icon={ClipboardCheck} title="Planificación Inteligente">
                Genera planes de mantenimiento detallados basados en el tipo de activo o manuales técnicos, ahorrando horas de trabajo.
              </FeatureCard>
              <FeatureCard icon={Workflow} title="Flujo de Trabajo Completo">
                Gestiona todo el ciclo de tu mantenimiento, desde la creación de un aviso con QR hasta el cierre de la orden.
              </FeatureCard>
            </div>
          </div>
        </section>
        
        <section className="py-20 bg-secondary/30">
           <div className="container text-center">
             <h2 className="text-3xl font-bold font-headline">Mejora la Gestión de tus Activos</h2>
             <p className="max-w-3xl mx-auto text-lg text-muted-foreground mt-4">
                Toma el control total de tus activos. Diamant te ofrece las herramientas para centralizar información, optimizar el ciclo de vida de tus equipos y tomar decisiones basadas en el riesgo para maximizar su rendimiento y disponibilidad.
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
