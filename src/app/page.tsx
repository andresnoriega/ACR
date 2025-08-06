
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loadingAuth) {
      // Wait until authentication status is determined
      return;
    }

    if (currentUser) {
      // If user is logged in, redirect to the main app page
      router.replace('/home');
    } else {
      // If no user, redirect to the public home/landing page
      router.replace('/login');
    }
  }, [currentUser, loadingAuth, router]);

  // Display a full-page loader while determining auth status and redirecting
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Cargando aplicación...</p>
    </div>
  );
}
