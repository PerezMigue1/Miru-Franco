'use client';

import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Scale, ShieldAlert } from 'lucide-react';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import { AVISO_CAMPO_LEGAL, AVISO_DOCUMENTOS_LEGALES, type Cambio } from './cambiosConfiguracion';
import type { DefCampo } from './validacionConfiguracion';

/** Piezas compartidas de Admin > Configuración del sitio. */

export const COLOR_TEXTO = 'var(--menu-texto-principal)';
export const COLOR_SUAVE = 'var(--encabezados-alterno)';

export function AvisoCampoLegal({ id }: { id?: string }) {
  return (
    <span id={id} className="mb-1.5 block">
      <Badge variant="warning" size="sm" className="!whitespace-normal !rounded-[8px] text-left">
        <Scale size={14} aria-hidden className="shrink-0" />
        {AVISO_CAMPO_LEGAL}
      </Badge>
    </span>
  );
}

interface CampoConfigProps {
  id: string;
  def: DefCampo;
  valor: string;
  onCambiar: (valor: string) => void;
  error?: string;
  /** El dato también aparece en los documentos legales. */
  legal?: boolean;
  tipo?: 'text' | 'email' | 'tel' | 'url';
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
  autoComplete?: string;
  placeholder?: string;
  /** Sustituye el título del campo (p. ej. en listas: "Párrafo 2"). */
  etiqueta?: string;
}

/**
 * Campo de texto con contador de caracteres, ayuda, aviso de documentos legales y error junto al campo.
 * Usa las clases del sistema (.mf-etiqueta, .mf-campo) para describir el campo con todas sus notas.
 */
export function CampoConfig({ id, def, valor, onCambiar, error, legal, tipo = 'text', inputMode, autoComplete, placeholder, etiqueta }: CampoConfigProps) {
  const largo = valor.trim().length;
  const excedido = largo > def.max;
  const describe = [legal && `${id}-legal`, def.ayuda && `${id}-ayuda`, `${id}-contador`, error && `${id}-error`].filter(Boolean).join(' ');
  const comunes = {
    id,
    value: valor,
    placeholder,
    'aria-invalid': error ? true : undefined,
    'aria-required': def.obligatorio ? true : undefined,
    'aria-describedby': describe,
    className: 'mf-campo w-full px-4 py-2.5',
  };
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mf-etiqueta">
        {etiqueta ?? def.titulo}
        {def.obligatorio && (
          <span aria-hidden style={{ color: 'var(--danger-texto)' }}>
            {' *'}
          </span>
        )}
      </label>
      {legal && <AvisoCampoLegal id={`${id}-legal`} />}
      {def.largo ? (
        <textarea {...comunes} rows={3} className={`${comunes.className} resize-y`} onChange={(e) => onCambiar(e.target.value)} />
      ) : (
        <input {...comunes} type={tipo} inputMode={inputMode} autoComplete={autoComplete ?? 'off'} onChange={(e) => onCambiar(e.target.value)} />
      )}
      <div className="mt-1.5 flex items-start justify-between gap-3 text-sm">
        {def.ayuda && (
          <p id={`${id}-ayuda`} className="min-w-0" style={{ color: COLOR_SUAVE }}>
            {def.ayuda}
          </p>
        )}
        <p
          id={`${id}-contador`}
          className="ml-auto shrink-0 tabular-nums"
          style={{ color: excedido ? 'var(--danger-texto)' : COLOR_SUAVE, fontWeight: excedido ? 600 : undefined }}
        >
          {`${largo}/${def.max}`}
          <span className="sr-only"> caracteres</span>
        </p>
      </div>
      {error && <MensajeError id={`${id}-error`}>{error}</MensajeError>}
    </div>
  );
}

export function MensajeError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm font-medium" style={{ color: 'var(--danger-texto)' }}>
      {children}
    </p>
  );
}

const ESTILO_BOTON_ICONO = {
  '--btn-bg': 'transparent',
  '--btn-texto': 'var(--menu-texto-principal)',
  '--btn-borde': '1px solid var(--campo-borde)',
  '--btn-bg-hover': 'var(--nav-hover-bg)',
} as CSSProperties;

/** Botón cuadrado de 44 px con solo ícono (subir, bajar, quitar): lleva aria-label. */
export function BotonIcono({ etiqueta, onClick, disabled, children }: { etiqueta: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      onClick={onClick}
      disabled={disabled}
      className="mf-btn mf-btn-color grid h-11 w-11 shrink-0 place-items-center rounded-[10px] disabled:cursor-not-allowed disabled:opacity-40"
      style={ESTILO_BOTON_ICONO}
    >
      {children}
    </button>
  );
}

