'use client';

import { ReactNode } from 'react';

interface TableProps {
  headers: ReactNode[];
  children: ReactNode;
  className?: string;
  /**
   * false = encabezados en mayúsculas tipo etiqueta (comportamiento anterior).
   * true = texto normal, mejor para frases largas en español.
   */
  headersLegibles?: boolean;
  stickyFirstColumn?: boolean;
  /** true = header con fondo sutil (borde inferior) en vez del fondo oscuro sólido por defecto. */
  headerSutil?: boolean;
}

export default function Table({
  headers,
  children,
  className = '',
  headersLegibles,
  stickyFirstColumn = false,
  headerSutil = false,
}: TableProps) {
  const legible = headersLegibles === true;
  // headerSutil se conserva por compatibilidad: el encabezado del sistema ya es el sutil (la banda
  // oscura anterior caía a 2.9:1 en modo oscuro).
  void headerSutil;
  return (
    <div className="mf-tabla-marco">
      <table className={`mf-tabla w-full ${className}`}>
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

