
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, BarChart3, FileText, SettingsIcon, UserCheck, ListOrdered, DollarSign, LogOut, LogIn as LogInIcon } from 'lucide-react';
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
  { href: '/config', label: 'Config.', icon: SettingsIcon, section: 'config', requiresAuth: true, allowedRoles: ['Super User'] },
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
    // 1. Before hydration on client, or if not authenticated, show a minimal public menu.
    if (!hasMounted || !currentUser) {
      return mainMenuItemsBase.filter(item => {
        if (item.href === '/precios') {
          return (pathname === '/login' || pathname === '/registro');
        }
        return !item.requiresAuth;
      });
    }

    // 2. User is authenticated (currentUser exists).
    // If the main auth state is still loading OR the user profile specifically hasn't loaded yet,
    // show a minimal but stable menu for authenticated users (just 'Inicio').
    // This prevents an empty menu flash after login.
    if (loadingAuth || !userProfile) {
        return mainMenuItemsBase.filter(item => item.href === '/inicio');
    }

    // 3. Now, user is authenticated and their profile is loaded.
    // We can apply the full role-based logic.
    return mainMenuItemsBase.filter(item => {
        if (!item.requiresAuth) { // This handles public pages like /precios if ever needed post-login
            // Re-check for /precios specifically, as it should only show on login/register pages
            if (item.href === '/precios') {
                return (pathname === '/login' || pathname === '/registro');
            }
            return true;
        }

        // Handle 'Usuario Pendiente' as a special case
        if (userProfile.role === 'Usuario Pendiente') {
            return item.href === '/inicio';
        }
        
        // For all other authenticated users with a role, check their permissions
        return item.allowedRoles.includes(userProfile.role);
    });

  }, [hasMounted, pathname, currentUser, loadingAuth, userProfile]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      toast({ title: 'Sesión Cerrada', description: 'Has cerrado sesión exitosamente.' });
      router.push('/login');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      toast({ title: 'Error', description: 'No se pudo cerrar la sesión.', variant: 'destructive' });
    }
  };

  return (
    <header className="bg-card border-b border-border shadow-sm no-print sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Menu Items Section */}
          <div className="flex space-x-1 sm:space-x-2 md:space-x-4 overflow-x-auto py-2">
            {visibleMenuItems.map((item) => {
              let isActive = false;
              if (item.href === '/') { 
                  isActive = pathname === '/';
                  if (item.section === 'inicio') isActive = isActive || pathname === '/inicio';
              } else if (item.section === 'inicio') {
                isActive = pathname === '/inicio' || pathname === '/';
              } else if (item.href === '/analisis') {
                isActive = pathname.startsWith('/analisis'); 
              } else if (item.href === '/config') {
                  isActive = pathname.startsWith('/config');
              } else if (item.href === '/usuario/planes') {
                  isActive = pathname.startsWith('/usuario');
              } else {
                isActive = pathname === item.href || pathname.startsWith(item.href + '/');
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
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          
          {/* Auth Buttons Section */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {hasMounted && !loadingAuth ? (
              <>
                {currentUser && userProfile && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {userProfile.name || currentUser.email} ({userProfile.role || 'Rol no definido'})
                  </span>
                )}
                {currentUser ? (
                  <Button onClick={handleLogout} variant="outline" size="sm">
                    <LogOut className="h-4 w-4 mr-0 sm:mr-2" />
                    <span className="hidden sm:inline">Cerrar Sesión</span>
                  </Button>
                ) : (
                  (pathname !== '/login' && pathname !== '/registro') && (
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
              <div className="h-9 w-28"></div> 
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
