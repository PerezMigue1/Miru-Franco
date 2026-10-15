import ContactoProfeco from '../../../../../components/legal/Profeco';
import { CONDICIONES_PAGO, ENTREGA, LEYENDA_PRECIOS, PROVEEDOR, QUEJAS } from './infoComercio';

const FILA = 'grid gap-1 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4';
const ETIQUETA = { color: 'var(--menu-texto-principal)' };

/**
 * Información de comercio electrónico antes de confirmar (LFPC art. 76 BIS y 7 BIS): quién vende, precios,
 * formas de pago, entrega y cómo presentar una queja. Va dentro de la tarjeta de "Revisa y confirma".
 */
export default function InfoCompra() {
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
            {PROVEEDOR.nombreComercial}, responsable {PROVEEDOR.responsable}. {PROVEEDOR.domicilio}.
            {PROVEEDOR.telefono && (
              <>
                {' '}Teléfono y WhatsApp:{' '}
                <a href={PROVEEDOR.telefono.enlace} className="mf-cifras" style={ETIQUETA}>
                  {PROVEEDOR.telefono.visible}
                </a>
                .
              </>
            )}{' '}
            Correo:{' '}
            {/* Punto de corte antes de la arroba: en 375 px break-all lo partía a media palabra. */}
            <a href={`mailto:${PROVEEDOR.correo}`} style={ETIQUETA}>
              {PROVEEDOR.correo.split('@')[0]}
              <wbr />@{PROVEEDOR.correo.split('@').slice(1).join('@')}
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
          <dd>{ENTREGA}</dd>
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
