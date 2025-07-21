
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DollarSign, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Plan Data with Tiered Pricing ---

const plansData = {
  monthly: [
    {
      name: 'Básico',
      price: 'UF 0,25',
      priceSuffix: '/mes',
      userRange: '1 Usuario',
      description: 'Ideal para freelancers y uso individual intensivo.',
      features: [
        'Análisis Ilimitados',
        'Soporte estándar por email',
        'Asistencia IA básica',
      ],
      isPopular: false,
      cta: 'Elegir Plan Básico',
    },
    {
      name: 'Profesional',
      price: 'UF 0,9',
      priceSuffix: '/mes por usuario',
      userRange: '2-5 Usuarios',
      description: 'Para profesionales y equipos pequeños que necesitan más.',
      features: [
        'Análisis Ilimitados',
        'Roles y Permisos',
        'Soporte prioritario por email',
        'Asistencia IA completa',
      ],
      isPopular: true,
      cta: 'Elegir Plan Profesional',
    },
    {
      name: 'Negocio',
      price: 'UF 0,8',
      priceSuffix: '/mes por usuario',
      userRange: '6-20 Usuarios',
      description: 'La mejor opción para equipos en crecimiento y Pymes.',
      features: [
        'Todo lo de Profesional',
        'SSO y Seguridad Avanzada',
        'Onboarding asistido',
        'Dashboard de Métricas Avanzado',
      ],
      isPopular: false,
      cta: 'Elegir Plan Negocio',
    },
    {
      name: 'Corporativo',
      price: 'Custom',
      priceSuffix: '',
      userRange: '21+ Usuarios',
      description: 'Solución a medida para grandes organizaciones.',
      features: [
        'Todo lo de Negocio',
        'Soporte Dedicado (SLA)',
        'Integraciones Personalizadas',
        'Gestor de cuenta asignado',
      ],
      isPopular: false,
      cta: 'Contactar a Ventas',
    },
  ],
  annually: [
    {
      name: 'Básico',
      price: 'UF 2,5',
      priceSuffix: '/año',
      userRange: '1 Usuario',
      description: 'Ahorra con el plan anual.',
      features: [
        'Análisis Ilimitados',
        'Soporte estándar por email',
        'Asistencia IA básica',
      ],
      isPopular: false,
      cta: 'Elegir Plan Básico',
    },
    {
      name: 'Profesional',
      price: 'UF 9',
      priceSuffix: '/año por usuario',
      userRange: '2-5 Usuarios',
      description: 'Ahorra con el plan anual.',
      features: [
        'Análisis Ilimitados',
        'Roles y Permisos',
        'Soporte prioritario por email',
        'Asistencia IA completa',
      ],
      isPopular: true,
      cta: 'Elegir Plan Profesional',
    },
    {
      name: 'Negocio',
      price: 'UF 8',
      priceSuffix: '/año por usuario',
      userRange: '6-20 Usuarios',
      description: 'Ahorra con el plan anual.',
      features: [
        'Todo lo de Profesional',
        'SSO y Seguridad Avanzada',
        'Onboarding asistido',
        'Dashboard de Métricas Avanzado',
      ],
      isPopular: false,
      cta: 'Elegir Plan Negocio',
    },
    {
      name: 'Corporativo',
      price: 'Custom',
      priceSuffix: '',
      userRange: '21+ Usuarios',
      description: 'Solución a medida para grandes organizaciones.',
      features: [
        'Todo lo de Negocio',
        'Soporte Dedicado (SLA)',
        'Integraciones Personalizadas',
        'Gestor de cuenta asignado',
      ],
      isPopular: false,
      cta: 'Contactar a Ventas',
    },
  ],
};


// --- Component ---

export default function SuscripcionesPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly');

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
          Encuentre el plan que mejor se adapte al tamaño y necesidades de su equipo.
        </p>
      </header>
      
      <div className="flex justify-center items-center space-x-4">
        <Label htmlFor="billing-cycle-switch" className={cn(billingCycle === 'monthly' ? 'text-primary font-semibold' : 'text-muted-foreground')}>
          Facturación Mensual
        </Label>
        <Switch
          id="billing-cycle-switch"
          checked={billingCycle === 'annually'}
          onCheckedChange={(checked) => setBillingCycle(checked ? 'annually' : 'monthly')}
        />
        <Label htmlFor="billing-cycle-switch" className={cn(billingCycle === 'annually' ? 'text-primary font-semibold' : 'text-muted-foreground')}>
          Facturación Anual (Ahorra)
        </Label>
      </div>
      
       <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {plansData[billingCycle].map((plan, index) => (
              <Card key={index} className={cn(
                "shadow-md flex flex-col",
                plan.isPopular && "border-primary ring-2 ring-primary"
              )}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>{plan.name}</CardTitle>
                    {plan.isPopular && <span className="text-xs font-semibold bg-accent text-accent-foreground px-2 py-0.5 rounded-full">Más Popular</span>}
                  </div>
                  <p className="text-sm font-semibold text-primary">{plan.userRange}</p>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex-grow">
                  <div className="text-left">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.priceSuffix && <span className="text-muted-foreground"> {plan.priceSuffix}</span>}
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant={plan.isPopular ? 'default' : 'outline'} className="w-full">
                    {plan.cta}
                  </Button>
                </CardFooter>
              </Card>
            ))}
        </div>
      
       <Card className="max-w-7xl mx-auto bg-secondary/30 mt-12">
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
