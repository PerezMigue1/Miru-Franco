'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Sparkles, FlaskConical, ClipboardList, ShoppingCart, Zap, Check, Star, Minus, Plus, ArrowRight } from 'lucide-react';
import ModuleLayout from '../../../../../../components/layouts/ModuleLayout';
import Button from '../../../../../../components/ui/Button';
import Card from '../../../../../../components/ui/Card';
import Badge from '../../../../../../components/ui/Badge';
import Input from '../../../../../../components/ui/Input';
import {
  getProductoPorId,
  urlsGaleriaProductoDetalle,
  type Producto,
} from '../../../../../../services/productos';
import { ProductoGaleriaDetalle } from '../../../../../../components/tienda/ProductoGaleriaDetalle';
import {
  listarValoracionesProducto,
  listarPedidosQueIncluyenProducto,
  crearValoracion,
  type ValoracionApi,
  type PedidoApi,
} from '../../../../../../services/ecommerce';
import { useCart } from '../../../../../../context/CartContext';
import { showAlert, showToast } from '../../../../../../utils/toast';
import { MIRU_CATALOG_STOCK_CHANGED } from '../../../../../../utils/catalogStockSync';
import { hasValidToken } from '../../../../../../utils/security';
import Select from '../../../../../../components/ui/Select';
import Textarea from '../../../../../../components/ui/Textarea';

interface Props {
  id: string;
}

