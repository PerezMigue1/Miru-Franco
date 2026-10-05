'use client';

import { useRouter } from 'next/navigation';
import { Inbox, Mail } from 'lucide-react';

interface EnlaceEnviadoProps {
  email?: string;
  onSwitchToLogin?: () => void;
}

export default function EnlaceEnviado({ 
  email,
  onSwitchToLogin
}: EnlaceEnviadoProps) {
  const router = useRouter();
  
  const handleSwitchToLogin = () => {
    if (onSwitchToLogin) {
      onSwitchToLogin();
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div>
        <div className="text-center">
          <div
            className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: 'color-mix(in srgb, var(--success) 18%, transparent)', color: 'var(--success-texto)' }}
          >
            <Mail size={30} aria-hidden />
          </div>

          <h2 className="mf-titulo-pagina mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
            Enlace Enviado
          </h2>

          <p className="mb-4 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            Hemos enviado un enlace de recuperación a:
          </p>

          {email && (
            <p className="mb-6 font-semibold break-all" style={{ color: 'var(--menu-texto-principal)' }}>
              {email}
            </p>
          )}

          <div className="mb-6 p-4 rounded-[10px] border" style={{
            backgroundColor: 'color-mix(in srgb, var(--info-texto) 10%, transparent)',
            borderColor: 'color-mix(in srgb, var(--info-texto) 35%, transparent)'
          }}>
            <p className="flex items-start justify-center gap-2 text-sm" style={{ color: 'var(--info-texto)' }}>
              <Inbox size={16} aria-hidden className="shrink-0 mt-0.5" />
              <span>Revisa tu bandeja de entrada y carpeta de spam. El enlace expirará en 10 minutos.</span>
            </p>
          </div>

          <p className="mb-6 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            Una vez que hagas clic en el enlace y cambies tu contraseña, serás redirigido automáticamente al inicio de sesión.
          </p>

          <button
            onClick={handleSwitchToLogin}
            className="mf-btn mf-btn-color w-full py-3 px-4 rounded-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              ['--btn-bg' as string]: 'var(--botones-principales)',
              ['--btn-bg-hover' as string]: 'var(--hover)',
              ['--btn-texto' as string]: 'var(--marfil)',
            }}
          >
            Volver a Iniciar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}










