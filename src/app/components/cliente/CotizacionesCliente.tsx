'use client';

import Link from 'next/link';
import { AlertCircle, CalendarDays, CircleCheck, CircleX, Clock, FileText, RotateCw, Users } from 'lucide-react';
import type { ComponentType } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import type { CotizacionApi, EstadoCotizacion } from '../../services/cotizaciones';

/**
 * Estados de /cliente/cotizaciones: cargando, vacío, error y la lista. Son de presentación (la
 * página decide cuál mostrar) para poder probarlos sin navegador.
 */

const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

/**
 * La fecha del evento se captura como día (YYYY-MM-DD) y se guarda a medianoche UTC: se formatea
 * en UTC para que en México no aparezca el día anterior.
 */
const FECHA = new Intl.DateTimeFormat('es-MX', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatearFechaEvento(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'Fecha por confirmar' : FECHA.format(d);
}

export function formatearMXN(valor: number): string {
  return MXN.format(valor);
}

const ESTADOS: Record<
  EstadoCotizacion,
  { etiqueta: string; variante: 'success' | 'warning' | 'danger'; Icono: ComponentType<{ size?: number; 'aria-hidden'?: boolean }> }
> = {
  pendiente: { etiqueta: 'Pendiente', variante: 'warning', Icono: Clock },
  confirmada: { etiqueta: 'Confirmada', variante: 'success', Icono: CircleCheck },
  cancelada: { etiqueta: 'Cancelada', variante: 'danger', Icono: CircleX },
};

const TITULO = { color: 'var(--menu-texto-principal)', fontFamily: 'var(--font-family-serif)' };
const SECUNDARIO = { color: 'var(--encabezados-alterno)' };

function Importe({ etiqueta, valor, destacado = false }: { etiqueta: string; valor: number; destacado?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium" style={SECUNDARIO}>
        {etiqueta}
      </dt>
      <dd
        className={`mt-0.5 tabular-nums font-semibold ${destacado ? 'text-lg' : 'text-base'}`}
        style={{ color: 'var(--menu-texto-principal)' }}
      >
        {formatearMXN(valor)}
      </dd>
    </div>
  );
}

export function TarjetaCotizacion({ cotizacion, indice = 0 }: { cotizacion: CotizacionApi; indice?: number }) {
  const estado = ESTADOS[cotizacion.estado];
  const saldo = Math.max(0, cotizacion.monto - cotizacion.anticipo);
  const personas = cotizacion.cantidadPersonas;

  return (
    <Card
      padding="sm"
      className="sm:p-6"
      style={{ animation: `fadeUp 350ms var(--mf-ease-out) ${Math.min(indice, 6) * 60}ms both` }}
    >
      <article aria-labelledby={`cotizacion-${cotizacion.id}`}>
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <h2 id={`cotizacion-${cotizacion.id}`} className="min-w-0 text-xl font-bold tracking-[-0.02em]" style={TITULO}>
            {cotizacion.paqueteTipoEvento || 'Evento especial'}
          </h2>
          <Badge variant={estado.variante} size="sm">
            <estado.Icono size={14} aria-hidden />
            {estado.etiqueta}
          </Badge>
        </div>

        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm" style={SECUNDARIO}>
          <li className="flex items-center gap-1.5">
            <CalendarDays size={16} aria-hidden />
            <span className="first-letter:uppercase">{formatearFechaEvento(cotizacion.fechaEvento)}</span>
          </li>
          <li className="flex items-center gap-1.5">
            <Users size={16} aria-hidden />
            {personas == null ? 'Personas por definir' : `${personas} ${personas === 1 ? 'persona' : 'personas'}`}
          </li>
        </ul>

        <dl
          className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-4 sm:grid-cols-3"
          style={{ borderColor: 'var(--mf-linea)' }}
        >
          <Importe etiqueta="Monto" valor={cotizacion.monto} />
          <Importe etiqueta="Anticipo" valor={cotizacion.anticipo} />
          <div className="col-span-2 sm:col-span-1">
            <Importe etiqueta="Saldo pendiente" valor={saldo} destacado />
          </div>
        </dl>

        {cotizacion.notas && (
          <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--mf-linea)' }}>
            <p className="text-xs font-medium" style={SECUNDARIO}>
              Notas del salón
            </p>
            {/* Texto plano: React lo escapa */}
            <p
              className="mt-1 max-w-[65ch] whitespace-pre-line break-words text-sm leading-relaxed"
              style={{ color: 'var(--menu-texto-principal)' }}
            >
              {cotizacion.notas}
            </p>
          </div>
        )}
      </article>
    </Card>
  );
}

