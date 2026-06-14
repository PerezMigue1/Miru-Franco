'use client';

import { useState, useEffect } from 'react';
import { listarQuejas, crearQueja, actualizarQueja, QuejaApi, EstadoQueja } from '../../../services/quejas';
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

interface CasoFila {
  id: number;
  cliente: string;
  servicio: string;
  fecha: string;
  tipo: string;
  estado: string;
  descripcion: string;
}

const ESTADO_UI: Record<string, string> = {
  abierta: 'nuevo',
  en_proceso: 'en_revision',
  resuelta: 'resuelto',
  cerrada: 'cerrado',
};

function mapearQueja(q: QuejaApi): CasoFila {
  return {
    id: q.id,
    cliente: q.clienteNombre ?? '-',
    servicio: '-',
    fecha: q.creadoEn ? q.creadoEn.slice(0, 10) : '-',
    tipo: 'Queja',
    estado: ESTADO_UI[q.estado] ?? q.estado,
    descripcion: q.descripcion,
  };
}

export default function QuejasGarantiasPage() {
  const [casos, setCasos] = useState<CasoFila[]>([]);
  const [quejasRaw, setQuejasRaw] = useState<QuejaApi[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal editar estado
  const [isModalEditarOpen, setIsModalEditarOpen] = useState(false);
  const [quejaEditando, setQuejaEditando] = useState<QuejaApi | null>(null);
  const [formEstado, setFormEstado] = useState<EstadoQueja>('abierta');
  const [savingQueja, setSavingQueja] = useState(false);
  const [quejaError, setQuejaError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  // Formulario inline creación
  const [catClientes, setCatClientes] = useState<ClienteApi[]>([]);
  const [formUsuarioId, setFormUsuarioId] = useState('');
  const [formAsunto, setFormAsunto] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');

  const cargar = () => {
    setLoading(true);
    listarQuejas()
      .then(({ data }) => { setQuejasRaw(data); setCasos(data.map(mapearQueja)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
    listarClientes().then(({ data }) => setCatClientes(data)).catch(() => {});
  }, []);

  const resolver = async (id: number) => {
    setSavingId(id);
    try { await actualizarQueja(id, { estado: 'resuelta' }); cargar(); }
    finally { setSavingId(null); }
  };

  const openEditar = (id: number) => {
    const raw = quejasRaw.find((q) => q.id === id);
    if (!raw) return;
    setQuejaEditando(raw);
    setFormEstado(raw.estado);
    setQuejaError(null);
    setIsModalEditarOpen(true);
  };

  const handleActualizarEstado = async () => {
    if (!quejaEditando) return;
    setSavingQueja(true); setQuejaError(null);
    try {
      await actualizarQueja(quejaEditando.id, { estado: formEstado });
      setIsModalEditarOpen(false); setQuejaEditando(null); cargar();
    } catch (e) { setQuejaError(e instanceof Error ? e.message : 'Error al actualizar'); }
    finally { setSavingQueja(false); }
  };

  const handleCrearQueja = async () => {
    if (!formAsunto.trim() || !formDescripcion.trim()) {
      setQuejaError('Tipo y descripción son requeridos'); return;
    }
    setSavingQueja(true); setQuejaError(null);
    try {
      await crearQueja({ asunto: formAsunto.trim(), descripcion: formDescripcion.trim(), usuarioId: formUsuarioId || undefined });
      setFormAsunto(''); setFormDescripcion(''); setFormUsuarioId(''); cargar();
    } catch (e) { setQuejaError(e instanceof Error ? e.message : 'Error al crear caso'); }
    finally { setSavingQueja(false); }
  };

  const estados = {
    nuevo: { label: 'Nuevo', variant: 'info' as const },
    en_revision: { label: 'En Revisión', variant: 'warning' as const },
    resuelto: { label: 'Resuelto', variant: 'success' as const },
    cerrado: { label: 'Cerrado', variant: 'default' as const },
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Manejo de Quejas, Sugerencias y Garantías"
        subtitle="Gestiona las garantías de satisfacción y resolución de casos"
      />

      <Card>
        <Table headers={['Cliente', 'Servicio', 'Fecha', 'Tipo', 'Descripción', 'Estado', 'Acciones']}>
          {casos.map((caso) => (
            <TableRow key={caso.id}>
              <TableCell className="font-semibold">{caso.cliente}</TableCell>
              <TableCell>{caso.servicio}</TableCell>
              <TableCell>{caso.fecha}</TableCell>
              <TableCell>
                <Badge variant={caso.tipo === 'Garantía' ? 'warning' : caso.tipo === 'Queja' ? 'danger' : 'info'}>
                  {caso.tipo}
                </Badge>
              </TableCell>
              <TableCell className="max-w-xs truncate">{caso.descripcion}</TableCell>
              <TableCell>
                <Badge variant={estados[caso.estado as keyof typeof estados]?.variant || 'default'}>
                  {estados[caso.estado as keyof typeof estados]?.label || caso.estado}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditar(caso.id)}>Ver Detalles</Button>
                  <Button size="sm" onClick={() => resolver(caso.id)} disabled={savingId === caso.id}>
                    {savingId === caso.id ? 'Guardando...' : 'Resolver'}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>

      <Card className="mt-6">
        <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
          Registrar Nuevo Caso
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Select
              label="Cliente"
              value={formUsuarioId}
              onChange={(e) => setFormUsuarioId(e.target.value)}
              options={[
                { value: '', label: 'Sin asignar / anónimo' },
                ...catClientes.map((c) => ({ value: c.id, label: c.nombre ?? c.email ?? c.id })),
              ]}
              fullWidth
            />
          </div>
          <Select
            label="Tipo"
            value={formAsunto}
            onChange={(e) => setFormAsunto(e.target.value)}
            options={[
              { value: '', label: 'Seleccionar tipo...' },
              { value: 'Queja', label: 'Queja' },
              { value: 'Garantía', label: 'Garantía' },
              { value: 'Sugerencia', label: 'Sugerencia' },
            ]}
            fullWidth
          />
          <Input label="Fecha del Servicio" type="date" fullWidth />
          <div className="md:col-span-2">
            <Textarea label="Descripción" value={formDescripcion} onChange={(e) => setFormDescripcion(e.target.value)} placeholder="Detalles del caso..." rows={4} fullWidth />
          </div>
          {quejaError && <p className="md:col-span-2 text-sm" style={{ color: 'var(--danger)' }}>{quejaError}</p>}
          <div className="md:col-span-2">
            <Button onClick={handleCrearQueja} disabled={savingQueja}>{savingQueja ? 'Guardando...' : 'Registrar Caso'}</Button>
          </div>
        </div>
      </Card>
      {/* Modal: Editar Estado */}
      <Modal
        isOpen={isModalEditarOpen}
        onClose={() => { if (!savingQueja) { setIsModalEditarOpen(false); setQuejaEditando(null); } }}
        title="Actualizar Caso"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setIsModalEditarOpen(false); setQuejaEditando(null); }} disabled={savingQueja}>Cancelar</Button>
            <Button onClick={handleActualizarEstado} disabled={savingQueja}>{savingQueja ? 'Guardando...' : 'Guardar'}</Button>
          </>
        }
      >
        {quejaError && <p className="text-sm mb-3" style={{ color: 'var(--danger)' }}>{quejaError}</p>}
        {quejaEditando && (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>{quejaEditando.asunto}</p>
            <p className="text-sm mb-4" style={{ color: 'var(--menu-texto-principal)' }}>{quejaEditando.descripcion}</p>
            <Select
              label="Estado"
              value={formEstado}
              onChange={(e) => setFormEstado(e.target.value as EstadoQueja)}
              options={[
                { value: 'abierta', label: 'Abierta' },
                { value: 'en_proceso', label: 'En Proceso' },
                { value: 'resuelta', label: 'Resuelta' },
                { value: 'cerrada', label: 'Cerrada' },
              ]}
              fullWidth
            />
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
