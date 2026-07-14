/**
 * Paleta de gráficos derivada de la marca Miru Franco — orden fijo, nunca cíclico.
 * Los 5 tokens no se sobreescriben en `.dark` (ver globals.css), por lo que la
 * secuencia es estable entre modo claro y oscuro sin necesitar variantes por tema.
 * Mismo orden que `PALETA_GRAFICOS` en `(screens)/admin/page.tsx`.
 */
export const CHART_COLORS_MARCA = [
  'var(--danger)', // vino #710014
  'var(--logo-branding)', // oro #9f6d1f
  'var(--hover)', // terracota #A64B63
  'var(--success)', // verde salvia #6E7D57
  'var(--warning)', // ámbar #D98E04
] as const;

/** Chrome de gráficas (ejes, grid, tooltip, etiquetas) consciente de tema — nunca colores fijos. */
export const CHART_THEME = {
  axisText: 'var(--encabezados-alterno)',
  gridLine: 'var(--encabezados-alterno)',
  label: 'var(--menu-texto-principal)',
  tooltipBg: 'var(--header-footer)',
  tooltipText: 'var(--texto-fondo-oscuro)',
} as const;
