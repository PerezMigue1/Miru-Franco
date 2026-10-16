import type { ReactNode } from 'react';
import Link from 'next/link';
import DocumentoLegal, { SeccionDocumento } from '../components/legal/DocumentoLegal';
import DocumentoVigente from '../components/legal/DocumentoVigente';
import EncabezadoVersion from '../components/legal/EncabezadoVersion';
import { metadataPublica } from '../utils/seo';
import { documentoLegal } from '../utils/documentosLegales';

export const metadata = metadataPublica({
  title: 'Política de Cookies',
  description:
    'Política de Cookies de Mirú Franco Salón Beauty: qué cookies y preferencias guarda el sitio (solo las estrictamente necesarias), para qué sirven y cómo deshabilitarlas.',
  path: '/politica-de-cookies',
});

/** Secciones en el orden del texto: alimentan el índice y los títulos, así las anclas no se desfasan. */
const SECCIONES = [
  { id: 'que-son', titulo: 'Qué son las cookies' },
  { id: 'cookies-que-usamos', titulo: 'Cookies que usamos' },
  { id: 'preferencias-en-tu-navegador', titulo: 'Datos que guardamos en tu navegador' },
  { id: 'lo-que-no-usamos', titulo: 'Lo que no usamos' },
  { id: 'servicios-de-terceros', titulo: 'Servicios de terceros' },
  { id: 'como-deshabilitarlas', titulo: 'Cómo deshabilitarlas' },
  { id: 'cambios-a-esta-politica', titulo: 'Cambios a esta política' },
  { id: 'contacto', titulo: 'Contacto' },
] as const;

function Seccion({ n, children }: { n: number; children: ReactNode }) {
  return (
    <SeccionDocumento secciones={SECCIONES} n={n}>
      {children}
    </SeccionDocumento>
  );
}

/**
 * Una entrada del inventario: el nombre exacto de la clave (o claves), para qué sirve y cuánto dura.
 * La prueba paginasLegales.test.ts busca en el código cada clave que la web guarda en localStorage o
 * sessionStorage y exige que aparezca aquí: si agregas una clave, agrégala a esta lista y sube la versión.
 */
function Clave({ nombres, sirve, dura }: { nombres: readonly string[]; sirve: string; dura: string }) {
  return (
    <li>
      {nombres.map((n, i) => (
        <span key={n}>
          {i > 0 && (i === nombres.length - 1 ? ' y ' : ', ')}
          <code>{n}</code>
        </span>
      ))}
      . <strong>Para qué sirve:</strong> {sirve} <strong>Cuánto dura:</strong> {dura}
    </li>
  );
}

const CORREO = 'mildredfranco24@gmail.com';

