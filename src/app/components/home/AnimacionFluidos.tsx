'use client';

import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

const PROPORCION_GIRO = 422 / 1364;

/** Alto del cromo fijo del sitio (header + barra vino): la misma variable que usa el layout. */
function desplazamientoCabecera(): number {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mf-header-offset'));
  return Number.isFinite(v) && v > 0 ? v : document.querySelector('header')?.getBoundingClientRect().height ?? 0;
}

/**
 * Movimiento del hero de fluidos (parallax, pop de stickers, giro del Goji al hacer scroll). Vive
 * en su propio chunk y se carga después de hidratar: GSAP no compite con la imagen LCP del hero.
 * No pinta nada; trabaja sobre el markup que ya renderizó HeroFluidos.
 *
 * El pin es CSS (escenario `position: sticky` + `.mf-fluidos__recorrido`) y el progreso del scroll
 * se lee solo mientras el hero está a la vista (IntersectionObserver): fuera de ella no queda ningún
 * bucle de requestAnimationFrame, y en reposo el ticker de GSAP se duerme solo. (ScrollTrigger
 * mantiene un rAF perpetuo que no se puede pausar sin reinicializarlo.)
 */
export default function AnimacionFluidos({ idSeccion }: { idSeccion: string }) {
  useGSAP(
    () => {
      const raiz = document.getElementById(idSeccion);
      if (!raiz) return;
      const escenario = raiz.querySelector<HTMLElement>('.mf-fluidos__escenario')!;
      const lienzo = raiz.querySelector<HTMLCanvasElement>('.mf-fluidos__giro')!;
      const gojiImg = raiz.querySelector<HTMLElement>('[data-clave="goji"] .mf-fluidos__frasco-img')!;
      const introActiva = document.documentElement.getAttribute('data-intro') === 'si';
      raiz.dataset.animado = '';

      const mm = gsap.matchMedia();
      mm.add(
        {
          grande: '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
          chico: '(max-width: 767.98px) and (prefers-reduced-motion: no-preference)',
        },
        (ctx) => {
          const grande = Boolean(ctx.conditions?.grande);
          const capas = gsap.utils.toArray<HTMLElement>('.mf-fluidos__capa, .mf-sticker-capa', raiz);
          // El pop anima el sticker interior; la capa queda para el parallax y la salida con el scroll
          const stickers = gsap.utils.toArray<HTMLElement>('.mf-sticker-capa .mf-sticker', raiz);

          // ── Stickers: pop escalonado (después de la intro si se está mostrando)
          // (el CSS los deja en opacidad 0 mientras llega este chunk)
          gsap.fromTo(
            stickers,
            { opacity: 0, scale: 0.7, y: 10 },
            { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'back.out(1.6)', stagger: 0.08, delay: introActiva ? 1.15 : 0.1 }
          );

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
          }, introActiva ? 900 : 150);

          // ── Tamaño del lienzo = tamaño final del frasco en la sección de destino
          const medirLienzo = () => {
            // Sobre el alto visible del escenario (en móvil el escenario es más alto que la pantalla)
            const visible = Math.min(escenario.clientHeight, window.innerHeight - desplazamientoCabecera());
            const alto = Math.min(visible * (grande ? 0.7 : 0.42), 700);
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

          const gigante = raiz.querySelector<HTMLElement>('.mf-fluidos__destino')!;
          const marca = raiz.querySelector<HTMLElement>('.mf-fluidos__destino-marca')!;
          // Punto final del Goji: centro del ancla del destino, relativo al centro del escenario (el
          // lienzo está centrado en él). Se mide con offsets de layout, no con getBoundingClientRect,
          // porque el destino entra escalado.
          const destinoFinal = () => ({
            x: gigante.offsetLeft + marca.offsetLeft + marca.offsetWidth / 2 - escenario.clientWidth / 2,
            y: gigante.offsetTop + marca.offsetTop + marca.offsetHeight / 2 - escenario.clientHeight / 2,
          });
          const aSalir = gsap.utils.toArray<HTMLElement>(
            '.mf-fluidos__texto, .mf-fluidos__capa:not([data-clave="goji"]), .mf-sticker-capa',
            raiz
          );
          const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
          tl.to(aSalir, { opacity: 0, y: -48, duration: 0.35, stagger: 0.02 }, 0)
            .fromTo(gigante, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'power1.out' }, 0.22)
            .fromTo(
              lienzo,
              { xPercent: -50, yPercent: -50, x: () => inicio().x, y: () => inicio().y, scale: () => inicio().scale },
              { xPercent: -50, yPercent: -50, x: () => destinoFinal().x, y: () => destinoFinal().y, scale: 1, duration: 1, ease: 'power1.inOut' },
              0
            );

          // ── Progreso del scroll (0 = hero en reposo, 1 = Goji sobre la tipografía gigante), suavizado
          // como un scrub de 0.6 s. Solo se escucha el scroll mientras el hero está a la vista.
          const estado = { p: 0 };
          const aplicar = () => {
            const p = estado.p;
            tl.progress(p);
            const viajando = p > 0.002 && listos > 0;
            enReposo = p < 0.002;
            if (!enReposo) movedores.forEach((m) => (m.x(0), m.y(0), m.r(0)));
            lienzo.style.opacity = viajando ? '1' : '0';
            gojiImg.style.opacity = viajando ? '0' : '1';
            pintar(p);
          };
          const irA = gsap.quickTo(estado, 'p', { duration: 0.6, ease: 'power3', onUpdate: aplicar });
          let cabecera = desplazamientoCabecera();
          const leer = () => {
            const recorrido = raiz.offsetHeight - escenario.offsetHeight;
            const p = recorrido > 0 ? gsap.utils.clamp(0, 1, (cabecera - raiz.getBoundingClientRect().top) / recorrido) : 0;
            irA(p);
          };
          let cuadroPendiente = 0;
          const alScroll = () => {
            if (cuadroPendiente) return;
            cuadroPendiente = requestAnimationFrame(() => {
              cuadroPendiente = 0;
              leer();
            });
          };
          const vigia = new IntersectionObserver(([entrada]) => {
            if (entrada?.isIntersecting) {
              cabecera = desplazamientoCabecera();
              window.addEventListener('scroll', alScroll, { passive: true });
              leer();
            } else {
              window.removeEventListener('scroll', alScroll);
            }
          });
          vigia.observe(raiz);

          // Cambio de ancho (no el de la barra del navegador móvil): se remiden lienzo y trayectoria
          let anchoPrevio = window.innerWidth;
          let reajuste = 0;
          const alRedimensionar = () => {
            window.clearTimeout(reajuste);
            reajuste = window.setTimeout(() => {
              cabecera = desplazamientoCabecera();
              if (window.innerWidth === anchoPrevio) return;
              anchoPrevio = window.innerWidth;
              medirLienzo();
              tl.progress(0).invalidate();
              aplicar();
            }, 150);
          };
          window.addEventListener('resize', alRedimensionar);

          return () => {
            vigia.disconnect();
            window.removeEventListener('scroll', alScroll);
            window.removeEventListener('resize', alRedimensionar);
            cancelAnimationFrame(cuadroPendiente);
            window.clearTimeout(reajuste);
            window.clearTimeout(precargar);
            window.removeEventListener('pointermove', alPuntero);
            window.removeEventListener('deviceorientation', alOrientar);
            gojiImg.style.opacity = '';
          };
        }
      );
    },
    { dependencies: [idSeccion] }
  );

  return null;
}
