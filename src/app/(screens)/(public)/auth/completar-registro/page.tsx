'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CircleAlert, CircleX } from 'lucide-react';
import SuperficieCliente from '../../../../components/cliente/SuperficieCliente';
import SelloConfirmacion from '../../../../components/cliente/SelloConfirmacion';
import Button from '../../../../components/ui/Button';
import LogoGoogle from '../../../../components/auth/LogoGoogle';
import AvisoSimplificado from '../../../../components/legal/AvisoSimplificado';
import CasillasAlta, { SUFIJO_CASILLA_ALTA } from '../../../../components/legal/CasillasAlta';
import {
  CASILLAS_ALTA_INICIALES,
  erroresCasillasAlta,
  type CampoCasillaAlta,
  type CasillasAlta as ValoresCasillas,
} from '../../../../components/legal/reglasAlta';
import { tomarRegresoDeGoogle } from '../../../../components/auth/redireccionTrasLogin';
import { api } from '../../../../services/auth';
import {
  MENSAJE_ENLACE_VENCIDO,
  completarRegistroGoogle,
  datosDelTokenGoogle,
  estadoTrasCompletar,
  leerTokenDeLaUrl,
  RUTA_COMPLETAR_REGISTRO,
  type MotivoFallaCompletar,
} from './completarRegistro';

const ID_CASILLAS = 'google';
/** Alta con el token de la app: la respuesta no trae sesión para la web. */
const MENSAJE_CUENTA_LISTA_APP = 'Tu cuenta quedó creada. Vuelve a la app y entra con Google.';
/** Esquema que abre la app instalada. */
const ENLACE_APP = 'appmirufranco://';

/** Pausa breve para que se lea la confirmación antes de salir (sin setTimeout con datos de la URL). */
function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

type Estado = 'formulario' | 'enlace_vencido' | 'cuenta_existente' | 'lista' | 'sin_perfil' | 'lista_app';

