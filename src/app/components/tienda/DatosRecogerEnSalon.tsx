import { Bell, Clock, MapPin } from 'lucide-react';
import { CIUDAD_SALON, DIRECCION_SALON, HORARIO_SALON, NOMBRE_SALON, TELEFONO_SALON } from '../../utils/contactoSalon';

/** Dónde y cuándo se recoge el pedido (todo se recoge en el salón): checkout y detalle del pedido. */
export default function DatosRecogerEnSalon({ conAviso = true }: { conAviso?: boolean }) {
  return (
    <ul className="space-y-4">
      <li className="flex items-start gap-3">
        <MapPin className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--logo-branding)' }} aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
            {NOMBRE_SALON}
          </p>
          <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            {DIRECCION_SALON ?? CIUDAD_SALON}
          </p>
          {DIRECCION_SALON ? (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${NOMBRE_SALON}, ${DIRECCION_SALON}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold underline underline-offset-2"
              style={{ color: 'var(--checkout-entrega-enlace)' }}
            >
              Cómo llegar
            </a>
          ) : TELEFONO_SALON ? (
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
              ¿Dudas para llegar? Llámanos al{' '}
              <a
                href={TELEFONO_SALON.enlace}
                className="font-semibold underline underline-offset-2 mf-cifras"
                style={{ color: 'var(--checkout-entrega-enlace)' }}
              >
                {TELEFONO_SALON.visible}
              </a>
              .
            </p>
          ) : null}
        </div>
      </li>
      <li className="flex items-start gap-3">
        <Clock className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--logo-branding)' }} aria-hidden />
        <p className="text-sm mf-cifras" style={{ color: 'var(--encabezados-alterno)' }}>
          {HORARIO_SALON.frases.map((frase) => (
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
