
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    name: 'Básico',
    price: '$0',
    period: '/mes (Limitado)',
    description: 'Ideal para individuos o pruebas iniciales.',
    features: [
      'Hasta 3 análisis RCA al mes',
      'Acceso a la técnica "5 Porqués"',
      '1 usuario',
      'Soporte comunitario',
    ],
    cta: 'Comenzar Gratis',
    href: '/analisis', // Placeholder, podría ser /registro
  },
  {
    name: 'Profesional',
    price: '$29',
    period: '/mes',
    description: 'Para equipos en crecimiento y uso regular.',
    features: [
      'Hasta 25 análisis RCA al mes',
      'Todas las técnicas de análisis (5 Porqués, Ishikawa, CTM)',
      'Hasta 5 usuarios',
      'Exportación de informes avanzada',
      'Soporte por email',
    ],
    cta: 'Elegir Profesional',
    href: '#', // Placeholder
    highlighted: true,
  },
  {
    name: 'Empresa',
    price: '$99',
    period: '/mes',
    description: 'Para organizaciones grandes con necesidades complejas.',
    features: [
      'Análisis RCA ilimitados',
      'Todas las técnicas de análisis',
      'Usuarios ilimitados y roles avanzados',
      'Auditoría de cambios',
      'Soporte prioritario y SLA',
    ],
    cta: 'Contactar Ventas',
    href: '#', // Placeholder
  },
];

export default function PreciosPage() {
  return (
    <div className="space-y-12 py-12">
      <header className="text-center space-y-3">
        <h1 className="text-4xl font-bold font-headline text-primary">
          Planes Flexibles para Cada Necesidad
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Elija el plan de RCA Assistant que mejor se adapte al tamaño y los requisitos de su equipo.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`flex flex-col shadow-xl hover:shadow-2xl transition-shadow duration-300 ${
              plan.highlighted ? 'border-primary border-2 ring-4 ring-primary/20' : ''
            }`}
          >
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-semibold text-primary">{plan.name}</CardTitle>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <CardDescription className="pt-1 min-h-[40px]">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
              <ul className="space-y-2.5">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-accent mr-2 mt-0.5 shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="mt-auto pt-6">
              <Button
                asChild
                className={`w-full ${plan.highlighted ? '' : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'}`}
                size="lg"
              >
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="text-center text-muted-foreground text-sm mt-10">
        <p>¿Necesita una solución personalizada o tiene preguntas? <Link href="#" className="text-primary hover:underline">Contáctenos</Link>.</p>
        <p>Todos los precios están en USD. Pueden aplicarse impuestos adicionales.</p>
      </div>
    </div>
  );
}
