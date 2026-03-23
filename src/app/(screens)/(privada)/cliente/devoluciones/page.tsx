'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ModuleLayout from '../../../../components/layouts/ModuleLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Textarea from '../../../../components/ui/Textarea';
import Badge from '../../../../components/ui/Badge';
import Table, { TableRow, TableCell } from '../../../../components/ui/Table';
import {
  listarDevolucionesDelCliente,
  listarPedidos,
  listarPedidoItems,
  crearDevolucion,
  etiquetaEstadoPedido,
  type DevolucionApi,
  type PedidoApi,
  type PedidoItemApi,
} from '../../../../services/ecommerce';
import { hasValidToken } from '../../../../utils/security';
import { showAlert, showToast } from '../../../../utils/toast';

export default function DevolucionesPage() {
  const [lista, setLista] = useState<DevolucionApi[]>([]);
  const [pedidos, setPedidos] = useState<PedidoApi[]>([]);
  const [items, setItems] = useState<PedidoItemApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [pedidoId, setPedidoId] = useState('');
  const [itemId, setItemId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [monto, setMonto] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cargar = async () => {
    if (!hasValidToken()) {
      setError('Inicia sesión para gestionar devoluciones.');
      setLoading(false);
      return;
    }
    try {
      const [devs, peds] = await Promise.all([listarDevolucionesDelCliente(), listarPedidos()]);
      setLista(devs);
      setPedidos(peds.filter((p) => p.estado !== 'cancelado' && p.estado !== 'borrador'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargar();
  }, []);

  useEffect(() => {
    const pid = parseInt(pedidoId, 10);
    if (!Number.isFinite(pid)) {
      setItems([]);
      setItemId('');
      return;
    }
    let cancelled = false;
    listarPedidoItems(pid)
      .then((rows) => {
        if (!cancelled) {
          setItems(rows);
          setItemId('');
        }
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [pedidoId]);

  const enviar = async () => {
    const pid = parseInt(pedidoId, 10);
    if (!Number.isFinite(pid)) {
      void showAlert('Selecciona un pedido.');
      return;
    }
    const iid = itemId ? parseInt(itemId, 10) : NaN;
    if (!Number.isFinite(iid)) {
      void showAlert('Selecciona una línea del pedido (producto).');
      return;
    }
    if (!motivo.trim()) {
      void showAlert('Describe el motivo de la devolución o cambio.');
      return;
    }
    setEnviando(true);
    try {
      await crearDevolucion({
        pedidoId: pid,
        pedidoItemId: iid,
        motivo: motivo.trim(),
        estado: 'pendiente',
        monto: monto.trim() ? parseFloat(monto.replace(/,/g, '')) : undefined,
      });
      showToast('Solicitud registrada.', 'success');
      setMostrarFormulario(false);
      setPedidoId('');
      setItemId('');
      setMotivo('');
      setMonto('');
      await cargar();
    } catch (e) {
      void showAlert(e instanceof Error ? e.message : 'No se pudo crear la solicitud');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ModuleLayout>
      <div className="max-w-4xl mx-auto py-4">
        <div className="text-center mb-8">
          <h1 className="text-hero mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
            Devoluciones y cambios
          </h1>
          <p className="text-lead" style={{ color: 'var(--encabezados-alterno)' }}>
            Solicitudes registradas en el sistema según tus pedidos
          </p>
        </div>

        {error && (
          <Card className="mb-4 p-4" style={{ borderColor: 'var(--danger)' }}>
            <p className="mb-2" style={{ color: 'var(--danger)' }}>{error}</p>
            {!hasValidToken() && (
              <Link href="/login" className="text-sm font-semibold underline" style={{ color: 'var(--botones-principales)' }}>
                Iniciar sesión
              </Link>
            )}
          </Card>
        )}

        <Card className="mb-6 p-4" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
          <h3 className="font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
            Política
          </h3>
          <ul className="text-sm space-y-1" style={{ color: 'var(--encabezados-alterno)' }}>
            <li>• Producto sellado y en condiciones aceptables según política del salón</li>
            <li>• Los cambios se gestionan con el equipo; el estado lo actualiza administración</li>
          </ul>
        </Card>

        {loading ? (
          <Card className="p-8 text-center">
            <p style={{ color: 'var(--encabezados-alterno)' }}>Cargando…</p>
          </Card>
        ) : (
          <>
            <Card className="mb-6">
              <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                Mis solicitudes
              </h2>
              <Table headers={['ID', 'Pedido', 'Estado', 'Monto', 'Motivo', 'Registro']}>
                {lista.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>
                      No hay devoluciones registradas.
                    </TableCell>
                  </TableRow>
                ) : (
                  lista.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono">#{d.id}</TableCell>
                      <TableCell className="font-mono">#{d.pedidoId}</TableCell>
                      <TableCell>
                        <Badge variant={d.estado === 'aprobada' || d.estado === 'completada' ? 'success' : 'warning'}>
                          {d.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>{d.monto != null ? `$${d.monto.toLocaleString()}` : '—'}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        <span title={d.motivo ?? ''}>{d.motivo ?? '—'}</span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {d.creadoEn ? new Date(d.creadoEn).toLocaleString('es-MX') : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </Table>
            </Card>

            {!mostrarFormulario ? (
              <Card>
                <div className="text-center">
                  <Button onClick={() => setMostrarFormulario(true)} disabled={!hasValidToken() || pedidos.length === 0}>
                    Nueva solicitud
                  </Button>
                  {hasValidToken() && pedidos.length === 0 && (
                    <p className="text-sm mt-4" style={{ color: 'var(--encabezados-alterno)' }}>
                      Necesitas al menos un pedido.{' '}
                      <Link href="/cliente/tienda-online/mis-pedidos" className="underline font-medium">
                        Ver pedidos
                      </Link>
                    </p>
                  )}
                </div>
              </Card>
            ) : (
              <Card>
                <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  Nueva solicitud
                </h2>
                <div className="space-y-4 max-w-lg">
                  <Select
                    label="Pedido"
                    value={pedidoId}
                    onChange={(e) => setPedidoId(e.target.value)}
                    options={[
                      { value: '', label: 'Selecciona…' },
                      ...pedidos.map((p) => ({
                        value: String(p.id),
                        label: `#${p.id} — ${etiquetaEstadoPedido(p.estado)}`,
                      })),
                    ]}
                    fullWidth
                  />
                  <Select
                    label="Producto (línea del pedido)"
                    value={itemId}
                    onChange={(e) => setItemId(e.target.value)}
                    disabled={!pedidoId}
                    options={[
                      { value: '', label: items.length ? 'Selecciona línea…' : 'Sin líneas o cargando…' },
                      ...items.map((it) => ({
                        value: String(it.id),
                        label: `${it.nombreProducto ?? 'Producto'} ×${it.cantidad} (${it.tamanio ?? '—'})`,
                      })),
                    ]}
                    fullWidth
                  />
                  <Input
                    label="Monto reclamado (opcional)"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="0.00"
                    fullWidth
                  />
                  <Textarea label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={4} fullWidth />
                  <div className="flex gap-3">
                    <Button variant="outline" fullWidth onClick={() => setMostrarFormulario(false)} disabled={enviando}>
                      Cancelar
                    </Button>
                    <Button fullWidth onClick={() => void enviar()} disabled={enviando}>
                      {enviando ? 'Enviando…' : 'Enviar'}
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </ModuleLayout>
  );
}
