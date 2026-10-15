'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { FotoGaleria } from '../../utils/galeria';
import { ServicioImagenPlaceholder } from '../servicios/ServicioImagen';

interface GaleriaTrabajoProps {
  fotos: FotoGaleria[];
  /** Encabezado accesible del mosaico (el título visible lo pone la sección). */
  etiqueta: string;
}

/** Fotos que llenan un bloque completo del mosaico (12 celdas). Con menos, la rejilla es uniforme. */
const FOTOS_MOSAICO = 7;

type Rejilla =
  | { modo: 'mosaico' }
  | {
      modo: 'uniforme';
      columnas: { movil: 1 | 2; escritorio: 1 | 2 | 3 | 4 };
      /** Columnas que ocupa cada foto en móvil y desde md. */
      celdas: { movil: number; escritorio: number }[];
    };

/**
 * Con menos de 7 fotos el mosaico dejaba huecos (con 3, uno de ~640×250 px a 1440): rejilla uniforme
 * de hasta 4 columnas en escritorio (5 y 6 fotos en 3) y 2 en móvil. Si la última fila queda
 * incompleta, la última foto se ensancha para cerrarla.
 */
export function rejillaGaleria(total: number): Rejilla {
  if (total >= FOTOS_MOSAICO) return { modo: 'mosaico' };
  const movil = total === 1 ? 1 : 2;
  const escritorio = (total <= 4 ? Math.max(total, 1) : 3) as 1 | 2 | 3 | 4;
  const ancho = (i: number, columnas: number) => {
    const sobrantes = total % columnas;
    return i === total - 1 && sobrantes !== 0 ? columnas - sobrantes + 1 : 1;
  };
  return {
    modo: 'uniforme',
    columnas: { movil, escritorio },
    celdas: Array.from({ length: total }, (_, i) => ({ movil: ancho(i, movil), escritorio: ancho(i, escritorio) })),
  };
}

// Clases completas y literales para que Tailwind las genere.
const COLUMNAS_MOVIL = { 1: 'grid-cols-1', 2: 'grid-cols-2' } as const;
const COLUMNAS_ESCRITORIO = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' } as const;
const ANCHO_MOVIL: Record<number, string> = { 2: 'max-md:col-span-2' };
const ANCHO_ESCRITORIO: Record<number, string> = { 2: 'md:col-span-2', 3: 'md:col-span-3' };

/** Clases de la lista: el mosaico de cliente.css o la rejilla uniforme con su mismo alto de fila y separación. */
function claseLista(rejilla: Rejilla): string {
  if (rejilla.modo === 'mosaico') return 'mf-galeria-mosaico';
  const { movil, escritorio } = rejilla.columnas;
  // Una sola foto no se estira a todo el ancho del contenedor (sería una franja muy recortada).
  const ancho = rejilla.celdas.length === 1 ? 'max-w-md' : '';
  return `grid ${COLUMNAS_MOVIL[movil]} ${COLUMNAS_ESCRITORIO[escritorio]} auto-rows-[clamp(9rem,38vw,12rem)] gap-3 md:auto-rows-[clamp(11rem,16vw,15rem)] md:gap-4 ${ancho}`.trim();
}

/** Clase, forma y `sizes` de la imagen de cada celda (el ancho real de la celda, para no bajar fotos chicas). */
function celda(rejilla: Rejilla, i: number): { className?: string; forma?: ReturnType<typeof formaDeCelda>; sizes: string } {
  if (rejilla.modo === 'mosaico') {
    return { className: 'mf-galeria-celda', forma: formaDeCelda(i), sizes: '(max-width: 768px) 50vw, 25vw' };
  }
  const { movil, escritorio } = rejilla.celdas[i]!;
  const vw = (span: number, columnas: number) => `${Math.round((100 * span) / columnas)}vw`;
  return {
    className: [ANCHO_MOVIL[movil], ANCHO_ESCRITORIO[escritorio]].filter(Boolean).join(' ') || undefined,
    sizes: `(max-width: 768px) ${vw(movil, rejilla.columnas.movil)}, ${vw(escritorio, rejilla.columnas.escritorio)}`,
  };
}

