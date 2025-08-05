
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, BarChart3, Bot, GanttChartSquare, Layers, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon: Icon }) => (
  <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 h-full">
    <CardHeader>
      <div className="flex flex-col items-center text-center">
        <div className="p-3 bg-primary/10 rounded-full mb-3">
          <Icon className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </div>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-center text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);


export default function PublicHomePage() {
  const features: FeatureCardProps[] = [
    {
      title: 'Flujo de Trabajo Guiado y Estandarizado',
      description: 'Navega a través de un proceso de ACR estructurado en 5 pasos, asegurando que no se omita ninguna etapa crítica, desde la definición del problema hasta la validación de soluciones.',
      icon: GanttChartSquare,
    },
    {
      title: 'Asistente con Inteligencia Artificial Integrada',
      description: 'Aprovecha la IA para generar borradores de resúmenes ejecutivos y obtener sugerencias de causas raíz latentes, acelerando tu análisis y mejorando la calidad de tus informes.',
      icon: Bot,
    },
    {
      title: 'Gestión Centralizada de Tareas y Acciones',
      description: 'Asigna, gestiona y sigue el progreso de los planes de acción. Los responsables pueden adjuntar evidencias y los validadores son notificados automáticamente.',
      icon: ShieldCheck,
    },
    {
      title: 'Informes y Métricas de Desempeño',
      description: 'Visualiza dashboards interactivos con KPIs sobre el estado de tus análisis, el cumplimiento de acciones y las causas raíz más recurrentes para una toma de decisiones informada.',
      icon: BarChart3,
    },
    {
      title: 'Administración y Seguridad',
      description: 'Gestiona usuarios, roles y permisos de forma centralizada. Asigna perfiles específicos para Super Usuarios, Administradores, Analistas y Revisores.',
      icon: ShieldCheck,
    },
    {
        title: 'Herramientas de Análisis Avanzadas',
        description: 'Utiliza herramientas visuales e interactivas como Ishikawa (Espina de Pescado), 5 Porqués y Árbol de Causas (CTM) para profundizar en tus investigaciones.',
        icon: Layers,
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-grow">
        <section className="text-center py-20 sm:py-24 lg:py-32 bg-secondary/30">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-headline text-primary mb-4">
              Más que un Software de ACR: Tu Aliado Estratégico
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Transforma la gestión de incidentes en una oportunidad de mejora continua. Asistente ACR estandariza tu proceso de Análisis de Causa Raíz, integrando inteligencia artificial para optimizar tus operaciones y potenciar la fiabilidad.
            </p>
            <Button asChild size="lg">
              <Link href="/login">
                Comienza Ahora <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>

        <section id="features" className="py-16 sm:py-20 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold font-headline">Funcionalidades Clave</h2>
              <p className="text-md text-muted-foreground max-w-2xl mx-auto mt-2">
                Descubre cómo Asistente ACR transforma cada aspecto de tu gestión de incidentes.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <FeatureCard key={index} {...feature} />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-secondary/30 py-16 sm:py-20 lg:py-24">
            <div className="container mx-auto px-4 text-center">
                 <h2 className="text-3xl sm:text-4xl font-bold font-headline text-primary mb-4">
                    Mejora la Gestión de tus Activos y Procesos
                </h2>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
                    Toma el control total de tus análisis. Asistente ACR te ofrece las herramientas para centralizar información, optimizar el ciclo de vida de tus investigaciones y tomar decisiones basadas en datos para maximizar la fiabilidad de tus operaciones.
                </p>
            </div>
        </section>

      </main>

      <footer className="bg-background border-t">
        <div className="container mx-auto px-4 py-6 text-center text-muted-foreground text-sm">
          &copy; {new Date().getFullYear()} Asistente ACR. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
