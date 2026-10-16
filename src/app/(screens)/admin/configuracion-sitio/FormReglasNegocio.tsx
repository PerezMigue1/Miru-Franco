'use client';

import { Info, Plus, Scale, Trash2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import type { DefinicionRegla, DiaInhabil } from '../../../utils/reglasNegocio';
import { fechaLarga } from './cambiosConfiguracion';
import { BotonIcono, COLOR_SUAVE, COLOR_TEXTO, MensajeError } from './piezas';
import { escribirRuta, gruposDeReglas, leerRuta, MAX_DIAS_INHABILES, MAX_MOTIVO_DIA, MAX_RECORDATORIOS, rangoDeRegla, type ReglasAdmin } from './reglasNegocioAdmin';
import type { Errores } from './validacionConfiguracion';

interface Props {
  valor: ReglasAdmin;
  definiciones: DefinicionRegla[];
  errores: Errores;
  /** APARTADOS_DESDE del servidor (respaldo de la fecha de inicio de la limpieza de apartados). */
  respaldoApartados: string | null;
  onCambiar: (valor: ReglasAdmin) => void;
  /** Lo que va al principio de "Citas y anticipos" (la fecha de inicio de los anticipos, con su variable de respaldo). */
  inicioCitas?: React.ReactNode;
}

/** Datos de transferencia: solo se piden si la transferencia en el salón está activa. */
const RUTAS_TRANSFERENCIA = ['pagos.transferencia.banco', 'pagos.transferencia.titular', 'pagos.transferencia.clabe'];

const idDe = (ruta: string) => `regla-${ruta.replace(/\./g, '-')}`;

function Ayuda({ d, id }: { d: DefinicionRegla; id: string }) {
  const rango = rangoDeRegla(d);
  return (
    <div id={`${id}-ayuda`} className="mt-1.5 space-y-1 text-sm" style={{ color: COLOR_SUAVE }}>
      <p>{d.afecta}</p>
      {rango && (
        <p className="flex items-center gap-1.5 tabular-nums">
          {d.minimoLegal && <Scale size={14} aria-hidden className="shrink-0" />}
          {rango}
        </p>
      )}
    </div>
  );
}

export function CampoRegla({ d, valor, error, onCambiar, respaldoApartados }: { d: DefinicionRegla; valor: unknown; error?: string; onCambiar: (v: unknown) => void; respaldoApartados: string | null }) {
  const id = idDe(d.ruta);
  const describe = [`${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(' ');
  const invalido = error ? true : undefined;

  if (d.tipo === 'booleano') {
    return (
      <div className="min-w-0">
        <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold" style={{ color: COLOR_TEXTO }}>
          <input id={id} type="checkbox" checked={valor === true} onChange={(e) => onCambiar(e.target.checked)} aria-describedby={describe} aria-invalid={invalido} className="h-5 w-5 shrink-0" />
          {d.etiqueta}
        </label>
        <Ayuda d={d} id={id} />
        {error && <MensajeError id={`${id}-error`}>{error}</MensajeError>}
      </div>
    );
  }

  if (d.tipo === 'horas') {
    const horas = Array.isArray(valor) ? (valor as number[]) : [];
    return (
      <fieldset className="min-w-0" aria-describedby={describe}>
        <legend className="mf-etiqueta">{d.etiqueta}</legend>
        <ul className="flex flex-wrap gap-2">
          {horas.map((h, i) => (
            <li key={i} className="flex items-center gap-2">
              <label htmlFor={`${id}-${i}`} className="sr-only">{`Recordatorio ${i + 1}, horas antes`}</label>
              <input
                id={`${id}-${i}`}
                type="number"
                inputMode="numeric"
                min={d.min}
                max={d.max}
                value={Number.isFinite(h) ? h : ''}
                onChange={(e) => onCambiar(horas.map((x, k) => (k === i ? (e.target.value === '' ? NaN : Number(e.target.value)) : x)))}
                aria-invalid={invalido}
                className="mf-campo w-24 px-3 py-2.5 tabular-nums"
              />
              <span className="text-sm" style={{ color: COLOR_SUAVE }}>h</span>
              <BotonIcono etiqueta={`Quitar recordatorio ${i + 1}`} onClick={() => onCambiar(horas.filter((_, k) => k !== i))}>
                <Trash2 size={18} aria-hidden />
              </BotonIcono>
            </li>
          ))}
        </ul>
        {horas.length === 0 && <p className="text-sm" style={{ color: COLOR_SUAVE }}>Sin recordatorios: la clienta no recibe avisos antes de su cita.</p>}
        <Button variant="outline" size="sm" className="mt-2" onClick={() => onCambiar([...horas, 2])} disabled={horas.length >= MAX_RECORDATORIOS}>
          <Plus size={16} aria-hidden />
          Agregar recordatorio
        </Button>
        <Ayuda d={d} id={id} />
        {error && <MensajeError id={`${id}-error`}>{error}</MensajeError>}
      </fieldset>
    );
  }

  if (d.tipo === 'dias-inhabiles') {
    const dias = Array.isArray(valor) ? (valor as DiaInhabil[]) : [];
    const cambiarDia = (i: number, parcial: Partial<DiaInhabil>) => onCambiar(dias.map((x, k) => (k === i ? { ...x, ...parcial } : x)));
    return (
      <fieldset className="min-w-0 md:col-span-2" aria-describedby={describe}>
        <legend className="mf-etiqueta">{d.etiqueta}</legend>
        {dias.length === 0 ? (
          <p className="text-sm" style={{ color: COLOR_SUAVE }}>
            Ninguno. Ya se cuentan como inhábiles los domingos y los festivos de ley.
          </p>
        ) : (
          <ul className="space-y-2">
            {dias.map((x, i) => (
              <li key={i} className="flex flex-wrap items-end gap-2">
                <div>
                  <label htmlFor={`${id}-${i}-fecha`} className="text-xs font-semibold" style={{ color: COLOR_SUAVE }}>
                    {`Día ${i + 1}`}
                  </label>
                  <input
                    id={`${id}-${i}-fecha`}
                    type="date"
                    value={x.fecha}
                    onChange={(e) => cambiarDia(i, { fecha: e.target.value })}
                    aria-invalid={invalido}
                    className="mf-campo block px-3 py-2.5 tabular-nums"
                  />
                </div>
                <div className="min-w-[12rem] flex-1">
                  <label htmlFor={`${id}-${i}-motivo`} className="text-xs font-semibold" style={{ color: COLOR_SUAVE }}>
                    Motivo (opcional)
                  </label>
                  <input
                    id={`${id}-${i}-motivo`}
                    type="text"
                    value={x.motivo}
                    maxLength={MAX_MOTIVO_DIA}
                    onChange={(e) => cambiarDia(i, { motivo: e.target.value })}
                    placeholder="Ej. Vacaciones del salón"
                    className="mf-campo block w-full px-3 py-2.5"
                  />
                </div>
                <BotonIcono etiqueta={`Quitar día inhábil ${i + 1}`} onClick={() => onCambiar(dias.filter((_, k) => k !== i))}>
                  <Trash2 size={18} aria-hidden />
                </BotonIcono>
              </li>
            ))}
          </ul>
        )}
        <Button variant="outline" size="sm" className="mt-2" onClick={() => onCambiar([...dias, { fecha: '', motivo: '' }])} disabled={dias.length >= MAX_DIAS_INHABILES}>
          <Plus size={16} aria-hidden />
          Agregar día inhábil
        </Button>
        <Ayuda d={d} id={id} />
        {error && <MensajeError id={`${id}-error`}>{error}</MensajeError>}
      </fieldset>
    );
  }

  const comunes = { id, 'aria-describedby': describe, 'aria-invalid': invalido };
  let control: React.ReactNode;
  if (d.tipo === 'entero' && d.opciones) {
    control = (
      <select {...comunes} value={String(valor ?? '')} onChange={(e) => onCambiar(Number(e.target.value))} className="mf-campo w-full px-4 py-2.5 tabular-nums">
        {d.opciones.map((o) => (
          <option key={o} value={o}>{`${o} ${d.unidad ?? ''}`.trim()}</option>
        ))}
      </select>
    );
  } else if (d.tipo === 'entero') {
    const fijo = d.minimoLegal && d.min !== undefined && d.min === d.max;
    control = (
      <div className="flex items-center gap-2">
        <input
          {...comunes}
          type="number"
          inputMode="numeric"
          min={d.min}
          max={d.max}
          step={1}
          readOnly={fijo}
          value={typeof valor === 'number' && Number.isFinite(valor) ? valor : ''}
          onChange={(e) => onCambiar(e.target.value === '' ? NaN : Number(e.target.value))}
          className="mf-campo w-28 px-4 py-2.5 tabular-nums read-only:opacity-70"
        />
        {d.unidad && <span className="text-sm" style={{ color: COLOR_SUAVE }}>{d.unidad}</span>}
      </div>
    );
  } else if (d.tipo === 'fecha') {
    control = (
      <input {...comunes} type="date" value={typeof valor === 'string' ? valor : ''} onChange={(e) => onCambiar(e.target.value || null)} className="mf-campo w-full max-w-xs px-4 py-2.5 tabular-nums" />
    );
  } else {
    const texto = typeof valor === 'string' ? valor : '';
    control = (
      <input
        {...comunes}
        type="text"
        inputMode={d.ruta.endsWith('clabe') ? 'numeric' : undefined}
        autoComplete="off"
        value={texto}
        onChange={(e) => onCambiar(e.target.value)}
        className="mf-campo w-full px-4 py-2.5"
      />
    );
  }

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mf-etiqueta">
        {d.etiqueta}
      </label>
      {control}
      <Ayuda d={d} id={id} />
      {d.ruta === 'tienda.apartadosDesde' && (
        <p className="mt-1 text-sm" style={{ color: COLOR_SUAVE }}>
          {`Variable de respaldo del servidor (APARTADOS_DESDE): ${respaldoApartados ? (/^\d{4}-\d{2}-\d{2}/.test(respaldoApartados) ? fechaLarga(respaldoApartados.slice(0, 10)) : respaldoApartados) : 'no está configurada'}.`}
        </p>
      )}
      {error && <MensajeError id={`${id}-error`}>{error}</MensajeError>}
    </div>
  );
}

/**
 * Admin > Configuración del sitio > Reglas: cada regla con su explicación, su rango y, si la fija la ley, su mínimo.
 * Los campos salen de definicionesReglas del backend. Los cambios aplican a las citas y pedidos nuevos.
 */
export default function FormReglasNegocio({ valor, definiciones, errores, respaldoApartados, onCambiar, inicioCitas }: Props) {
  const transferenciaActiva = leerRuta(valor, 'pagos.salon.transferencia') === true;
  const conDatos = RUTAS_TRANSFERENCIA.some((r) => String(leerRuta(valor, r) ?? '').trim() !== '');
  const verTransferencia = transferenciaActiva || conDatos;
  const grupos = gruposDeReglas(definiciones.filter((d) => d.ruta !== 'anticiposDesde' && (verTransferencia || !RUTAS_TRANSFERENCIA.includes(d.ruta))));

  return (
    <div className="space-y-8">
      <p role="note" className="flex gap-2 rounded-[10px] border px-3 py-2 text-sm" style={{ borderColor: 'var(--mf-linea-fuerte)', color: COLOR_TEXTO }}>
        <Info size={16} aria-hidden className="mt-0.5 shrink-0" />
        Los cambios aplican a las citas y pedidos que se hagan después de guardar. Los que ya existen conservan la regla con la que se hicieron.
      </p>
      {grupos.map(({ grupo, reglas }, i) => {
        const idGrupo = `reglas-grupo-${i}`;
        return (
          <section key={grupo} aria-labelledby={idGrupo} className="space-y-4">
            <h4 id={idGrupo} className="border-b pb-2 text-base font-semibold" style={{ color: COLOR_TEXTO, borderColor: 'var(--mf-linea)' }}>
              {grupo}
            </h4>
            {grupo === 'Citas y anticipos' && inicioCitas}
            {grupo === 'Métodos de pago' && !verTransferencia && (
              <p className="text-sm" style={{ color: COLOR_SUAVE }}>
                Activa la transferencia en el salón para escribir los datos de la cuenta.
              </p>
            )}
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
              {reglas.map((d) => (
                <CampoRegla
                  key={d.ruta}
                  d={d}
                  valor={leerRuta(valor, d.ruta)}
                  error={errores[d.ruta]}
                  respaldoApartados={respaldoApartados}
                  onCambiar={(v) => onCambiar(escribirRuta(valor, d.ruta, v))}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
