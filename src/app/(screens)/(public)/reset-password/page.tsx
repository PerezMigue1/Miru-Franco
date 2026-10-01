'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import SuperficieCliente from '../../../components/cliente/SuperficieCliente';
import ResetPassword from '../../../components/auth/ResetPassword';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const handlePasswordReset = () => {
    // Guardar el email en sessionStorage para mostrarlo en el login
    if (email && typeof window !== 'undefined') {
      sessionStorage.setItem('lastResetEmail', email);
    }
    
    // Limpiar cualquier parámetro de la URL antes de redirigir
    router.push('/login?passwordChanged=true');
    // Forzar recarga para limpiar cualquier estado residual (sin callback que dispare taint URL → setTimeout)
    void (async () => {
      await sleep(100);
      if (typeof window !== 'undefined') {
        window.location.assign('/login?passwordChanged=true');
      }
    })();
  };

  const handleSwitchToLogin = () => {
    router.push('/login');
  };

  return (
    <ResetPassword
      token={token || undefined}
      email={email || undefined}
      onPasswordReset={handlePasswordReset}
      onSwitchToLogin={handleSwitchToLogin}
    />
  );
}

/** Llega desde el enlace del correo: misma cabecera de marca que el acceso, formulario centrado. */
export default function ResetPasswordPage() {
  return (
    <SuperficieCliente className="mf-auth" style={{ backgroundColor: 'var(--fondo-general)' }}>
      <header className="mf-auth__cabecera mf-auth__cabecera--fija">
        <Link href="/home" className="mf-auth__volver">
          <ArrowLeft size={16} aria-hidden />
          Volver al inicio
        </Link>
        <span className="relative h-10 w-10">
          <Image src="/logo-miru.jpg" alt="Mirú Franco" fill className="object-contain" sizes="40px" priority />
        </span>
      </header>
      <main className="flex justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-md">
          <Suspense
            fallback={
              <div className="space-y-4" aria-busy="true" aria-label="Cargando">
                <div className="mf-skeleton h-9 w-3/4" />
                <div className="mf-skeleton h-11 w-full" />
                <div className="mf-skeleton h-11 w-full" />
                <div className="mf-skeleton h-12 w-full" />
              </div>
            }
          >
            <ResetPasswordContent />
          </Suspense>
        </div>
      </main>
    </SuperficieCliente>
  );
}
