'use client';

import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import PanelPedidosOnline from '../../../../components/pedidos/PanelPedidosOnline';

/** Pedidos por recoger en el salón: permiso propio pedidos:entregar, sin necesitar el corte de caja. */
export default function PedidosPorRecogerOperacionPage() {
  return (
    <OperacionLayout permisoRequerido="pedidos:entregar">
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
    </OperacionLayout>
  );
}
