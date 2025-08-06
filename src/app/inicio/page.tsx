
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

// This page is a redirector. If a user lands here, it will send them
// to the appropriate page based on their auth state.
export default function InicioPage() {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth) {
      if (currentUser) {
        // Logged-in users should go to the main analysis page
        router.replace('/analisis');
      } else {
        // Logged-out users should go to the login page
        router.replace('/login');
      }
    }
  }, [currentUser, loadingAuth, router]);

  return (
    <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)]">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg text-muted-foreground">Cargando...</p>
    </div>
  );
}
