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
        <p role="status" className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
          Redirigiendo a inicio de sesión…
        </p>
      </div>
    );
  }

  return (
    <ModuleLayout>
      <UserProfile />
    </ModuleLayout>
  );
}

