
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function RootRedirector() {
  const { currentUser, userProfile, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Si la autenticación ha terminado...
    if (!loadingAuth) {
      // y no hay usuario, lo enviamos a la página de login.
      if (!currentUser) {
        router.replace('/login');
      } 
      // y SÍ hay usuario y perfil, lo enviamos a la página de eventos, que es el inicio real de la app.
      else if (currentUser && userProfile) {
        router.replace('/eventos');
      }
    }
  }, [currentUser, userProfile, loadingAuth, router]);

  // Muestra una pantalla de carga unificada mientras se resuelve la autenticación y el perfil.
  // Esto evita parpadeos o redirecciones innecesarias.
  return (
    <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)]">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg text-muted-foreground">Cargando aplicación...</p>
    </div>
  );
}
