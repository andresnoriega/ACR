
'use client';

import { type ReactNode, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ConfigLayout({ children }: { children: ReactNode }) {
  const { userProfile, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // This effect runs after the initial render and whenever dependencies change.
    // We don't want to redirect while authentication is still loading.
    if (!loadingAuth && userProfile && userProfile.role !== 'Super User') {
      router.replace('/inicio'); // Redirect non-Super Users to the home page
    }
  }, [userProfile, loadingAuth, router]);

  // While authentication is in progress, show a loading state.
  if (loadingAuth) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Verificando permisos...</p>
      </div>
    );
  }

  // After loading, if the user does not have the 'Super User' role, show an access denied message.
  // This covers the case where the user might see a flicker of content before the useEffect redirect happens.
  if (userProfile && userProfile.role !== 'Super User') {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] text-center p-4">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive">Acceso Restringido</h1>
        <p className="mt-2 text-muted-foreground">
          Solo los usuarios con el rol de "Super User" pueden acceder a esta sección.
        </p>
        <Button onClick={() => router.push('/inicio')} className="mt-6">Volver al Inicio</Button>
      </div>
    );
  }

  // If the user is a Super User, render the children pages.
  return <>{children}</>;
}