export function ListaCotizaciones({ cotizaciones }: { cotizaciones: CotizacionApi[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-2" aria-label="Tus cotizaciones">
      {cotizaciones.map((c, i) => (
        <li key={c.id} className="min-w-0">
          <TarjetaCotizacion cotizacion={c} indice={i} />
        </li>
      ))}
    </ul>
  );
}

/** Skeleton con la forma de las tarjetas: título + estado, fecha y personas, tres importes. */
export function CotizacionesCargando() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando tus cotizaciones</span>
      <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-2" aria-hidden>
        {[0, 1].map((i) => (
          <Card key={i} padding="sm" className="sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="mf-skeleton h-7 w-2/5" />
              <div className="mf-skeleton h-6 w-24 rounded-full" />
            </div>
            <div className="mt-3 flex flex-wrap gap-5">
              <div className="mf-skeleton h-5 w-56 max-w-full" />
              <div className="mf-skeleton h-5 w-24" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-3" style={{ borderColor: 'var(--mf-linea)' }}>
              {[0, 1, 2].map((j) => (
                <div key={j} className={j === 2 ? 'col-span-2 sm:col-span-1' : ''}>
                  <div className="mf-skeleton h-3.5 w-16" />
                  <div className="mf-skeleton mt-2 h-6 w-24" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function CotizacionesVacio() {
  return (
    <Card className="max-w-2xl">
      <div className="flex flex-col items-center px-2 py-10 text-center">
        <span
          className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: 'var(--fondos-suaves)' }}
          aria-hidden
        >
          <FileText size={24} style={{ color: 'var(--menu-texto-principal)' }} />
        </span>
        <p className="text-xl font-bold" style={TITULO}>
          Aún no tienes cotizaciones
        </p>
        <p className="mt-2 max-w-md text-sm leading-relaxed" style={SECUNDARIO}>
          Cuando el salón prepare una cotización para tu evento, aparecerá aquí con su fecha, el paquete y el
          monto. Para pedir una, escríbenos.
        </p>
        <Link
          href="/contacto"
          className="mt-6 inline-flex min-h-11 items-center rounded-[10px] px-5 text-sm font-semibold underline-offset-4 hover:underline"
          style={{ color: 'var(--menu-texto-principal)' }}
        >
          Contactar al salón
        </Link>
      </div>
    </Card>
  );
}

export function CotizacionesError({ onReintentar }: { onReintentar: () => void }) {
  return (
    <Card className="max-w-2xl">
      <div role="alert" className="flex flex-col items-center px-2 py-10 text-center">
        <span
          className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: 'var(--fondos-suaves)' }}
          aria-hidden
        >
          <AlertCircle size={24} style={{ color: 'var(--danger-texto)' }} />
        </span>
        <p className="text-xl font-bold" style={TITULO}>
          No pudimos cargar tus cotizaciones
        </p>
        <p className="mt-2 max-w-md text-sm leading-relaxed" style={SECUNDARIO}>
          Puede ser la conexión o el servidor del salón. Tus cotizaciones siguen guardadas; vuelve a intentarlo.
        </p>
        <Button className="mt-6 inline-flex items-center gap-2" onClick={onReintentar}>
          <RotateCw size={16} aria-hidden />
          Reintentar
        </Button>
      </div>
    </Card>
  );
}
