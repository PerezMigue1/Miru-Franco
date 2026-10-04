import type { ReactNode } from 'react';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';
import Card from '../components/ui/Card';
import DocumentoLegal, { SeccionDocumento } from '../components/legal/DocumentoLegal';
import { metadataPublica } from '../utils/seo';
import { PLAZOS_TERMINOS as P, fechaActualizacionTerminos } from '../utils/terminosCondiciones';
import { HORARIO_SALON } from '../utils/contactoSalon';

export const metadata = metadataPublica({
  title: 'Términos y Condiciones',
  description:
    'Términos y Condiciones de Mirú Franco Salón Beauty: compras con recogida en el salón, pago en línea y apartados, cambios y devoluciones, citas, garantía y datos personales.',
  path: '/terminos-y-condiciones',
});

/** Secciones en el orden del texto: alimentan el índice y los títulos, así las anclas no se desfasan. */
const SECCIONES = [
  { id: 'quienes-somos', titulo: 'Quiénes somos' },
  { id: 'uso-del-sitio', titulo: 'Uso del sitio y de tu cuenta' },
  { id: 'productos-y-precios', titulo: 'Productos y precios' },
  { id: 'compras-en-linea', titulo: 'Compras en línea: solo recoger en el salón' },
  { id: 'cambios-y-devoluciones', titulo: 'Cambios, devoluciones y cancelaciones' },
  { id: 'citas-y-servicios', titulo: 'Citas y servicios' },
  { id: 'tratamientos-quimicos', titulo: 'Tratamientos químicos y cuidado posterior' },
  { id: 'garantia', titulo: 'Garantía de satisfacción' },
  { id: 'fotografias', titulo: 'Fotografías de nuestro trabajo' },
  { id: 'facturacion', titulo: 'Facturación' },
  { id: 'datos-personales', titulo: 'Datos personales' },
  { id: 'propiedad-intelectual', titulo: 'Propiedad intelectual' },
  { id: 'cambios-a-estos-terminos', titulo: 'Cambios a estos términos' },
  { id: 'quejas', titulo: 'Quejas y legislación aplicable' },
] as const;

function Seccion({ n, children }: { n: number; children: ReactNode }) {
  return (
    <SeccionDocumento secciones={SECCIONES} n={n}>
      {children}
    </SeccionDocumento>
  );
}

