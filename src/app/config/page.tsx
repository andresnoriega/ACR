
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { SettingsIcon, Users, Globe, KeyRound, ShieldCheck } from 'lucide-react';

export default function ConfiguracionHubPage() {
  return (
    <div className="space-y-8 py-8">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
          <SettingsIcon className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary">
          Configuración General
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Administre los diferentes aspectos de RCA Assistant.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-7 w-7 text-primary" />
              <CardTitle className="text-2xl">Usuarios</CardTitle>
            </div>
            <CardDescription>Gestione los usuarios del sistema, sus roles y accesos.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/config/usuarios" passHref>
              <Button className="w-full" size="lg">
                Configurar Usuarios
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Globe className="h-7 w-7 text-primary" />
              <CardTitle className="text-2xl">Sitios/Plantas</CardTitle>
            </div>
            <CardDescription>Administre los sitios, plantas o áreas de su organización.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/config/sitios" passHref>
              <Button className="w-full" size="lg">
                Configurar Sitios
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <KeyRound className="h-7 w-7 text-primary" />
              <CardTitle className="text-2xl">Permisos</CardTitle>
            </div>
            <CardDescription>Defina roles y gestione los permisos detallados del sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/config/permisos" passHref>
              <Button className="w-full" size="lg">
                Configurar Permisos
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 md:col-span-2 lg:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="h-7 w-7 text-primary" />
              <CardTitle className="text-2xl">Privacidad y Datos</CardTitle>
            </div>
            <CardDescription>Gestione el almacenamiento de datos, opciones de reseteo y configuraciones de privacidad.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/config/privacidad" passHref>
              <Button className="w-full" size="lg">
                Gestionar Datos
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mt-8 bg-secondary/30">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-primary mb-2">Mantenimiento del Sistema</h3>
          <p className="text-sm text-foreground">
            Desde esta sección puede ajustar los parámetros fundamentales de la aplicación para adaptarla a las necesidades de su organización. 
            Asegúrese de que los cambios realizados sean consistentes con sus políticas internas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
