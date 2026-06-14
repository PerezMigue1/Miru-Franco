'use client';

import { useState, useEffect } from 'react';
import { listarCalendario, listarCitasDelDia, crearCita, CitaApi } from '../../../services/citas';
import { listarClientes, ClienteApi } from '../../../services/clientes';
import { getUsuarios, type Usuario } from '../../../services/usuarios';
import { getServicios, type Servicio } from '../../../services/servicios';
import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Textarea from '../../../components/ui/Textarea';

interface CitaDia {
  hora: string;
  cliente: string;
  servicio: string;
  especialista: string;
  estado: string;
}

function mapearCitaDia(c: CitaApi): CitaDia {
  const fechaHora = c.fechaHoraInicio ? new Date(c.fechaHoraInicio) : null;
  return {
    hora: fechaHora ? fechaHora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '-',
    cliente: c.clienteNombre ?? '-',
    servicio: c.servicioNombre ?? '-',
    especialista: c.especialistaNombre ?? '-',
    estado: c.estado,
  };
}

export default function AgendaCalendarioPage() {
  const [citasHoy, setCitasHoy] = useState<CitaDia[]>([]);
  const [citasPorDia, setCitasPorDia] = useState<Record<number, number>>({});
  const [mesActual] = useState(() => new Date());

  // CRUD: nueva cita
  const [isModalNuevaCitaOpen, setIsModalNuevaCitaOpen] = useState(false);
  const [catClientes, setCatClientes] = useState<ClienteApi[]>([]);
  const [catUsuarios, setCatUsuarios] = useState<Usuario[]>([]);
  const [catServicios, setCatServicios] = useState<Servicio[]>([]);
  const [formClienteId, setFormClienteId] = useState('');
  const [formEspecialistaId, setFormEspecialistaId] = useState('');
  const [formServicioId, setFormServicioId] = useState('');
  const [formFechaInicio, setFormFechaInicio] = useState('');
  const [formFechaFin, setFormFechaFin] = useState('');
  const [formNotas, setFormNotas] = useState('');
  const [savingCita, setSavingCita] = useState(false);
  const [citaError, setCitaError] = useState<string | null>(null);

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
    setCitaError(null);
  };

  const openNuevaCita = async () => { resetFormCita(); await cargarCatalogos(); setIsModalNuevaCitaOpen(true); };

  const handleNuevaCita = async () => {
    if (!formClienteId || !formEspecialistaId || !formServicioId || !formFechaInicio || !formFechaFin) {
      setCitaError('Completa todos los campos requeridos'); return;
    }
    setSavingCita(true); setCitaError(null);
    try {
      await crearCita({ clienteId: formClienteId, especialistaId: formEspecialistaId, servicioId: Number(formServicioId), fechaHoraInicio: formFechaInicio, fechaHoraFin: formFechaFin, notas: formNotas || undefined });
      setIsModalNuevaCitaOpen(false); resetFormCita();
      // recargar citas del día
      const hoy = new Date().toISOString().slice(0, 10);
      listarCitasDelDia(hoy).then((data) => setCitasHoy(data.map(mapearCitaDia))).catch(() => {});
    } catch (e) { setCitaError(e instanceof Error ? e.message : 'Error al crear cita'); }
    finally { setSavingCita(false); }
  };

  useEffect(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    listarCitasDelDia(hoy)
      .then((data) => setCitasHoy(data.map(mapearCitaDia)))
      .catch(() => {});

    const inicioMes = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1).toISOString().slice(0, 10);
    const finMes = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0).toISOString().slice(0, 10);
    listarCalendario(inicioMes, finMes)
      .then((data) => {
        const conteo: Record<number, number> = {};
        data.forEach((c) => {
          if (c.fechaHoraInicio) {
            const dia = new Date(c.fechaHoraInicio).getDate();
            conteo[dia] = (conteo[dia] ?? 0) + 1;
          }
        });
        setCitasPorDia(conteo);
      })
      .catch(() => {});
  }, [mesActual]);

  const diasEnMes = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0).getDate();
  const nombreMes = mesActual.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  return (
    <AdminLayout>
      <PageHeader
        title="Agenda / Calendario"
        subtitle="Visualiza y gestiona la disponibilidad del salón y las citas programadas"
        actions={
          <div className="flex gap-2">
            <Button variant="outline">Vista Semanal</Button>
            <Button variant="outline">Vista Mensual</Button>
            <Button onClick={openNuevaCita}>+ Nueva Cita</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3">
          <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Calendario - {nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)}
          </h2>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((dia) => (
              <div
                key={dia}
                className="text-center font-semibold py-2"
                style={{ color: 'var(--menu-texto-principal)' }}
              >
                {dia}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: diasEnMes }, (_, i) => i + 1).map((dia) => (
              <div
                key={dia}
                className="aspect-square p-2 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                style={{
                  backgroundColor: dia === new Date().getDate() ? 'var(--fondos-suaves)' : 'var(--fondo-general)',
                  borderColor: 'var(--fondos-suaves)',
                }}
              >
                <div className="text-sm font-semibold mb-1" style={{ color: 'var(--menu-texto-principal)' }}>
                  {dia}
                </div>
                {citasPorDia[dia] ? (
                  <div className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                    {citasPorDia[dia]} cita{citasPorDia[dia] !== 1 ? 's' : ''}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Citas de Hoy
          </h2>
          <div className="space-y-3">
            {citasHoy.map((cita, index) => (
              <div
                key={index}
                className="p-3 rounded-lg"
                style={{ backgroundColor: 'var(--fondos-suaves)' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
                      {cita.hora}
                    </p>
                    <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                      {cita.cliente}
                    </p>
                  </div>
                  <Badge variant={cita.estado === 'confirmada' ? 'success' : 'warning'}>
                    {cita.estado}
                  </Badge>
                </div>
                <p className="text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                  {cita.servicio}
                </p>
                <p className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                  {cita.especialista}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Modal: Nueva Cita */}
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
    </AdminLayout>
  );
}