/** Número de un precio mostrado ("$1,200" / "1200"). */
function aNumero(precio?: string | null): number {
  const n = Number(String(precio ?? '').replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Algunos campos llegan como literal de array de Postgres ('{"Aplicar según…"}') y se pintaban
 * con las llaves y comillas. Solo presentación: se muestran como texto, un elemento por línea.
 */
function textoLegible(valor?: string | null): string {
  const t = String(valor ?? '').trim();
  const m = t.match(/^\{([\s\S]*)\}$/);
  if (!m) return t;
  return m[1]
    .split('","')
    .map((x) => x.replace(/^"|"$/g, '').trim())
    .filter(Boolean)
    .join('\n');
}

export default function DetalleProductoClient({ id }: Props) {
  const router = useRouter();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [presentacionSeleccionada, setPresentacionSeleccionada] = useState('');
  const [mensajeAñadido, setMensajeAñadido] = useState(false);
  const [agregando, setAgregando] = useState(false);
  const [valoraciones, setValoraciones] = useState<ValoracionApi[]>([]);
  const [pedidosParaValorar, setPedidosParaValorar] = useState<PedidoApi[]>([]);
  const [pedidoValoracion, setPedidoValoracion] = useState('');
  const [puntuacion, setPuntuacion] = useState('5');
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comentarioValoracion, setComentarioValoracion] = useState('');
  const [enviandoValoracion, setEnviandoValoracion] = useState(false);
  const { addItem } = useCart();

  const productoIdNum = producto ? Number(producto.id) : NaN;

  const urlsGaleria = useMemo(() => {
    if (!producto) return [];
    return urlsGaleriaProductoDetalle(producto, presentacionSeleccionada);
  }, [producto, presentacionSeleccionada]);

  useEffect(() => {
    if (!Number.isFinite(productoIdNum) || productoIdNum <= 0) return;
    let cancelled = false;
    listarValoracionesProducto(productoIdNum)
      .then((rows) => { if (!cancelled) setValoraciones(rows); })
      .catch(() => { if (!cancelled) setValoraciones([]); });
    return () => { cancelled = true; };
  }, [productoIdNum]);

  useEffect(() => {
    if (!hasValidToken() || !Number.isFinite(productoIdNum) || productoIdNum <= 0) {
      setPedidosParaValorar([]);
      return;
    }
    let cancelled = false;
    listarPedidosQueIncluyenProducto(productoIdNum)
      .then((peds) => { if (!cancelled) setPedidosParaValorar(peds); })
      .catch(() => { if (!cancelled) setPedidosParaValorar([]); });
    return () => { cancelled = true; };
  }, [productoIdNum]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { setLoading(true); setError(null); });
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
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Error al cargar el producto'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    let seq = 0;
    const onStock = () => {
      const my = ++seq;
      setLoading(true);
      setError(null);
      getProductoPorId(id)
        .then((p) => {
          if (my !== seq) return;
          setProducto(p ?? null);
          if (p?.presentaciones?.length) {
            const primeraDisponible = p.presentaciones.find((pr) => pr.disponible);
            setPresentacionSeleccionada(primeraDisponible?.tamaño ?? p.presentaciones[0]?.tamaño ?? '');
          }
        })
        .catch((err) => { if (my !== seq) return; setError(err instanceof Error ? err.message : 'Error al cargar el producto'); })
        .finally(() => { if (my === seq) setLoading(false); });
    };
    window.addEventListener(MIRU_CATALOG_STOCK_CHANGED, onStock);
    return () => { seq += 1; window.removeEventListener(MIRU_CATALOG_STOCK_CHANGED, onStock); };
  }, [id]);

  const manejarAgregarCarrito = async () => {
    if (!producto) return;
    const presActual = producto.presentaciones?.find((p) => p.tamaño === presentacionSeleccionada);
    const disponibleParaCarrito = producto.stock && (producto.presentaciones ? (presActual?.disponible ?? false) : true);
    if (!disponibleParaCarrito) return;
    const productoIdNum = Number(producto.id);
    if (!Number.isFinite(productoIdNum) || productoIdNum <= 0) { void showAlert('No se pudo identificar el producto.'); return; }
    let presentacionId = 0;
    if (producto.presentaciones?.length) {
      if (!presActual?.id || presActual.id <= 0) { void showAlert('Falta el id de presentación en el catálogo.'); return; }
      presentacionId = presActual.id;
    } else { void showAlert('Este producto no tiene presentaciones.'); return; }
    const precioNum = typeof presActual?.precio === 'string' ? parseFloat(String(presActual.precio).replace(/[^0-9.]/g, '')) || 0 : 0;
    setAgregando(true);
    try {
      await addItem({ nombre: producto.nombre, precio: precioNum, cantidad, imagen: urlsGaleria[0] ?? producto.imagenes?.[0] ?? producto.imagen, presentacion: presentacionSeleccionada, productoId: productoIdNum, presentacionId });
      setMensajeAñadido(true);
      setTimeout(() => setMensajeAñadido(false), 3000);
    } catch (e) { void showAlert(e instanceof Error ? e.message : 'No se pudo añadir al carrito'); }
    finally { setAgregando(false); }
  };

  const manejarComprarAhora = async () => {
    if (!producto) return;
    const presActual = producto.presentaciones?.find((p) => p.tamaño === presentacionSeleccionada);
    const disponibleParaCarrito = producto.stock && (producto.presentaciones ? (presActual?.disponible ?? false) : true);
    if (!disponibleParaCarrito) { void showAlert('Esta presentación no está disponible.'); return; }
    const productoIdNum = Number(producto.id);
    if (!Number.isFinite(productoIdNum) || productoIdNum <= 0 || !presActual?.id) { void showAlert('No se pudo identificar la presentación.'); return; }
    const precioNum = typeof presActual.precio === 'string' ? parseFloat(String(presActual.precio).replace(/[^0-9.]/g, '')) || 0 : 0;
    try {
      await addItem({ nombre: producto.nombre, precio: precioNum, cantidad, imagen: urlsGaleria[0] ?? producto.imagenes?.[0] ?? producto.imagen, presentacion: presentacionSeleccionada, productoId: productoIdNum, presentacionId: presActual.id });
      router.push('/cliente/tienda-online/checkout');
    } catch (e) { void showAlert(e instanceof Error ? e.message : 'No se pudo preparar la compra'); }
  };

  const enviarValoracion = async () => {
    if (!producto || !Number.isFinite(productoIdNum)) return;
    const pid = parseInt(pedidoValoracion, 10);
    if (!Number.isFinite(pid)) { void showAlert('Elige el pedido con el que compraste este producto.'); return; }
    const stars = parseInt(puntuacion, 10);
    if (!Number.isFinite(stars) || stars < 1 || stars > 5) { void showAlert('La puntuación debe ser entre 1 y 5.'); return; }
    setEnviandoValoracion(true);
    try {
      await crearValoracion({ productoId: productoIdNum, pedidoId: pid, puntuacion: stars, comentario: comentarioValoracion.trim() || undefined });
      showToast('Gracias por tu reseña', 'success');
      setComentarioValoracion('');
      const rows = await listarValoracionesProducto(productoIdNum);
      setValoraciones(rows);
    } catch (e) { void showAlert(e instanceof Error ? e.message : 'No se pudo guardar la reseña'); }
    finally { setEnviandoValoracion(false); }
  };

  if (loading) {
    return (
      <ModuleLayout>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-6 lg:gap-12" aria-busy="true" aria-label="Cargando producto">
          <div className="mf-skeleton h-72 sm:h-96 lg:h-[520px]" style={{ borderRadius: 'var(--mf-radio)' }} />
          <div className="space-y-4 pt-2">
            <div className="mf-skeleton h-4 w-1/4" />
            <div className="mf-skeleton h-10 w-3/4" />
            <div className="mf-skeleton h-12 w-1/3 mt-6" />
            <div className="mf-skeleton h-12 w-full mt-10" />
          </div>
        </div>
      </ModuleLayout>
    );
  }

  if (error || !producto) {
    return (
      <ModuleLayout>
        <div className="max-w-4xl mx-auto py-12">
          <Card className="text-center py-12" style={{ borderColor: 'var(--danger)' }}>
            <p className="text-lead mb-4" style={{ color: 'var(--danger-texto)' }}>{error ?? 'Producto no encontrado'}</p>
          </Card>
        </div>
      </ModuleLayout>
    );
  }

  const presActual = producto.presentaciones?.find((p) => p.tamaño === presentacionSeleccionada);
  const disponibleProducto = producto.stock;
  const disponiblePresentacion = producto.presentaciones ? (presActual?.disponible ?? false) : true;
  const disponible = disponibleProducto && disponiblePresentacion;
  const maxCantidad = disponible ? (producto.presentaciones ? (presActual?.stock ?? 0) : (producto.stockCantidad ?? 99)) : 0;
  const precioActual = producto.presentaciones?.length ? (presActual?.precio ?? producto.precio) : producto.precio;
  const precioOriginal = producto.presentaciones?.length ? presActual?.precioOriginal : producto.precioOriginal;
  // Tachado solo con rebaja real (antes salía "$350 $350").
  const hayRebaja = aNumero(precioOriginal) > aNumero(precioActual);
  const descuentoValido = (producto.descuento ?? 0) > 0 && (producto.descuento ?? 0) < 100;

  return (
    <ModuleLayout>
      <div className="mf-entrada">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-6 lg:gap-12 mb-14">
          {/* Galería fija en escritorio mientras se decide la compra */}
          <div className="lg:sticky lg:top-[calc(var(--mf-header-offset,136px)+1rem)] lg:self-start">
            <div
              className="relative flex h-72 w-full items-center justify-center overflow-hidden p-4 sm:h-96 sm:p-6 lg:h-[520px]"
              style={{ backgroundColor: 'var(--superficie-elevada)', borderRadius: 'var(--mf-radio)', boxShadow: 'var(--mf-sombra-1)' }}
            >
              <ProductoGaleriaDetalle urls={urlsGaleria} nombreProducto={producto.nombre} />
            </div>
          </div>

          <div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="info" size="sm">{producto.categoria || 'Producto'}</Badge>
              {producto.nuevo && <Badge variant="success" size="sm">Nuevo</Badge>}
              {/* Un porcentaje fuera de 1–99 es un dato mal cargado ("-350%"): no se muestra */}
              {descuentoValido && <Badge variant="warning" size="sm">-{producto.descuento}%</Badge>}
              {producto.crueltyFree && <Badge variant="success" size="sm">Cruelty-Free</Badge>}
            </div>
            {producto.marca && (
              <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--encabezados-alterno)' }}>
                {producto.marca}
              </p>
            )}
            <h1 className="mf-titulo-pagina mt-1" style={{ color: 'var(--menu-texto-principal)' }}>{producto.nombre}</h1>

            <div className="mf-cifras mt-6 flex items-baseline gap-3 flex-wrap">
              <p className="text-4xl sm:text-5xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>{precioActual}</p>
              {hayRebaja && <p className="text-xl line-through" style={{ color: 'var(--encabezados-alterno)' }}>{precioOriginal}</p>}
            </div>
            <div className="mt-2 flex items-center gap-2">
              {disponible ? (
                <><Check size={16} aria-hidden style={{ color: 'var(--success-texto)' }} /><p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Stock disponible: <span className="font-semibold mf-cifras">{maxCantidad} unidades</span></p></>
              ) : (
                <p className="text-sm font-medium" style={{ color: 'var(--danger-texto)' }}>{!disponibleProducto ? 'Producto no disponible en este momento' : 'Agotado'}</p>
              )}
            </div>

            <div className="mt-8 pt-8 border-t space-y-7" style={{ borderColor: 'var(--mf-linea)' }}>
              {producto.presentaciones && producto.presentaciones.length > 0 && (
                <div>
                  <p className="mb-3 text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>Presentación</p>
                  <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Presentación">
                    {producto.presentaciones.map((pres) => {
                      const elegida = presentacionSeleccionada === pres.tamaño;
                      return (
                        <button
                          key={pres.id ?? pres.tamaño}
                          type="button"
                          role="radio"
                          aria-checked={elegida}
                          onClick={() => setPresentacionSeleccionada(pres.tamaño)}
                          disabled={!pres.disponible}
                          className={`mf-btn min-h-11 px-4 rounded-full text-sm font-semibold ${pres.disponible ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                          style={{
                            backgroundColor: elegida ? 'var(--botones-principales)' : 'transparent',
                            color: elegida ? 'var(--texto-fondo-oscuro)' : 'var(--menu-texto-principal)',
                            boxShadow: elegida ? 'none' : 'inset 0 0 0 1.5px var(--mf-linea), inset 0 0 0 1.5px color-mix(in srgb, var(--menu-texto-principal) 45%, transparent)',
                          }}
                        >
                          {pres.tamaño}{!pres.disponible && ' (Agotado)'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {disponible && (
                <div>
                  <p className="mb-3 text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>Cantidad</p>
                  <div className="flex items-center gap-2">
                    <Button size="md" variant="outline" onClick={() => setCantidad(Math.max(1, cantidad - 1))} className="w-12 h-12 !p-0 inline-flex items-center justify-center" aria-label="Quitar uno" disabled={cantidad <= 1}>
                      <Minus size={18} aria-hidden />
                    </Button>
                    <Input type="number" aria-label="Cantidad" value={cantidad} onChange={(e) => setCantidad(Math.max(1, Math.min(maxCantidad, parseInt(e.target.value) || 1)))} className="mf-cifras w-20 text-center text-lg font-semibold" min={1} max={maxCantidad} />
                    <Button size="md" variant="outline" onClick={() => setCantidad(Math.min(maxCantidad, cantidad + 1))} className="w-12 h-12 !p-0 inline-flex items-center justify-center" aria-label="Agregar uno" disabled={cantidad >= maxCantidad}>
                      <Plus size={18} aria-hidden />
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {/* El botón se transforma en confirmación (crossfade con blur) en vez de insertar un
                    mensaje encima que empujaba el layout. */}
                <Button fullWidth size="lg" className="py-3.5" onClick={() => void manejarAgregarCarrito()} disabled={!disponible || agregando}>
                  <span className="mf-feedback-contenido w-full" data-cambiando={agregando ? 'true' : 'false'}>
                    {!disponible ? 'No disponible' : mensajeAñadido ? (
                      <><Check size={18} aria-hidden /> Agregado al carrito</>
                    ) : (
                      <><ShoppingCart size={18} aria-hidden /> Agregar al carrito</>
                    )}
                  </span>
                </Button>
                <Button fullWidth size="lg" variant="outline" className="py-3.5 inline-flex items-center justify-center gap-2" onClick={() => void manejarComprarAhora()} disabled={!disponible}>
                  {disponible ? <><Zap size={18} aria-hidden /> Comprar ahora</> : 'No disponible'}
                </Button>
                <p className="h-6 text-center text-sm transition-opacity duration-200" style={{ opacity: mensajeAñadido ? 1 : 0 }} aria-live="polite">
                  {mensajeAñadido && (
                    <Link href="/cliente/tienda-online/carrito" className="inline-flex items-center gap-1.5 font-semibold underline-offset-4 hover:underline" style={{ color: 'var(--menu-texto-principal)' }}>
                      Ver carrito <ArrowRight size={14} aria-hidden />
                    </Link>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-10 lg:gap-12">
          <section className="mf-revelar">
            <h2 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)', letterSpacing: '-0.02em' }}>Descripción</h2>
            <p className="mt-4 text-lg font-medium max-w-[62ch]" style={{ color: 'var(--menu-texto-principal)' }}>{producto.descripcion}</p>
            {producto.descripcionLarga && (
              <p className="mt-4 text-base leading-relaxed max-w-[65ch]" style={{ color: 'var(--encabezados-alterno)' }}>{producto.descripcionLarga}</p>
            )}
          </section>

          <Card className="mf-revelar p-6 sm:p-8">
            <h2 className="sr-only">Detalles del producto</h2>
            <div className="space-y-6">
              <div>
                <h3 className="flex items-center gap-2 text-base font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                  <Sparkles size={18} aria-hidden style={{ color: 'var(--logo-branding)' }} /> Características
                </h3>
                {producto.caracteristicas && producto.caracteristicas.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {producto.caracteristicas.map((c, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Check size={16} className="flex-shrink-0 mt-1" style={{ color: 'var(--success-texto)' }} aria-hidden />
                        <span className="text-sm leading-relaxed" style={{ color: 'var(--encabezados-alterno)' }}>{c}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-2 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Sin características adicionales.</p>}
              </div>
              {producto.ingredientes && (
                <div className="pt-6 border-t" style={{ borderColor: 'var(--mf-linea)' }}>
                  <h3 className="flex items-center gap-2 text-base font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                    <FlaskConical size={18} aria-hidden style={{ color: 'var(--logo-branding)' }} /> Ingredientes
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--encabezados-alterno)' }}>{textoLegible(producto.ingredientes)}</p>
                </div>
              )}
              {producto.modoUso && (
                <div className="pt-6 border-t" style={{ borderColor: 'var(--mf-linea)' }}>
                  <h3 className="flex items-center gap-2 text-base font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                    <ClipboardList size={18} aria-hidden style={{ color: 'var(--logo-branding)' }} /> Modo de uso
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--encabezados-alterno)' }}>{textoLegible(producto.modoUso)}</p>
                </div>
              )}
              {producto.resultado && (
                <div className="pt-6 border-t" style={{ borderColor: 'var(--mf-linea)' }}>
                  <h3 className="flex items-center gap-2 text-base font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                    <Star size={18} aria-hidden style={{ color: 'var(--logo-branding)' }} /> Resultado
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--encabezados-alterno)' }}>{textoLegible(producto.resultado)}</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <Card className="mf-revelar p-6 sm:p-8 mt-10">
          <h2 className="text-elegant-title mb-4" style={{ color: 'var(--menu-texto-principal)', letterSpacing: '-0.02em' }}>
            Opiniones
          </h2>
          {valoraciones.length === 0 ? (
            <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>Sé el primero en opinar (o aún no hay reseñas públicas).</p>
          ) : (
            <ul className="space-y-4 mb-6">
              {valoraciones.map((v) => (
                <li key={v.id} className="text-sm border-b pb-3 last:border-0" style={{ borderColor: 'var(--fondos-suaves)' }}>
                  <div className="flex items-center gap-1 mb-1">
                    {Array.from({ length: Math.min(5, Math.max(0, v.puntuacion)) }, (_, i) => (
                      <Star key={i} size={13} fill="currentColor" aria-hidden style={{ color: 'var(--botones-principales)' }} />
                    ))}
                    <span className="ml-1 text-xs" style={{ color: 'var(--encabezados-alterno)' }}>Pedido #{v.pedidoId}</span>
                  </div>
                  {v.comentario && <p style={{ color: 'var(--menu-texto-principal)' }}>{v.comentario}</p>}
                  <p className="text-xs mt-1" style={{ color: 'var(--encabezados-alterno)' }}>{v.creadoEn ? new Date(v.creadoEn).toLocaleDateString('es-MX') : ''}</p>
                </li>
              ))}
            </ul>
          )}
          {hasValidToken() && pedidosParaValorar.length > 0 && (
            <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
              <h3 className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>Dejar reseña</h3>
              <p className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>Una reseña por producto. Elige el pedido donde compraste este artículo.</p>
              <Select label="Pedido" value={pedidoValoracion} onChange={(e) => setPedidoValoracion(e.target.value)} options={[{ value: '', label: 'Selecciona pedido…' }, ...pedidosParaValorar.map((p) => ({ value: String(p.id), label: `#${p.id} — ${new Date(p.creadoEn ?? '').toLocaleDateString('es-MX')}` }))]} fullWidth />
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--menu-texto-principal)' }}>Puntuación</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setPuntuacion(String(star))}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      className="transition-transform duration-100 hover:scale-110 focus:outline-none"
                      aria-label={star + ' estrella' + (star > 1 ? 's' : '')}
                    >
                      <Star
                        size={32}
                        strokeWidth={1.5}
                        fill={(hoveredStar || parseInt(puntuacion)) >= star ? 'currentColor' : 'none'}
                        style={{ color: (hoveredStar || parseInt(puntuacion)) >= star ? 'var(--logo-branding)' : 'var(--encabezados-alterno)' }}
                        aria-hidden
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                    {parseInt(puntuacion)} de 5
                  </span>
                </div>
              </div>
              <Textarea label="Comentario (opcional)" value={comentarioValoracion} onChange={(e) => setComentarioValoracion(e.target.value)} rows={3} fullWidth />
              <Button onClick={() => void enviarValoracion()} disabled={enviandoValoracion}>{enviandoValoracion ? 'Enviando…' : 'Publicar reseña'}</Button>
            </div>
          )}
          {hasValidToken() && pedidosParaValorar.length === 0 && producto && (
            <p className="text-sm mt-4 pt-4 border-t" style={{ color: 'var(--encabezados-alterno)', borderColor: 'var(--fondos-suaves)' }}>
              Para valorar necesitas un pedido que incluya este producto.{' '}
              <button type="button" className="underline font-medium" style={{ color: 'var(--menu-texto-principal)' }} onClick={() => router.push('/cliente/tienda-online/mis-pedidos')}>Ver mis pedidos</button>
            </p>
          )}
        </Card>
      </div>
    </ModuleLayout>
  );
}
