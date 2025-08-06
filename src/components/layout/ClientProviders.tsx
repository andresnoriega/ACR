
"use client";

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import React, { useState, useEffect, type ReactNode } from 'react';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Toaster } from "@/components/ui/toaster";
import { TopNavigation } from '@/components/layout/TopNavigation';
import { usePathname, useRouter } from 'next/navigation';

function IdleManager() {
  const { currentUser, logoutUser } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); 
  }, []);

  const handleIdlePrompt = () => {
    // This function is called when the idle prompt should be shown.
  };

  const handleConfirmLogout = async () => {
    if (!currentUser || isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logoutUser();
      window.location.href = '/login'; 
    } catch (error) {
      console.error("Error during automatic logout for inactivity:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const { showPrompt, countdown, stayActive } = useIdleTimer({
    onIdlePrompt: handleIdlePrompt,
    onConfirmLogout: handleConfirmLogout,
    idleTime: 15 * 60 * 1000, // 15 minutes of inactivity
    promptTime: 1 * 60 * 1000, // 1 minute warning
    isActive: !!currentUser && isClient, 
  });

  if (!showPrompt || !currentUser || !isClient) {
    return null;
  }

  const minutes = Math.floor(countdown / 60);
  const seconds = String(countdown % 60).padStart(2, '0');

  return (
    <AlertDialog open={showPrompt} onOpenChange={(open) => {
      if (!open && !isLoggingOut) { 
        stayActive(); 
      }
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Sigues ahí?</AlertDialogTitle>
          <AlertDialogDescription>
            Tu sesión está a punto de cerrarse por inactividad.
            {countdown > 0 ? ` Tiempo restante: ${minutes}:${seconds}` : " Cerrando sesión..."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={stayActive} disabled={isLoggingOut}>
            Permanecer Conectado
          </AlertDialogAction>
          <Button variant="ghost" onClick={handleConfirmLogout} disabled={isLoggingOut}>
            {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Cerrar Sesión Ahora
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function AppContent({ children }: { children: ReactNode }) {
  const { currentUser, loadingAuth, userProfile } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicPage = pathname === '/login' || pathname.startsWith('/registro') || pathname === '/precios';
  const isRootPage = pathname === '/';

  useEffect(() => {
    if (loadingAuth) return; // Wait until authentication state is resolved
    
    // If the user is logged in, redirect them away from public pages to the home page.
    if (currentUser && isPublicPage) {
      router.replace('/home');
    }
    
    // If the user is not logged in, and they are trying to access a protected page, redirect them to login.
    if (!currentUser && !isPublicPage && !isRootPage) {
      router.replace('/login');
    }
  }, [currentUser, loadingAuth, isPublicPage, isRootPage, pathname, router]);
  
  // If it's a public page, render it immediately without waiting for auth.
  if (isPublicPage) {
    return <main className="flex-grow w-full">{children}</main>;
  }

  // For protected routes, show a loader while auth state is resolving
  // or while the user profile is being fetched.
  if (loadingAuth || (currentUser && !userProfile) || isRootPage) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando aplicación...</p>
      </div>
    );
  }

  // If we are on a protected route and there's no user, auth effect will redirect.
  // We can return null or a loader here to prevent flashing content.
  if (!currentUser) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Redirigiendo...</p>
        </div>
    );
  }

  // At this point, user is authenticated, profile is loaded, and it's a protected page.
  // Render the full app layout.
  return (
    <>
      <TopNavigation />
      <main className="flex-grow w-full print-container">
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 h-full">
          {children}
        </div>
      </main>
      <Toaster />
      <IdleManager />
    </>
  );
}


export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AppContent>
        {children}
      </AppContent>
    </AuthProvider>
  );
}
