'use client';

import { useState, useEffect } from 'react';
import { listarEmpleados, crearPerfilEmpleado, actualizarEmpleado, eliminarEmpleado, EmpleadoApi } from '../../../services/empleados';
import { getUsuarios, type Usuario } from '../../../services/usuarios';
import { obtenerConfiguracionSalon, actualizarConfiguracionSalon } from '../../../services/configuracion';
import { isAdminRol, getRolFromUser } from '../../../utils/adminAuth';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import PanelSolicitudes from '../../../components/personal/PanelSolicitudes';
import PanelAsistencia from '../../../components/personal/PanelAsistencia';
import PanelHorasExtra from '../../../components/personal/PanelHorasExtra';
import { BadgeDollarSign, Clock3, ClipboardList, Users } from 'lucide-react';

interface EmpleadoFila {
  id: string;
  nombre: string;
  rol: string;
  horario: string;
  servicios: string;
  comisiones: string;
}

function mapearEmpleado(e: EmpleadoApi): EmpleadoFila {
  return {
    id: e.id || e.usuarioId,
    nombre: e.nombre ?? '-',
    rol: e.puesto ?? 'Empleado',
    horario: '-',
    servicios: '-',
    comisiones: e.comisionPorcentaje != null ? `${e.comisionPorcentaje}%` : '-',
  };
}

