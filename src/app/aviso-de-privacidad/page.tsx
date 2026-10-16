import type { ReactNode } from 'react';
import Link from 'next/link';
import DocumentoLegal, { SeccionDocumento } from '../components/legal/DocumentoLegal';
import DocumentoVigente from '../components/legal/DocumentoVigente';
import EncabezadoVersion from '../components/legal/EncabezadoVersion';
import { metadataPublica } from '../utils/seo';
import { documentoLegal } from '../utils/documentosLegales';

export const metadata = metadataPublica({
  title: 'Aviso de Privacidad',
  description:
    'Aviso de Privacidad Integral de Mirú Franco Salón Beauty: qué datos personales recabamos, datos sensibles, para qué los usamos, con quién los compartimos y cómo ejercer tus derechos ARCO.',
  path: '/aviso-de-privacidad',
});

/** Secciones en el orden del texto: alimentan el índice y los títulos, así las anclas no se desfasan. */
const SECCIONES = [
  { id: 'responsable', titulo: 'Responsable de tus datos' },
  { id: 'datos-que-recabamos', titulo: 'Datos personales que recabamos' },
  { id: 'datos-sensibles', titulo: 'Datos personales sensibles' },
  { id: 'finalidades', titulo: 'Para qué usamos tus datos' },
  { id: 'con-quien-compartimos', titulo: 'Con quién compartimos tus datos' },
  { id: 'derechos-arco', titulo: 'Tus derechos ARCO' },
  { id: 'conservacion', titulo: 'Cuánto tiempo guardamos tus datos' },
  { id: 'cookies', titulo: 'Cookies' },
  { id: 'seguridad', titulo: 'Seguridad' },
  { id: 'cambios-a-este-aviso', titulo: 'Cambios a este aviso' },
  { id: 'autoridad', titulo: 'Autoridad' },
] as const;

function Seccion({ n, children }: { n: number; children: ReactNode }) {
  return (
    <SeccionDocumento secciones={SECCIONES} n={n}>
      {children}
    </SeccionDocumento>
  );
}

const CORREO = 'mildredfranco24@gmail.com';

