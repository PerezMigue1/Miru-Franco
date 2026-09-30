import type { CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SRCSET_GOJI_AVIF, TAMANO_GOJI, type FluidoHero } from '../../utils/fluidosHero';
import { Sticker } from './StickersSalon';
import ActivadorFluidos from './ActivadorFluidos';

const ID_SECCION = 'mf-hero-fluidos';

/** Posición y profundidad de cada frasco en la composición (profundidad = cuánto sigue al puntero). */
const CAPAS: Record<FluidoHero['clave'], { estilo: CSSProperties; prof: number; giro: number }> = {
  hialuronico: { estilo: { left: '76%', bottom: '26%', height: '56%', zIndex: 1 }, prof: 0.35, giro: 3 },
  argan: { estilo: { left: '6%', bottom: '15%', height: '67%', zIndex: 2 }, prof: 0.55, giro: -3 },
  platino: { estilo: { left: '60%', bottom: '9%', height: '71%', zIndex: 3 }, prof: 0.7, giro: 2.5 },
  goji: { estilo: { left: '33%', bottom: '2%', height: '86%', zIndex: 4 }, prof: 1, giro: -1.5 },
};
const ORDEN_CAPAS: FluidoHero['clave'][] = ['hialuronico', 'argan', 'platino', 'goji'];
/** Ancho pintado de los frascos de fondo (composición de 20–26rem de alto en móvil, 38rem en escritorio). */
const TAMANO_FRASCO = '(min-width: 768px) 140px, 95px';

const STICKERS = [
  { motivo: 'tijeras', fondo: '#710014', tinta: '#f6efe6', estilo: { left: '1%', top: '10%', width: '4.25rem', rotate: '-12deg' }, prof: 1.3, movil: true },
  { motivo: 'destello', fondo: '#9f6d1f', tinta: '#f6efe6', estilo: { left: '56%', top: '2%', width: '3.25rem', rotate: '8deg' }, prof: 1.5, movil: true },
  { motivo: 'gota', fondo: '#d9728f', tinta: '#710014', estilo: { right: '0%', top: '30%', width: '3.4rem', rotate: '10deg' }, prof: 1.2, movil: false },
  { motivo: 'peine', fondo: '#dcc8b6', tinta: '#710014', estilo: { left: '22%', bottom: '4%', width: '3.9rem', rotate: '-7deg' }, prof: 1.4, movil: false },
] as const;

function Frasco({ clave, sizes, prioridad }: { clave: string; sizes: string; prioridad?: boolean }) {
  // Renders propios (AVIF/WebP con transparencia, recortados): las imágenes del API están rotas.
  return (
    <picture>
      <source
        type="image/avif"
        srcSet={clave === 'goji' ? SRCSET_GOJI_AVIF : `/hero/web/${clave}-240.avif 240w, /hero/web/${clave}-420.avif 420w`}
        sizes={sizes}
      />
      <source type="image/webp" srcSet={`/hero/web/${clave}-240.webp 240w, /hero/web/${clave}-420.webp 420w`} sizes={sizes} />
      <img
        src={`/hero/web/${clave}-420.webp`}
        alt=""
        width={420}
        height={1364}
        className="mf-fluidos__frasco-img"
        fetchPriority={prioridad ? 'high' : 'auto'}
        loading={prioridad ? 'eager' : 'lazy'}
        decoding={prioridad ? 'sync' : 'async'}
      />
    </picture>
  );
}

/**
 * Hero 2.5D de la home: los cuatro fluidos AVYNA del catálogo flotan en capas con parallax al
 * puntero/giroscopio y stickers con pop escalonado. Al hacer scroll el Fluido Di Goji se fija,
 * viaja a la sección siguiente girando (secuencia goji_giro en <canvas>) y queda sobre la
 * tipografía gigante. Con prefers-reduced-motion todo queda estático (lo resuelve el CSS).
 */
