'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CircleAlert } from 'lucide-react';
import Button from '../ui/Button';
import CasillaDocumento, { EnlaceDocumento } from './CasillaDocumento';
import type { DocumentoPendiente } from '../../services/consentimientos';
import { documentoLegal } from '../../utils/documentosLegales';
import { formatearFechaSoloDia } from '../../utils/fechaSoloDia';
import { hasSession } from '../../utils/security';
import { showToast } from '../../utils/toast';
import { MIRU_USER_STORAGE_UPDATED } from '../../utils/userStorageSync';
import { QUE_PASA_AL_CANCELAR } from '../privacidad/accionesPrivacidad';
import {
  RECHAZO_INICIAL,
  cerrarSesionPorRechazo,
  consultarPendientes,
  cuentaEnSesion,
  documentoDelPendiente,
  erroresReaceptacion,
  esRutaDeDocumentoLegal,
  leerUsuarioGuardado,
  pedirCancelacionPorRechazo,
  registrarReaceptacion,
  textoCancelacionAbierta,
  type EstadoRechazo,
} from './reaceptacion';

type Paso = 'aceptar' | 'rechazo';

const idCasilla = (slug: string) => `reaceptacion-${slug}`;
const ID_CASILLA_ENTIENDO = 'reaceptacion-entiendo';

/**
 * Re-aceptación (punto 24): con sesión iniciada, una vez por cuenta y por carga consulta los documentos cuya
 * versión vigente aún no acepta. Si hay, muestra un diálogo que no se cierra hasta aceptar o salir. Al terminar
 * la sesión olvida la consulta (y cierra el diálogo): si entra otra vez, u otra cuenta, sin recargar, se consulta
 * de nuevo. No se pinta en las páginas legales, para poder leerlas. Si la consulta falla no bloquea nada.
 */
export default function ReaceptacionDocumentos() {
  const pathname = usePathname();
  const router = useRouter();
  /** Cuenta cuyos pendientes ya se consultaron (null: ninguna o sin sesión). */
  const consultadoRef = useRef<string | null>(null);
  /** Descarta la respuesta de una consulta vieja si la sesión cambió mientras llegaba. */
  const turnoRef = useRef(0);
  const [pendientes, setPendientes] = useState<DocumentoPendiente[]>([]);
  const [paso, setPaso] = useState<Paso>('aceptar');
  const [marcadas, setMarcadas] = useState<Record<string, boolean>>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [rechazo, setRechazo] = useState<EstadoRechazo>(RECHAZO_INICIAL);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Al cargar, al iniciar o cerrar sesión (avisos de cambio de usuario) y al navegar (el logout del menú
    // navega sin avisar): si la cuenta cambió, lo de la anterior ya no vale y se consulta la nueva.
    const consultar = async () => {
      const cuenta = cuentaEnSesion(hasSession(), leerUsuarioGuardado());
      if (cuenta === consultadoRef.current) return;
      if (consultadoRef.current !== null) {
        setPendientes([]);
        setPaso('aceptar');
        setMarcadas({});
        setErrores({});
        setRechazo(RECHAZO_INICIAL);
        setEnviando(false);
        setError(null);
      }
      consultadoRef.current = cuenta;
      const turno = ++turnoRef.current;
      if (!cuenta) return;
      const lista = await consultarPendientes();
      if (turno === turnoRef.current && lista.length > 0 && hasSession()) setPendientes(lista);
    };
    void consultar();
    window.addEventListener(MIRU_USER_STORAGE_UPDATED, consultar);
    return () => window.removeEventListener(MIRU_USER_STORAGE_UPDATED, consultar);
  }, [pathname]);

  if (pendientes.length === 0 || esRutaDeDocumentoLegal(pathname)) return null;

  const aceptar = async () => {
    const faltan = erroresReaceptacion(pendientes, marcadas);
    setErrores(faltan);
    const primera = Object.keys(faltan)[0];
    if (primera) {
      document.getElementById(idCasilla(primera))?.focus();
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await registrarReaceptacion(pendientes, pathname || window.location.pathname);
      setPendientes([]);
      showToast('Gracias. Registramos tu aceptación.', 'success');
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'No pudimos registrar tu aceptación. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const salir = async (aviso: string) => {
    await cerrarSesionPorRechazo();
    setPendientes([]);
    setEnviando(false);
    showToast(aviso, 'info');
    router.push('/login');
  };

  const cancelarCuenta = async () => {
    setEnviando(true);
    setError(null);
    const r = await pedirCancelacionPorRechazo(pendientes, rechazo.entendido);
    if (r.estado === 'falta_casilla') {
      setRechazo((prev) => ({ ...prev, errorCasilla: r.mensaje }));
      setEnviando(false);
      document.getElementById(ID_CASILLA_ENTIENDO)?.focus();
      return;
    }
    if (r.estado === 'ya_abierta') {
      setRechazo((prev) => ({ ...prev, abierta: r.solicitud, errorCasilla: null }));
      setEnviando(false);
      return;
    }
    if (r.estado === 'error') {
      setError(r.mensaje);
      setEnviando(false);
      return;
    }
    const folio = r.solicitud?.folio ? ` ${r.solicitud.folio}` : ' de cancelación';
    await salir(`Recibimos tu solicitud${folio} y cerramos tu sesión.`);
  };

  return (
    <DialogoReaceptacion
      pendientes={pendientes}
      paso={paso}
      marcadas={marcadas}
      errores={errores}
      rechazo={rechazo}
      enviando={enviando}
      error={error}
      onMarcar={(slug, marcada) => {
        setMarcadas((prev) => ({ ...prev, [slug]: marcada }));
        if (marcada) setErrores((prev) => ({ ...prev, [slug]: '' }));
      }}
      onEntendido={(marcada) => setRechazo((prev) => ({ ...prev, entendido: marcada, errorCasilla: marcada ? null : prev.errorCasilla }))}
      onAceptar={() => void aceptar()}
      onNoAcepto={() => {
        setError(null);
        setPaso('rechazo');
      }}
      onVolver={() => {
        setError(null);
        setPaso('aceptar');
      }}
      onCancelarCuenta={() => void cancelarCuenta()}
      onCerrarSesion={() => {
        setEnviando(true);
        setError(null);
        void salir('Cerramos tu sesión.');
      }}
    />
  );
}

