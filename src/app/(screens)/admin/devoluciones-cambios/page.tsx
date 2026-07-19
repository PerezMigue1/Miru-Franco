'use client';

import { useState, useEffect } from 'react';
import { listarPedidos, listarDevolucionesPedido, actualizarDevolucion, PedidoApi, DevolucionApi } from '../../../services/ecommerce';
import Modal from '../../../components/ui/Modal';
import Textarea from '../../../components/ui/Textarea';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { CheckCircle2, Clock3, RotateCcw } from 'lucide-react';

interface DevolucionFila {
  id: number;
  pedidoId: number;
  cliente: string;
  producto: string;
  motivo: string;
  estado: string;
  fecha: string;
}

function mapearDevolucion(d: DevolucionApi, pedido: PedidoApi): DevolucionFila {
  return {
    id: d.id,
    pedidoId: pedido.id,
    cliente: pedido.usuarioId ?? '-',
    producto: `Pedido #${pedido.id}`,
    motivo: d.motivo ?? '-',
    estado: d.estado ?? 'pendiente',
    fecha: d.creadoEn ? d.creadoEn.slice(0, 10) : '-',
  };
}

export default function DevolucionesCambiosPage() {
  const [solicitudes, setSolicitudes] = useState<DevolucionFila[]>([]);
  const [solicitudesRaw, setSolicitudesRaw] = useState<DevolucionApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal procesar cambio
  const [isModalProcesarOpen, setIsModalProcesarOpen] = useState(false);
  const [devolucionProcesando, setDevolucionProcesando] = useState<DevolucionApi | null>(null);
  const [formEstadoDev, setFormEstadoDev] = useState('aprobada');
  const [formMotivoDev, setFormMotivoDev] = useState('');
  const [formMontoDev, setFormMontoDev] = useState('');
  const [formNotasDev, setFormNotasDev] = useState('');
  const [savingDev, setSavingDev] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const pedidos = await listarPedidos();
      const rows: DevolucionFila[] = [];
      const raws: DevolucionApi[] = [];
      await Promise.all(
        pedidos.map(async (pedido) => {
          const devs = await listarDevolucionesPedido(pedido.id);
          devs.forEach((d) => { rows.push(mapearDevolucion(d, pedido)); raws.push(d); });
        })
      );
      setSolicitudes(rows);
      setSolicitudesRaw(raws);
    } catch {
      setError('Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const openProcesar = (id: number) => {
    const raw = solicitudesRaw.find((d) => d.id === id);
    if (!raw) return;
    setDevolucionProcesando(raw);
    setFormEstadoDev(raw.estado ?? 'aprobada');
    setFormMotivoDev(raw.motivo ?? '');
    setFormMontoDev(raw.monto != null ? String(raw.monto) : '');
    setFormNotasDev('');
    setDevError(null);
    setIsModalProcesarOpen(true);
  };

  const handleProcesar = async () => {
    if (!devolucionProcesando) return;
    setSavingDev(true); setDevError(null);
    try {
      await actualizarDevolucion(devolucionProcesando.id, {
        estado: formEstadoDev,
        motivo: formMotivoDev.trim() || undefined,
        monto: formMontoDev ? Number(formMontoDev) : undefined,
      });
      setIsModalProcesarOpen(false); setDevolucionProcesando(null); cargar();
    } catch (e) { setDevError(e instanceof Error ? e.message : 'Error al procesar'); }
    finally { setSavingDev(false); }
  };

  const pendientes = solicitudes.filter((s) => s.estado === 'pendiente').length;
  const resueltas = solicitudes.length - pendientes;

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div>
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
            Devoluciones y Cambios
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
            {solicitudes.length} solicitud{solicitudes.length === 1 ? '' : 'es'} · no se realizan reembolsos en efectivo
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
                <RotateCcw size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Total solicitudes</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{solicitudes.length}</p>
              </div>
            </div>
          </Card>

          <Card
            variant="elevated"
            padding="lg"
            style={pendientes > 0 ? { boxShadow: '0 0 0 1.5px var(--warning), 0 4px 12px rgba(0,0,0,0.15)' } : undefined}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: pendientes > 0 ? 'rgba(217, 142, 4, 0.2)' : 'var(--fondos-suaves)' }}>
                <Clock3 size={20} style={{ color: pendientes > 0 ? 'var(--warning)' : 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Pendientes</p>
                <p className="text-3xl font-bold mt-0.5" style={{ color: pendientes > 0 ? 'var(--warning-texto)' : 'var(--menu-texto-principal)' }}>{pendientes}</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <CheckCircle2 size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Resueltas</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{resueltas}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Listado */}
        <Card variant="elevated" padding="lg">
        {loading ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>Cargando solicitudes…</p>
        ) : solicitudes.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>No hay solicitudes de devolución o cambio.</p>
        ) : (
        <Table headers={['Cliente', 'Producto', 'Motivo', 'Fecha', 'Estado', 'Acciones']} headerSutil>
          {solicitudes.map((solicitud) => (
            <TableRow key={solicitud.id}>
              <TableCell className="font-semibold" rowPadding="lg">{solicitud.cliente}</TableCell>
              <TableCell rowPadding="lg">{solicitud.producto}</TableCell>
              <TableCell rowPadding="lg">{solicitud.motivo}</TableCell>
              <TableCell rowPadding="lg">{solicitud.fecha}</TableCell>
              <TableCell rowPadding="lg">
                <Badge variant={solicitud.estado === 'pendiente' ? 'warning' : 'success'}>
                  {solicitud.estado}
                </Badge>
              </TableCell>
              <TableCell rowPadding="lg">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openProcesar(solicitud.id)}>Ver Detalles</Button>
                  {solicitud.estado === 'pendiente' && (
                    <Button size="sm" onClick={() => openProcesar(solicitud.id)}>Procesar Cambio</Button>
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
          Nueva solicitud de cambio
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Cliente" placeholder="Nombre del cliente" fullWidth />
          <Input label="Producto a Cambiar" placeholder="Nombre del producto" fullWidth />
          <Select
            label="Motivo"
            options={[
              { value: 'incorrecto', label: 'Producto Incorrecto' },
              { value: 'equivocacion', label: 'Equivocación' },
              { value: 'otro', label: 'Otro' },
            ]}
            fullWidth
          />
          <Input label="Producto de Reemplazo" placeholder="Seleccionar producto..." fullWidth />
          <Input label="Diferencia de Precio" placeholder="$0.00" fullWidth />
          <div className="md:col-span-2">
            <Button fullWidth>Procesar Cambio</Button>
          </div>
        </div>
        </Card>
      </div>
      {/* Modal: Procesar Cambio / Ver Detalles */}
      <Modal
        isOpen={isModalProcesarOpen}
        onClose={() => { if (!savingDev) { setIsModalProcesarOpen(false); setDevolucionProcesando(null); } }}
        title="Procesar Devolución / Cambio"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setIsModalProcesarOpen(false); setDevolucionProcesando(null); }} disabled={savingDev}>Cancelar</Button>
            <Button onClick={handleProcesar} disabled={savingDev}>{savingDev ? 'Guardando...' : 'Guardar'}</Button>
          </>
        }
      >
        {devError && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{devError}</p>}
        {devolucionProcesando && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
              Motivo: <strong style={{ color: 'var(--menu-texto-principal)' }}>{devolucionProcesando.motivo ?? '-'}</strong>
            </p>
            <Select
              label="Estado"
              value={formEstadoDev}
              onChange={(e) => setFormEstadoDev(e.target.value)}
              options={[
                { value: 'pendiente', label: 'Pendiente' },
                { value: 'aprobada', label: 'Aprobada' },
                { value: 'rechazada', label: 'Rechazada' },
                { value: 'completada', label: 'Completada' },
              ]}
              fullWidth
            />
            <Textarea label="Motivo" value={formMotivoDev} onChange={(e) => setFormMotivoDev(e.target.value)} placeholder="Motivo de la devolución..." rows={2} fullWidth />
            <Input label="Monto reembolso/crédito" type="number" min={0} step={0.01} value={formMontoDev} onChange={(e) => setFormMontoDev(e.target.value)} placeholder="0.00" fullWidth />
            <Textarea label="Notas internas (opcional)" value={formNotasDev} onChange={(e) => setFormNotasDev(e.target.value)} placeholder="Observaciones sobre la resolución..." rows={2} fullWidth />
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
