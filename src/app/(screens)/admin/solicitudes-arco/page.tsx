'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Inbox, RefreshCw, UserX } from 'lucide-react';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Modal from '../../../components/ui/Modal';
import Select from '../../../components/ui/Select';
import Table, { TableCell } from '../../../components/ui/Table';
import Textarea from '../../../components/ui/Textarea';
import {
  ejecutarCancelacionArco,
  exigeRespuesta,
  listarSolicitudesArco,
  MAX_RESPUESTA_ARCO,
  responderSolicitudArco,
  type ConsentimientoRevocableArco,
  type EstadoArco,
  type EstadoArcoRespuesta,
  type SolicitudArcoAdmin,
} from '../../../services/arco';
import CasillaDocumento from '../../../components/legal/CasillaDocumento';
import { showConfirm, showToast } from '../../../utils/toast';
import { mensajeDeError } from '../../../utils/errorRed';
import {
  ETIQUETA_ESTADO_ARCO,
  ETIQUETA_TIPO_ARCO,
  fechaHoraMexico,
  varianteEstadoArco,
} from '../../../components/privacidad/textosPrivacidad';
import { useConfiguracionPublica } from '../../../hooks/useConfiguracionPublica';
import {
  avisoCorreoNoEnviado,
  confirmarYEjecutarCancelacion,
  ESTILO_URGENCIA,
  estadosPosibles,
  exigeElegirRevocacion,
  fechaLimite,
  insigniaDeUrgencia,
  OPCIONES_REVOCACION_ARCO,
  QUE_PASA_AL_CANCELAR_PANEL,
  urgenciaSolicitud,
  validarRespuesta,
  validarRevocacion,
  vencidasDeFiltro,
  type FiltroPlazo,
} from './solicitudesArco';

const OPCIONES_ESTADO = [
  { value: '', label: 'Todos los estados' },
  ...(Object.keys(ETIQUETA_ESTADO_ARCO) as EstadoArco[]).map((e) => ({ value: e, label: ETIQUETA_ESTADO_ARCO[e] })),
];

const OPCIONES_PLAZO = [
  { value: '', label: 'Todos los plazos' },
  { value: 'vencidas', label: 'Solo vencidas' },
  { value: 'sin_vencer', label: 'En plazo o cerradas' },
];

function DatoDetalle({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold" style={{ color: 'var(--encabezados-alterno)' }}>
        {etiqueta}
      </dt>
      <dd className="mt-0.5 break-words text-sm tabular-nums" style={{ color: 'var(--menu-texto-principal)' }}>
        {children}
      </dd>
    </div>
  );
}

