'use client';

import Link from 'next/link';
import Badge from '../../../../../components/ui/Badge';
import {
  etiquetaEstadoPedido,
  etiquetaMetodoPagoPedido,
  varianteBadgeEstadoPedido,
  type PedidoApi,
} from '../../../../../services/ecommerce';
import { formatearPrecioMXN } from '../../../../../utils/formatoPrecio';

/**
 * Pedido en móvil (por debajo de 640 px): la tabla dejaba el estado y "Ver detalle" fuera de vista. Aquí el
 * estado va bajo el número y el enlace mide 44 px.
 */
export default function TarjetaPedidoMovil({ pedido, fecha }: { pedido: PedidoApi; fecha: string }) {
  return (
    <li className="rounded-[var(--mf-radio)] p-4" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
      <p className="font-mono font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>#{pedido.id}</p>
      <div className="mt-1">
        <Badge variant={varianteBadgeEstadoPedido(pedido.estado)}>
          {etiquetaEstadoPedido(pedido.estado, pedido.metodoPago)}
        </Badge>
      </div>
      <p className="mf-cifras mt-2 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
        {fecha} · <span className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>{formatearPrecioMXN(pedido.total)} {pedido.moneda}</span>
        {pedido.metodoPago ? ` · ${etiquetaMetodoPagoPedido(pedido.metodoPago)}` : ''}
      </p>
      <Link
        href={`/cliente/tienda-online/mis-pedidos/${pedido.id}`}
        className="mt-3 inline-flex min-h-11 items-center justify-center rounded-[10px] border px-4 text-sm font-semibold"
        style={{ borderColor: 'var(--menu-texto-principal)', color: 'var(--menu-texto-principal)' }}
      >
        Ver detalle
      </Link>
    </li>
  );
}
