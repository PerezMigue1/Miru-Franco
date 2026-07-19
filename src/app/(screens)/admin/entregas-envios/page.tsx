'use client';

import { useState, useEffect } from 'react';
import { listarPedidos, listarEnviosPorPedido, actualizarEnvio, PedidoApi, EnvioApi } from '../../../services/ecommerce';
import Modal from '../../../components/ui/Modal';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Textarea from '../../../components/ui/Textarea';
import { CheckCircle2, Truck, Clock3 } from 'lucide-react';

interface EntregaFila {
  id: number;
  pedidoId: number;
  cliente: string;
  direccion: string;
  tipo: string;
  zona: string;
  estado: string;
  mensajero: string;
}

function mapearEnvio(e: EnvioApi, pedido: PedidoApi): EntregaFila {
  return {
    id: e.id,
    pedidoId: pedido.id,
    cliente: pedido.usuarioId ?? '-',
    direccion: pedido.direccionTextoCompleta ?? '-',
    tipo: 'Domicilio',
    zona: '-',
    estado: e.estadoEnvio ?? 'preparado',
    mensajero: e.empresaEnvio ?? '-',
  };
}

export default function EntregasEnviosPage() {
  const [entregas, setEntregas] = useState<EntregaFila[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  // Modal ver/editar envío
  const [isModalDetalleOpen, setIsModalDetalleOpen] = useState(false);
  const [entregaDetalle, setEntregaDetalle] = useState<EntregaFila | null>(null);
  const [formEmpresaEnvio, setFormEmpresaEnvio] = useState('');
  const [formNumeroGuia, setFormNumeroGuia] = useState('');
  const [formEstadoEnvio, setFormEstadoEnvio] = useState('preparando');
  const [formFechaEnvio, setFormFechaEnvio] = useState('');
  const [formFechaEntrega, setFormFechaEntrega] = useState('');
  const [formNotasEnvio, setFormNotasEnvio] = useState('');
  const [savingDetalle, setSavingDetalle] = useState(false);
  const [detalleError, setDetalleError] = useState<string | null>(null);
  const [enviosRaw, setEnviosRaw] = useState<EnvioApi[]>([]);

  const cargar = async () => {
    setLoading(true);
    try {
      const pedidos = await listarPedidos();
      const enviados = pedidos.filter((p) => ['preparando', 'enviado', 'pagado'].includes(p.estado));
      const rows: EntregaFila[] = [];
      const rawEnvios: EnvioApi[] = [];
      await Promise.all(
        enviados.map(async (pedido) => {
          const envios = await listarEnviosPorPedido(pedido.id);
          envios.forEach((e) => { rows.push(mapearEnvio(e, pedido)); rawEnvios.push(e); });
        })
      );
      setEntregas(rows);
      setEnviosRaw(rawEnvios);
    } catch {
      setError('Error al cargar entregas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const handleEnviar = async (id: number) => {
    setSavingId(id);
    try { await actualizarEnvio(id, { estadoEnvio: 'en_camino' }); cargar(); }
    finally { setSavingId(null); }
  };

  const handleEntregado = async (id: number) => {
    setSavingId(id);
    try { await actualizarEnvio(id, { estadoEnvio: 'entregado' }); cargar(); }
    finally { setSavingId(null); }
  };

  const openDetalle = (entrega: EntregaFila) => {
    const raw = enviosRaw.find((e) => e.id === entrega.id);
    setEntregaDetalle(entrega);
    setFormEmpresaEnvio(entrega.mensajero !== '-' ? entrega.mensajero : '');
    setFormNumeroGuia(raw?.numeroGuia ?? '');
    setFormEstadoEnvio(raw?.estadoEnvio ?? entrega.estado ?? 'preparando');
    setFormFechaEnvio(raw?.fechaEnvio ? raw.fechaEnvio.slice(0, 16) : '');
    setFormFechaEntrega(raw?.fechaEntrega ? raw.fechaEntrega.slice(0, 16) : '');
    setFormNotasEnvio(raw?.notas ?? '');
    setDetalleError(null);
    setIsModalDetalleOpen(true);
  };

  const handleActualizarDetalle = async () => {
    if (!entregaDetalle) return;
    setSavingDetalle(true); setDetalleError(null);
    try {
      await actualizarEnvio(entregaDetalle.id, {
        empresaEnvio: formEmpresaEnvio.trim() || undefined,
        numeroGuia: formNumeroGuia.trim() || undefined,
        estadoEnvio: formEstadoEnvio || undefined,
        fechaEnvio: formFechaEnvio ? new Date(formFechaEnvio).toISOString() : undefined,
        fechaEntrega: formFechaEntrega ? new Date(formFechaEntrega).toISOString() : undefined,
        notas: formNotasEnvio.trim() || undefined,
      });
      setIsModalDetalleOpen(false); cargar();
    } catch (e) { setDetalleError(e instanceof Error ? e.message : 'Error al actualizar'); }
    finally { setSavingDetalle(false); }
  };

  const estados = {
    preparado: { label: 'Preparado', variant: 'info' as const },
    en_camino: { label: 'En Camino', variant: 'warning' as const },
    entregado: { label: 'Entregado', variant: 'success' as const },
    listo: { label: 'Listo para Recolectar', variant: 'success' as const },
  };

  const enCamino = entregas.filter((e) => e.estado === 'en_camino').length;
  const entregadas = entregas.filter((e) => e.estado === 'entregado' || e.estado === 'listo').length;

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div>
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
            Entregas y Envíos
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
            {entregas.length} entrega{entregas.length === 1 ? '' : 's'} en curso
          </p>
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
                <Truck size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Total entregas</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{entregas.length}</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Clock3 size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>En camino</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{enCamino}</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <CheckCircle2 size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Entregadas</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{entregadas}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Listado */}
        <Card variant="elevated" padding="lg">
        {loading ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>Cargando entregas…</p>
        ) : entregas.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>No hay entregas en curso.</p>
        ) : (
        <Table headers={['Cliente', 'Dirección', 'Tipo', 'Zona', 'Estado', 'Mensajero', 'Acciones']} headerSutil>
          {entregas.map((entrega) => (
            <TableRow key={entrega.id}>
              <TableCell rowPadding="lg">{entrega.cliente}</TableCell>
              <TableCell rowPadding="lg">{entrega.direccion}</TableCell>
              <TableCell rowPadding="lg">
                <Badge variant={entrega.tipo === 'Domicilio' ? 'info' : 'default'}>
                  {entrega.tipo}
                </Badge>
              </TableCell>
              <TableCell rowPadding="lg">
                {entrega.zona === 'Gratuita' ? (
                  <Badge variant="success">{entrega.zona}</Badge>
                ) : (
                  entrega.zona
                )}
              </TableCell>
              <TableCell rowPadding="lg">
                <Badge variant={estados[entrega.estado as keyof typeof estados]?.variant || 'default'}>
                  {estados[entrega.estado as keyof typeof estados]?.label || entrega.estado}
                </Badge>
              </TableCell>
              <TableCell rowPadding="lg">{entrega.mensajero}</TableCell>
              <TableCell rowPadding="lg">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openDetalle(entrega)}>Ver Detalles</Button>
                  {entrega.estado === 'preparado' && (
                    <Button size="sm" onClick={() => handleEnviar(entrega.id)} disabled={savingId === entrega.id}>
                      {savingId === entrega.id ? '...' : 'Enviar'}
                    </Button>
                  )}
                  {entrega.estado === 'en_camino' && (
                    <Button size="sm" variant="success" onClick={() => handleEntregado(entrega.id)} disabled={savingId === entrega.id}>
                      {savingId === entrega.id ? '...' : 'Marcar Entregado'}
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
        )}
        </Card>

        <Card variant="elevated" padding="lg">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
          Coordinar nueva entrega
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Cliente" placeholder="Nombre del cliente" fullWidth />
          <Select
            label="Tipo de Entrega"
            options={[
              { value: 'domicilio', label: 'Entrega a Domicilio' },
              { value: 'recoleccion', label: 'Recolección en Tienda' },
            ]}
            fullWidth
          />
          <Input label="Dirección Completa" placeholder="Calle, número, colonia" fullWidth />
          <Select
            label="Zona"
            options={[
              { value: 'gratuita1', label: 'Colonia Juárez (Gratuita)' },
              { value: 'gratuita2', label: 'Centro (Gratuita)' },
              { value: 'gratuita3', label: 'Centro Reloj (Gratuita)' },
              { value: 'gratuita4', label: 'Mercado (Gratuita)' },
              { value: 'pago', label: 'Otra zona (Con costo)' },
            ]}
            fullWidth
          />
          <Input label="Costo de Envío" placeholder="$0.00" fullWidth />
          <Select
            label="Mensajero"
            options={[
              { value: 'motociclista1', label: 'Motociclista 1' },
              { value: 'motociclista2', label: 'Motociclista 2' },
            ]}
            fullWidth
          />
          <div className="md:col-span-2">
            <Button fullWidth>Coordinar Entrega</Button>
          </div>
        </div>
        </Card>
      </div>
      {/* Modal: Ver/Editar Envío */}
      <Modal
        isOpen={isModalDetalleOpen}
        onClose={() => { if (!savingDetalle) setIsModalDetalleOpen(false); }}
        title="Detalle de Envío"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalDetalleOpen(false)} disabled={savingDetalle}>Cerrar</Button>
            <Button onClick={handleActualizarDetalle} disabled={savingDetalle}>{savingDetalle ? 'Guardando...' : 'Actualizar'}</Button>
          </>
        }
      >
        {detalleError && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{detalleError}</p>}
        {entregaDetalle && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
              Pedido #{entregaDetalle.pedidoId} · Cliente: <strong style={{ color: 'var(--menu-texto-principal)' }}>{entregaDetalle.cliente}</strong>
              {' · '}{entregaDetalle.direccion}
            </p>
            <Select
              label="Estado de envío"
              value={formEstadoEnvio}
              onChange={(e) => setFormEstadoEnvio(e.target.value)}
              options={[
                { value: 'preparando', label: 'Preparando' },
                { value: 'en_transito', label: 'En tránsito' },
                { value: 'entregado', label: 'Entregado' },
                { value: 'fallido', label: 'Fallido' },
              ]}
              fullWidth
            />
            <Input label="Empresa / Mensajero" value={formEmpresaEnvio} onChange={(e) => setFormEmpresaEnvio(e.target.value)} placeholder="Ej. DHL, Motociclista 1..." fullWidth />
            <Input label="Número de guía" value={formNumeroGuia} onChange={(e) => setFormNumeroGuia(e.target.value)} placeholder="Número de guía o seguimiento" fullWidth />
            <Input label="Fecha de envío" type="datetime-local" value={formFechaEnvio} onChange={(e) => setFormFechaEnvio(e.target.value)} fullWidth />
            <Input label="Fecha de entrega" type="datetime-local" value={formFechaEntrega} onChange={(e) => setFormFechaEntrega(e.target.value)} fullWidth />
            <Textarea label="Notas" value={formNotasEnvio} onChange={(e) => setFormNotasEnvio(e.target.value)} placeholder="Instrucciones o notas del envío..." rows={2} fullWidth />
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
