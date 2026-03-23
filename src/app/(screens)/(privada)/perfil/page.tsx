'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hasValidToken } from '../../../utils/security';
import ModuleLayout from '../../../components/layouts/ModuleLayout';
import UserProfile from '../../../components/perfil/UserProfile';

export default function PerfilPage() {
  const router = useRouter();
  /** Siempre null al inicio: en SSR no hay localStorage; evita hydration mismatch con ModuleLayout. */
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!hasValidToken()) {
      router.replace('/login?returnUrl=/perfil');
      return;
    }
    setAllowed(true);
  }, [router]);

  if (allowed !== true) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ backgroundColor: 'var(--fondo-general)' }}
      >
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-menu-texto-principal" />
      </div>
    );
  }

  return (
    <ModuleLayout>
      <UserProfile />
    </ModuleLayout>
  );
}

