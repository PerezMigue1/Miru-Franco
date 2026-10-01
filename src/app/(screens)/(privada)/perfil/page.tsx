'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { hasValidToken } from '../../../utils/security';
import ModuleLayout from '../../../components/layouts/ModuleLayout';
import UserProfile from '../../../components/perfil/UserProfile';

function sinSuscripcion() {
  return () => {};
}

export default function PerfilPage() {
  const router = useRouter();
  // En el servidor no hay sesión que leer: el primer render del cliente coincide con el del servidor
  // (sin error de hidratación) y luego muestra el perfil si hay sesión.
  const isAuthed = useSyncExternalStore(sinSuscripcion, hasValidToken, () => false);

  useEffect(() => {
    if (!hasValidToken()) {
      router.replace('/login?returnUrl=/perfil');
    }
  }, [router]);

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

