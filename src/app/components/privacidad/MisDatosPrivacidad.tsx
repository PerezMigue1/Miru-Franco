'use client';

import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import { BellOff, FileDown, FileJson, History, Inbox, PencilLine, ShieldOff, UserX, type LucideIcon } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import Table, { TableCell, TableRow } from '../ui/Table';
import Textarea from '../ui/Textarea';
import CasillaDocumento, { EnlaceDocumento } from '../legal/CasillaDocumento';
import AvisoSimplificado from '../legal/AvisoSimplificado';
import { showConfirm, showToast } from '../../utils/toast';
import { mensajeDeError } from '../../utils/errorRed';
import { fechaCortaEnMexico } from '../../utils/fechaSoloDia';
import { documentoLegal } from '../../utils/documentosLegales';
import {
  misConsentimientos,
  registrarConsentimientos,
  type ConsentimientoRegistrado,
  type TipoConsentimiento,
} from '../../services/consentimientos';
import {
  archivoMisDatos,
  crearSolicitudArco,
  misSolicitudesArco,
  obtenerMisDatos,
  oponerseAPromociones,
  type SolicitudArco,
} from '../../services/arco';
import {
  documentoYVersion,
  ETIQUETA_ESTADO_ARCO,
  ETIQUETA_TIPO_ARCO,
  etiquetaAccion,
  etiquetaConsentimiento,
  fechaHoraMexico,
  estadoRevocable,
  puedeRevocar,
  textoSinRegistro,
  ultimoPorTipo,
  varianteEstadoArco,
} from './textosPrivacidad';
import {
  CONSENTIMIENTOS_REVOCABLES,
  estadoInicialModal,
  MENSAJE_CASILLA_CANCELACION,
  QUE_PASA_AL_CANCELAR,
  revocarConsentimiento,
  solicitudAbiertaDe,
  textoPlazoSolicitud,
  validarSolicitud,
} from './accionesPrivacidad';
import { guardarArchivo } from './descargas';

type TipoSolicitud = 'rectificacion' | 'cancelacion';

const AVISO = documentoLegal('aviso-privacidad');

function Bloque({ id, icono: Icono, titulo, children }: { id: string; icono: LucideIcon; titulo: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className="mb-3 flex items-center gap-2 text-lg font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
        <Icono size={20} aria-hidden style={{ color: 'var(--oro-texto)' }} />
        {titulo}
      </h3>
      <Card padding="md">{children}</Card>
    </section>
  );
}

function Parrafo({ children }: { children: ReactNode }) {
  return (
    <p className="max-w-[65ch] text-sm leading-relaxed" style={{ color: 'var(--texto-cuerpo)' }}>
      {children}
    </p>
  );
}

function ErrorEnLinea({ mensaje, onReintentar }: { mensaje: string; onReintentar?: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between" style={{ color: 'var(--danger-texto)' }}>
      <span className="font-semibold">{mensaje}</span>
      {onReintentar && (
        <Button variant="outline" onClick={onReintentar}>
          Reintentar
        </Button>
      )}
    </div>
  );
}

function Esqueleto() {
  return (
    <div role="status">
      <span className="sr-only">Cargando…</span>
      <div className="space-y-3" aria-hidden>
        <div className="mf-skeleton h-5 w-2/3" />
        <div className="mf-skeleton h-5 w-1/2" />
      </div>
    </div>
  );
}

