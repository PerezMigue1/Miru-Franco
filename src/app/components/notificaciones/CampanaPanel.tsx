'use client';

import CampanaAvisos from './CampanaAvisos';

/**
 * Campana única de la barra de /admin y /operacion: contador de no leídas (también en el título de la pestaña),
 * lista de avisos con marcar como leídos, avisos flotantes en vivo por SSE y, dentro del menú, la opción de
 * activar los avisos del navegador cuando este los soporta (CampanaAvisos).
 */
export default function CampanaPanel({ href }: { href: string }) {
  return <CampanaAvisos variante="panel" bandejaHref={href} />;
}
