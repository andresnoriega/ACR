
'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2, BarChart3, ListOrdered, FileText, UserCheck, User, Settings, HelpCircle, Phone } from 'lucide-react';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  buttonText: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon: Icon, href, buttonText }) => {
  return (
    <Card className="flex flex-col shadow-sm hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center gap-3 mb-1">
          <Icon className="h-6 w-6 text-primary" />
          <CardTitle className="text-xl">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0" />
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={href}>{buttonText}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};


export default function InicioPage() {
  const { userProfile, loadingAuth } = useAuth();
  const router = useRouter();

  if (loadingAuth || !userProfile) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando bienvenida...</p>
      </div>
    );
  }

  const mainFeatures: FeatureCardProps[] = [
    { title: 'Reporta y Analiza', description: 'Inicie un nuevo análisis o continúe uno existente, siguiendo un proceso guiado paso a paso.', icon: BarChart3, href: '/analisis', buttonText: 'Ir a Análisis' },
    { title: 'Eventos Reportados', description: 'Visualice y gestione todos los eventos reportados y pendientes de análisis.', icon: ListOrdered, href: '/eventos', buttonText: 'Ver Eventos' },
    { title: 'Informes', description: 'Visualice y gestione los informes de sus análisis completados.', icon: FileText, href: '/informes', buttonText: 'Ver Informes' },
    { title: 'Mis Tareas', description: 'Gestione sus planes de acción y tareas asignadas.', icon: UserCheck, href: '/usuario/planes', buttonText: 'Ir a Mis Tareas' },
    { title: 'Mi Perfil', description: 'Gestiona tu información personal y de seguridad.', icon: User, href: '/usuario/perfil', buttonText: 'Ir a Mi Perfil' },
    { title: 'Configuración', description: 'Ajuste las preferencias y configuraciones de la aplicación.', icon: Settings, href: '/config', buttonText: 'Ir a Configuración' },
  ];
  
  const filteredFeatures = mainFeatures.filter(feature => {
    if (feature.href === '/config' && userProfile.role !== 'Super User' && userProfile.role !== 'Admin') {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-8 py-4">
      <header className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold font-headline text-primary">
          ¡Bienvenido a Asistente ACR, {userProfile.name}!
        </h1>
        <p className="text-md text-muted-foreground max-w-2xl mx-auto">
          Su herramienta intuitiva y eficiente para realizar Análisis de Causa Raíz (ACR) y mejorar continuamente sus procesos.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFeatures.map(item => (
            <FeatureCard 
                key={item.title}
                {...item}
            />
        ))}
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
              <CardTitle className="flex items-center gap-3"><Phone className="h-6 w-6 text-primary"/>Soporte Técnico</CardTitle>
              <CardDescription>¿Necesita ayuda? Nuestro equipo está listo para asistirlo.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild variant="outline">
                <a href="mailto:contacto@damc.cl">Solicitar Soporte</a>
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3"><HelpCircle className="h-6 w-6 text-primary"/>¿Qué es un Análisis de Causa Raíz?</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    El Análisis de Causa Raíz (ACR) es un método sistemático para identificar las causas subyacentes de un problema o incidente. En lugar de simplemente tratar los síntomas, el ACR busca encontrar el origen fundamental para implementar soluciones efectivas y prevenir la recurrencia del problema. Esta herramienta le guiará a través de este proceso.
                </p>
            </CardContent>
        </Card>
      </div>

    </div>
  );
}
