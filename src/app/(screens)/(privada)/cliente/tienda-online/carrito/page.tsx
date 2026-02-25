'use client';

import { useRouter } from 'next/navigation';
import ModuleLayout from '../../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../../components/ui/PageHeader';
import Button from '../../../../../components/ui/Button';
import Card from '../../../../../components/ui/Card';
import Input from '../../../../../components/ui/Input';
import { colors } from '../../../../../utils/colors';
import { useCart } from '../../../../../context/CartContext';

export default function CarritoComprasPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem } = useCart();

  const subtotal = items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  const envio = items.length > 0 ? 50 : 0;
  const total = subtotal + envio;

  return (
    <ModuleLayout>
      <div className="max-w-6xl mx-auto">
        <Button 
          variant="outline" 
          onClick={() => router.push('/cliente/tienda-online')} 
          className="mb-6"
        >
          ← Continuar Comprando
        </Button>

        <PageHeader
          title="Carrito de Compras"
          subtitle="Revisa tus productos antes de finalizar la compra"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {items.length === 0 ? (
              <Card className="text-center py-12">
                <p className="text-lead mb-4" style={{ color: colors.encabezadosAlterno }}>
                  Tu carrito está vacío
                </p>
                <Button onClick={() => router.push('/cliente/tienda-online')}>
                  Explorar Productos
                </Button>
              </Card>
            ) : (
              items.map((item) => (
                <Card key={String(item.id)}>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div
                      className="w-full md:w-32 h-32 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                      style={{ backgroundColor: colors.fondosSuaves }}
                    >
                      {item.imagen ? (
                        <img
                          src={item.imagen}
                          alt={item.nombre}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-xs" style={{ color: colors.menuTextoPrincipal }}>
                          Imagen
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3
                            className="text-subtitle mb-1"
                            style={{ color: colors.menuTextoPrincipal }}
                          >
                            {item.nombre}
                            {item.presentacion && (
                              <span className="text-sm font-normal ml-1" style={{ color: colors.encabezadosAlterno }}>
                                — {item.presentacion}
                              </span>
                            )}
                          </h3>
                          <p
                            className="text-lg font-bold"
                            style={{ color: colors.menuTextoPrincipal }}
                          >
                            ${item.precio.toLocaleString()}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => removeItem(item.id)}
                        >
                          Eliminar
                        </Button>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium" style={{ color: colors.encabezadosAlterno }}>
                            Cantidad:
                          </label>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, Math.max(1, item.cantidad - 1))}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              value={item.cantidad}
                              onChange={(e) => updateQuantity(item.id, Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-20 text-center"
                              min={1}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, item.cantidad + 1)}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                            Subtotal:
                          </p>
                          <p
                            className="text-xl font-bold"
                            style={{ color: colors.menuTextoPrincipal }}
                          >
                            ${(item.precio * item.cantidad).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <div>
            <Card>
              <h3
                className="text-subtitle mb-4"
                style={{ color: colors.menuTextoPrincipal }}
              >
                Resumen de Compra
              </h3>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span style={{ color: colors.encabezadosAlterno }}>Subtotal:</span>
                  <span style={{ color: colors.menuTextoPrincipal }}>${subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: colors.encabezadosAlterno }}>Envío:</span>
                  <span style={{ color: colors.menuTextoPrincipal }}>${envio.toLocaleString()}</span>
                </div>
                <div className="pt-3 border-t" style={{ borderColor: colors.fondosSuaves }}>
                  <div className="flex justify-between">
                    <span className="font-bold" style={{ color: colors.menuTextoPrincipal }}>
                      Total:
                    </span>
                    <span
                      className="text-2xl font-bold"
                      style={{ color: colors.menuTextoPrincipal }}
                    >
                      ${total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                fullWidth
                size="lg"
                onClick={() => router.push('/cliente/tienda-online/checkout')}
                disabled={items.length === 0}
              >
                Proceder al Checkout
              </Button>
              <Button
                fullWidth
                variant="outline"
                className="mt-3"
                onClick={() => router.push('/cliente/tienda-online')}
              >
                Continuar Comprando
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}

