'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { FluidoHero } from '../../utils/fluidosHero';
import { Sticker } from './StickersSalon';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Posición y profundidad de cada frasco en la composición (profundidad = cuánto sigue al puntero). */
const CAPAS: Record<FluidoHero['clave'], { estilo: React.CSSProperties; prof: number; giro: number }> = {
  hialuronico: { estilo: { left: '76%', bottom: '26%', height: '56%', zIndex: 1 }, prof: 0.35, giro: 3 },
  argan: { estilo: { left: '6%', bottom: '15%', height: '67%', zIndex: 2 }, prof: 0.55, giro: -3 },
  platino: { estilo: { left: '60%', bottom: '9%', height: '71%', zIndex: 3 }, prof: 0.7, giro: 2.5 },
  goji: { estilo: { left: '33%', bottom: '2%', height: '86%', zIndex: 4 }, prof: 1, giro: -1.5 },
};
const ORDEN_CAPAS: FluidoHero['clave'][] = ['hialuronico', 'argan', 'platino', 'goji'];
const PROPORCION_GIRO = 422 / 1364;

/** Alto del cromo fijo del sitio (header + barra vino): la misma variable que usa el layout. */
function desplazamientoCabecera(): number {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mf-header-offset'));
  return Number.isFinite(v) && v > 0 ? v : document.querySelector('header')?.getBoundingClientRect().height ?? 0;
}

const STICKERS = [
  { motivo: 'tijeras', fondo: '#710014', tinta: '#f6efe6', estilo: { left: '1%', top: '10%', width: '4.25rem', rotate: '-12deg' }, prof: 1.3, movil: true },
  { motivo: 'destello', fondo: '#9f6d1f', tinta: '#f6efe6', estilo: { left: '56%', top: '2%', width: '3.25rem', rotate: '8deg' }, prof: 1.5, movil: true },
  { motivo: 'gota', fondo: '#d9728f', tinta: '#710014', estilo: { right: '0%', top: '30%', width: '3.4rem', rotate: '10deg' }, prof: 1.2, movil: false },
  { motivo: 'peine', fondo: '#dcc8b6', tinta: '#710014', estilo: { left: '22%', bottom: '4%', width: '3.9rem', rotate: '-7deg' }, prof: 1.4, movil: false },
] as const;