export function ListaCambios({ cambios }: { cambios: Cambio[] }) {
  if (cambios.length === 0) return <p className="text-sm" style={{ color: COLOR_SUAVE }}>Sin cambios en los campos.</p>;
  return (
    <ul className="space-y-3">
      {cambios.map((c) => (
        <li key={c.campo} className="rounded-[10px] border px-3 py-2" style={{ borderColor: 'var(--mf-linea-fuerte)' }}>
          <p className="text-sm font-semibold" style={{ color: COLOR_TEXTO }}>
            {c.campo}
          </p>
          <dl className="mt-1 grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-xs font-semibold" style={{ color: COLOR_SUAVE }}>
                Antes
              </dt>
              <dd className="whitespace-pre-line break-words" style={{ color: COLOR_TEXTO }}>
                {c.antes}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-semibold" style={{ color: COLOR_SUAVE }}>
                Ahora
              </dt>
              <dd className="whitespace-pre-line break-words" style={{ color: COLOR_TEXTO }}>
                {c.despues}
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}

type Permiso = { clave: string; descripcion: string };

export function CambiosPermisos({ agregadas, quitadas }: { agregadas: Permiso[]; quitadas: Permiso[] }) {
  if (agregadas.length === 0 && quitadas.length === 0) return <p className="text-sm" style={{ color: COLOR_SUAVE }}>Sin cambios en los permisos.</p>;
  const lista = (titulo: string, items: Permiso[], variante: 'success' | 'danger') =>
    items.length > 0 && (
      <div>
        <p className="mb-1">
          <Badge variant={variante} size="sm">
            {titulo}
          </Badge>
        </p>
        <ul className="space-y-1 text-sm" style={{ color: COLOR_TEXTO }}>
          {items.map((p) => (
            <li key={p.clave} className="break-words">
              {p.descripcion}
              {p.descripcion !== p.clave && (
                <span className="ml-1 text-xs" style={{ color: COLOR_SUAVE, fontFamily: 'var(--font-family-mono)' }}>
                  {`(${p.clave})`}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  return (
    <div className="space-y-3">
      {lista('Agregados', agregadas, 'success')}
      {lista('Quitados', quitadas, 'danger')}
    </div>
  );
}

/** Cuerpo del diálogo de confirmación: qué cambia y, si toca datos de los documentos legales, que estos no cambian solos. */
export function ResumenGuardado({ cambios, tocaLegal }: { cambios: Cambio[]; tocaLegal?: boolean }) {
  return (
    <div className="space-y-4" style={{ color: 'var(--texto-cuerpo)' }}>
      <p className="text-sm">Revisa lo que vas a cambiar. Se verá en el sitio en menos de un minuto.</p>
      <ListaCambios cambios={cambios} />
      {tocaLegal && (
        <p className="flex gap-2 text-sm font-medium" style={{ color: 'var(--warning-texto)' }}>
          <Scale size={16} aria-hidden className="mt-0.5 shrink-0" />
          Algunos de estos datos también aparecen en los documentos legales. Guardar aquí no cambia los documentos legales
          publicados.
        </p>
      )}
    </div>
  );
}

const ESTILO_AVISO: CSSProperties = {
  backgroundColor: 'color-mix(in srgb, var(--warning) 12%, var(--fondo-general))',
  borderColor: 'var(--warning)',
  color: 'var(--warning-texto)',
};

export function AvisoDocumentosLegales({ onCerrar }: { onCerrar: () => void }) {
  return (
    <div role="status" className="flex flex-col gap-3 rounded-[10px] border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between" style={ESTILO_AVISO}>
      <p className="flex gap-2 font-semibold">
        <AlertTriangle size={18} aria-hidden className="mt-0.5 shrink-0" />
        {AVISO_DOCUMENTOS_LEGALES}
      </p>
      <Button variant="outline" onClick={onCerrar} className="shrink-0">
        Entendido
      </Button>
    </div>
  );
}

export function ErroresGenerales({ mensajes }: { mensajes: string[] }) {
  if (mensajes.length === 0) return null;
  return (
    <div
      role="alert"
      className="rounded-[10px] px-4 py-3 text-sm"
      style={{ backgroundColor: 'color-mix(in srgb, var(--danger) 10%, var(--fondo-general))', color: 'var(--danger-texto)' }}
    >
      {mensajes.length === 1 ? (
        <p className="font-semibold">{mensajes[0]}</p>
      ) : (
        <ul className="list-disc space-y-1 pl-5 font-semibold">
          {mensajes.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PantallaCargando() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando la configuración…</span>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="mf-skeleton h-11 w-36" />
        ))}
      </div>
      <Card padding="md">
        <div className="space-y-4">
          <div className="mf-skeleton h-7 w-56" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="mf-skeleton h-16 w-full" />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

export function PantallaSinPermiso() {
  return (
    <Card padding="lg">
      <div className="flex flex-col items-start gap-3">
        <ShieldAlert size={28} aria-hidden style={{ color: 'var(--logo-branding)' }} />
        <h2 className="text-lg font-semibold" style={{ color: COLOR_TEXTO }}>
          No tienes permiso para ver la configuración del sitio.
        </h2>
        <p className="max-w-[65ch] text-sm" style={{ color: COLOR_SUAVE }}>
          Solo el administrador puede cambiar los datos del salón, el horario, los textos, las reglas y los permisos por
          rol. Si crees que es un error, pide a la administradora que revise tu cuenta.
        </p>
      </div>
    </Card>
  );
}

export function PantallaError({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-[10px] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
      style={{ backgroundColor: 'color-mix(in srgb, var(--danger) 10%, var(--fondo-general))', color: 'var(--danger-texto)' }}
    >
      <span className="font-semibold">{mensaje}</span>
      <Button variant="outline" onClick={onReintentar}>
        <RefreshCw size={16} aria-hidden />
        Reintentar
      </Button>
    </div>
  );
}

/** Marco de vista previa: "Así se verá" con el contenido dentro. */
export function VistaPrevia({ titulo = 'Vista previa', children, oscura }: { titulo?: string; children: ReactNode; oscura?: boolean }) {
  return (
    <section aria-label={titulo} className="min-w-0">
      <h4 className="mb-2 text-sm font-semibold" style={{ color: COLOR_SUAVE }}>
        {titulo}
      </h4>
      <div
        className="rounded-[10px] border p-4"
        style={
          oscura
            ? { backgroundColor: 'var(--header-footer)', borderColor: 'var(--borde-sutil)', color: 'var(--texto-fondo-oscuro-70)' }
            : { backgroundColor: 'var(--fondo-general)', borderColor: 'var(--mf-linea-fuerte)', color: 'var(--texto-cuerpo)' }
        }
      >
        {children}
      </div>
    </section>
  );
}
