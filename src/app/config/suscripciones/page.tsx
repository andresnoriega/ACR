'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DollarSign, CheckCircle, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const plans = {
  monthly: [
    {
      name: 'Plan Básico',
      price: '$19',
      priceSuffix: '/mes',
      description: 'Ideal para empezar y equipos pequeños.',
      features: ['10 Usuarios', '50 Análisis/mes', 'Soporte por comunidad'],
      isCurrent: true,
      isPopular: false,
    },
    {
      name: 'Plan Profesional',
      price: '$49',
      priceSuffix: '/mes',
      description: 'Para empresas en crecimiento con mayores necesidades.',
      features: ['Usuarios Ilimitados', 'Análisis Ilimitados', 'Roles y Permisos Avanzados', 'Soporte prioritario por email'],
      isCurrent: false,
      isPopular: true,
    },
    {
      name: 'Empresarial',
      price: 'Contacto',
      priceSuffix: '',
      description: 'Soluciones a medida para grandes corporaciones.',
      features: ['Todo lo del plan Profesional', 'Soporte Dedicado (SLA)', 'Onboarding Personalizado', 'SSO y Seguridad Avanzada'],
      isCurrent: false,
      isPopular: false,
    },
  ],
  annually: [
    {
      name: 'Plan Básico',
      price: '$190',
      priceSuffix: '/año',
      description: 'Ahorra con el plan anual.',
      features: ['10 Usuarios', '50 Análisis/mes', 'Soporte por comunidad'],
      isCurrent: true,
      isPopular: false,
    },
    {
      name: 'Plan Profesional',
      price: '$490',
      priceSuffix: '/año',
      description: 'Ahorra con el plan anual.',
      features: ['Usuarios Ilimitados', 'Análisis Ilimitados', 'Roles y Permisos Avanzados', 'Soporte prioritario por email'],
      isCurrent: false,
      isPopular: true,
    },
    {
      name: 'Empresarial',
      price: 'Contacto',
      priceSuffix: '',
      description: 'Soluciones a medida para grandes corporaciones.',
      features: ['Todo lo del plan Profesional', 'Soporte Dedicado (SLA)', 'Onboarding Personalizado', 'SSO y Seguridad Avanzada'],
      isCurrent: false,
      isPopular: false,
    },
  ]
};

export default function SuscripcionesPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly');

  const currentPlans = plans[billingCycle];

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
          Facturación Anual (Ahorra ~17%)
        </Label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {currentPlans.map((plan, index) => (
          <Card key={index} className={cn(
            "shadow-md flex flex-col",
            plan.isPopular && "border-primary ring-2 ring-primary relative"
          )}>
            {plan.isPopular && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="bg-primary text-primary-foreground px-3 py-1 text-sm font-semibold rounded-full">
                  Más Popular
                </div>
              </div>
            )}
            <CardHeader className="text-center pt-8">
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-grow">
              <div className="text-center">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.priceSuffix && <span className="text-muted-foreground">{plan.priceSuffix}</span>}
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center">
                    {plan.name === 'Empresarial' ? (
                      <Star className="h-4 w-4 mr-2 text-yellow-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    )}
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {plan.name === 'Empresarial' ? (
                 <Button variant="outline" className="w-full">
                    Contactar a Ventas
                  </Button>
              ) : plan.isCurrent ? (
                <Button variant="outline" className="w-full" disabled>
                  Plan Actual
                </Button>
              ) : (
                <Button className="w-full">
                  Actualizar a {plan.name.split(' ')[1]}
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
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
