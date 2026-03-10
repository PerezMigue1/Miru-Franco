'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hasValidToken } from '../../../utils/security';
import ModuleLayout from '../../../components/layouts/ModuleLayout';
import UserProfile from '../../../components/perfil/UserProfile';

export default function PerfilPage() {
  const router = useRouter();
  const [allowed] = useState<boolean | null>(() => (hasValidToken() ? true : null));

  useEffect(() => {
    if (!hasValidToken()) {
      router.replace('/login?returnUrl=/perfil');
    }
  }, [router]);

  if (allowed !== true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-fondo-general">
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

