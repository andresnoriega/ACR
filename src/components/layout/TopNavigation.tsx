
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, BarChart3, FileText, SettingsIcon, UserCheck, ListOrdered, DollarSign, LogOut, LogIn as LogInIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import React, { useState, useEffect } from 'react'; 

const mainMenuItemsBase = [
  { href: '/inicio', label: 'Inicio', icon: Home, section: 'inicio', requiresAuth: true, allowedRoles: ['Admin', 'Analista', 'Revisor', 'Super User', 'Usuario Pendiente'] },
  { href: '/eventos', label: 'Eventos', icon: ListOrdered, section: 'eventos', requiresAuth: true, allowedRoles: ['Admin', 'Analista', 'Revisor', 'Super User'] },
  { href: '/analisis', label: 'Análisis', icon: BarChart3, section: 'analisis', requiresAuth: true, allowedRoles: ['Admin', 'Analista', 'Super User'] },
  { href: '/informes', label: 'Informes', icon: FileText, section: 'informes', requiresAuth: true, allowedRoles: ['Admin', 'Analista', 'Revisor', 'Super User'] },
  { href: '/usuario/planes', label: 'Mis Tareas', icon: UserCheck, section: 'usuario', requiresAuth: true, allowedRoles: ['Admin', 'Analista', 'Revisor', 'Super User'] },
  { href: '/precios', label: 'Precios', icon: DollarSign, section: 'precios', requiresAuth: false, allowedRoles: [] },
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

  const visibleMenuItems = React.useMemo(() => {
    if (!hasMounted) {
      return []; // Return empty array if not mounted on client yet, ensures server and initial client have same list to map (none)
    }

    // Logic for when hasMounted is true
    return mainMenuItemsBase.filter(item => {
      if (item.href === '/precios') {
        return (pathname === '/login' || pathname === '/registro') && !currentUser;
      }

      if (!item.requiresAuth) {
        return true; // Public items are always visible
      }

      // Items requiring authentication
      if (!currentUser) {
        return false; // Not visible if no user
      }

      // Authenticated, check roles
      if (item.allowedRoles.length === 0) {
        // Requires auth, but no specific roles (e.g., /inicio for 'Usuario Pendiente')
        return true;
      }

      // Requires specific roles
      if (userProfile && typeof userProfile.role === 'string' && userProfile.role.trim() !== '') {
        return item.allowedRoles.includes(userProfile.role);
      }
      
      // User authenticated, profile exists, but role doesn't match or is empty
      return false;
    });
  }, [currentUser, loadingAuth, userProfile, pathname, hasMounted]);


  return (
    <header className="bg-card border-b border-border shadow-sm no-print sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex space-x-1 sm:space-x-2 md:space-x-4 overflow-x-auto py-2">
            {hasMounted ? (
              visibleMenuItems.map((item) => {
                let isActive = false;
                // More specific active state logic
                if (item.section === 'inicio') {
                  isActive = pathname === '/' || pathname === '/inicio';
                } else if (item.href === '/analisis') {
                  isActive = pathname.startsWith('/analisis'); // Catches /analisis and /analisis?id=...
                } else if (item.href === '/config') {
                    isActive = pathname.startsWith('/config');
                } else if (item.href === '/usuario/planes') {
                    isActive = pathname.startsWith('/usuario');
                } else {
                  isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'));
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
              })
            ) : (
              null // Render nothing for menu items until mounted
            )}
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {hasMounted ? (
              <>
                {!loadingAuth && currentUser && userProfile && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {userProfile.name || currentUser.email} ({userProfile.role || 'Rol no definido'})
                  </span>
                )}
                {!loadingAuth && (
                  currentUser ? (
                    <Button onClick={handleLogout} variant="outline" size="sm">
                      <LogOut className="h-4 w-4 mr-0 sm:mr-2" />
                      <span className="hidden sm:inline">Cerrar Sesión</span>
                    </Button>
                  ) : (
                    pathname !== '/login' && pathname !== '/registro' && (
                      <Button asChild variant="default" size="sm">
                        <Link href="/login">
                          <LogInIcon className="h-4 w-4 mr-0 sm:mr-2" />
                          <span className="hidden sm:inline">Iniciar Sesión</span>
                        </Link>
                      </Button>
                    )
                  )
                )}
              </>
            ) : (
                null // Render nothing for auth buttons until mounted
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
