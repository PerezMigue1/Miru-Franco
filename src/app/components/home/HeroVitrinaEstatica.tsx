import Image from 'next/image';
import Link from 'next/link';
import type { ProductoHero } from '../../utils/heroProductos';

/** Cuántas tarjetas caben en la vitrina a la vez (el resto espera fuera, detrás). */
const EN_VITRINA = 5;

/**
 * Vitrina estática de productos reales: tarjetas escalonadas en profundidad (CSS 3D, sin JS).
 * Es a la vez el HTML del servidor, lo que se ve mientras carga la escena WebGL y el respaldo
 * con `prefers-reduced-motion`, sin WebGL o en equipos modestos. El producto destacado pasa al
 * frente y los demás rotan detrás (transición CSS de transform; instantánea con movimiento reducido).
 */
export default function HeroVitrinaEstatica({
  productos,
  destacado = 0,
  inerte = false,
}: {
  productos: ProductoHero[];
  destacado?: number;
  /** true cuando la escena 3D ya la reemplazó: fuera del orden de tabulación. */
  inerte?: boolean;
}) {
  const total = productos.length;
  return (
    <div className="mf-vitrina" inert={inerte}>
      {productos.map((p, i) => {
        const pos = (i - destacado + total) % total;
        const visible = pos < EN_VITRINA;
        return (
          <Link
            key={p.id}
            href={`/cliente/tienda-online/productos/${p.id}`}
            className="mf-vitrina__tarjeta"
            data-pos={visible ? pos : 'fuera'}
            tabIndex={visible ? undefined : -1}
            aria-hidden={visible ? undefined : true}
            aria-label={`${p.nombre}${p.marca ? `, ${p.marca}` : ''}, ${p.precio}`}
          >
            <span className="mf-vitrina__foto">
              <Image
                src={p.imagen}
                alt=""
                fill
                sizes="(max-width: 768px) 42vw, 16rem"
                className="object-cover"
                priority={i === 0}
              />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
