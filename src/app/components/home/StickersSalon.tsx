import type { CSSProperties } from 'react';

type Motivo = 'tijeras' | 'peine' | 'gota' | 'destello';

/**
 * Stickers del hero: figuras vectoriales troqueladas (borde de papel lino + sombra) en la paleta
 * de la marca. Decorativos: ocultos para lectores de pantalla.
 */
export function Sticker({
  motivo,
  fondo,
  tinta,
  className = '',
  style,
}: {
  motivo: Motivo;
  fondo: string;
  tinta: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span className={`mf-sticker ${className}`} style={style} aria-hidden>
      <svg viewBox="0 0 64 64" width="100%" height="100%">
        {motivo === 'destello' ? (
          <path
            d="M32 4c2.2 12.6 6.8 18.6 28 28-21.2 9.4-25.8 15.4-28 28-2.2-12.6-6.8-18.6-28-28 21.2-9.4 25.8-15.4 28-28Z"
            fill={fondo}
            stroke="#f6efe6"
            strokeWidth="4"
            strokeLinejoin="round"
          />
        ) : motivo === 'gota' ? (
          <>
            <path
              d="M32 5C24 18 12 29 12 41a20 20 0 0 0 40 0C52 29 40 18 32 5Z"
              fill={fondo}
              stroke="#f6efe6"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path d="M23 41a9 9 0 0 0 6 8.5" fill="none" stroke={tinta} strokeWidth="3.5" strokeLinecap="round" />
          </>
        ) : (
          <>
            <rect x="5" y="5" width="54" height="54" rx="17" fill={fondo} stroke="#f6efe6" strokeWidth="4" />
            {motivo === 'tijeras' ? (
              <g fill="none" stroke={tinta} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="22" cy="42" r="6" />
                <circle cx="42" cy="42" r="6" />
                <path d="M26.5 38 44 17M37.5 38 20 17" />
              </g>
            ) : (
              <g fill="none" stroke={tinta} strokeWidth="3.2" strokeLinecap="round">
                <path d="M15 24h34a3 3 0 0 1 3 3v2H12v-2a3 3 0 0 1 3-3Z" fill={tinta} />
                <path d="M16 29v13M22 29v15M28 29v13M34 29v15M40 29v13M46 29v15" />
              </g>
            )}
          </>
        )}
      </svg>
    </span>
  );
}
