
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart3, FileText, SettingsIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { href: '/inicio', label: 'Inicio', icon: Home },
  { href: '/analisis', label: 'Análisis', icon: BarChart3 },
  { href: '/informes', label: 'Informes', icon: FileText },
  { href: '/config', label: 'Config.', icon: SettingsIcon },
];

export function TopNavigation() {
  const pathname = usePathname();

  return (
    <header className="bg-card border-b border-border shadow-sm no-print sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-16">
          <div className="flex space-x-1 sm:space-x-2 md:space-x-4">
            {menuItems.map((item) => {
              // Handle root path '/' to also highlight '/inicio'
              const isActive = (pathname === '/' && item.href === '/inicio') || (item.href !== '/' && pathname.startsWith(item.href)) || (pathname === item.href) ;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2 transition-colors duration-150 ease-in-out',
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
        </div>
      </div>
    </header>
  );
}
