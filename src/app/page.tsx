
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/inicio');
  }, [router]);

  return (
    <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] text-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg text-muted-foreground">Redirigiendo a la página de inicio...</p>
    </div>
  );
}
