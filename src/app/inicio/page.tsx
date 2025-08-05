
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
      if (!currentUser) {
        router.replace('/login');
      }
    }
  }, [currentUser, loadingAuth, router]);

  if (loadingAuth || !currentUser) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  // If we have a user, the content from the original page will be rendered.
  // We can just return the same content as the original page.tsx
  // This logic now happens at the page level.
  return <></>; // Or a spinner while content loads if needed
}
