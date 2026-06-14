'use client';

import { useState, useEffect } from 'react';
import { listarPedidos, listarDevolucionesPedido, actualizarDevolucion, PedidoApi, DevolucionApi } from '../../../services/ecommerce';
import Modal from '../../../components/ui/Modal';
import Textarea from '../../../components/ui/Textarea';
import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

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
      // mantener tabla vacía
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

  return (
    <AdminLayout>
      <PageHeader
        title="Devoluciones y Cambios de Productos"
        subtitle="Gestiona cambios de productos (no se realizan reembolsos en efectivo)"
      />

      <Card>
        <Table headers={['Cliente', 'Producto', 'Motivo', 'Fecha', 'Estado', 'Acciones']}>
          {solicitudes.map((solicitud) => (
            <TableRow key={solicitud.id}>
              <TableCell className="font-semibold">{solicitud.cliente}</TableCell>
              <TableCell>{solicitud.producto}</TableCell>
              <TableCell>{solicitud.motivo}</TableCell>
              <TableCell>{solicitud.fecha}</TableCell>
              <TableCell>
                <Badge variant={solicitud.estado === 'pendiente' ? 'warning' : 'success'}>
                  {solicitud.estado}
                </Badge>
              </TableCell>
              <TableCell>
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
      </Card>

      <Card className="mt-6">
        <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
          Nueva Solicitud de Cambio
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
        {devError && <p className="text-sm mb-3" style={{ color: 'var(--danger)' }}>{devError}</p>}
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