export default function GestionPersonalPage() {
  const [empleados, setEmpleados] = useState<EmpleadoFila[]>([]);
  const [empleadosRaw, setEmpleadosRaw] = useState<EmpleadoApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modales y formularios
  const [isModalCrearOpen, setIsModalCrearOpen] = useState(false);
  const [isModalEditarOpen, setIsModalEditarOpen] = useState(false);
  const [isModalBajaOpen, setIsModalBajaOpen] = useState(false);
  const [empleadoEditando, setEmpleadoEditando] = useState<EmpleadoApi | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Campos del formulario (compartidos crear/editar)
  const [usuariosPersonal, setUsuariosPersonal] = useState<Usuario[]>([]);
  const [formUsuarioId, setFormUsuarioId] = useState('');
  const [formPuesto, setFormPuesto] = useState('');
  const [formEspecialidades, setFormEspecialidades] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formFechaIngreso, setFormFechaIngreso] = useState('');
  const [formComision, setFormComision] = useState('');
  const [formActivo, setFormActivo] = useState(true);

  // Configuración de horario (por tipo de día) y tarifa de hora extra (fila única, solo admin la edita)
  const [esAdmin, setEsAdmin] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configEntradaLV, setConfigEntradaLV] = useState('09:00');
  const [configSalidaLV, setConfigSalidaLV] = useState('18:00');
  const [configEntradaSab, setConfigEntradaSab] = useState('09:00');
  const [configSalidaSab, setConfigSalidaSab] = useState('18:00');
  const [domingoActivo, setDomingoActivo] = useState(false);
  const [configEntradaDom, setConfigEntradaDom] = useState('');
  const [configSalidaDom, setConfigSalidaDom] = useState('');
  const [configMargen, setConfigMargen] = useState('15');
  const [configTarifa, setConfigTarifa] = useState('0');
  const [tarifaConfigurada, setTarifaConfigurada] = useState(false);

  const cargarConfig = async () => {
    setLoadingConfig(true);
    setConfigError(null);
    try {
      const config = await obtenerConfiguracionSalon();
      setConfigEntradaLV(config.entradaLunesViernes);
      setConfigSalidaLV(config.salidaLunesViernes);
      setConfigEntradaSab(config.entradaSabado);
      setConfigSalidaSab(config.salidaSabado);
      setDomingoActivo(Boolean(config.entradaDomingo && config.salidaDomingo));
      setConfigEntradaDom(config.entradaDomingo ?? '');
      setConfigSalidaDom(config.salidaDomingo ?? '');
      setConfigMargen(String(config.margenGraciaMinutos));
      setConfigTarifa(String(config.tarifaHoraExtra));
      setTarifaConfigurada(config.tarifaHoraExtra > 0);
    } catch {
      setConfigError('Error al cargar la configuración');
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleGuardarConfig = async () => {
    if (domingoActivo && (!configEntradaDom || !configSalidaDom)) {
      setConfigError('Si el salón abre domingo, completa entrada y salida de ese día');
      return;
    }
    setSavingConfig(true);
    setConfigError(null);
    try {
      const config = await actualizarConfiguracionSalon({
        entradaLunesViernes: configEntradaLV,
        salidaLunesViernes: configSalidaLV,
        entradaSabado: configEntradaSab,
        salidaSabado: configSalidaSab,
        entradaDomingo: domingoActivo ? configEntradaDom : null,
        salidaDomingo: domingoActivo ? configSalidaDom : null,
        margenGraciaMinutos: Number(configMargen) || 0,
        tarifaHoraExtra: Number(configTarifa) || 0,
      });
      setConfigEntradaLV(config.entradaLunesViernes);
      setConfigSalidaLV(config.salidaLunesViernes);
      setConfigEntradaSab(config.entradaSabado);
      setConfigSalidaSab(config.salidaSabado);
      setDomingoActivo(Boolean(config.entradaDomingo && config.salidaDomingo));
      setConfigEntradaDom(config.entradaDomingo ?? '');
      setConfigSalidaDom(config.salidaDomingo ?? '');
      setConfigMargen(String(config.margenGraciaMinutos));
      setConfigTarifa(String(config.tarifaHoraExtra));
      setTarifaConfigurada(config.tarifaHoraExtra > 0);
    } catch (e) {
      setConfigError(e instanceof Error ? e.message : 'No se pudo guardar la configuración');
    } finally {
      setSavingConfig(false);
    }
  };

  const cargar = async () => {
    setLoading(true);
    try {
      const { data } = await listarEmpleados();
      setEmpleadosRaw(data);
      setEmpleados(data.map(mapearEmpleado));
    } catch {
      setError('Error al cargar empleados');
    } finally {
      setLoading(false);
    }
  };

  const cargarUsuariosPersonal = async () => {
    try {
      const todos = await getUsuarios();
      const ROLES = ['estilista', 'empleado', 'becario', 'becado'];
      setUsuariosPersonal(todos.filter((u) => ROLES.includes(String(u.rol).toLowerCase())));
    } catch {
      setUsuariosPersonal([]);
    }
  };

  useEffect(() => {
    cargar();
    cargarConfig();
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}') as Record<string, unknown>;
      setEsAdmin(isAdminRol(getRolFromUser(user)));
    } catch {
      setEsAdmin(false);
    }
  }, []);

  const resetForm = () => {
    setFormUsuarioId('');
    setFormPuesto('');
    setFormEspecialidades('');
    setFormTelefono('');
    setFormFechaIngreso('');
    setFormComision('');
    setFormActivo(true);
    setFormError(null);
  };

  const openCrear = async () => {
    resetForm();
    await cargarUsuariosPersonal();
    setIsModalCrearOpen(true);
  };

  const openEditar = async (emp: EmpleadoApi) => {
    setEmpleadoEditando(emp);
    setFormPuesto(emp.puesto ?? '');
    setFormEspecialidades((emp.especialidades ?? []).join(', '));
    setFormTelefono(emp.telefono ?? '');
    setFormFechaIngreso(emp.fechaIngreso ? emp.fechaIngreso.slice(0, 10) : '');
    setFormComision(emp.comisionPorcentaje != null ? String(emp.comisionPorcentaje) : '');
    setFormActivo(emp.activo ?? true);
    setFormError(null);
    setIsModalEditarOpen(true);
  };

  const openBaja = (emp: EmpleadoApi) => {
    setEmpleadoEditando(emp);
    setIsModalBajaOpen(true);
  };

  const handleCrear = async () => {
    if (!formUsuarioId) { setFormError('Selecciona un usuario'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const especialidades = formEspecialidades.trim()
        ? formEspecialidades.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      await crearPerfilEmpleado({
        usuarioId: formUsuarioId,
        puesto: formPuesto.trim() || undefined,
        especialidades: especialidades.length ? especialidades : undefined,
        telefono: formTelefono.trim() || undefined,
        fechaIngreso: formFechaIngreso || undefined,
        comisionPorcentaje: formComision ? Number(formComision) : undefined,
        activo: formActivo,
      } as unknown as Parameters<typeof crearPerfilEmpleado>[0]);
      setIsModalCrearOpen(false);
      resetForm();
      await cargar();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Error al crear empleado');
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = async () => {
    if (!empleadoEditando) return;
    setSaving(true);
    setFormError(null);
    try {
      const especialidades = formEspecialidades.trim()
        ? formEspecialidades.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      await actualizarEmpleado(empleadoEditando.usuarioId, {
        puesto: formPuesto.trim() || undefined,
        especialidades: especialidades.length ? especialidades : undefined,
        telefono: formTelefono.trim() || undefined,
        fechaIngreso: formFechaIngreso || undefined,
        comisionPorcentaje: formComision ? Number(formComision) : undefined,
        activo: formActivo,
      } as unknown as Parameters<typeof actualizarEmpleado>[1]);
      setIsModalEditarOpen(false);
      setEmpleadoEditando(null);
      await cargar();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Error al actualizar empleado');
    } finally {
      setSaving(false);
    }
  };

  const handleBaja = async () => {
    if (!empleadoEditando) return;
    setSaving(true);
    try {
      await eliminarEmpleado(empleadoEditando.usuarioId);
      setIsModalBajaOpen(false);
      setEmpleadoEditando(null);
      await cargar();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Error al dar de baja');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              Gestión de Personal
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              {empleados.length} empleado{empleados.length === 1 ? '' : 's'} activos
            </p>
          </div>
          <Button onClick={openCrear}>+ Agregar Empleado</Button>
        </div>

        {error && (
          <div className="bg-red-600 border border-red-700 text-white px-4 py-3 rounded text-xs font-bold shadow-md">
            {error}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Users size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Total empleados</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : empleados.length}</p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <ClipboardList size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Servicios del mes</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>-</p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <BadgeDollarSign size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Comisiones del mes</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>-</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Listado */}
        <Card variant="elevated" padding="lg">
        {loading ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>Cargando empleados…</p>
        ) : empleados.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>No hay empleados registrados.</p>
        ) : (
        <Table headers={['Nombre', 'Rol', 'Horario', 'Servicios del Mes', 'Comisiones', 'Acciones']} headerSutil>
          {empleados.map((empleado) => (
            <TableRow key={empleado.id}>
              <TableCell className="font-semibold" rowPadding="lg">{empleado.nombre}</TableCell>
              <TableCell rowPadding="lg">
                <Badge variant={empleado.rol === 'Administrador' ? 'info' : 'default'}>
                  {empleado.rol}
                </Badge>
              </TableCell>
              <TableCell rowPadding="lg">{empleado.horario}</TableCell>
              <TableCell rowPadding="lg">{empleado.servicios}</TableCell>
              <TableCell className="font-semibold" rowPadding="lg">{empleado.comisiones}</TableCell>
              <TableCell rowPadding="lg">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    const raw = empleadosRaw.find((e) => (e.id || e.usuarioId) === empleado.id);
                    if (raw) openEditar(raw);
                  }}>Editar</Button>
                  <Button size="sm" variant="danger" onClick={() => {
                    const raw = empleadosRaw.find((e) => (e.id || e.usuarioId) === empleado.id);
                    if (raw) openBaja(raw);
                  }}>Dar de baja</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
        )}
        </Card>

        <Card variant="elevated" padding="lg">
          <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--menu-texto-principal)' }}>
                <Clock3 size={18} /> Horario y tarifa de hora extra
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
                Igual para todo el personal — se usará para calcular horas extras desde asistencia.
              </p>
            </div>
            {!esAdmin && (
              <Badge variant="default">Solo lectura</Badge>
            )}
          </div>

          {configError && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{configError}</p>}

          {loadingConfig ? (
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Cargando configuración…</p>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>Lunes a viernes</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Entrada" type="time" value={configEntradaLV} onChange={(e) => setConfigEntradaLV(e.target.value)} disabled={!esAdmin} fullWidth />
                  <Input label="Salida" type="time" value={configSalidaLV} onChange={(e) => setConfigSalidaLV(e.target.value)} disabled={!esAdmin} fullWidth />
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>Sábado</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Entrada" type="time" value={configEntradaSab} onChange={(e) => setConfigEntradaSab(e.target.value)} disabled={!esAdmin} fullWidth />
                  <Input label="Salida" type="time" value={configSalidaSab} onChange={(e) => setConfigSalidaSab(e.target.value)} disabled={!esAdmin} fullWidth />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>Domingo</p>
                  {esAdmin && (
                    <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                      <input
                        type="checkbox"
                        checked={domingoActivo}
                        onChange={(e) => setDomingoActivo(e.target.checked)}
                      />
                      El salón abre domingo
                    </label>
                  )}
                </div>
                {domingoActivo ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Entrada" type="time" value={configEntradaDom} onChange={(e) => setConfigEntradaDom(e.target.value)} disabled={!esAdmin} fullWidth />
                    <Input label="Salida" type="time" value={configSalidaDom} onChange={(e) => setConfigSalidaDom(e.target.value)} disabled={!esAdmin} fullWidth />
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--warning-texto)' }}>
                    Domingo — sin configurar. El salón se asume cerrado ese día hasta que se defina un horario.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Margen de gracia (minutos)"
                  type="number"
                  min={0}
                  value={configMargen}
                  onChange={(e) => setConfigMargen(e.target.value)}
                  disabled={!esAdmin}
                  fullWidth
                />
                <div>
                  <Input
                    label="Tarifa de hora extra ($/hora)"
                    type="number"
                    min={0}
                    step={0.01}
                    value={configTarifa}
                    onChange={(e) => setConfigTarifa(e.target.value)}
                    disabled={!esAdmin}
                    placeholder="Sin configurar"
                    fullWidth
                  />
                  {!tarifaConfigurada && (
                    <p className="text-xs mt-1" style={{ color: 'var(--warning-texto)' }}>
                      Tarifa no configurada — el cálculo de horas extras no será real hasta que se defina.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {esAdmin && (
            <div className="mt-4">
              <Button size="sm" onClick={handleGuardarConfig} disabled={savingConfig || loadingConfig}>
                {savingConfig ? 'Guardando...' : 'Guardar configuración'}
              </Button>
            </div>
          )}
        </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PanelSolicitudes />
        <PanelHorasExtra />
      </div>

      <PanelAsistencia />
      </div>
      {/* Modal: Crear Empleado */}
      <Modal
        isOpen={isModalCrearOpen}
        onClose={() => { if (!saving) { setIsModalCrearOpen(false); resetForm(); } }}
        title="Nuevo Empleado"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => { setIsModalCrearOpen(false); resetForm(); }} disabled={saving}>Cancelar</Button>
            <Button onClick={handleCrear} disabled={saving}>{saving ? 'Guardando...' : 'Crear'}</Button>
          </>
        }
      >
        {formError && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{formError}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Select
              label="Usuario *"
              value={formUsuarioId}
              onChange={(e) => setFormUsuarioId(e.target.value)}
              options={[
                { value: '', label: 'Seleccionar usuario...' },
                ...usuariosPersonal.map((u) => ({ value: u.id, label: `${u.nombre} (${u.rol})` })),
              ]}
              fullWidth
            />
          </div>
          <Input label="Puesto" value={formPuesto} onChange={(e) => setFormPuesto(e.target.value)} placeholder="Ej. Estilista senior" fullWidth />
          <Input label="Teléfono" value={formTelefono} onChange={(e) => setFormTelefono(e.target.value)} placeholder="555-0000" fullWidth />
          <Input label="Especialidades" value={formEspecialidades} onChange={(e) => setFormEspecialidades(e.target.value)} placeholder="Corte, tinte, peinado..." fullWidth />
          <Input label="Comisión %" type="number" min={0} max={100} value={formComision} onChange={(e) => setFormComision(e.target.value)} placeholder="0" fullWidth />
          <Input label="Fecha de ingreso" type="date" value={formFechaIngreso} onChange={(e) => setFormFechaIngreso(e.target.value)} fullWidth />
          <div className="flex items-center gap-2 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formActivo} onChange={(e) => setFormActivo(e.target.checked)} className="rounded" />
              <span style={{ color: 'var(--menu-texto-principal)' }}>Empleado activo</span>
            </label>
          </div>
        </div>
      </Modal>

      {/* Modal: Editar Empleado */}
      <Modal
        isOpen={isModalEditarOpen}
        onClose={() => { if (!saving) { setIsModalEditarOpen(false); setEmpleadoEditando(null); setFormError(null); } }}
        title="Editar Empleado"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => { setIsModalEditarOpen(false); setEmpleadoEditando(null); setFormError(null); }} disabled={saving}>Cancelar</Button>
            <Button onClick={handleEditar} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </>
        }
      >
        {formError && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{formError}</p>}
        <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
          Editando: <strong>{empleadoEditando?.nombre ?? empleadoEditando?.usuarioId}</strong>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Puesto" value={formPuesto} onChange={(e) => setFormPuesto(e.target.value)} placeholder="Ej. Estilista senior" fullWidth />
          <Input label="Teléfono" value={formTelefono} onChange={(e) => setFormTelefono(e.target.value)} placeholder="555-0000" fullWidth />
          <Input label="Especialidades" value={formEspecialidades} onChange={(e) => setFormEspecialidades(e.target.value)} placeholder="Corte, tinte, peinado..." fullWidth />
          <Input label="Comisión %" type="number" min={0} max={100} value={formComision} onChange={(e) => setFormComision(e.target.value)} placeholder="0" fullWidth />
          <Input label="Fecha de ingreso" type="date" value={formFechaIngreso} onChange={(e) => setFormFechaIngreso(e.target.value)} fullWidth />
          <div className="flex items-center gap-2 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formActivo} onChange={(e) => setFormActivo(e.target.checked)} className="rounded" />
              <span style={{ color: 'var(--menu-texto-principal)' }}>Empleado activo</span>
            </label>
          </div>
        </div>
      </Modal>

      {/* Modal: Confirmar Baja */}
      <Modal
        isOpen={isModalBajaOpen}
        onClose={() => { if (!saving) { setIsModalBajaOpen(false); setEmpleadoEditando(null); } }}
        title="Dar de baja"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setIsModalBajaOpen(false); setEmpleadoEditando(null); }} disabled={saving}>Cancelar</Button>
            <Button variant="danger" onClick={handleBaja} disabled={saving}>{saving ? 'Procesando...' : 'Dar de baja'}</Button>
          </>
        }
      >
        <p style={{ color: 'var(--menu-texto-principal)' }}>
          ¿Dar de baja a <strong>{empleadoEditando?.nombre ?? empleadoEditando?.usuarioId}</strong>? Se eliminará su perfil de empleado.
        </p>
      </Modal>
    </AdminLayout>
  );
}
