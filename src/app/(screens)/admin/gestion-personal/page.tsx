'use client';

import { useState, useEffect } from 'react';
import { listarEmpleados, crearPerfilEmpleado, actualizarEmpleado, eliminarEmpleado, EmpleadoApi } from '../../../services/empleados';
import { getUsuarios, type Usuario } from '../../../services/usuarios';
import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

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

  const cargar = async () => {
    setLoading(true);
    try {
      const { data } = await listarEmpleados();
      setEmpleadosRaw(data);
      setEmpleados(data.map(mapearEmpleado));
    } catch {
      // mantener lista vacía
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

  useEffect(() => { cargar(); }, []);

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
      <PageHeader
        title="Gestión de Personal"
        subtitle="Administra el personal, horarios, comisiones y permisos"
        actions={
          <Button onClick={openCrear}>+ Agregar Empleado</Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Total Empleados</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : empleados.length}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Servicios del Mes</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>-</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Comisiones del Mes</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>-</p>
          </div>
        </Card>
      </div>

      <Card>
        <Table headers={['Nombre', 'Rol', 'Horario', 'Servicios del Mes', 'Comisiones', 'Acciones']}>
          {empleados.map((empleado) => (
            <TableRow key={empleado.id}>
              <TableCell className="font-semibold">{empleado.nombre}</TableCell>
              <TableCell>
                <Badge variant={empleado.rol === 'Administrador' ? 'info' : 'default'}>
                  {empleado.rol}
                </Badge>
              </TableCell>
              <TableCell>{empleado.horario}</TableCell>
              <TableCell>{empleado.servicios}</TableCell>
              <TableCell className="font-semibold">{empleado.comisiones}</TableCell>
              <TableCell>
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
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Solicitudes de Permisos
          </h2>
          <div className="space-y-3">
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
              <p className="font-semibold mb-1" style={{ color: 'var(--menu-texto-principal)' }}>
                Auxiliar - 2024-01-20
              </p>
              <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>
                Permiso personal
              </p>
              <div className="flex gap-2">
                <Button size="sm">Aprobar</Button>
                <Button size="sm" variant="outline">Rechazar</Button>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Horas Extras del Mes
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
              <div>
                <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>Auxiliar</p>
                <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>5 horas extras</p>
              </div>
              <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>$500</p>
            </div>
          </div>
        </Card>
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
        {formError && <p className="text-sm mb-3" style={{ color: 'var(--danger)' }}>{formError}</p>}
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
        {formError && <p className="text-sm mb-3" style={{ color: 'var(--danger)' }}>{formError}</p>}
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
