'use client';

import { createContext, useContext, type CSSProperties, type ReactNode } from 'react';

/**
 * Superficie visual en la que se renderiza un componente compartido (Card, Button…).
 * - 'panel' (por defecto): /admin y /operacion, sin ningún cambio respecto al diseño original.
 * - 'cliente': pantallas públicas y de cliente, con la variante descrita en DESIGN.md.
 * Así los componentes de components/ui siguen siendo los mismos para todos, pero el
 * rediseño de cliente no puede filtrarse a los paneles internos.
 */
export type Superficie = 'panel' | 'cliente';

const SuperficieContext = createContext<Superficie>('panel');

export function useSuperficie(): Superficie {
  return useContext(SuperficieContext);
}

interface SuperficieClienteProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** Envuelve una pantalla de cliente: activa la variante visual y el scope CSS `.superficie-cliente`. */
export default function SuperficieCliente({ children, className = '', style }: SuperficieClienteProps) {
  return (
    <SuperficieContext.Provider value="cliente">
      <div className={`superficie-cliente ${className}`.trim()} style={style}>
        {children}
      </div>
    </SuperficieContext.Provider>
  );
}
