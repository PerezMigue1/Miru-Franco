'use client';

import type { KeyboardEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import Badge from '../ui/Badge';
import { ProductoImagenCarruselTarjeta } from './ProductoImagenCarruselTarjeta';
import { urlsGaleriaProductoCatalogo, type Producto } from '../../services/productos';
import { useInclinacion3D } from '../../hooks/useInclinacion3D';

/** Número de un precio mostrado ("$1,200" / "1200"). */
function aNumero(precio?: string | null): number {
  const n = Number(String(precio ?? '').replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

interface Props {
  producto: Producto;
  noDisponible: boolean;
  indice: number;
  onAbrir: () => void;
}

/**
 * Tarjeta del catálogo de la tienda (DESIGN.md): foto a sangre, jerarquía nombre → precio,
 * inclinación 3D con brillo dorado en escritorio. La entrada escalonada vive en el contenedor
 * y la inclinación en la tarjeta, para que las dos transformaciones no se pisen.
 */
export default function TarjetaCatalogo({ producto, noDisponible, indice, onAbrir }: Props) {
  const ref = useInclinacion3D<HTMLElement>(5);
  const original = aNumero(producto.precioOriginal);
  const actual = aNumero(producto.precio);
  // El tachado solo cuando hay un descuento real (antes salía aunque fuera el mismo precio).
  const hayRebaja = Number.isFinite(original) && Number.isFinite(actual) && original > actual;

  const alTeclado = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter') onAbrir();
  };

  return (
    <div className="mf-entrada h-full" style={{ ['--i' as string]: Math.min(indice, 8) }}>
      <article
        ref={ref}
        role="link"
        tabIndex={0}
        aria-label={`${producto.nombre}${noDisponible ? ' (no disponible)' : ''}`}
        onClick={onAbrir}
        onKeyDown={alTeclado}
        className="mf-inclinable group h-full flex flex-col overflow-hidden cursor-pointer"
        style={{ borderRadius: 'var(--mf-radio)', backgroundColor: 'var(--tarjetas-paneles)', boxShadow: 'var(--mf-sombra-1)' }}
      >
        <div className="relative aspect-square w-full overflow-hidden" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
          <div
            className={`relative h-full w-full transition-[filter,opacity] duration-300 ${noDisponible ? 'grayscale opacity-60' : ''}`}
          >
            <ProductoImagenCarruselTarjeta
              urls={urlsGaleriaProductoCatalogo(producto)}
              alt={producto.nombre}
              imageClassName="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            />
          </div>
          <div className="absolute top-3 right-3 z-30 flex flex-wrap justify-end gap-2">
            {producto.nuevo && <Badge variant="success" size="sm">Nuevo</Badge>}
            {(producto.descuento ?? 0) > 0 && <Badge variant="warning" size="sm">-{producto.descuento}%</Badge>}
            {noDisponible && <Badge variant="danger" size="sm">No disponible</Badge>}
          </div>
        </div>

        <div className="mf-capa-frontal flex flex-1 flex-col p-5">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--encabezados-alterno)' }}>
            {producto.categoria || 'Producto'}
            {producto.marca ? ` · ${producto.marca}` : ''}
          </p>
          <h3 className="mt-1.5 text-lg font-semibold leading-snug line-clamp-2" style={{ color: 'var(--menu-texto-principal)' }}>
            {producto.nombre}
          </h3>
          {producto.descripcion && (
            <p className="mt-2 text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--encabezados-alterno)' }}>
              {producto.descripcion}
            </p>
          )}
          <div className="mt-auto pt-5 flex items-end justify-between gap-3">
            <div className="mf-cifras">
              {hayRebaja && (
                <p className="text-sm line-through" style={{ color: 'var(--encabezados-alterno)' }}>
                  {producto.precioOriginal}
                </p>
              )}
              <p className="text-xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                {producto.precio}
              </p>
            </div>
            <span
              className="inline-flex items-center gap-1.5 text-sm font-semibold"
              style={{ color: 'var(--menu-texto-principal)' }}
              aria-hidden
            >
              Ver detalles
              <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </article>
    </div>
  );
}
