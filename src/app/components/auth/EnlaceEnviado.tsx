'use client';

import { useRouter } from 'next/navigation';
import { colors, colorsWithOpacity } from '../../utils/colors';

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
      <div className="rounded-lg shadow-lg p-8 border bg-header-footer" style={{ borderColor: colorsWithOpacity.bordeSutil }}>
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          
          <h2 className="text-page-title mb-2 text-texto-fondo-oscuro">
            Enlace Enviado
          </h2>
          
          <p className="mb-4 text-sm text-texto-fondo-oscuro">
            Hemos enviado un enlace de recuperación a:
          </p>
          
          {email && (
            <p className="mb-6 font-semibold text-texto-fondo-oscuro">
              {email}
            </p>
          )}
          
          <div className="mb-6 p-4 rounded-lg border" style={{ 
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderColor: 'rgba(59, 130, 246, 0.3)'
          }}>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              📧 Revisa tu bandeja de entrada y carpeta de spam. El enlace expirará en 10 minutos.
            </p>
          </div>
          
          <p className="mb-6 text-sm text-texto-fondo-oscuro">
            Una vez que hagas clic en el enlace y cambies tu contraseña, serás redirigido automáticamente al inicio de sesión.
          </p>

          <button
            onClick={handleSwitchToLogin}
            className="w-full py-3 px-4 rounded-lg text-white font-medium hover:opacity-90 transition-colors bg-botones-principales"
            style={{ backgroundColor: colors.botonesPrincipales }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.hover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.botonesPrincipales}
          >
            Volver a Iniciar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}


