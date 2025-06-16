
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, BarChart3, FileText, SettingsIcon, UserCheck, ListOrdered, DollarSign, LogOut, LogIn as LogInIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import React from 'react'; // Import React for useMemo

const mainMenuItemsBase = [
  { href: '/inicio', label: 'Inicio', icon: Home, section: 'inicio', requiresAuth: true, allowedRoles: ['Admin', 'Analista', 'Revisor', 'Super User', 'Usuario Pendiente'] },
  { href: '/eventos', label: 'Eventos', icon: ListOrdered, section: 'eventos', requiresAuth: true, allowedRoles: ['Admin', 'Analista', 'Revisor', 'Super User'] },
  { href: '/analisis', label: 'Análisis', icon: BarChart3, section: 'analisis', requiresAuth: true, allowedRoles: ['Admin', 'Analista', 'Super User'] },
  { href: '/informes', label: 'Informes', icon: FileText, section: 'informes', requiresAuth: true, allowedRoles: ['Admin', 'Analista', 'Revisor', 'Super User'] },
  { href: '/usuario/planes', label: 'Mis Tareas', icon: UserCheck, section: 'usuario', requiresAuth: true, allowedRoles: ['Admin', 'Analista', 'Revisor', 'Super User'] },
  { href: '/precios', label: 'Precios', icon: DollarSign, section: 'precios', requiresAuth: false, allowedRoles: [] },
  { href: '/config', label: 'Config.', icon: SettingsIcon, section: 'config', requiresAuth: true, allowedRoles: ['Admin', 'Super User'] },
];

export function TopNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logoutUser, loadingAuth, userProfile } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logoutUser();
      toast({ title: 'Sesión Cerrada', description: 'Ha cerrado sesión exitosamente.' });
      router.push('/login');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      toast({ title: 'Error', description: 'No se pudo cerrar la sesión.', variant: 'destructive' });
    }
  };

  const visibleMenuItems = React.useMemo(() => {
    // If auth is still loading, or if user is logged in but profile hasn't loaded yet,
    // show only public items or a minimal set to avoid flashing incorrect items.
    // For this iteration, we'll filter normally; if loadingAuth is true, userProfile might be null.
    if (loadingAuth && !currentUser) { // Only restrict if truly loading and no user yet
        return mainMenuItemsBase.filter(item => !item.requiresAuth);
    }

    return mainMenuItemsBase.filter(item => {
      if (!item.requiresAuth) {
          return true;
      }
      if (!currentUser) {
          return false;
      }
      // User is logged in (currentUser exists)
      if (item.allowedRoles.length === 0) { // No specific roles defined, visible to any authenticated user
          return true;
      }
      // Specific roles are required
      if (userProfile && typeof userProfile.role === 'string' && userProfile.role.trim() !== '') {
          return item.allowedRoles.includes(userProfile.role);
      }
      // If userProfile is not yet loaded, or role is invalid, item requiring specific role is hidden
      return false;
    });
  }, [currentUser, loadingAuth, userProfile]); // Key dependencies

  return (
    <header className="bg-card border-b border-border shadow-sm no-print sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex space-x-1 sm:space-x-2 md:space-x-4 overflow-x-auto py-2">
            {visibleMenuItems.map((item) => {
              let isActive = false;
              if (item.section === 'inicio') {
                isActive = pathname === '/' || pathname.startsWith('/inicio');
              } else if (item.section === 'usuario') {
                isActive = pathname.startsWith('/usuario');
              } else if (item.section === 'config') {
                isActive = pathname.startsWith('/config');
              } else if (item.section === 'precios') {
                isActive = pathname.startsWith('/precios');
              } else {
                isActive = pathname.startsWith(item.href);
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
          
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
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
          </div>
        </div>
      </div>
    </header>
  );
}
