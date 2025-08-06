'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Home as HomeIcon } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-8 py-8">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
          <HomeIcon className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary">
          Home
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Bienvenido. Esta es la nueva página de inicio.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Página en Construcción</CardTitle>
          <CardDescription>
            Este es un espacio de prueba para solucionar los problemas de renderizado en producción.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Si puede ver esta página después de iniciar sesión, hemos confirmado que la nueva ruta funciona correctamente.</p>
        </CardContent>
      </Card>
    </div>
  );
}
