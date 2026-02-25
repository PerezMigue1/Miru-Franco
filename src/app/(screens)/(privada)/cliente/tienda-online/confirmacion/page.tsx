'use client';

import { useRouter } from 'next/navigation';
import ModuleLayout from '../../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../../components/ui/PageHeader';
import Button from '../../../../../components/ui/Button';
import Card from '../../../../../components/ui/Card';
import Badge from '../../../../../components/ui/Badge';
import { colors } from '../../../../../utils/colors';

export default function ConfirmacionCompraPage() {
  const router = useRouter();

  const pedido = {
    numero: 'PED-2024-001',
    fecha: new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    productos: [
      { nombre: 'Shampoo Abbondanza', cantidad: 2, precio: 250 },
      { nombre: 'Acondicionador Tech Italy', cantidad: 1, precio: 280 },
      { nombre: 'Mascarilla Capilar Nutritiva', cantidad: 1, precio: 350 },
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
    },
    metodoPago: 'Tarjeta de Crédito',
    estado: 'confirmado',
  };

  return (
    <ModuleLayout>
      <div className="max-w-3xl mx-auto">
        <Card className="text-center">
          <div className="mb-6">
            <div
              className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: colors.success }}
            >
              <span className="text-4xl" style={{ color: colors.textoFondoOscuro }}>
                ✓
              </span>
            </div>
            <h1
              className="text-hero mb-2"
              style={{ color: colors.menuTextoPrincipal }}
            >
              ¡Compra Confirmada!
            </h1>
            <p
              className="text-lead"
              style={{ color: colors.encabezadosAlterno }}
            >
              Tu pedido ha sido procesado exitosamente
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 mb-6 text-left" style={{ backgroundColor: colors.fondosSuaves }}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: colors.encabezadosAlterno }}>
                  Número de Pedido:
                </span>
                <span className="font-mono font-bold" style={{ color: colors.menuTextoPrincipal }}>
                  {pedido.numero}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: colors.encabezadosAlterno }}>
                  Fecha:
                </span>
                <span style={{ color: colors.menuTextoPrincipal }}>{pedido.fecha}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: colors.encabezadosAlterno }}>
                  Hora:
                </span>
                <span style={{ color: colors.menuTextoPrincipal }}>{pedido.hora}</span>
              </div>
              <div className="pt-4 border-t" style={{ borderColor: colors.tarjetasPaneles }}>
                <p className="font-semibold mb-2" style={{ color: colors.menuTextoPrincipal }}>
                  Productos:
                </p>
                <div className="space-y-1">
                  {pedido.productos.map((producto, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span style={{ color: colors.encabezadosAlterno }}>
                        {producto.cantidad}x {producto.nombre}
                      </span>
                      <span style={{ color: colors.menuTextoPrincipal }}>
                        ${(producto.cantidad * producto.precio).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t" style={{ borderColor: colors.tarjetasPaneles }}>
                <div className="flex justify-between mb-1">
                  <span style={{ color: colors.encabezadosAlterno }}>Subtotal:</span>
                  <span style={{ color: colors.menuTextoPrincipal }}>${pedido.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span style={{ color: colors.encabezadosAlterno }}>Envío:</span>
                  <span style={{ color: colors.menuTextoPrincipal }}>${pedido.envio.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t" style={{ borderColor: colors.fondosSuaves }}>
                  <span className="font-bold" style={{ color: colors.menuTextoPrincipal }}>
                    Total:
                  </span>
                  <span
                    className="text-2xl font-bold"
                    style={{ color: colors.menuTextoPrincipal }}
                  >
                    ${pedido.total.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="pt-4 border-t" style={{ borderColor: colors.tarjetasPaneles }}>
                <p className="font-semibold mb-1" style={{ color: colors.menuTextoPrincipal }}>
                  Dirección de Envío:
                </p>
                <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                  {pedido.direccion.calle} {pedido.direccion.numero}, {pedido.direccion.colonia}
                  <br />
                  {pedido.direccion.ciudad}, {pedido.direccion.estado} {pedido.direccion.codigoPostal}
                </p>
              </div>
              <div className="flex justify-center pt-4">
                <Badge variant="success" size="lg">Confirmado</Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: colors.fondosSuaves }}
            >
              <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                <strong>Importante:</strong> Recibirás un correo electrónico de confirmación con todos los detalles de tu pedido. 
                Te notificaremos cuando tu pedido sea enviado.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                fullWidth
                onClick={() => router.push('/cliente/tienda-online/mis-pedidos')}
              >
                Ver Mis Pedidos
              </Button>
              <Button
                variant="outline"
                fullWidth
                onClick={() => router.push('/cliente/tienda-online')}
              >
                Seguir Comprando
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </ModuleLayout>
  );
}

