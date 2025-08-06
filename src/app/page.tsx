'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function RootRedirector() {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth) {
      if (currentUser) {
        // If user is logged in, redirect to the analysis page.
        router.replace('/analisis'); 
      } else {
        // If no user, redirect to the login page.
        router.replace('/login');
      }
    }
  }, [currentUser, loadingAuth, router]);

  // Show a loading spinner while checking auth state
  return (
    <div className="flex flex-col justify-center items-center min-h-screen">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Cargando...</p>
    </div>
  );
}
