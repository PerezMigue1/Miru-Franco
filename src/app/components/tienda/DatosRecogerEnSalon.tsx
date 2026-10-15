'use client';

import { Bell, Clock, MapPin } from 'lucide-react';
import { useConfiguracionPublica } from '../../hooks/useConfiguracionPublica';
import { domicilioCompleto, enlaceTelefono, frasesHorario } from '../../services/configuracionSitio';

/** Dónde y cuándo se recoge el pedido (todo se recoge en el salón): checkout y detalle del pedido. */
export default function DatosRecogerEnSalon({ conAviso = true }: { conAviso?: boolean }) {
  // Nombre, domicilio, mapa, teléfono y horario: Configuración del sitio.
  const { salon, horario } = useConfiguracionPublica();
  const domicilio = domicilioCompleto(salon);
  const mapa = salon.mapaUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${salon.nombre}, ${domicilio}`)}`;
  const telefono = enlaceTelefono(salon.telefono);
  return (
    <ul className="space-y-4">
      <li className="flex items-start gap-3">
        <MapPin className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--logo-branding)' }} aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
            {salon.nombre}
          </p>
          <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            {domicilio}
          </p>
          {salon.direccion ? (
            <a
              href={mapa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-2"
              // Sobre la tarjeta terracota del checkout el vino del enlace daba 4.10:1: texto principal subrayado.
              style={{ color: 'var(--menu-texto-principal)' }}
            >
              Cómo llegar
            </a>
          ) : telefono ? (
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
              ¿Dudas para llegar? Llámanos al{' '}
              <a
                href={telefono}
                className="font-semibold underline underline-offset-2 mf-cifras"
                style={{ color: 'var(--menu-texto-principal)' }}
              >
                {salon.telefono}
              </a>
              .
            </p>
          ) : null}
        </div>
      </li>
      <li className="flex items-start gap-3">
        <Clock className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--logo-branding)' }} aria-hidden />
        <p className="text-sm mf-cifras" style={{ color: 'var(--encabezados-alterno)' }}>
          {frasesHorario(horario.dias).map((frase) => (
            <span key={frase} className="block">
              {frase}
            </span>
          ))}
        </p>
      </li>
      {conAviso && (
        <li className="flex items-start gap-3">
          <Bell className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--logo-branding)' }} aria-hidden />
          <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            Suele estar listo en 24 a 48 horas hábiles. Te avisamos en la app y por correo cuando puedas pasar por él.
          </p>
        </li>
      )}
    </ul>
  );
}
