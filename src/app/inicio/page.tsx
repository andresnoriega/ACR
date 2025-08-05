
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2, BarChart3, ListOrdered, FileText, UserCheck, User, Settings, HelpCircle, Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { sendEmailAction } from '@/app/actions';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  buttonText: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon: Icon, href, buttonText }) => {
  return (
    <Card className="flex flex-col shadow-sm hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3 mb-1">
          <Icon className="h-6 w-6 text-primary" />
          <CardTitle className="text-xl">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={href}>{buttonText}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};


export default function InicioPage() {
  const { userProfile, loadingAuth } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isSupportDialogOpen, setIsSupportDialogOpen] = useState(false);
  const [supportName, setSupportName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportRequest, setSupportRequest] = useState('');
  const [isSendingSupport, setIsSendingSupport] = useState(false);

  // Pre-fill form when user profile is available
  useEffect(() => {
    if (userProfile) {
      setSupportName(userProfile.name || '');
      setSupportEmail(userProfile.email || '');
    }
  }, [userProfile]);
  
  const handleSupportSubmit = async () => {
    if (!supportName.trim() || !supportEmail.trim() || !supportRequest.trim()) {
      toast({
        title: "Campos Incompletos",
        description: "Por favor, complete todos los campos para enviar su solicitud.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSendingSupport(true);
    
    const subject = `Solicitud de Soporte de Asistente ACR: ${supportName}`;
    const body = `Un usuario ha solicitado soporte desde la aplicación Asistente ACR.\n\nNombre: ${supportName}\nCorreo: ${supportEmail}\n\nSoporte Requerido:\n${supportRequest}`;

    const result = await sendEmailAction({
      to: 'contacto@damc.cl',
      subject: subject,
      body: body,
      htmlBody: `<p>Un usuario ha solicitado soporte desde la aplicación Asistente ACR.</p>
                 <p><b>Nombre:</b> ${supportName}</p>
                 <p><b>Correo:</b> ${supportEmail}</p>
                 <p><b>Soporte Requerido:</b></p>
                 <p>${supportRequest.replace(/\n/g, '<br>')}</p>`
    });

    if (result.success) {
      toast({
        title: "Solicitud Enviada",
        description: "Su solicitud de soporte ha sido enviada. Nos pondremos en contacto con usted pronto."
      });
      setIsSupportDialogOpen(false);
      setSupportRequest('');
    } else {
      toast({
        title: "Error al Enviar",
        description: `No se pudo enviar su solicitud: ${result.message}`,
        variant: "destructive"
      });
    }
    setIsSendingSupport(false);
  };

  if (loadingAuth || !userProfile) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando bienvenida...</p>
      </div>
    );
  }

  const mainFeatures: FeatureCardProps[] = [
    { title: 'Reporta y Analiza', description: 'Inicie un nuevo análisis o continúe uno existente, siguiendo un proceso guiado paso a paso.', icon: BarChart3, href: '/analisis', buttonText: 'Ir a Análisis' },
    { title: 'Eventos Reportados', description: 'Visualice y gestione todos los eventos reportados y pendientes de análisis.', icon: ListOrdered, href: '/eventos', buttonText: 'Ver Eventos' },
    { title: 'Informes', description: 'Visualice y gestione los informes de sus análisis completados.', icon: FileText, href: '/informes', buttonText: 'Ver Informes' },
    { title: 'Mis Tareas', description: 'Gestione sus planes de acción y tareas asignadas.', icon: UserCheck, href: '/usuario/planes', buttonText: 'Ir a Mis Tareas' },
    { title: 'Mi Perfil', description: 'Gestiona tu información personal y de seguridad.', icon: User, href: '/usuario/perfil', buttonText: 'Ir a Mi Perfil' },
    { title: 'Configuración', description: 'Ajuste las preferencias y configuraciones de la aplicación.', icon: Settings, href: '/config', buttonText: 'Ir a Configuración' },
  ];
  
  const filteredFeatures = mainFeatures.filter(feature => {
    if (feature.href === '/config' && userProfile.role !== 'Super User' && userProfile.role !== 'Admin') {
      return false;
    }
    return true;
  });

  return (
    <>
      <div className="space-y-8 py-4">
        <header className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold font-headline text-primary">
            ¡Bienvenido a Asistente ACR, {userProfile.name}!
          </h1>
          <p className="text-md text-muted-foreground max-w-2xl mx-auto">
            Su herramienta intuitiva y eficiente para realizar Análisis de Causa Raíz (ACR) y mejorar continuamente sus procesos.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {filteredFeatures.map(item => (
              <FeatureCard 
                  key={item.title}
                  {...item}
              />
          ))}
        </div>
        
        <div className="grid grid-cols-1 gap-6 max-w-6xl mx-auto">
          <Card className="shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-3"><Phone className="h-6 w-6 text-primary"/>Soporte Técnico</CardTitle>
                <CardDescription>¿Necesita ayuda? Nuestro equipo está listo para asistirlo.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="outline" onClick={() => setIsSupportDialogOpen(true)}>Solicitar Soporte</Button>
            </CardFooter>
          </Card>

          <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-3"><HelpCircle className="h-6 w-6 text-primary"/>¿Qué es un Análisis de Causa Raíz?</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-sm text-muted-foreground">
                      El Análisis de Causa Raíz (ACR) es un método sistemático para identificar las causas subyacentes de un problema o incidente. En lugar de simplemente tratar los síntomas, el ACR busca encontrar el origen fundamental para implementar soluciones efectivas y prevenir la recurrencia del problema. Esta herramienta le guiará a través de este proceso.
                  </p>
              </CardContent>
          </Card>
        </div>
      </div>
      
      <Dialog open={isSupportDialogOpen} onOpenChange={setIsSupportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitud de Soporte Técnico</DialogTitle>
            <DialogDescription>
              Complete el siguiente formulario. Nos pondremos en contacto con usted a la brevedad.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="support-name">Nombre</Label>
              <Input id="support-name" value={supportName} onChange={(e) => setSupportName(e.target.value)} disabled={isSendingSupport} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-email">Correo Electrónico</Label>
              <Input id="support-email" type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} disabled={isSendingSupport} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-request">Soporte Requerido</Label>
              <Textarea id="support-request" value={supportRequest} onChange={(e) => setSupportRequest(e.target.value)} placeholder="Describa su problema o consulta aquí..." rows={4} disabled={isSendingSupport}/>
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
    </>
  );
}
