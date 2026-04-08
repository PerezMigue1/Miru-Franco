'use client';

import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';

export type CheckoutTarjetaVariant = 'credito' | 'debito';

function formatearNumeroTarjeta(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 16);
  return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function enmascararNumero(formatted: string): string {
  const d = formatted.replace(/\s/g, '');
  if (d.length === 0) return '•••• •••• •••• ••••';
  if (d.length <= 4) return formatted || '•••• •••• •••• ••••';
  const last = d.slice(-4);
  const hiddenGroups = Math.max(0, Math.ceil((d.length - 4) / 4));
  const parts: string[] = [];
  for (let i = 0; i < hiddenGroups; i++) parts.push('••••');
  parts.push(last.padEnd(4, '•'));
  return parts.join(' ');
}

interface CheckoutTarjetaAnimadaProps {
  variant: CheckoutTarjetaVariant;
  animarEntrada: boolean;
  numeroTarjeta: string;
  nombreTitular: string;
  fechaVencimiento: string;
  cvv: string;
  enfocadoCvv: boolean;
  /** Marca / producto (BIN o tarjeta guardada), ej. Visa Classic; encima del banco y del badge */
  marcaTarjeta?: string;
  /** Banco emisor (BIN o tarjeta guardada); entre marca y CRÉDITO / DÉBITO */
  bancoEmisor?: string;
}

const gradienteCredito =
  'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 45%, #7c3aed 100%)';
const gradienteDebito =
  'linear-gradient(135deg, #0f172a 0%, #134e4a 40%, #0d9488 100%)';

export default function CheckoutTarjetaAnimada({
  variant,
  animarEntrada,
  numeroTarjeta,
  nombreTitular,
  fechaVencimiento,
  cvv,
  enfocadoCvv,
  marcaTarjeta,
  bancoEmisor,
}: CheckoutTarjetaAnimadaProps) {
  const [entro, setEntro] = useState(false);
  useEffect(() => {
    if (!animarEntrada) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEntro(false);
      return;
    }
    setEntro(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntro(true));
    });
    return () => cancelAnimationFrame(id);
  }, [animarEntrada, variant]);

  const bg = variant === 'credito' ? gradienteCredito : gradienteDebito;
  const etiqueta = variant === 'credito' ? 'CRÉDITO' : 'DÉBITO';
  const numDisplay = enmascararNumero(formatearNumeroTarjeta(numeroTarjeta));
  const nombreDisplay = (nombreTitular || 'NOMBRE DEL TITULAR').toUpperCase();
  const expDisplay = fechaVencimiento.trim() || 'MM/AA';
  const cvvDisplay = cvv.replace(/\D/g, '').slice(0, 4) || '•••';
  const marcaDisplay = (marcaTarjeta ?? '').trim();
  const bancoDisplay = (bancoEmisor ?? '').trim();

  const caraBase: CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: '1rem',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
  };

  return (
    <div
      className="w-full max-w-md mx-auto lg:mx-0"
      style={{
        perspective: '1000px',
        opacity: entro ? 1 : 0,
        transform: entro ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.94)',
        transition: 'opacity 0.55s ease-out, transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <div
        className="relative w-full"
        style={{
          transformStyle: 'preserve-3d',
          transform: enfocadoCvv ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: 'transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)',
          minHeight: '13.5rem',
        }}
      >
        {/* Frente: sin justify-between en la columna (evita que el número “suba” junto al banco) */}
        <div
          className="flex h-full min-h-[13.5rem] flex-col p-6 shadow-xl border border-white/10 overflow-hidden"
          style={{
            ...caraBase,
            background: bg,
            transform: 'rotateY(0deg)',
          }}
        >
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_30%_20%,white,transparent_50%)]" />
          {/* Cabecera: marca → banco → badge CRÉDITO / DÉBITO */}
          <div className="relative z-10 flex shrink-0 justify-between items-start gap-3">
            <div className="flex min-w-0 flex-col items-start gap-1">
              {marcaDisplay ? (
                <span
                  className="max-w-[11rem] truncate text-[10px] font-semibold uppercase tracking-wide sm:max-w-[14rem] sm:text-[11px]"
                  style={{ color: 'rgba(255,255,255,0.92)', textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}
                  title={marcaDisplay}
                >
                  {marcaDisplay}
                </span>
              ) : null}
              {bancoDisplay ? (
                <span
                  className="max-w-[11rem] truncate text-[10px] font-semibold uppercase tracking-wide sm:max-w-[14rem] sm:text-[11px]"
                  style={{ color: 'rgba(255,255,255,0.88)', textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}
                  title={bancoDisplay}
                >
                  {bancoDisplay}
                </span>
              ) : null}
              <span
                className="shrink-0 rounded px-2 py-1 text-[10px] font-bold tracking-widest"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.95)' }}
              >
                {etiqueta}
              </span>
            </div>
            <div
              className="h-8 w-11 shrink-0 rounded-md"
              style={{
                background: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 50%, #d97706 100%)',
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4)',
              }}
            />
          </div>
          {/* Número en zona central apartada de la cabecera */}
          <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-center py-3">
            <p
              className="font-mono text-xl tracking-wider break-all sm:text-2xl"
              style={{ color: 'rgba(255,255,255,0.95)', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
            >
              {numDisplay}
            </p>
          </div>
          <div className="relative z-10 flex shrink-0 justify-between items-end gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] uppercase tracking-wider opacity-70" style={{ color: 'white' }}>
                Titular
              </p>
              <p className="text-sm font-semibold truncate" style={{ color: 'rgba(255,255,255,0.95)' }}>
                {nombreDisplay}
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider opacity-70" style={{ color: 'white' }}>
                Vence
              </p>
              <p className="text-sm font-mono font-semibold" style={{ color: 'rgba(255,255,255,0.95)' }}>
                {expDisplay}
              </p>
            </div>
          </div>
        </div>

        {/* Reverso */}
        <div
          className="flex flex-col shadow-xl border border-white/10 overflow-hidden"
          style={{
            ...caraBase,
            background: bg,
            transform: 'rotateY(180deg)',
          }}
        >
          <div className="h-10 mt-6 w-full" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }} />
          <div className="px-6 mt-6 flex flex-col items-end">
            <p
              className="text-[9px] uppercase tracking-wider mb-1 w-full text-right opacity-80"
              style={{ color: 'white' }}
            >
              CVC
            </p>
            <div
              className="w-4/5 max-w-[200px] h-10 rounded flex items-center justify-end px-3 font-mono text-lg"
              style={{ backgroundColor: 'rgba(255,255,255,0.92)', color: '#1e1b4b' }}
            >
              {cvvDisplay}
            </div>
          </div>
          <p className="mt-auto px-6 pb-4 text-[10px] text-center opacity-60" style={{ color: 'white' }}>
            Solo demostración — no se procesa pago real
          </p>
        </div>
      </div>
    </div>
  );
}