export default function TerminosYCondicionesPage() {
  return (
    <DocumentoLegal
      titulo="Términos y Condiciones de Uso"
      fechaIso={P.fechaActualizacion}
      fechaTexto={fechaActualizacionTerminos()}
      secciones={SECCIONES}
      etiquetaIndice="Índice de los términos"
    >
      <p className="mf-terminos__intro">
        Bienvenida a www.mirufranco.com. Al crear una cuenta, agendar una cita o comprar en nuestra tienda en
        línea, aceptas estos Términos y Condiciones. Te pedimos leerlos con calma. Si tienes dudas, escríbenos
        antes de hacer tu compra o cita.
      </p>

      <Seccion n={1}>
        <p>
          Este sitio es operado por Mildred Rubí Franco Martínez, con nombre comercial Mirú Franco Salón Beauty.
        </p>
        <Card variant="elevated" padding="lg" className="mf-terminos__contacto">
          <dl>
            <div>
              <dt>
                <MapPin size={18} aria-hidden /> Domicilio
              </dt>
              <dd>
                Segunda Cerrada de Allende No. 15, Col. Juárez, Huejutla de Reyes, Hidalgo, C.P. 43000.
              </dd>
            </div>
            <div>
              <dt>
                <Phone size={18} aria-hidden /> Teléfonos y WhatsApp
              </dt>
              <dd>
                <a href="tel:+527711867645">771 186 7645</a> y <a href="tel:+527712681432">771 268 1432</a>
              </dd>
            </div>
            <div>
              <dt>
                <Mail size={18} aria-hidden /> Correo
              </dt>
              <dd>
                <a href="mailto:mildredfranco24@gmail.com">mildredfranco24@gmail.com</a>
              </dd>
            </div>
            <div>
              <dt>
                <Clock size={18} aria-hidden /> Horario de atención
              </dt>
              <dd>
              {HORARIO_SALON.frases.map((frase) => (
                <span key={frase} className="block">
                  {frase}
                </span>
              ))}
            </dd>
            </div>
          </dl>
        </Card>
      </Seccion>

      <Seccion n={2}>
        <ol>
          <li>Para comprar o agendar en línea necesitas una cuenta con datos reales y actualizados.</li>
          <li>
            Eres responsable de cuidar tu contraseña y de lo que se haga con tu cuenta. Si notas un uso que no
            reconoces, avísanos de inmediato.
          </li>
          <li>
            No está permitido usar el sitio para fines ilícitos, intentar acceder a cuentas ajenas ni afectar su
            funcionamiento. Podemos suspender cuentas que incumplan estos términos.
          </li>
        </ol>
      </Seccion>

      <Seccion n={3}>
        <ol>
          <li>Todos los precios están en pesos mexicanos (MXN) e incluyen IVA.</li>
          <li>Las fotografías son ilustrativas. El empaque puede variar según el lote del fabricante.</li>
          <li>
            Las existencias se confirman al momento de completar tu pedido. Si por un error un producto no está
            disponible, te avisaremos y podrás elegir otro producto o recibir el reembolso de lo que hayas pagado
            por él.
          </li>
          <li>
            Podemos actualizar precios y promociones en cualquier momento. El precio que se respeta es el que
            aparece al confirmar tu pedido.
          </li>
        </ol>
      </Seccion>

      <Seccion n={4}>
        <p>
          No realizamos envíos a domicilio desde la tienda en línea. Todos los pedidos se recogen en el salón,
          dentro del horario de atención. Al hacer tu pedido puedes elegir entre dos formas de pago:
        </p>

        <h3>4.1 Pagar en línea</h3>
        <ol>
          <li>
            El pago se procesa por medio de Mercado Pago. Mirú Franco no recibe ni guarda los datos de tu tarjeta.
          </li>
          <li>
            Tu pedido queda confirmado cuando Mercado Pago aprueba el pago. Si el pago no se completa en{' '}
            {P.horasPagoEnLinea} horas, el pedido se cancela automáticamente y los productos vuelven a estar
            disponibles.
          </li>
          <li>Te avisaremos cuando tu pedido esté listo para recoger.</li>
        </ol>

        <h3>4.2 Apartar y pagar al recoger</h3>
        <ol>
          <li>
            Apartas tus productos en línea y los pagas en el salón al recogerlos, en efectivo, por transferencia o con
            tarjeta, según los medios disponibles en el salón.
          </li>
          <li>
            Si tu pedido no se prepara en {P.diasApartadoSinPreparar} días, se cancela automáticamente.
          </li>
          <li>
            Cuando esté listo te avisaremos. Al día {P.diasRecordatorioApartado} te enviaremos un recordatorio. Si
            no lo recoges en {P.diasApartadoListo} días, el apartado se cancela y los productos vuelven a la
            venta.
          </li>
        </ol>

        <h3>4.3 Al recoger tu pedido</h3>
        <ol>
          <li>Presenta tu número de pedido y el nombre de la cuenta con la que compraste.</li>
          <li>Si otra persona recoge por ti, avísanos antes por WhatsApp con su nombre completo.</li>
          <li>Revisa tus productos al recibirlos. Cualquier detalle visible repórtalo en ese momento.</li>
          <li>
            Los pedidos pagados en línea se guardan {P.diasResguardoPedidoPagado} días a partir del aviso de
            &quot;listo para recoger&quot;. Si no puedes pasar en ese plazo, escríbenos para acordar una fecha.
          </li>
        </ol>
      </Seccion>

      <Seccion n={5}>
        <ol>
          <li>
            <strong>Cambios:</strong> aceptamos cambios de producto dentro de los {P.diasCambioProducto} días
            naturales siguientes a que lo recojas, siempre que esté sellado, sin abrir y en las mismas
            condiciones en que lo recibiste, con su comprobante.
          </li>
          <li>
            Por higiene y seguridad, no aceptamos cambios de productos abiertos o usados, salvo que tengan un
            defecto de fábrica.
          </li>
          <li>
            <strong>Cambio por otro producto:</strong> el cambio se hace por otro producto. Si el nuevo cuesta
            más, pagas la diferencia.
          </li>
          <li>
            <strong>Sí hay reembolso en estos casos:</strong>
            <ul>
              <li>el producto tiene un defecto de fábrica o llegó en mal estado;</li>
              <li>te entregamos un producto distinto al que pediste;</li>
              <li>cancelamos tu pedido por falta de existencias o por causas nuestras;</li>
              <li>cancelas un pedido pagado en línea antes de que esté listo para recoger.</li>
            </ul>
          </li>
          <li>
            Los reembolsos de pagos en línea se hacen por Mercado Pago, al mismo medio con el que pagaste. El
            tiempo en que se refleja depende de tu banco.
          </li>
          <li>Lo anterior no limita los derechos que te otorga la Ley Federal de Protección al Consumidor.</li>
        </ol>
      </Seccion>

      <Seccion n={6}>
        <ol>
          <li>
            <strong>Anticipo:</strong> algunas citas requieren un anticipo para quedar confirmadas. El anticipo
            se descuenta del total de tu servicio.
          </li>
          <li>
            <strong>Confirmación:</strong> te contactaremos un día antes para confirmar tu cita.
          </li>
          <li>
            <strong>Puntualidad:</strong> te pedimos llegar a tiempo. Contamos con una tolerancia de{' '}
            {P.minutosToleranciaCita} minutos. Después de ese tiempo, podemos reprogramar tu cita para no
            afectar a las siguientes clientas.
          </li>
          <li>
            <strong>Cancelar o reagendar:</strong> avísanos lo antes posible. Con aviso previo, puedes reagendar
            sin costo y tu anticipo se respeta para la nueva fecha.
          </li>
          <li>
            Si no llegas y no avisas, el anticipo no es reembolsable y podríamos limitar tus citas en línea. En
            ese caso podrás atenderte por turno en el salón.
          </li>
          <li>
            Si nosotras tenemos que cancelar tu cita, te ofreceremos una nueva fecha o la devolución íntegra de
            tu anticipo.
          </li>
        </ol>
      </Seccion>

      <Seccion n={7}>
        <ol>
          <li>
            Antes de un tratamiento químico (alaciados, nanoplastia, keratina, botox capilar y similares)
            hacemos una valoración de tu cabello.
          </li>
          <li>
            Es tu responsabilidad informarnos de alergias, sensibilidad, embarazo, condiciones del cuero
            cabelludo y tratamientos o tintes previos. Si la información es incompleta, el resultado puede verse
            afectado.
          </li>
          <li>
            Si después de la valoración un tratamiento no es seguro para tu cabello, podemos recomendarte otro o
            no realizarlo.
          </li>
          <li>
            El resultado y la duración dependen del tipo de cabello y de seguir las indicaciones de cuidado y los
            productos recomendados.
          </li>
        </ol>
      </Seccion>

      <Seccion n={8}>
        <p>
          Queremos que salgas feliz. Si un servicio no te dejó satisfecha, contáctanos dentro de los{' '}
          {P.diasGarantiaServicio} días siguientes. Revisaremos el caso contigo y, cuando corresponda, haremos un
          ajuste o corrección sin costo. La garantía aplica cuando se siguieron las indicaciones de cuidado
          posterior que te dimos.
        </p>
      </Seccion>

      <Seccion n={9}>
        <p>
          Podemos tomar fotos o videos de tu resultado para compartirlos en nuestra galería y redes sociales,
          solo con tu autorización. Puedes negarte o pedir que retiremos una publicación en cualquier momento.
        </p>
      </Seccion>

      <Seccion n={10}>
        <p>
          Si necesitas factura, solicítala con tus datos fiscales (RFC, razón social, régimen fiscal, código
          postal y uso de CFDI) dentro del mismo mes de tu compra o servicio.
        </p>
      </Seccion>

      <Seccion n={11}>
        <p>
          Tratamos tus datos personales de acuerdo con nuestro{' '}
          <Link href="/aviso-de-privacidad">Aviso de Privacidad</Link>. Solo los usamos para
          gestionar tu cuenta, tus pedidos y tus citas, y para comunicarnos contigo.
        </p>
      </Seccion>

      <Seccion n={12}>
        <p>
          El logotipo, nombre comercial, fotografías y contenidos de este sitio pertenecen a Mirú Franco Salón
          Beauty o a sus respectivos dueños. Las marcas de los productos que vendemos pertenecen a sus
          fabricantes. No está permitido copiarlos ni usarlos sin autorización.
        </p>
      </Seccion>

      <Seccion n={13}>
        <p>
          Podemos actualizar estos términos. La versión vigente siempre estará publicada en esta página con su
          fecha de actualización. Los pedidos y citas confirmados se rigen por los términos vigentes al momento
          de confirmarlos.
        </p>
      </Seccion>

      <Seccion n={14}>
        <p>
          Si tienes una queja, escríbenos primero. Queremos resolverla contigo. Estos términos se rigen por las
          leyes de los Estados Unidos Mexicanos. Para cualquier controversia, las partes se someten a la
          Procuraduría Federal del Consumidor (Profeco) en la vía administrativa y a los tribunales competentes
          de Huejutla de Reyes, Hidalgo.
        </p>
      </Seccion>
    </DocumentoLegal>
  );
}
