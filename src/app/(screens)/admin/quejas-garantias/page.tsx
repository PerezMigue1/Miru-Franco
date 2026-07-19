'use client';

import { useState, useEffect } from 'react';
import { listarQuejas, crearQueja, actualizarQueja, QuejaApi, EstadoQueja } from '../../../services/quejas';
import { listarClientes, type ClienteApi } from '../../../services/clientes';
import Modal from '../../../components/ui/Modal';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Textarea from '../../../components/ui/Textarea';
import { AlertTriangle, CheckCircle2, ClipboardList, Inbox } from 'lucide-react';

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
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    listarQuejas()
      .then(({ data }) => { setQuejasRaw(data); setCasos(data.map(mapearQueja)); })
      .catch(() => setError('Error al cargar casos'))
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

  const nuevos = casos.filter((c) => c.estado === 'nuevo').length;
  const enRevision = casos.filter((c) => c.estado === 'en_revision').length;
  const resueltos = casos.filter((c) => c.estado === 'resuelto' || c.estado === 'cerrado').length;

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div>
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
            Quejas y Garantías
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
            {casos.length} caso{casos.length === 1 ? '' : 's'} registrados
          </p>
        </div>

        {error && (
          <div className="bg-red-600 border border-red-700 text-white px-4 py-3 rounded text-xs font-bold shadow-md">
            {error}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card
            variant="elevated"
            padding="lg"
            style={nuevos > 0 ? { boxShadow: '0 0 0 1.5px var(--danger), 0 4px 12px rgba(0,0,0,0.15)' } : undefined}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: nuevos > 0 ? 'rgba(113, 0, 20, 0.15)' : 'var(--fondos-suaves)' }}>
                <Inbox size={20} style={{ color: nuevos > 0 ? 'var(--danger)' : 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Nuevos</p>
                <p className="text-3xl font-bold mt-0.5" style={{ color: nuevos > 0 ? 'var(--danger-texto)' : 'var(--menu-texto-principal)' }}>{nuevos}</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <AlertTriangle size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>En revisión</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{enRevision}</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <CheckCircle2 size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Resueltos</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{resueltos}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Listado */}
        <Card variant="elevated" padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList size={18} style={{ color: 'var(--hover)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>Casos</h2>
          </div>
        {loading ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>Cargando casos…</p>
        ) : casos.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>No hay casos registrados.</p>
        ) : (
        <Table headers={['Cliente', 'Servicio', 'Fecha', 'Tipo', 'Descripción', 'Estado', 'Acciones']} headerSutil>
          {casos.map((caso) => (
            <TableRow key={caso.id}>
              <TableCell className="font-semibold" rowPadding="lg">{caso.cliente}</TableCell>
              <TableCell rowPadding="lg">{caso.servicio}</TableCell>
              <TableCell rowPadding="lg">{caso.fecha}</TableCell>
              <TableCell rowPadding="lg">
                <Badge variant={caso.tipo === 'Garantía' ? 'warning' : caso.tipo === 'Queja' ? 'danger' : 'info'}>
                  {caso.tipo}
                </Badge>
              </TableCell>
              <TableCell className="max-w-xs truncate" rowPadding="lg">{caso.descripcion}</TableCell>
              <TableCell rowPadding="lg">
                <Badge variant={estados[caso.estado as keyof typeof estados]?.variant || 'default'}>
                  {estados[caso.estado as keyof typeof estados]?.label || caso.estado}
                </Badge>
              </TableCell>
              <TableCell rowPadding="lg">
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
        )}
        </Card>

        <Card variant="elevated" padding="lg">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
          Registrar nuevo caso
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
          {quejaError && <p className="md:col-span-2 text-sm" style={{ color: 'var(--danger-texto)' }}>{quejaError}</p>}
          <div className="md:col-span-2">
            <Button onClick={handleCrearQueja} disabled={savingQueja}>{savingQueja ? 'Guardando...' : 'Registrar Caso'}</Button>
          </div>
        </div>
        </Card>
      </div>
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
        {quejaError && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{quejaError}</p>}
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
