/**
 * Paleta de gráficos derivada de la marca Miru Franco — orden fijo, nunca cíclico.
 * Los 5 tokens no se sobreescriben en `.dark` (ver globals.css), por lo que la
 * secuencia es estable entre modo claro y oscuro sin necesitar variantes por tema.
 * La usan las gráficas del panel de admin ((screens)/admin/page.tsx) y la predicción de inventario.
 */
export const CHART_COLORS_MARCA = [
  'var(--danger)', // vino
  'var(--logo-branding)', // oro
  'var(--hover)', // terracota
  'var(--success)', // verde salvia
  'var(--warning)', // ámbar
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
