
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, BarChart3, FileText, SettingsIcon, UserCheck, ListOrdered, DollarSign, LogOut, LogIn as LogInIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const mainMenuItems = [
  { href: '/inicio', label: 'Inicio', icon: Home, section: 'inicio', requiresAuth: true },
  { href: '/eventos', label: 'Eventos', icon: ListOrdered, section: 'eventos', requiresAuth: true },
  { href: '/analisis', label: 'Análisis', icon: BarChart3, section: 'analisis', requiresAuth: true },
  { href: '/informes', label: 'Informes', icon: FileText, section: 'informes', requiresAuth: true },
  { href: '/usuario/planes', label: 'Mis Tareas', icon: UserCheck, section: 'usuario', requiresAuth: true },
  { href: '/precios', label: 'Precios', icon: DollarSign, section: 'precios', requiresAuth: false },
  { href: '/config', label: 'Config.', icon: SettingsIcon, section: 'config', requiresAuth: true }, // Typically requires auth
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

  const visibleMenuItems = mainMenuItems.filter(item => !item.requiresAuth || (item.requiresAuth && currentUser));

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
                {userProfile.name || currentUser.email}
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
