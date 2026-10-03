'use client';

import AdminLayout from '../../../components/layouts/AdminLayout';
import PanelPedidosOnline from '../../../components/pedidos/PanelPedidosOnline';

/**
 * Pedidos por recoger (antes "Entregas y envíos"): no hay envío a domicilio, todo pedido se
 * recoge en el salón. Muestra los pedidos en preparación o listos para recoger, con sus botones.
 */
export default function PedidosPorRecogerAdminPage() {
  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-8">
        <div>
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
            Pedidos por recoger
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
            Marca los pedidos listos, entrégalos en el mostrador y cobra los que se pagan al recoger
          </p>
        </div>

        <PanelPedidosOnline vista="recoger" />
      </div>
    </AdminLayout>
  );
}
