'use client';

import { Landmark } from 'lucide-react';
import { useTextosSitio } from '../../hooks/useTextosSitio';
import { formatearPrecioMXN } from '../../utils/formatoPrecio';
import { saldoEnSalon, textoMetodosSalon, textoSinAnticipo } from '../../utils/formaPago';

/**
 * Mis citas, detalle: cuánto se paga en el salón el día de la cita (todo, o el saldo después del anticipo) y con qué
 * métodos activos del salón (Admin > Configuración del sitio > Reglas). Los datos de transferencia, solo si está activa.
 */
export default function PagoEnSalonCita({ precio, anticipo }: { precio: number | string | null | undefined; anticipo: number }) {
  const { t: texto, piezas, textos, config } = useTextosSitio();
  const { reglas } = config;
  const metodos = textoMetodosSalon(reglas, textos);
  const saldo = anticipo > 0 ? saldoEnSalon(precio, anticipo) : null;
  const t = reglas.pagos.metodosSalon.includes('transferencia') ? reglas.pagos.transferencia : null;
  return (
    <div className="space-y-2 text-sm">
      <p className="font-medium text-menu-texto-principal">
        {anticipo > 0
          ? saldo !== null
            ? piezas('citas.pagoSalon.saldo', {}, { saldo: <span key="saldo" className="mf-cifras font-semibold">{formatearPrecioMXN(saldo)}</span> })
            : texto('citas.pagoSalon.saldoSinPrecio')
          : textoSinAnticipo(precio, textos)}
      </p>
      {metodos && (
        <p className="flex gap-2 text-encabezados-alterno">
          <Landmark size={16} aria-hidden className="mt-0.5 shrink-0" />
          {metodos}
        </p>
      )}
      {t && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="text-encabezados-alterno">Banco</dt>
          <dd className="text-menu-texto-principal">{t.banco}</dd>
          <dt className="text-encabezados-alterno">Titular</dt>
          <dd className="text-menu-texto-principal">{t.titular}</dd>
          <dt className="text-encabezados-alterno">CLABE</dt>
          <dd className="mf-cifras break-all text-menu-texto-principal">{t.clabe}</dd>
        </dl>
      )}
    </div>
  );
}
