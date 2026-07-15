'use client';

import { useState, useEffect, useCallback } from 'react';
import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../../components/ui/Table';
import Badge from '../../../../components/ui/Badge';
import Modal from '../../../../components/ui/Modal';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Textarea from '../../../../components/ui/Textarea';
import { listarSeguimientos, crearSeguimiento, SeguimientoApi } from '../../../../services/seguimientos';
import { listarClientes, ClienteApi } from '../../../../services/clientes';
import { AlertTriangle, ClipboardCheck, ThumbsUp } from 'lucide-react';

function fmt(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('es-MX');
}

export default function SeguimientoPostServicioPage() {
  const [seguimientos, setSeguimientos] = useState<SeguimientoApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientes, setClientes] = useState<ClienteApi[]>([]);

  /** Toggle de filtro: por defecto solo lo que requiere acción (cola accionable del día). */
  const [soloRequiereAccion, setSoloRequiereAccion] = useState(true);

  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fUsuarioId, setFUsuarioId] = useState('');
  const [fCitaId, setFCitaId] = useState('');
  const [fNotas, setFNotas] = useState('');
  const [fFecha, setFFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [fSatisfaccion, setFSatisfaccion] = useState('');
  const [fRequiereAccion, setFRequiereAccion] = useState('false');

  const cargar = useCallback(() => {
    setLoading(true);
    setError(null);
    listarSeguimientos({ requiereAccion: soloRequiereAccion ? true : undefined, limit: 100 })
      .then(({ data }) => setSeguimientos(data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar los seguimientos'))
      .finally(() => setLoading(false));
  }, [soloRequiereAccion]);

  useEffect(() => {
    cargar();
    listarClientes({ limit: 200 }).then(({ data }) => setClientes(data)).catch(() => {});
  }, [cargar]);

  const reset = () => {
    setFUsuarioId(''); setFCitaId(''); setFNotas(''); setFFecha(new Date().toISOString().slice(0, 10));
    setFSatisfaccion(''); setFRequiereAccion('false'); setFormError(null);
  };

  const handleCrear = async () => {
    if (!fUsuarioId || !fNotas.trim() || !fFecha) {
      setFormError('Cliente, notas y fecha de contacto son obligatorios');
      return;
    }
    setSaving(true); setFormError(null);
    try {
      await crearSeguimiento({
        usuarioId: fUsuarioId,
        citaId: fCitaId ? Number(fCitaId) : undefined,
        notas: fNotas.trim(),
        fechaContacto: new Date(`${fFecha}T09:00:00`).toISOString(),
        satisfaccion: fSatisfaccion ? Number(fSatisfaccion) : undefined,
        requiereAccion: fRequiereAccion === 'true',
      });
      setIsOpen(false); reset(); cargar();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'No se pudo registrar el seguimiento');
    } finally {
      setSaving(false);
    }
  };

  const requierenAccion = seguimientos.filter((s) => s.requiereAccion).length;
  const bienEvaluados = seguimientos.filter((s) => (s.satisfaccion ?? 0) >= 4).length;

  return (
    <OperacionLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              Seguimiento Post-Servicio
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              Da seguimiento a la satisfacción de los clientes tras el servicio
            </p>
          </div>
          <Button onClick={() => { reset(); setIsOpen(true); }}>+ Nuevo Seguimiento</Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="elevated" padding="lg" style={requierenAccion > 0 ? { boxShadow: '0 0 0 2px var(--danger)' } : undefined}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <AlertTriangle size={20} style={{ color: 'var(--danger-texto)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Requieren acción</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--danger-texto)' }}>{loading ? '…' : requierenAccion}</p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <ClipboardCheck size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Total en vista</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : seguimientos.length}</p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <ThumbsUp size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Bien evaluados</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : bienEvaluados}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filtro toggle */}
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={soloRequiereAccion ? 'primary' : 'outline'}
            onClick={() => setSoloRequiereAccion(true)}
          >
            Solo requiere acción
          </Button>
          <Button
            type="button"
            size="sm"
            variant={!soloRequiereAccion ? 'primary' : 'outline'}
            onClick={() => setSoloRequiereAccion(false)}
          >
            Todos
          </Button>
        </div>

        {/* Listado */}
        <Card variant="elevated" padding="lg">
          {loading ? (
            <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>Cargando seguimientos…</p>
          ) : error ? (
            <div className="text-center py-8">
              <p className="mb-3" style={{ color: 'var(--danger-texto)' }}>{error}</p>
              <Button variant="outline" onClick={cargar}>Reintentar</Button>
            </div>
          ) : seguimientos.length === 0 ? (
            <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>
              {soloRequiereAccion ? 'No hay seguimientos que requieran acción.' : 'No hay seguimientos registrados.'}
            </p>
          ) : (
            <Table headers={['Cliente', 'Fecha contacto', 'Satisfacción', '¿Requiere acción?', 'Notas']} headerSutil>
              {seguimientos.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-semibold" rowPadding="lg">{s.clienteNombre ?? 'Cliente sin nombre'}</TableCell>
                  <TableCell rowPadding="lg">{fmt(s.fechaContacto)}</TableCell>
                  <TableCell rowPadding="lg">{s.satisfaccion != null ? `${s.satisfaccion}/5` : '-'}</TableCell>
                  <TableCell rowPadding="lg">
                    <Badge variant={s.requiereAccion ? 'danger' : 'success'}>
                      {s.requiereAccion ? 'Sí' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate" rowPadding="lg">{s.notas}</TableCell>
                </TableRow>
              ))}
            </Table>
          )}
        </Card>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={() => { if (!saving) { setIsOpen(false); reset(); } }}
        title="Nuevo Seguimiento"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setIsOpen(false); reset(); }} disabled={saving}>Cancelar</Button>
            <Button onClick={handleCrear} disabled={saving}>{saving ? 'Guardando…' : 'Registrar'}</Button>
          </>
        }
      >
        {formError && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{formError}</p>}
        <div className="space-y-4">
          <Select
            label="Cliente *"
            value={fUsuarioId}
            onChange={(e) => setFUsuarioId(e.target.value)}
            options={[{ value: '', label: 'Seleccionar cliente…' }, ...clientes.map((c) => ({ value: c.id, label: c.nombre ?? c.email ?? c.id }))]}
            fullWidth
          />
          <Input label="Fecha de contacto *" type="date" value={fFecha} onChange={(e) => setFFecha(e.target.value)} fullWidth />
          <Input label="ID de cita (opcional)" type="number" min={1} value={fCitaId} onChange={(e) => setFCitaId(e.target.value)} placeholder="Ej. 42" fullWidth />
          <Select
            label="Satisfacción (1-5)"
            value={fSatisfaccion}
            onChange={(e) => setFSatisfaccion(e.target.value)}
            options={[
              { value: '', label: 'Sin calificar' },
              { value: '1', label: '1 - Muy insatisfecho' },
              { value: '2', label: '2' },
              { value: '3', label: '3' },
              { value: '4', label: '4' },
              { value: '5', label: '5 - Muy satisfecho' },
            ]}
            fullWidth
          />
          <Select
            label="¿Requiere acción?"
            value={fRequiereAccion}
            onChange={(e) => setFRequiereAccion(e.target.value)}
            options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Sí' }]}
            fullWidth
          />
          <Textarea label="Notas *" value={fNotas} onChange={(e) => setFNotas(e.target.value)} rows={3} fullWidth />
        </div>
      </Modal>
    </OperacionLayout>
  );
}
