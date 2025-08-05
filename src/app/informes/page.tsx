
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InformesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/inicio');
  }, [router]);

  return null;
}
