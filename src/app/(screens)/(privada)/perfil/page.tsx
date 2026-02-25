'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '../../../utils/security';
import ModuleLayout from '../../../components/layouts/ModuleLayout';
import UserProfile from '../../../components/perfil/UserProfile';

export default function PerfilPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token || token.trim() === '') {
      // replace para que "atrás" no vuelva a perfil (va a la página anterior, ej. home)
      router.replace('/login?returnUrl=/perfil');
      return;
    }
    setAllowed(true);
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


