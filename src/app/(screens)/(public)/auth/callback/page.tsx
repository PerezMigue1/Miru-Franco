'use client';

import { useEffect, useState, Suspense } from 'react';
import Image from 'next/image';
import { CircleX } from 'lucide-react';
import SuperficieCliente from '../../../../components/cliente/SuperficieCliente';
import SelloConfirmacion from '../../../../components/cliente/SelloConfirmacion';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '../../../../services/client';
import { getBackendBaseUrl } from '../../../../services/config';
import { markSessionStart } from '../../../../utils/security';
import { normalizarUsuarioAlmacenado } from '../../../../utils/normalizarUsuarioAlmacenado';
import { emitMiruUserStorageUpdated } from '../../../../utils/userStorageSync';
import { api } from '../../../../services/auth';
import { mergePerfilEnLocalStorage } from '../../../../services/perfil';
import { tomarRegresoDeGoogle } from '../../../../components/auth/redireccionTrasLogin';

/** Retraso sin `setTimeout(() => { ... })` para no disparar taint (URL → setTimeout) en Semgrep. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Autenticando con Google...');

  useEffect(() => {
    const handleCallback = async () => {
      // ✅ Según GUIA_ACTUALIZAR_FRONTEND_OAUTH_SEGURO.md
      // Ahora leemos 'code' en lugar de 'token'
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');
      const errorId = searchParams.get('id');

      // Detectar errores de Vercel (404: NOT_FOUND, DEPLOYMENT_NOT_FOUND)
      if (errorId?.includes('DEPLOYMENT_NOT_FOUND')) {
        setStatus('error');
        setMessage('Error de configuración: La URL de callback no coincide con el deployment. Por favor, verifica la configuración de Google OAuth en el backend.');
        await sleep(3000);
        router.push('/?error=callback_config_error');
        return;
      }

      // Si hay error de OAuth (ej: usuario canceló)
      if (errorParam) {
        setStatus('error');
        let errorMessage = 'Error en la autenticación. Por favor intenta de nuevo.';
        switch (errorParam) {
          case 'authentication_failed':
            errorMessage = 'No se pudo completar la autenticación';
            break;
          case 'access_denied':
            errorMessage = 'Autorización cancelada';
            break;
          case 'callback_config_error':
            errorMessage = 'Error de configuración: La URL de callback no está correctamente configurada. Por favor, contacta al administrador.';
            break;
          default:
            errorMessage = `Error: ${errorParam}`;
        }
        setMessage(errorMessage);
        await sleep(3000);
        router.push('/?error=google_auth_failed');
        return;
      }

      // Si hay código, intercambiarlo por token
      if (code) {
        try {
          setMessage('Intercambiando código por token...');
          const BACKEND_BASE = getBackendBaseUrl();
          
          // ✅ Intercambiar código por token según la guía
          const data = await apiClient.post<{ 
            success: boolean; 
            token?: string; 
            user?: unknown;
            message?: string;
            error?: string;
            renovarEnSegundos?: number;
          }>('/api/auth/exchange-code', { code }, BACKEND_BASE);

          // El backend entrega la sesión como cookie httpOnly (sin token en el cuerpo).
          if (data.success) {
            markSessionStart(data.renovarEnSegundos);

            // Opcional: Guardar información del usuario si viene en la respuesta (user o usuario)
            const userData = (data as { user?: unknown; usuario?: unknown }).user ?? (data as { user?: unknown; usuario?: unknown }).usuario;
            if (userData) {
              localStorage.setItem('user', JSON.stringify(normalizarUsuarioAlmacenado(userData)));
              emitMiruUserStorageUpdated();
            }

            // Completar nombre/foto/rol en localStorage (Google suele mandar poco en el primer JSON).
            try {
              const prof = await api.getProfile();
              if (prof.success && prof.data) {
                mergePerfilEnLocalStorage(prof.data);
              }
            } catch {
              /* sin red o /me: el header se actualizará al entrar a /perfil */
            }

            setStatus('success');
            setMessage('¡Autenticación exitosa! Redirigiendo...');
            
            // Esperar un momento para mostrar el mensaje de éxito
            await sleep(1500);
            // Regresa a la página de la que venía antes de ir a Google, para cualquier rol.
            router.push(tomarRegresoDeGoogle());
          } else {
            setStatus('error');
            setMessage(data.message || data.error || 'Error al obtener token');
            await sleep(3000);
            router.push('/?error=auth_failed');
          }
        } catch (error: unknown) {
          console.error('Error intercambiando código:', error);
          setStatus('error');
          const errorMessage = error instanceof Error 
            ? error.message 
            : 'Error al intercambiar código por token';
          setMessage(errorMessage);
          await sleep(3000);
          router.push('/?error=auth_failed');
        }
      } else {
        // No hay código ni error, redirigir al login
        setStatus('error');
        setMessage('Código de autenticación no proporcionado');
        await sleep(2000);
        router.push('/');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  // Espera: la pantalla de carga de marca (loading.tsx); resultado: ícono + mensaje sobre el tema.
  if (status === 'loading') {
    return <PantallaCargaMarca mensaje={message} />;
  }

  const exito = status === 'success';
  return (
    <SuperficieCliente
      className="min-h-dvh flex items-center justify-center px-6"
      style={{ backgroundColor: 'var(--fondo-general)' }}
    >
      <div className="mf-entrada w-full max-w-md text-center" role={exito ? 'status' : 'alert'}>
        {exito ? (
          <div className="mb-5 flex justify-center">
            <SelloConfirmacion />
          </div>
        ) : (
          <span
            className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full"
            style={{ backgroundColor: 'color-mix(in srgb, var(--danger-texto) 14%, transparent)', color: 'var(--danger-texto)' }}
          >
            <CircleX size={32} strokeWidth={1.75} aria-hidden />
          </span>
        )}
        <h1 className="mf-titulo-pagina" style={{ color: 'var(--menu-texto-principal)' }}>
          {exito ? '¡Autenticación exitosa!' : 'No pudimos iniciar sesión con Google'}
        </h1>
        <p className="mt-3 text-base" style={{ color: 'var(--encabezados-alterno)' }}>
          {message}
        </p>
        {!exito && (
          <button
            type="button"
            onClick={() => router.push('/')}
            className="mf-btn mf-btn-color mt-7 inline-flex min-h-12 items-center justify-center rounded-full px-7 text-sm font-semibold"
            style={{
              ['--btn-bg' as string]: 'var(--botones-principales)',
              ['--btn-bg-hover' as string]: 'var(--hover)',
              ['--btn-texto' as string]: '#F2F1ED',
            }}
          >
            Volver al inicio
          </button>
        )}
      </div>
    </SuperficieCliente>
  );
}

/** Misma pantalla de carga del sitio (loading.tsx) con el mensaje del paso actual. */
function PantallaCargaMarca({ mensaje }: { mensaje: string }) {
  return (
    <div className="loading-screen" role="status">
      <div className="loading-screen__stage">
        <div className="loading-screen__mark">
          <div className="loading-screen__glow" />
          <div className="loading-screen__ripple" />
          <div className="loading-screen__ripple" />
          <div className="loading-screen__ripple" />
          <div className="loading-screen__logo">
            <Image src="/logo-miru.jpg" alt="Mirú Franco" fill sizes="148px" priority />
          </div>
        </div>
        <div className="loading-screen__word">
          <div className="loading-screen__status">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
            <span>{mensaje || 'Conectando con Google'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<PantallaCargaMarca mensaje="Conectando con Google" />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