function CompletarRegistroContenido() {
  const router = useRouter();
  // undefined en el servidor y al hidratar (se pinta "cargando", nunca "enlace no válido"). En el navegador el
  // token llega en #token= (o ?token=) y se lee una sola vez al montar.
  const [token, setToken] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    // Lectura única de la URL tras hidratar: el servidor no la conoce, así que no puede ir en el render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(leerTokenDeLaUrl(window.location));
  }, []);
  useEffect(() => {
    // Ya guardado, el token sale de la barra y del historial. Corre en un commit posterior a la hidratación, cuando
    // Next ya sincroniza su estado con history.replaceState: un refresh del router no lo regresa a la barra.
    if (token) window.history.replaceState(window.history.state, '', RUTA_COMPLETAR_REGISTRO);
  }, [token]);
  // Solo para mostrar nombre y correo: el backend verifica el token al crear la cuenta.
  const datos = useMemo(() => datosDelTokenGoogle(token), [token]);

  const [casillas, setCasillas] = useState<ValoresCasillas>({ ...CASILLAS_ALTA_INICIALES });
  const [errores, setErrores] = useState<Partial<Record<CampoCasillaAlta, string>>>({});
  const [enviando, setEnviando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>('formulario');
  const [mensajeEstado, setMensajeEstado] = useState('');

  const alCambiar = (campo: CampoCasillaAlta, marcada: boolean) => {
    setCasillas((prev) => ({ ...prev, [campo]: marcada }));
    if (marcada) setErrores((prev) => ({ ...prev, [campo]: undefined }));
  };

  const alEnviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (enviando || !token) return;
    const faltan = erroresCasillasAlta(casillas);
    setErrores(faltan);
    const primera = (Object.keys(faltan) as CampoCasillaAlta[])[0];
    if (primera) {
      document.getElementById(`${ID_CASILLAS}-${SUFIJO_CASILLA_ALTA[primera]}`)?.focus();
      return;
    }
    setEnviando(true);
    setErrorGeneral(null);
    const r = await completarRegistroGoogle(token, casillas);
    if (!r.ok) {
      setEnviando(false);
      mostrarFalla(r.motivo, r.mensaje);
      return;
    }
    // Con el token de la app no se inicia sesión en la web: se pide volver a la app.
    const siguiente = await estadoTrasCompletar(r);
    setEstado(siguiente);
    if (siguiente !== 'lista') return;
    await esperar(1200);
    // Regresa a la página de la que venía antes de ir a Google (o /home).
    router.replace(tomarRegresoDeGoogle());
  };

  const mostrarFalla = (motivo: MotivoFallaCompletar, mensaje: string) => {
    if (motivo === 'enlace_vencido' || motivo === 'cuenta_existente') {
      setMensajeEstado(mensaje);
      setEstado(motivo);
      return;
    }
    setErrorGeneral(mensaje);
  };

  const enlaceInvalido = !datos || estado === 'enlace_vencido';

  if (token === undefined) return <CargandoPagina />;

  if (estado === 'lista_app') {
    return (
      <Resultado icono={<SelloConfirmacion />} rol="status" titulo="Cuenta creada" texto={MENSAJE_CUENTA_LISTA_APP}>
        <Button asChild variant="primary" size="lg" fullWidth>
          <a href={ENLACE_APP} className="inline-flex items-center justify-center">
            Abrir la app
          </a>
        </Button>
      </Resultado>
    );
  }

  if (estado === 'lista' || estado === 'sin_perfil') {
    const lista = estado === 'lista';
    return (
      <Resultado
        icono={<SelloConfirmacion />}
        rol="status"
        titulo="Tu cuenta está lista"
        texto={lista ? 'Te llevamos de regreso…' : 'Tu cuenta quedó creada. Inicia sesión con Google para continuar.'}
      >
        {!lista && <EnlaceLogin />}
      </Resultado>
    );
  }

  if (enlaceInvalido) {
    return (
      <Resultado icono={<IconoAviso tipo="error" />} rol="alert" titulo="Este enlace ya no es válido" texto={estado === 'enlace_vencido' ? mensajeEstado : MENSAJE_ENLACE_VENCIDO}>
        <BotonGoogle />
        <EnlaceLogin />
      </Resultado>
    );
  }

  if (estado === 'cuenta_existente') {
    return (
      <Resultado icono={<IconoAviso tipo="aviso" />} rol="alert" titulo="Ya tienes una cuenta" texto={mensajeEstado}>
        <Button asChild variant="primary" size="lg" fullWidth>
          <Link href="/login" className="inline-flex items-center justify-center">
            Ir a iniciar sesión
          </Link>
        </Button>
      </Resultado>
    );
  }

  return (
    <SuperficieCliente className="min-h-dvh flex items-center justify-center px-4 py-10 sm:px-6" style={{ backgroundColor: 'var(--fondo-general)' }}>
      <main className="mf-entrada w-full max-w-md">
        <h1 className="mf-titulo-pagina" style={{ color: 'var(--menu-texto-principal)' }}>
          Termina de crear tu cuenta
        </h1>
        <p className="mt-3 text-base" style={{ color: 'var(--encabezados-alterno)' }}>
          Entraste con Google como{' '}
          <strong style={{ color: 'var(--menu-texto-principal)' }}>{datos.nombre || datos.email}</strong>
          {datos.nombre ? <> ({datos.email})</> : null}. Tu cuenta se crea cuando aceptes los documentos.
        </p>

        <form onSubmit={alEnviar} noValidate className="mt-6 space-y-4">
          <fieldset>
            <legend className="mb-1 text-sm font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
              Antes de crear tu cuenta
            </legend>
            <CasillasAlta idBase={ID_CASILLAS} valores={casillas} onCambio={alCambiar} errores={errores} disabled={enviando} />
          </fieldset>

          {errorGeneral && (
            <p role="alert" className="flex items-start gap-2 text-sm" style={{ color: 'var(--danger-texto)' }}>
              <CircleAlert size={18} aria-hidden className="mt-0.5 shrink-0" />
              <span>{errorGeneral}</span>
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" fullWidth disabled={enviando} aria-busy={enviando || undefined}>
            {enviando ? 'Creando tu cuenta…' : 'Crear mi cuenta'}
          </Button>
          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline"
              style={{ color: 'var(--menu-texto-principal)' }}
            >
              Cancelar
            </Link>
          </div>
          <AvisoSimplificado finalidad="crear tu cuenta y gestionar tus citas y compras" />
        </form>
      </main>
    </SuperficieCliente>
  );
}

function Resultado({
  icono,
  rol,
  titulo,
  texto,
  children,
}: {
  icono: ReactNode;
  rol: 'status' | 'alert';
  titulo: string;
  texto: string;
  children?: ReactNode;
}) {
  return (
    <SuperficieCliente className="min-h-dvh flex items-center justify-center px-6" style={{ backgroundColor: 'var(--fondo-general)' }}>
      <main className="mf-entrada w-full max-w-md text-center" role={rol}>
        <div className="mb-5 flex justify-center">{icono}</div>
        <h1 className="mf-titulo-pagina" style={{ color: 'var(--menu-texto-principal)' }}>
          {titulo}
        </h1>
        <p className="mt-3 text-base" style={{ color: 'var(--encabezados-alterno)' }}>
          {texto}
        </p>
        {children && <div className="mt-7 flex flex-col items-center gap-3">{children}</div>}
      </main>
    </SuperficieCliente>
  );
}

function EnlaceLogin() {
  return (
    <Link
      href="/login"
      className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4"
      style={{ color: 'var(--menu-texto-principal)' }}
    >
      Ir a iniciar sesión
    </Link>
  );
}

function IconoAviso({ tipo }: { tipo: 'error' | 'aviso' }) {
  const color = tipo === 'error' ? 'var(--danger-texto)' : 'var(--warning-texto)';
  return (
    <span
      className="grid h-16 w-16 place-items-center rounded-full"
      style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
    >
      {tipo === 'error' ? <CircleX size={32} strokeWidth={1.75} aria-hidden /> : <CircleAlert size={32} strokeWidth={1.75} aria-hidden />}
    </span>
  );
}

/** 401: el token venció (15 minutos) o no es válido; se vuelve a pedir con Google. */
function BotonGoogle() {
  const [yendo, setYendo] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        setYendo(true);
        void api.loginWithGoogle();
      }}
      disabled={yendo}
      className="mf-btn mf-btn-color w-full min-h-12 py-3 px-4 rounded-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
      style={{
        ['--btn-bg' as string]: 'var(--input-bg)',
        ['--btn-bg-hover' as string]: 'color-mix(in srgb, var(--input-bg) 90%, var(--menu-texto-principal))',
        ['--btn-texto' as string]: 'var(--menu-texto-principal)',
        ['--btn-borde' as string]: '1px solid var(--campo-borde)',
        ['--btn-borde-hover' as string]: 'var(--campo-borde)',
      }}
    >
      <LogoGoogle />
      <span>{yendo ? 'Conectando con Google…' : 'Volver a entrar con Google'}</span>
    </button>
  );
}

/** Mientras se lee el token de la URL (un instante, ya en el navegador). */
function CargandoPagina() {
  return <div className="min-h-dvh" style={{ backgroundColor: 'var(--fondo-general)' }} aria-busy="true" />;
}

export default function CompletarRegistroPage() {
  return <CompletarRegistroContenido />;
}
