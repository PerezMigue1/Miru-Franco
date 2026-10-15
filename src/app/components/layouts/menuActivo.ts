/**
 * Desplazamiento del menú lateral de los paneles (PanelShell) hasta el ítem activo.
 *
 * Misma regla que scrollIntoView({ block: 'nearest' }), pero calculada sobre el menú: así solo se
 * mueve el menú y nunca la página (scrollIntoView desplaza también los ancestros y la ventana).
 * `inicio` y `fin` son las posiciones del ítem dentro del contenido del menú (en píxeles desde arriba).
 */
export function scrollTopParaVer({
  scrollTop,
  alto,
  inicio,
  fin,
  margen = 0,
}: {
  scrollTop: number;
  alto: number;
  inicio: number;
  fin: number;
  margen?: number;
}): number {
  const arriba = Math.max(0, inicio - margen);
  const abajo = fin + margen;
  if (arriba >= scrollTop && abajo <= scrollTop + alto) return scrollTop;
  if (arriba < scrollTop || abajo - arriba > alto) return arriba;
  return abajo - alto;
}

/**
 * Pantallas del panel admin que no tienen ítem propio en el menú: se marca el ítem del que salen
 * (Pagos desde Venta online, Control de caducidad y Productos desde Inventario, Compras desde Proveedores).
 */
const PADRE_EN_MENU_ADMIN: { prefijo: string; padre: string }[] = [
  { prefijo: '/admin/pagos', padre: '/admin/venta-online' },
  { prefijo: '/admin/control-caducidad', padre: '/admin/inventario' },
  { prefijo: '/admin/productos', padre: '/admin/inventario' },
  { prefijo: '/admin/compras-proveedores', padre: '/admin/proveedores' },
];

const bajoRuta = (pathname: string, ruta: string) => pathname === ruta || pathname.startsWith(`${ruta}/`);

/** Si el ítem `href` del menú admin está activo en `pathname` (incluidas las pantallas hijas sin ítem propio). */
export function esItemActivoAdmin(pathname: string | null | undefined, href: string): boolean {
  if (!pathname) return false;
  if (pathname.startsWith(href)) return true;
  return PADRE_EN_MENU_ADMIN.some((r) => r.padre === href && bajoRuta(pathname, r.prefijo));
}

/** Lleva el menú hasta su enlace con aria-current="page", si lo hay y no se ve completo. */
export function mostrarItemActivo(menu: HTMLElement | null, margen = 12): void {
  if (!menu) return;
  const item = menu.querySelector<HTMLElement>('[aria-current="page"]');
  if (!item) return;
  const caja = menu.getBoundingClientRect();
  const r = item.getBoundingClientRect();
  const inicio = r.top - caja.top + menu.scrollTop;
  const destino = scrollTopParaVer({ scrollTop: menu.scrollTop, alto: menu.clientHeight, inicio, fin: inicio + r.height, margen });
  if (destino !== menu.scrollTop) menu.scrollTop = destino;
}