/**
 * Mosaico editorial de fotos reales del salón con visor a pantalla completa.
 * Ritmo asimétrico: cada 7 fotos, una grande (2×2), una alta (1×2) y una ancha (2×1). Con menos de 7,
 * rejilla uniforme del mismo alto de fila y separación.
 */
export default function GaleriaTrabajo({ fotos, etiqueta }: GaleriaTrabajoProps) {
  const [abierta, setAbierta] = useState<number | null>(null);
  const disparadorRef = useRef<HTMLButtonElement | null>(null);
  const rejilla = rejillaGaleria(fotos.length);

  const abrir = (i: number, boton: HTMLButtonElement) => {
    disparadorRef.current = boton;
    setAbierta(i);
  };

  const cerrar = () => {
    setAbierta(null);
    // Devuelve el foco a la foto que abrió el visor
    requestAnimationFrame(() => disparadorRef.current?.focus());
  };

  return (
    <>
      <ul className={claseLista(rejilla)} aria-label={etiqueta}>
        {fotos.map((foto, i) => {
          const { className, forma, sizes } = celda(rejilla, i);
          return (
            <li key={foto.url} className={className} data-forma={forma}>
              <button
                type="button"
                className="mf-foto"
                onClick={(e) => abrir(i, e.currentTarget)}
                aria-label={`Ver foto de ${foto.servicio} en grande`}
              >
                <FotoConRespaldo
                  src={foto.url}
                  alt={`${foto.servicio} en Mirú Franco`}
                  sizes={sizes}
                  className="mf-foto__imagen"
                />
                <span className="mf-foto__pie">
                  <span className="font-semibold">{foto.servicio}</span>
                  {foto.categoria && <span className="opacity-80">{foto.categoria}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* El visor se monta en <body>: ninguna sección contenedora (content-visibility, transform)
          puede recortarlo ni cambiar su referencia de position: fixed */}
      {abierta !== null &&
        fotos[abierta] &&
        createPortal(<VisorGaleria fotos={fotos} inicial={abierta} onCerrar={cerrar} />, document.body)}
    </>
  );
}

/**
 * Foto de la galería que, si no carga, muestra el placeholder de marca (monograma dorado sobre
 * carbón) en lugar del ícono de imagen rota. Cada celda y cada foto del visor llevan su propio estado.
 */
function FotoConRespaldo({
  src,
  alt,
  sizes,
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  sizes: string;
  className: string;
  priority?: boolean;
}) {
  const [fallida, setFallida] = useState(false);
  if (fallida) return <ServicioImagenPlaceholder />;
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      priority={priority}
      onError={() => setFallida(true)}
    />
  );
}

/** Cada bloque de 7 llena 12 celdas exactas (4 columnas × 3 filas, o 2 × 6 en móvil). */
function formaDeCelda(i: number): 'grande' | 'alta' | 'ancha' | 'normal' {
  const r = i % 7;
  if (r === 0) return 'grande';
  if (r === 4) return 'alta';
  if (r === 6) return 'ancha';
  return 'normal';
}

interface VisorProps {
  fotos: FotoGaleria[];
  inicial: number;
  onCerrar: () => void;
}

/**
 * Visor a pantalla completa: flechas del teclado, deslizar en táctil y Escape. Con el teclado la
 * foto cambia sin animación (se navega rápido y repetido); al deslizar, la foto sigue al dedo.
 */
function VisorGaleria({ fotos, inicial, onCerrar }: VisorProps) {
  const [indice, setIndice] = useState(inicial);
  const [direccion, setDireccion] = useState<1 | -1>(1);
  const [porTeclado, setPorTeclado] = useState(false);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const escenarioRef = useRef<HTMLDivElement>(null);
  const arrastre = useRef<{ x: number; t: number; id: number; seguir: boolean } | null>(null);
  const total = fotos.length;
  const foto = fotos[indice]!;

  const mover = useCallback(
    (paso: 1 | -1, teclado = false) => {
      if (total < 2) return;
      setPorTeclado(teclado);
      setDireccion(paso);
      setIndice((i) => (i + paso + total) % total);
    },
    [total]
  );

  useEffect(() => {
    cerrarRef.current?.focus();
    document.body.style.overflow = 'hidden';
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
      else if (e.key === 'ArrowRight') mover(1, true);
      else if (e.key === 'ArrowLeft') mover(-1, true);
    };
    window.addEventListener('keydown', alTeclear);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', alTeclear);
    };
  }, [mover, onCerrar]);

  // Deslizar: basta un gesto rápido (velocidad) aunque sea corto, como en Sonner/Vaul. El escenario
  // captura el puntero y sigue al dedo (transform directo, sin estado de React); con movimiento
  // reducido no se desplaza, solo cuenta el gesto.
  const soltarEscenario = () => {
    const el = escenarioRef.current;
    if (!el) return;
    el.style.transition = 'transform 200ms var(--mf-ease-out)';
    el.style.transform = '';
  };
  const alPresionar = (e: React.PointerEvent<HTMLDivElement>) => {
    if (arrastre.current || e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.transition = 'none';
    const seguir = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    arrastre.current = { x: e.clientX, t: performance.now(), id: e.pointerId, seguir };
  };
  const alArrastrar = (e: React.PointerEvent<HTMLDivElement>) => {
    const inicio = arrastre.current;
    if (!inicio || inicio.id !== e.pointerId || !inicio.seguir || total < 2) return;
    e.currentTarget.style.transform = `translateX(${e.clientX - inicio.x}px)`;
  };
  const alCancelar = () => {
    arrastre.current = null;
    soltarEscenario();
  };
  const alSoltar = (e: React.PointerEvent) => {
    const inicio = arrastre.current;
    if (!inicio || inicio.id !== e.pointerId) return;
    arrastre.current = null;
    soltarEscenario();
    const dx = e.clientX - inicio.x;
    const velocidad = Math.abs(dx) / Math.max(1, performance.now() - inicio.t);
    if (Math.abs(dx) > 60 || (Math.abs(dx) > 16 && velocidad > 0.11)) mover(dx < 0 ? 1 : -1);
  };

  return (
    <div
      className="mf-visor"
      role="dialog"
      aria-modal="true"
      aria-label={`Galería: ${foto.servicio}, foto ${indice + 1} de ${total}`}
      onClick={onCerrar}
    >
      <button
        ref={cerrarRef}
        type="button"
        className="mf-visor__boton mf-visor__cerrar"
        onClick={onCerrar}
        aria-label="Cerrar galería"
      >
        <X size={22} aria-hidden />
      </button>

      <div
        ref={escenarioRef}
        className="mf-visor__escenario"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={alPresionar}
        onPointerMove={alArrastrar}
        onPointerUp={alSoltar}
        onPointerCancel={alCancelar}
      >
        <div
          key={indice}
          className="mf-visor__foto"
          data-direccion={direccion === 1 ? 'siguiente' : 'anterior'}
          data-origen={porTeclado ? 'teclado' : undefined}
        >
          <FotoConRespaldo
            src={foto.url}
            alt={`${foto.servicio} en Mirú Franco`}
            sizes="100vw"
            className="object-contain"
            priority
          />
        </div>
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            className="mf-visor__boton mf-visor__anterior"
            onClick={(e) => {
              e.stopPropagation();
              mover(-1);
            }}
            aria-label="Foto anterior"
          >
            <ChevronLeft size={26} aria-hidden />
          </button>
          <button
            type="button"
            className="mf-visor__boton mf-visor__siguiente"
            onClick={(e) => {
              e.stopPropagation();
              mover(1);
            }}
            aria-label="Foto siguiente"
          >
            <ChevronRight size={26} aria-hidden />
          </button>
        </>
      )}

      <div className="mf-visor__pie" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold" style={{ fontFamily: 'var(--font-family-serif)' }}>
            {foto.servicio}
          </p>
          <p className="mf-cifras text-sm opacity-75" aria-live="polite">
            {foto.categoria ? `${foto.categoria} · ` : ''}
            {indice + 1} de {total}
          </p>
        </div>
        <Link
          href={`/cliente/servicios-citas/servicios/${foto.servicioId}`}
          className="mf-visor__enlace"
        >
          Ver servicio
          <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