interface DialogoReaceptacionProps {
  pendientes: DocumentoPendiente[];
  paso: Paso;
  marcadas: Record<string, boolean>;
  errores: Record<string, string>;
  rechazo: EstadoRechazo;
  enviando: boolean;
  error: string | null;
  onMarcar: (slug: string, marcada: boolean) => void;
  onEntendido: (marcada: boolean) => void;
  onAceptar: () => void;
  onNoAcepto: () => void;
  onVolver: () => void;
  onCancelarCuenta: () => void;
  onCerrarSesion: () => void;
}

/** Elementos que pueden recibir el foco dentro del diálogo (para no dejarlo salir con Tab). */
const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled])';

/** Diálogo sin botón de cerrar: ni Escape ni el velo lo cierran. */
export function DialogoReaceptacion({
  pendientes,
  paso,
  marcadas,
  errores,
  rechazo,
  enviando,
  error,
  onMarcar,
  onEntendido,
  onAceptar,
  onNoAcepto,
  onVolver,
  onCancelarCuenta,
  onCerrarSesion,
}: DialogoReaceptacionProps) {
  const idTitulo = useId();
  const idDescripcion = useId();
  const dialogoRef = useRef<HTMLDivElement>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);

  // Foco al título al abrir y al cambiar de paso; la página de atrás no se desplaza mientras está abierto.
  useEffect(() => {
    tituloRef.current?.focus();
  }, [paso]);
  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = anterior;
    };
  }, []);

  const alTeclear = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      // Obligatorio: Escape no lo cierra.
      e.preventDefault();
      return;
    }
    if (e.key !== 'Tab') return;
    const nodos = dialogoRef.current?.querySelectorAll<HTMLElement>(ENFOCABLES);
    if (!nodos || nodos.length === 0) return;
    const primero = nodos[0];
    const ultimo = nodos[nodos.length - 1];
    const activo = document.activeElement;
    if (e.shiftKey && (activo === primero || activo === tituloRef.current)) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && activo === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  };

  return (
    <div className="mf-velo fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-2 sm:p-4">
      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={idDescripcion}
        onKeyDown={alTeclear}
        className="mf-dialogo w-full max-w-lg max-h-[92dvh] flex flex-col"
      >
        <div className="px-5 sm:px-6 pt-5 pb-3 border-b shrink-0" style={{ borderColor: 'var(--mf-linea-fuerte)' }}>
          <h2
            id={idTitulo}
            ref={tituloRef}
            tabIndex={-1}
            className="text-xl font-bold rounded-[4px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mf-foco)]"
            style={{ color: 'var(--menu-texto-principal)', fontFamily: 'var(--font-family-serif)' }}
          >
            {paso === 'aceptar' ? 'Actualizamos nuestros documentos' : 'Antes de salir'}
          </h2>
        </div>

        <div className="px-5 sm:px-6 py-4 overflow-y-auto grow space-y-3 text-sm leading-relaxed">
          {paso === 'aceptar' ? (
            <>
              <p id={idDescripcion}>
                Para seguir usando tu cuenta, revisa y acepta la versión vigente de estos documentos. Cada enlace se abre
                en otra pestaña.
              </p>
              {pendientes.map((p) => (
                <CasillaDocumento
                  key={p.documentoSlug}
                  id={idCasilla(p.documentoSlug)}
                  checked={!!marcadas[p.documentoSlug]}
                  onChange={(e) => onMarcar(p.documentoSlug, e.target.checked)}
                  disabled={enviando}
                  aria-required
                  error={errores[p.documentoSlug] || null}
                >
                  <TextoPendiente pendiente={p} />
                </CasillaDocumento>
              ))}
            </>
          ) : (
            <>
              <p id={idDescripcion}>Sin aceptar no puedes seguir usando tu cuenta. Al salir cerraremos tu sesión.</p>
              <p>
                Si prefieres que eliminemos tu cuenta, puedes solicitar su cancelación. La atenderemos como indica el{' '}
                <EnlaceDocumento className="font-semibold underline underline-offset-[3px]" href={`${documentoLegal('aviso-privacidad').ruta}#derechos-arco`}>Aviso de privacidad</EnlaceDocumento>.{' '}
                {QUE_PASA_AL_CANCELAR}
              </p>
              {rechazo.abierta ? (
                <p role="status" className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                  {textoCancelacionAbierta(rechazo.abierta)}
                </p>
              ) : (
                <CasillaDocumento
                  id={ID_CASILLA_ENTIENDO}
                  checked={rechazo.entendido}
                  onChange={(e) => onEntendido(e.target.checked)}
                  disabled={enviando}
                  aria-required
                  error={rechazo.errorCasilla}
                >
                  Entiendo que mis datos personales se borrarán o anonimizarán, que ya no podré entrar a mi cuenta y que
                  se conserva lo que la ley obliga a guardar, como explica el{' '}
                  <EnlaceDocumento href={documentoLegal('aviso-privacidad').ruta}>Aviso de privacidad</EnlaceDocumento>.
                </CasillaDocumento>
              )}
            </>
          )}
          {error && (
            <p role="alert" className="flex items-start gap-2" style={{ color: 'var(--danger-texto)' }}>
              <CircleAlert size={18} aria-hidden className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </p>
          )}
        </div>

        <div
          className="flex flex-col-reverse sm:flex-row sm:flex-wrap sm:justify-end gap-2 sm:gap-3 px-5 sm:px-6 py-3 sm:py-4 border-t shrink-0"
          style={{ borderColor: 'var(--mf-linea-fuerte)' }}
        >
          {paso === 'aceptar' ? (
            <>
              <Button variant="outline" onClick={onNoAcepto} disabled={enviando}>
                No acepto
              </Button>
              <Button variant="primary" onClick={onAceptar} disabled={enviando} aria-busy={enviando || undefined}>
                {enviando ? 'Guardando…' : 'Aceptar y continuar'}
              </Button>
            </>
          ) : (
            <>
              {/* Orden del DOM al revés de la vista en móvil (flex-col-reverse): la cancelación queda abajo. */}
              {!rechazo.abierta && (
                <Button variant="outline-danger" onClick={onCancelarCuenta} disabled={enviando} aria-busy={enviando || undefined}>
                  {enviando ? 'Enviando…' : 'Solicitar la cancelación de mi cuenta'}
                </Button>
              )}
              <Button variant="outline" onClick={onCerrarSesion} disabled={enviando}>
                Cerrar sesión
              </Button>
              <Button variant="primary" onClick={onVolver} disabled={enviando}>
                Volver
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * "Acepto el documento Términos y Condiciones, versión 2.0, vigente desde el 14 de octubre de 2026." Sirve para
 * cualquier título (sin artículo armado a mano) y para un documento que la web no conoce (su slug, sin enlace).
 */
function TextoPendiente({ pendiente: p }: { pendiente: DocumentoPendiente }) {
  const doc = documentoDelPendiente(p.documentoSlug);
  const vigencia = formatearFechaSoloDia(p.vigenteDesde, { day: 'numeric', month: 'long', year: 'numeric' }) ?? p.vigenteDesde;
  return (
    <>
      Acepto el documento {doc.ruta ? <EnlaceDocumento href={doc.ruta}>{doc.titulo}</EnlaceDocumento> : doc.titulo}, versión{' '}
      {p.version}, vigente desde el {vigencia}.
      {p.versionAceptada ? ` Antes aceptaste la versión ${p.versionAceptada}.` : ''}
    </>
  );
}
