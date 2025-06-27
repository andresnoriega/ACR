'use client';

import { useEffect } from 'react';
import { redirect } from 'next/navigation';

// This page has been disabled and now redirects to the home page.
export default function PreciosPage() {
  useEffect(() => {
    redirect('/inicio');
  }, []);

  return null;
}
