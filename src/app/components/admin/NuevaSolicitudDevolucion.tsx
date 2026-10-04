'use client';

import { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import { crearDevolucion, listarPedidoItems, type CausaDevolucion, type PedidoApi, type PedidoItemApi, type TipoDevolucion } from '../../services/ecommerce';
import { causasDe, DIAS_CAMBIO_PRODUCTO, etiquetaCausa, requiereArticulo } from '../../utils/politicaDevolucion';
import { diaEnMexico } from '../../utils/fechaSoloDia';
import { showToast } from '../../utils/toast';

interface NuevaSolicitudDevolucionProps {
  pedidos: PedidoApi[];
  onCreada: () => void;
}

/** Pedidos sobre los que cabe una solicitud: entregados (cambio o reembolso) o cancelados ya pagados (reembolso). */
function esElegible(p: PedidoApi): boolean {
  return p.estado === 'entregado' || (p.estado === 'cancelado' && !!p.pagadoEn);
}

/**
 * Alta de una solicitud en la tabla devoluciones (POST /api/devoluciones) con tipo y causa: el backend
 * valida la política de los Términos (plazo de 7 días, producto sellado, pedido pagado) y la deja pendiente.
 */
export default function NuevaSolicitudDevolucion({ pedidos, onCreada }: NuevaSolicitudDevolucionProps) {
  const elegibles = pedidos.filter(esElegible).sort((a, b) => b.id - a.id).slice(0, 100);
  const [pedidoId, setPedidoId] = useState('');
  const [items, setItems] = useState<PedidoItemApi[]>([]);
  const [cargandoItems, setCargandoItems] = useState(false);
  const [itemId, setItemId] = useState('');
  const [tipo, setTipo] = useState<TipoDevolucion>('cambio');
  const [causa, setCausa] = useState<CausaDevolucion>('sellado_sin_abrir');
  const [sellado, setSellado] = useState(false);
  const [detalle, setDetalle] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const elegirPedido = (id: string) => {
    setPedidoId(id);
    setItemId('');
    setItems([]);
    setError(null);
    if (!id) return;
    setCargandoItems(true);
    listarPedidoItems(Number(id))
      .then(setItems)
      .catch(() => setError('No se pudieron cargar los artículos del pedido'))
      .finally(() => setCargandoItems(false));
  };

  const elegirTipo = (t: TipoDevolucion) => {
    setTipo(t);
    setCausa(causasDe(t)[0]);
    setError(null);
  };

  const pideArticulo = requiereArticulo(tipo, causa);

  const enviar = async () => {
    if (!pedidoId) { setError('Elige el pedido'); return; }
    if (pideArticulo && !itemId) { setError('Elige el artículo del pedido'); return; }
    if (causa === 'sellado_sin_abrir' && !sellado) { setError('Confirma que el producto está sellado y sin abrir'); return; }
    setGuardando(true);
    setError(null);
    try {
      await crearDevolucion({
        pedidoId: Number(pedidoId),
        ...(itemId ? { pedidoItemId: Number(itemId) } : {}),
        tipo,
        causa,
        sellado: causa === 'sellado_sin_abrir' ? sellado : undefined,
        motivo: detalle.trim() || undefined,
        estado: 'pendiente',
      });
      showToast(`Solicitud de ${tipo} registrada para el pedido #${pedidoId}`, 'success');
      setPedidoId(''); setItems([]); setItemId(''); setSellado(false); setDetalle('');
      onCreada();
    } catch (e) {
      // El backend explica por qué no aplica la política (plazo vencido, pedido sin pagar, etc.).
      setError(e instanceof Error ? e.message : 'No se pudo registrar la solicitud');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Card variant="elevated" padding="lg">
      <h2 className="text-lg font-semibold text-menu-texto-principal">Nueva solicitud de cambio o reembolso</h2>
      <p className="mb-4 text-sm text-encabezados-alterno">
        Cambio: producto sellado y sin abrir o con defecto de fábrica, dentro de {DIAS_CAMBIO_PRODUCTO} días naturales tras recogerlo.
        Reembolso: defecto, producto distinto, falta de existencias o pedido en línea cancelado antes de estar listo.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Select
          label="Pedido *"
          value={pedidoId}
          onChange={(e) => elegirPedido(e.target.value)}
          helperText={elegibles.length === 0 ? 'No hay pedidos entregados ni cancelados pagados.' : 'Entregados, o cancelados que ya se pagaron.'}
          options={[
            { value: '', label: 'Seleccionar pedido…' },
            ...elegibles.map((p) => ({
              value: String(p.id),
              label: `#${p.id} · ${p.usuarioNombre || p.usuarioEmail || 'Cliente'} · ${p.estado === 'entregado' ? 'entregado' : 'cancelado'} · ${diaEnMexico(p.creadoEn) ?? ''}`,
            })),
          ]}
          fullWidth
        />
        <Select
          label={pideArticulo ? 'Artículo *' : 'Artículo (opcional)'}
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
          disabled={!pedidoId || cargandoItems}
          options={[
            { value: '', label: !pedidoId ? 'Elige primero el pedido' : cargandoItems ? 'Cargando artículos…' : 'Seleccionar artículo…' },
            ...items.map((it) => ({ value: String(it.id), label: `${it.nombreProducto ?? 'Producto'}${it.tamanio ? ` (${it.tamanio})` : ''} × ${it.cantidad}` })),
          ]}
          fullWidth
        />
        <Select
          label="Tipo *"
          value={tipo}
          onChange={(e) => elegirTipo(e.target.value as TipoDevolucion)}
          options={[{ value: 'cambio', label: 'Cambio de producto' }, { value: 'reembolso', label: 'Reembolso' }]}
          fullWidth
        />
        <Select
          label="Causa *"
          value={causa}
          onChange={(e) => { setCausa(e.target.value as CausaDevolucion); setError(null); }}
          options={causasDe(tipo).map((c) => ({ value: c, label: etiquetaCausa(c) }))}
          fullWidth
        />
        {causa === 'sellado_sin_abrir' && (
          <label className="flex items-center gap-2 text-sm text-menu-texto-principal md:col-span-2">
            <input type="checkbox" checked={sellado} onChange={(e) => setSellado(e.target.checked)} className="h-5 w-5 accent-[var(--botones-principales)]" />
            Revisé el producto: está sellado y sin abrir
          </label>
        )}
        <div className="md:col-span-2">
          <Textarea label="Detalle (opcional)" value={detalle} maxLength={500} onChange={(e) => setDetalle(e.target.value)} placeholder="Ej. quiere el tono 7.1 en lugar del 6.0" rows={2} fullWidth />
        </div>
      </div>
      {error && <p role="alert" className="mt-4 text-sm font-medium text-[var(--danger-texto)]">{error}</p>}
      <div className="mt-5">
        <Button onClick={enviar} disabled={guardando || elegibles.length === 0} className="w-full sm:w-auto">
          {guardando ? 'Registrando…' : 'Registrar solicitud'}
        </Button>
      </div>
    </Card>
  );
}
