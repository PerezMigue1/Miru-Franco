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
  return (
    <div
      className="overflow-x-auto rounded-xl border"
      style={{ borderColor: 'var(--borde-sutil)', backgroundColor: 'var(--fondo-general)' }}
    >
      <table className={`w-full ${className}`}>
        <thead>
          <tr
            style={
              headerSutil
                ? { backgroundColor: 'transparent', borderBottom: '2px solid var(--fondos-suaves)' }
                : { backgroundColor: 'var(--encabezados-alterno)' }
            }
          >
            {headers.map((header, index) => (
              <th
                key={index}
                className={`px-4 py-3 text-left text-xs font-semibold sticky top-0 z-10 ${
                  legible ? 'normal-case leading-snug' : 'uppercase tracking-wider'
                }`}
                style={{
                  color: headerSutil ? 'var(--encabezados-alterno)' : 'var(--texto-fondo-oscuro)',
                  backgroundColor: headerSutil ? 'var(--fondo-general)' : undefined,
                  ...(stickyFirstColumn && index === 0
                    ? { left: 0, zIndex: 12, boxShadow: '1px 0 0 var(--borde-sutil)' }
                    : {}),
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: 'var(--borde-sutil)' }}>
          {children}
        </tbody>
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
      className={`
        transition-colors duration-200
        ${onClick ? 'cursor-pointer hover:opacity-90' : ''}
        ${className}
      `}
      style={{
        backgroundColor: 'var(--fondo-general)',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.backgroundColor = 'var(--fondos-suaves)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.backgroundColor = 'var(--fondo-general)';
        }
      }}
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
              boxShadow: '1px 0 0 var(--borde-sutil)',
            }
          : {}),
        ...style,
      }}
    >
      {children}
    </td>
  );
}

