
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, CheckCircle, Star } from 'lucide-react';

export default function SuscripcionesPage() {
  return (
    <div className="space-y-8 py-8">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
          <DollarSign className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary">
          Planes y Suscripción
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Consulte los detalles de su plan actual y las opciones disponibles.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {/* Free Plan Card */}
        <Card className="shadow-md">
          <CardHeader className="text-center">
            <CardTitle>Plan Básico</CardTitle>
            <CardDescription>Ideal para empezar y equipos pequeños.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-muted-foreground">/mes</span>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-green-500" /> 10 Usuarios</li>
              <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-green-500" /> 50 Análisis/mes</li>
              <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Soporte por comunidad</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" disabled>
              Plan Actual
            </Button>
          </CardFooter>
        </Card>

        {/* Pro Plan Card */}
        <Card className="shadow-lg border-primary ring-2 ring-primary relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="bg-primary text-primary-foreground px-3 py-1 text-sm font-semibold rounded-full">
              Más Popular
            </div>
          </div>
          <CardHeader className="text-center pt-8">
            <CardTitle>Plan Profesional</CardTitle>
            <CardDescription>Para empresas en crecimiento con mayores necesidades.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <span className="text-4xl font-bold">$49</span>
              <span className="text-muted-foreground">/mes</span>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Usuarios Ilimitados</li>
              <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Análisis Ilimitados</li>
              <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Roles y Permisos Avanzados</li>
              <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Soporte prioritario por email</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full">
              Actualizar a Profesional
            </Button>
          </CardFooter>
        </Card>
        
        {/* Enterprise Plan Card */}
        <Card className="shadow-md">
          <CardHeader className="text-center">
            <CardTitle>Empresarial</CardTitle>
            <CardDescription>Soluciones a medida para grandes corporaciones.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <span className="text-4xl font-bold">Contacto</span>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center"><Star className="h-4 w-4 mr-2 text-yellow-500" /> Todo lo del plan Profesional</li>
              <li className="flex items-center"><Star className="h-4 w-4 mr-2 text-yellow-500" /> Soporte Dedicado (SLA)</li>
              <li className="flex items-center"><Star className="h-4 w-4 mr-2 text-yellow-500" /> Onboarding Personalizado</li>
              <li className="flex items-center"><Star className="h-4 w-4 mr-2 text-yellow-500" /> SSO y Seguridad Avanzada</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">
              Contactar a Ventas
            </Button>
          </CardFooter>
        </Card>
      </div>

       <Card className="max-w-5xl mx-auto bg-secondary/30 mt-12">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-primary mb-2">Gestión de Suscripción</h3>
            <p className="text-sm text-foreground">
              Actualmente, la gestión de suscripciones y facturación no está integrada directamente en esta interfaz.
              Para cualquier cambio en su plan o para consultar detalles de facturación, por favor, contacte a nuestro equipo de soporte.
            </p>
          </CardContent>
        </Card>
    </div>
  );
}