/** "Mis datos y privacidad": derechos ARCO y consentimientos de la persona con sesión (cualquier rol). */
export default function MisDatosPrivacidad({ onEditarPerfil }: { onEditarPerfil: () => void }) {
  const idCasilla = useId();
  const [consentimientos, setConsentimientos] = useState<ConsentimientoRegistrado[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudArco[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorConsentimientos, setErrorConsentimientos] = useState<string | null>(null);
  const [errorSolicitudes, setErrorSolicitudes] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  const [descargando, setDescargando] = useState<'json' | 'pdf' | null>(null);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);
  const [oponiendo, setOponiendo] = useState(false);
  const [revocando, setRevocando] = useState<TipoConsentimiento | null>(null);

  const [modal, setModal] = useState<TipoSolicitud | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [entendido, setEntendido] = useState(false);
  const [errorDescripcion, setErrorDescripcion] = useState<string | null>(null);
  const [errorCasilla, setErrorCasilla] = useState<string | null>(null);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vigente = true;
    Promise.allSettled([misConsentimientos(), misSolicitudesArco()]).then(([c, s]) => {
      if (!vigente) return;
      if (c.status === 'fulfilled') {
        setConsentimientos(c.value);
        setErrorConsentimientos(null);
      } else {
        setErrorConsentimientos(mensajeDeError(c.reason, 'No pudimos cargar tus consentimientos.'));
      }
      if (s.status === 'fulfilled') {
        setSolicitudes(s.value);
        setErrorSolicitudes(null);
      } else {
        setErrorSolicitudes(mensajeDeError(s.reason, 'No pudimos cargar tus solicitudes.'));
      }
      setCargando(false);
    });
    return () => {
      vigente = false;
    };
  }, [intento]);

  const recargar = useCallback(() => {
    setCargando(true);
    setIntento((n) => n + 1);
  }, []);

  const ultimos = ultimoPorTipo(consentimientos);
  const cancelacionAbierta = solicitudAbiertaDe(solicitudes, 'cancelacion');

  const descargarJson = async () => {
    setDescargando('json');
    setErrorDescarga(null);
    try {
      const datos = await obtenerMisDatos();
      const archivo = archivoMisDatos(datos);
      guardarArchivo(new Blob([archivo.contenido], { type: archivo.tipo }), archivo.nombre);
      showToast('Descargamos tus datos en JSON.', 'success');
    } catch (e) {
      setErrorDescarga(mensajeDeError(e, 'No pudimos descargar tus datos. Intenta de nuevo.'));
    } finally {
      setDescargando(null);
    }
  };

  const descargarPdf = async () => {
    setDescargando('pdf');
    setErrorDescarga(null);
    try {
      const [datos, { crearPdfMisDatos, nombrePdfMisDatos }] = await Promise.all([obtenerMisDatos(), import('./pdfMisDatos')]);
      crearPdfMisDatos(datos).save(nombrePdfMisDatos(datos));
      showToast('Descargamos tus datos en PDF.', 'success');
    } catch (e) {
      setErrorDescarga(mensajeDeError(e, 'No pudimos generar el PDF. Intenta de nuevo.'));
    } finally {
      setDescargando(null);
    }
  };

  const oponerse = async () => {
    setOponiendo(true);
    try {
      const solicitud = await oponerseAPromociones();
      showToast(solicitud?.respuesta || 'Listo: ya no recibirás promociones.', 'success');
      recargar();
    } catch (e) {
      showToast(mensajeDeError(e, 'No pudimos registrar tu oposición. Intenta de nuevo.'), 'error');
    } finally {
      setOponiendo(false);
    }
  };

  const revocar = async (tipo: TipoConsentimiento) => {
    setRevocando(tipo);
    try {
      const resultado = await revocarConsentimiento(tipo, { confirmar: showConfirm, registrar: registrarConsentimientos });
      if (resultado === 'revocado') {
        showToast(`Revocaste: ${etiquetaConsentimiento(tipo)}.`, 'success');
        recargar();
      }
    } catch (e) {
      showToast(mensajeDeError(e, 'No pudimos revocar el consentimiento. Intenta de nuevo.'), 'error');
    } finally {
      setRevocando(null);
    }
  };

  const abrirSolicitud = (tipo: TipoSolicitud) => {
    const inicial = estadoInicialModal(tipo);
    setModal(inicial.modal);
    setDescripcion(inicial.descripcion);
    setEntendido(inicial.entendido);
    setErrorDescripcion(inicial.errorDescripcion);
    setErrorCasilla(inicial.errorCasilla);
    setErrorEnvio(inicial.errorEnvio);
  };

  const cerrarSolicitud = () => {
    if (!enviando) setModal(null);
  };

  const enviarSolicitud = async () => {
    if (!modal) return;
    const invalida = validarSolicitud(modal, { descripcion, entendido });
    setErrorCasilla(invalida === MENSAJE_CASILLA_CANCELACION ? invalida : null);
    setErrorDescripcion(invalida && invalida !== MENSAJE_CASILLA_CANCELACION ? invalida : null);
    if (invalida) return;
    setEnviando(true);
    setErrorEnvio(null);
    try {
      const solicitud = await crearSolicitudArco({ tipo: modal, descripcion });
      const vence = fechaCortaEnMexico(solicitud?.venceRespuesta);
      showToast(
        `Recibimos tu solicitud ${solicitud?.folio ?? ''}.${vence ? ` Te responderemos a más tardar el ${vence}.` : ''}`,
        'success',
      );
      setModal(null);
      recargar();
    } catch (e) {
      setErrorEnvio(mensajeDeError(e, 'No pudimos enviar tu solicitud. Intenta de nuevo.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--menu-texto-principal)', fontFamily: 'var(--font-family-serif)' }}>
          Mis datos y privacidad
        </h2>
        <p className="mt-2 max-w-[65ch] text-sm leading-relaxed" style={{ color: 'var(--encabezados-alterno)' }}>
          Aquí ejerces tus derechos sobre tus datos personales: conocerlos, corregirlos, cancelarlos y oponerte a su uso.
          Te explicamos cómo los tratamos en el{' '}
          <a
            href={AVISO.ruta}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline underline-offset-4"
            style={{ color: 'var(--menu-texto-principal)' }}
          >
            Aviso de privacidad
            <span className="sr-only"> (se abre en otra pestaña)</span>
          </a>
          .
        </p>
      </div>

      <Bloque id="privacidad-descarga" icono={FileDown} titulo="Descarga tus datos">
        <Parrafo>
          Una copia de tus datos personales y de tu historial con el salón: perfil, direcciones, pedidos, pagos,
          devoluciones, citas, seguimientos de tus servicios, compras en el salón, facturas, tarjetas guardadas,
          cotizaciones, quejas, valoraciones, notas del personal, avisos que te enviamos, preferencias de avisos,
          consentimientos y solicitudes. El PDF es la versión para leer y oculta las referencias de pago completas. El
          JSON trae esos datos con las referencias de pago completas y, de tus tarjetas guardadas, solo la marca, la
          terminación y el vencimiento. Ninguno incluye contraseñas.
        </Parrafo>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={descargarPdf} disabled={descargando !== null}>
            <span className="inline-flex items-center gap-2">
              <FileDown size={18} aria-hidden />
              {descargando === 'pdf' ? 'Preparando PDF…' : 'Descargar en PDF'}
            </span>
          </Button>
          <Button variant="outline" onClick={descargarJson} disabled={descargando !== null}>
            <span className="inline-flex items-center gap-2">
              <FileJson size={18} aria-hidden />
              {descargando === 'json' ? 'Preparando JSON…' : 'Descargar en JSON'}
            </span>
          </Button>
        </div>
        {errorDescarga && (
          <div className="mt-3">
            <ErrorEnLinea mensaje={errorDescarga} />
          </div>
        )}
      </Bloque>

      <Bloque id="privacidad-corregir" icono={PencilLine} titulo="Corrige tus datos">
        <Parrafo>
          Tu nombre, teléfono, fecha de nacimiento y perfil capilar los puedes cambiar en tu información personal. Si hay
          un dato que no puedes cambiar desde ahí, pídenos una rectificación.
        </Parrafo>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button onClick={onEditarPerfil}>Editar mi información</Button>
          <Button variant="outline" onClick={() => abrirSolicitud('rectificacion')}>
            Solicitar rectificación
          </Button>
        </div>
      </Bloque>

      <Bloque id="privacidad-promociones" icono={BellOff} titulo="Recibir promociones">
        <Parrafo>
          Te enviamos ofertas, descuentos y novedades del salón. Si no quieres que usemos tus datos para eso, desactívalo:
          es tu derecho de oposición, se aplica al momento y no afecta tus citas ni tus pedidos.
        </Parrafo>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          {puedeRevocar(ultimos.promociones) ? (
            <Button variant="outline" onClick={oponerse} disabled={oponiendo || cargando} aria-describedby="privacidad-promociones">
              {oponiendo ? 'Aplicando…' : 'Desactivar'}
            </Button>
          ) : (
            <p className="text-sm font-semibold" style={{ color: 'var(--success-texto)' }}>
              Ya no recibes promociones desde el {fechaCortaEnMexico(ultimos.promociones?.creadoEn) ?? 'registro más reciente'}.
            </p>
          )}
        </div>
      </Bloque>

      <Bloque id="privacidad-revocar" icono={ShieldOff} titulo="Consentimientos que puedes revocar">
        {cargando ? (
          <Esqueleto />
        ) : errorConsentimientos ? (
          <ErrorEnLinea mensaje={errorConsentimientos} onReintentar={recargar} />
        ) : (
          <ul>
            {CONSENTIMIENTOS_REVOCABLES.map((c, i) => {
              const ultimo = ultimos[c.tipo];
              const estado = estadoRevocable(c.tipo, ultimo);
              return (
                <li
                  key={c.tipo}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  style={i > 0 ? { borderTop: '1px solid var(--mf-linea)' } : undefined}
                >
                  <div className="min-w-0">
                    <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                      {c.titulo}
                    </p>
                    <p className="max-w-[60ch] text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                      {c.descripcion}
                    </p>
                    <p className="mt-1 text-xs tabular-nums" style={{ color: 'var(--encabezados-alterno)' }}>
                      {ultimo
                        ? `${etiquetaAccion(ultimo.accion)} el ${fechaHoraMexico(ultimo.creadoEn)}`
                        : textoSinRegistro(c.tipo)}
                    </p>
                  </div>
                  {estado === 'revocable' ? (
                    <Button variant="outline" onClick={() => revocar(c.tipo)} disabled={revocando !== null} className="shrink-0">
                      {revocando === c.tipo ? 'Revocando…' : 'Revocar'}
                    </Button>
                  ) : estado === 'revocado' ? (
                    <Badge variant="warning" size="sm" className="self-start sm:self-auto">
                      Revocado
                    </Badge>
                  ) : (
                    <Badge variant="default" size="sm" className="self-start sm:self-auto">
                      Sin autorización
                    </Badge>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Bloque>

      <Bloque id="privacidad-solicitudes" icono={Inbox} titulo="Tus solicitudes ARCO">
        {cargando ? (
          <Esqueleto />
        ) : errorSolicitudes ? (
          <ErrorEnLinea mensaje={errorSolicitudes} onReintentar={recargar} />
        ) : solicitudes.length === 0 ? (
          <Parrafo>Aún no has hecho solicitudes. Cuando hagas una, aquí verás su folio, su estado y nuestra respuesta.</Parrafo>
        ) : (
          <ul>
            {solicitudes.map((s, i) => {
              const plazo = textoPlazoSolicitud(s);
              return (
                <li key={s.id} className="py-4 first:pt-0 last:pb-0" style={i > 0 ? { borderTop: '1px solid var(--mf-linea)' } : undefined}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-semibold tabular-nums" style={{ color: 'var(--menu-texto-principal)' }}>
                      {s.folio}
                    </span>
                    <Badge variant={varianteEstadoArco(s.estado)} size="sm">
                      {ETIQUETA_ESTADO_ARCO[s.estado] ?? s.estado}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm tabular-nums" style={{ color: 'var(--encabezados-alterno)' }}>
                    {ETIQUETA_TIPO_ARCO[s.tipo] ?? s.tipo} · Recibida el {fechaCortaEnMexico(s.creadaEn) ?? 'sin fecha'}
                    {plazo && ` · ${plazo}`}
                  </p>
                  {s.respuesta && (
                    <p
                      className="mt-2 max-w-[65ch] whitespace-pre-line rounded-[10px] px-3 py-2 text-sm"
                      style={{ backgroundColor: 'var(--fondos-suaves)', color: 'var(--menu-texto-principal)' }}
                    >
                      {s.respuesta}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Bloque>

      <Bloque id="privacidad-historial" icono={History} titulo="Historial de tus consentimientos">
        {cargando ? (
          <Esqueleto />
        ) : errorConsentimientos ? (
          <ErrorEnLinea mensaje={errorConsentimientos} onReintentar={recargar} />
        ) : consentimientos.length === 0 ? (
          <Parrafo>Todavía no hay consentimientos registrados en tu cuenta.</Parrafo>
        ) : (
          <>
            <p className="mb-3 text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
              Horas del centro de México. Cada cambio queda como una fila nueva.
            </p>
            <Table headers={['Fecha y hora', 'Consentimiento', 'Documento y versión', 'Estado']} headersLegibles>
              {consentimientos.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="tabular-nums">{fechaHoraMexico(f.creadoEn)}</TableCell>
                  <TableCell>{etiquetaConsentimiento(f.tipo)}</TableCell>
                  <TableCell>{documentoYVersion(f)}</TableCell>
                  <TableCell>
                    <Badge variant={f.accion === 'revocado' ? 'warning' : 'success'} size="sm">
                      {etiquetaAccion(f.accion)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          </>
        )}
      </Bloque>

      <Bloque id="privacidad-cancelar" icono={UserX} titulo="Cancelar tu cuenta">
        <Parrafo>
          Si cancelas tu cuenta, ya no podrás entrar a ella. {QUE_PASA_AL_CANCELAR} Te respondemos en un máximo de 20 días
          hábiles.
        </Parrafo>
        <div className="mt-4">
          {cancelacionAbierta ? (
            <p className="text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
              Ya enviaste tu solicitud {cancelacionAbierta.folio}. Te responderemos a más tardar el{' '}
              {fechaCortaEnMexico(cancelacionAbierta.venceRespuesta) ?? 'plazo legal'}.
            </p>
          ) : (
            <Button variant="danger" onClick={() => abrirSolicitud('cancelacion')} disabled={cargando}>
              Solicitar la cancelación
            </Button>
          )}
        </div>
      </Bloque>

      <Modal
        isOpen={modal !== null}
        onClose={cerrarSolicitud}
        title={modal === 'cancelacion' ? 'Solicitar la cancelación de tu cuenta' : 'Solicitar una rectificación'}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={cerrarSolicitud} disabled={enviando}>
              Volver
            </Button>
            <Button variant={modal === 'cancelacion' ? 'danger' : 'primary'} onClick={enviarSolicitud} disabled={enviando}>
              {enviando ? 'Enviando…' : modal === 'cancelacion' ? 'Enviar solicitud de cancelación' : 'Enviar solicitud'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {modal === 'cancelacion' ? (
            <Parrafo>
              Al atender tu solicitud desactivamos tu cuenta y ya no podrás entrar; no se puede deshacer.{' '}
              {QUE_PASA_AL_CANCELAR}
            </Parrafo>
          ) : (
            <Parrafo>Dinos qué dato está mal y cuál es el correcto. Te responderemos en un máximo de 20 días hábiles.</Parrafo>
          )}
          <Textarea
            label={modal === 'cancelacion' ? 'Motivo (opcional)' : '¿Qué dato está mal y cuál es el correcto?'}
            value={descripcion}
            onChange={(e) => {
              setDescripcion(e.target.value);
              if (errorDescripcion) setErrorDescripcion(null);
            }}
            rows={4}
            maxLength={2000}
            required={modal === 'rectificacion'}
            error={errorDescripcion ?? undefined}
            fullWidth
          />
          {modal === 'cancelacion' && (
            <CasillaDocumento
              id={idCasilla}
              checked={entendido}
              onChange={(e) => {
                setEntendido(e.target.checked);
                if (e.target.checked) setErrorCasilla(null);
              }}
              required
              error={errorCasilla}
            >
              Entiendo que mis datos personales se borrarán o anonimizarán, que ya no podré entrar a mi cuenta y que se
              conserva lo que la ley obliga a guardar, como explica el{' '}
              <EnlaceDocumento href={AVISO.ruta}>Aviso de privacidad</EnlaceDocumento>.
            </CasillaDocumento>
          )}
          {errorEnvio && <ErrorEnLinea mensaje={errorEnvio} />}
          <AvisoSimplificado
            finalidad={modal === 'cancelacion' ? 'atender tu solicitud de cancelación' : 'atender tu solicitud de rectificación'}
          />
        </div>
      </Modal>
    </div>
  );
}
