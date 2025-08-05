'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, BarChart3, FileText, SettingsIcon, UserCheck, ListOrdered, DollarSign, LogOut, LogIn as LogInIcon, BookOpen, Zap, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import React, { useState, useEffect, useMemo } from 'react';

const mainMenuItemsBase = [
  { href: '/inicio', label: 'Inicio', icon: Home, section: 'inicio', requiresAuth: true, allowedRoles: ['Admin', 'Analista', 'Revisor', 'Super User', 'Usuario Pendiente'] },
  { href: '/eventos', label: 'Eventos', icon: ListOrdered, section: 'eventos', requiresAuth: true, allowedRoles: ['Admin', 'Analista', 'Revisor', 'Super User'] },
  { href: '/analisis', label: 'Análisis', icon: BarChart3, section: 'analisis', requiresAuth: true, allowedRoles: ['Admin', 'Analista', 'Super User'] },
  { href: '/informes', label: 'Informes', icon: FileText, section: 'informes', requiresAuth: true, allowedRoles: ['Admin', 'Analista', 'Revisor', 'Super User'] },
  { href: '/usuario/planes', label: 'Mis Tareas', icon: UserCheck, section: 'usuario', requiresAuth: true, allowedRoles: ['Admin', 'Analista', 'Revisor', 'Super User'] },
  { href: '/usuario/perfil', label: 'Mi Perfil', icon: UserCircle, section: 'usuario', requiresAuth: true, allowedRoles: ['Admin', 'Analista', 'Revisor', 'Super User', 'Usuario Pendiente'] },
  { href: '/config', label: 'Config.', icon: SettingsIcon, section: 'config', requiresAuth: true, allowedRoles: ['Super User', 'Admin'] },
  { href: '/instructivo', label: 'Instructivo', icon: BookOpen, section: 'instructivo', requiresAuth: true, allowedRoles: ['Admin', 'Analista', 'Revisor', 'Super User', 'Usuario Pendiente'] },
];

export function TopNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logoutUser, loadingAuth, userProfile } = useAuth();
  const { toast } = useToast();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const visibleMenuItems = useMemo(() => {
    if (!hasMounted || !currentUser || loadingAuth || !userProfile) {
      return [];
    }
    
    return mainMenuItemsBase.filter(item => {
      if (!item.requiresAuth) return true;
      if (item.allowedRoles && userProfile.role) {
        return item.allowedRoles.includes(userProfile.role);
      }
      return false;
    });

  }, [hasMounted, currentUser, loadingAuth, userProfile]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      toast({ title: 'Sesión Cerrada', description: 'Has cerrado sesión exitosamente.' });
      window.location.href = '/'; // Redirect to the public home page
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      toast({ title: 'Error', description: 'No se pudo cerrar la sesión.', variant: 'destructive' });
    }
  };

  const isPublicPage = !currentUser && (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/registro'));
  const showNavForAuthenticatedUser = hasMounted && currentUser && !loadingAuth;

  return (
    <header className="bg-card border-b border-border shadow-sm no-print sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo or Menu Items Section */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold text-primary">
              <Zap className="h-7 w-7" />
              <span className="font-headline text-xl hidden sm:inline">Asistente ACR</span>
            </Link>
            {showNavForAuthenticatedUser && (
              <div className="flex space-x-1 sm:space-x-2 md:space-x-4 overflow-x-auto py-2">
                {visibleMenuItems.map((item) => {
                  let isActive = false;
                  if (item.href === '/inicio') { 
                      isActive = pathname === '/inicio' || pathname === '/';
                  } else if (item.section === 'config' || item.section === 'usuario' || item.section === 'analisis') {
                    isActive = pathname.startsWith(item.href);
                  } else {
                    isActive = pathname === item.href;
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2 transition-colors duration-150 ease-in-out shrink-0',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <item.icon className="h-5 w-5 sm:h-4 sm:w-4" />
                      <span className="hidden md:inline">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Auth Buttons Section */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {hasMounted ? (
              <>
                {currentUser ? (
                  <>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {userProfile?.name || currentUser.email} ({userProfile?.role || '...'})
                    </span>
                    <Button onClick={handleLogout} variant="outline" size="sm">
                      <LogOut className="h-4 w-4 mr-0 sm:mr-2" />
                      <span className="hidden sm:inline">Cerrar Sesión</span>
                    </Button>
                  </>
                ) : (
                  !isPublicPage && (
                    <Button asChild variant="default" size="sm">
                      <Link href="/login">
                        <LogInIcon className="h-4 w-4 mr-0 sm:mr-2" />
                        <span className="hidden sm:inline">Iniciar Sesión</span>
                      </Link>
                    </Button>
                  )
                )}
              </>
            ) : (
              <div className="h-9 w-28" /> // Render an empty div as a placeholder to avoid hydration mismatch
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
