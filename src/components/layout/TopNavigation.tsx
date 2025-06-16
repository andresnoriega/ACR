
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, BarChart3, FileText, SettingsIcon, UserCheck, ListOrdered, DollarSign, LogOut, LogIn as LogInIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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

  const visibleMenuItems = mainMenuItemsBase.filter(item => {
    if (!item.requiresAuth) { // Item is public
        return true;
    }
    // Item requires authentication
    if (!currentUser) { // User is not logged in
        return false;
    }
    // User is logged in
    // If item is for ANY authenticated user (no specific roles defined in allowedRoles)
    if (item.allowedRoles.length === 0) { 
        return true;
    }
    // Item requires specific roles. User must have a profile and a role that matches.
    if (userProfile && typeof userProfile.role === 'string' && userProfile.role.trim() !== '' && item.allowedRoles.includes(userProfile.role)) {
        return true;
    }
    // Default: if none of the above, hide the item
    return false;
  });

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
