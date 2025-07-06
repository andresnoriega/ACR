'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ConfigLayout({ children }: { children: ReactNode }) {
  const { currentUser, userProfile, loadingAuth } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // This effect handles all redirection logic once loading is complete.
    if (!loadingAuth) {
      if (!currentUser) {
        toast({ title: "Acceso Denegado", description: "Debe iniciar sesión para acceder a la configuración.", variant: "destructive" });
        router.replace('/login');
      } else if (!userProfile) {
        // This case handles a logged-in user without a Firestore profile document.
        // It could be a new user pending approval, or a data inconsistency.
        // Redirecting to home is a safe fallback.
        toast({ title: "Perfil Incompleto", description: "Su perfil de usuario no se pudo cargar. Contacte al administrador.", variant: "destructive" });
        router.replace('/inicio');
      } else if (userProfile.role !== 'Super User' && userProfile.role !== 'Admin') {
        toast({ title: "Acceso Denegado", description: "No tiene permisos para acceder a esta sección.", variant: "destructive" });
        router.replace('/inicio');
      }
    }
  }, [currentUser, userProfile, loadingAuth, router, toast]);

  // While waiting for auth and profile to load, show a spinner.
  if (loadingAuth) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Verificando permisos...</p>
      </div>
    );
  }

  // If loading is done, and the user has the correct profile, show the content.
  // If they don't have the correct profile, the useEffect above will have already started the redirection.
  // We can show a fallback "Access Denied" message for clarity during the redirect.
  if (userProfile && (userProfile.role === 'Super User' || userProfile.role === 'Admin')) {
    return <>{children}</>;
  }

  // Fallback UI for any case where the user shouldn't be here (e.g., during redirect).
  return (
    <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] text-center p-4">
      <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
      <h1 className="text-2xl font-bold text-destructive mb-2">Acceso Denegado</h1>
      <p className="text-muted-foreground mb-6">
        No tiene los permisos necesarios para acceder a la configuración.
      </p>
      <Button onClick={() => router.push('/inicio')}>Volver a Inicio</Button>
    </div>
  );
}
