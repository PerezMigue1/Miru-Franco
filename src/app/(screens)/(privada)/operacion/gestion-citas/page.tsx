'use client';

import { useState, useEffect, useCallback } from 'react';
import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import PageHeader from '../../../../components/ui/PageHeader';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../../components/ui/Table';
import Badge from '../../../../components/ui/Badge';
import Modal from '../../../../components/ui/Modal';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Textarea from '../../../../components/ui/Textarea';
import {
  listarCitas,
  crearCita,
  cancelarCita,
  checkInCita,
  checkOutCita,
  reprogramarCita,
  CitaApi,
  EstadoCita,
} from '../../../../services/citas';
import { listarClientes, ClienteApi } from '../../../../services/clientes';
import { listarEmpleados, EmpleadoApi } from '../../../../services/empleados';
import { getServicios, Servicio } from '../../../../services/servicios';

const estados: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  confirmada: 'success',
  pendiente: 'warning',
  en_curso: 'info',
  completada: 'info',
  reprogramada: 'warning',
  cancelada: 'danger',
  no_asistio: 'danger',
};

/** Combina fecha (YYYY-MM-DD) + hora (HH:mm) en un ISO string. */
function combinar(fecha: string, hora: string): string {
  return new Date(`${fecha}T${hora}:00`).toISOString();
}

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

