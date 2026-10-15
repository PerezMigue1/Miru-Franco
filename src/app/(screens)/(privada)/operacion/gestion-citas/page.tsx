'use client';

import { useState, useEffect, useCallback } from 'react';
import { AccionesAnticipo, IndicadorAnticipo } from '../../../../components/operacion/AnticipoCita';
import { useAhora } from '../../../../hooks/useAhora';
import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import TarjetaKpi from '../../../../components/ui/TarjetaKpi';
import Table, { TableRow, TableCell } from '../../../../components/ui/Table';
import Badge from '../../../../components/ui/Badge';
import Modal from '../../../../components/ui/Modal';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Textarea from '../../../../components/ui/Textarea';
import { BrainCircuit, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import {
  listarCitas,
  crearCita,
  cancelarCita,
  checkInCita,
  checkOutCita,
  reprogramarCita,
  predecirRiesgosCancelacion,
  CitaApi,
  EstadoCita,
  RiesgoCancelacionApi,
  NivelRiesgoCancelacion,
} from '../../../../services/citas';
import BuscadorClienta from '../../../../components/operacion/BuscadorClienta';
import { listarEmpleados, EmpleadoApi } from '../../../../services/empleados';
import { usePermisos } from '../../../../utils/permisos';
import { getServicios, Servicio } from '../../../../services/servicios';
import { etiquetaEstadoCita, varianteEstadoCita } from '../../../../utils/estados';
import { PLAZOS_TERMINOS } from '../../../../utils/terminosCondiciones';
import { fechaYHora24EnMexico } from '../../../../utils/fechaSoloDia';
import { mensajeUsuarioDesdeErrorApi } from '../../../../utils/apiErrorMessage';
import { showToast } from '../../../../utils/toast';
import { accionesAnticipo } from '../../../../utils/anticipoCita';
import {
  COLUMNAS_TABLA_CITAS,
  TAMANO_PAGINA_CITAS,
  accionesCita,
  isoDesdeFechaHoraMexico,
  resumenCitasPagina,
  validarMotivoCancelacionCita,
} from '../_lib/panelOperacion';
import MenuMasAcciones from '../_lib/MenuMasAcciones';

/** Combina fecha (YYYY-MM-DD) + hora (HH:mm) de México en un ISO string. */
const combinar = isoDesdeFechaHoraMexico;

function fmtFecha(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('es-MX');
}
function fmtHora(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '-' : d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function varianteRiesgo(nivel: NivelRiesgoCancelacion): 'success' | 'warning' | 'danger' {
  if (nivel === 'alto') return 'danger';
  if (nivel === 'medio') return 'warning';
  return 'success';
}

function etiquetaRiesgo(nivel: NivelRiesgoCancelacion): string {
  return nivel.charAt(0).toUpperCase() + nivel.slice(1);
}

export default function GestionCitasPage() {
  const ahora = useAhora();
  const [citas, setCitas] = useState<CitaApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riesgos, setRiesgos] = useState<Record<number, RiesgoCancelacionApi>>({});
  const [loadingRiesgos, setLoadingRiesgos] = useState(false);
  const [errorRiesgos, setErrorRiesgos] = useState<string | null>(null);

  // Catálogos para selects (la clienta se busca con BuscadorClienta: el backend topa la lista en 100)
  const [especialistas, setEspecialistas] = useState<EmpleadoApi[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [errorServicios, setErrorServicios] = useState(false);
  const [errorEspecialistas, setErrorEspecialistas] = useState(false);

  // Filtro: ver citas de todos los especialistas o solo de uno
  const [filtroEspecialistaId, setFiltroEspecialistaId] = useState('');
  // Filtro por fecha de la cita (rango)
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');

  // Modal crear
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fCliente, setFCliente] = useState<{ id: string; nombre: string } | null>(null);
  const [fEspecialistaId, setFEspecialistaId] = useState('');
  const [fServicioId, setFServicioId] = useState('');
  const [fFecha, setFFecha] = useState('');
  const [fHoraInicio, setFHoraInicio] = useState('');
  const [fHoraFin, setFHoraFin] = useState('');
  const [fNotas, setFNotas] = useState('');
  /** El personal decide si esta cita pide el anticipo del servicio (desde /operacion no se pide solo). */
  const [fPedirAnticipo, setFPedirAnticipo] = useState(false);
  /** Dónde paga la clienta el anticipo pedido; en mostrador lo normal es el salón. */
  const [fPagoAnticipo, setFPagoAnticipo] = useState<'salon' | 'linea'>('salon');

  // Modal reprogramar
  const [isReprogOpen, setIsReprogOpen] = useState(false);
  const [reprogId, setReprogId] = useState<number | null>(null);
  const [rFecha, setRFecha] = useState('');
  const [rHoraInicio, setRHoraInicio] = useState('');
  const [rHoraFin, setRHoraFin] = useState('');
  const [reprogError, setReprogError] = useState<string | null>(null);
  const [reprogSaving, setReprogSaving] = useState(false);

  // Modal cancelar
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSaving, setCancelSaving] = useState(false);

  const [pagina, setPagina] = useState(1);
  const [totalCitas, setTotalCitas] = useState(0);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorRiesgos(null);
    try {
      const { data, total } = await listarCitas({
        limit: TAMANO_PAGINA_CITAS,
        page: pagina,
        especialistaId: filtroEspecialistaId || undefined,
        desde: filtroDesde || undefined,
        hasta: filtroHasta || undefined,
        orden: 'creadoEn',
      });
      setCitas(data);
      setTotalCitas(total);
      setLoading(false);

      // Riesgo de cancelación solo para citas activas (no aplica a canceladas/completadas/no_asistio).
      // La página ya viene acotada a TAMANO_PAGINA_CITAS (25), dentro del máximo de 100 que acepta el DTO.
      const idsActivos = data
        .filter((cita) => !['cancelada', 'completada', 'no_asistio'].includes(cita.estado))
        .map((cita) => cita.id);
      if (idsActivos.length === 0) {
        setRiesgos({});
        return;
      }

      setLoadingRiesgos(true);
      try {
        const predicciones = await predecirRiesgosCancelacion(idsActivos);
        setRiesgos(Object.fromEntries(predicciones.map((riesgo) => [riesgo.citaId, riesgo])));
      } catch (e) {
        setRiesgos({});
        setErrorRiesgos(e instanceof Error ? e.message : 'No se pudo calcular el riesgo de cancelación');
      } finally {
        setLoadingRiesgos(false);
      }
    } catch (e) {
      setCitas([]);
      setRiesgos({});
      setError(e instanceof Error ? e.message : 'Error al cargar las citas');
      setLoading(false);
    }
  }, [filtroEspecialistaId, filtroDesde, filtroHasta, pagina]);

  // Cambiar filtros reinicia a la página 1 (evita quedar en una página vacía).
  useEffect(() => { setPagina(1); }, [filtroEspecialistaId, filtroDesde, filtroHasta]);

  // Catálogos protegidos: solo se piden si el rol tiene el permiso que exige el backend
  // (p. ej. empleado tiene citas:escritura pero no clientes:lectura ni empleados:lectura).
  const { tienePermiso } = usePermisos();
  const puedeListarClientes = tienePermiso('clientes:lectura');
  const puedeListarEmpleados = tienePermiso('empleados:lectura');

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Catálogos: no bloquean la tabla; si fallan se avisa con Reintentar en vez de dejar selects vacíos.
  const cargarServicios = useCallback(() => {
    getServicios()
      .then(({ data }) => { setServicios(data); setErrorServicios(false); })
      .catch(() => setErrorServicios(true));
  }, []);

  const cargarEspecialistas = useCallback(() => {
    if (!puedeListarEmpleados) return;
    listarEmpleados({ limit: 200 })
      .then(({ data }) => { setEspecialistas(data); setErrorEspecialistas(false); })
      .catch(() => setErrorEspecialistas(true));
  }, [puedeListarEmpleados]);

  useEffect(() => { cargarServicios(); }, [cargarServicios]);
  useEffect(() => { cargarEspecialistas(); }, [cargarEspecialistas]);

  const catalogosFallidos = [errorServicios && 'servicios', errorEspecialistas && 'especialistas'].filter(Boolean).join(' y ');
  const reintentarCatalogos = () => {
    if (errorServicios) cargarServicios();
    if (errorEspecialistas) cargarEspecialistas();
  };
  const avisoCatalogos = catalogosFallidos ? (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--danger-texto)]">
      <span>No se pudo cargar la lista de {catalogosFallidos}.</span>
      <Button size="sm" variant="outline" onClick={reintentarCatalogos}>Reintentar</Button>
    </div>
  ) : null;

  const totalPaginasCitas = Math.max(1, Math.ceil(totalCitas / TAMANO_PAGINA_CITAS));
  const desdeCitas = totalCitas === 0 ? 0 : (pagina - 1) * TAMANO_PAGINA_CITAS + 1;
  const hastaCitas = Math.min((pagina - 1) * TAMANO_PAGINA_CITAS + citas.length, totalCitas);

  const resetForm = () => {
    setFCliente(null); setFEspecialistaId(''); setFServicioId('');
    setFFecha(''); setFHoraInicio(''); setFHoraFin(''); setFNotas(''); setFPedirAnticipo(false); setFPagoAnticipo('salon');
    setFormError(null);
  };

  const anticipoServicioForm = servicios.find((s) => String(s.id) === fServicioId)?.anticipoMonto ?? 0;

  const handleCrear = async () => {
    if (!fCliente || !fEspecialistaId || !fServicioId || !fFecha || !fHoraInicio || !fHoraFin) {
      setFormError('Cliente, especialista, servicio, fecha y horas son obligatorios');
      return;
    }
    if (fHoraFin <= fHoraInicio) {
      setFormError('La hora de fin debe ser posterior a la de inicio');
      return;
    }
    setSaving(true); setFormError(null);
    try {
      await crearCita({
        clienteId: fCliente.id,
        especialistaId: fEspecialistaId,
        servicioId: Number(fServicioId),
        fechaHoraInicio: combinar(fFecha, fHoraInicio),
        fechaHoraFin: combinar(fFecha, fHoraFin),
        notas: fNotas.trim() || undefined,
        ...(fPedirAnticipo && anticipoServicioForm > 0 ? { pedirAnticipo: true, pagoAnticipo: fPagoAnticipo } : {}),
      });
      setIsModalOpen(false);
      resetForm();
      cargar();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'No se pudo crear la cita');
    } finally {
      setSaving(false);
    }
  };

  const openCancelar = (id: number) => {
    setCancelId(id); setCancelMotivo(''); setCancelError(null);
  };
  const cerrarCancelar = () => { setCancelId(null); setCancelMotivo(''); setCancelError(null); };

  const handleCancelar = async () => {
    if (!cancelId) return;
    const problema = validarMotivoCancelacionCita(cancelMotivo);
    if (problema) { setCancelError(problema); return; }
    setCancelSaving(true); setCancelError(null);
    try {
      await cancelarCita(cancelId, { motivoCancelacion: cancelMotivo.trim() });
      cerrarCancelar();
      showToast('Cita cancelada', 'success');
      cargar();
    } catch (e) {
      setCancelError(mensajeUsuarioDesdeErrorApi(e));
    } finally {
      setCancelSaving(false);
    }
  };

  const handleCheckIn = async (id: number) => {
    try { await checkInCita(id); cargar(); }
    catch (e) { showToast(`No se pudo hacer check-in: ${mensajeUsuarioDesdeErrorApi(e)}`, 'error', 6000); }
  };
  const handleCheckOut = async (id: number) => {
    try { await checkOutCita(id); cargar(); }
    catch (e) { showToast(`No se pudo hacer check-out: ${mensajeUsuarioDesdeErrorApi(e)}`, 'error', 6000); }
  };

  const openReprogramar = (c: CitaApi) => {
    setReprogId(c.id);
    // Fecha y hora en México con reloj de 24 h: así lo esperan los inputs date y time.
    const inicio = fechaYHora24EnMexico(c.fechaHoraInicio);
    const fin = fechaYHora24EnMexico(c.fechaHoraFin);
    setRFecha(inicio?.fecha ?? '');
    setRHoraInicio(inicio?.hora ?? '');
    setRHoraFin(fin?.hora ?? '');
    setReprogError(null);
    setIsReprogOpen(true);
  };

  const handleReprogramar = async () => {
    if (!reprogId || !rFecha || !rHoraInicio || !rHoraFin) {
      setReprogError('Fecha y horas son obligatorias'); return;
    }
    if (rHoraFin <= rHoraInicio) { setReprogError('La hora de fin debe ser posterior a la de inicio'); return; }
    setReprogSaving(true); setReprogError(null);
    try {
      await reprogramarCita(reprogId, {
        fechaHoraInicio: combinar(rFecha, rHoraInicio),
        fechaHoraFin: combinar(rFecha, rHoraFin),
      });
      setIsReprogOpen(false); setReprogId(null);
      cargar();
    } catch (e) {
      setReprogError(e instanceof Error ? e.message : 'No se pudo reprogramar');
    } finally {
      setReprogSaving(false);
    }
  };

  const esFinal = (e: EstadoCita) => ['cancelada', 'completada', 'no_asistio'].includes(e);

  // Solo la página visible (hasta 25 citas): las etiquetas lo dicen para no leerse como totales.
  const resumenPagina = resumenCitasPagina(citas);
  const altoRiesgo = Object.values(riesgos).filter((r) => r.nivelRiesgo === 'alto').length;

  return (
    <OperacionLayout permisoRequerido="citas:escritura">
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              Gestión de citas
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              Administra las citas del salón: agendar, confirmar, modificar o cancelar servicios
            </p>
          </div>
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>+ Nueva cita</Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <TarjetaKpi icono={Clock3} etiqueta={resumenPagina.pendientes.etiqueta} cargando={loading} valor={resumenPagina.pendientes.valor} />
          <TarjetaKpi icono={CheckCircle2} etiqueta={resumenPagina.enCurso.etiqueta} cargando={loading} valor={resumenPagina.enCurso.valor} />
          <TarjetaKpi icono={XCircle} etiqueta={resumenPagina.canceladas.etiqueta} cargando={loading} valor={resumenPagina.canceladas.valor} />
          <TarjetaKpi
            icono={BrainCircuit}
            etiqueta="Riesgo alto previsto"
            cargando={loading || loadingRiesgos}
            valor={altoRiesgo}
            tono={altoRiesgo > 0 ? 'peligro' : 'normal'}
            alerta={altoRiesgo > 0}
          />
        </div>

        {avisoCatalogos}

        {/* Filtros */}
        <div className="flex flex-wrap gap-4">
          <div className="max-w-xs w-full sm:w-56">
            <Select
              label="Filtrar por especialista"
              value={filtroEspecialistaId}
              onChange={(e) => setFiltroEspecialistaId(e.target.value)}
              options={[
                { value: '', label: 'Todos los especialistas' },
                ...especialistas.map((e) => ({ value: e.usuarioId, label: e.nombre ?? e.puesto ?? 'Especialista sin nombre' })),
              ]}
              fullWidth
            />
          </div>
          <Input
            label="Desde"
            type="date"
            value={filtroDesde}
            onChange={(e) => setFiltroDesde(e.target.value)}
            className="w-full sm:w-40"
          />
          <Input
            label="Hasta"
            type="date"
            value={filtroHasta}
            onChange={(e) => setFiltroHasta(e.target.value)}
            className="w-full sm:w-40"
          />
          {(filtroDesde || filtroHasta) && (
            <div className="flex items-end">
              <Button variant="outline" size="sm" onClick={() => { setFiltroDesde(''); setFiltroHasta(''); }}>
                Limpiar fechas
              </Button>
            </div>
          )}
        </div>

        {/* Listado */}
        <Card variant="elevated" padding="lg">
        <div className="mb-4 rounded-lg border px-4 py-3" style={{ borderColor: 'var(--fondos-suaves)', backgroundColor: 'var(--fondo-general)' }}>
          <div className="flex items-start gap-3">
            <BrainCircuit size={19} className="mt-0.5 shrink-0" style={{ color: 'var(--encabezados-alterno)' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                Predicción preventiva de cancelación
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
                El puntaje ayuda a priorizar recordatorios y confirmaciones; no debe utilizarse para rechazar una cita.
              </p>
              {errorRiesgos && (
                <p className="text-xs mt-1" style={{ color: 'var(--danger-texto)' }}>
                  Las citas siguen disponibles, pero el modelo no respondió: {errorRiesgos}
                </p>
              )}
            </div>
          </div>
        </div>
        {loading ? (
          <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>Cargando citas…</p>
        ) : error ? (
          <div className="text-center py-8">
            <p className="mb-3" style={{ color: 'var(--danger-texto)' }}>{error}</p>
            <Button variant="outline" onClick={cargar}>Reintentar</Button>
          </div>
        ) : citas.length === 0 ? (
          <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>
            No hay citas registradas.
          </p>
        ) : (
          <Table headers={[...COLUMNAS_TABLA_CITAS]} headerSutil>
            {citas.map((cita) => {
              const anticipo = accionesAnticipo(cita, ahora, tienePermiso);
              const acciones = accionesCita(cita.estado, anticipo.registrar || anticipo.reembolsar || anticipo.retener || anticipo.noAsistio);
              const riesgo = riesgos[cita.id];
              const cliente = cita.clienteNombre ?? 'Cliente sin nombre';
              return (
              <TableRow key={cita.id}>
                {/* Cliente y servicio pueden saltar de línea: así la tabla cabe en el marco a 1440 px. */}
                <TableCell className="min-w-24" style={{ whiteSpace: 'normal' }}>{cliente}</TableCell>
                <TableCell>
                  <span className="block mf-cifras">{fmtFecha(cita.fechaHoraInicio)}</span>
                  <span className="block text-xs mf-cifras" style={{ color: 'var(--encabezados-alterno)' }}>
                    {fmtHora(cita.fechaHoraInicio)} a {fmtHora(cita.fechaHoraFin)}
                  </span>
                </TableCell>
                <TableCell className="min-w-24" style={{ whiteSpace: 'normal' }}>
                  <span className="block">{cita.servicioNombre ?? 'Servicio'}</span>
                  <span className="block text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                    Con {cita.especialistaNombre ?? 'especialista sin nombre'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex min-w-32 flex-col items-start gap-1.5">
                    <Badge variant={varianteEstadoCita(cita.estado)}>{etiquetaEstadoCita(cita.estado)}</Badge>
                    {(cita.anticipoRequerido ?? 0) > 0 && <IndicadorAnticipo cita={cita} ahora={ahora} />}
                  </div>
                </TableCell>
                <TableCell>
                  {esFinal(cita.estado) ? (
                    <span className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>No aplica</span>
                  ) : riesgo ? (
                    // La acción sugerida va en el title (y para lector de pantalla): como párrafo alargaba cada fila.
                    <span className="inline-flex" title={riesgo.accionSugerida}>
                      <Badge variant={varianteRiesgo(riesgo.nivelRiesgo)} size="sm">
                        {etiquetaRiesgo(riesgo.nivelRiesgo)} · {riesgo.porcentajeCancelacion}%
                      </Badge>
                      <span className="sr-only">Sugerencia: {riesgo.accionSugerida}</span>
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                      {loadingRiesgos ? 'Calculando…' : 'No disponible'}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {/* La acción del momento a la vista; reprogramar, cancelar y el anticipo en "Más". */}
                  <div className="flex items-center gap-2">
                    {acciones.principal === 'checkin' && (
                      <Button size="sm" variant="primary" onClick={() => handleCheckIn(cita.id)}>Check-in</Button>
                    )}
                    {acciones.principal === 'checkout' && (
                      <Button size="sm" variant="primary" onClick={() => handleCheckOut(cita.id)}>Check-out</Button>
                    )}
                    {acciones.conMenu && (
                      <MenuMasAcciones
                        etiqueta={`Más acciones de la cita de ${cliente}`}
                        acciones={(cerrar) => (
                          <>
                            {acciones.secundarias.includes('reprogramar') && (
                              <Button size="sm" variant="outline" onClick={() => { cerrar(); openReprogramar(cita); }}>Reprogramar</Button>
                            )}
                            {acciones.secundarias.includes('cancelar') && (
                              <Button size="sm" variant="outline-danger" onClick={() => { cerrar(); openCancelar(cita.id); }}>Cancelar cita</Button>
                            )}
                            <AccionesAnticipo cita={cita} ahora={ahora} onCambio={() => { void cargar(); }} conNoAsistio />
                          </>
                        )}
                      />
                    )}
                    {!acciones.principal && !acciones.conMenu && (
                      <span className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>-</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
              );
            })}
          </Table>
        )}
        {!loading && !error && totalCitas > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
            <p className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
              Mostrando {desdeCitas}–{hastaCitas} de {totalCitas}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina <= 1}
              >
                Anterior
              </Button>
              <span className="text-xs whitespace-nowrap" style={{ color: 'var(--encabezados-alterno)' }}>
                Página {pagina} de {totalPaginasCitas}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPagina((p) => Math.min(totalPaginasCitas, p + 1))}
                disabled={pagina >= totalPaginasCitas}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
        </Card>
      </div>

      {/* Modal: Nueva Cita */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { if (!saving) { setIsModalOpen(false); resetForm(); } }}
        title="Nueva cita"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setIsModalOpen(false); resetForm(); }} disabled={saving}>Cancelar</Button>
            <Button onClick={handleCrear} disabled={saving}>{saving ? 'Agendando…' : 'Agendar cita'}</Button>
          </>
        }
      >
        {formError && <p role="alert" className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{formError}</p>}
        <div className="space-y-4">
          {avisoCatalogos}
          {puedeListarClientes ? (
            <BuscadorClienta seleccion={fCliente} onSeleccionar={setFCliente} label="Cliente *" />
          ) : (
            <p className="text-sm text-encabezados-alterno">Tu rol no puede buscar clientas en el directorio: pide a quien tenga acceso que agende la cita.</p>
          )}
          <Select
            label="Especialista *"
            value={fEspecialistaId}
            onChange={(e) => setFEspecialistaId(e.target.value)}
            options={[{ value: '', label: 'Seleccionar especialista…' }, ...especialistas.map((e) => ({ value: e.usuarioId, label: e.nombre ?? e.puesto ?? 'Especialista sin nombre' }))]}
            fullWidth
          />
          <Select
            label="Servicio *"
            value={fServicioId}
            onChange={(e) => setFServicioId(e.target.value)}
            options={[{ value: '', label: 'Seleccionar servicio…' }, ...servicios.map((s) => ({ value: String(s.id), label: s.nombre }))]}
            fullWidth
          />
          <Input label="Fecha *" type="date" value={fFecha} onChange={(e) => setFFecha(e.target.value)} fullWidth />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Hora inicio *" type="time" value={fHoraInicio} onChange={(e) => setFHoraInicio(e.target.value)} fullWidth />
            <Input label="Hora fin *" type="time" value={fHoraFin} onChange={(e) => setFHoraFin(e.target.value)} fullWidth />
          </div>
          <Textarea label="Notas (opcional)" value={fNotas} onChange={(e) => setFNotas(e.target.value)} rows={3} fullWidth />
          {anticipoServicioForm > 0 && (
            <label className="flex min-h-11 items-start gap-3 text-sm text-menu-texto-principal">
              <input
                type="checkbox"
                checked={fPedirAnticipo}
                onChange={(e) => setFPedirAnticipo(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--botones-principales)]"
              />
              <span>
                Pedir anticipo de <span className="mf-cifras font-semibold">${anticipoServicioForm.toFixed(2)}</span>
                <span className="block text-xs text-encabezados-alterno">Si no se paga a tiempo, la cita se cancela y el horario se libera.</span>
              </span>
            </label>
          )}
          {fPedirAnticipo && anticipoServicioForm > 0 && (
            <Select
              label="Pago del anticipo:"
              value={fPagoAnticipo}
              onChange={(e) => setFPagoAnticipo(e.target.value as 'salon' | 'linea')}
              options={[
                { value: 'salon', label: 'En el salón' },
                { value: 'linea', label: 'En línea' },
              ]}
              helperText={
                fPagoAnticipo === 'salon'
                  ? `La clienta llega entre ${PLAZOS_TERMINOS.minutosLlegadaSalon} y ${PLAZOS_TERMINOS.minutosAntesPagoSalon} minutos antes y lo paga a más tardar ${PLAZOS_TERMINOS.minutosAntesPagoSalon} minutos antes de la cita.`
                  : `La clienta tiene ${PLAZOS_TERMINOS.horasAnticipoCita} horas para pagarlo en línea, sin pasar de ${PLAZOS_TERMINOS.minutosAntesPagoSalon} minutos antes de la cita.`
              }
              fullWidth
            />
          )}
        </div>
      </Modal>

      {/* Modal: Cancelar cita */}
      <Modal
        isOpen={cancelId !== null}
        onClose={() => { if (!cancelSaving) cerrarCancelar(); }}
        title="Cancelar cita"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={cerrarCancelar} disabled={cancelSaving}>Volver</Button>
            <Button variant="danger" onClick={handleCancelar} disabled={cancelSaving}>{cancelSaving ? 'Cancelando…' : 'Cancelar cita'}</Button>
          </>
        }
      >
        {cancelError && <p role="alert" className="mb-3 text-sm text-[var(--danger-texto)]">{cancelError}</p>}
        <Textarea
          label="Motivo de cancelación *"
          value={cancelMotivo}
          onChange={(e) => setCancelMotivo(e.target.value)}
          placeholder="Ej. La clienta avisó que no puede asistir"
          rows={3}
          maxLength={500}
          required
          fullWidth
        />
      </Modal>

      {/* Modal: Reprogramar */}
      <Modal
        isOpen={isReprogOpen}
        onClose={() => { if (!reprogSaving) { setIsReprogOpen(false); setReprogId(null); } }}
        title="Reprogramar cita"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setIsReprogOpen(false); setReprogId(null); }} disabled={reprogSaving}>Cancelar</Button>
            <Button onClick={handleReprogramar} disabled={reprogSaving}>{reprogSaving ? 'Guardando…' : 'Reprogramar'}</Button>
          </>
        }
      >
        {reprogError && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{reprogError}</p>}
        <div className="space-y-4">
          <Input label="Nueva fecha *" type="date" value={rFecha} onChange={(e) => setRFecha(e.target.value)} fullWidth />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Hora inicio *" type="time" value={rHoraInicio} onChange={(e) => setRHoraInicio(e.target.value)} fullWidth />
            <Input label="Hora fin *" type="time" value={rHoraFin} onChange={(e) => setRHoraFin(e.target.value)} fullWidth />
          </div>
        </div>
      </Modal>
    </OperacionLayout>
  );
}