export default function HeroFluidos({ fluidos }: { fluidos: FluidoHero[] }) {
  const porClave = Object.fromEntries(fluidos.map((f) => [f.clave, f])) as Record<FluidoHero['clave'], FluidoHero>;

  return (
    <>
      <section id={ID_SECCION} className="mf-fluidos hero-bg-gradient" style={{ marginTop: 'var(--mf-header-offset, 104px)' }}>
        <div className="mf-fluidos__escenario">
          <div className="mf-fluidos__rejilla layout-gutter-x">
            <div className="mf-fluidos__texto">
              <div className="flex items-center gap-3 mb-3 md:mb-4">
                <span className="hero-flourish" />
                <span className="hero-ornament" />
                <span className="hero-flourish" />
              </div>
              <h1 className="leading-none">
                <span className="text-brand-miru text-brand-gold tracking-tight block">MIRÚ</span>
                <span className="text-brand-franco text-brand-gold block -mt-1 ml-6 md:ml-10">Franco</span>
              </h1>
              <p className="text-brand-tagline tracking-[0.2em] mt-3 md:mt-4" style={{ color: 'var(--hero-tagline-color)' }}>
                BEAUTY SALON
              </p>
              <p className="mt-5 md:mt-6 max-w-md text-base md:text-lg leading-relaxed" style={{ color: 'var(--hero-tagline-color)' }}>
                Realza tu belleza natural con productos y servicios profesionales. Agenda tu cita y descubre la experiencia Mirú Franco.
              </p>
              <Link
                href="/cliente/servicios-citas"
                className="mf-btn mf-btn-color mt-7 md:mt-9 inline-flex items-center justify-center gap-2 px-7 rounded-full font-semibold text-sm uppercase tracking-wider"
                style={{
                  ['--btn-bg' as string]: 'var(--botones-principales)',
                  ['--btn-bg-hover' as string]: 'var(--hover)',
                  ['--btn-texto' as string]: '#F2F1ED',
                  minHeight: '48px',
                  boxShadow: '0 10px 24px -10px rgba(113, 0, 20, 0.55)',
                }}
              >
                Agendar cita
                <ArrowRight size={16} aria-hidden />
              </Link>

              {/* Los cuatro fluidos con nombre y precio del catálogo */}
              <ul className="mf-fluidos__leyenda" aria-label="Fluidos AVYNA en la tienda">
                {ORDEN_CAPAS.slice().reverse().map((clave) => {
                  const f = porClave[clave];
                  return (
                    <li key={clave}>
                      <Link href={`/cliente/tienda-online/productos/${f.id}`} prefetch={false} className="mf-fluidos__chip">
                        <span className="mf-fluidos__punto" style={{ backgroundColor: f.color }} aria-hidden />
                        <span className="mf-fluidos__chip-nombre">{f.nombre ?? 'Ver producto'}</span>
                        {f.precio && <span className="mf-cifras font-semibold">{f.precio}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mf-fluidos__composicion">
              {STICKERS.map((s, i) => (
                <div
                  key={s.motivo}
                  className={`mf-sticker-capa ${s.movil ? '' : 'mf-sticker-capa--escritorio'}`}
                  data-prof={s.prof}
                  style={s.estilo as React.CSSProperties}
                  data-i={i}
                >
                  <Sticker motivo={s.motivo} fondo={s.fondo} tinta={s.tinta} />
                </div>
              ))}
              {ORDEN_CAPAS.map((clave) => {
                const f = porClave[clave];
                const capa = CAPAS[clave];
                return (
                  <div
                    key={clave}
                    className="mf-fluidos__capa"
                    data-clave={clave}
                    data-prof={capa.prof}
                    style={{ ...capa.estilo, rotate: `${capa.giro}deg` }}
                  >
                    <Link
                      href={`/cliente/tienda-online/productos/${f.id}`}
                      prefetch={false}
                      className="mf-fluidos__frasco"
                      aria-label={`${f.nombre ?? 'Fluido AVYNA'}${f.precio ? `, ${f.precio}` : ''}`}
                    >
                      <Frasco clave={clave} sizes={clave === 'goji' ? TAMANO_GOJI : TAMANO_FRASCO} prioridad={clave === 'goji'} />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Destino del Goji: tipografía gigante con el frasco al lado. Texto PROVISIONAL. */}
          <div className="mf-fluidos__destino">
            <p className="mf-fluidos__gigante">
              Brillo <span>que se</span> nota
            </p>
            <span className="mf-fluidos__destino-marca" aria-hidden />
            <Link
              href={`/cliente/tienda-online/productos/${porClave.goji.id}`}
              prefetch={false}
              className="mf-fluidos__destino-frasco"
              aria-label={`${porClave.goji.nombre ?? 'Fluido Di Goji'}${porClave.goji.precio ? `, ${porClave.goji.precio}` : ''}`}
            >
              <Frasco clave="goji" sizes="(min-width: 768px) 240px, 150px" />
            </Link>
          </div>
          <canvas className="mf-fluidos__giro" aria-hidden />
        </div>
        {/* Distancia de scroll durante la que el escenario queda fijo y el Goji viaja (solo con movimiento) */}
        <div className="mf-fluidos__recorrido" aria-hidden />
      </section>
      <ActivadorFluidos idSeccion={ID_SECCION} />
    </>
  );
}
