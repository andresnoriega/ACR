
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function RootRedirector() {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // This effect handles the initial routing logic for the entire application.
    if (!loadingAuth) {
      if (currentUser) {
        // If there's a user, the main entry point for them is the '/inicio' dashboard.
        router.replace('/inicio');
      } else {
        // If there's no user, they should be directed to the public-facing login page.
        router.replace('/login');
      }
    }
    // The dependency array ensures this effect runs only when the authentication state changes.
  }, [currentUser, loadingAuth, router]);

  // Display a full-page loader while authentication status is being determined.
  // This prevents content flashing and ensures a smooth user experience.
  return (
    <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)]">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg text-muted-foreground">Cargando aplicación...</p>
    </div>
  );
}
