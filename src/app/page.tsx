
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export interface UploadedFile {
    name: string;
    size: number;
    type: string;
    url: string;
    tags: string[];
    fullPath: string;
    uploadedAt: string;
}

export type SortKey = 'name' | 'size' | 'type' | 'uploadedAt';
export type SortDirection = 'asc' | 'desc';


export default function RootPage() {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth) {
      if (currentUser) {
        // If user is logged in, redirect to the main dashboard/home page
        router.replace('/inicio');
      } else {
        // If user is not logged in, redirect to the login page
        router.replace('/login');
      }
    }
  }, [currentUser, loadingAuth, router]);

  // Muestra un loader mientras se determina el estado de autenticación
  return (
    <div className="flex flex-col justify-center items-center min-h-screen">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg text-muted-foreground">Cargando...</p>
    </div>
  );
}

    