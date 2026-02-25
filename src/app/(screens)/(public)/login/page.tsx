'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import AuthContainer from '../../../components/auth/AuthContainer';

/** Rutas permitidas para redirigir después del login (evita open redirect). */
const REDIRECT_ALLOWED_PREFIXES = ['/admin', '/perfil', '/cliente'];

const ADMIN_ROL_VALORES = ['admin', 'administrador'];

function safeReturnUrl(returnUrl: string | null): string | null {
  if (!returnUrl || typeof returnUrl !== 'string') return null;
  const path = returnUrl.startsWith('/') ? returnUrl : `/${returnUrl}`;
  const allowed = REDIRECT_ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + '/'));
  return allowed ? path : null;
}

function isAdminRol(rol: string | undefined): boolean {
  if (!rol) return false;
  const r = rol.toLowerCase().trim();
  return ADMIN_ROL_VALORES.some((allowed) => r === allowed || r.includes('admin'));
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = safeReturnUrl(searchParams.get('returnUrl'));

  const handleAuthSuccess = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (token) {
      if (returnUrl) {
        router.push(returnUrl);
      } else {
        const userJson = localStorage.getItem('user');
        let destino = '/home';
        if (userJson) {
          try {
            const user = JSON.parse(userJson) as { rol?: string; role?: string };
            const rol = user.rol ?? user.role;
            if (isAdminRol(rol)) destino = '/admin';
          } catch {
            // ignorar
          }
        }
        router.push(destino);
      }
    } else {
      alert('Error: No se pudo guardar la sesión. Por favor intenta nuevamente.');
    }
  };

  return (
    <div className="relative min-h-screen">
      <Link
        href="/home"
        className="absolute top-4 left-4 z-10 text-sm text-menu-texto-principal hover:underline"
      >
        ← Volver al inicio
      </Link>
      <AuthContainer
        initialView="login"
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
      <LoginContent />
    </Suspense>
  );
}
