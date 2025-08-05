
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function RootRedirector() {
  const { currentUser, userProfile, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Si la autenticación ha terminado y no hay usuario, redirige a login.
    if (!loadingAuth && !currentUser) {
      router.replace('/login');
    }
    
    // Si la autenticación ha terminado, hay usuario pero el perfil aún no se carga,
    // el loadingAuth o la falta de userProfile lo mantendrá en la pantalla de carga.
    // Una vez que el perfil se carga (o falla), el layout principal tomará el control.
    if (!loadingAuth && currentUser && userProfile) {
        // En lugar de redirigir a /inicio, podrías considerar mostrar
        // directamente el contenido de la página principal aquí
        // o dejar que la navegación principal maneje el flujo.
        // Si /inicio es solo un redirector, la lógica podría simplificarse.
        // Por ahora, asumimos que el usuario autenticado debe ir a /inicio.
        // Si la página de inicio ya es la pública, esta redirección puede ser innecesaria.
    }

  }, [currentUser, userProfile, loadingAuth, router]);

  // Muestra una pantalla de carga mientras se verifica el estado de autenticación
  // o mientras se está cargando el perfil del usuario.
  if (loadingAuth) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando...</p>
      </div>
    );
  }
  
  // Si el usuario está autenticado pero el perfil todavía no está disponible (ej. por un fallo de red)
  // Muestra un estado de carga para prevenir errores en componentes que dependen del perfil.
  if (currentUser && !userProfile) {
    return (
       <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando perfil de usuario...</p>
      </div>
    );
  }

  // Si no hay usuario (y ya no está cargando), será redirigido por el useEffect.
  // Mientras tanto, no mostramos nada o un loader mínimo.
  if (!currentUser) {
     return (
       <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Redirigiendo...</p>
      </div>
    );
  }

  // Si el usuario está logueado y el perfil está cargado, no renderiza nada aquí
  // porque se asume que el contenido principal de la app se muestra en / (root page.tsx)
  // o que la navegación principal se encargará del flujo.
  // Este componente solo gestiona la redirección inicial.
  return null; 
}
