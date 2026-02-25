/**
 * Paleta de Colores - Miru Franco Web
 *
 * Centraliza todos los colores del proyecto para fácil mantenimiento.
 * Si necesitas cambiar un color, solo actualiza este archivo.
 *
 * Hover: El color de hover para elementos interactivos (botones, enlaces, áreas clicables)
 * debe ser ÚNICAMENTE colors.hover (#A64B63, rosa). No uses otros colores para hover.
 */

export const colors = {
  // Fondos
  fondoGeneral: '#DCC8B6',
  fondosSuaves: '#d0b29c',
  tarjetasPaneles: '#B38E6F',
  
  // Header/Footer/Navegación
  headerFooter: '#161616',
  menuTextoPrincipal: '#710014',
  
  // Branding
  logoBranding: '#9f6d1f',
  
  // Estados
  warning: '#D98E04',
  danger: '#590C0C',
  success: '#6E7D57',
  
  // Elementos interactivos
  /** Color de hover estándar para todos los elementos interactivos (botones, enlaces, cards, etc.). Es el único que debe usarse. */
  hover: '#A64B63',
  botonesPrincipales: '#710014',
  enlacesTextosInteractivos: '#4A7BA7',
  
  // Textos
  textoFondoOscuro: '#F2F1ED',
  
  // Otros
  encabezadosAlterno: '#2A2A2A',
  iconografia: '#BFA181',
} as const;


export const socialColors = {
  
  // Instagram - Gradiente completo
  instagramGradient: 'linear-gradient(45deg, #FCAF45 0%, #FF8C42 15%, #E1306C 40%, #833AB4 70%, #405DE6 100%)',
  
  // Facebook
  facebook: '#1877F2',
  
  // Twitter/X
  twitter: '#1DA1F2',
} as const;

/**
 * Helper para obtener colores con opacidad
 */
export const colorsWithOpacity = {
  textoFondoOscuro70: 'rgba(242, 241, 237, 0.7)',
  textoFondoOscuro80: 'rgba(242, 241, 237, 0.8)',
  textoFondoOscuro10: 'rgba(242, 241, 237, 0.1)',
  bordeSutil: 'rgba(255, 255, 255, 0.1)',
  bordeVisible: 'rgba(255, 255, 255, 0.2)',
  bordeSecundario: 'rgba(255, 255, 255, 0.3)',
} as const;

/**
 * Tipo para TypeScript (autocompletado)
 */
export type ColorKey = keyof typeof colors;
export type ColorWithOpacityKey = keyof typeof colorsWithOpacity;

