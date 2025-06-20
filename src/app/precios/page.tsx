
'use client';

import { useState } from 'react'; // Added useState
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, DollarSign, Loader2, Mail } from 'lucide-react'; // Added DollarSign, Loader2, Mail
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose, // Added DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { sendEmailAction } from '@/app/actions';

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
    cta: 'Comenzar Ahora',
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
    href: '#', // Placeholder, as this plan might also need a contact form or purchase flow
    highlighted: true,
    badge: 'Más Popular',
  },
  {
    name: 'Empresa',
    price: 'Contáctanos', // Updated price
    period: '', // Updated period
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
    // href will be handled by onClick to open dialog
  },
];

export default function PreciosPage() {
  const { toast } = useToast();
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSendingContact, setIsSendingContact] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      toast({
        title: "Campos Requeridos",
        description: "Por favor, complete Nombre, Correo y Mensaje.",
        variant: "destructive",
      });
      return;
    }
    if (!/\S+@\S+\.\S+$/.test(contactEmail)) {
      toast({
        title: "Correo Inválido",
        description: "Por favor, ingrese un correo electrónico válido.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingContact(true);
    const emailSubject = 'Solicitud de Información - Plan Empresa RCA Assistant';
    const emailBody = `
Nueva solicitud de información para el Plan Empresa (RCA Assistant):

Nombre: ${contactName}
Correo: ${contactEmail}
Teléfono: ${contactPhone || 'No proporcionado'}

Mensaje:
${contactMessage}
    `;

    // Send to primary contact
    const resultPrimary = await sendEmailAction({
      to: 'contacto@damc.cl',
      subject: emailSubject,
      body: emailBody,
    });

    // Send to secondary contact
    const resultSecondary = await sendEmailAction({
      to: 'andres_noriega_1@hotmail.com',
      subject: emailSubject,
      body: emailBody,
    });

    if (resultPrimary.success && resultSecondary.success) {
      toast({
        title: "Solicitud Enviada",
        description: "Gracias por su interés. Nos pondremos en contacto con usted pronto. La solicitud ha sido enviada a ambos destinatarios.",
      });
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      setContactMessage('');
      setIsContactDialogOpen(false);
    } else {
      let errorMessages = [];
      if (!resultPrimary.success) {
        errorMessages.push(`Falló envío a contacto@damc.cl: ${resultPrimary.message}`);
      }
      if (!resultSecondary.success) {
        errorMessages.push(`Falló envío a andres_noriega_1@hotmail.com: ${resultSecondary.message}`);
      }
      toast({
        title: "Error al Enviar Solicitud",
        description: `No se pudo enviar su solicitud a todos los destinatarios. Detalles: ${errorMessages.join('; ')}`,
        variant: "destructive",
        duration: 7000,
      });
    }
    setIsSendingContact(false);
  };


  return (
    <div className="space-y-12 py-12">
      <header className="text-center space-y-3">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
          <DollarSign className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary">
          Planes Flexibles para Cada Necesidad
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Elija el plan de RCA Assistant que mejor se adapte al tamaño y los requisitos de su equipo. Todos los precios están en Pesos Chilenos (CLP).
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
                {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
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
              {plan.name === 'Empresa' ? (
                <Button
                  onClick={() => setIsContactDialogOpen(true)}
                  className={`w-full ${plan.highlighted ? '' : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'}`}
                  size="lg"
                >
                  {plan.cta}
                </Button>
              ) : (
                <Button
                  asChild
                  className={`w-full ${plan.highlighted ? '' : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'}`}
                  size="lg"
                >
                  <Link href={plan.href || '#'}>{plan.cta}</Link>
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center"><Mail className="mr-2 h-5 w-5 text-primary"/>Contactar para Plan Empresa</DialogTitle>
            <DialogDescription>
              Por favor, complete el siguiente formulario y nos pondremos en contacto con usted a la brevedad.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleContactSubmit} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="contact-name">Nombre Completo <span className="text-destructive">*</span></Label>
              <Input
                id="contact-name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Su nombre"
                required
                disabled={isSendingContact}
              />
            </div>
            <div>
              <Label htmlFor="contact-email">Correo Electrónico <span className="text-destructive">*</span></Label>
              <Input
                id="contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="su@correo.com"
                required
                disabled={isSendingContact}
              />
            </div>
            <div>
              <Label htmlFor="contact-phone">Teléfono (Opcional)</Label>
              <Input
                id="contact-phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Ej: +56 9 XXXX XXXX"
                disabled={isSendingContact}
              />
            </div>
            <div>
              <Label htmlFor="contact-message">Mensaje <span className="text-destructive">*</span></Label>
              <Textarea
                id="contact-message"
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Indique sus necesidades o consultas..."
                rows={4}
                required
                disabled={isSendingContact}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSendingContact}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSendingContact}>
                {isSendingContact ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Enviar Solicitud
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>


      <div className="text-center text-muted-foreground text-sm mt-10">
        <p>¿Necesita una solución personalizada o tiene preguntas? <Link href="#" className="text-primary hover:underline" onClick={() => setIsContactDialogOpen(true)}>Contáctenos</Link>.</p>
        <p>Todos los precios están en Pesos Chilenos (CLP). Pueden aplicarse impuestos adicionales.</p>
      </div>
    </div>
  );
}