export default function SolicitudesArcoPage() {
  const { reglas } = useConfiguracionPublica();
  const [filas, setFilas] = useState<SolicitudArcoAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [estado, setEstado] = useState<EstadoArco | ''>('');
  const [plazo, setPlazo] = useState<FiltroPlazo>('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  const [seleccionada, setSeleccionada] = useState<SolicitudArcoAdmin | null>(null);
  const [nuevoEstado, setNuevoEstado] = useState<EstadoArcoRespuesta | ''>('');
  const [respuesta, setRespuesta] = useState('');
  const [errorRespuesta, setErrorRespuesta] = useState<string | null>(null);
  const [revocar, setRevocar] = useState<ConsentimientoRevocableArco[]>([]);
  const [errorRevocar, setErrorRevocar] = useState<string | null>(null);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [anonimizando, setAnonimizando] = useState(false);
  // Aviso persistente (no se cierra solo) cuando el correo a la titular no salió.
  const [avisoCorreo, setAvisoCorreo] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    listarSolicitudesArco({
      estado: estado || undefined,
      vencidas: vencidasDeFiltro(plazo),
      page: pagina,
    })
      .then((res) => {
        if (!vigente) return;
        setFilas(res.filas);
        setTotal(res.total);
        setTotalPaginas(res.totalPages);
        setError(null);
      })
      .catch((e) => {
        if (vigente) setError(mensajeDeError(e, 'No se pudieron cargar las solicitudes. Intenta de nuevo.'));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [estado, plazo, pagina, intento]);

  const recargar = useCallback(() => {
    setCargando(true);
    setIntento((n) => n + 1);
  }, []);

  const abrir = (s: SolicitudArcoAdmin) => {
    setSeleccionada(s);
    setNuevoEstado(estadosPosibles(s)[0] ?? '');
    setRespuesta(s.respuesta ?? '');
    setErrorRespuesta(null);
    setRevocar([]);
    setErrorRevocar(null);
    setErrorDetalle(null);
  };

  const cerrar = () => {
    if (guardando || anonimizando) return;
    setSeleccionada(null);
  };

  const guardar = async () => {
    if (!seleccionada || !nuevoEstado) return;
    const invalida = validarRespuesta(nuevoEstado, respuesta);
    setErrorRespuesta(invalida);
    const faltaRevocar = validarRevocacion(seleccionada.tipo, nuevoEstado, revocar);
    setErrorRevocar(faltaRevocar);
    if (invalida || faltaRevocar) return;
    setGuardando(true);
    setErrorDetalle(null);
    try {
      const guardada = await responderSolicitudArco(seleccionada.id, {
        estado: nuevoEstado,
        respuesta,
        revocar: exigeElegirRevocacion(seleccionada.tipo, nuevoEstado) ? revocar : undefined,
      });
      const avisoRespuesta = avisoCorreoNoEnviado(guardada.correoEnviado, 'respuesta');
      // Solo se reemplaza con otro aviso: un éxito posterior no borra el de una titular que sigue sin enterarse.
      if (avisoRespuesta) setAvisoCorreo(`Solicitud ${seleccionada.folio}. ${avisoRespuesta}`);
      showToast(`Solicitud ${seleccionada.folio} actualizada: ${ETIQUETA_ESTADO_ARCO[nuevoEstado]}.`, 'success');
      setSeleccionada(null);
      recargar();
    } catch (e) {
      setErrorDetalle(mensajeDeError(e, 'No se pudo guardar la respuesta. Intenta de nuevo.'));
    } finally {
      setGuardando(false);
    }
  };

  const anonimizar = async () => {
    if (!seleccionada) return;
    setAnonimizando(true);
    setErrorDetalle(null);
    try {
      const resultado = await confirmarYEjecutarCancelacion(seleccionada, { confirmar: showConfirm, ejecutar: ejecutarCancelacionArco });
      if (resultado.ejecutada) {
        const avisoCancelacion = avisoCorreoNoEnviado(resultado.resultado.correoEnviado, 'cancelacion');
        if (avisoCancelacion) setAvisoCorreo(`Solicitud ${seleccionada.folio}. ${avisoCancelacion}`);
        showToast(`Cuenta anonimizada. La solicitud ${seleccionada.folio} quedó atendida.`, 'success');
        setSeleccionada(null);
        recargar();
      }
    } catch (e) {
      setErrorDetalle(mensajeDeError(e, 'No se pudo ejecutar la cancelación. Intenta de nuevo.'));
    } finally {
      setAnonimizando(false);
    }
  };

  const cambiarFiltro = (accion: () => void) => {
    accion();
    setPagina(1);
    setCargando(true);
  };

  const opcionesNuevoEstado = seleccionada
    ? estadosPosibles(seleccionada).map((e) => ({ value: e, label: ETIQUETA_ESTADO_ARCO[e] }))
    : [];
  const cerrada = seleccionada ? estadosPosibles(seleccionada).length === 0 : false;
  const respuestaObligatoria = nuevoEstado ? exigeRespuesta(nuevoEstado) : false;

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-6">
        <div>
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
            Solicitudes ARCO
          </h1>
          <p className="mt-1 max-w-[65ch] text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            Acceso, rectificación, cancelación, oposición y revocación. Respuesta en 20 días hábiles desde que se
            recibe y efectividad en 15 días hábiles desde la respuesta.
          </p>
        </div>

        <Card padding="md">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(2,minmax(0,16rem))_1fr] lg:items-end">
            <Select
              label="Estado"
              value={estado}
              options={OPCIONES_ESTADO}
              onChange={(e) => cambiarFiltro(() => setEstado(e.target.value as EstadoArco | ''))}
              fullWidth
            />
            <Select
              label="Plazo"
              value={plazo}
              options={OPCIONES_PLAZO}
              onChange={(e) => cambiarFiltro(() => setPlazo(e.target.value as FiltroPlazo))}
              fullWidth
            />
            <div className="flex items-center gap-3 lg:justify-end">
              <p className="text-sm tabular-nums" style={{ color: 'var(--encabezados-alterno)' }} aria-live="polite">
                {cargando ? 'Cargando…' : `${total} solicitud${total === 1 ? '' : 'es'}`}
              </p>
              <Button variant="outline" size="md" onClick={recargar} disabled={cargando}>
                <span className="inline-flex items-center gap-2">
                  <RefreshCw size={16} aria-hidden />
                  Actualizar
                </span>
              </Button>
            </div>
          </div>
        </Card>

        {avisoCorreo && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-[10px] border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--warning) 12%, var(--fondo-general))',
              borderColor: 'var(--warning)',
              color: 'var(--warning-texto)',
            }}
          >
            <span className="font-semibold">{avisoCorreo}</span>
            <Button variant="outline" size="md" onClick={() => setAvisoCorreo(null)}>
              Entendido
            </Button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-[10px] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
            style={{ backgroundColor: 'color-mix(in srgb, var(--danger) 10%, var(--fondo-general))', color: 'var(--danger-texto)' }}
          >
            <span className="font-semibold">{error}</span>
            <Button variant="outline" onClick={recargar}>
              Reintentar
            </Button>
          </div>
        )}

        <Card padding="sm" className="!p-0 overflow-hidden">
          {cargando && filas.length === 0 ? (
            <div className="space-y-3 p-5" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="mf-skeleton h-10 w-full" />
              ))}
            </div>
          ) : filas.length === 0 && !error ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <Inbox size={36} aria-hidden style={{ color: 'var(--logo-branding)' }} />
              <p className="mt-3 font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                No hay solicitudes con estos filtros
              </p>
              <p className="mt-1 max-w-sm text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                Cuando una clienta ejerza un derecho desde su perfil, la verás aquí con su plazo de respuesta.
              </p>
            </div>
          ) : (
            <Table headers={['Folio', 'Persona', 'Tipo', 'Estado', 'Creada', 'Vence', <span key="acciones" className="sr-only">Acciones</span>]} headersLegibles>
              {filas.map((s) => {
                const urgencia = urgenciaSolicitud(s, new Date(), reglas.arco.diasAvisoVencePronto);
                const estilo = ESTILO_URGENCIA[urgencia];
                const insignia = insigniaDeUrgencia(urgencia);
                const limite = fechaLimite(s);
                return (
                  <tr key={s.id} data-clicable="true" onClick={() => abrir(s)} style={estilo.fondo ? { backgroundColor: estilo.fondo } : undefined}>
                    <TableCell className="font-semibold tabular-nums">{s.folio}</TableCell>
                    <TableCell>
                      <span className="block font-medium">{s.usuario?.nombre ?? 'Sin nombre'}</span>
                      <span className="block text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                        {s.usuario?.email ?? ''}
                      </span>
                    </TableCell>
                    <TableCell>{ETIQUETA_TIPO_ARCO[s.tipo] ?? s.tipo}</TableCell>
                    <TableCell>
                      <Badge variant={varianteEstadoArco(s.estado)} size="sm">
                        {ETIQUETA_ESTADO_ARCO[s.estado] ?? s.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{fechaHoraMexico(s.creadaEn)}</TableCell>
                    <TableCell className="tabular-nums">
                      <span className="flex flex-wrap items-center gap-2">
                        {limite ? fechaHoraMexico(limite) : 'Sin plazo'}
                        {insignia && (
                          <Badge variant={insignia.variante} size="sm">
                            {insignia.etiqueta}
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-11"
                        onClick={(e) => {
                          e.stopPropagation();
                          abrir(s);
                        }}
                        aria-label={`Ver detalle de ${s.folio}`}
                      >
                        Ver detalle
                      </Button>
                    </TableCell>
                  </tr>
                );
              })}
            </Table>
          )}
        </Card>

        {totalPaginas > 1 && (
          <nav aria-label="Páginas de solicitudes" className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="outline"
              disabled={pagina <= 1 || cargando}
              onClick={() => {
                setCargando(true);
                setPagina((p) => Math.max(1, p - 1));
              }}
            >
              <span className="inline-flex items-center gap-1">
                <ChevronLeft size={16} aria-hidden />
                Anterior
              </span>
            </Button>
            <p className="text-sm tabular-nums" style={{ color: 'var(--encabezados-alterno)' }}>
              Página {pagina} de {totalPaginas}
            </p>
            <Button
              variant="outline"
              disabled={pagina >= totalPaginas || cargando}
              onClick={() => {
                setCargando(true);
                setPagina((p) => p + 1);
              }}
            >
              <span className="inline-flex items-center gap-1">
                Siguiente
                <ChevronRight size={16} aria-hidden />
              </span>
            </Button>
          </nav>
        )}
      </div>

      <Modal
        isOpen={!!seleccionada}
        onClose={cerrar}
        title={seleccionada ? `Solicitud ${seleccionada.folio}` : undefined}
        size="lg"
        footer={
          seleccionada && !cerrada ? (
            <>
              <Button variant="outline" onClick={cerrar} disabled={guardando || anonimizando}>
                Cerrar
              </Button>
              <Button onClick={guardar} disabled={guardando || anonimizando || !nuevoEstado}>
                {guardando ? 'Guardando…' : 'Guardar'}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={cerrar}>
              Cerrar
            </Button>
          )
        }
      >
        {seleccionada && (
          <div className="space-y-5">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DatoDetalle etiqueta="Persona">
                {seleccionada.usuario?.nombre ?? 'Sin nombre'}
                <span className="block text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                  {[seleccionada.usuario?.email, seleccionada.usuario?.telefono].filter(Boolean).join(' · ')}
                </span>
              </DatoDetalle>
              <DatoDetalle etiqueta="Tipo y estado">
                <span className="flex flex-wrap items-center gap-2">
                  {ETIQUETA_TIPO_ARCO[seleccionada.tipo]}
                  <Badge variant={varianteEstadoArco(seleccionada.estado)} size="sm">
                    {ETIQUETA_ESTADO_ARCO[seleccionada.estado]}
                  </Badge>
                </span>
              </DatoDetalle>
              <DatoDetalle etiqueta="Fecha de recepción">{fechaHoraMexico(seleccionada.creadaEn)}</DatoDetalle>
              <DatoDetalle etiqueta="Vence la respuesta">{fechaHoraMexico(seleccionada.venceRespuesta)}</DatoDetalle>
              {seleccionada.venceEfectividad && (
                <DatoDetalle etiqueta="Vence la efectividad">{fechaHoraMexico(seleccionada.venceEfectividad)}</DatoDetalle>
              )}
              {seleccionada.atendidaEn && (
                <DatoDetalle etiqueta="Atendida">
                  {fechaHoraMexico(seleccionada.atendidaEn)}
                  {seleccionada.atendidaPor ? ` por ${seleccionada.atendidaPor.nombre}` : ''}
                </DatoDetalle>
              )}
            </dl>

            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                Lo que pide la titular
              </h3>
              <p className="mt-1 whitespace-pre-line text-sm" style={{ color: 'var(--texto-cuerpo)' }}>
                {seleccionada.descripcion || 'Sin descripción.'}
              </p>
            </div>

            {cerrada ? (
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                  Respuesta enviada
                </h3>
                <p className="mt-1 whitespace-pre-line text-sm" style={{ color: 'var(--texto-cuerpo)' }}>
                  {seleccionada.respuesta || 'Sin respuesta registrada.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <Select
                  label="Nuevo estado"
                  value={nuevoEstado}
                  options={opcionesNuevoEstado}
                  onChange={(e) => {
                    setNuevoEstado(e.target.value as EstadoArcoRespuesta);
                    setErrorRespuesta(null);
                    setErrorRevocar(null);
                  }}
                  fullWidth
                />
                <Textarea
                  label={respuestaObligatoria ? 'Respuesta para la titular (obligatoria)' : 'Respuesta para la titular'}
                  value={respuesta}
                  onChange={(e) => {
                    setRespuesta(e.target.value);
                    if (errorRespuesta) setErrorRespuesta(null);
                  }}
                  rows={5}
                  maxLength={MAX_RESPUESTA_ARCO}
                  required={respuestaObligatoria}
                  error={errorRespuesta ?? undefined}
                  helperText={`La titular la verá en su perfil. ${respuesta.length} de ${MAX_RESPUESTA_ARCO} caracteres.`}
                  fullWidth
                />
              </div>
            )}

            {seleccionada.tipo === 'revocacion' && !cerrada && (
              <fieldset className="space-y-1" aria-describedby={errorRevocar ? 'revocar-error' : undefined}>
                <legend className="text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                  Qué consentimientos se revocan
                </legend>
                <p className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                  Marca lo que pidió la titular. Es obligatorio para marcarla atendida.
                </p>
                {OPCIONES_REVOCACION_ARCO.map((o) => (
                  <CasillaDocumento
                    key={o.valor}
                    id={`revocar-${o.valor}`}
                    checked={revocar.includes(o.valor)}
                    onChange={(e) => {
                      const marcada = e.target.checked;
                      setRevocar((actual) => (marcada ? [...actual, o.valor] : actual.filter((v) => v !== o.valor)));
                      if (marcada) setErrorRevocar(null);
                    }}
                  >
                    {o.etiqueta}
                  </CasillaDocumento>
                ))}
                {errorRevocar && (
                  <p id="revocar-error" role="alert" className="text-sm font-semibold" style={{ color: 'var(--danger-texto)' }}>
                    {errorRevocar}
                  </p>
                )}
              </fieldset>
            )}

            {seleccionada.tipo === 'cancelacion' && !cerrada && (
              <div
                className="space-y-3 rounded-[10px] p-4"
                style={{ backgroundColor: 'color-mix(in srgb, var(--danger) 8%, var(--superficie-modal))' }}
              >
                <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--danger-texto)' }}>
                  <UserX size={18} aria-hidden />
                  Cancelación de la cuenta
                </h3>
                <p className="text-sm" style={{ color: 'var(--texto-cuerpo)' }}>
                  La cuenta queda inactiva y no se puede deshacer. {QUE_PASA_AL_CANCELAR_PANEL}
                </p>
                <p className="text-sm" style={{ color: 'var(--texto-cuerpo)' }}>
                  Solo se puede ejecutar en cuentas de clienta sin pedidos, citas ni devoluciones en curso. Si hay alguno,
                  el sistema lo indica aquí y no anonimiza nada.
                </p>
                <Button variant="danger" onClick={anonimizar} disabled={anonimizando || guardando}>
                  {anonimizando ? 'Anonimizando…' : 'Ejecutar cancelación (anonimizar)'}
                </Button>
              </div>
            )}

            {errorDetalle && (
              <p role="alert" className="text-sm font-semibold" style={{ color: 'var(--danger-texto)' }}>
                {errorDetalle}
              </p>
            )}
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
