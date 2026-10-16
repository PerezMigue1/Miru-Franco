'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock3 } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import OpcionesAnticipo from './OpcionesAnticipo';
import type { CitaApi } from '../../services/citas';
import { avisoPagoEnSalon, estadoAnticipo, INFO_ANTICIPO, limiteAnticipo, minutosSalonDeCita, tiempoRestante } from '../../utils/anticipoCita';
import { formatearPrecioMXN } from '../../utils/formatoPrecio';
import { useTextosSitio } from '../../hooks/useTextosSitio';
import { conUnidad } from '../../utils/textosSitio';

/**
 * Anticipo de una cita en el portal: estado, monto, cuenta regresiva y botón para pagarlo con Mercado
 * Pago mientras siga vigente. `detalle` muestra además la explicación y la casilla de la Política de
 * anticipos, que se registra antes de abrir Mercado Pago; en la lista, el botón lleva a ese detalle.
 */
export default function AnticipoPortal({ cita: citaInicial, ahora, detalle = false }: { cita: CitaApi; ahora: Date; detalle?: boolean }) {
  // Si la clienta cambia a pago en el salón, el plazo nuevo se refleja aquí sin recargar.
  const [cambioSalon, setCambioSalon] = useState<string | null>(null);
  const { t, config } = useTextosSitio();
  const { reglas } = config;
  const cita = cambioSalon ? { ...citaInicial, anticipoEnSalon: true, anticipoVenceEn: cambioSalon } : citaInicial;
  const rutaDetalle = `/cliente/servicios-citas/mis-citas/${cita.id}`;
  const estado = estadoAnticipo(cita, ahora);
  if (estado === 'no_requiere') return detalle ? null : <span className="text-sm text-encabezados-alterno">{t('anticipos.sinAnticipo')}</span>;

  const info = INFO_ANTICIPO[estado];
  const pendiente = estado === 'pendiente';
  /** Eligió pagar en el salón: se le recuerda la hora límite (15 min antes de la cita). */
  const enSalon = pendiente && Boolean(cita.anticipoEnSalon);
  const minutosSalon = minutosSalonDeCita(cita, reglas);
  const horasLinea = cita.reglas?.plazoAnticipoHoras ?? reglas.citas.plazoAnticipoHoras;
  const formas = [reglas.pagos.mercadoPagoAnticipos && 'en línea', reglas.citas.permitirAnticipoEnSalon && 'en el salón'].filter(Boolean).join(' o ');

  return (
    <div className={detalle ? 'space-y-3' : 'flex min-w-40 flex-col items-start gap-1.5'}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={info.variante} size="sm">{info.etiqueta}</Badge>
        <span className="mf-cifras text-sm font-semibold text-menu-texto-principal">{formatearPrecioMXN(cita.anticipoRequerido ?? 0)}</span>
      </div>
      {pendiente && cita.anticipoVenceEn && (
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-menu-texto-principal" aria-live="polite">
          <Clock3 size={13} aria-hidden />{' '}
          {limiteAnticipo(cita.anticipoVenceEn, ahora) ?? <>Quedan <span className="mf-cifras">{tiempoRestante(cita.anticipoVenceEn, ahora)}</span></>}
        </p>
      )}
      {enSalon && !detalle && <p className="text-xs text-encabezados-alterno">{avisoPagoEnSalon(cita.anticipoVenceEn, minutosSalon)}</p>}
      {detalle && (
        <p className="text-sm text-encabezados-alterno">
          {enSalon
            ? avisoPagoEnSalon(cita.anticipoVenceEn, minutosSalon)
            : pendiente
            ? t('anticipos.pendiente', { formasPago: formas || 'en línea', plazoAnticipo: conUnidad(horasLinea, 'hora', 'horas') })
            : estado === 'pagado'
              ? t('anticipos.pagado')
              : estado === 'en_revision'
                ? t('anticipos.enRevision')
                : estado === 'liberada' || estado === 'vencido'
                  ? t('anticipos.liberada')
                  : estado === 'retenido'
                    ? t('anticipos.retenido')
                    : t('anticipos.devuelto')}
        </p>
      )}
      {pendiente && detalle && (
        <OpcionesAnticipo
          cita={cita}
          venceEn={cita.anticipoVenceEn ?? null}
          enSalon={enSalon}
          ahora={ahora}
          rutaOrigen={rutaDetalle}
          onCambioASalon={setCambioSalon}
        />
      )}
      {pendiente && !detalle && (
        <Button size="md" asChild>
          <Link href={rutaDetalle} className="inline-flex items-center justify-center">
            {t('anticipos.botonPagar')}
          </Link>
        </Button>
      )}
    </div>
  );
}
