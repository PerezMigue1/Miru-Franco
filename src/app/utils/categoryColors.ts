/**
 * Mapeo de categorías a variantes de colores
 * Asigna diferentes colores de la paleta a cada categoría para mejor diferenciación visual
 */

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export const getCategoryColor = (categoria: string): BadgeVariant => {
  const categoriaLower = categoria.toLowerCase().trim();
  
  // Mapeo de categorías a colores - ordenado por prioridad
  const categoryMap: Record<string, BadgeVariant> = {
    // Servicios
    'corte': 'info',
    'color': 'info',
    'coloración': 'info',
    'químico': 'warning',
    'depilación': 'danger',
    'tratamiento': 'success',
    'peinado': 'default',
    'alaciado': 'warning',
    'nanoplastía': 'warning',
    'nanoplastia': 'warning',
    
    // Productos
    'cuidado': 'info',
    'tratamiento': 'success',
    'químico': 'warning',
    
    // Estados y tipos
    'venta': 'success',
    'uso interno': 'warning',
    'disponible': 'success',
    'bajo': 'warning',
    'agotado': 'danger',
  };

  // Buscar coincidencia exacta primero
  if (categoryMap[categoriaLower]) {
    return categoryMap[categoriaLower];
  }

  // Buscar coincidencia parcial
  for (const [key, variant] of Object.entries(categoryMap)) {
    if (categoriaLower.includes(key) || key.includes(categoriaLower)) {
      return variant;
    }
  }

  // Asignación por hash para categorías no mapeadas (consistente)
  const hash = categoriaLower.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const variants: BadgeVariant[] = ['default', 'info', 'success', 'warning', 'danger'];
  return variants[hash % variants.length];
};

