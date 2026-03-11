'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import ModuleLayout from '../../../../../../components/layouts/ModuleLayout';
import Button from '../../../../../../components/ui/Button';
import Card from '../../../../../../components/ui/Card';
import Badge from '../../../../../../components/ui/Badge';
import Input from '../../../../../../components/ui/Input';
import { getProductoPorId, type Producto } from '../../../../../../services/productos';
import { useCart } from '../../../../../../context/CartContext';

export default function DetalleProductoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [producto, setProducto] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [presentacionSeleccionada, setPresentacionSeleccionada] = useState('');
  const [mensajeAñadido, setMensajeAñadido] = useState(false);
  const { addItem } = useCart();

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
    });
    getProductoPorId(id)
      .then((p) => {
        if (!cancelled) {
          setProducto(p ?? null);
          if (p?.presentaciones?.length) {
            const primeraDisponible = p.presentaciones.find((pr) => pr.disponible);
            setPresentacionSeleccionada(primeraDisponible?.tamaño ?? p.presentaciones[0]?.tamaño ?? '');
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al cargar el producto');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  const manejarAgregarCarrito = () => {
    if (!producto) return;
    const presActual = producto.presentaciones?.find((p) => p.tamaño === presentacionSeleccionada);
    const disponibleParaCarrito =
      producto.stock && (producto.presentaciones ? (presActual?.disponible ?? false) : true);
    if (!disponibleParaCarrito) return;
    const presIndex = producto.presentaciones?.findIndex((p) => p.tamaño === presentacionSeleccionada) ?? -1;
    const precioNum = producto.presentaciones?.length && presActual
      ? (typeof presActual.precio === 'string'
          ? parseFloat(String(presActual.precio).replace(/[^0-9.]/g, '')) || 0
          : 0)
      : (typeof producto.precio === 'string'
          ? parseFloat(producto.precio.replace(/[^0-9.]/g, '')) || 0
          : 0);
    // Id único por presentación: producto con presentaciones usa id + índice para que 250ml y 1000ml sean líneas distintas
    const itemId =
      producto.presentaciones?.length && presIndex >= 0
        ? `${producto.id}-pres-${presIndex}`
        : producto.id;
    addItem({
      id: itemId,
      nombre: producto.nombre,
      precio: precioNum,
      cantidad,
      imagen: producto.imagenes?.[0] ?? producto.imagen,
      presentacion: producto.presentaciones?.length ? presentacionSeleccionada : undefined,
    });
    setMensajeAñadido(true);
    setTimeout(() => setMensajeAñadido(false), 3000);
  };

  const manejarComprarAhora = () => {
    router.push(`/cliente/tienda-online/checkout?producto=${id}&cantidad=${cantidad}`);
  };

  if (loading) {
    return (
      <ModuleLayout>
        <div className="max-w-4xl mx-auto py-12 text-center">
          <p className="text-lead" style={{ color: 'var(--encabezados-alterno)' }}>
            Cargando producto...
          </p>
        </div>
      </ModuleLayout>
    );
  }

  if (error || !producto) {
    return (
      <ModuleLayout>
        <div className="max-w-4xl mx-auto py-12">
          <Card className="text-center py-12" style={{ borderColor: 'var(--danger)' }}>
            <p className="text-lead mb-4" style={{ color: 'var(--danger)' }}>
              {error ?? 'Producto no encontrado'}
            </p>
          </Card>
        </div>
      </ModuleLayout>
    );
  }

  const presActual = producto.presentaciones?.find((p) => p.tamaño === presentacionSeleccionada);
  const disponibleProducto = producto.stock;
  const disponiblePresentacion = producto.presentaciones
    ? (presActual?.disponible ?? false)
    : true;
  const disponible = disponibleProducto && disponiblePresentacion;
  const maxCantidad = disponible
    ? (producto.presentaciones ? (presActual?.stock ?? 0) : (producto.stockCantidad ?? 99))
    : 0;

  return (
    <ModuleLayout>
      <div className="w-full max-w-full mx-auto px-2 sm:px-3 lg:px-4 relative">
        <div className="absolute top-0 right-2 sm:right-4 z-10 hidden sm:block">
          <img
            src="/logo-mj.jpg"
            alt="Logo"
            className="w-28 h-28 sm:w-32 sm:h-40 lg:w-36 lg:h-36 object-contain"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="space-y-3 sm:space-y-4">
            <div
              className="w-full h-64 sm:h-80 lg:h-96 xl:h-[500px] rounded-lg flex items-center justify-center overflow-hidden p-4 sm:p-6"
              style={{
                backgroundColor: 'var(--texto-fondo-oscuro)',
                border: '2px solid var(--tarjetas-paneles)',
              }}
            >
              {(producto.imagenes?.[0] ?? producto.imagen) ? (
                <img
                  src={producto.imagenes?.[0] ?? producto.imagen}
                  alt={producto.nombre}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-sm sm:text-base" style={{ color: 'var(--menu-texto-principal)' }}>
                  Imagen del Producto
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div>
              <div className="flex flex-wrap gap-2 mb-2 sm:mb-3">
                <Badge variant="info" size="sm">{producto.categoria || 'Producto'}</Badge>
                {producto.nuevo && <Badge variant="success" size="sm">Nuevo</Badge>}
                {(producto.descuento ?? 0) > 0 && (
                  <Badge variant="warning" size="sm">-{producto.descuento}%</Badge>
                )}
                {producto.crueltyFree && <Badge variant="success" size="sm">Cruelty-Free</Badge>}
              </div>
              <h1
                className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3"
                style={{ color: 'var(--menu-texto-principal)' }}
              >
                {producto.nombre}
              </h1>
              {producto.marca && (
                <p className="text-base sm:text-lg mb-1 sm:mb-2" style={{ color: 'var(--encabezados-alterno)' }}>
                  <span className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>{producto.marca}</span>
                </p>
              )}
              {producto.presentaciones && producto.presentaciones.length > 0 && (
                <div className="mb-4">
                  <label className="block mb-2 text-sm sm:text-base font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
                    Presentación:
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {producto.presentaciones.map((pres) => (
                      <button
                        key={pres.tamaño}
                        onClick={() => setPresentacionSeleccionada(pres.tamaño)}
                        disabled={!pres.disponible}
                        className={`
                          px-4 py-2 rounded-lg font-medium transition-all
                          ${presentacionSeleccionada === pres.tamaño ? 'ring-2 ring-offset-2' : ''}
                          ${pres.disponible ? 'cursor-pointer hover:opacity-90' : 'cursor-not-allowed opacity-50'}
                        `}
                        style={{
                          backgroundColor: presentacionSeleccionada === pres.tamaño
                            ? 'var(--botones-principales)'
                            : pres.disponible
                            ? 'var(--tarjetas-paneles)'
                            : 'var(--fondos-suaves)',
                          color: presentacionSeleccionada === pres.tamaño
                            ? 'var(--texto-fondo-oscuro)'
                            : 'var(--menu-texto-principal)',
                        }}
                      >
                        {pres.tamaño}
                        {!pres.disponible && ' (Agotado)'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Card className="p-4 sm:p-6">
              <div className="space-y-4 sm:space-y-5">
                <div className="pb-4 border-b" style={{ borderColor: 'var(--fondos-suaves)' }}>
                  <div className="flex items-baseline gap-3 mb-3 flex-wrap">
                    {producto.presentaciones?.length ? (
                      <>
                        {presActual?.precioOriginal && (
                          <p className="text-xl sm:text-2xl line-through" style={{ color: 'var(--encabezados-alterno)' }}>
                            {presActual.precioOriginal}
                          </p>
                        )}
                        <p className="text-4xl sm:text-5xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                          {presActual?.precio ?? producto.precio}
                        </p>
                      </>
                    ) : (
                      <>
                        {producto.precioOriginal && (
                          <p className="text-xl sm:text-2xl line-through" style={{ color: 'var(--encabezados-alterno)' }}>
                            {producto.precioOriginal}
                          </p>
                        )}
                        <p className="text-4xl sm:text-5xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                          {producto.precio}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {disponible ? (
                      <>
                        <span className="text-base" style={{ color: 'var(--success)' }}>✓</span>
                        <p className="text-sm sm:text-base" style={{ color: 'var(--encabezados-alterno)' }}>
                          Stock disponible: <span className="font-semibold">{maxCantidad} unidades</span>
                        </p>
                      </>
                    ) : (
                      <p className="text-sm sm:text-base font-medium" style={{ color: 'var(--danger)' }}>
                        {!disponibleProducto ? 'Producto no disponible en este momento' : 'Agotado'}
                      </p>
                    )}
                  </div>
                </div>

                {disponible && (
                  <div>
                    <label className="block mb-3 text-base sm:text-lg font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
                      Cantidad
                    </label>
                    <div className="flex items-center gap-3">
                      <Button
                        size="md"
                        variant="outline"
                        onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                        className="w-12 h-12 text-xl"
                      >
                        −
                      </Button>
                      <Input
                        type="number"
                        value={cantidad}
                        onChange={(e) => setCantidad(Math.max(1, Math.min(maxCantidad, parseInt(e.target.value) || 1)))}
                        className="w-24 sm:w-28 text-center text-xl font-semibold"
                        min={1}
                        max={maxCantidad}
                      />
                      <Button
                        size="md"
                        variant="outline"
                        onClick={() => setCantidad(Math.min(maxCantidad, cantidad + 1))}
                        className="w-12 h-12 text-xl"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                )}

                <div className="pt-2 space-y-2">
                  {mensajeAñadido && (
                    <p
                      className="text-sm text-center font-medium py-2 rounded-lg"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--success) 20%, transparent)', color: 'var(--success)' }}
                    >
                      ✓ Añadido al carrito
                    </p>
                  )}
                  <Button
                    fullWidth
                    size="lg"
                    className="text-base sm:text-lg py-3"
                    onClick={manejarAgregarCarrito}
                    disabled={!disponible}
                  >
                    {disponible ? '🛒 Agregar al Carrito' : 'No disponible'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card className="p-4 sm:p-6 lg:p-8">
            <h2
              className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 pb-2 sm:pb-3 border-b"
              style={{ color: 'var(--menu-texto-principal)', borderColor: 'var(--fondos-suaves)' }}
            >
              📝 Descripción
            </h2>
            <div className="space-y-3 sm:space-y-4">
              <p className="text-base sm:text-lg font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
                {producto.descripcion}
              </p>
              {producto.descripcionLarga && (
                <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--encabezados-alterno)' }}>
                  {producto.descripcionLarga}
                </p>
              )}
            </div>
          </Card>

          <Card className="p-4 sm:p-6 lg:p-8">
            <h2
              className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 pb-2 sm:pb-3 border-b"
              style={{ color: 'var(--menu-texto-principal)', borderColor: 'var(--fondos-suaves)' }}
            >
              ✨ Características
            </h2>
            {producto.caracteristicas && producto.caracteristicas.length > 0 ? (
              <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                {producto.caracteristicas.map((caracteristica, index) => (
                  <li key={index} className="flex items-start gap-2 sm:gap-3">
                    <span className="text-base sm:text-lg flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }}>✓</span>
                    <span className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--encabezados-alterno)' }}>
                      {caracteristica}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>Sin características adicionales.</p>
            )}
            {producto.ingredientes && (
              <div className="pt-3 sm:pt-4 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3" style={{ color: 'var(--menu-texto-principal)' }}>
                  🧪 Ingredientes
                </h3>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--encabezados-alterno)' }}>
                  {producto.ingredientes}
                </p>
              </div>
            )}
          </Card>
        </div>

        {(producto.modoUso || producto.resultado) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
            {producto.modoUso && (
              <Card className="p-4 sm:p-6 lg:p-8">
                <h2
                  className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 pb-2 sm:pb-3 border-b"
                  style={{ color: 'var(--menu-texto-principal)', borderColor: 'var(--fondos-suaves)' }}
                >
                  📋 Modo de uso
                </h2>
                <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--encabezados-alterno)' }}>
                  {producto.modoUso}
                </p>
              </Card>
            )}
            {producto.resultado && (
              <Card className="p-4 sm:p-6 lg:p-8">
                <h2
                  className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 pb-2 sm:pb-3 border-b"
                  style={{ color: 'var(--menu-texto-principal)', borderColor: 'var(--fondos-suaves)' }}
                >
                  ✨ Resultado
                </h2>
                <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--encabezados-alterno)' }}>
                  {producto.resultado}
                </p>
              </Card>
            )}
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}
