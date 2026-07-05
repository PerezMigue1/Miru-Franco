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
import { listarSeguimientos, crearSeguimiento, SeguimientoApi } from '../../../../services/seguimientos';
import { listarClientes, ClienteApi } from '../../../../services/clientes';

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

  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fUsuarioId, setFUsuarioId] = useState('');
  const [fNotas, setFNotas] = useState('');
  const [fFecha, setFFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [fSatisfaccion, setFSatisfaccion] = useState('');
  const [fRequiereAccion, setFRequiereAccion] = useState('false');

  const cargar = useCallback(() => {
    setLoading(true);
    setError(null);
    listarSeguimientos({ limit: 100 })
      .then(({ data }) => setSeguimientos(data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar los seguimientos'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargar();
    listarClientes({ limit: 200 }).then(({ data }) => setClientes(data)).catch(() => {});
  }, [cargar]);

  const reset = () => {
    setFUsuarioId(''); setFNotas(''); setFFecha(new Date().toISOString().slice(0, 10));
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

  return (
    <OperacionLayout>
      <PageHeader
        title="Seguimiento Post-Servicio"
        subtitle="Da seguimiento a la satisfacción de los clientes tras el servicio"
        actions={<Button onClick={() => { reset(); setIsOpen(true); }}>+ Nuevo Seguimiento</Button>}
      />

      <Card>
        {loading ? (
          <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>Cargando seguimientos…</p>
        ) : error ? (
          <div className="text-center py-8">
            <p className="mb-3" style={{ color: 'var(--danger)' }}>{error}</p>
            <Button variant="outline" onClick={cargar}>Reintentar</Button>
          </div>
        ) : seguimientos.length === 0 ? (
          <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>
            No hay seguimientos registrados.
          </p>
        ) : (
          <Table headers={['Cliente', 'Fecha contacto', 'Satisfacción', '¿Requiere acción?', 'Notas']}>
            {seguimientos.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.clienteNombre ?? s.usuarioId}</TableCell>
                <TableCell>{fmt(s.fechaContacto)}</TableCell>
                <TableCell>{s.satisfaccion != null ? `${s.satisfaccion}/5` : '-'}</TableCell>
                <TableCell>
                  <Badge variant={s.requiereAccion ? 'danger' : 'success'}>
                    {s.requiereAccion ? 'Sí' : 'No'}
                  </Badge>
                </TableCell>
                <TableCell>{s.notas}</TableCell>
              </TableRow>
            ))}
          </Table>
        )}
      </Card>

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
        {formError && <p className="text-sm mb-3" style={{ color: 'var(--danger)' }}>{formError}</p>}
        <div className="space-y-4">
          <Select
            label="Cliente *"
            value={fUsuarioId}
            onChange={(e) => setFUsuarioId(e.target.value)}
            options={[{ value: '', label: 'Seleccionar cliente…' }, ...clientes.map((c) => ({ value: c.id, label: c.nombre ?? c.email ?? c.id }))]}
            fullWidth
          />
          <Input label="Fecha de contacto *" type="date" value={fFecha} onChange={(e) => setFFecha(e.target.value)} fullWidth />
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
