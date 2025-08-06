'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, BarChart3, ListOrdered, FileText, UserCheck, UserCircle, Settings, HelpCircle, Phone } from 'lucide-react';

export default function InicioPage() {
  const { userProfile, loadingAuth } = useAuth();

  if (loadingAuth || !userProfile) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  const menuItems = [
    {
      title: 'Reporta y Analiza',
      description: 'Inicie un nuevo análisis o continúe uno existente, siguiendo un proceso guiado paso a paso.',
      href: '/analisis',
      icon: BarChart3,
      cta: 'Ir a Análisis',
    },
    {
      title: 'Eventos Reportados',
      description: 'Visualice y gestione todos los eventos reportados y pendientes de análisis.',
      href: '/eventos',
      icon: ListOrdered,
      cta: 'Ver Eventos',
    },
    {
      title: 'Informes',
      description: 'Visualice y gestione los informes de sus análisis completados.',
      href: '/informes',
      icon: FileText,
      cta: 'Ver Informes',
    },
    {
      title: 'Mis Tareas',
      description: 'Gestione sus planes de acción y tareas asignadas.',
      href: '/usuario/planes',
      icon: UserCheck,
      cta: 'Ir a Mis Tareas',
    },
    {
      title: 'Mi Perfil',
      description: 'Gestiona tu información personal y de seguridad.',
      href: '/usuario/perfil',
      icon: UserCircle,
      cta: 'Ir a Mi Perfil',
    },
    {
      title: 'Configuración',
      description: 'Ajuste las preferencias y configuraciones de la aplicación.',
      href: '/config',
      icon: Settings,
      cta: 'Ir a Configuración',
    },
  ];

  return (
    <div className="space-y-8 py-8">
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-bold font-headline text-primary">
          ¡Bienvenido a Asistente ACR, {userProfile.name}!
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Su herramienta intuitiva y eficiente para realizar Análisis de Causa Raíz (ACR) y mejorar continuamente sus procesos.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menuItems.map((item) => (
          <Card key={item.title} className="hover:shadow-lg transition-shadow flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <item.icon className="h-7 w-7 text-primary" />
                <CardTitle className="text-2xl">{item.title}</CardTitle>
              </div>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex items-end">
              <Link href={item.href} passHref className="w-full">
                <Button className="w-full" size="lg">
                  {item.cta}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
             <CardHeader>
                 <div className="flex items-center gap-3 mb-2">
                    <Phone className="h-7 w-7 text-primary" />
                    <CardTitle>Soporte Técnico</CardTitle>
                </div>
                 <CardDescription>¿Necesita ayuda? Nuestro equipo está listo para asistirlo.</CardDescription>
             </CardHeader>
             <CardContent>
                 <Button>Solicitar Soporte</Button>
             </CardContent>
          </Card>
          <Card>
            <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                    <HelpCircle className="h-7 w-7 text-primary" />
                    <CardTitle>¿Qué es un Análisis de Causa Raíz?</CardTitle>
                </div>
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
