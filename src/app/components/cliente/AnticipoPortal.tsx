'use client';

import { useState } from 'react';
import { Clock3 } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { crearPreferenciaAnticipo, type CitaApi } from '../../services/citas';
import { estadoAnticipo, INFO_ANTICIPO, tiempoRestante } from '../../utils/anticipoCita';
import { formatearPrecioMXN } from '../../utils/formatoPrecio';
import { PLAZOS_TERMINOS } from '../../utils/terminosCondiciones';

/**
 * Anticipo de una cita en el portal: estado, monto, cuenta regresiva y botón para pagarlo con Mercado
 * Pago mientras siga vigente. `detalle` muestra además la explicación (pantalla de detalle de la cita).
 */
export default function AnticipoPortal({ cita, ahora, detalle = false }: { cita: CitaApi; ahora: Date; detalle?: boolean }) {
  const [abriendo, setAbriendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const estado = estadoAnticipo(cita, ahora);
  if (estado === 'no_requiere') return detalle ? null : <span className="text-sm text-encabezados-alterno">—</span>;

  const info = INFO_ANTICIPO[estado];
  const pendiente = estado === 'pendiente';

  const pagar = async () => {
    setAbriendo(true);
    setError(null);
    try {
      const { initPoint } = await crearPreferenciaAnticipo(cita.id);
      window.location.assign(initPoint);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir Mercado Pago');
      setAbriendo(false);
    }
  };

  return (
    <div className={detalle ? 'space-y-3' : 'flex min-w-40 flex-col items-start gap-1.5'}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={info.variante} size="sm">{info.etiqueta}</Badge>
        <span className="mf-cifras text-sm font-semibold text-menu-texto-principal">{formatearPrecioMXN(cita.anticipoRequerido ?? 0)}</span>
      </div>
      {pendiente && cita.anticipoVenceEn && (
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-menu-texto-principal" aria-live="polite">
          <Clock3 size={13} aria-hidden /> Quedan <span className="mf-cifras">{tiempoRestante(cita.anticipoVenceEn, ahora)}</span>
        </p>
      )}
      {detalle && (
        <p className="text-sm text-encabezados-alterno">
          {pendiente
            ? `Págalo en línea o en el salón. Si no se paga en ${PLAZOS_TERMINOS.horasAnticipoCita} horas, el horario se libera.`
            : estado === 'pagado'
              ? 'Se descuenta del total el día de tu cita.'
              : estado === 'en_revision'
                ? 'El salón está revisando tu anticipo; te avisaremos en tu cuenta.'
                : estado === 'liberada' || estado === 'vencido'
                  ? 'No recibimos el anticipo a tiempo y el horario se liberó.'
                  : estado === 'retenido'
                    ? 'La cita no se atendió y el anticipo se retuvo, como indican los términos.'
                    : 'Te devolvimos el anticipo.'}
        </p>
      )}
      {pendiente && (
        <Button size="sm" onClick={pagar} disabled={abriendo} fullWidth={detalle}>
          {abriendo ? 'Abriendo…' : detalle ? 'Pagar anticipo con Mercado Pago' : 'Pagar anticipo'}
        </Button>
      )}
      {error && <p role="alert" className="text-xs font-medium text-[var(--danger-texto)]">{error}</p>}
    </div>
  );
}
