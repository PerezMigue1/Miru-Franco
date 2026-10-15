/** Texto único para aclarar los precios del portal (los términos dicen lo mismo: totales, en MXN, con IVA). */
export const LEYENDA_PRECIO_IVA = 'Precio total en pesos, IVA incluido';

/**
 * Leyenda breve de precios: una por página o junto al precio del detalle, nunca en cada tarjeta.
 * `sobreOscuro` para las bandas carbón del home.
 */
export default function LeyendaPrecioIva({ className = '', sobreOscuro = false }: { className?: string; sobreOscuro?: boolean }) {
  return (
    <p
      className={`text-sm ${className}`}
      style={{ color: sobreOscuro ? 'var(--texto-fondo-oscuro-70)' : 'var(--encabezados-alterno)' }}
    >
      {LEYENDA_PRECIO_IVA}
    </p>
  );
}
