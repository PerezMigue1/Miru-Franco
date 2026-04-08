'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { hasValidToken } from '../../../utils/security';
import ModuleLayout from '../../../components/layouts/ModuleLayout';
import UserProfile from '../../../components/perfil/UserProfile';

export default function PerfilPage() {
  const router = useRouter();
  const isAuthed = typeof window !== 'undefined' && hasValidToken();

  useEffect(() => {
    if (!isAuthed) {
      router.replace('/login?returnUrl=/perfil');
    }
  }, [isAuthed, router]);

  if (!isAuthed) {
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

