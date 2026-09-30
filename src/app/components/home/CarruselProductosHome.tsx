'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductoImagenCarruselTarjeta } from '../tienda/ProductoImagenCarruselTarjeta';
import { ServicioImagenPlaceholder } from '../servicios/ServicioImagen';
import { urlsGaleriaProductoCatalogo, type Producto } from '../../services/productos';
import { useInclinacion3D } from '../../hooks/useInclinacion3D';
import { precioParaMostrar } from '../../utils/formatoPrecio';

const CARD_WIDTH_PX = 288;
const SCROLL_STEP = CARD_WIDTH_PX + 24;

function TarjetaProducto({ producto }: { producto: Producto }) {
  const { ref, brilloRef } = useInclinacion3D<HTMLAnchorElement>();
  const galeria = urlsGaleriaProductoCatalogo(producto);
  return (
    <Link
      ref={ref}
      href={`/cliente/tienda-online/productos/${encodeURIComponent(String(producto.id))}`}
      className="mf-inclinable group block flex-shrink-0 w-72 overflow-hidden text-left"
      style={{
        backgroundColor: 'var(--tarjetas-paneles)',
        borderRadius: 'var(--mf-radio)',
        boxShadow: 'var(--mf-sombra-1)',
      }}
    >
      <span ref={brilloRef} className="mf-inclinable__brillo" aria-hidden />
      <div className="aspect-square relative w-full overflow-hidden" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
        {galeria.length > 0 ? (
          <ProductoImagenCarruselTarjeta
            urls={galeria}
            alt={producto.nombre}
            imageClassName="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <ServicioImagenPlaceholder />
        )}
      </div>
      <div className="p-5">
        <h3 className="font-semibold text-base line-clamp-1" style={{ color: 'var(--menu-texto-principal)' }}>
          {producto.nombre}
        </h3>
        {producto.marca && (
          <p className="text-xs uppercase tracking-wider mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
            {producto.marca}
          </p>
        )}
        {/* Sin precio cargado (0 o vacío) no se anuncia "$0": se invita a consultar */}
        <p className="mf-cifras mt-3 text-lg font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
          {precioParaMostrar(producto.precio) ?? 'Consultar precio'}
        </p>
      </div>
    </Link>
  );
}

/**
 * Carrusel de productos del home: la única parte de esa sección que necesita estado (flechas e
 * inclinación). Las flechas van en una fila de controles debajo, nunca encima de las fotos.
 */
export default function CarruselProductosHome({ productos }: { productos: Producto[] }) {
  const carrilRef = useRef<HTMLDivElement>(null);

  const desplazar = (dir: 'left' | 'right') => {
    carrilRef.current?.scrollBy({ left: dir === 'left' ? -SCROLL_STEP : SCROLL_STEP, behavior: 'smooth' });
  };

  return (
    <div className="mf-revelar">
      <div ref={carrilRef} className="mf-carrusel-borde w-full overflow-x-auto overflow-y-hidden pt-2 pb-6 scroll-smooth scrollbar-hide">
        <div className="flex gap-6 min-w-max">
          {productos.map((producto) => (
            <div key={producto.id}>
              <TarjetaProducto producto={producto} />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-end gap-3">
        <button type="button" className="mf-carrusel-flecha" onClick={() => desplazar('left')} aria-label="Ver productos anteriores">
          <ChevronLeft size={20} aria-hidden />
        </button>
        <button type="button" className="mf-carrusel-flecha" onClick={() => desplazar('right')} aria-label="Ver más productos">
          <ChevronRight size={20} aria-hidden />
        </button>
      </div>
    </div>
  );
}
