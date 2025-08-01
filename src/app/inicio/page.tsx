'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Home, BarChart3, FileText, SettingsIcon, Zap, UserCheck, ListOrdered, Loader2, AlertTriangle, UserCircle, LifeBuoy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { sendEmailAction } from '@/app/actions';


// --- SupportDialog Component ---
const SupportDialog = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [problem, setProblem] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setEmail(userProfile.email || '');
    }
  }, [userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !problem.trim()) {
      toast({ title: "Campos incompletos", description: "Por favor, rellene todos los campos.", variant: "destructive" });
      return;
    }
    setIsSending(true);

    const emailSubject = `Solicitud de Soporte Técnico - ${name}`;
    const emailBody = `Se ha recibido una nueva solicitud de soporte técnico:\n\nNombre: ${name}\nCorreo de Contacto: ${email}\n\nProblema Reportado:\n${problem}`;

    const result = await sendEmailAction({
      to: 'contacto@damc.cl',
      subject: emailSubject,
      body: emailBody
    });

    if (result.success) {
      toast({ title: "Solicitud Enviada", description: "Nuestro equipo de soporte se pondrá en contacto con usted a la brevedad." });
      setProblem('');
      setIsOpen(false);
    } else {
      toast({ title: "Error al Enviar", description: result.message, variant: "destructive" });
    }
    setIsSending(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" size="lg">
          Solicitar Soporte
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitud de Soporte Técnico</DialogTitle>
          <DialogDescription>
            Describa su problema y nuestro equipo se pondrá en contacto con usted.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="support-name">Su Nombre</Label>
            <Input id="support-name" value={name} onChange={e => setName(e.target.value)} required disabled={isSending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="support-email">Su Correo de Contacto</Label>
            <Input id="support-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={isSending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="support-problem">Problema a Reportar</Label>
            <Textarea id="support-problem" value={problem} onChange={e => setProblem(e.target.value)} placeholder="Por favor, sea lo más detallado posible..." required disabled={isSending} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSending}>Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={isSending}>
              {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar Solicitud
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};


export default function InicioPage() {
  const router = useRouter();
  const { currentUser, loadingAuth, userProfile } = useAuth();

  useEffect(() => {
    if (!loadingAuth && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, loadingAuth, router]);

  if (loadingAuth) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando datos de usuario...</p>
      </div>
    );
  }

  if (!currentUser) {
    // This case should be handled by the useEffect redirect, but as a fallback:
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] text-center">
        <p className="text-lg text-muted-foreground mb-4">Debe iniciar sesión para ver esta página.</p>
        <Button asChild><Link href="/login">Ir a Login</Link></Button>
      </div>
    );
  }

  if (userProfile?.role === 'Usuario Pendiente') {
    return (
      <div className="space-y-8 py-8 text-center">
         <header className="space-y-2">
          <div className="inline-flex items-center justify-center bg-yellow-500/10 text-yellow-600 p-3 rounded-full mb-4">
            <AlertTriangle className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-bold font-headline text-yellow-700">
            Cuenta Pendiente de Aprobación
          </h1>
          <p className="text-md text-muted-foreground max-w-lg mx-auto">
            Bienvenido/a {userProfile?.name || currentUser.email}. Su cuenta ha sido registrada exitosamente pero está pendiente de activación por un Super Usuario.
          </p>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Una vez aprobada, tendrá acceso a todas las funcionalidades asignadas a su rol. Por favor, contacte al administrador del sistema si tiene alguna pregunta.
          </p>
        </header>
        <Card className="max-w-md mx-auto shadow-md">
            <CardContent className="pt-6">
                <Button onClick={() => router.push('/login')} variant="outline" className="w-full">
                    Volver a Inicio de Sesión
                </Button>
            </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="space-y-8 py-8">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
          <Zap className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary">
          Bienvenido a Asistente ACR, {userProfile?.name || currentUser.email}!
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Su herramienta intuitiva y eficiente para realizar Análisis de Causa Raíz (ACR) y mejorar continuamente sus procesos.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="h-7 w-7 text-primary" />
              <CardTitle className="text-2xl">Reporta y Analiza</CardTitle>
            </div>
            <CardDescription>Inicie un nuevo análisis o continúe uno existente, siguiendo un proceso guiado paso a paso.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/analisis" passHref>
              <Button className="w-full" size="lg">
                Ir a Análisis
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <ListOrdered className="h-7 w-7 text-primary" />
              <CardTitle className="text-2xl">Eventos Reportados</CardTitle>
            </div>
            <CardDescription>Visualice y gestione todos los eventos reportados y pendientes de análisis.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/eventos" passHref>
              <Button className="w-full" size="lg">
                Ver Eventos
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-7 w-7 text-primary" />
              <CardTitle className="text-2xl">Informes</CardTitle>
            </div>
            <CardDescription>Visualice y gestione los informes de sus análisis completados.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/informes" passHref>
              <Button className="w-full" size="lg">
                Ver Informes
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <UserCheck className="h-7 w-7 text-primary" />
              <CardTitle className="text-2xl">Mis Tareas</CardTitle>
            </div>
            <CardDescription>Gestione sus planes de acción y tareas asignadas.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/usuario/planes" passHref>
              <Button className="w-full" size="lg">
                Ir a Mis Tareas
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <UserCircle className="h-7 w-7 text-primary" />
              <CardTitle className="text-2xl">Mi Perfil</CardTitle>
            </div>
            <CardDescription>Gestiona tu información personal y de seguridad.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/usuario/perfil" passHref>
              <Button className="w-full" size="lg">
                Ir a Mi Perfil
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <SettingsIcon className="h-7 w-7 text-primary" />
              <CardTitle className="text-2xl">Configuración</CardTitle>
            </div>
            <CardDescription>Ajuste las preferencias y configuraciones de la aplicación.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/config" passHref>
              <Button className="w-full" size="lg">
                Ir a Configuración
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8 bg-secondary/30">
        <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <LifeBuoy className="h-7 w-7 text-primary" />
              <CardTitle className="text-2xl">Soporte Técnico</CardTitle>
            </div>
            <CardDescription>¿Necesita ayuda? Nuestro equipo está listo para asistirlo.</CardDescription>
          </CardHeader>
        <CardContent>
          <SupportDialog />
        </CardContent>
      </Card>
      
      <Card className="mt-8 bg-secondary/30">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-primary mb-2">¿Qué es un Análisis de Causa Raíz?</h3>
          <p className="text-sm text-foreground">
            El Análisis de Causa Raíz (ACR) es un método sistemático para identificar las causas subyacentes de un problema o incidente. 
            En lugar de simplemente tratar los síntomas, el ACR busca encontrar el origen fundamental para implementar soluciones efectivas 
            y prevenir la recurrencia del problema. Esta herramienta le guiará a través de este proceso.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
