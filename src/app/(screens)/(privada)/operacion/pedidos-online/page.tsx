'use client';

import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import PanelPedidosOnline from '../../../../components/pedidos/PanelPedidosOnline';

/**
 * Cobro de pedidos online para la jefa (estilista): ver pedidos, cobrar al recoger
 * (aprueba el Pago + marca el Pedido como pagado) y avanzar el estado. Sin pasarela
 * ni envíos — el modelo es "la clienta recoge y paga en el salón". admin/venta-online
 * conserva la versión completa (envíos, pedido manual, montos) para el admin técnico.
 */
export default function PedidosOnlinePage() {
  return (
    <OperacionLayout permisoRequerido="caja:escritura">
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div>
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
            Pedidos online
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
            Cobra y marca los pedidos que las clientas recogen en el salón
          </p>
        </div>

        <PanelPedidosOnline />
      </div>
    </OperacionLayout>
  );
}
