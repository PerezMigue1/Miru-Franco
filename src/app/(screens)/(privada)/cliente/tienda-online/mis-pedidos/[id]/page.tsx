'use client';

import { useParams } from 'next/navigation';
import ModuleLayout from '../../../../../../components/layouts/ModuleLayout';
import Card from '../../../../../../components/ui/Card';
import Badge from '../../../../../../components/ui/Badge';
import Table, { TableRow, TableCell } from '../../../../../../components/ui/Table';
export default function DetallePedidoPage() {
  const params = useParams();
  const id = params.id as string;

  const pedido = {
    id: id,
    fecha: '2024-02-15',
    hora: '14:30',
    estado: 'en-proceso',
    productos: [
      { id: 1, nombre: 'Shampoo Abbondanza', cantidad: 2, precio: 250, subtotal: 500 },
      { id: 2, nombre: 'Acondicionador Tech Italy', cantidad: 1, precio: 280, subtotal: 280 },
      { id: 3, nombre: 'Mascarilla Capilar Nutritiva', cantidad: 1, precio: 350, subtotal: 350 },
    ],
    subtotal: 880,
    envio: 50,
    total: 930,
    direccion: {
      calle: 'Calle Principal',
      numero: '123',
      colonia: 'Col. Juárez',
      ciudad: 'Ciudad de México',
      estado: 'CDMX',
      codigoPostal: '06600',
      referencias: 'Casa azul, portón negro',
    },
    metodoPago: {
      tipo: 'Tarjeta de Crédito',
      ultimosDigitos: '**** 3456',
    },
    seguimiento: {
      numero: 'TRACK-2024-001',
      estado: 'En tránsito',
      ubicacion: 'Centro de distribución CDMX',
      fechaEstimada: '2024-02-20',
    },
  };

  const obtenerVariantEstado = (estado: string) => {
    switch (estado) {
      case 'en-proceso':
        return 'warning';
      case 'enviado':
        return 'info';
      case 'entregado':
        return 'success';
      case 'cancelado':
        return 'danger';
      default:
        return 'default';
    }
  };

  const formatearEstado = (estado: string) => {
    const estados: { [key: string]: string } = {
      'en-proceso': 'En Proceso',
      'enviado': 'Enviado',
      'entregado': 'Entregado',
      'cancelado': 'Cancelado',
    };
    return estados[estado] || estado;
  };

  return (
    <ModuleLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-hero mb-2"
              style={{ color: 'var(--menu-texto-principal)' }}
            >
              Detalle del Pedido
            </h1>
            <p className="font-mono text-lg mb-2" style={{ color: 'var(--encabezados-alterno)' }}>
              {pedido.id}
            </p>
            <Badge variant={obtenerVariantEstado(pedido.estado)} size="lg">
              {formatearEstado(pedido.estado)}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <h2
                className="text-page-title mb-4"
                style={{ color: 'var(--menu-texto-principal)' }}
              >
                Productos del Pedido
              </h2>
              <Table headers={['Producto', 'Cantidad', 'Precio Unitario', 'Subtotal']}>
                {pedido.productos.map((producto) => (
                  <TableRow key={producto.id}>
                    <TableCell className="font-semibold">{producto.nombre}</TableCell>
                    <TableCell>{producto.cantidad}</TableCell>
                    <TableCell>${producto.precio.toLocaleString()}</TableCell>
                    <TableCell className="font-semibold">${producto.subtotal.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </Table>
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
                <div className="flex justify-between mb-2">
                  <span style={{ color: 'var(--encabezados-alterno)' }}>Subtotal:</span>
                  <span style={{ color: 'var(--menu-texto-principal)' }}>${pedido.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span style={{ color: 'var(--encabezados-alterno)' }}>Envío:</span>
                  <span style={{ color: 'var(--menu-texto-principal)' }}>${pedido.envio.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
                  <span className="font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                    Total:
                  </span>
                  <span
                    className="text-2xl font-bold"
                    style={{ color: 'var(--menu-texto-principal)' }}
                  >
                    ${pedido.total.toLocaleString()}
                  </span>
                </div>
              </div>
            </Card>

            <Card>
              <h2
                className="text-page-title mb-4"
                style={{ color: 'var(--menu-texto-principal)' }}
              >
                Información de Envío
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                    Dirección
                  </p>
                  <p style={{ color: 'var(--menu-texto-principal)' }}>
                    {pedido.direccion.calle} {pedido.direccion.numero}
                    <br />
                    {pedido.direccion.colonia}
                    <br />
                    {pedido.direccion.ciudad}, {pedido.direccion.estado} {pedido.direccion.codigoPostal}
                  </p>
                </div>
                {pedido.direccion.referencias && (
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Referencias
                    </p>
                    <p style={{ color: 'var(--encabezados-alterno)' }}>{pedido.direccion.referencias}</p>
                  </div>
                )}
              </div>
            </Card>

            {pedido.seguimiento && (
              <Card>
                <h2
                  className="text-page-title mb-4"
                  style={{ color: 'var(--menu-texto-principal)' }}
                >
                  Seguimiento del Envío
                </h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Número de Rastreo
                    </p>
                    <p className="font-mono font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                      {pedido.seguimiento.numero}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Estado
                    </p>
                    <p style={{ color: 'var(--menu-texto-principal)' }}>{pedido.seguimiento.estado}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Ubicación Actual
                    </p>
                    <p style={{ color: 'var(--encabezados-alterno)' }}>{pedido.seguimiento.ubicacion}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Fecha Estimada de Entrega
                    </p>
                    <p style={{ color: 'var(--menu-texto-principal)' }}>
                      {new Date(pedido.seguimiento.fechaEstimada).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <div>
            <Card>
              <h3
                className="text-subtitle mb-4"
                style={{ color: 'var(--menu-texto-principal)' }}
              >
                Información del Pedido
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                    Fecha del Pedido
                  </p>
                  <p style={{ color: 'var(--menu-texto-principal)' }}>
                    {new Date(pedido.fecha).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                    Hora: {pedido.hora}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                    Método de Pago
                  </p>
                  <p style={{ color: 'var(--menu-texto-principal)' }}>{pedido.metodoPago.tipo}</p>
                  <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                    {pedido.metodoPago.ultimosDigitos}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}

