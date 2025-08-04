'use client';

import { type ReactNode } from 'react';

// Se ha eliminado la lógica de useAuth, useEffect y la pantalla de carga
// para mejorar el rendimiento y evitar bloqueos.
// La gestión de permisos ahora se debe manejar en cada página de configuración individualmente.

export default function ConfigLayout({ children }: { children: ReactNode }) {
  // Simplemente renderiza los componentes hijos sin un layout de carga o verificación
  return <>{children}</>;
}
