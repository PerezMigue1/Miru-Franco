'use client';

import type { ReactNode } from 'react';
import { CreditCard, Landmark, Store, Wallet } from 'lucide-react';
import { formatearPrecioMXN } from '../../utils/formatoPrecio';
import {
  avisoCancelar,
  consecuenciaNoAsistir,
  etiquetaOpcion,
  opcionesAnticipo,
  plazoDeOpcion,
  saldoEnSalon,
  textoMetodosSalon,
  textoSinAnticipo,
  type OpcionAnticipo,
} from '../../utils/formaPago';
import type { ReglasPublicas } from '../../utils/reglasNegocio';
import { useConfiguracionPublica } from '../../hooks/useConfiguracionPublica';
import { textoSitio } from '../../utils/textosSitio';

interface Props {
  precio: number | string | null | undefined;
  anticipo: number;
  reglas: ReglasPublicas;
  opcion: OpcionAnticipo;
  onOpcion: (opcion: OpcionAnticipo) => void;
  /** La casilla de la Política de anticipos (solo con anticipo). */
  casilla?: ReactNode;
  deshabilitado?: boolean;
}

const ICONO: Record<OpcionAnticipo, ReactNode> = {
  linea: <CreditCard size={18} aria-hidden className="shrink-0" />,
  salon: <Store size={18} aria-hidden className="shrink-0" />,
};

/** Datos de transferencia del salón (solo llegan si la transferencia está activa y completa). */
function DatosTransferencia({ reglas }: { reglas: ReglasPublicas }) {
  const t = reglas.pagos.transferencia;
  if (!t) return null;
  return (
    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
      <dt className="text-encabezados-alterno">Banco</dt>
      <dd className="text-menu-texto-principal">{t.banco}</dd>
      <dt className="text-encabezados-alterno">Titular</dt>
      <dd className="text-menu-texto-principal">{t.titular}</dd>
      <dt className="text-encabezados-alterno">CLABE</dt>
      <dd className="mf-cifras break-all text-menu-texto-principal">{t.clabe}</dd>
    </dl>
  );
}

/**
 * "Forma de pago" del paso Confirmar de Crear cita: siempre visible. Con anticipo, el monto, el saldo en el salón, las
 * opciones activas (en línea o en el salón), su plazo, las consecuencias y la casilla de la política. Sin anticipo,
 * cuánto se paga en el salón y con qué métodos.
 */
export default function FormaPagoCita({ precio, anticipo, reglas, opcion, onOpcion, casilla, deshabilitado }: Props) {
  // Textos de Admin > Textos del sitio (las reglas llegan del padre: las mismas de la configuración pública).
  const { textos } = useConfiguracionPublica();
  const metodos = textoMetodosSalon(reglas, textos);

  if (anticipo <= 0) {
    return (
      <section aria-labelledby="titulo-forma-pago" className="space-y-2 rounded-xl bg-fondos-suaves p-4">
        <h3 id="titulo-forma-pago" className="flex items-center gap-2 text-base font-semibold text-menu-texto-principal">
          <Wallet size={18} aria-hidden className="shrink-0 text-logo-branding" />
          Forma de pago
        </h3>
        <p className="text-sm font-medium text-menu-texto-principal">{textoSinAnticipo(precio, textos)}</p>
        {metodos && <p className="text-sm text-encabezados-alterno">{metodos}</p>}
        {reglas.pagos.metodosSalon.includes('transferencia') && <DatosTransferencia reglas={reglas} />}
      </section>
    );
  }

  const opciones = opcionesAnticipo(reglas);
  const saldo = saldoEnSalon(precio, anticipo);
  const aviso = avisoCancelar(reglas, textos);

  return (
    <section aria-labelledby="titulo-forma-pago" className="space-y-4">
      <h3 id="titulo-forma-pago" className="flex items-center gap-2 text-base font-semibold text-menu-texto-principal">
        <Wallet size={18} aria-hidden className="shrink-0 text-logo-branding" />
        Forma de pago
      </h3>
      <dl className="grid grid-cols-1 gap-3 rounded-xl bg-fondos-suaves p-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-encabezados-alterno">{textoSitio(textos, 'citas.formaPago.anticipoEtiqueta')}</dt>
          <dd className="mf-cifras text-xl font-bold text-menu-texto-principal">{formatearPrecioMXN(anticipo)}</dd>
        </div>
        {saldo !== null && (
          <div>
            <dt className="text-sm text-encabezados-alterno">{textoSitio(textos, 'citas.formaPago.saldoEtiqueta')}</dt>
            <dd className="mf-cifras text-xl font-bold text-menu-texto-principal">{formatearPrecioMXN(saldo)}</dd>
          </div>
        )}
      </dl>

      <fieldset className="space-y-2" disabled={deshabilitado}>
        <legend className="mb-2 text-sm font-semibold text-menu-texto-principal">{textoSitio(textos, 'citas.formaPago.pregunta')}</legend>
        {opciones.map((o) => {
          const id = `forma-pago-${o}`;
          const elegida = opcion === o;
          return (
            <label
              key={o}
              htmlFor={id}
              className="flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors"
              style={{ borderColor: elegida ? 'var(--botones-principales)' : 'var(--mf-linea-fuerte)', background: elegida ? 'var(--fondos-suaves)' : 'transparent' }}
            >
              <input id={id} type="radio" name="forma-pago-anticipo" value={o} checked={elegida} onChange={() => onOpcion(o)} aria-describedby={`${id}-plazo`} className="mt-0.5 h-5 w-5 shrink-0" />
              <span className="min-w-0 space-y-1">
                <span className="flex items-center gap-2 font-semibold text-menu-texto-principal">
                  {ICONO[o]}
                  {etiquetaOpcion(o, textos)}
                </span>
                <span id={`${id}-plazo`} className="block text-sm text-encabezados-alterno">
                  {plazoDeOpcion(o, reglas, textos)}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>

      <ul className="space-y-1.5 text-sm text-encabezados-alterno">
        <li>{consecuenciaNoAsistir(reglas, textos)}</li>
        {aviso && <li>{aviso}</li>}
        {metodos && (
          <li className="flex gap-2">
            <Landmark size={16} aria-hidden className="mt-0.5 shrink-0" />
            <span>
              {metodos}
              {opcion === 'salon' && reglas.pagos.metodosSalon.includes('transferencia') && <DatosTransferencia reglas={reglas} />}
            </span>
          </li>
        )}
      </ul>
      {casilla}
    </section>
  );
}
