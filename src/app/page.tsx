
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();
  const { currentUser, loadingAuth } = useAuth();

  useEffect(() => {
    if (!loadingAuth) {
      if (currentUser) {
        router.replace('/inicio');
      } else {
        router.replace('/login');
      }
    }
  }, [currentUser, loadingAuth, router]);

  if (loadingAuth) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando aplicación...</p>
      </div>
    );
  }
  // This content will briefly show while redirecting, or if stuck.
  return (
    <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] text-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg text-muted-foreground">Verificando sesión y redirigiendo...</p>
    </div>
  );
}
