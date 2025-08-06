
'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, BarChart3, ListOrdered, FileText, UserCheck, UserCircle, Settings, HelpCircle, Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { sendEmailAction } from '@/app/actions';

const menuItemsBase = [
    {
      title: 'Reporta y Analiza',
      description: 'Inicie un nuevo análisis o continúe uno existente, siguiendo un proceso guiado paso a paso.',
      href: '/analisis',
      icon: BarChart3,
      cta: 'Ir a Análisis',
      allowedRoles: ['Admin', 'Analista', 'Super User']
    },
    {
      title: 'Eventos Reportados',
      description: 'Visualice y gestione todos los eventos reportados y pendientes de análisis.',
      href: '/eventos',
      icon: ListOrdered,
      cta: 'Ver Eventos',
      allowedRoles: ['Admin', 'Analista', 'Revisor', 'Super User']
    },
    {
      title: 'Informes',
      description: 'Visualice y gestione los informes de sus análisis completados.',
      href: '/informes',
      icon: FileText,
      cta: 'Ver Informes',
       allowedRoles: ['Admin', 'Analista', 'Revisor', 'Super User']
    },
    {
      title: 'Mis Tareas',
      description: 'Gestione sus planes de acción y tareas asignadas.',
      href: '/usuario/planes',
      icon: UserCheck,
      cta: 'Ir a Mis Tareas',
      allowedRoles: ['Admin', 'Analista', 'Revisor', 'Super User']
    },
    {
      title: 'Mi Perfil',
      description: 'Gestiona tu información personal y de seguridad.',
      href: '/usuario/perfil',
      icon: UserCircle,
      cta: 'Ir a Mi Perfil',
      allowedRoles: ['Admin', 'Analista', 'Revisor', 'Super User', 'Usuario Pendiente']
    },
    {
      title: 'Configuración',
      description: 'Ajuste las preferencias y configuraciones de la aplicación.',
      href: '/config',
      icon: Settings,
      cta: 'Ir a Configuración',
      allowedRoles: ['Super User']
    },
];

export default function InicioPage() {
  const { userProfile, loadingAuth } = useAuth();
  const { toast } = useToast();
  
  const [isSupportDialogOpen, setIsSupportDialogOpen] = useState(false);
  const [supportName, setSupportName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSendingSupport, setIsSendingSupport] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setSupportName(userProfile.name || '');
      setSupportEmail(userProfile.email || '');
    }
  }, [userProfile]);
  
  const visibleMenuItems = useMemo(() => {
    if (!userProfile?.role) return [];
    return menuItemsBase.filter(item => item.allowedRoles.includes(userProfile.role));
  }, [userProfile?.role]);

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
    const subject = `Solicitud de Soporte ACR - ${supportName}`;
    const body = `Un usuario ha solicitado soporte:\n\nNombre: ${supportName}\nCorreo: ${supportEmail}\n\nSolicitud:\n${supportMessage}`;

    const result = await sendEmailAction({
      to: 'contacto@damc.cl',
      subject: subject,
      body: body,
    });

    if (result.success) {
      toast({
        title: "Solicitud Enviada",
        description: "Gracias por contactarnos. Nuestro equipo de soporte se comunicará con usted a la brevedad.",
      });
      setIsSupportDialogOpen(false);
      setSupportMessage('');
    } else {
      toast({
        title: "Error al Enviar",
        description: `No se pudo enviar su solicitud. ${result.message}`,
        variant: "destructive",
      });
    }
    setIsSendingSupport(false);
  };
  
  if (loadingAuth || !userProfile) {
    return (
      <div className="flex h-[calc(100vh-150px)] w-full flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 py-8">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-bold font-headline text-primary">
            ¡Bienvenido a Asistente ACR, {userProfile.name}!
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Su herramienta intuitiva y eficiente para realizar Análisis de Causa Raíz (ACR) y mejorar continuamente sus procesos.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleMenuItems.map((item) => (
            <Card key={item.title} className="hover:shadow-lg transition-shadow flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <item.icon className="h-7 w-7 text-primary" />
                  <CardTitle className="text-2xl">{item.title}</CardTitle>
                </div>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex items-end">
                <Link href={item.href} passHref className="w-full">
                  <Button className="w-full" size="lg">
                    {item.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
            <Card>
               <CardHeader>
                   <div className="flex items-center gap-3 mb-2">
                      <Phone className="h-7 w-7 text-primary" />
                      <CardTitle>Soporte Técnico</CardTitle>
                  </div>
                   <CardDescription>¿Necesita ayuda? Nuestro equipo está listo para asistirlo.</CardDescription>
               </CardHeader>
               <CardContent>
                  <Dialog open={isSupportDialogOpen} onOpenChange={setIsSupportDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>Solicitar Soporte</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Formulario de Soporte Técnico</DialogTitle>
                        <DialogDescription>
                          Complete el formulario y nos pondremos en contacto con usted.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="support-name">Su Nombre</Label>
                          <Input id="support-name" value={supportName} onChange={(e) => setSupportName(e.target.value)} disabled={isSendingSupport} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="support-email">Su Correo</Label>
                          <Input id="support-email" type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} disabled={isSendingSupport} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="support-message">Soporte Requerido</Label>
                          <Textarea id="support-message" placeholder="Describa su problema o consulta aquí..." rows={4} value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} disabled={isSendingSupport} />
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button type="button" variant="outline" disabled={isSendingSupport}>Cancelar</Button>
                        </DialogClose>
                        <Button type="button" onClick={handleSupportSubmit} disabled={isSendingSupport}>
                          {isSendingSupport && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Enviar Solicitud
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
               </CardContent>
            </Card>
            <Card>
              <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                      <HelpCircle className="h-7 w-7 text-primary" />
                      <CardTitle>¿Qué es un Análisis de Causa Raíz?</CardTitle>
                  </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  El Análisis de Causa Raíz (ACR) es un método sistemático para identificar las causas subyacentes de un problema o incidente. En lugar de simplemente tratar los síntomas, el ACR busca encontrar el origen fundamental para implementar soluciones efectivas y prevenir la recurrencia del problema. Esta herramienta le guiará a través de este proceso.
                </p>
              </CardContent>
            </Card>
        </div>

      </div>
    </>
  );
}
