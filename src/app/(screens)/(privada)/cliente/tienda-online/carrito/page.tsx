'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState, useSyncExternalStore } from 'react';
import ModuleLayout from '../../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../../components/ui/PageHeader';
import Button from '../../../../../components/ui/Button';
import Card from '../../../../../components/ui/Card';
import Input from '../../../../../components/ui/Input';
import Modal from '../../../../../components/ui/Modal';
import { useCart, type CartItem } from '../../../../../context/CartContext';
import { hasValidToken } from '../../../../../utils/security';
import { calcularResumenCarritoVistaPrevia } from '../../../../../utils/ventaDesdeCarrito';
import Link from 'next/link';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { ServicioImagenPlaceholder } from '../../../../../components/servicios/ServicioImagen';
import { formatearPrecioMXN } from '../../../../../utils/formatoPrecio';

export default function CarritoComprasPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, loading: cartLoading } = useCart();
  const [itemToRemove, setItemToRemove] = useState<CartItem | null>(null);
  /** false en servidor y en el primer paint hidratado; true después → mismo HTML que SSR y sin mismatch. */
  const enCliente = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const { subtotal, costoEnvio: envio, total } = calcularResumenCarritoVistaPrevia(items);
  const haySesion = enCliente && hasValidToken();

  const handleRemoveConfirm = () => {
    if (itemToRemove) {
      void removeItem(itemToRemove.id);
      setItemToRemove(null);
    }
  };

  const handleQuantityChange = (item: CartItem, value: number) => {
    const qty = Math.max(1, Math.min(999, Math.floor(value) || 1));
    void updateQuantity(item.id, qty);
  };

  return (
    <ModuleLayout>
      <div className="w-full max-w-none">
        <PageHeader
          title="Carrito de Compras"
          subtitle="Revisa tus productos antes de finalizar la compra"
        />

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] gap-6 lg:gap-10">
          <div>
            {items.length === 0 ? (
              <Card className="mf-entrada text-center py-16 px-6">
                <ShoppingBag size={40} strokeWidth={1.5} className="mx-auto mb-4" style={{ color: 'var(--logo-branding)' }} aria-hidden />
                <p className="text-lg font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                  Tu carrito está vacío
                </p>
                <p className="text-sm mb-6" style={{ color: 'var(--encabezados-alterno)' }}>
                  Agrega productos desde la tienda y aparecerán aquí.
                </p>
                <Button onClick={() => router.push('/cliente/tienda-online')}>
                  Explorar Productos
                </Button>
              </Card>
            ) : (
              <Card className="mf-entrada !p-0 overflow-hidden" aria-busy={cartLoading}>
                <ul>
                  {items.map((item, index) => (
                    <li
                      key={String(item.id)}
                      className={`flex gap-4 p-4 sm:p-6 ${index > 0 ? 'border-t' : ''}`}
                      style={{ borderColor: 'var(--mf-linea)' }}
                    >
                      <div
                        className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-[10px] flex-shrink-0 overflow-hidden"
                        style={{ backgroundColor: 'var(--superficie-elevada)' }}
                      >
                        {item.imagen ? (
                          <Image
                            src={item.imagen}
                            alt={item.nombre}
                            width={192}
                            height={192}
                            className="w-full h-full object-contain"
                            unoptimized
                          />
                        ) : (
                          <ServicioImagenPlaceholder />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-semibold leading-snug" style={{ color: 'var(--menu-texto-principal)' }}>
                              {item.nombre}
                            </h3>
                            {item.presentacion && (
                              <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>{item.presentacion}</p>
                            )}
                            <p className="mf-cifras mt-1 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                              {formatearPrecioMXN(item.precio)} c/u
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setItemToRemove(item)}
                            aria-label={`Eliminar ${item.nombre} del carrito`}
                            className="mf-btn w-11 h-11 -mr-2 -mt-2 inline-flex items-center justify-center rounded-full shrink-0 hover:bg-[var(--fondos-suaves)]"
                            style={{ color: 'var(--danger-texto)' }}
                          >
                            <Trash2 size={18} aria-hidden />
                          </button>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5" role="group" aria-label={`Cantidad de ${item.nombre}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-9 h-9 !p-0 inline-flex items-center justify-center"
                              aria-label="Quitar uno"
                              disabled={cartLoading || item.cantidad <= 1}
                              onClick={() => handleQuantityChange(item, item.cantidad - 1)}
                            >
                              <Minus size={16} aria-hidden />
                            </Button>
                            <Input
                              type="number"
                              aria-label="Cantidad"
                              value={item.cantidad}
                              disabled={cartLoading}
                              onChange={(e) => handleQuantityChange(item, parseInt(e.target.value, 10))}
                              className="mf-cifras w-16 text-center !py-1.5"
                              min={1}
                              max={999}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-9 h-9 !p-0 inline-flex items-center justify-center"
                              aria-label="Agregar uno"
                              disabled={cartLoading}
                              onClick={() => handleQuantityChange(item, item.cantidad + 1)}
                            >
                              <Plus size={16} aria-hidden />
                            </Button>
                          </div>
                          <p className="mf-cifras text-lg font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                            {formatearPrecioMXN(item.precio * item.cantidad)}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {cartLoading && (
              <p className="text-sm mt-3" style={{ color: 'var(--encabezados-alterno)' }} aria-live="polite">
                Sincronizando carrito…
              </p>
            )}
          </div>

          <div className="lg:sticky lg:top-[calc(var(--mf-header-offset,136px)+1rem)] lg:self-start">
            <Card className="mf-entrada" style={{ ['--i' as string]: 1 }} padding="lg">
              <h2 className="text-xl font-bold mb-5" style={{ color: 'var(--menu-texto-principal)', fontFamily: 'var(--font-family-serif)' }}>
                Resumen de Compra
              </h2>
              <dl className="mf-cifras space-y-3 mb-5">
                <div className="flex justify-between">
                  <dt style={{ color: 'var(--encabezados-alterno)' }}>Subtotal</dt>
                  <dd style={{ color: 'var(--menu-texto-principal)' }}>{formatearPrecioMXN(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt style={{ color: 'var(--encabezados-alterno)' }}>Envío</dt>
                  <dd style={{ color: 'var(--menu-texto-principal)' }}>{formatearPrecioMXN(envio)}</dd>
                </div>
                <div className="pt-4 border-t flex justify-between items-baseline" style={{ borderColor: 'var(--mf-linea)' }}>
                  <dt className="font-bold" style={{ color: 'var(--menu-texto-principal)' }}>Total</dt>
                  <dd className="text-3xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>{formatearPrecioMXN(total)}</dd>
                </div>
              </dl>
              {enCliente && !haySesion && items.length > 0 && (
                <p className="text-sm mb-4 p-3 rounded-[10px]" style={{ backgroundColor: 'var(--fondos-suaves)', color: 'var(--encabezados-alterno)' }}>
                  Para <strong>pagar y generar tu pedido</strong> en el sistema necesitas{' '}
                  <strong>iniciar sesión</strong>. Te pediremos la cuenta antes del checkout.
                </p>
              )}
              <Button
                fullWidth
                size="lg"
                onClick={() => {
                  const destino = '/cliente/tienda-online/checkout';
                  if (!hasValidToken()) {
                    router.push(`/login?returnUrl=${encodeURIComponent(destino)}`);
                    return;
                  }
                  router.push(destino);
                }}
                disabled={items.length === 0 || cartLoading}
              >
                {!enCliente ? 'Continuar' : haySesion ? 'Continuar compra' : 'Iniciar sesión y continuar'}
              </Button>
              {/* Acción secundaria: ir a la tienda (la vuelta atrás ya es "Volver", junto a las migas).
                  Con el carrito vacío la tarjeta de la izquierda ya lleva "Explorar Productos". */}
              {items.length > 0 && (
                <Link
                  href="/cliente/tienda-online"
                  className="mt-3 flex min-h-11 w-full items-center justify-center rounded-[10px] text-sm font-semibold underline-offset-4 hover:underline"
                  style={{ color: 'var(--menu-texto-principal)' }}
                >
                  Seguir comprando
                </Link>
              )}
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

