import type { ReactNode } from 'react';
import Link from 'next/link';
import DocumentoLegal, { SeccionDocumento } from '../components/legal/DocumentoLegal';
import DocumentoVigente from '../components/legal/DocumentoVigente';
import EncabezadoVersion from '../components/legal/EncabezadoVersion';
import ContactoProfeco from '../components/legal/Profeco';
import { metadataPublica } from '../utils/seo';
import { PLAZOS_TERMINOS as P } from '../utils/terminosCondiciones';
import { documentoLegal } from '../utils/documentosLegales';

export const metadata = metadataPublica({
  title: 'Política de Reembolsos, Cambios y Cancelaciones',
  description:
    'Política de Reembolsos, Cambios y Cancelaciones de Mirú Franco Salón Beauty: revocación de compras, cambios de producto, cancelación de pedidos, garantía y anticipos de citas.',
  path: '/politica-de-reembolsos',
});

/** Secciones en el orden del texto: alimentan el índice y los títulos, así las anclas no se desfasan. */
const SECCIONES = [
  { id: 'revocacion', titulo: 'Tu derecho de revocación' },
  { id: 'cambios', titulo: 'Cambios de producto (beneficio adicional)' },
  { id: 'reembolsos', titulo: 'Otros casos con reembolso' },
  { id: 'cancelacion-de-pedidos', titulo: 'Cancelar un pedido' },
  { id: 'como-reembolsamos', titulo: 'Cómo hacemos los reembolsos' },
  { id: 'garantia', titulo: 'Garantía de servicios' },
  { id: 'anticipos', titulo: 'Anticipos de citas' },
  { id: 'quejas', titulo: 'Quejas' },
] as const;

function Seccion({ n, children }: { n: number; children: ReactNode }) {
  return (
    <SeccionDocumento secciones={SECCIONES} n={n}>
      {children}
    </SeccionDocumento>
  );
}

const CORREO = 'mildredfranco24@gmail.com';

export default function PoliticaDeReembolsosPage() {
  const terminos = documentoLegal('terminos');
  return (
    <DocumentoVigente slug="reembolsos">
    <DocumentoLegal
      titulo="Política de Reembolsos, Cambios y Cancelaciones"
      secciones={SECCIONES}
      etiquetaIndice="Índice de la política de reembolsos"
    >
      <EncabezadoVersion slug="reembolsos" />
      <p className="mf-terminos__intro">
        Aquí te explicamos cómo revocar una compra, cambiar un producto, cancelar un pedido o una cita y recibir un
        reembolso. Esta política complementa nuestros <Link href={terminos.ruta}>{terminos.titulo}</Link> y no limita
        los derechos que te otorga la Ley Federal de Protección al Consumidor.
      </p>

      <Seccion n={1}>
        <p>
          Conforme al artículo 56 de la Ley Federal de Protección al Consumidor, tienes 5 días hábiles para revocar tu
          compra en línea sin dar razones. El plazo corre desde la entrega de tu pedido en el salón o, si todavía no se
          te entrega, desde la compra.
        </p>
        <ol>
          <li>
            Para revocar, avísanos por WhatsApp al <a href="tel:+527711867645">771 186 7645</a> o por correo a{' '}
            <a href={`mailto:${CORREO}`}>{CORREO}</a>, o entréganos el producto en el salón.
          </li>
          <li>Si ya recogiste el producto, nos lo devuelves en el salón.</li>
          <li>Te reintegramos el total que pagaste.</li>
        </ol>
        <p>
          En los servicios, la revocación sigue las reglas de los anticipos de citas de la sección 7: no aplica si, al
          pagar tu anticipo, faltan 10 días hábiles o menos para tu cita.
        </p>
      </Seccion>

      <Seccion n={2}>
        <ol>
          <li>
            Además de tu derecho de revocación, aceptamos cambios de producto dentro de los {P.diasCambioProducto} días
            naturales siguientes a que lo recojas, siempre que esté sellado, sin abrir y en las mismas condiciones en que
            lo recibiste, con su comprobante.
          </li>
          <li>
            Por higiene y seguridad, este beneficio de cambio no aplica a productos abiertos o usados, salvo que tengan
            un defecto de fábrica. Esto no limita tu derecho de revocación.
          </li>
          <li>El cambio se hace por otro producto. Si el nuevo cuesta más, pagas la diferencia.</li>
        </ol>
      </Seccion>

      <Seccion n={3}>
        <p>Además de la revocación, también te devolvemos tu dinero cuando:</p>
        <ul>
          <li>el producto tiene un defecto de fábrica o llegó en mal estado;</li>
          <li>te entregamos un producto distinto al que pediste;</li>
          <li>cancelamos tu pedido por falta de existencias o por causas nuestras;</li>
          <li>cancelas un pedido pagado en línea antes de que lo empecemos a preparar.</li>
        </ul>
        <p>Revisa tus productos al recibirlos y repórtanos en ese momento cualquier detalle visible.</p>
      </Seccion>

      <Seccion n={4}>
        <ol>
          <li>
            <strong>Pedido pagado en línea:</strong> si lo cancelas antes de que lo empecemos a preparar, te devolvemos el
            pago completo.
          </li>
          <li>
            <strong>Apartado para pagar al recoger:</strong> como todavía no pagas, no hay nada que reembolsar. Si no se
            prepara en {P.diasApartadoSinPreparar} días, o no lo recoges en {P.diasApartadoListo} días desde que está
            listo, se cancela automáticamente sin costo para ti.
          </li>
          <li>
            Los pedidos pagados en línea se guardan {P.diasResguardoPedidoPagado} días a partir del aviso de &quot;listo
            para recoger&quot;. Si no puedes pasar en ese plazo, escríbenos para acordar una fecha.
          </li>
        </ol>
      </Seccion>

      <Seccion n={5}>
        <ol>
          <li>
            Los pagos en línea se reembolsan por Mercado Pago, al mismo medio con el que pagaste. El tiempo en que se
            refleja depende de tu banco.
          </li>
          <li>Si pagaste en el salón, te reintegramos el pago en el salón.</li>
        </ol>
      </Seccion>

      <Seccion n={6}>
        <p>
          Si un servicio no te dejó satisfecha, contáctanos dentro de los {P.diasGarantiaServicio} días siguientes.
          Revisaremos el caso contigo y, cuando corresponda, haremos un ajuste o corrección sin costo. La garantía aplica
          cuando se siguieron las indicaciones de cuidado posterior que te dimos.
        </p>
      </Seccion>

      <Seccion n={7}>
        <ol>
          <li>El anticipo aparta tu lugar y se descuenta del total de tu servicio.</li>
          <li>
            Si al pagar tu anticipo faltan más de 10 días hábiles para tu cita, puedes cancelarla dentro de los 5 días
            hábiles siguientes a tu pago y te devolvemos el anticipo completo.
          </li>
          <li>
            Si al pagar tu anticipo faltan 10 días hábiles o menos para tu cita, al cancelar el anticipo no se devuelve,
            pero puedes reagendar con aviso previo y tu anticipo se respeta para la nueva fecha.
          </li>
          <li>Si no llegas a tu cita y no avisas, el anticipo no se devuelve.</li>
          <li>Si nosotras cancelamos tu cita, te devolvemos el anticipo completo.</li>
        </ol>
      </Seccion>

      <Seccion n={8}>
        <p>
          Si tienes una queja, escríbenos primero. Queremos resolverla contigo. También puedes acudir a la Procuraduría
          Federal del Consumidor (Profeco): <ContactoProfeco />.
        </p>
      </Seccion>
    </DocumentoLegal>
    </DocumentoVigente>
  );
}
