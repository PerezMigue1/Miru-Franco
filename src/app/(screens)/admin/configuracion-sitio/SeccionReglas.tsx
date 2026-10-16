'use client';

import { useState } from 'react';
import { Info, Lock } from 'lucide-react';
import { hoyEnMexico } from '../../../utils/fechaSoloDia';
import { explicacionAnticipos, fechaLarga, NOTA_PLAZOS_TERMINOS, PLAZOS_SOLO_LECTURA } from './cambiosConfiguracion';
import { COLOR_SUAVE, COLOR_TEXTO, MensajeError } from './piezas';
import type { Errores } from './validacionConfiguracion';

type Reglas = { anticiposDesde: string | null } & Record<string, unknown>;

interface Props {
  valor: Reglas;
  /** ANTICIPOS_DESDE del servidor (anticiposDesdeRespaldo del API). */
  respaldo: string | null;
  errores: Errores;
  onCambiar: (valor: Reglas) => void;
}

const textoRespaldo = (r: string | null) => (r ? (/^\d{4}-\d{2}-\d{2}$/.test(r) ? fechaLarga(r) : r) : 'no está configurada');

/**
 * Fecha de inicio de los anticipos: propia (input date) o la variable del servidor (null). Debajo, qué pasa
 * en el caso elegido. null y '' no son lo mismo en el borrador: '' es "fecha propia sin elegir".
 */
export function FormReglas({ valor, respaldo, errores, onCambiar }: Props) {
  const usarVariable = valor.anticiposDesde === null;
  // Al volver a "fecha propia" se recupera la última que escribió (o la de hoy).
  const [ultimaFecha, setUltimaFecha] = useState(valor.anticiposDesde || '');
  const error = errores.anticiposDesde;

  return (
    <div className="space-y-4">
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium" style={{ color: COLOR_TEXTO }}>
        <input
          type="checkbox"
          checked={usarVariable}
          onChange={(e) => onCambiar({ ...valor, anticiposDesde: e.target.checked ? null : ultimaFecha || hoyEnMexico() })}
          aria-describedby="reglas-respaldo"
          className="h-5 w-5 shrink-0"
        />
        Usar la variable del servidor
      </label>
      <p id="reglas-respaldo" className="text-sm" style={{ color: COLOR_SUAVE }}>
        {`Variable del servidor (ANTICIPOS_DESDE): ${textoRespaldo(respaldo)}.`}
      </p>

      <div className="max-w-xs">
        <label htmlFor="reglas-anticipos-desde" className="mf-etiqueta">
          Fecha de inicio de los anticipos
        </label>
        <input
          id="reglas-anticipos-desde"
          type="date"
          value={valor.anticiposDesde ?? ''}
          disabled={usarVariable}
          onChange={(e) => {
            setUltimaFecha(e.target.value);
            onCambiar({ ...valor, anticiposDesde: e.target.value });
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={['reglas-explicacion', error && 'reglas-error'].filter(Boolean).join(' ')}
          className="mf-campo w-full px-4 py-2.5 tabular-nums disabled:opacity-50"
        />
        {error && <MensajeError id="reglas-error">{error}</MensajeError>}
      </div>

      <p id="reglas-explicacion" role="status" className="flex gap-2 rounded-[10px] border px-3 py-2 text-sm" style={{ borderColor: 'var(--mf-linea-fuerte)', color: COLOR_TEXTO }}>
        <Info size={16} aria-hidden className="mt-0.5 shrink-0" />
        {valor.anticiposDesde === '' ? 'Elige la fecha desde la que se piden los anticipos.' : explicacionAnticipos(valor.anticiposDesde, respaldo)}
      </p>
      <ul className="list-disc space-y-1 pl-5 text-sm" style={{ color: COLOR_SUAVE }}>
        <li>Con fecha propia: manda esa fecha, aunque el servidor tenga otra en su variable.</li>
        <li>Con la variable del servidor: se usa la fecha que tenga ANTICIPOS_DESDE.</li>
        <li>Sin fecha propia ni variable: el sitio no pide ni promete anticipos al agendar.</li>
      </ul>
    </div>
  );
}

/** Plazos de citas y anticipos que fijan los Términos y Condiciones: solo lectura. */
export function PlazosTerminos() {
  return (
    <section aria-labelledby="plazos-terminos-titulo" className="space-y-3">
      <h4 id="plazos-terminos-titulo" className="flex items-center gap-2 text-base font-semibold" style={{ color: COLOR_TEXTO }}>
        <Lock size={16} aria-hidden />
        Otros plazos (solo lectura)
      </h4>
      <p className="text-sm" style={{ color: COLOR_SUAVE }}>
        {NOTA_PLAZOS_TERMINOS}
      </p>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm md:grid-cols-2">
        {PLAZOS_SOLO_LECTURA.map((p) => (
          <div key={p.etiqueta} className="flex flex-col border-b py-2" style={{ borderColor: 'var(--mf-linea)' }}>
            <dt style={{ color: COLOR_SUAVE }}>{p.etiqueta}</dt>
            <dd className="font-semibold tabular-nums" style={{ color: COLOR_TEXTO }}>
              {p.valor}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
