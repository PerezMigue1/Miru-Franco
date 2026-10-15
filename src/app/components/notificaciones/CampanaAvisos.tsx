'use client';

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, BellPlus, Check, X } from 'lucide-react';
import { useAvisosNotificaciones } from '../../hooks/useAvisosNotificaciones';
import { activarAvisosNavegador, useEstadoAvisosNavegador } from '../../hooks/useEstadoAvisosNavegador';
import { opcionNativaEnMenu, rutaDeNotificacion, type EstadoAvisos } from '../../utils/avisosNotificaciones';
import type { AvisoEnPantalla, NotificacionDeLista } from '../../utils/centroAvisos';

/**
 * Campana única de los encabezados (panel de Admin y Operaciones, y sitio público con sesión).
 *
 * - Capa 1, aviso interno: contador de no leídas, lista al hacer clic (las más recientes primero, cada una con
 *   enlace a su ruta interna), marcar una o todas como leídas y el aviso flotante de cada notificación nueva.
 * - Capa 2: "Activar avisos del navegador" es una opción dentro del menú, solo si el navegador puede mostrarlos
 *   y aún no están activados; si el permiso está bloqueado, una línea explica cómo desbloquearlo.
 * - Teclado: la lista sigue a la campana en el orden de tabulación; Escape la cierra y devuelve el foco.
 */

const MAX_EN_LISTA = 10;
const ANCHO_MENU_PX = 352;
const MARGEN_PX = 16;

type Variante = 'panel' | 'sitio';

/** Escape con la lista abierta: la cierra y devuelve el foco a la campana. Devuelve si la tecla se usó. */
export function alTeclaMenu(
  e: { key: string; preventDefault: () => void },
  abierto: boolean,
  cerrar: (o: { devolverFoco: boolean }) => void,
): boolean {
  if (!abierto || e.key !== 'Escape') return false;
  e.preventDefault();
  cerrar({ devolverFoco: true });
  return true;
}

/**
 * Ancho de la lista y su `right` (px) respecto a la campana: alineada con ella si cabe; en pantallas angostas se
 * recorre a la derecha para dejar MARGEN_PX al borde izquierdo.
 */
export function desplazamientoMenu({ derechaCampana, anchoVentana }: { derechaCampana: number; anchoVentana: number }) {
  const ancho = Math.min(ANCHO_MENU_PX, anchoVentana - 2 * MARGEN_PX);
  const derechaDeseada = Math.max(derechaCampana, MARGEN_PX + ancho);
  return { ancho, derecha: derechaCampana - derechaDeseada };
}

const etiquetaCampana = (noLeidas: number) => (noLeidas > 0 ? `Notificaciones: ${noLeidas} sin leer` : 'Notificaciones');

