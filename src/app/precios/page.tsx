
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, DollarSign } from 'lucide-react'; // Added DollarSign
import Link from 'next/link';

const plans = [
  {
    name: 'Básico',
    price: '$9.990',
    period: '/mes (CLP)',
    description: 'Ideal para individuos o equipos pequeños que inician con RCA.',
    features: [
      'Hasta 3 análisis RCA al mes',
      'Acceso a la técnica "5 Porqués"',
      '1 usuario',
      'Soporte comunitario',
    ],
    cta: 'Comenzar Ahora', // Changed from "Comenzar Gratis"
    href: '/analisis',
  },
  {
    name: 'Profesional',
    price: '$29.000',
    period: '/mes (CLP)',
    description: 'Perfecto para equipos en crecimiento y uso regular de RCA.',
    features: [
      'Hasta 25 análisis RCA al mes',
      'Todas las técnicas de análisis (5 Porqués, Ishikawa, CTM)',
      'Hasta 10 usuarios',
      'Exportación de informes avanzada',
      'Soporte técnico por email',
    ],
    cta: 'Elegir Profesional',
    href: '#',
    highlighted: true,
    badge: 'Más Popular',
  },
  {
    name: 'Empresa',
    price: '$99.000',
    period: '/mes (CLP)',
    description: 'Solución completa para organizaciones con necesidades complejas y a gran escala.',
    features: [
      'Análisis RCA ilimitados',
      'Todas las técnicas de análisis avanzadas',
      'Gestión avanzada de usuarios y roles',
      'Integraciones y API (Próximamente)',
      'Auditoría de cambios y seguridad mejorada',
      'Soporte prioritario dedicado y SLA',
    ],
    cta: 'Contactar Ventas',
    href: '#',
  },
];

export default function PreciosPage() {
  return (
    <div className="space-y-12 py-12">
      <header className="text-center space-y-3">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
          <DollarSign className="h-10 w-10" /> {/* Added Icon */}
        </div>
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
              <div className="flex justify-between items-start mb-1">
                <CardTitle className="text-2xl font-semibold text-primary">{plan.name}</CardTitle>
                {plan.badge && (
                  <span className="text-xs font-bold bg-accent text-accent-foreground px-2.5 py-1 rounded-full -mt-1">
                    {plan.badge}
                  </span>
                )}
              </div>
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
        <p>Todos los precios están en Pesos Chilenos (CLP). Pueden aplicarse impuestos adicionales.</p>
      </div>
    </div>
  );
}
