'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';
import ModuleLayout from '../../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../../components/ui/PageHeader';
import Button from '../../../../../components/ui/Button';
import Card from '../../../../../components/ui/Card';
import Input from '../../../../../components/ui/Input';
import Modal from '../../../../../components/ui/Modal';
import { useCart, type CartItem } from '../../../../../context/CartContext';

export default function CarritoComprasPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem } = useCart();
  const [itemToRemove, setItemToRemove] = useState<CartItem | null>(null);

  const subtotal = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  const envio = items.length > 0 ? 50 : 0;
  const total = subtotal + envio;

  const handleRemoveConfirm = () => {
    if (itemToRemove) {
      removeItem(itemToRemove.id);
      setItemToRemove(null);
    }
  };

  const handleQuantityChange = (item: CartItem, value: number) => {
    const qty = Math.max(1, Math.min(999, Math.floor(value) || 1));
    updateQuantity(item.id, qty);
  };

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
                <p className="text-lead mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
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
                      style={{ backgroundColor: 'var(--fondos-suaves)' }}
                    >
                      {item.imagen ? (
                        <Image
                          src={item.imagen}
                          alt={item.nombre}
                          width={256}
                          height={256}
                          className="w-full h-full object-contain"
                          unoptimized
                        />
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--menu-texto-principal)' }}>
                          Imagen
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3
                            className="text-subtitle mb-1"
                            style={{ color: 'var(--menu-texto-principal)' }}
                          >
                            {item.nombre}
                            {item.presentacion && (
                              <span className="text-sm font-normal ml-1" style={{ color: 'var(--encabezados-alterno)' }}>
                                — {item.presentacion}
                              </span>
                            )}
                          </h3>
                          <p
                            className="text-lg font-bold"
                            style={{ color: 'var(--menu-texto-principal)' }}
                          >
                            ${item.precio.toLocaleString()}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setItemToRemove(item)}
                        >
                          Eliminar
                        </Button>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>
                            Cantidad:
                          </label>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuantityChange(item, item.cantidad - 1)}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              value={item.cantidad}
                              onChange={(e) => handleQuantityChange(item, parseInt(e.target.value, 10))}
                              className="w-20 text-center"
                              min={1}
                              max={999}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuantityChange(item, item.cantidad + 1)}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                            Subtotal:
                          </p>
                          <p
                            className="text-xl font-bold"
                            style={{ color: 'var(--menu-texto-principal)' }}
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
                style={{ color: 'var(--menu-texto-principal)' }}
              >
                Resumen de Compra
              </h3>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--encabezados-alterno)' }}>Subtotal:</span>
                  <span style={{ color: 'var(--menu-texto-principal)' }}>${subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--encabezados-alterno)' }}>Envío:</span>
                  <span style={{ color: 'var(--menu-texto-principal)' }}>${envio.toLocaleString()}</span>
                </div>
                <div className="pt-3 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
                  <div className="flex justify-between">
                    <span className="font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                      Total:
                    </span>
                    <span
                      className="text-2xl font-bold"
                      style={{ color: 'var(--menu-texto-principal)' }}
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

      <Modal
        isOpen={!!itemToRemove}
        onClose={() => setItemToRemove(null)}
        title="Eliminar producto"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setItemToRemove(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleRemoveConfirm}>
              Eliminar
            </Button>
          </>
        }
      >
        <p style={{ color: 'var(--menu-texto-principal)' }}>
          ¿Quieres eliminar &quot;{itemToRemove?.nombre}
          {itemToRemove?.presentacion ? ` — ${itemToRemove.presentacion}` : ''}&quot; del carrito?
        </p>
      </Modal>
    </ModuleLayout>
  );
}