export default function AvisoDePrivacidadPage() {
  return (
    <DocumentoVigente slug="aviso-privacidad">
    <DocumentoLegal
      titulo="Aviso de Privacidad Integral"
      secciones={SECCIONES}
      etiquetaIndice="Índice del aviso de privacidad"
    >
      <EncabezadoVersion slug="aviso-privacidad" />
      <Seccion n={1}>
        <p>
          <strong>Mildred Rubí Franco Martínez</strong>, con nombre comercial <strong>Mirú Franco Salón Beauty</strong>,
          con domicilio en Segunda Cerrada de Allende No. 15, Col. Juárez, Huejutla de Reyes, Hidalgo, C.P. 43000, es
          responsable del tratamiento de tus datos personales, de acuerdo con la Ley Federal de Protección de Datos
          Personales en Posesión de los Particulares, publicada en el Diario Oficial de la Federación el 20 de marzo de
          2025.
        </p>
        <p>
          <strong>Persona designada de datos personales:</strong> Mildred Rubí Franco Martínez. Ella atiende tus
          solicitudes sobre tus datos: derechos ARCO, revocación del consentimiento y limitación de su uso.
        </p>
        <p>
          Contacto para temas de privacidad: <strong><a href={`mailto:${CORREO}`}>{CORREO}</a></strong>, o por WhatsApp
          al <a href="tel:+527711867645">771 186 7645</a>.
        </p>
      </Seccion>

      <Seccion n={2}>
        <p>
          Los obtenemos cuando creas tu cuenta, agendas una cita, compras en la tienda en línea, nos escribes o acudes
          al salón.
        </p>
        <ul>
          <li>
            <strong>Identificación y contacto:</strong> nombre, correo electrónico, teléfono y foto de perfil. La fecha
            de nacimiento es opcional: solo la guardamos si nos la das. Si entras con Google, recibimos tu nombre, correo
            y foto de esa cuenta.
          </li>
          <li>
            <strong>Seguridad de tu cuenta:</strong> contraseña (guardada cifrada, nadie puede leerla), pregunta y
            respuesta de seguridad, y registros de inicio de sesión.
          </li>
          <li>
            <strong>Perfil capilar (opcional):</strong> tipo de cabello, color natural, color actual y productos que has
            usado. Solo lo guardamos si nos lo das.
          </li>
          <li>
            <strong>Historial con nosotras:</strong> citas, servicios realizados, pedidos, pagos, valoraciones, quejas
            y seguimientos posteriores al servicio.
          </li>
          <li>
            <strong>Facturación:</strong> RFC, razón social y demás datos fiscales, solo si pides factura.
          </li>
          <li>
            <strong>Preferencias:</strong> si deseas recibir promociones y por qué medio quieres recibir avisos.
          </li>
        </ul>
        <p>
          <strong>Datos de tu tarjeta:</strong> nunca recibimos ni guardamos el número completo ni el código de seguridad
          de tu tarjeta. Los pagos en línea los procesa directamente Mercado Pago. Si guardas una tarjeta para pagar más
          rápido, conservamos solo lo necesario para reconocerla (marca, banco, tipo, terminación y vencimiento) y la
          referencia que nos da Mercado Pago.
        </p>
      </Seccion>

      <Seccion n={3}>
        <p>
          Para cuidar tu salud y la seguridad de los tratamientos podemos pedirte información sobre{' '}
          <strong>alergias, sensibilidad en la piel o cuero cabelludo y embarazo</strong>. Estos datos son sensibles.
        </p>
        <p>
          Solo los tratamos con tu <strong>consentimiento expreso</strong>, como pide el artículo 8 de la ley, que nos
          das al marcar la casilla correspondiente cuando los registras. Los usamos únicamente para decidir si un
          tratamiento es seguro para ti. Puedes negarte a darlos, pero entonces no podremos realizar tratamientos
          químicos que requieran esa valoración. Puedes revocar este consentimiento cuando quieras, como se explica en
          la sección 6.
        </p>
      </Seccion>

      <Seccion n={4}>
        <h3>Finalidades necesarias para darte el servicio</h3>
        <p>
          Son indispensables para la relación que tienes con nosotras, por eso no requieren tu consentimiento. La
          excepción son tus datos de salud: solo los usamos con tu consentimiento expreso (sección 3).
        </p>
        <ol>
          <li>Crear y administrar tu cuenta y mantenerla segura.</li>
          <li>Agendar, confirmar, reprogramar y darle seguimiento a tus citas.</li>
          <li>Valorar tu cabello y elegir el tratamiento adecuado.</li>
          <li>
            Procesar tus pedidos, pagos, apartados, cambios y reembolsos, y avisarte cuando tu pedido esté listo para
            recoger.
          </li>
          <li>Emitir tus facturas cuando las pidas.</li>
          <li>Atender tus dudas, quejas y la garantía de nuestros servicios.</li>
          <li>Enviarte avisos sobre tus citas y pedidos.</li>
          <li>Cumplir obligaciones legales y fiscales.</li>
        </ol>

        <h3>Finalidades adicionales (requieren tu consentimiento y puedes negarte)</h3>
        <ol>
          <li>Enviarte promociones, novedades y descuentos.</li>
          <li>Mostrarte recomendaciones de productos y servicios según lo que has comprado o agendado.</li>
          <li>Pedirte tu opinión sobre nuestros servicios y productos.</li>
          <li>
            Publicar fotos o videos de tu resultado en nuestra galería y redes sociales, solo con tu autorización en
            cada caso.
          </li>
        </ol>
        <p>
          Para dejar de recibir promociones, desactiva «Recibir promociones» en «Mis datos y privacidad» de tu perfil.
          Para retirar tu autorización de fotos, revócala en esa misma sección. Para negarte a cualquier otra de estas
          finalidades, escríbenos al correo de privacidad. Negarte no afecta los servicios que nos pidas.
        </p>
        <p>
          Para limitar el uso o la divulgación de tus datos en general, escríbenos al correo de privacidad con tu
          solicitud. La atendemos en los mismos plazos de la sección 6.
        </p>
      </Seccion>

      <Seccion n={5}>
        <p>
          <strong>No vendemos ni rentamos tus datos.</strong>
        </p>
        <p>
          Para operar el sitio usamos proveedores que tratan tus datos solo por cuenta nuestra y bajo nuestras
          instrucciones:
        </p>
        <ul>
          <li>alojamiento del sitio y de la base de datos;</li>
          <li>almacenamiento de imágenes;</li>
          <li>envío de correos y notificaciones;</li>
          <li>procesamiento de pagos (Mercado Pago);</li>
          <li>inicio de sesión con Google, si lo eliges;</li>
          <li>nuestra contadora, para emitir facturas.</li>
        </ul>
        <p>
          Solo entregaremos tus datos a autoridades cuando una ley o una orden de autoridad competente lo exija. Para
          esto no necesitamos tu consentimiento.
        </p>
      </Seccion>

      <Seccion n={6}>
        <p>Tienes derecho a:</p>
        <ul>
          <li>
            <strong>Acceder</strong> a tus datos;
          </li>
          <li>
            <strong>Rectificarlos</strong> si son inexactos;
          </li>
          <li>
            <strong>Cancelarlos</strong> cuando ya no sean necesarios;
          </li>
          <li>
            <strong>Oponerte</strong> a su uso para fines específicos.
          </li>
        </ul>
        <p>
          También puedes <strong>revocar</strong> el consentimiento que nos diste, salvo cuando una obligación legal
          nos impida hacerlo.
        </p>
        <p>
          Puedes ejercerlos desde «Mis datos y privacidad» en tu perfil: ahí puedes descargar tus datos, pedir una
          rectificación o la cancelación de tu cuenta y revocar tus consentimientos.
        </p>
        <p>
          Si prefieres el correo, escribe a{' '}
          <strong>
            <a href={`mailto:${CORREO}`}>{CORREO}</a>
          </strong>{' '}
          con:
        </p>
        <ol>
          <li>tu nombre completo y el correo con el que tienes tu cuenta;</li>
          <li>una identificación oficial, o la de tu representante legal con el documento que lo acredite;</li>
          <li>una descripción clara del derecho que quieres ejercer y de los datos de que se trata;</li>
          <li>en caso de rectificación, el dato correcto y, si aplica, un documento que lo respalde.</li>
        </ol>
        <p>
          Te responderemos en un máximo de <strong>20 días</strong> (hábiles, conforme a la ley del procedimiento
          administrativo) desde que recibamos tu solicitud. Si tu solicitud procede, la haremos efectiva dentro de los{' '}
          <strong>15 días</strong> siguientes a nuestra respuesta, contados de la misma forma. Cada plazo puede
          ampliarse una sola vez por un periodo igual cuando el caso lo justifique; si eso pasa, te lo avisaremos.
        </p>
        <p>Ejercer tus derechos es gratuito.</p>
        <p>
          <strong>Para revocar tu consentimiento</strong>, hazlo en «Mis datos y privacidad» de tu perfil, donde se
          aplica de inmediato, o envía tu solicitud a <a href={`mailto:${CORREO}`}>{CORREO}</a> con los datos de la lista
          anterior. Por correo te responderemos en los mismos plazos.
        </p>
        <p>Algunos datos también los puedes corregir directamente desde tu perfil.</p>
      </Seccion>

      <Seccion n={7}>
        <ul>
          <li>Los datos de tu cuenta, mientras esté activa.</li>
          <li>Los datos de pagos y facturas, al menos 5 años (artículo 30 del Código Fiscal de la Federación).</li>
          <li>Tus datos sensibles se borran cuando lo pidas o cuando cierres tu cuenta.</li>
        </ul>
        <p>Después de esos plazos los eliminamos o los dejamos anónimos.</p>
        <p>
          <strong>Si cancelas tu cuenta</strong>, borramos o anonimizamos tus datos de identificación y contacto, tus
          datos de salud y de tu cabello, tus direcciones, tus tarjetas guardadas, las notas sobre ti en pedidos,
          cotizaciones, ventas y seguimientos, y tus sesiones y avisos; conservamos, ya sin tu nombre, lo que la ley nos
          obliga a guardar (pedidos, pagos, facturas y ventas, por 5 años) y el historial de tus citas, quejas y
          valoraciones, junto con la constancia de tus consentimientos y de tu solicitud.
        </p>
      </Seccion>

      <Seccion n={8}>
        <p>
          Usamos solo cookies estrictamente necesarias: la cookie de sesión mf_session, que mantiene tu sesión iniciada
          y protege tu cuenta, y datos guardados en tu navegador, como tu carrito o el modo claro u oscuro. No usamos
          cookies de analítica ni de publicidad. Sin ellas el sitio no funciona correctamente. Puedes borrarlas desde tu
          navegador, pero tendrás que volver a iniciar sesión.
        </p>
        <p>
          Conoce la lista completa, para qué sirve cada una, cuánto dura y cómo deshabilitarlas en nuestra{' '}
          <Link href={documentoLegal('cookies').ruta}>{documentoLegal('cookies').titulo}</Link>.
        </p>
      </Seccion>

      <Seccion n={9}>
        <p>Protegemos tus datos con:</p>
        <ul>
          <li>conexiones cifradas;</li>
          <li>contraseñas guardadas cifradas;</li>
          <li>acceso restringido para el personal según su función;</li>
          <li>registros de seguridad.</li>
        </ul>
        <p>Si ocurre una vulneración que afecte tus derechos de forma significativa, te lo informaremos.</p>
      </Seccion>

      <Seccion n={10}>
        <p>
          Si este aviso cambia, publicaremos la nueva versión en esta página con su número de versión y su fecha de
          vigencia. Si el
          cambio afecta las finalidades o requiere un nuevo consentimiento, te lo avisaremos por correo o al iniciar
          sesión.
        </p>
      </Seccion>

      <Seccion n={11}>
        <p>
          La autoridad en materia de protección de datos personales es la{' '}
          <strong>Secretaría Anticorrupción y Buen Gobierno</strong>. Si consideras que tu derecho a la protección de
          datos personales fue vulnerado, o no estás conforme con la respuesta que te dimos a una solicitud, puedes
          presentar ante ella una solicitud de protección de datos dentro de los 15 días siguientes a la fecha en que
          recibas nuestra respuesta (artículo 40 de la ley).
        </p>
      </Seccion>
    </DocumentoLegal>
    </DocumentoVigente>
  );
}
