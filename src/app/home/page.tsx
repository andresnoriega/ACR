
'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart3, ListOrdered, FileText, UserCheck, UserCircle, Phone, HelpCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { sendEmailAction } from '@/app/actions';


const FeatureCard = ({ icon: Icon, title, description, href, buttonText, allowedRoles }: { icon: React.ElementType, title: string, description: string, href: string, buttonText: string, allowedRoles?: string[] }) => {
  const { userProfile } = useAuth();

  const isVisible = !allowedRoles || (userProfile && allowedRoles.includes(userProfile.role));

  if (!isVisible) {
    return null;
  }

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Icon className="h-6 w-6 text-primary" />
          <span className="text-xl">{title}</span>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto">
        <Link href={href} passHref className="w-full">
          <Button className="w-full">
            {buttonText} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};


export default function HomePage() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [isSupportDialogOpen, setIsSupportDialogOpen] = useState(false);
  const [supportName, setSupportName] = useState(userProfile?.name || '');
  const [supportEmail, setSupportEmail] = useState(userProfile?.email || '');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSendingSupport, setIsSendingSupport] = useState(false);

  const menuItems = [
    {
      icon: BarChart3,
      title: 'Reporta y Analiza',
      description: 'Inicie un nuevo análisis o continúe uno existente, siguiendo un proceso guiado paso a paso.',
      href: '/analisis',
      buttonText: 'Ir a Análisis',
      allowedRoles: ['Admin', 'Analista', 'Super User']
    },
    {
      icon: ListOrdered,
      title: 'Eventos Reportados',
      description: 'Visualice y gestione todos los eventos reportados y pendientes de análisis.',
      href: '/eventos',
      buttonText: 'Ver Eventos',
      allowedRoles: ['Admin', 'Analista', 'Revisor', 'Super User']
    },
    {
      icon: FileText,
      title: 'Informes',
      description: 'Visualice y gestione los informes de sus análisis completados.',
      href: '/informes',
      buttonText: 'Ver Informes',
       allowedRoles: ['Admin', 'Analista', 'Revisor', 'Super User']
    },
    {
      icon: UserCheck,
      title: 'Mis Tareas',
      description: 'Gestione sus planes de acción y tareas asignadas.',
      href: '/usuario/planes',
      buttonText: 'Ir a Mis Tareas',
      allowedRoles: ['Admin', 'Analista', 'Revisor', 'Super User']
    },
    {
      icon: UserCircle,
      title: 'Mi Perfil',
      description: 'Gestiona tu información personal y de seguridad.',
      href: '/usuario/perfil',
      buttonText: 'Ir a Mi Perfil',
      allowedRoles: ['Admin', 'Analista', 'Revisor', 'Super User', 'Usuario Pendiente']
    }
  ];

  const handleSupportSubmit = async () => {
    if (!supportName.trim() || !supportEmail.trim() || !supportMessage.trim()) {
      toast({
        title: "Campos Incompletos",
        description: "Por favor, complete todos los campos para enviar su solicitud.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSendingSupport(true);
    
    const emailSubject = `Solicitud de Soporte - Asistente ACR - ${supportName}`;
    const emailBody = `Se ha recibido una nueva solicitud de soporte:\n\nNombre: ${supportName}\nCorreo: ${supportEmail}\n\nMensaje:\n${supportMessage}`;
    const emailHtmlBody = `
      <h2>Nueva Solicitud de Soporte - Asistente ACR</h2>
      <p><strong>Nombre:</strong> ${supportName}</p>
      <p><strong>Correo:</strong> ${supportEmail}</p>
      <h3>Mensaje:</h3>
      <p style="white-space: pre-wrap;">${supportMessage}</p>
    `;

    const result = await sendEmailAction({
      to: 'contacto@damc.cl',
      subject: emailSubject,
      body: emailBody,
      htmlBody: emailHtmlBody,
    });
    
    if (result.success) {
      toast({
        title: "Solicitud Enviada",
        description: "Gracias por contactarnos. Nuestro equipo se pondrá en contacto con usted a la brevedad.",
      });
      setIsSupportDialogOpen(false);
      setSupportMessage('');
    } else {
      toast({
        title: "Error al Enviar",
        description: `No se pudo enviar su solicitud. Por favor, intente de nuevo. Error: ${result.message}`,
        variant: "destructive",
      });
    }

    setIsSendingSupport(false);
  };

  return (
    <>
      <div className="space-y-8 py-8">
        <header className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold font-headline text-primary">
            ¡Bienvenido a Asistente ACR, {userProfile?.name || 'Usuario'}!
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Su herramienta intuitiva y eficiente para realizar Análisis de Causa Raíz (ACR) y mejorar continuamente sus procesos.
          </p>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map(item => (
            <FeatureCard key={item.title} {...item} />
          ))}
        </div>
        
        <div className="grid grid-cols-1 gap-6 pt-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3"><Phone className="h-6 w-6 text-primary" />Soporte Técnico</CardTitle>
              <CardDescription>¿Necesita ayuda? Nuestro equipo está listo para asistirlo.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Dialog open={isSupportDialogOpen} onOpenChange={setIsSupportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">Solicitar Soporte</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Solicitud de Soporte Técnico</DialogTitle>
                    <DialogDescription>
                      Complete el formulario y nuestro equipo se pondrá en contacto con usted.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-1">
                      <Label htmlFor="support-name">Nombre</Label>
                      <Input id="support-name" value={supportName} onChange={(e) => setSupportName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="support-email">Correo</Label>
                      <Input id="support-email" type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="support-message">Soporte Requerido</Label>
                      <Textarea id="support-message" placeholder="Describa su problema o consulta aquí..." value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} rows={4} />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline" disabled={isSendingSupport}>Cancelar</Button>
                    </DialogClose>
                    <Button onClick={handleSupportSubmit} disabled={isSendingSupport}>
                      {isSendingSupport && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Enviar Solicitud
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3"><HelpCircle className="h-6 w-6 text-primary" />¿Qué es un Análisis de Causa Raíz?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                El Análisis de Causa Raíz (ACR) es un método sistemático para identificar las causas subyacentes de un problema o incidente. En lugar de simplemente tratar los síntomas, el ACR busca encontrar el origen fundamental para implementar soluciones efectivas y prevenir la recurrencia del problema.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
