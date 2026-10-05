'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, MapPin } from 'lucide-react';
import SuperficieCliente from '../cliente/SuperficieCliente';
import { showAlert } from '../../utils/toast';
import { SITE_NAME } from '../../utils/seo';
import { destinoTrasLogin } from './redireccionTrasLogin';
import Login from './Login';
import Register from './Register';
import ForgotPassword from './ForgotPassword';
import ForgotPasswordOTP from './ForgotPasswordOTP';
import ForgotPasswordSecurityQuestions from './ForgotPasswordSecurityQuestions';
import ForgotPasswordSMS from './ForgotPasswordSMS';
import ResetPassword from './ResetPassword';
import EnlaceEnviado from './EnlaceEnviado';

type AuthView = 'login' | 'register' | 'forgot-email' | 'forgot-otp' | 'forgot-security' | 'forgot-sms' | 'reset-password' | 'enlace-enviado';
type VistaRecuperacion = Exclude<AuthView, 'login' | 'register'>;
/** Qué muestra la ruta: acceso (formulario a la derecha), registro (a la izquierda) o recuperación. */
type VistaRuta = 'login' | 'register' | 'recuperar';

interface AuthContainerProps {
  initialView?: AuthView;
  onAuthSuccess?: () => void;
}

const RUTAS: Record<VistaRuta, string> = {
  login: '/login',
  register: '/register',
  recuperar: '/forgot-password',
};

const TITULOS: Record<VistaRuta, string> = {
  login: 'Iniciar sesión',
  register: 'Crear cuenta',
  recuperar: 'Recuperar contraseña',
};

function vistaDesdeRuta(pathname: string | null, inicial: AuthView): VistaRuta {
  if (pathname === '/register') return 'register';
  if (pathname === '/forgot-password') return 'recuperar';
  if (pathname === '/login') return 'login';
  if (inicial === 'register') return 'register';
  return inicial === 'login' ? 'login' : 'recuperar';
}

/**
 * Autenticación con panel de marca deslizante (DESIGN.md).
 * - Acceso: panel a la izquierda, formulario a la derecha.
 * - Registro: el formulario aparece a la izquierda y el panel se desliza a la derecha, tapando el
 *   acceso. Recuperar contraseña usa el lado del acceso.
 * Los dos formularios viven montados a la vez; cambiar de vista usa history.pushState (integrado
 * con el router de Next), así /login, /register y /forgot-password siguen funcionando por URL
 * directa y el botón Atrás del navegador mueve el panel de vuelta.
 * En móvil no hay columnas: cabecera de marca compacta y pestañas.
 */
