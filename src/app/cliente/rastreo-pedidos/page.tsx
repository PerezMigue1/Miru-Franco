'use client';

import { useState } from 'react';
import PublicLayout from '../../components/layouts/PublicLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { colors } from '../../utils/colors';

export default function RastreoPedidosPage() {
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<number | null>(null);
  
  const pedidos = [
    { id: 1, numero: 'PED-001', productos: 'Shampoo Avina x2', fecha: '2024-01-15', estado: 'en_camino', zona: 'Colonia Juárez', mensajero: 'En ruta' },
    { id: 2, numero: 'PED-002', productos: 'Acondicionador Tech Italy', fecha: '2024-01-14', estado: 'entregado', zona: 'Centro', mensajero: '-' },
    { id: 3, numero: 'PED-003', productos: 'Mascarilla Alfaparf', fecha: '2024-01-13', estado: 'preparado', zona: 'Centro Reloj', mensajero: '-' },
  ];

  const estados = {
    preparado: { label: 'Preparado', variant: 'info' as const, descripcion: 'Tu pedido está listo para envío' },
    en_camino: { label: 'En Camino', variant: 'warning' as const, descripcion: 'Tu pedido está en camino a tu domicilio' },
    entregado: { label: 'Entregado', variant: 'success' as const, descripcion: 'Tu pedido ha sido entregado' },
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12" style={{ marginTop: '136px' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-hero mb-4" style={{ color: colors.menuTextoPrincipal }}>
              Rastreo de Pedidos
            </h1>
            <p className="text-lead" style={{ color: colors.encabezadosAlterno }}>
              Consulta el estado de tus pedidos en tiempo real
            </p>
          </div>

          <div className="space-y-6">
            {pedidos.map((pedido) => (
              <Card 
                key={pedido.id}
                className="cursor-pointer transition-transform hover:scale-[1.02]"
                onClick={() => setPedidoSeleccionado(pedido.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-subtitle mb-2" style={{ color: colors.menuTextoPrincipal }}>
                      Pedido #{pedido.numero}
                    </h3>
                    <p className="text-sm mb-1" style={{ color: colors.encabezadosAlterno }}>
                      {pedido.productos}
                    </p>
                    <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                      Fecha: {pedido.fecha} • Zona: {pedido.zona}
                    </p>
                  </div>
                  <Badge variant={estados[pedido.estado as keyof typeof estados]?.variant || 'default'}>
                    {estados[pedido.estado as keyof typeof estados]?.label || pedido.estado}
                  </Badge>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                  <p className="text-sm font-semibold mb-1" style={{ color: colors.menuTextoPrincipal }}>
                    Estado Actual:
                  </p>
                  <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                    {estados[pedido.estado as keyof typeof estados]?.descripcion}
                  </p>
                  {pedido.mensajero !== '-' && (
                    <p className="text-sm mt-2" style={{ color: colors.encabezadosAlterno }}>
                      Mensajero: {pedido.mensajero}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {pedidoSeleccionado && (
            <Modal
              isOpen={true}
              onClose={() => setPedidoSeleccionado(null)}
              title={`Pedido #${pedidos.find(p => p.id === pedidoSeleccionado)?.numero}`}
            >
              {(() => {
                const pedido = pedidos.find(p => p.id === pedidoSeleccionado);
                if (!pedido) return null;
                const estadoInfo = estados[pedido.estado as keyof typeof estados];
                return (
                  <div className="space-y-4">
                    <div>
                      <p className="font-semibold mb-2" style={{ color: colors.menuTextoPrincipal }}>
                        Productos:
                      </p>
                      <p style={{ color: colors.encabezadosAlterno }}>{pedido.productos}</p>
                    </div>
                    <div>
                      <p className="font-semibold mb-2" style={{ color: colors.menuTextoPrincipal }}>
                        Fecha del Pedido:
                      </p>
                      <p style={{ color: colors.encabezadosAlterno }}>{pedido.fecha}</p>
                    </div>
                    <div>
                      <p className="font-semibold mb-2" style={{ color: colors.menuTextoPrincipal }}>
                        Zona de Entrega:
                      </p>
                      <p style={{ color: colors.encabezadosAlterno }}>{pedido.zona}</p>
                    </div>
                    <div>
                      <p className="font-semibold mb-2" style={{ color: colors.menuTextoPrincipal }}>
                        Estado:
                      </p>
                      <Badge variant={estadoInfo?.variant || 'default'}>
                        {estadoInfo?.label || pedido.estado}
                      </Badge>
                      <p className="mt-2 text-sm" style={{ color: colors.encabezadosAlterno }}>
                        {estadoInfo?.descripcion}
                      </p>
                    </div>
                    {pedido.mensajero !== '-' && (
                      <div>
                        <p className="font-semibold mb-2" style={{ color: colors.menuTextoPrincipal }}>
                          Mensajero:
                        </p>
                        <p style={{ color: colors.encabezadosAlterno }}>{pedido.mensajero}</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </Modal>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

