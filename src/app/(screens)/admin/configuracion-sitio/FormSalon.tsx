'use client';

import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { domicilioCompleto, frasesHorario, type DatosSalon, type HorarioDia, type RedesSalon } from '../../../services/configuracionSitio';
import { esCampoLegal } from './cambiosConfiguracion';
import { CampoConfig, VistaPrevia } from './piezas';
import { CAMPOS_REDES, CAMPOS_SALON, type Errores } from './validacionConfiguracion';

type CampoSalon = keyof DatosSalon;

/** Cómo se escribe cada campo (teclado del celular y autocompletado). */
const ENTRADA: Partial<Record<CampoSalon, { tipo?: 'email' | 'tel' | 'url'; inputMode?: 'numeric' | 'tel' | 'email' | 'url' }>> = {
  codigoPostal: { inputMode: 'numeric' },
  telefono: { tipo: 'tel', inputMode: 'tel' },
  whatsapp: { tipo: 'tel', inputMode: 'tel' },
  correoContacto: { tipo: 'email', inputMode: 'email' },
  correoPrivacidad: { tipo: 'email', inputMode: 'email' },
  mapaUrl: { tipo: 'url', inputMode: 'url' },
};

/** Grupos del formulario: identidad, domicilio, contacto y textos del pie. */
const GRUPOS: { titulo: string; campos: CampoSalon[] }[] = [
  { titulo: 'Identidad', campos: ['nombre', 'responsable'] },
  { titulo: 'Domicilio', campos: ['direccion', 'ciudad', 'codigoPostal', 'mapaUrl'] },
  { titulo: 'Contacto', campos: ['telefono', 'whatsapp', 'correoContacto', 'correoPrivacidad'] },
  { titulo: 'Textos del pie y buscadores', campos: ['lema', 'descripcionSeo'] },
];

interface Props {
  valor: DatosSalon;
  errores: Errores;
  onCambiar: (valor: DatosSalon) => void;
  camposLegales?: Record<string, string[]>;
}

export function FormSalon({ valor, errores, onCambiar, camposLegales }: Props) {
  return (
    <div className="space-y-6">
      {GRUPOS.map((g) => (
        <fieldset key={g.titulo} className="min-w-0">
          <legend className="mb-3 text-base font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
            {g.titulo}
          </legend>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {g.campos.map((k) => (
              <div key={k} className={CAMPOS_SALON[k].largo ? 'md:col-span-2' : undefined}>
                <CampoConfig
                  id={`salon-${k}`}
                  def={CAMPOS_SALON[k]}
                  valor={valor[k]}
                  onCambiar={(v) => onCambiar({ ...valor, [k]: v })}
                  error={errores[k]}
                  legal={esCampoLegal(camposLegales, 'salon', k)}
                  tipo={ENTRADA[k]?.tipo}
                  inputMode={ENTRADA[k]?.inputMode}
                />
              </div>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

export function FormRedes({ valor, errores, onCambiar }: { valor: RedesSalon; errores: Errores; onCambiar: (valor: RedesSalon) => void }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {(Object.keys(CAMPOS_REDES) as (keyof RedesSalon)[]).map((k) => (
        <CampoConfig
          key={k}
          id={`redes-${k}`}
          def={CAMPOS_REDES[k]}
          valor={valor[k]}
          onCambiar={(v) => onCambiar({ ...valor, [k]: v })}
          error={errores[k]}
          tipo="url"
          inputMode="url"
          placeholder="https://"
        />
      ))}
    </div>
  );
}

const ICONO = { color: 'var(--logo-branding)' };

/** El bloque de contacto del pie de página con los datos del formulario (mismo orden y colores del pie). */
export function VistaPreviaPie({ salon, dias }: { salon: DatosSalon; dias: HorarioDia[] }) {
  return (
    <VistaPrevia titulo="Así se verá el contacto del pie de página" oscura>
      <p className="mb-1 text-lg" style={{ color: 'var(--texto-fondo-oscuro)', fontFamily: 'var(--font-family-serif)' }}>
        {salon.nombre || 'Nombre del salón'}
      </p>
      {salon.lema && <p className="mb-4 text-sm leading-relaxed">{salon.lema}</p>}
      <p className="mb-3 text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--oro-sobre-carbon)' }}>
        Contacto
      </p>
      <ul className="space-y-3 text-sm">
        <li className="flex items-start gap-3">
          <MapPin size={16} aria-hidden className="mt-0.5 shrink-0" style={ICONO} />
          <span className={salon.mapaUrl ? 'underline underline-offset-2' : undefined}>{domicilioCompleto(salon)}</span>
        </li>
        <li className="flex items-start gap-3">
          <Mail size={16} aria-hidden className="mt-0.5 shrink-0" style={ICONO} />
          <span className="break-all">{salon.correoContacto}</span>
        </li>
        {salon.telefono && (
          <li className="flex items-start gap-3">
            <Phone size={16} aria-hidden className="mt-0.5 shrink-0" style={ICONO} />
            <span>{salon.telefono}</span>
          </li>
        )}
        {salon.whatsapp && (
          <li className="flex items-start gap-3">
            <MessageCircle size={16} aria-hidden className="mt-0.5 shrink-0" style={ICONO} />
            <span>{`WhatsApp ${salon.whatsapp}`}</span>
          </li>
        )}
        <li className="flex items-start gap-3">
          <Clock size={16} aria-hidden className="mt-0.5 shrink-0" style={ICONO} />
          <span>
            {frasesHorario(dias).map((f) => (
              <span key={f} className="block">
                {f}
              </span>
            ))}
          </span>
        </li>
      </ul>
      <p className="mt-4 border-t pt-3 text-xs" style={{ borderColor: 'var(--borde-sutil)' }}>
        {`El correo de privacidad y quejas (${salon.correoPrivacidad || 'sin escribir'}) no sale en el pie: lo citan los documentos legales.`}
      </p>
    </VistaPrevia>
  );
}
