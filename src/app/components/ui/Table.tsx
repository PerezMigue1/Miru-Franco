'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import Button from './Button';

/**
 * Hacia dónde queda contenido oculto en un marco con desplazamiento horizontal (1 px de tolerancia
 * por el redondeo de los navegadores con zoom). Con esto el marco pinta su señal de desplazamiento.
 */
export function estadoDesborde(scrollLeft: number, scrollWidth: number, clientWidth: number): { izquierda: boolean; derecha: boolean } {
  return {
    izquierda: scrollLeft > 1,
    derecha: scrollLeft + clientWidth < scrollWidth - 1,
  };
}

interface TableProps {
  headers: ReactNode[];
  children: ReactNode;
  className?: string;
  /**
   * false = encabezados en mayúsculas tipo etiqueta (comportamiento anterior).
   * true = texto normal, mejor para frases largas en español.
   */
  headersLegibles?: boolean;
  /** Fija la primera columna (encabezado y celdas) al desplazar de lado: el dato que identifica la fila sigue a la vista. */
  stickyFirstColumn?: boolean;
  /** true = header con fondo sutil (borde inferior) en vez del fondo oscuro sólido por defecto. */
  headerSutil?: boolean;
  /** Nombre del marco cuando se puede desplazar (lector de pantalla y foco con teclado). */
  etiqueta?: string;
  /** true mientras se cargan datos de sus celdas: un solo aria-busy en la tabla, no una región viva por celda. */
  ocupada?: boolean;
}

export default function Table({
  headers,
  children,
  className = '',
  headersLegibles,
  stickyFirstColumn = false,
  headerSutil = false,
  etiqueta = 'Tabla con más columnas a los lados',
  ocupada = false,
}: TableProps) {
  const legible = headersLegibles === true;
  // headerSutil se conserva por compatibilidad: el encabezado del sistema ya es el sutil (la banda
  // oscura anterior caía a 2.9:1 en modo oscuro).
  void headerSutil;

  const marcoRef = useRef<HTMLDivElement>(null);
  const [desborde, setDesborde] = useState({ izquierda: false, derecha: false });

  // La señal se recalcula al desplazar y al cambiar de tamaño el marco o la tabla (llegan filas,
  // cambia el ancho de la ventana). ResizeObserver avisa una vez al empezar a observar.
  useEffect(() => {
    const marco = marcoRef.current;
    if (!marco) return;
    const medir = () => {
      const s = estadoDesborde(marco.scrollLeft, marco.scrollWidth, marco.clientWidth);
      setDesborde((prev) => (prev.izquierda === s.izquierda && prev.derecha === s.derecha ? prev : s));
    };
    marco.addEventListener('scroll', medir, { passive: true });
    const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(medir);
    observador?.observe(marco);
    if (marco.firstElementChild) observador?.observe(marco.firstElementChild);
    return () => {
      marco.removeEventListener('scroll', medir);
      observador?.disconnect();
    };
  }, []);

  const desplazable = desborde.izquierda || desborde.derecha;
  const verMas = () => {
    const marco = marcoRef.current;
    if (!marco) return;
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    marco.scrollBy({ left: marco.clientWidth * 0.75, behavior: reducido ? 'auto' : 'smooth' });
  };

  return (
    <div
      className="mf-tabla-envoltura"
      data-desborde-izq={desborde.izquierda ? 'true' : undefined}
      data-desborde-der={desborde.derecha ? 'true' : undefined}
      data-primera-fija={stickyFirstColumn ? 'true' : undefined}
    >
      <div
        ref={marcoRef}
        className="mf-tabla-marco"
        role={desplazable ? 'region' : undefined}
        aria-label={desplazable ? etiqueta : undefined}
        tabIndex={desplazable ? 0 : undefined}
      >
        <table className={`mf-tabla w-full${stickyFirstColumn ? ' mf-tabla--primera-fija' : ''} ${className}`} aria-busy={ocupada || undefined}>
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  scope="col"
                  className={`px-4 py-3 text-left text-xs font-semibold sticky top-0 z-10 ${
                    legible ? 'normal-case leading-snug' : 'uppercase tracking-wider'
                  }`}
                  style={
                    stickyFirstColumn && index === 0
                      ? { left: 0, zIndex: 12, boxShadow: '1px 0 0 var(--mf-linea-fuerte)' }
                      : undefined
                  }
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
      {/* Señal visible de que hay más columnas a la derecha; con ratón, además, desplaza. */}
      {desborde.derecha && (
        <button type="button" className="mf-tabla-senal" tabIndex={-1} aria-hidden onClick={verMas} title="Ver más columnas">
          <ChevronRight size={16} aria-hidden />
        </button>
      )}
    </div>
  );
}

