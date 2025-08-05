'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Bot, BarChart3, ListOrdered, ShieldCheck, SlidersHorizontal, GitFork, Zap, Workflow, Search, CheckSquare, LineChart, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon: Icon }) => {
    return (
        <Card className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 bg-card/50 hover:bg-card">
            <CardHeader className="flex-row items-center gap-4 space-y-0 pb-2">
                 <div className="flex items-center justify-center h-12 w-12 bg-primary/10 text-primary rounded-full">
                    <Icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );
};


export default function InicioPage() {
    const { userProfile, currentUser, loadingAuth } = useAuth();
    const router = useRouter();
    
    const featureItems = [
        { 
            title: 'Flujo de Trabajo Guiado', 
            description: 'Siga un proceso estandarizado de 5 pasos para realizar análisis de causa raíz robustos y consistentes, desde la iniciación hasta la validación de resultados.', 
            icon: Workflow 
        },
        { 
            title: 'Asistente con IA', 
            description: 'Aproveche la inteligencia artificial para parafrasear descripciones, sugerir causas raíz latentes y generar borradores de informes ejecutivos.', 
            icon: Bot 
        },
        { 
            title: 'Gestión Centralizada', 
            description: 'Administre todas sus tareas, planes de acción y evidencias en un único lugar, con notificaciones automáticas para mantener a su equipo alineado.', 
            icon: CheckSquare 
        },
        { 
            title: 'Informes y Métricas', 
            description: 'Visualice el estado de sus análisis con dashboards interactivos. Exporte informes detallados en PDF y resúmenes de datos a Excel.', 
            icon: LineChart 
        },
        { 
            title: 'Administración y Seguridad', 
            description: 'Gestione usuarios, empresas y sitios con un sistema de roles y permisos flexible, asegurando la integridad y confidencialidad de sus datos.', 
            icon: Users 
        },
         { 
            title: 'Análisis Personalizable', 
            description: 'Elija entre múltiples técnicas de análisis como Ishikawa, 5 Porqués y Árbol de Causas (CTM) para adaptarse a la complejidad de cada evento.', 
            icon: GitFork
        },
    ];

    return (
        <div className="space-y-12 py-8">
            <header className="text-center space-y-4">
                <div className="inline-block bg-primary/10 text-primary p-3 rounded-full mb-2">
                    <Zap className="h-10 w-10" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">
                   Transforme sus Análisis de Causa Raíz con Asistente ACR
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                    Una plataforma intuitiva y potente diseñada para estandarizar sus investigaciones, potenciar la colaboración y prevenir la recurrencia de incidentes.
                </p>
                <div className="pt-4">
                    <Button size="lg" onClick={() => router.push(currentUser ? '/eventos' : '/login')}>
                        {currentUser ? 'Ir a la Aplicación' : 'Comenzar ahora'}
                        <Zap className="ml-2 h-5 w-5" />
                    </Button>
                </div>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featureItems.map(item => (
                    <FeatureCard 
                        key={item.title}
                        {...item}
                    />
                ))}
            </div>

            <Card className="bg-secondary/30">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">¿Listo para mejorar sus procesos?</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="text-muted-foreground mb-4">
                        Únase a los equipos que ya están utilizando Asistente ACR para tomar decisiones basadas en datos y construir una cultura de mejora continua.
                    </p>
                     <Button size="lg" variant="secondary" onClick={() => router.push('/registro')}>
                        Regístrese Gratis
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}