export default function AuthContainer({ initialView = 'login', onAuthSuccess }: AuthContainerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const vista = vistaDesdeRuta(pathname, initialView);
  const lado: 'acceso' | 'registro' = vista === 'register' ? 'registro' : 'acceso';

  const [recuperacion, setRecuperacion] = useState<VistaRecuperacion>(
    initialView === 'login' || initialView === 'register' ? 'forgot-email' : initialView
  );
  const [vistaAnterior, setVistaAnterior] = useState(vista);
  const [recoveryIdentifier, setRecoveryIdentifier] = useState<string>('');
  const [recoveryEmail, setRecoveryEmail] = useState<string>('');
  const [claveRegistro, setClaveRegistro] = useState(0);
  const [haCambiado, setHaCambiado] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  // Al salir de recuperación, la próxima vez empieza desde el primer paso (ajuste en render).
  if (vista !== vistaAnterior) {
    setVistaAnterior(vista);
    setHaCambiado(true);
    if (vista !== 'recuperar') setRecuperacion('forgot-email');
  }

  // Título de la pestaña y foco en el formulario que queda a la vista (lectores de pantalla).
  const montado = useRef(false);
  useEffect(() => {
    document.title = `${TITULOS[vista]} | ${SITE_NAME}`;
    if (!montado.current) {
      montado.current = true;
      return;
    }
    const activo = contenedor.current?.querySelector<HTMLElement>(`[data-lado-formulario="${lado}"] h1, [data-lado-formulario="${lado}"] h2`);
    activo?.setAttribute('tabindex', '-1');
    activo?.focus({ preventScroll: true });
  }, [vista, lado]);

  const irA = (destino: VistaRuta) => {
    if (destino === vista) return;
    window.history.pushState(null, '', RUTAS[destino]);
  };

  const handleSwitchToRegister = () => irA('register');
  const handleSwitchToLogin = () => irA('login');
  const handleSwitchToRecovery = () => irA('recuperar');

  const handleLoginSuccess = () => {
    if (initialView === 'login' && onAuthSuccess) {
      onAuthSuccess();
      return;
    }
    const destino = destinoTrasLogin(window.location.search);
    if (destino) router.push(destino);
    else showAlert('Error: No se pudo guardar la sesión. Por favor intenta nuevamente.');
  };

  const handleRegisterSuccess = () => {
    // Después del registro, al acceso (el formulario de registro se limpia para la próxima vez)
    setClaveRegistro((k) => k + 1);
    irA('login');
  };

  const handleEmailSent = (email: string) => {
    // Cuando se envía el enlace de recuperación, mostrar pantalla de éxito
    setRecoveryEmail(email);
    setRecuperacion('enlace-enviado');
  };

  const handleOTPCodeVerified = (email: string, token: string) => {
    // Cuando se verifica el código OTP, guardar token con expiración de 10 minutos
    setRecoveryIdentifier(email);
    localStorage.setItem('resetPasswordToken', token);
    localStorage.setItem('resetPasswordEmail', email);
    localStorage.setItem('resetPasswordExpires', String(Date.now() + 10 * 60 * 1000));
    sessionStorage.setItem('resetToken', token); // Para compatibilidad
    setRecuperacion('reset-password');
  };

  const handleSecurityQuestionsVerified = (email: string, token?: string) => {
    setRecoveryIdentifier(email);
    // Si hay token, guardarlo con expiración de 10 minutos
    if (token) {
      localStorage.setItem('resetPasswordToken', token);
      localStorage.setItem('resetPasswordEmail', email);
      localStorage.setItem('resetPasswordExpires', String(Date.now() + 10 * 60 * 1000));
      sessionStorage.setItem('resetToken', token); // Para compatibilidad
    }
    setRecuperacion('reset-password');
  };

  const handleSMSCodeVerified = (email: string, token: string) => {
    setRecoveryIdentifier(email);
    localStorage.setItem('resetPasswordToken', token);
    localStorage.setItem('resetPasswordEmail', email);
    localStorage.setItem('resetPasswordExpires', String(Date.now() + 10 * 60 * 1000));
    sessionStorage.setItem('resetToken', token);
    setRecuperacion('reset-password');
  };

  const handlePasswordReset = () => {
    // Después de restablecer la contraseña, volver al acceso
    setTimeout(() => {
      irA('login');
    }, 2000);
  };

  const panel = {
    login: {
      titulo: '¿Primera vez en Mirú Franco?',
      texto: 'Crea tu cuenta para reservar citas, comprar en la tienda y seguir tus pedidos.',
      accion: 'Crear cuenta',
      destino: 'register' as VistaRuta,
    },
    register: {
      titulo: '¿Ya tienes cuenta?',
      texto: 'Inicia sesión para ver tus citas, pedidos y promociones.',
      accion: 'Iniciar sesión',
      destino: 'login' as VistaRuta,
    },
    recuperar: {
      titulo: '¿Recordaste tu contraseña?',
      texto: 'Vuelve a iniciar sesión con tu correo y contraseña.',
      accion: 'Iniciar sesión',
      destino: 'login' as VistaRuta,
    },
  }[vista];

  return (
    <SuperficieCliente className="mf-auth" style={{ backgroundColor: 'var(--fondo-general)' }}>
      <div ref={contenedor} className="mf-auth__lienzo" data-lado={lado} data-animado={haCambiado ? 'true' : 'false'}>
        {/* Cabecera de marca compacta (móvil y tableta) */}
        <header className="mf-auth__cabecera">
          <Link href="/home" className="mf-auth__volver">
            <ArrowLeft size={16} aria-hidden />
            Volver al inicio
          </Link>
          <span className="relative h-10 w-10">
            <Image src="/logo-miru.jpg" alt="Mirú Franco" fill className="object-contain" sizes="40px" priority />
          </span>
        </header>

        {vista !== 'recuperar' && (
          <div className="mf-auth__pestanas" role="tablist" aria-label="Acceso o registro" data-lado={lado}>
            <span className="mf-auth__pestanas-indicador" aria-hidden />
            <button
              type="button"
              role="tab"
              aria-selected={lado === 'acceso'}
              aria-controls="auth-acceso"
              onClick={handleSwitchToLogin}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={lado === 'registro'}
              aria-controls="auth-registro"
              onClick={handleSwitchToRegister}
            >
              Crear cuenta
            </button>
          </div>
        )}

        {/* Lado izquierdo: registro */}
        <section
          id="auth-registro"
          className="mf-auth__lado mf-auth__lado--izquierdo"
          data-lado-formulario="registro"
          data-activo={lado === 'registro' ? 'true' : 'false'}
          inert={lado !== 'registro'}
          aria-label="Crear cuenta"
        >
          <div className="mf-auth__formulario">
            <Register key={claveRegistro} onSwitchToLogin={handleSwitchToLogin} onRegisterSuccess={handleRegisterSuccess} />
          </div>
        </section>

        {/* Lado derecho: acceso y recuperación */}
        <section
          id="auth-acceso"
          className="mf-auth__lado mf-auth__lado--derecho"
          data-lado-formulario="acceso"
          data-activo={lado === 'acceso' ? 'true' : 'false'}
          inert={lado !== 'acceso'}
          aria-label={vista === 'recuperar' ? 'Recuperar contraseña' : 'Iniciar sesión'}
        >
          <div key={vista === 'recuperar' ? recuperacion : 'login'} className="mf-auth__formulario mf-auth__cambio">
            {vista !== 'recuperar' && (
              <Login
                onSwitchToRegister={handleSwitchToRegister}
                onSwitchToRecovery={handleSwitchToRecovery}
                onLoginSuccess={handleLoginSuccess}
              />
            )}

            {vista === 'recuperar' && recuperacion === 'forgot-email' && (
              <ForgotPassword
                onSwitchToLogin={handleSwitchToLogin}
                onEmailSent={handleEmailSent}
                onSwitchToSecurityQuestions={() => setRecuperacion('forgot-security')}
                onSwitchToSMS={() => setRecuperacion('forgot-sms')}
              />
            )}

            {vista === 'recuperar' && recuperacion === 'forgot-sms' && (
              <ForgotPasswordSMS
                onSwitchToLogin={handleSwitchToLogin}
                onSwitchToEmail={() => setRecuperacion('forgot-email')}
                onSwitchToSecurityQuestions={() => setRecuperacion('forgot-security')}
                onCodeVerified={handleSMSCodeVerified}
              />
            )}

            {vista === 'recuperar' && recuperacion === 'forgot-otp' && (
              <ForgotPasswordOTP
                email={recoveryEmail}
                onCodeVerified={handleOTPCodeVerified}
                onBack={() => {
                  setRecoveryEmail('');
                  setRecuperacion('forgot-email');
                }}
                onSwitchToLogin={handleSwitchToLogin}
              />
            )}

            {vista === 'recuperar' && recuperacion === 'forgot-security' && (
              <ForgotPasswordSecurityQuestions
                onSwitchToLogin={handleSwitchToLogin}
                onSwitchToEmail={() => setRecuperacion('forgot-email')}
                onSwitchToSMS={() => setRecuperacion('forgot-sms')}
                onQuestionsVerified={handleSecurityQuestionsVerified}
              />
            )}

            {vista === 'recuperar' && recuperacion === 'reset-password' && (
              <ResetPassword
                onSwitchToLogin={handleSwitchToLogin}
                onPasswordReset={handlePasswordReset}
                identifier={recoveryIdentifier}
              />
            )}

            {vista === 'recuperar' && recuperacion === 'enlace-enviado' && (
              <EnlaceEnviado email={recoveryEmail} onSwitchToLogin={handleSwitchToLogin} />
            )}
          </div>
        </section>

        {/* Panel de marca (escritorio): cubre el formulario que no se usa y se desliza al cambiar */}
        <aside className="mf-auth__panel" aria-label="Mirú Franco Beauty Salón">
          <div className="mf-auth__panel-contenido">
            <Link href="/home" className="mf-auth__volver mf-auth__volver--panel">
              <ArrowLeft size={16} aria-hidden />
              Volver al inicio
            </Link>

            <div className="flex flex-col items-center text-center">
              <div className="relative aspect-square w-52 xl:w-60">
                <div className="absolute -inset-5 rounded-full border" style={{ borderColor: 'var(--oro-30)' }} aria-hidden />
                <div className="absolute inset-3 rounded-full border border-dashed" style={{ borderColor: 'var(--oro-32)' }} aria-hidden />
                <Image src="/logo-miru.jpg" alt="" fill className="object-contain p-10" sizes="15rem" priority />
              </div>
              <p className="mt-8 text-brand-tagline tracking-[0.2em]" style={{ color: 'var(--oro-sobre-carbon)' }}>
                Beauty Salón
              </p>

              <div key={vista} className="mf-auth__panel-invitacion">
                <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-family-serif)', color: 'var(--marfil)' }}>
                  {panel.titulo}
                </p>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed" style={{ color: 'var(--marfil-75)' }}>
                  {panel.texto}
                </p>
                <button type="button" className="mf-auth__panel-boton" onClick={() => irA(panel.destino)}>
                  {panel.accion}
                </button>
              </div>
            </div>

            <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--marfil-70)' }}>
              <MapPin size={13} aria-hidden style={{ color: 'var(--logo-branding)' }} />
              Huejutla de Reyes, Hidalgo
            </p>
          </div>
        </aside>
      </div>
    </SuperficieCliente>
  );
}
