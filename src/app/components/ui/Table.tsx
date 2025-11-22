'use client';

import { ReactNode } from 'react';
import { colors, colorsWithOpacity } from '../../utils/colors';

interface TableProps {
  headers: string[];
  children: ReactNode;
  className?: string;
}

export default function Table({ headers, children, className = '' }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-lg">
      <table className={`w-full ${className}`}>
        <thead>
          <tr style={{ backgroundColor: colors.encabezadosAlterno }}>
            {headers.map((header, index) => (
              <th
                key={index}
                className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider"
                style={{ color: colors.textoFondoOscuro }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: colorsWithOpacity.bordeSutil }}>
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
        backgroundColor: colors.fondoGeneral,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.backgroundColor = colors.fondosSuaves;
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.backgroundColor = colors.fondoGeneral;
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
}

export function TableCell({ children, className = '' }: TableCellProps) {
  return (
    <td
      className={`px-6 py-4 whitespace-nowrap text-sm ${className}`}
      style={{ color: colors.menuTextoPrincipal }}
    >
      {children}
    </td>
  );
}

