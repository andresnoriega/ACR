
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, CheckCircle, Users, Building, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Plan Data ---

const individualPlans = {
  monthly: [
    {
      name: 'Básico',
      price: '$0',
      priceSuffix: '/mes',
      description: 'Ideal para probar y uso personal.',
      features: ['1 Usuario', '5 Análisis/mes', 'Soporte por comunidad'],
      isCurrent: false,
      isPopular: false,
      cta: 'Empezar Gratis',
    },
    {
      name: 'Profesional',
      price: '$29',
      priceSuffix: '/mes',
      description: 'Para equipos pequeños que necesitan más potencia.',
      features: ['Hasta 5 Usuarios', 'Análisis Ilimitados', 'Roles y Permisos', 'Soporte prioritario'],
      isCurrent: true, // Example current plan
      isPopular: true,
      cta: 'Actualizar Plan',
    },
  ],
  annually: [
    {
      name: 'Básico',
      price: '$0',
      priceSuffix: '/año',
      description: 'Ideal para probar y uso personal.',
      features: ['1 Usuario', '5 Análisis/mes', 'Soporte por comunidad'],
      isCurrent: false,
      isPopular: false,
      cta: 'Empezar Gratis',
    },
    {
      name: 'Profesional',
      price: '$290',
      priceSuffix: '/año',
      description: 'Ahorra ~17% con el plan anual.',
      features: ['Hasta 5 Usuarios', 'Análisis Ilimitados', 'Roles y Permisos', 'Soporte prioritario'],
      isCurrent: true,
      isPopular: true,
      cta: 'Actualizar Plan',
    },
  ],
};

const enterprisePlan = {
  pricing: {
    monthlyPerUser: 5,
    annualPerUser: 50,
  },
  features: [
    'Todo lo del plan Profesional',
    'Usuarios escalables (5+)',
    'Soporte Dedicado (SLA)',
    'Onboarding Personalizado',
    'SSO y Seguridad Avanzada',
  ],
  minUsers: 5,
  maxUsers: 100,
};


// --- Component ---

export default function SuscripcionesPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly');
  const [numberOfUsers, setNumberOfUsers] = useState(10);

  const enterprisePrice = billingCycle === 'monthly'
    ? numberOfUsers * enterprisePlan.pricing.monthlyPerUser
    : numberOfUsers * enterprisePlan.pricing.annualPerUser;

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
          Encuentre el plan que mejor se adapte a sus necesidades.
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
      
      <Tabs defaultValue="empresa" className="w-full max-w-5xl mx-auto">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="empresa" className="flex items-center gap-2"><Building className="h-4 w-4" /> Para Empresas</TabsTrigger>
          <TabsTrigger value="individual" className="flex items-center gap-2"><Users className="h-4 w-4" /> Para Individuos y Equipos Pequeños</TabsTrigger>
        </TabsList>
        
        <TabsContent value="empresa" className="mt-6">
          <Card className="shadow-lg border-primary ring-2 ring-primary/50">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Plan Empresarial</CardTitle>
              <CardDescription>La solución completa y escalable para su organización.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="px-4">
                <div className="flex justify-between items-center mb-2">
                    <Label htmlFor="user-slider" className="flex items-center gap-2"><Users className="h-5 w-5" /> Número de Usuarios:</Label>
                    <span className="text-lg font-bold">{numberOfUsers}</span>
                </div>
                <Slider
                  id="user-slider"
                  value={[numberOfUsers]}
                  onValueChange={(value) => setNumberOfUsers(value[0])}
                  min={enterprisePlan.minUsers}
                  max={enterprisePlan.maxUsers}
                  step={1}
                />
              </div>
              
              <div className="text-center mt-4">
                <p className="text-5xl font-bold">${enterprisePrice}</p>
                <p className="text-muted-foreground">{billingCycle === 'monthly' ? '/mes' : '/año'}</p>
              </div>

              <ul className="space-y-2 text-sm text-muted-foreground grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pt-4">
                {enterprisePlan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center">
                    <Star className="h-4 w-4 mr-2 text-yellow-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button size="lg" className="w-full">
                Contactar a Ventas
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="individual" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {individualPlans[billingCycle].map((plan, index) => (
              <Card key={index} className={cn(
                "shadow-md flex flex-col",
                plan.isPopular && "border-primary ring-2 ring-primary"
              )}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex-grow">
                  <div className="text-left">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.priceSuffix && <span className="text-muted-foreground">{plan.priceSuffix}</span>}
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant={plan.isCurrent ? 'outline' : 'default'} className="w-full" disabled={plan.isCurrent}>
                    {plan.isCurrent ? 'Plan Actual' : plan.cta}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
      
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
