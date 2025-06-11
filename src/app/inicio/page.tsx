
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Home, BarChart3, FileText, SettingsIcon, Zap } from 'lucide-react';

export default function InicioPage() {
  return (
    <div className="space-y-8 py-8">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
          <Zap className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary">
          Bienvenido a RCA Assistant
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Su herramienta intuitiva y eficiente para realizar Análisis de Causa Raíz (RCA) y mejorar continuamente sus procesos.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="h-7 w-7 text-primary" />
              <CardTitle className="text-2xl">Análisis RCA</CardTitle>
            </div>
            <CardDescription>Inicie un nuevo análisis o continúe uno existente, siguiendo un proceso guiado paso a paso.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/analisis" passHref>
              <Button className="w-full" size="lg">
                Ir a Análisis
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-7 w-7 text-primary" />
              <CardTitle className="text-2xl">Informes</CardTitle>
            </div>
            <CardDescription>Visualice y gestione los informes de sus análisis completados. (Próximamente)</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/informes" passHref>
              <Button className="w-full" size="lg">
                Ver Informes
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <SettingsIcon className="h-7 w-7 text-primary" />
              <CardTitle className="text-2xl">Configuración</CardTitle>
            </div>
            <CardDescription>Ajuste las preferencias y configuraciones de la aplicación.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/config" passHref>
              <Button className="w-full" size="lg">
                Ir a Configuración
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mt-8 bg-secondary/30">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-primary mb-2">¿Qué es un Análisis de Causa Raíz?</h3>
          <p className="text-sm text-foreground">
            El Análisis de Causa Raíz (RCA) es un método sistemático para identificar las causas subyacentes de un problema o incidente. 
            En lugar de simplemente tratar los síntomas, el RCA busca encontrar el origen fundamental para implementar soluciones efectivas 
            y prevenir la recurrencia del problema. Esta herramienta le guiará a través de este proceso.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
