'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir a login por defecto
    router.push('/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-fondo-general">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-menu-texto-principal mx-auto mb-4"></div>
        <p className="text-texto-fondo-oscuro">Redirigiendo...</p>
      </div>
    </div>
  );
}
