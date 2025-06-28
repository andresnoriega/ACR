
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page has been disabled and now redirects to the home page.
export default function PreciosPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/inicio');
  }, [router]);

  return null;
}
