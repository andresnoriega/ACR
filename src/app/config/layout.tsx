
'use client';

import { useState, useEffect, type ReactNode, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldAlert, KeyRound } from 'lucide-react';
import { EmailAuthProvider, reauthenticateWithCredential, type AuthError } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function ConfigLayout({ children }: { children: ReactNode }) {
  const { currentUser, userProfile, loadingAuth } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isConfigSectionAuthenticated, setIsConfigSectionAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (!loadingAuth) {
      if (!currentUser) {
        toast({ title: "Acceso Denegado", description: "Debe iniciar sesión para acceder a la configuración.", variant: "destructive" });
        router.replace('/login');
      } else if (userProfile && userProfile.role !== 'Super User') {
        toast({ title: "Acceso Denegado", description: "No tiene permisos para acceder a esta sección.", variant: "destructive" });
        router.replace('/inicio');
      }
    }
  }, [currentUser, userProfile, loadingAuth, router, toast]);

  const handlePasswordVerification = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentUser.email) {
      setVerificationError("No se pudo obtener la información del usuario actual.");
      return;
    }
    if (!password) {
      setVerificationError("Por favor, ingrese su contraseña.");
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);
      setIsConfigSectionAuthenticated(true);
      toast({ title: "Acceso Concedido", description: "Autenticación para la sección de configuración exitosa." });
    } catch (error) {
      const authError = error as AuthError;
      console.error("Error re-authenticating for config section:", authError);
      if (authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
        setVerificationError("Contraseña incorrecta. Por favor, inténtelo de nuevo.");
      } else {
        setVerificationError(`Error de autenticación: ${authError.message}`);
      }
      setIsConfigSectionAuthenticated(false);
    } finally {
      setIsVerifying(false);
      setPassword('');
    }
  };

  if (loadingAuth) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando sesión...</p>
      </div>
    );
  }

  if (!currentUser || (userProfile && userProfile.role !== 'Super User')) {
    // This will be briefly shown before redirect effect kicks in, or if redirect fails.
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] text-center p-4">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive mb-2">Acceso Denegado</h1>
        <p className="text-muted-foreground mb-6">
          No tiene los permisos necesarios para acceder a la configuración o no ha iniciado sesión.
        </p>
        <Button onClick={() => router.push('/inicio')}>Volver a Inicio</Button>
      </div>
    );
  }

  if (!isConfigSectionAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] py-12">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4 mx-auto w-fit">
               <KeyRound className="h-10 w-10" />
            </div>
            <CardTitle className="text-2xl font-bold">Verificación Requerida</CardTitle>
            <CardDescription>
              Para acceder a la sección de configuración, por favor ingrese su contraseña actual.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordVerification} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="config-password">Contraseña Actual</Label>
                <Input
                  id="config-password"
                  type="password"
                  placeholder="Su contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isVerifying}
                />
              </div>
              {verificationError && (
                <p className="text-sm text-destructive">{verificationError}</p>
              )}
              <Button type="submit" className="w-full" disabled={isVerifying}>
                {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                {isVerifying ? 'Verificando...' : 'Verificar y Acceder'}
              </Button>
            </form>
          </CardContent>
           <CardFooter className="text-center text-xs text-muted-foreground">
            <p>Esta verificación es necesaria para proteger las configuraciones críticas del sistema.</p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
