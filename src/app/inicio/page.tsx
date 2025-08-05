
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BarChart3, ListOrdered, FileText, UserCheck, UserCircle, Settings, HelpCircle, LifeBuoy } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ActionCardProps {
  title: string;
  description: string;
  buttonText: string;
  href: string;
  icon: React.ElementType;
  userRole?: string | null;
  allowedRoles?: string[];
}

const ActionCard: React.FC<ActionCardProps> = ({ title, description, buttonText, href, icon: Icon, userRole, allowedRoles }) => {
    const router = useRouter();

    const isVisible = !allowedRoles || (userRole && allowedRoles.includes(userRole));

    if (!isVisible) {
        return null;
    }

    return (
        <Card className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                    <Icon className="h-7 w-7 text-primary" />
                    <CardTitle className="text-2xl">{title}</CardTitle>
                </div>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex items-end">
                <Button onClick={() => router.push(href)} className="w-full" size="lg">
                    {buttonText}
                </Button>
            </CardContent>
        </Card>
    );
};


export default function InicioPage() {
    const { userProfile } = useAuth();
    const router = useRouter();
    
    const menuItems = [
        { title: 'Reporta y Analiza', description: 'Inicie un nuevo análisis o continúe uno existente, siguiendo un proceso guiado paso a paso.', buttonText: 'Ir a Análisis', href: '/analisis', icon: BarChart3, allowedRoles: ['Admin', 'Analista', 'Super User'] },
        { title: 'Eventos Reportados', description: 'Visualice y gestione todos los eventos reportados y pendientes de análisis.', buttonText: 'Ver Eventos', href: '/eventos', icon: ListOrdered, allowedRoles: ['Admin', 'Analista', 'Revisor', 'Super User'] },
        { title: 'Informes', description: 'Visualice y gestione los informes de sus análisis completados.', buttonText: 'Ver Informes', href: '/informes', icon: FileText, allowedRoles: ['Admin', 'Analista', 'Revisor', 'Super User'] },
        { title: 'Mis Tareas', description: 'Gestione sus planes de acción y tareas asignadas.', buttonText: 'Ir a Mis Tareas', href: '/usuario/planes', icon: UserCheck, allowedRoles: ['Admin', 'Analista', 'Revisor', 'Super User'] },
        { title: 'Mi Perfil', description: 'Gestiona tu información personal y de seguridad.', buttonText: 'Ir a Mi Perfil', href: '/usuario/perfil', icon: UserCircle, allowedRoles: ['Admin', 'Analista', 'Revisor', 'Super User', 'Usuario Pendiente'] },
        { title: 'Configuración', description: 'Ajuste las preferencias y configuraciones de la aplicación.', buttonText: 'Ir a Configuración', href: '/config', icon: Settings, allowedRoles: ['Admin', 'Super User'] },
    ];

    return (
        <div className="space-y-8 py-8">
            <header className="text-center space-y-2">
                <h1 className="text-4xl font-bold font-headline text-primary">
                   Bienvenido a Asistente ACR, {userProfile?.name || 'Usuario'}!
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Su herramienta intuitiva y eficiente para realizar Análisis de Causa Raíz (ACR) y mejorar continuamente sus procesos.
                </p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {menuItems.map(item => (
                    <ActionCard 
                        key={item.title}
                        {...item}
                        userRole={userProfile?.role}
                    />
                ))}
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <LifeBuoy className="h-7 w-7 text-primary" />
                        <CardTitle className="text-2xl">Soporte Técnico</CardTitle>
                    </div>
                    <CardDescription>¿Necesita ayuda? Nuestro equipo está listo para asistirlo.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => router.push('/instructivo')} className="w-full sm:w-auto" size="lg">
                        Solicitar Soporte
                    </Button>
                </CardContent>
            </Card>

            <Card className="bg-secondary/30">
                <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <HelpCircle className="h-7 w-7 text-primary" />
                        <CardTitle className="text-2xl">¿Qué es un Análisis de Causa Raíz?</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-foreground">
                       El Análisis de Causa Raíz (ACR) es un método sistemático para identificar las causas subyacentes de un problema o incidente. En lugar de simplemente tratar los síntomas, el ACR busca encontrar el origen fundamental para implementar soluciones efectivas y prevenir la recurrencia del problema. Esta herramienta le guiará a través de este proceso.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