export default function GestionCitasPage() {
  const [citas, setCitas] = useState<CitaApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Catálogos para selects
  const [clientes, setClientes] = useState<ClienteApi[]>([]);
  const [especialistas, setEspecialistas] = useState<EmpleadoApi[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);

  // Modal crear
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fClienteId, setFClienteId] = useState('');
  const [fEspecialistaId, setFEspecialistaId] = useState('');
  const [fServicioId, setFServicioId] = useState('');
  const [fFecha, setFFecha] = useState('');
  const [fHoraInicio, setFHoraInicio] = useState('');
  const [fHoraFin, setFHoraFin] = useState('');
  const [fNotas, setFNotas] = useState('');

  // Modal reprogramar
  const [isReprogOpen, setIsReprogOpen] = useState(false);
  const [reprogId, setReprogId] = useState<number | null>(null);
  const [rFecha, setRFecha] = useState('');
  const [rHoraInicio, setRHoraInicio] = useState('');
  const [rHoraFin, setRHoraFin] = useState('');
  const [reprogError, setReprogError] = useState<string | null>(null);
  const [reprogSaving, setReprogSaving] = useState(false);

  const cargar = useCallback(() => {
    setLoading(true);
    setError(null);
    listarCitas({ limit: 100 })
      .then(({ data }) => setCitas(data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar las citas'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargar();
    // Catálogos (no bloquean la tabla; si fallan, los selects quedan vacíos)
    listarClientes({ limit: 200 }).then(({ data }) => setClientes(data)).catch(() => {});
    listarEmpleados({ limit: 200 }).then(({ data }) => setEspecialistas(data)).catch(() => {});
    getServicios().then(({ data }) => setServicios(data)).catch(() => {});
  }, [cargar]);

  const resetForm = () => {
    setFClienteId(''); setFEspecialistaId(''); setFServicioId('');
    setFFecha(''); setFHoraInicio(''); setFHoraFin(''); setFNotas('');
    setFormError(null);
  };

  const handleCrear = async () => {
    if (!fClienteId || !fEspecialistaId || !fServicioId || !fFecha || !fHoraInicio || !fHoraFin) {
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
        clienteId: fClienteId,
        especialistaId: fEspecialistaId,
        servicioId: Number(fServicioId),
        fechaHoraInicio: combinar(fFecha, fHoraInicio),
        fechaHoraFin: combinar(fFecha, fHoraFin),
        notas: fNotas.trim() || undefined,
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

  const handleCancelar = async (id: number) => {
    const motivo = window.prompt('Motivo de cancelación:');
    if (!motivo) return;
    try {
      await cancelarCita(id, { motivoCancelacion: motivo });
      cargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo cancelar la cita');
    }
  };

  const handleCheckIn = async (id: number) => {
    try { await checkInCita(id); cargar(); }
    catch (e) { alert(e instanceof Error ? e.message : 'No se pudo hacer check-in'); }
  };
  const handleCheckOut = async (id: number) => {
    try { await checkOutCita(id); cargar(); }
    catch (e) { alert(e instanceof Error ? e.message : 'No se pudo hacer check-out'); }
  };

  const openReprogramar = (c: CitaApi) => {
    setReprogId(c.id);
    const d = new Date(c.fechaHoraInicio);
    setRFecha(isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10));
    setRHoraInicio(fmtHora(c.fechaHoraInicio).replace(/[^0-9:]/g, '') || '');
    setRHoraFin(fmtHora(c.fechaHoraFin).replace(/[^0-9:]/g, '') || '');
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

  return (
    <OperacionLayout>
      <PageHeader
        title="Gestión de Citas"
        subtitle="Administra las citas del salón: agendar, confirmar, modificar o cancelar servicios"
        actions={
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>+ Nueva Cita</Button>
        }
      />

      <Card>
        {loading ? (
          <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>Cargando citas…</p>
        ) : error ? (
          <div className="text-center py-8">
            <p className="mb-3" style={{ color: 'var(--danger)' }}>{error}</p>
            <Button variant="outline" onClick={cargar}>Reintentar</Button>
          </div>
        ) : citas.length === 0 ? (
          <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>
            No hay citas registradas.
          </p>
        ) : (
          <Table headers={['Cliente', 'Especialista', 'Fecha', 'Inicio', 'Fin', 'Servicio', 'Estado', 'Acciones']}>
            {citas.map((cita) => (
              <TableRow key={cita.id}>
                <TableCell>{cita.clienteNombre ?? cita.clienteId}</TableCell>
                <TableCell>{cita.especialistaNombre ?? cita.especialistaId}</TableCell>
                <TableCell>{fmtFecha(cita.fechaHoraInicio)}</TableCell>
                <TableCell>{fmtHora(cita.fechaHoraInicio)}</TableCell>
                <TableCell>{fmtHora(cita.fechaHoraFin)}</TableCell>
                <TableCell>{cita.servicioNombre ?? cita.servicioId}</TableCell>
                <TableCell>
                  <Badge variant={estados[cita.estado] || 'default'}>{cita.estado}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 flex-wrap">
                    {(cita.estado === 'pendiente' || cita.estado === 'confirmada') && (
                      <Button size="sm" variant="primary" onClick={() => handleCheckIn(cita.id)}>Check-in</Button>
                    )}
                    {cita.estado === 'en_curso' && (
                      <Button size="sm" variant="primary" onClick={() => handleCheckOut(cita.id)}>Check-out</Button>
                    )}
                    {!esFinal(cita.estado) && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openReprogramar(cita)}>Reprogramar</Button>
                        <Button size="sm" variant="danger" onClick={() => handleCancelar(cita.id)}>Cancelar</Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        )}
      </Card>

      {/* Modal: Nueva Cita */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { if (!saving) { setIsModalOpen(false); resetForm(); } }}
        title="Nueva Cita"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setIsModalOpen(false); resetForm(); }} disabled={saving}>Cancelar</Button>
            <Button onClick={handleCrear} disabled={saving}>{saving ? 'Agendando…' : 'Agendar Cita'}</Button>
          </>
        }
      >
        {formError && <p className="text-sm mb-3" style={{ color: 'var(--danger)' }}>{formError}</p>}
        <div className="space-y-4">
          <Select
            label="Cliente *"
            value={fClienteId}
            onChange={(e) => setFClienteId(e.target.value)}
            options={[{ value: '', label: 'Seleccionar cliente…' }, ...clientes.map((c) => ({ value: c.id, label: c.nombre ?? c.email ?? c.id }))]}
            fullWidth
          />
          <Select
            label="Especialista *"
            value={fEspecialistaId}
            onChange={(e) => setFEspecialistaId(e.target.value)}
            options={[{ value: '', label: 'Seleccionar especialista…' }, ...especialistas.map((e) => ({ value: e.usuarioId, label: e.nombre ?? e.puesto ?? e.usuarioId }))]}
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
        </div>
      </Modal>

      {/* Modal: Reprogramar */}
      <Modal
        isOpen={isReprogOpen}
        onClose={() => { if (!reprogSaving) { setIsReprogOpen(false); setReprogId(null); } }}
        title="Reprogramar Cita"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setIsReprogOpen(false); setReprogId(null); }} disabled={reprogSaving}>Cancelar</Button>
            <Button onClick={handleReprogramar} disabled={reprogSaving}>{reprogSaving ? 'Guardando…' : 'Reprogramar'}</Button>
          </>
        }
      >
        {reprogError && <p className="text-sm mb-3" style={{ color: 'var(--danger)' }}>{reprogError}</p>}
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
