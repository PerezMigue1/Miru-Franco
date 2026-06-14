'use client';

import { useState, useEffect } from 'react';
import { listarCitas, cancelarCita, crearCita, actualizarCita, reprogramarCita, CitaApi } from '../../../services/citas';
import { listarClientes, ClienteApi } from '../../../services/clientes';
import { getUsuarios, type Usuario } from '../../../services/usuarios';
import { getServicios, type Servicio } from '../../../services/servicios';
import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Textarea from '../../../components/ui/Textarea';

interface CitaFila {
  id: number;
  cliente: string;
  telefono: string;
  fecha: string;
  hora: string;
  servicio: string;
  especialista: string;
  estado: string;
  anticipo: string;
}

function mapearCita(c: CitaApi): CitaFila {
  const fechaHora = c.fechaHoraInicio ? new Date(c.fechaHoraInicio) : null;
  return {
    id: c.id,
    cliente: c.clienteNombre ?? '-',
    telefono: '-',
    fecha: fechaHora ? fechaHora.toLocaleDateString('es-MX') : '-',
    hora: fechaHora ? fechaHora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '-',
    servicio: c.servicioNombre ?? '-',
    especialista: c.especialistaNombre ?? '-',
    estado: c.estado,
    anticipo: '-',
  };
}

export default function GestionCitasPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [citas, setCitas] = useState<CitaFila[]>([]);
  const [loading, setLoading] = useState(true);

  // CRUD real
  const [citasRaw, setCitasRaw] = useState<CitaApi[]>([]);
  const [isModalNuevaCitaOpen, setIsModalNuevaCitaOpen] = useState(false);
  const [isModalEditarCitaOpen, setIsModalEditarCitaOpen] = useState(false);
  const [isModalCancelarOpen, setIsModalCancelarOpen] = useState(false);
  const [isModalReprogramarOpen, setIsModalReprogramarOpen] = useState(false);
  const [citaEditando, setCitaEditando] = useState<CitaApi | null>(null);
  const [citaCancelando, setCitaCancelando] = useState<number | null>(null);
  const [savingCita, setSavingCita] = useState(false);
  const [citaError, setCitaError] = useState<string | null>(null);
  const [catClientes, setCatClientes] = useState<ClienteApi[]>([]);
  const [catUsuarios, setCatUsuarios] = useState<Usuario[]>([]);
  const [catServicios, setCatServicios] = useState<Servicio[]>([]);
  const [formClienteId, setFormClienteId] = useState('');
  const [formEspecialistaId, setFormEspecialistaId] = useState('');
  const [formServicioId, setFormServicioId] = useState('');
  const [formFechaInicio, setFormFechaInicio] = useState('');
  const [formFechaFin, setFormFechaFin] = useState('');
  const [formNotas, setFormNotas] = useState('');
  const [formEstadoCita, setFormEstadoCita] = useState('pendiente');
  const [formMotivoCancelacion, setFormMotivoCancelacion] = useState('');
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [reprFechaInicio, setReprFechaInicio] = useState('');
  const [reprFechaFin, setReprFechaFin] = useState('');

  const cargar = () => {
    const hoy = new Date().toISOString().slice(0, 10);
    const en7Dias = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    setLoading(true);
    listarCitas({ desde: hoy, hasta: en7Dias })
      .then(({ data }) => { setCitasRaw(data); setCitas(data.map(mapearCita)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const handleCancelar = async (id: number) => {
    await cancelarCita(id, { motivoCancelacion: 'Cancelada desde panel admin' });
    cargar();
  };

  const cargarCatalogos = async () => {
    try {
      const [clientesRes, usuariosRes, serviciosRes] = await Promise.all([
        listarClientes(),
        getUsuarios(),
        getServicios(),
      ]);
      setCatClientes(clientesRes.data);
      const ROLES = ['estilista', 'empleado', 'becario', 'becado'];
      setCatUsuarios(usuariosRes.filter((u) => ROLES.includes(String(u.rol).toLowerCase())));
      setCatServicios(serviciosRes.data);
    } catch { /* silencioso */ }
  };

  const resetFormCita = () => {
    setFormClienteId(''); setFormEspecialistaId(''); setFormServicioId('');
    setFormFechaInicio(''); setFormFechaFin(''); setFormNotas('');
    setFormEstadoCita('pendiente'); setFormMotivoCancelacion('');
    setCitaError(null);
  };

  const openNuevaCita = async () => { resetFormCita(); await cargarCatalogos(); setIsModalNuevaCitaOpen(true); };

  const openEditarCita = async (citaId: number) => {
    const raw = citasRaw.find((c) => c.id === citaId);
    if (!raw) return;
    setCitaEditando(raw);
    setFormClienteId(raw.clienteId ?? '');
    setFormEspecialistaId(raw.especialistaId ?? '');
    setFormServicioId(String(raw.servicioId ?? ''));
    setFormFechaInicio(raw.fechaHoraInicio ? raw.fechaHoraInicio.slice(0, 16) : '');
    setFormFechaFin(raw.fechaHoraFin ? raw.fechaHoraFin.slice(0, 16) : '');
    setFormNotas(raw.notas ?? '');
    setFormEstadoCita(raw.estado ?? 'pendiente');
    setFormMotivoCancelacion('');
    setCitaError(null);
    await cargarCatalogos();
    setIsModalEditarCitaOpen(true);
  };

  const openCancelarModal = (citaId: number) => { setCitaCancelando(citaId); setCancelMotivo(''); setIsModalCancelarOpen(true); };

  const openReprogramar = (citaId: number) => {
    const raw = citasRaw.find((c) => c.id === citaId);
    setCitaEditando(raw ?? null);
    setReprFechaInicio(raw?.fechaHoraInicio ? raw.fechaHoraInicio.slice(0, 16) : '');
    setReprFechaFin(raw?.fechaHoraFin ? raw.fechaHoraFin.slice(0, 16) : '');
    setCitaError(null);
    setIsModalReprogramarOpen(true);
  };

  const handleNuevaCita = async () => {
    if (!formClienteId || !formEspecialistaId || !formServicioId || !formFechaInicio || !formFechaFin) {
      setCitaError('Completa todos los campos requeridos'); return;
    }
    setSavingCita(true); setCitaError(null);
    try {
      await crearCita({ clienteId: formClienteId, especialistaId: formEspecialistaId, servicioId: Number(formServicioId), fechaHoraInicio: formFechaInicio, fechaHoraFin: formFechaFin, notas: formNotas || undefined });
      setIsModalNuevaCitaOpen(false); resetFormCita(); cargar();
    } catch (e) { setCitaError(e instanceof Error ? e.message : 'Error al crear cita'); }
    finally { setSavingCita(false); }
  };

  const handleEditarCita = async () => {
    if (!citaEditando) return;
    setSavingCita(true); setCitaError(null);
    try {
      if (formEstadoCita === 'cancelada') {
        await cancelarCita(citaEditando.id, { motivoCancelacion: formMotivoCancelacion.trim() || 'Cancelada desde panel admin' });
      } else {
        await actualizarCita(citaEditando.id, {
          clienteId: formClienteId, especialistaId: formEspecialistaId,
          servicioId: Number(formServicioId), fechaHoraInicio: formFechaInicio,
          fechaHoraFin: formFechaFin, notas: formNotas || undefined,
          estado: formEstadoCita,
        } as unknown as Parameters<typeof actualizarCita>[1]);
      }
      setIsModalEditarCitaOpen(false); setCitaEditando(null); cargar();
    } catch (e) { setCitaError(e instanceof Error ? e.message : 'Error al editar cita'); }
    finally { setSavingCita(false); }
  };

  const handleCancelarCita = async () => {
    if (!citaCancelando) return;
    setSavingCita(true);
    try {
      await cancelarCita(citaCancelando, { motivoCancelacion: cancelMotivo.trim() || 'Cancelada desde panel admin' });
      setIsModalCancelarOpen(false); setCitaCancelando(null); cargar();
    } catch { /* silencioso */ }
    finally { setSavingCita(false); }
  };

  const handleReprogramar = async () => {
    if (!citaEditando || !reprFechaInicio || !reprFechaFin) { setCitaError('Fechas requeridas'); return; }
    setSavingCita(true); setCitaError(null);
    try {
      await reprogramarCita(citaEditando.id, { fechaHoraInicio: reprFechaInicio, fechaHoraFin: reprFechaFin });
      setIsModalReprogramarOpen(false); setCitaEditando(null); cargar();
    } catch (e) { setCitaError(e instanceof Error ? e.message : 'Error al reprogramar'); }
    finally { setSavingCita(false); }
  };

  const estados = {
    confirmada: 'success',
    pendiente: 'warning',
    cancelada: 'danger',
    completada: 'info',
  } as const;

  return (
    <AdminLayout>
      <PageHeader
        title="Gestión de Citas"
        subtitle="Administra las citas del salón: agendar, confirmar, modificar o cancelar servicios"
        actions={
          <Button onClick={openNuevaCita}>
            + Nueva Cita
          </Button>
        }
      />

      <Card>
        <Table headers={['Cliente', 'Teléfono', 'Fecha', 'Hora', 'Servicio', 'Especialista', 'Estado', 'Anticipo', 'Acciones']}>
          {citas.map((cita) => (
            <TableRow key={cita.id}>
              <TableCell>{cita.cliente}</TableCell>
              <TableCell>{cita.telefono}</TableCell>
              <TableCell>{cita.fecha}</TableCell>
              <TableCell>{cita.hora}</TableCell>
              <TableCell>{cita.servicio}</TableCell>
              <TableCell>{cita.especialista}</TableCell>
              <TableCell>
                <Badge variant={estados[cita.estado as keyof typeof estados] || 'default'}>
                  {cita.estado}
                </Badge>
              </TableCell>
              <TableCell>{cita.anticipo}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditarCita(cita.id)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openReprogramar(cita.id)}>
                    Reprogramar
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => openCancelarModal(cita.id)}>
                    Cancelar
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>

      {/* Modal Nueva Cita */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nueva Cita"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setIsModalOpen(false)}>
              Agendar Cita
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Nombre del Cliente" placeholder="Ingresa el nombre completo" fullWidth />
          <Input label="Teléfono" placeholder="555-1234-5678" fullWidth />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Fecha" type="date" fullWidth />
            <Input label="Hora" type="time" fullWidth />
          </div>
          <Select
            label="Tipo de Servicio"
            options={[
              { value: 'corte', label: 'Corte' },
              { value: 'alaciado', label: 'Alaciado' },
              { value: 'nanoplastia', label: 'Nanoplastía' },
              { value: 'depilacion', label: 'Depilación' },
            ]}
            fullWidth
          />
          <Select
            label="Especialista"
            options={[
              { value: 'mildred', label: 'Mildred' },
              { value: 'auxiliar', label: 'Auxiliar' },
            ]}
            fullWidth
          />
          <Input label="Anticipo" placeholder="$0.00" type="number" fullWidth />
        </div>
      </Modal>

      {/* Modal Editar Cita */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Cita"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setIsEditModalOpen(false)}>
              Guardar Cambios
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Nombre del Cliente" defaultValue="María González" fullWidth />
          <Input label="Teléfono" defaultValue="555-1234" fullWidth />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Fecha" type="date" defaultValue="2024-01-15" fullWidth />
            <Input label="Hora" type="time" defaultValue="10:00" fullWidth />
          </div>
          <Select
            label="Tipo de Servicio"
            options={[
              { value: 'corte', label: 'Corte' },
              { value: 'alaciado', label: 'Alaciado' },
              { value: 'nanoplastia', label: 'Nanoplastía' },
            ]}
            defaultValue="corte"
            fullWidth
          />
          <Select
            label="Estado"
            options={[
              { value: 'pendiente', label: 'Pendiente' },
              { value: 'confirmada', label: 'Confirmada' },
              { value: 'completada', label: 'Completada' },
              { value: 'cancelada', label: 'Cancelada' },
            ]}
            defaultValue="confirmada"
            fullWidth
          />
        </div>
      </Modal>

      {/* Modal: Nueva Cita Real */}
      <Modal
        isOpen={isModalNuevaCitaOpen}
        onClose={() => { if (!savingCita) { setIsModalNuevaCitaOpen(false); resetFormCita(); } }}
        title="Nueva Cita"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => { setIsModalNuevaCitaOpen(false); resetFormCita(); }} disabled={savingCita}>Cancelar</Button>
            <Button onClick={handleNuevaCita} disabled={savingCita}>{savingCita ? 'Guardando...' : 'Agendar'}</Button>
          </>
        }
      >
        {citaError && <p className="text-sm mb-3" style={{ color: 'var(--danger)' }}>{citaError}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Select label="Cliente *" value={formClienteId} onChange={(e) => setFormClienteId(e.target.value)}
              options={[{ value: '', label: 'Seleccionar cliente...' }, ...catClientes.map((c) => ({ value: c.id, label: c.nombre ?? c.email ?? c.id }))]}
              fullWidth />
          </div>
          <Select label="Especialista *" value={formEspecialistaId} onChange={(e) => setFormEspecialistaId(e.target.value)}
            options={[{ value: '', label: 'Seleccionar especialista...' }, ...catUsuarios.map((u) => ({ value: u.id, label: u.nombre ?? u.email }))]}
            fullWidth />
          <Select label="Servicio *" value={formServicioId} onChange={(e) => setFormServicioId(e.target.value)}
            options={[{ value: '', label: 'Seleccionar servicio...' }, ...catServicios.map((s) => ({ value: String(s.id), label: s.nombre }))]}
            fullWidth />
          <Input label="Inicio *" type="datetime-local" value={formFechaInicio} onChange={(e) => setFormFechaInicio(e.target.value)} fullWidth />
          <Input label="Fin *" type="datetime-local" value={formFechaFin} onChange={(e) => setFormFechaFin(e.target.value)} fullWidth />
          <div className="sm:col-span-2">
            <Textarea label="Notas" value={formNotas} onChange={(e) => setFormNotas(e.target.value)} placeholder="Observaciones opcionales..." rows={3} fullWidth />
          </div>
        </div>
      </Modal>

      {/* Modal: Editar Cita Real */}
      <Modal
        isOpen={isModalEditarCitaOpen}
        onClose={() => { if (!savingCita) { setIsModalEditarCitaOpen(false); setCitaEditando(null); resetFormCita(); } }}
        title="Editar Cita"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => { setIsModalEditarCitaOpen(false); setCitaEditando(null); resetFormCita(); }} disabled={savingCita}>Cancelar</Button>
            <Button onClick={handleEditarCita} disabled={savingCita}>{savingCita ? 'Guardando...' : 'Guardar'}</Button>
          </>
        }
      >
        {citaError && <p className="text-sm mb-3" style={{ color: 'var(--danger)' }}>{citaError}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Select label="Cliente *" value={formClienteId} onChange={(e) => setFormClienteId(e.target.value)}
              options={[{ value: '', label: 'Seleccionar cliente...' }, ...catClientes.map((c) => ({ value: c.id, label: c.nombre ?? c.email ?? c.id }))]}
              fullWidth />
          </div>
          <Select label="Especialista *" value={formEspecialistaId} onChange={(e) => setFormEspecialistaId(e.target.value)}
            options={[{ value: '', label: 'Seleccionar especialista...' }, ...catUsuarios.map((u) => ({ value: u.id, label: u.nombre ?? u.email }))]}
            fullWidth />
          <Select label="Servicio *" value={formServicioId} onChange={(e) => setFormServicioId(e.target.value)}
            options={[{ value: '', label: 'Seleccionar servicio...' }, ...catServicios.map((s) => ({ value: String(s.id), label: s.nombre }))]}
            fullWidth />
          <Input label="Inicio *" type="datetime-local" value={formFechaInicio} onChange={(e) => setFormFechaInicio(e.target.value)} fullWidth />
          <Input label="Fin *" type="datetime-local" value={formFechaFin} onChange={(e) => setFormFechaFin(e.target.value)} fullWidth />
          <div className="sm:col-span-2">
            <Select
              label="Estado"
              value={formEstadoCita}
              onChange={(e) => setFormEstadoCita(e.target.value)}
              options={[
                { value: 'pendiente', label: 'Pendiente' },
                { value: 'confirmada', label: 'Confirmada' },
                { value: 'en_curso', label: 'En curso' },
                { value: 'completada', label: 'Completada' },
                { value: 'cancelada', label: 'Cancelada' },
                { value: 'reprogramada', label: 'Reprogramada' },
                { value: 'no_asistio', label: 'No asistió' },
              ]}
              fullWidth
            />
          </div>
          {formEstadoCita === 'cancelada' && (
            <div className="sm:col-span-2">
              <Textarea label="Motivo de cancelación" value={formMotivoCancelacion} onChange={(e) => setFormMotivoCancelacion(e.target.value)} placeholder="Describe el motivo..." rows={2} fullWidth />
            </div>
          )}
          <div className="sm:col-span-2">
            <Textarea label="Notas" value={formNotas} onChange={(e) => setFormNotas(e.target.value)} placeholder="Observaciones opcionales..." rows={3} fullWidth />
          </div>
        </div>
      </Modal>

      {/* Modal: Cancelar Cita */}
      <Modal
        isOpen={isModalCancelarOpen}
        onClose={() => { if (!savingCita) { setIsModalCancelarOpen(false); setCitaCancelando(null); } }}
        title="Cancelar Cita"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setIsModalCancelarOpen(false); setCitaCancelando(null); }} disabled={savingCita}>Volver</Button>
            <Button variant="danger" onClick={handleCancelarCita} disabled={savingCita}>{savingCita ? 'Cancelando...' : 'Cancelar cita'}</Button>
          </>
        }
      >
        <Textarea label="Motivo de cancelación" value={cancelMotivo} onChange={(e) => setCancelMotivo(e.target.value)} placeholder="Describe el motivo (opcional)..." rows={3} fullWidth />
      </Modal>

      {/* Modal: Reprogramar Cita */}
      <Modal
        isOpen={isModalReprogramarOpen}
        onClose={() => { if (!savingCita) { setIsModalReprogramarOpen(false); setCitaEditando(null); } }}
        title="Reprogramar Cita"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setIsModalReprogramarOpen(false); setCitaEditando(null); }} disabled={savingCita}>Cancelar</Button>
            <Button onClick={handleReprogramar} disabled={savingCita}>{savingCita ? 'Guardando...' : 'Reprogramar'}</Button>
          </>
        }
      >
        {citaError && <p className="text-sm mb-3" style={{ color: 'var(--danger)' }}>{citaError}</p>}
        <div className="space-y-4">
          <Input label="Nueva fecha/hora de inicio *" type="datetime-local" value={reprFechaInicio} onChange={(e) => setReprFechaInicio(e.target.value)} fullWidth />
          <Input label="Nueva fecha/hora de fin *" type="datetime-local" value={reprFechaFin} onChange={(e) => setReprFechaFin(e.target.value)} fullWidth />
        </div>
      </Modal>
    </AdminLayout>
  );
}