function Frasco({ clave, ancho, prioridad }: { clave: string; ancho: number; prioridad?: boolean }) {
  // Renders propios (AVIF/WebP con transparencia, recortados): las imágenes del API están rotas.
  return (
    <picture>
      <source type="image/avif" srcSet={`/hero/web/${clave}-240.avif 240w, /hero/web/${clave}-420.avif 420w`} sizes={`${ancho}px`} />
      <source type="image/webp" srcSet={`/hero/web/${clave}-240.webp 240w, /hero/web/${clave}-420.webp 420w`} sizes={`${ancho}px`} />
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
  const seccion = useRef<HTMLElement>(null);
  const porClave = Object.fromEntries(fluidos.map((f) => [f.clave, f])) as Record<FluidoHero['clave'], FluidoHero>;

  useGSAP(
    () => {
      const raiz = seccion.current;
      if (!raiz) return;
      const escenario = raiz.querySelector<HTMLElement>('.mf-fluidos__escenario')!;
      const lienzo = raiz.querySelector<HTMLCanvasElement>('.mf-fluidos__giro')!;
      const gojiImg = raiz.querySelector<HTMLElement>('[data-clave="goji"] .mf-fluidos__frasco-img')!;
      const introActiva = document.documentElement.getAttribute('data-intro') === 'si';
      ScrollTrigger.config({ ignoreMobileResize: true });

      const mm = gsap.matchMedia();
      mm.add(
        {
          grande: '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
          chico: '(max-width: 767.98px) and (prefers-reduced-motion: no-preference)',
        },
        (ctx) => {
          const grande = Boolean(ctx.conditions?.grande);
          const capas = gsap.utils.toArray<HTMLElement>('.mf-fluidos__capa, .mf-sticker-capa', raiz);
          const stickers = gsap.utils.toArray<HTMLElement>('.mf-sticker-capa:not([hidden])', raiz);

          // ── Stickers: pop escalonado (después de la intro si se está mostrando)
          gsap.from(stickers, {
            opacity: 0,
            scale: 0.7,
            y: 10,
            duration: 0.5,
            ease: 'back.out(1.6)',
            stagger: 0.08,
            delay: introActiva ? 1.15 : 0.25,
          });

          // ── Parallax al puntero (fino) o al giroscopio (Android; iOS pide permiso y se omite)
          const movedores = capas.map((el) => {
            const prof = Number(el.dataset.prof || 1) * (grande ? 1 : 0.5);
            return {
              prof,
              x: gsap.quickTo(el, 'x', { duration: 0.9, ease: 'power3' }),
              y: gsap.quickTo(el, 'y', { duration: 0.9, ease: 'power3' }),
              r: gsap.quickTo(el, 'rotation', { duration: 0.9, ease: 'power3' }),
            };
          });
          let enReposo = true;
          const mover = (nx: number, ny: number) => {
            if (!enReposo) return;
            for (const m of movedores) {
              m.x(nx * 20 * m.prof);
              m.y(ny * 14 * m.prof);
              m.r(nx * 2.5 * m.prof);
            }
          };
          const alPuntero = (e: PointerEvent) =>
            mover((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
          const alOrientar = (e: DeviceOrientationEvent) => {
            if (e.gamma == null || e.beta == null) return;
            mover(gsap.utils.clamp(-1, 1, e.gamma / 30), gsap.utils.clamp(-1, 1, (e.beta - 45) / 30));
          };
          const fino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
          const pidePermiso =
            typeof DeviceOrientationEvent !== 'undefined' &&
            typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission === 'function';
          if (fino) window.addEventListener('pointermove', alPuntero, { passive: true });
          else if (!pidePermiso) window.addEventListener('deviceorientation', alOrientar, { passive: true });

          // ── Secuencia de giro: 24 cuadros en escritorio, 12 en móvil; precarga tras el primer pintado
          const total = grande ? 24 : 12;
          const cuadros: HTMLImageElement[] = [];
          let listos = 0;
          const pintar = (p: number) => {
            const c = lienzo.getContext('2d');
            const img = cuadros[Math.min(total - 1, Math.round(p * (total - 1)))];
            if (!c || !img || !img.complete) return;
            c.clearRect(0, 0, lienzo.width, lienzo.height);
            c.drawImage(img, 0, 0, lienzo.width, lienzo.height);
          };
          const precargar = window.setTimeout(() => {
            for (let i = 0; i < total; i++) {
              const n = String(grande ? i : i * 2).padStart(2, '0');
              const img = new Image();
              img.decoding = 'async';
              img.onload = () => {
                listos++;
                if (i === 0) pintar(0);
              };
              img.src = `/hero/web/giro-${n}.webp`;
              cuadros.push(img);
            }
          }, introActiva ? 1400 : 500);

          // ── Tamaño del lienzo = tamaño final del frasco en la sección de destino
          const medirLienzo = () => {
            const alto = Math.min(escenario.clientHeight * (grande ? 0.78 : 0.42), 760);
            const ancho = alto * PROPORCION_GIRO;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            lienzo.style.width = `${ancho}px`;
            lienzo.style.height = `${alto}px`;
            lienzo.width = Math.round(ancho * dpr);
            lienzo.height = Math.round(alto * dpr);
            pintar(0);
          };
          medirLienzo();
          // Desplazamiento inicial: el lienzo arranca exactamente donde está el Goji de la composición
          const inicio = () => {
            const a = gojiImg.getBoundingClientRect();
            const b = escenario.getBoundingClientRect();
            const alto = parseFloat(lienzo.style.height) || 1;
            return {
              x: a.left + a.width / 2 - (b.left + b.width / 2),
              y: a.top + a.height / 2 - (b.top + b.height / 2),
              scale: a.height / alto,
            };
          };

          const gigante = raiz.querySelector('.mf-fluidos__destino')!;
          const aSalir = gsap.utils.toArray<HTMLElement>(
            '.mf-fluidos__texto, .mf-fluidos__capa:not([data-clave="goji"]), .mf-sticker-capa',
            raiz
          );
          const tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: escenario,
              // Se fija justo bajo el cromo del sitio (header + barra de navegación)
              start: () => `top ${desplazamientoCabecera()}px`,
              end: grande ? '+=140%' : '+=70%',
              pin: true,
              scrub: 0.6,
              invalidateOnRefresh: true,
              onRefresh: medirLienzo,
              onUpdate: (self) => {
                const viajando = self.progress > 0.002 && listos > 0;
                enReposo = self.progress < 0.002;
                if (!enReposo) movedores.forEach((m) => (m.x(0), m.y(0), m.r(0)));
                lienzo.style.opacity = viajando ? '1' : '0';
                gojiImg.style.opacity = viajando ? '0' : '1';
                pintar(tl.progress());
              },
            },
          });
          tl.to(aSalir, { opacity: 0, y: -48, duration: 0.35, stagger: 0.02 }, 0)
            .fromTo(gigante, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'power1.out' }, 0.22)
            .fromTo(
              lienzo,
              { xPercent: -50, yPercent: -50, x: () => inicio().x, y: () => inicio().y, scale: () => inicio().scale },
              { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 1, duration: 1, ease: 'power1.inOut' },
              0
            );

          // El header publica su alto (--mf-header-offset) en su propio efecto, después de este:
          // se vuelven a medir los puntos de inicio cuando ya existe y cada vez que cambia.
          let ultimoDesplazamiento = desplazamientoCabecera();
          const refrescar = () => ScrollTrigger.refresh();
          const primerRefresco = requestAnimationFrame(refrescar);
          const observador = new MutationObserver(() => {
            const actual = desplazamientoCabecera();
            if (actual !== ultimoDesplazamiento) {
              ultimoDesplazamiento = actual;
              refrescar();
            }
          });
          observador.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

          return () => {
            cancelAnimationFrame(primerRefresco);
            observador.disconnect();
            window.clearTimeout(precargar);
            window.removeEventListener('pointermove', alPuntero);
            window.removeEventListener('deviceorientation', alOrientar);
            gojiImg.style.opacity = '';
          };
        }
      );
    },
    { scope: seccion }
  );

  return (
    <section ref={seccion} className="mf-fluidos hero-bg-gradient" style={{ marginTop: 'var(--mf-header-offset, 104px)' }}>
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
                    <Link href={`/cliente/tienda-online/productos/${f.id}`} className="mf-fluidos__chip">
                      <span className="mf-fluidos__punto" style={{ backgroundColor: f.color }} aria-hidden />
                      <span className="truncate">{f.nombre ?? 'Ver producto'}</span>
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
                    className="mf-fluidos__frasco"
                    aria-label={`${f.nombre ?? 'Fluido AVYNA'}${f.precio ? `, ${f.precio}` : ''}`}
                  >
                    <Frasco clave={clave} ancho={clave === 'goji' ? 200 : 160} prioridad={clave === 'goji'} />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Destino del Goji: tipografía gigante detrás del frasco. Texto PROVISIONAL. */}
        <div className="mf-fluidos__destino">
          <p className="mf-fluidos__gigante">
            Brillo <span>que se</span> nota
          </p>
          <Link
            href={`/cliente/tienda-online/productos/${porClave.goji.id}`}
            className="mf-fluidos__destino-frasco"
            aria-label={`${porClave.goji.nombre ?? 'Fluido Di Goji'}${porClave.goji.precio ? `, ${porClave.goji.precio}` : ''}`}
          >
            <Frasco clave="goji" ancho={220} />
          </Link>
        </div>
        <canvas className="mf-fluidos__giro" aria-hidden />
      </div>
    </section>
  );
}
