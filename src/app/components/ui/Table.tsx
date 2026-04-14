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
}

export default function Table({
  headers,
  children,
  className = '',
  headersLegibles,
  stickyFirstColumn = false,
}: TableProps) {
  const legible = headersLegibles === true;
  return (
    <div
      className="overflow-x-auto rounded-xl border"
      style={{ borderColor: 'var(--borde-sutil)', backgroundColor: 'var(--fondo-general)' }}
    >
      <table className={`w-full ${className}`}>
        <thead>
          <tr style={{ backgroundColor: 'var(--encabezados-alterno)' }}>
            {headers.map((header, index) => (
              <th
                key={index}
                className={`px-4 py-3 text-left text-xs font-semibold sticky top-0 z-10 ${
                  legible ? 'normal-case leading-snug' : 'uppercase tracking-wider'
                }`}
                style={{
                  color: 'var(--texto-fondo-oscuro)',
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
}

export function TableCell({ children, className = '', colSpan, style, stickyLeft = false }: TableCellProps) {
  return (
    <td
      colSpan={colSpan}
      className={`px-4 py-3 whitespace-nowrap text-sm ${className}`}
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

