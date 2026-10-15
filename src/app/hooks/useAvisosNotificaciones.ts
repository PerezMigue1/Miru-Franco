'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { hasSession } from '../utils/security';
import { MIRU_USER_STORAGE_UPDATED } from '../utils/userStorageSync';
import { actualizarNotificacion, listarNotificaciones, marcarTodasNotificacionesLeidas } from '../services/ecommerce';
import { showToast } from '../utils/toast';
import { estadoAvisosNavegador, irARuta, recordarFalloNativa, tituloConContador } from '../utils/avisosNotificaciones';
import { ESTADO_INICIAL, crearCentroAvisos, type CentroAvisos, type EstadoCentro } from '../utils/centroAvisos';
import { avisarCambioPermiso } from './useEstadoAvisosNavegador';
import { useNotificacionesSSE } from './useNotificacionesSSE';

export interface AvisosNotificaciones extends EstadoCentro {
  cerrarAviso: CentroAvisos['cerrarAviso'];
  abrirAviso: CentroAvisos['abrirAviso'];
  marcarLeida: CentroAvisos['marcarLeida'];
  marcarTodas: CentroAvisos['marcarTodas'];
}

const servidor = () => ESTADO_INICIAL;

/**
 * Campana del sitio (Header) y de los paneles (CampanaPanel): una sola instancia por encabezado.
 *
 * - Capa 1 (aviso interno, para toda persona con sesión): contador de no leídas, lista para el menú de la
 *   campana, marcar una o todas como leídas y el aviso flotante de cada notificación nueva (utils/centroAvisos.ts).
 *   La fuente es GET /api/notificaciones?leida=false; el SSE (useNotificacionesSSE) y la consulta de respaldo
 *   cada 60 s solo disparan esa misma carga, igual que enfocar la ventana, navegar o cambiar de sesión.
 * - Capa 2 (extra): notificación del navegador con la pestaña oculta y el permiso concedido. Si el constructor
 *   lanza, se recuerda (recordarFalloNativa) y la campana deja de ofrecer activarla.
 * - Contador en el título de la pestaña ("(3) Título original"; al llegar a 0 se restaura).
 * - `rutaRespaldo`: pantalla que abre un aviso sin ruta propia (la bandeja de notificaciones).
 */
export function useAvisosNotificaciones(rutaRespaldo: string): AvisosNotificaciones {
  const router = useRouter();
  const pathname = usePathname();

  const [centro] = useState(() =>
    crearCentroAvisos({
      rutaRespaldo,
      haySesion: hasSession,
      listarNoLeidas: () => listarNotificaciones({ leida: false }),
      marcarLeida: (id) => actualizarNotificacion(id, { leida: true }),
      marcarTodas: () => marcarTodasNotificacionesLeidas(),
      canalNativo: () => ({ visible: document.visibilityState === 'visible', permiso: estadoAvisosNavegador() }),
      crearNativa: (titulo, opciones) => new window.Notification(titulo, opciones),
      alFallarNativa: () => {
        recordarFalloNativa();
        avisarCambioPermiso();
      },
      enfocar: () => window.focus(),
      // Hasta montar no hay router: la navegación real llega con fijarNavegacion (abajo).
      navegar: () => undefined,
      alError: (mensaje) => showToast(mensaje, 'error'),
    }),
  );
  const estado = useSyncExternalStore(centro.suscribir, centro.obtener, servidor);

  useEffect(() => () => centro.detener(), [centro]);

  useEffect(() => {
    centro.fijarNavegacion((ruta) =>
      irARuta(ruta, {
        pathname: window.location.pathname,
        cambiarHash: (hash) => {
          window.location.hash = hash;
        },
        push: (r) => router.push(r),
      }),
    );
  }, [centro, router]);

  useEffect(() => {
    queueMicrotask(() => void centro.cargar());
    const alRefrescar = () => void centro.cargar();
    window.addEventListener(MIRU_USER_STORAGE_UPDATED, alRefrescar);
    window.addEventListener('focus', alRefrescar);
    return () => {
      window.removeEventListener(MIRU_USER_STORAGE_UPDATED, alRefrescar);
      window.removeEventListener('focus', alRefrescar);
    };
  }, [pathname, centro]);

  useNotificacionesSSE(
    (n) => void centro.alNotificacion(n),
    () => void centro.cargar(true),
  );

  // Contador en el título de la pestaña. Next cambia el <title> al navegar: se vuelve a aplicar cuando cambia.
  const { noLeidas } = estado;
  useEffect(() => {
    const aplicar = () => {
      const deseado = tituloConContador(document.title, noLeidas);
      if (document.title !== deseado) document.title = deseado;
    };
    aplicar();
    const titulo = document.querySelector('head > title');
    const observador = typeof MutationObserver !== 'undefined' && titulo ? new MutationObserver(aplicar) : null;
    if (observador && titulo) observador.observe(titulo, { childList: true, characterData: true, subtree: true });
    return () => {
      observador?.disconnect();
      document.title = tituloConContador(document.title, 0);
    };
  }, [noLeidas, pathname]);

  return {
    ...estado,
    cerrarAviso: centro.cerrarAviso,
    abrirAviso: centro.abrirAviso,
    marcarLeida: centro.marcarLeida,
    marcarTodas: centro.marcarTodas,
  };
}