interface TableRowProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function TableRow({ children, onClick, className = '' }: TableRowProps) {
  return (
    <tr
      className={className}
      data-clicable={onClick ? 'true' : undefined}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

interface TableCellProps {
  children: ReactNode;
  className?: string;
  colSpan?: number;
  style?: React.CSSProperties;
  stickyLeft?: boolean;
  /** 'lg' = más aire vertical (py-5) en vez del py-3 por defecto. */
  rowPadding?: 'default' | 'lg';
}

export function TableCell({ children, className = '', colSpan, style, stickyLeft = false, rowPadding = 'default' }: TableCellProps) {
  return (
    <td
      colSpan={colSpan}
      className={`px-4 whitespace-nowrap text-sm ${rowPadding === 'lg' ? 'py-5' : 'py-3'} ${className}`}
      style={{
        color: 'var(--menu-texto-principal)',
        ...(stickyLeft
          ? {
              position: 'sticky',
              left: 0,
              zIndex: 8,
              backgroundColor: 'var(--fondo-general)',
              boxShadow: '1px 0 0 var(--mf-linea-fuerte)',
            }
          : {}),
        ...style,
      }}
    >
      {children}
    </td>
  );
}

interface PaginacionTablaProps {
  pagina: number;
  totalPaginas: number;
  /** Registros en total (todas las páginas). */
  total: number;
  /** Plural de lo que se lista: "clientes", "usuarios". */
  unidad: string;
  onCambiar: (pagina: number) => void;
  deshabilitado?: boolean;
  className?: string;
}

/** Pie de una tabla paginada: dónde va y cuántos hay, con Anterior y Siguiente. Sin nada que paginar no se muestra. */
export function PaginacionTabla({ pagina, totalPaginas, total, unidad, onCambiar, deshabilitado = false, className = '' }: PaginacionTablaProps) {
  if (totalPaginas <= 1) return null;
  return (
    <nav aria-label={`Páginas de ${unidad}`} className={`flex flex-col sm:flex-row items-center justify-between gap-3 ${className}`}>
      <p className="text-xs mf-cifras" style={{ color: 'var(--encabezados-alterno)' }}>
        {`Página ${pagina} de ${totalPaginas} · ${total.toLocaleString('es-MX')} ${unidad}`}
      </p>
      <div className="flex items-center gap-2">
        <Button size="md" variant="outline" className="inline-flex items-center gap-1" onClick={() => onCambiar(pagina - 1)} disabled={deshabilitado || pagina <= 1}>
          <ChevronLeft size={14} aria-hidden /> Anterior
        </Button>
        <Button size="md" variant="outline" className="inline-flex items-center gap-1" onClick={() => onCambiar(pagina + 1)} disabled={deshabilitado || pagina >= totalPaginas}>
          Siguiente <ChevronRight size={14} aria-hidden />
        </Button>
      </div>
    </nav>
  );
}

interface TablaVaciaProps {
  icono: LucideIcon;
  titulo: string;
  descripcion?: string;
  /** Lo que se puede hacer desde aquí (registrar el primero, ir a la pantalla que lo crea). */
  accion?: ReactNode;
}

/** Estado vacío de un listado (DESIGN §4): ícono de la marca, qué pasa y una acción. */
export function TablaVacia({ icono: Icono, titulo, descripcion, accion }: TablaVaciaProps) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <Icono size={36} aria-hidden style={{ color: 'var(--oro-texto)' }} />
      <p className="mt-3 font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
        {titulo}
      </p>
      {descripcion && (
        <p className="mt-1 max-w-sm text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
          {descripcion}
        </p>
      )}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}
