'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { FotoGaleria } from '../../utils/galeria';

interface GaleriaTrabajoProps {
  fotos: FotoGaleria[];
  /** Encabezado accesible del mosaico (el título visible lo pone la sección). */
  etiqueta: string;
}

/**
 * Mosaico editorial de fotos reales del salón con visor a pantalla completa.
 * Ritmo asimétrico: cada 7 fotos, una grande (2×2), una alta (1×2) y una ancha (2×1).
 */
export default function GaleriaTrabajo({ fotos, etiqueta }: GaleriaTrabajoProps) {
  const [abierta, setAbierta] = useState<number | null>(null);
  const disparadorRef = useRef<HTMLButtonElement | null>(null);

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
      <ul className="mf-galeria-mosaico" aria-label={etiqueta}>
        {fotos.map((foto, i) => (
          <li key={foto.url} className="mf-galeria-celda" data-forma={formaDeCelda(i)}>
            <button
              type="button"
              className="mf-foto"
              onClick={(e) => abrir(i, e.currentTarget)}
              aria-label={`Ver foto de ${foto.servicio} en grande`}
            >
              <Image
                src={foto.url}
                alt={`${foto.servicio} en Mirú Franco`}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="mf-foto__imagen"
              />
              <span className="mf-foto__pie">
                <span className="font-semibold">{foto.servicio}</span>
                {foto.categoria && <span className="opacity-80">{foto.categoria}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {abierta !== null && fotos[abierta] && (
        <VisorGaleria fotos={fotos} inicial={abierta} onCerrar={cerrar} />
      )}
    </>
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

/** Visor a pantalla completa: flechas del teclado, deslizar en táctil y Escape. */
function VisorGaleria({ fotos, inicial, onCerrar }: VisorProps) {
  const [indice, setIndice] = useState(inicial);
  const [direccion, setDireccion] = useState<1 | -1>(1);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const arrastre = useRef<{ x: number; t: number; id: number } | null>(null);
  const total = fotos.length;
  const foto = fotos[indice]!;

  const mover = useCallback(
    (paso: 1 | -1) => {
      if (total < 2) return;
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
      else if (e.key === 'ArrowRight') mover(1);
      else if (e.key === 'ArrowLeft') mover(-1);
    };
    window.addEventListener('keydown', alTeclear);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', alTeclear);
    };
  }, [mover, onCerrar]);

  // Deslizar: basta un gesto rápido (velocidad) aunque sea corto, como en Sonner/Vaul.
  const alPresionar = (e: React.PointerEvent) => {
    if (arrastre.current || e.pointerType === 'mouse') return;
    arrastre.current = { x: e.clientX, t: performance.now(), id: e.pointerId };
  };
  const alSoltar = (e: React.PointerEvent) => {
    const inicio = arrastre.current;
    if (!inicio || inicio.id !== e.pointerId) return;
    arrastre.current = null;
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
        className="mf-visor__escenario"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={alPresionar}
        onPointerUp={alSoltar}
        onPointerCancel={() => (arrastre.current = null)}
      >
        <div key={indice} className="mf-visor__foto" data-direccion={direccion === 1 ? 'siguiente' : 'anterior'}>
          <Image
            src={foto.url}
            alt={`${foto.servicio} en Mirú Franco`}
            fill
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
