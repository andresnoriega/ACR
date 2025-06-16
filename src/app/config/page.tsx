
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { SettingsIcon, Users, Globe, KeyRound, ShieldCheck, Loader2, DollarSign } from 'lucide-react';
import { PasswordPromptDialog } from '@/components/config/PasswordPromptDialog';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from "firebase/firestore";
import type { FullUserProfile } from '@/types/rca';
import { useToast } from "@/hooks/use-toast";

const ADMIN_USERNAME = "Andrés Noriega";

export default function ConfiguracionHubPage() {
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isLoadingAdminPassword, setIsLoadingAdminPassword] = useState(false);
  const [adminPassword, setAdminPassword] = useState<string | undefined>(undefined);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchAdminPassword = async () => {
      setIsLoadingAdminPassword(true);
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("name", "==", ADMIN_USERNAME));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const adminUserDoc = querySnapshot.docs[0].data() as FullUserProfile;
          if (adminUserDoc.password) {
            setAdminPassword(adminUserDoc.password);
          } else {
            // Admin exists but has no password set, dialog will use its default
            console.warn(`User "${ADMIN_USERNAME}" found but has no password set. Password prompt will use its internal default.`);
          }
        } else {
          console.warn(`Admin user "${ADMIN_USERNAME}" not found. Password prompt will use its internal default.`);
        }
      } catch (error) {
        console.error("Error fetching admin user's password:", error);
        toast({
          title: "Error al Cargar Configuración de Admin",
          description: "No se pudo obtener la contraseña del administrador. Se usará la contraseña por defecto para el diálogo.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingAdminPassword(false);
      }
    };

    fetchAdminPassword();
  }, [toast]);

  const handlePrivacyDataClick = () => {
    setIsPasswordDialogOpen(true);
  };

  const handlePasswordSuccess = () => {
    router.push('/config/privacidad');
  };

  return (
    <>
      <div className="space-y-8 py-8">
        <header className="text-center space-y-2">
          <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
            <SettingsIcon className="h-10 w-10" />
          </div>
          <h1 className="text-4xl font-bold font-headline text-primary">
            Configuración General
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Administre los diferentes aspectos de RCA Assistant.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-7 w-7 text-primary" />
                <CardTitle className="text-2xl">Usuarios</CardTitle>
              </div>
              <CardDescription>Gestione los usuarios del sistema, sus roles y accesos.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/config/usuarios" passHref>
                <Button className="w-full" size="lg">
                  Configurar Usuarios
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Globe className="h-7 w-7 text-primary" />
                <CardTitle className="text-2xl">Sitios/Plantas</CardTitle>
              </div>
              <CardDescription>Administre los sitios, plantas o áreas de su organización.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/config/sitios" passHref>
                <Button className="w-full" size="lg">
                  Configurar Sitios
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <KeyRound className="h-7 w-7 text-primary" />
                <CardTitle className="text-2xl">Permisos</CardTitle>
              </div>
              <CardDescription>Defina roles y gestione los permisos detallados del sistema.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/config/permisos" passHref>
                <Button className="w-full" size="lg">
                  Configurar Permisos
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="h-7 w-7 text-primary" />
                <CardTitle className="text-2xl">Planes y Suscripción</CardTitle>
              </div>
              <CardDescription>Revise los planes disponibles y gestione su suscripción actual.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/precios" passHref>
                <Button className="w-full" size="lg">
                  Ver Planes
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className="h-7 w-7 text-primary" />
                <CardTitle className="text-2xl">Privacidad y Datos</CardTitle>
              </div>
              <CardDescription>Gestione el almacenamiento de datos, opciones de reseteo y configuraciones de privacidad.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" size="lg" onClick={handlePrivacyDataClick} disabled={isLoadingAdminPassword}>
                {isLoadingAdminPassword && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Gestionar Datos
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <Card className="mt-8 bg-secondary/30">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-primary mb-2">Mantenimiento del Sistema</h3>
            <p className="text-sm text-foreground">
              Desde esta sección puede ajustar los parámetros fundamentales de la aplicación para adaptarla a las necesidades de su organización. 
              Asegúrese de que los cambios realizados sean consistentes con sus políticas internas.
              <strong className="block mt-2 text-destructive">ADVERTENCIA (Demo): Las contraseñas de usuario se almacenan en texto plano. Esto NO es seguro para producción.</strong>
            </p>
          </CardContent>
        </Card>
      </div>

      <PasswordPromptDialog
        isOpen={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
        onSuccess={handlePasswordSuccess}
        expectedPasswordFromConfig={adminPassword} // Pass the fetched password
      />
    </>
  );
}
