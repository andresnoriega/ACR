'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth) {
      if (currentUser) {
        router.replace('/inicio');
      } else {
        router.replace('/login');
      }
    }
  }, [currentUser, loadingAuth, router]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Cargando aplicación...</p>
    </div>
  );
}
