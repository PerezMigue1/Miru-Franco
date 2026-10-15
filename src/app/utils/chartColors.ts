/**
 * Paleta de gráficos derivada de la marca Miru Franco — orden fijo, nunca cíclico.
 * La serie principal usa su propio token (--grafica-principal): vino en claro y un vino claro en
 * `.dark`, porque el vino de marca sobre las tarjetas oscuras quedaba en 1.15:1. Los otros 4 tokens
 * no se sobreescriben en `.dark` (ver globals.css).
 * La usan las gráficas del panel de admin ((screens)/admin/page.tsx) y la predicción de inventario.
 */
export const CHART_COLORS_MARCA = [
  'var(--grafica-principal)', // vino (claro en modo oscuro)
  'var(--grafica-oro)', // oro (oscuro en claro, para 3:1 sobre la tarjeta terracota)
  'var(--grafica-terracota)', // terracota (oscura en claro, clara en modo oscuro)
  'var(--grafica-verde)', // verde salvia
  'var(--grafica-ambar)', // ámbar
] as const;

/** Colores por categoría (pastel de inventario): mismo orden que tenía la paleta fija anterior. */
export const CHART_COLORS_CATEGORIAS = [
  'var(--enlaces-textos-interactivos)', // azul
  'var(--success)', // verde salvia
  'var(--warning)', // ámbar
  'var(--grafica-guinda)',
  'var(--grafica-ciruela)',
  'var(--grafica-petroleo)',
  'var(--grafica-teja)',
  'var(--grafica-indigo)',
] as const;

/** Chrome de gráficas (ejes, grid, tooltip, etiquetas) consciente de tema — nunca colores fijos. */
export const CHART_THEME = {
  axisText: 'var(--encabezados-alterno)',
  gridLine: 'var(--encabezados-alterno)',
  label: 'var(--menu-texto-principal)',
  tooltipBg: 'var(--header-footer)',
  tooltipText: 'var(--texto-fondo-oscuro)',
} as const;
