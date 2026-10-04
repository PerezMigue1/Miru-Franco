'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CircleAlert, Clock3, HandCoins, Undo2 } from 'lucide-react';
import Button from '../ui/Button';
import SelloConfirmacion from './SelloConfirmacion';
import { consultarEstadoAnticipo, crearPreferenciaAnticipo, type CitaApi, type EstadoPagoAnticipo } from '../../services/citas';
import { tiempoRestante } from '../../utils/anticipoCita';
import { formatearPrecioMXN } from '../../utils/formatoPrecio';
import { useAhora } from '../../hooks/useAhora';

const INTERVALO_ESTADO_MS = 3000;
const ESPERA_MAXIMA_ESTADO_MS = 45_000;

/**
 * Encabezado de la confirmación de una cita con anticipo. El estado sale del backend (que consulta
 * Mercado Pago), nunca de la URL de regreso: esta solo decide si vale la pena seguir esperando un rato.
 */
export default function EncabezadoAnticipo({ cita, volvioDeMercadoPago }: { cita: CitaApi; volvioDeMercadoPago: boolean }) {
  const ahora = useAhora(15_000);
  const [estado, setEstado] = useState<EstadoPagoAnticipo | null>(null);
  const [venceEn, setVenceEn] = useState<string | null>(cita.anticipoVenceEn ?? null);
  const [abriendo, setAbriendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    const inicio = Date.now();
    const consultar = () => {
      consultarEstadoAnticipo(cita.id)
        .then((r) => {
          if (!vivo) return;
          setEstado(r.estado);
          setVenceEn(r.anticipoVenceEn);
          const esperar = r.estado === 'pendiente' || (r.estado === 'sin_pago' && volvioDeMercadoPago);
          if (esperar && Date.now() - inicio < ESPERA_MAXIMA_ESTADO_MS) temporizador = setTimeout(consultar, INTERVALO_ESTADO_MS);
        })
        .catch(() => { if (vivo) setError('No pudimos consultar el estado del anticipo. Recarga la página en un momento.'); });
    };
    consultar();
    return () => { vivo = false; if (temporizador) clearTimeout(temporizador); };
  }, [cita.id, volvioDeMercadoPago]);

  const pagar = async () => {
    setAbriendo(true);
    setError(null);
    try {
      const { initPoint } = await crearPreferenciaAnticipo(cita.id);
      window.location.assign(initPoint);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir Mercado Pago. Intenta de nuevo.');
      setAbriendo(false);
    }
  };

  const monto = formatearPrecioMXN(cita.anticipoRequerido ?? 0);
  const restante = tiempoRestante(venceEn, ahora);
  const aTiempo = restante !== '' && restante !== 'vencido';

  if (estado === null && !error) {
    return (
      <div className="mb-8 space-y-3" aria-busy="true" aria-label="Consultando el estado del anticipo">
        <div className="mf-skeleton mx-auto h-20 w-20 rounded-full" />
        <p className="text-encabezados-alterno">Consultando el estado de tu anticipo…</p>
      </div>
    );
  }

  if (estado === 'aprobado') {
    return (
      <div className="mb-8">
        <div className="mb-5 flex justify-center"><SelloConfirmacion /></div>
        <h1 className="mf-titulo-pagina mb-2 text-menu-texto-principal">¡Cita confirmada!</h1>
        <p className="text-lg text-encabezados-alterno">Recibimos tu anticipo de <span className="mf-cifras">{monto}</span>. Se descuenta del total el día de tu cita.</p>
      </div>
    );
  }

  if (estado === 'pendiente') {
    return (
      <div className="mb-8" aria-live="polite">
        <Icono><Clock3 size={34} aria-hidden /></Icono>
        <h1 className="mf-titulo-pagina mb-2 text-menu-texto-principal">Tu pago se está procesando</h1>
        <p className="text-lg text-encabezados-alterno">Mercado Pago aún no confirma tu anticipo. Esta página se actualiza sola.</p>
      </div>
    );
  }

  if (estado === 'revision') {
    return (
      <div className="mb-8">
        <Icono><HandCoins size={34} aria-hidden /></Icono>
        <h1 className="mf-titulo-pagina mb-2 text-menu-texto-principal">Recibimos tu pago</h1>
        <p className="text-lg text-encabezados-alterno">Lo estamos revisando con el salón y te avisaremos en tu cuenta.</p>
      </div>
    );
  }

  if (estado === 'reembolsado') {
    return (
      <div className="mb-8">
        <Icono><Undo2 size={34} aria-hidden /></Icono>
        <h1 className="mf-titulo-pagina mb-2 text-menu-texto-principal">Anticipo reembolsado</h1>
        <p className="text-lg text-encabezados-alterno">Te devolvimos el anticipo de <span className="mf-cifras">{monto}</span>.</p>
      </div>
    );
  }

  if (estado === 'cancelada' && cita.motivoCancelacion !== 'anticipo_no_pagado') {
    return (
      <div className="mb-8">
        <Icono peligro><CircleAlert size={34} aria-hidden /></Icono>
        <h1 className="mf-titulo-pagina mb-2 text-menu-texto-principal">Tu cita se canceló</h1>
        <p className="text-lg text-encabezados-alterno">Si quieres, puedes agendar de nuevo en el horario que prefieras.</p>
        <Link href="/cliente/servicios-citas" className="mf-btn mt-5 inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[var(--botones-principales)] px-6 font-semibold text-[var(--texto-fondo-oscuro)] hover:bg-[var(--hover)]">
          Agendar de nuevo
        </Link>
      </div>
    );
  }

  if (estado === 'vencido' || estado === 'cancelada' || !aTiempo) {
    return (
      <div className="mb-8">
        <Icono peligro><CircleAlert size={34} aria-hidden /></Icono>
        <h1 className="mf-titulo-pagina mb-2 text-menu-texto-principal">El horario se liberó</h1>
        <p className="text-lg text-encabezados-alterno">No recibimos el anticipo a tiempo. Puedes volver a agendar en el horario que prefieras.</p>
        <Link href="/cliente/servicios-citas" className="mf-btn mt-5 inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[var(--botones-principales)] px-6 font-semibold text-[var(--texto-fondo-oscuro)] hover:bg-[var(--hover)]">
          Agendar de nuevo
        </Link>
      </div>
    );
  }

  // sin_pago o rechazado, todavía a tiempo: el horario sigue apartado.
  return (
    <div className="mb-8" aria-live="polite">
      <Icono><Clock3 size={34} aria-hidden /></Icono>
      <h1 className="mf-titulo-pagina mb-2 text-menu-texto-principal">Tu horario está apartado</h1>
      <p className="text-lg text-encabezados-alterno">
        {estado === 'rechazado' ? 'Tu pago no se completó. ' : ''}
        Paga el anticipo de <span className="mf-cifras font-semibold text-menu-texto-principal">{monto}</span> para confirmar tu cita.
      </p>
      <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-fondos-suaves px-4 py-1.5 text-sm font-semibold text-menu-texto-principal">
        <Clock3 size={15} aria-hidden /> Quedan <span className="mf-cifras">{restante}</span>
      </p>
      <div className="mx-auto mt-5 max-w-sm space-y-2">
        <Button fullWidth size="lg" onClick={pagar} disabled={abriendo}>
          {abriendo ? 'Abriendo Mercado Pago…' : 'Pagar anticipo con Mercado Pago'}
        </Button>
        <p className="text-sm text-encabezados-alterno">También puedes pagarlo en el salón antes de que venza el plazo.</p>
      </div>
      {error && <p role="alert" className="mt-3 text-sm font-medium text-[var(--danger-texto)]">{error}</p>}
    </div>
  );
}

function Icono({ children, peligro = false }: { children: React.ReactNode; peligro?: boolean }) {
  return (
    <div className="mb-5 flex justify-center">
      <span className={`flex h-20 w-20 items-center justify-center rounded-full ${peligro ? 'bg-[var(--danger)] text-[var(--texto-fondo-oscuro)]' : 'bg-fondos-suaves text-menu-texto-principal'}`}>
        {children}
      </span>
    </div>
  );
}