function fechaCorta(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export interface VistaCampanaProps {
  variante: Variante;
  bandejaHref: string;
  noLeidas: number;
  /** Ya ordenada: las más recientes primero (centroAvisos). */
  lista: NotificacionDeLista[];
  abierto: boolean;
  /** null mientras se hidrata: no se ofrece nada. */
  estadoNativo: EstadoAvisos | null;
  idMenu: string;
  estiloMenu?: CSSProperties;
  onAlternar: () => void;
  onMarcarLeida: (id: string) => void;
  onMarcarTodas: () => void;
  onActivarNativa: () => void;
  /** Se eligió un enlace de la lista (se marca como leído y se cierra el menú). */
  onElegir: (id: string | null) => void;
  botonRef?: React.Ref<HTMLButtonElement>;
}

/** Presentación (probada sin DOM). */
export function VistaCampana({
  variante,
  bandejaHref,
  noLeidas,
  lista,
  abierto,
  estadoNativo,
  idMenu,
  estiloMenu,
  onAlternar,
  onMarcarLeida,
  onMarcarTodas,
  onActivarNativa,
  onElegir,
  botonRef,
}: VistaCampanaProps) {
  const etiqueta = etiquetaCampana(noLeidas);
  const opcionNativa = estadoNativo ? opcionNativaEnMenu(estadoNativo) : null;
  const visibles = lista.slice(0, MAX_EN_LISTA);
  const claseBoton =
    variante === 'panel'
      ? 'mf-panel-icono-btn relative'
      : 'relative inline-flex min-h-11 min-w-11 items-center justify-center p-1.5 sm:p-2 hover:opacity-80 transition-opacity text-texto-fondo-oscuro';

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        className={claseBoton}
        aria-label={etiqueta}
        title={etiqueta}
        aria-expanded={abierto}
        aria-controls={abierto ? idMenu : undefined}
        onClick={onAlternar}
      >
        <Bell className={variante === 'panel' ? undefined : 'h-5 w-5 sm:h-6 sm:w-6'} size={variante === 'panel' ? 18 : undefined} aria-hidden />
        {noLeidas > 0 && (
          <span
            className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[0.6875rem] font-bold leading-none"
            style={{ backgroundColor: 'var(--danger)', color: 'var(--texto-fondo-oscuro)' }}
            aria-hidden
          >
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div
          id={idMenu}
          role="dialog"
          aria-label="Avisos"
          className="mf-aviso absolute top-full z-[70] mt-2 flex max-h-[min(32rem,calc(100dvh-6rem))] flex-col overflow-hidden text-left"
          style={{ right: 0, width: `min(${ANCHO_MENU_PX / 16}rem, calc(100vw - 2rem))`, ...estiloMenu }}
        >
          <div className="flex items-center justify-between gap-2 border-b px-4 py-2" style={{ borderColor: 'var(--mf-linea)' }}>
            <p className="text-base font-semibold" style={{ color: 'var(--texto-cuerpo)', fontFamily: 'var(--font-family-serif)' }}>
              Avisos
            </p>
            {visibles.length > 0 && (
              <button
                type="button"
                onClick={onMarcarTodas}
                className="-mr-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold underline-offset-4 hover:underline"
                style={{ color: 'var(--info-texto)' }}
              >
                Marcar todos como leídos
              </button>
            )}
          </div>

          {visibles.length === 0 ? (
            <p className="px-4 py-6 text-sm" style={{ color: 'var(--texto-cuerpo)' }}>
              No tienes avisos sin leer.
            </p>
          ) : (
            <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
              {visibles.map((n) => {
                const fecha = fechaCorta(n.creadoEn);
                return (
                  <li key={n.id} className="flex items-start gap-1 px-2">
                    <Link
                      href={rutaDeNotificacion(n, bandejaHref)}
                      onClick={() => onElegir(n.id)}
                      className="flex min-h-11 min-w-0 flex-1 flex-col justify-center rounded-lg px-2 py-2"
                    >
                      <span className="text-sm font-semibold" style={{ color: 'var(--texto-cuerpo)' }}>
                        {n.titulo}
                      </span>
                      {n.mensaje && (
                        <span className="line-clamp-2 text-sm" style={{ color: 'var(--texto-cuerpo)', opacity: 0.85 }}>
                          {n.mensaje}
                        </span>
                      )}
                      {fecha && (
                        <span className="text-xs" style={{ color: 'var(--texto-cuerpo)', opacity: 0.7 }}>
                          {fecha}
                        </span>
                      )}
                    </Link>
                    <button
                      type="button"
                      onClick={() => onMarcarLeida(n.id)}
                      aria-label={`Marcar como leído: ${n.titulo}`}
                      title="Marcar como leído"
                      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg"
                      style={{ color: 'var(--info-texto)' }}
                    >
                      <Check size={18} aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {opcionNativa?.tipo === 'activar' && (
            <div className="border-t px-2 py-1" style={{ borderColor: 'var(--mf-linea)' }}>
              <button
                type="button"
                onClick={onActivarNativa}
                className="inline-flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-sm font-medium"
                style={{ color: 'var(--texto-cuerpo)' }}
              >
                <BellPlus size={18} aria-hidden />
                {opcionNativa.texto}
              </button>
            </div>
          )}
          {opcionNativa?.tipo === 'bloqueados' && (
            <p className="border-t px-4 py-3 text-xs" style={{ borderColor: 'var(--mf-linea)', color: 'var(--texto-cuerpo)' }} role="note">
              {opcionNativa.texto}
            </p>
          )}

          <div className="border-t px-2 py-1" style={{ borderColor: 'var(--mf-linea)' }}>
            <Link
              href={bandejaHref}
              onClick={() => onElegir(null)}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold"
              style={{ color: 'var(--info-texto)' }}
            >
              Ver todas las notificaciones
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

/** Avisos flotantes (capa 1): se cierran solos a los 6 s (centroAvisos) o con "Cerrar aviso". */
export function VistaAvisosFlotantes({
  avisos,
  onCerrar,
  onAbrir,
}: {
  avisos: AvisoEnPantalla[];
  onCerrar: (clave: number) => void;
  onAbrir: (clave: number) => void;
}) {
  return (
    <div
      className="pointer-events-none fixed bottom-4 left-4 right-4 z-[9999] flex flex-col gap-2 sm:left-auto sm:w-[22rem]"
      aria-live="polite"
    >
      {avisos.map((a) => (
        <div key={a.clave} role="status" className="mf-aviso pointer-events-auto flex items-start gap-1 p-2">
          <span className="mt-3 shrink-0 pl-1" style={{ color: 'var(--info-texto)' }}>
            <Bell size={18} aria-hidden />
          </span>
          <button
            type="button"
            onClick={() => onAbrir(a.clave)}
            className="flex min-h-11 min-w-0 flex-1 flex-col justify-center rounded-lg px-2 py-1.5 text-left"
          >
            <span className="text-sm font-semibold" style={{ color: 'var(--texto-cuerpo)' }}>
              {a.titulo}
            </span>
            {a.mensaje && (
              <span className="line-clamp-2 text-sm" style={{ color: 'var(--texto-cuerpo)', opacity: 0.85 }}>
                {a.mensaje}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => onCerrar(a.clave)}
            aria-label="Cerrar aviso"
            title="Cerrar aviso"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg"
            style={{ color: 'var(--texto-cuerpo)' }}
          >
            <X size={18} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}

const sinSuscripcion = () => () => undefined;

export default function CampanaAvisos({ variante, bandejaHref }: { variante: Variante; bandejaHref: string }) {
  const avisos = useAvisosNotificaciones(bandejaHref);
  const estadoNativo = useEstadoAvisosNavegador();
  const enCliente = useSyncExternalStore(sinSuscripcion, () => true, () => false);
  const pathname = usePathname();
  const idMenu = `menu-avisos-${useId().replace(/:/g, '')}`;
  const [abierto, setAbierto] = useState(false);
  const [estiloMenu, setEstiloMenu] = useState<CSSProperties | undefined>(undefined);
  const [rutaAlAbrir, setRutaAlAbrir] = useState(pathname);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);

  // Al navegar se cierra (también al elegir un enlace de la lista).
  if (abierto && rutaAlAbrir !== pathname) {
    setAbierto(false);
    setRutaAlAbrir(pathname);
  }

  const cerrar = useCallback(({ devolverFoco }: { devolverFoco: boolean }) => {
    setAbierto(false);
    if (devolverFoco) botonRef.current?.focus();
  }, []);

  const alternar = () => {
    if (abierto) {
      setAbierto(false);
      return;
    }
    const caja = contenedorRef.current?.getBoundingClientRect();
    if (caja) {
      const { ancho, derecha } = desplazamientoMenu({ derechaCampana: caja.right, anchoVentana: window.innerWidth });
      setEstiloMenu({ right: derecha, width: ancho });
    }
    setRutaAlAbrir(pathname);
    setAbierto(true);
  };

  useEffect(() => {
    if (!abierto) return;
    const alTecla = (e: KeyboardEvent) => {
      alTeclaMenu(e, true, cerrar);
    };
    const alPulsarFuera = (e: PointerEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) cerrar({ devolverFoco: false });
    };
    const alRedimensionar = () => cerrar({ devolverFoco: false });
    document.addEventListener('keydown', alTecla);
    document.addEventListener('pointerdown', alPulsarFuera);
    window.addEventListener('resize', alRedimensionar);
    return () => {
      document.removeEventListener('keydown', alTecla);
      document.removeEventListener('pointerdown', alPulsarFuera);
      window.removeEventListener('resize', alRedimensionar);
    };
  }, [abierto, cerrar]);

  return (
    <div ref={contenedorRef} className="relative shrink-0">
      <VistaCampana
        variante={variante}
        bandejaHref={bandejaHref}
        noLeidas={avisos.noLeidas}
        lista={avisos.lista}
        abierto={abierto}
        estadoNativo={estadoNativo}
        idMenu={idMenu}
        estiloMenu={estiloMenu}
        botonRef={botonRef}
        onAlternar={alternar}
        onMarcarLeida={(id) => void avisos.marcarLeida(id)}
        onMarcarTodas={() => void avisos.marcarTodas()}
        onActivarNativa={() => void activarAvisosNavegador()}
        onElegir={(id) => {
          if (id) void avisos.marcarLeida(id);
          cerrar({ devolverFoco: false });
        }}
      />
      {enCliente &&
        createPortal(
          <VistaAvisosFlotantes avisos={avisos.avisos} onCerrar={avisos.cerrarAviso} onAbrir={(clave) => void avisos.abrirAviso(clave)} />,
          document.body,
        )}
    </div>
  );
}
