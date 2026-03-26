'use client';

import { ReactNode } from 'react';

interface TableProps {
  headers: string[];
  children: ReactNode;
  className?: string;
}

export default function Table({ headers, children, className = '' }: TableProps) {
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
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider sticky top-0 z-10"
                style={{ color: 'var(--texto-fondo-oscuro)' }}
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
}

export function TableCell({ children, className = '', colSpan, style }: TableCellProps) {
  return (
    <td
      colSpan={colSpan}
      className={`px-4 py-3 whitespace-nowrap text-sm ${className}`}
      style={{ color: 'var(--menu-texto-principal)', ...style }}
    >
      {children}
    </td>
  );
}

