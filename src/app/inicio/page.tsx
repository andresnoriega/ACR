'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, BarChart3, Bot, ListOrdered } from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) => (
    <Card className="text-center shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="items-center">
            <div className="p-3 bg-primary/10 rounded-full w-fit">
                <Icon className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground text-sm">{description}</p>
        </CardContent>
    </Card>
);

export default function InicioPage() {
    return (
        <div className="w-full">
            <section className="text-center py-20 lg:py-32">
                <div className="container mx-auto px-4">
                    <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4 font-headline">
                        Simplifica tu Análisis de Causa Raíz (ACR)
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                        Asistente ACR es una herramienta intuitiva que te guía para identificar el origen de los problemas, definir acciones efectivas y prevenir su recurrencia, potenciando la mejora continua en tu organización.
                    </p>
                    <Link href="/login" passHref>
                        <Button size="lg">
                            Comienza Ahora <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </Link>
                </div>
            </section>

            <section className="py-16 bg-muted/40">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold">Funcionalidades Clave</h2>
                        <p className="text-muted-foreground">Descubre cómo Asistente ACR potencia tus análisis.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={BarChart3}
                            title="Análisis Guiado en 5 Pasos"
                            description="Sigue un flujo de trabajo estructurado, desde la iniciación del evento hasta la validación de resultados, asegurando un análisis completo y consistente."
                        />
                        <FeatureCard
                            icon={Bot}
                            title="Asistencia con IA"
                            description="Obtén sugerencias de causas raíz latentes y genera borradores de resúmenes ejecutivos para comunicar tus hallazgos de forma efectiva."
                        />
                        <FeatureCard
                            icon={ListOrdered}
                            title="Gestión de Planes de Acción"
                            description="Define, asigna y da seguimiento a las acciones correctivas, asegurando que cada causa raíz sea abordada y validada adecuadamente."
                        />
                    </div>
                </div>
            </section>
        </div>
    );
}
