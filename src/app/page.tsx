'use client';

import { ArrowRight, BarChart3, Bot, CheckSquare, ClipboardList, ListOrdered, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/logo';

const FeatureCard = ({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) => (
  <Card className="text-center shadow-md hover:shadow-lg transition-shadow duration-300">
    <CardHeader className="items-center">
      <div className="p-3 bg-primary/10 rounded-full mb-2">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <CardTitle className="text-lg font-semibold">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);


export default function Home() {

  const features = [
    {
      icon: ClipboardList,
      title: 'Proceso de Análisis Guiado',
      description: 'Sigue un flujo estructurado en 5 pasos, desde la iniciación del evento hasta la verificación de la eficacia de las acciones.',
    },
    {
      icon: BarChart3,
      title: 'Múltiples Técnicas de Análisis',
      description: 'Utiliza herramientas integradas como Ishikawa, 5 Porqués y Árbol de Causas (CTM) para encontrar el origen de los problemas.',
    },
    {
      icon: Bot,
      title: 'Asistencia con IA',
      description: 'Genera resúmenes ejecutivos y obtén sugerencias de causas raíz latentes para enriquecer tus análisis.',
    },
    {
      icon: ListOrdered,
      title: 'Gestión de Tareas y Acciones',
      description: 'Define planes de acción claros, asigna responsables y fechas límite, y gestiona el ciclo de vida de cada tarea.',
    },
    {
      icon: CheckSquare,
      title: 'Validación y Seguimiento',
      description: 'Valida la implementación de acciones con evidencias y realiza un seguimiento de la eficacia a largo plazo de las soluciones.',
    },
    {
      icon: ShieldCheck,
      title: 'Informes y Dashboards',
      description: 'Visualiza el estado de tus análisis, el cumplimiento de los planes y exporta informes completos en PDF para comunicar los resultados.'
    }
  ];

  return (
    <div className="bg-background text-foreground">
      <main>
        {/* Hero Section */}
        <section className="py-16 md:py-24 text-center bg-card">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-headline text-primary">
              Más que un Gestor de Incidentes: La Evolución al Análisis Inteligente
            </h1>
            <p className="mt-6 text-lg md:text-xl max-w-3xl mx-auto text-muted-foreground">
              Asistente ACR no solo registra tus eventos. Te guía para optimizar tus procesos, unificando el análisis con inteligencia artificial para maximizar la fiabilidad y prevenir futuras recurrencias.
            </p>
            <div className="mt-8">
              <Button asChild size="lg">
                <Link href="/registro">
                  Comienza Ahora <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold font-headline">Funcionalidades Clave</h2>
              <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
                Descubre cómo Asistente ACR transforma cada aspecto de tu gestión de Análisis de Causa Raíz.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <FeatureCard key={index} {...feature} />
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-16 md:py-24 bg-card">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold font-headline">Mejora la Gestión de tus Procesos</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Toma el control total de tus análisis. Asistente ACR te ofrece las herramientas para centralizar información, optimizar el ciclo de resolución de problemas y tomar decisiones basadas en datos para maximizar la eficiencia y seguridad de tu operación.
            </p>
          </div>
        </section>
      </main>

      <footer className="bg-background border-t">
        <div className="container mx-auto py-6 px-4 text-center text-muted-foreground text-sm">
          &copy; {new Date().getFullYear()} Asistente ACR. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
