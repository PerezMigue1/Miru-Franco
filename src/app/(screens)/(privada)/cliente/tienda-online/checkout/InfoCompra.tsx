'use client';

import ContactoProfeco from '../../../../../components/legal/Profeco';
import { CONDICIONES_PAGO, LEYENDA_PRECIOS, QUEJAS, textoEntrega } from './infoComercio';
import { useConfiguracionPublica } from '../../../../../hooks/useConfiguracionPublica';
import { domicilioCompleto, enlaceTelefono, enlaceWhatsApp } from '../../../../../services/configuracionSitio';

const FILA = 'grid gap-1 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4';
const ETIQUETA = { color: 'var(--menu-texto-principal)' };

/**
 * Información de comercio electrónico antes de confirmar (LFPC art. 76 BIS y 7 BIS): quién vende, precios,
 * formas de pago, entrega y cómo presentar una queja. Va dentro de la tarjeta de "Revisa y confirma".
 */
export default function InfoCompra() {
  // Proveedor, domicilio, contacto y horario: Configuración del sitio (por omisión, los de los Términos).
  const { salon, horario } = useConfiguracionPublica();
  const telefono = enlaceTelefono(salon.telefono);
  const whatsapp = enlaceWhatsApp(salon.whatsapp);
  const [usuarioCorreo, ...dominio] = salon.correoPrivacidad.split('@');
  return (
    <section className="pt-4 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
      <h3 className="text-subtitle mb-3" style={ETIQUETA}>
        Información de tu compra
      </h3>
      <dl
        className="space-y-3 text-sm [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2"
        style={{ color: 'var(--encabezados-alterno)' }}
      >
        <div className={FILA}>
          <dt className="font-semibold" style={ETIQUETA}>Quién te vende</dt>
          <dd>
            {salon.nombre}, responsable {salon.responsable}. {domicilioCompleto(salon)}.
            {telefono && (
              <>
                {' '}Teléfono:{' '}
                <a href={telefono} className="mf-cifras" style={ETIQUETA}>
                  {salon.telefono}
                </a>
                .
              </>
            )}
            {whatsapp && (
              <>
                {' '}WhatsApp:{' '}
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="mf-cifras" style={ETIQUETA}>
                  {salon.whatsapp}
                  <span className="sr-only"> (se abre en otra pestaña)</span>
                </a>
                .
              </>
            )}{' '}
            Correo:{' '}
            {/* Punto de corte antes de la arroba: en 375 px break-all lo partía a media palabra. */}
            <a href={`mailto:${salon.correoPrivacidad}`} style={ETIQUETA}>
              {usuarioCorreo}
              <wbr />@{dominio.join('@')}
            </a>
          </dd>
        </div>
        <div className={FILA}>
          <dt className="font-semibold" style={ETIQUETA}>Precios</dt>
          <dd>{LEYENDA_PRECIOS}</dd>
        </div>
        <div className={FILA}>
          <dt className="font-semibold" style={ETIQUETA}>Formas de pago</dt>
          <dd>
            <ul className="space-y-1">
              {CONDICIONES_PAGO.map((c) => (
                <li key={c.titulo}>
                  <strong style={ETIQUETA}>{c.titulo}:</strong> {c.texto}
                </li>
              ))}
            </ul>
          </dd>
        </div>
        <div className={FILA}>
          <dt className="font-semibold" style={ETIQUETA}>Entrega</dt>
          <dd>{textoEntrega(horario.dias)}</dd>
        </div>
        <div className={FILA}>
          <dt className="font-semibold" style={ETIQUETA}>Quejas</dt>
          <dd>
            {QUEJAS} También puedes acudir a la Procuraduría Federal del Consumidor (Profeco): <ContactoProfeco />.
          </dd>
        </div>
      </dl>
    </section>
  );
}