export default function PoliticaDeCookiesPage() {
  const aviso = documentoLegal('aviso-privacidad');
  return (
    <DocumentoVigente slug="cookies">
    <DocumentoLegal
      titulo="Política de Cookies"
      secciones={SECCIONES}
      etiquetaIndice="Índice de la política de cookies"
    >
      <EncabezadoVersion slug="cookies" />
      <p className="mf-terminos__intro">
        En www.mirufranco.com usamos solo las cookies estrictamente necesarias para que el sitio funcione. Aquí te
        contamos cuáles son, qué otros datos guarda tu navegador, para qué sirven, cuánto duran y cómo puedes
        deshabilitarlos. Esta política complementa nuestro <Link href={aviso.ruta}>{aviso.titulo}</Link>.
      </p>

      <Seccion n={1}>
        <p>
          Las cookies son pequeños archivos que un sitio guarda en tu navegador para reconocerte entre una página y otra,
          por ejemplo, para que no tengas que iniciar sesión cada vez que cambias de pantalla.
        </p>
      </Seccion>

      <Seccion n={2}>
        <p>Hoy usamos dos cookies, propias y estrictamente necesarias:</p>
        <ul>
          <Clave
            nombres={['mf_session']}
            sirve="mantener tu sesión iniciada y proteger tu cuenta. Solo se crea cuando inicias sesión y no se puede leer desde otros sitios ni desde el código de la página."
            dura="como máximo 24 horas. Se borra al cerrar sesión."
          />
          <Clave
            nombres={['mf_registro_google']}
            sirve="proteger tu alta cuando te registras con Google: comprueba que terminas el registro en el mismo navegador donde entraste con Google, para que nadie pueda abrir tu cuenta desde otro equipo con un enlace. No se puede leer desde otros sitios ni desde el código de la página."
            dura="15 minutos como máximo. Se borra al terminar tu registro."
          />
        </ul>
        <p>Sin estas cookies no podrías entrar a tu cuenta, registrarte con Google, agendar citas ni comprar en la tienda en línea.</p>
      </Seccion>

      <Seccion n={3}>
        <p>
          Además, el sitio guarda algunos datos en tu navegador que no son cookies, pero funcionan de forma parecida. No
          se mandan solos a nuestro servidor como las cookies: solo los usa el propio sitio para funcionar como esperas.
          Esta es la lista completa.
        </p>

        <h3>En el almacenamiento local de tu navegador (localStorage)</h3>
        <p>Se quedan en tu navegador hasta que se borran, aunque cierres la pestaña.</p>
        <ul>
          <Clave
            nombres={['theme']}
            sirve="recordar si elegiste el modo claro u oscuro."
            dura="hasta que lo cambies o borres los datos del sitio."
          />
          <Clave
            nombres={['miru-cart']}
            sirve="guardar los productos de tu carrito mientras compras."
            dura="hasta que completes tu compra, vacíes el carrito o borres los datos del sitio."
          />
          <Clave
            nombres={['user']}
            sirve="mostrar tu nombre y tu foto en el menú y abrir las pantallas de tu cuenta. Solo guarda tu identificador, tu nombre, tu correo, tu rol, tu foto y tus permisos; nunca tu teléfono, tu fecha de nacimiento ni tus datos de salud."
            dura="hasta que cierres sesión o tu sesión venza."
          />
          <Clave
            nombres={['lastLoginTime']}
            sirve="anotar cuándo iniciaste sesión, para no confundir una respuesta del servidor justo al entrar con una sesión vencida."
            dura="hasta que cierres sesión o tu sesión venza."
          />
          <Clave
            nombres={['sessionRenovarAntesDe']}
            sirve="anotar hasta cuándo se puede renovar tu sesión, para renovarla a tiempo sin pedirte que vuelvas a entrar."
            dura="hasta que cierres sesión o tu sesión venza."
          />
          <Clave
            nombres={['manualLogout']}
            sirve="saber que cerraste sesión por tu cuenta, para no mostrarte el aviso de sesión vencida."
            dura="unos segundos. Se borra en cuanto termina de cerrarse tu sesión."
          />
          <Clave
            nombres={['mf-aviso-cookies']}
            sirve="recordar que ya viste el aviso de cookies y de qué versión de esta política."
            dura="hasta que borres los datos del sitio. Si publicamos una versión nueva de esta política, el aviso vuelve a aparecer."
          />
          <Clave
            nombres={['resetPasswordToken', 'resetPasswordEmail', 'resetPasswordExpires']}
            sirve="terminar el cambio de tu contraseña cuando la olvidaste. Guardan el código temporal, tu correo y la hora en que vence ese código."
            dura="el código vale 10 minutos. Se borran al cambiar tu contraseña o cuando el sitio detecta que ya vencieron."
          />
        </ul>

        <h3>En el almacenamiento de la pestaña (sessionStorage)</h3>
        <p>Se borran solos al cerrar la pestaña.</p>
        <ul>
          <Clave
            nombres={['miru:regreso-tras-login']}
            sirve="llevarte de vuelta a la página en la que estabas después de entrar con Google."
            dura="se borra al regresar de Google o al cerrar la pestaña."
          />
          <Clave
            nombres={['resetToken']}
            sirve="guardar el código temporal para cambiar tu contraseña en esta pestaña."
            dura="se borra al usarlo o al cerrar la pestaña."
          />
          <Clave
            nombres={['lastResetEmail']}
            sirve="guardar el correo con el que acabas de cambiar tu contraseña."
            dura="se borra al cerrar la pestaña."
          />
        </ul>

        <h3>Solo en el panel del personal del salón</h3>
        <p>Estos datos solo se guardan en el navegador del personal que usa el panel de administración.</p>
        <ul>
          <Clave
            nombres={['base-datos-historial-exportaciones', 'base-datos-historial-backups']}
            sirve="mostrar el historial de las últimas exportaciones y respaldos de la base de datos hechos desde ese navegador."
            dura="hasta que se borren los datos del sitio. Solo se guardan los más recientes."
          />
          <Clave
            nombres={[
              'backup-miru-auto-enabled',
              'backup-miru-auto-time',
              'backup-miru-auto-second',
              'backup-miru-auto-frequency',
              'backup-miru-auto-weekday',
              'backup-miru-auto-monthday',
              'backup-miru-auto-last-run-key',
            ]}
            sirve="recordar las preferencias del respaldo automático: si está activo, con qué frecuencia y a qué hora corre, y la última vez que corrió."
            dura="hasta que se cambien o se borren los datos del sitio."
          />
        </ul>
        <p>
          Si tu navegador todavía tiene datos de versiones anteriores del sitio (token, authToken, sessionRefreshedAt o
          base-datos-ultima-exportacion), el sitio los borra al leerlos.
        </p>
      </Seccion>

      <Seccion n={4}>
        <p>
          <strong>No usamos cookies de analítica ni de publicidad.</strong> No medimos tu navegación con herramientas de
          terceros ni te mostramos anuncios basados en lo que visitas.
        </p>
      </Seccion>

      <Seccion n={5}>
        <p>
          Si eliges pagar con Mercado Pago o entrar con tu cuenta de Google, pasas a sus sitios. Allí usan sus propias
          cookies, según sus propias políticas.
        </p>
      </Seccion>

      <Seccion n={6}>
        <p>
          Puedes borrar o bloquear las cookies y los datos guardados desde la configuración de tu navegador, normalmente
          en el apartado de privacidad o de datos de sitios (Chrome, Safari, Firefox y Edge lo permiten).
        </p>
        <p>
          Si las deshabilitas, el sitio seguirá mostrándose, pero no podrás iniciar sesión, tu carrito se vaciará y
          tendrás que volver a elegir el modo claro u oscuro.
        </p>
      </Seccion>

      <Seccion n={7}>
        <p>
          Si empezamos a usar otras cookies, por ejemplo de analítica, actualizaremos esta política con su nuevo número de
          versión y su fecha de vigencia y, cuando la ley lo pida, te pediremos tu consentimiento antes de usarlas.
        </p>
      </Seccion>

      <Seccion n={8}>
        <p>
          Si tienes dudas sobre esta política, escríbenos a <a href={`mailto:${CORREO}`}>{CORREO}</a>.
        </p>
      </Seccion>
    </DocumentoLegal>
    </DocumentoVigente>
  );
}
