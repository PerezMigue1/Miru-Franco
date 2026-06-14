'use client';

import { useState, useEffect } from 'react';
import { listarSeguimientos, crearSeguimiento, SeguimientoApi } from '../../../services/seguimientos';
import { listarClientes, type ClienteApi } from '../../../services/clientes';
import Modal from '../../../components/ui/Modal';
import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Textarea from '../../../components/ui/Textarea';

interface SeguimientoFila {
  id: number;
  cliente: string;
  servicio: string;
  fechaServicio: string;
  fechaSeguimiento: string;
  estado: string;
  notas: string;
}

function mapearSeguimiento(s: SeguimientoApi): SeguimientoFila {
  const satisfaccion = s.satisfaccion;
  let estado = 'pendiente';
  if (satisfaccion != null) {
    estado = satisfaccion >= 4 ? 'satisfactoria' : 'problema';
  }
  return {
    id: s.id,
    cliente: s.clienteNombre ?? '-',
    servicio: '-',
    fechaServicio: s.fechaContacto ? s.fechaContacto.slice(0, 10) : '-',
    fechaSeguimiento: s.creadoEn ? s.creadoEn.slice(0, 10) : 'Pendiente',
    estado,
    notas: s.notas || '-',
  };
}

export default function SeguimientoPostServicioPage() {
  const [seguimientos, setSeguimientos] = useState<SeguimientoFila[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal crear seguimiento
  const [isModalCrearOpen, setIsModalCrearOpen] = useState(false);
  const [catClientes, setCatClientes] = useState<ClienteApi[]>([]);
  const [formUsuarioId, setFormUsuarioId] = useState('');
  const [formCitaId, setFormCitaId] = useState('');
  const [formNotas, setFormNotas] = useState('');
  const [formFechaContacto, setFormFechaContacto] = useState('');
  const [formSatisfaccion, setFormSatisfaccion] = useState('');
  const [formRequiereAccion, setFormRequiereAccion] = useState('no');
  const [savingSeg, setSavingSeg] = useState(false);
  const [segError, setSegError] = useState<string | null>(null);

  const cargar = () => {
    setLoading(true);
    listarSeguimientos({ requiereAccion: true })
      .then(({ data }) => setSeguimientos(data.map(mapearSeguimiento)))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const openCrear = async () => {
    setFormUsuarioId(''); setFormCitaId(''); setFormNotas(''); setFormFechaContacto(new Date().toISOString().slice(0, 10));
    setFormSatisfaccion(''); setFormRequiereAccion('no'); setSegError(null);
    try {
      const { data } = await listarClientes();
      setCatClientes(data);
    } catch { setCatClientes([]); }
    setIsModalCrearOpen(true);
  };

  const handleCrearSeguimiento = async () => {
    if (!formUsuarioId || !formNotas.trim() || !formFechaContacto) {
      setSegError('Usuario, notas y fecha de contacto son requeridos'); return;
    }
    setSavingSeg(true); setSegError(null);
    try {
      await crearSeguimiento({
        usuarioId: formUsuarioId,
        citaId: formCitaId ? Number(formCitaId) : undefined,
        notas: formNotas.trim(),
        fechaContacto: formFechaContacto,
        satisfaccion: formSatisfaccion ? Number(formSatisfaccion) : undefined,
        requiereAccion: formRequiereAccion === 'si',
      });
      setIsModalCrearOpen(false); cargar();
    } catch (e) { setSegError(e instanceof Error ? e.message : 'Error al crear seguimiento'); }
    finally { setSavingSeg(false); }
  };

  const estados = {
    satisfactoria: { label: 'Satisfactoria', variant: 'success' as const },
    problema: { label: 'Con Problemas', variant: 'warning' as const },
    pendiente: { label: 'Pendiente', variant: 'info' as const },
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Seguimiento Post-Servicio"
        subtitle="Realiza seguimiento a clientas después de servicios, especialmente tratamientos químicos"
        actions={<Button onClick={openCrear}>+ Nuevo Seguimiento</Button>}
      />

      <Card>
        <Table headers={['Cliente', 'Servicio', 'Fecha Servicio', 'Fecha Seguimiento', 'Estado', 'Notas', 'Acciones']}>
          {seguimientos.map((seguimiento) => (
            <TableRow key={seguimiento.id}>
              <TableCell className="font-semibold">{seguimiento.cliente}</TableCell>
              <TableCell>{seguimiento.servicio}</TableCell>
              <TableCell>{seguimiento.fechaServicio}</TableCell>
              <TableCell>{seguimiento.fechaSeguimiento}</TableCell>
              <TableCell>
                <Badge variant={estados[seguimiento.estado as keyof typeof estados]?.variant || 'default'}>
                  {estados[seguimiento.estado as keyof typeof estados]?.label || seguimiento.estado}
                </Badge>
              </TableCell>
              <TableCell className="max-w-xs truncate">{seguimiento.notas}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Ver Detalles</Button>
                  {seguimiento.estado === 'pendiente' && (
                    <Button size="sm" onClick={openCrear}>Realizar Seguimiento</Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>

      <Card className="mt-6">
        <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
          Nuevo Seguimiento
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Cliente" placeholder="Nombre del cliente" fullWidth />
          <Input label="Servicio Realizado" placeholder="Tipo de servicio" fullWidth />
          <Input label="Fecha del Servicio" type="date" fullWidth />
          <Input label="Fecha de Seguimiento" type="date" fullWidth />
          <Select
            label="Resultado"
            options={[
              { value: 'satisfactoria', label: 'Satisfactoria' },
              { value: 'problema', label: 'Con Problemas' },
              { value: 'pendiente', label: 'Pendiente' },
            ]}
            fullWidth
          />
          <div className="md:col-span-2">
            <Textarea label="Notas del Seguimiento" placeholder="Resultado del seguimiento, dudas resueltas, productos usados..." rows={4} fullWidth />
          </div>
          <div className="md:col-span-2">
            <Button fullWidth>Registrar Seguimiento</Button>
          </div>
        </div>
      </Card>

      {/* Modal: Nuevo Seguimiento */}
      <Modal
        isOpen={isModalCrearOpen}
        onClose={() => { if (!savingSeg) setIsModalCrearOpen(false); }}
        title="Nuevo Seguimiento"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalCrearOpen(false)} disabled={savingSeg}>Cancelar</Button>
            <Button onClick={handleCrearSeguimiento} disabled={savingSeg}>{savingSeg ? 'Guardando...' : 'Registrar'}</Button>
          </>
        }
      >
        {segError && <p className="text-sm mb-3" style={{ color: 'var(--danger)' }}>{segError}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Select
              label="Cliente *"
              value={formUsuarioId}
              onChange={(e) => setFormUsuarioId(e.target.value)}
              options={[{ value: '', label: 'Seleccionar cliente...' }, ...catClientes.map((c) => ({ value: c.id, label: c.nombre ?? c.email ?? c.id }))]}
              fullWidth
            />
          </div>
          <Input label="Fecha de contacto *" type="date" value={formFechaContacto} onChange={(e) => setFormFechaContacto(e.target.value)} fullWidth />
          <Input label="ID de cita (opcional)" type="number" min={1} value={formCitaId} onChange={(e) => setFormCitaId(e.target.value)} placeholder="Ej. 42" fullWidth />
          <Select
            label="Satisfacción (1-5)"
            value={formSatisfaccion}
            onChange={(e) => setFormSatisfaccion(e.target.value)}
            options={[
              { value: '', label: 'No aplica' },
              { value: '1', label: '1 — Muy insatisfecha' },
              { value: '2', label: '2 — Insatisfecha' },
              { value: '3', label: '3 — Regular' },
              { value: '4', label: '4 — Satisfecha' },
              { value: '5', label: '5 — Muy satisfecha' },
            ]}
            fullWidth
          />
          <Select
            label="¿Requiere acción?"
            value={formRequiereAccion}
            onChange={(e) => setFormRequiereAccion(e.target.value)}
            options={[{ value: 'no', label: 'No' }, { value: 'si', label: 'Sí' }]}
            fullWidth
          />
          <div className="sm:col-span-2">
            <Textarea label="Notas *" value={formNotas} onChange={(e) => setFormNotas(e.target.value)} placeholder="Resultado del seguimiento, observaciones..." rows={4} fullWidth />
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
