"use client";

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import React, { useState, useEffect, type ReactNode } from 'react';
// useRouter no es necesario aquí si IdleManager no navega directamente
// import { useRouter } from 'next/navigation'; 
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
import { usePathname } from 'next/navigation';

function IdleManager() {
  const { currentUser, logoutUser } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); 
  }, []);

  const handleIdlePrompt = () => {
    // console.log("User is idle, warning dialog should be visible.");
  };

  const handleConfirmLogout = async () => {
    if (!currentUser || isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logoutUser();
      window.location.href = '/login'; // Redirect to login page on idle logout
    } catch (error) {
      console.error("Error during automatic logout for inactivity:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const { showPrompt, countdown, stayActive } = useIdleTimer({
    onIdlePrompt: handleIdlePrompt,
    onConfirmLogout: handleConfirmLogout,
    idleTime: 5 * 60 * 1000,      // 5 minutos
    promptTime: 1 * 60 * 1000,     // 1 minuto de advertencia
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
  const { currentUser } = useAuth();
  const pathname = usePathname();
  const isPublicPage = pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/registro');

  return (
    <>
      {!isPublicPage && currentUser && <TopNavigation />}
      <main className="flex-grow w-full print-container">
        {isPublicPage ? (
            children
        ) : (
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 h-full">
                {children}
            </div>
        )}
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
