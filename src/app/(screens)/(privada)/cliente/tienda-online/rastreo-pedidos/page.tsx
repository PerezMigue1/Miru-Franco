'use client';

import { useState } from 'react';
import PublicLayout from '../../../../../components/layouts/PublicLayout';
import Card from '../../../../../components/ui/Card';
import Badge from '../../../../../components/ui/Badge';
import Button from '../../../../../components/ui/Button';
import Modal from '../../../../../components/ui/Modal';
import { showAlert, showConfirm } from '../../../../../utils/toast';

interface Pedido {
  id: number;
  numero: string;
  productos: string;
  fecha: string;
  estado: string;
  zona: string;
  mensajero: string;
  total: number;
  direccion: string;
  metodoPago: string;
  puedeCancelar: boolean;
  historialEnvio?: Array<{
    fecha: string;
    hora: string;
    evento: string;
    ubicacion?: string;
  }>;
}

export default function RastreoPedidosPage() {
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<number | null>(null);
  const [vista, setVista] = useState<'lista' | 'detalles' | 'envio'>('lista');
  const [mostrarCancelar, setMostrarCancelar] = useState(false);
  
  const pedidos: Pedido[] = [
    { 
      id: 1, 
      numero: 'PED-001', 
      productos: 'Shampoo Avina x2, Acondicionador Tech Italy', 
      fecha: '2024-01-15', 
      estado: 'en_camino', 
      zona: 'Colonia Juárez', 
      mensajero: 'Juan Pérez',
      total: 1080,
      direccion: 'Calle Principal #123, Colonia Juárez',
      metodoPago: 'Transferencia Bancaria',
      puedeCancelar: true,
      historialEnvio: [
        { fecha: '2024-01-15', hora: '09:00', evento: 'Pedido confirmado', ubicacion: 'Almacén' },
        { fecha: '2024-01-15', hora: '11:30', evento: 'Pedido preparado', ubicacion: 'Almacén' },
        { fecha: '2024-01-15', hora: '14:00', evento: 'Enviado a mensajería', ubicacion: 'Centro de distribución' },
        { fecha: '2024-01-15', hora: '15:30', evento: 'En camino', ubicacion: 'En ruta' },
      ]
    },
    { 
      id: 2, 
      numero: 'PED-002', 
      productos: 'Acondicionador Tech Italy', 
      fecha: '2024-01-14', 
      estado: 'entregado', 
      zona: 'Centro', 
      mensajero: '-',
      total: 380,
      direccion: 'Av. Central #456, Centro',
      metodoPago: 'Efectivo al Recibir',
      puedeCancelar: false,
      historialEnvio: [
        { fecha: '2024-01-14', hora: '10:00', evento: 'Pedido confirmado', ubicacion: 'Almacén' },
        { fecha: '2024-01-14', hora: '12:00', evento: 'Pedido preparado', ubicacion: 'Almacén' },
        { fecha: '2024-01-14', hora: '13:30', evento: 'Enviado a mensajería', ubicacion: 'Centro de distribución' },
        { fecha: '2024-01-14', hora: '15:00', evento: 'En camino', ubicacion: 'En ruta' },
        { fecha: '2024-01-14', hora: '16:30', evento: 'Entregado', ubicacion: 'Av. Central #456' },
      ]
    },
    { 
      id: 3, 
      numero: 'PED-003', 
      productos: 'Mascarilla Alfaparf', 
      fecha: '2024-01-13', 
      estado: 'preparado', 
      zona: 'Centro Reloj', 
      mensajero: '-',
      total: 450,
      direccion: 'Calle Reloj #789, Centro Reloj',
      metodoPago: 'Tarjeta',
      puedeCancelar: true,
      historialEnvio: [
        { fecha: '2024-01-13', hora: '08:00', evento: 'Pedido confirmado', ubicacion: 'Almacén' },
        { fecha: '2024-01-13', hora: '10:30', evento: 'Pedido preparado', ubicacion: 'Almacén' },
      ]
    },
  ];

  const estados = {
    preparado: { label: 'Preparado', variant: 'info' as const, descripcion: 'Tu pedido está listo para envío' },
    en_camino: { label: 'En Camino', variant: 'warning' as const, descripcion: 'Tu pedido está en camino a tu domicilio' },
    entregado: { label: 'Entregado', variant: 'success' as const, descripcion: 'Tu pedido ha sido entregado' },
    cancelado: { label: 'Cancelado', variant: 'danger' as const, descripcion: 'Tu pedido ha sido cancelado' },
  };

  const pedidoActual = pedidos.find(p => p.id === pedidoSeleccionado);

  const cancelarPedido = async () => {
    if (!pedidoActual) return;
    const ok = await showConfirm(`¿Estás seguro de cancelar el pedido ${pedidoActual.numero}?`);
    if (ok) {
      await showAlert(`Pedido ${pedidoActual.numero} cancelado exitosamente. Se procesará el reembolso según el método de pago utilizado.`);
      setMostrarCancelar(false);
      setVista('lista');
      setPedidoSeleccionado(null);
    }
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12" style={{ marginTop: '136px' }}>
        <div className="max-w-6xl mx-auto">
          {vista === 'lista' && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-hero mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  Mis Pedidos
                </h1>
                <p className="text-lead" style={{ color: 'var(--encabezados-alterno)' }}>
                  Consulta el estado de tus pedidos y realiza seguimiento en tiempo real
                </p>
              </div>

              <div className="space-y-4">
                {pedidos.map((pedido) => {
                  const estadoInfo = estados[pedido.estado as keyof typeof estados];
                  return (
                    <Card key={pedido.id}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-subtitle" style={{ color: 'var(--menu-texto-principal)' }}>
                              Pedido #{pedido.numero}
                            </h3>
                            <Badge variant={estadoInfo?.variant || 'default'}>
                              {estadoInfo?.label || pedido.estado}
                            </Badge>
                          </div>
                          <p className="text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                            {pedido.productos}
                          </p>
                          <div className="flex flex-wrap gap-4 text-sm mt-2">
                            <span style={{ color: 'var(--encabezados-alterno)' }}>
                              📅 Fecha: {pedido.fecha}
                            </span>
                            <span style={{ color: 'var(--encabezados-alterno)' }}>
                              💰 Total: ${pedido.total.toLocaleString()}
                            </span>
                            <span style={{ color: 'var(--encabezados-alterno)' }}>
                              📍 {pedido.zona}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--menu-texto-principal)' }}>
                          Estado Actual:
                        </p>
                        <p className="text-sm mb-3" style={{ color: 'var(--encabezados-alterno)' }}>
                          {estadoInfo?.descripcion}
                        </p>
                        {pedido.mensajero !== '-' && (
                          <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                            🚚 Mensajero: {pedido.mensajero}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          fullWidth
                          onClick={() => {
                            setPedidoSeleccionado(pedido.id);
                            setVista('detalles');
                          }}
                        >
                          Ver Detalles
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}

          {vista === 'detalles' && pedidoActual && (
            <>
              <div className="mb-6">
                <Button variant="outline" onClick={() => setVista('lista')}>
                  ← Volver a Mis Pedidos
                </Button>
              </div>
              <Card>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-hero mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                      Pedido #{pedidoActual.numero}
                    </h1>
                    <Badge variant={estados[pedidoActual.estado as keyof typeof estados]?.variant || 'default'} size="lg">
                      {estados[pedidoActual.estado as keyof typeof estados]?.label || pedidoActual.estado}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                      Información del Pedido
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Productos:</p>
                        <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                          {pedidoActual.productos}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Fecha del Pedido:</p>
                        <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                          {pedidoActual.fecha}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Total:</p>
                        <p className="text-xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                          ${pedidoActual.total.toLocaleString()} MXN
                        </p>
                      </div>
                      <div>
                        <p className="text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Método de Pago:</p>
                        <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                          {pedidoActual.metodoPago}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                      Información de Entrega
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Dirección:</p>
                        <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                          {pedidoActual.direccion}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Zona:</p>
                        <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                          {pedidoActual.zona}
                        </p>
                      </div>
                      {pedidoActual.mensajero !== '-' && (
                        <div>
                          <p className="text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Mensajero:</p>
                          <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                            {pedidoActual.mensajero}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6" style={{ borderColor: 'var(--fondos-suaves)' }}>
                  <h3 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                    Acciones Disponibles
                  </h3>
                  <div className="flex gap-3">
                    <Button
                      fullWidth
                      onClick={() => setVista('envio')}
                    >
                      📦 Ver Detalles del Envío
                    </Button>
                    {pedidoActual.puedeCancelar && (
                      <Button
                        variant="outline"
                        fullWidth
                        onClick={() => setMostrarCancelar(true)}
                        style={{
                          borderColor: 'var(--danger)',
                          color: 'var(--danger)'
                        }}
                      >
                        ❌ Cancelar Pedido
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </>
          )}

          {vista === 'envio' && pedidoActual && (
            <>
              <div className="mb-6">
                <Button variant="outline" onClick={() => setVista('detalles')}>
                  ← Volver a Detalles del Pedido
                </Button>
              </div>
              <Card>
                <h1 className="text-hero mb-6" style={{ color: 'var(--menu-texto-principal)' }}>
                  Rastreo de Envío - Pedido #{pedidoActual.numero}
                </h1>

                <div className="space-y-4">
                  {pedidoActual.historialEnvio && pedidoActual.historialEnvio.map((evento, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-4 h-4 rounded-full mb-2"
                          style={{ backgroundColor: 'var(--botones-principales)' }}
                        />
                        {index < pedidoActual.historialEnvio!.length - 1 && (
                          <div
                            className="w-0.5 flex-1"
                            style={{ backgroundColor: 'var(--fondos-suaves)' }}
                          />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold mb-1" style={{ color: 'var(--menu-texto-principal)' }}>
                              {evento.evento}
                            </p>
                            {evento.ubicacion && (
                              <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                                📍 {evento.ubicacion}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                              {evento.fecha}
                            </p>
                            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                              {evento.hora}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                  <p className="text-sm font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                    Estado Actual:
                  </p>
                  <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                    {estados[pedidoActual.estado as keyof typeof estados]?.descripcion}
                  </p>
                  {pedidoActual.mensajero !== '-' && (
                    <p className="text-sm mt-2" style={{ color: 'var(--encabezados-alterno)' }}>
                      🚚 Mensajero asignado: {pedidoActual.mensajero}
                    </p>
                  )}
                </div>
              </Card>
            </>
          )}

          {mostrarCancelar && pedidoActual && (
            <Modal
              isOpen={true}
              onClose={() => setMostrarCancelar(false)}
              title="Cancelar Pedido"
            >
              <div className="space-y-4">
                <p style={{ color: 'var(--encabezados-alterno)' }}>
                  ¿Estás seguro de que deseas cancelar el pedido <strong>{pedidoActual.numero}</strong>?
                </p>
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                  <p className="text-sm font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                    Información importante:
                  </p>
                  <ul className="text-sm space-y-1" style={{ color: 'var(--encabezados-alterno)' }}>
                    <li>• El reembolso se procesará según el método de pago utilizado</li>
                    <li>• Si el pedido ya está en camino, puede haber restricciones</li>
                    <li>• Te contactaremos para confirmar la cancelación</li>
                  </ul>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => setMostrarCancelar(false)}
                  >
                    No, mantener pedido
                  </Button>
                  <Button
                    fullWidth
                    onClick={cancelarPedido}
                    style={{
                      backgroundColor: 'var(--danger)',
                      color: 'var(--texto-fondo-oscuro)'
                    }}
                  >
                    Sí, cancelar pedido
                  </Button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
