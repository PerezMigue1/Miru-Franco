'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Modal from '../../../components/ui/Modal';
import CatalogoCard from '../../../components/admin/CatalogoCard';
import { IMG_SERVICIO_PLACEHOLDER } from '../../../utils/serviceImagePlaceholder';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeDollarSign,
  CalendarDays,
  CircleX,
  Package,
  Percent,
  Settings2,
} from 'lucide-react';
import { getCategoryColor, getEstadoColor } from '../../../utils/categoryColors';
import {
  getProductosSinRedirigir,
  aplicarDescuentoGlobal,
  type Producto,
} from '../../../services/productos';
import { MIRU_CATALOG_STOCK_CHANGED } from '../../../utils/catalogStockSync';
import { registrarEntrada, registrarSalida, registrarAjuste } from '../../../services/inventarioMovimientos';

// Helper simple para sacar número de un precio tipo "$350"
function precioANumero(precio: string | undefined): number {
  if (!precio) return 0;
  const s = String(precio).replace(/[^0-9.,]/g, '').replace(',', '.');
  return parseFloat(s) || 0;
}

// Próxima caducidad: la fecha más cercana entre presentaciones con fecha_caducidad
function proximaCaducidad(producto: Producto): { fecha: string | null; diasRestantes: number | null; estado: 'vigente' | 'proximo' | 'vencido' | null } {
  const fechas = (producto.presentaciones ?? [])
    .map((p) => p.fechaCaducidad)
    .filter((f): f is string => !!f);
  if (fechas.length === 0) return { fecha: null, diasRestantes: null, estado: null };
  const ordenadas = fechas.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const masCercana = ordenadas[0];
  const ahora = new Date();
  const fechaCad = new Date(masCercana);
  const dias = Math.floor((fechaCad.getTime() - ahora.getTime()) / (24 * 60 * 60 * 1000));
  const estado: 'vigente' | 'proximo' | 'vencido' = dias < 0 ? 'vencido' : dias <= 30 ? 'proximo' : 'vigente';
  const fechaFormateada = fechaCad.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return { fecha: fechaFormateada, diasRestantes: dias, estado };
}

export default function InventarioPage() {
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('all');
  // Desmarcado = solo disponibles (como hoy); marcado = SOLO no disponibles. Mismo patrón que Servicios.
  const [mostrarSoloInactivos, setMostrarSoloInactivos] = useState(false);
  const [pagina, setPagina] = useState(1);
  const PRODUCTOS_POR_PAGINA = 30;
  const [marcaDescuento, setMarcaDescuento] = useState('');
  const [categoriaDescuento, setCategoriaDescuento] = useState('');
  const [porcentajeDescuento, setPorcentajeDescuento] = useState('');
  const [aplicandoDescuento, setAplicandoDescuento] = useState(false);
  const [resultadoDescuento, setResultadoDescuento] = useState<{ ok: boolean; mensaje: string } | null>(null);
  const [isModalDescuentoOpen, setIsModalDescuentoOpen] = useState(false);

  // Modales de movimiento
  const [isModalEntradaOpen, setIsModalEntradaOpen] = useState(false);
  const [isModalSalidaOpen, setIsModalSalidaOpen] = useState(false);
  const [isModalAjusteOpen, setIsModalAjusteOpen] = useState(false);
  const [movPresentacionId, setMovPresentacionId] = useState('');
  const [movCantidad, setMovCantidad] = useState('');
  const [movMotivo, setMovMotivo] = useState('');
  const [movStockReal, setMovStockReal] = useState('');
  const [movSaving, setMovSaving] = useState(false);
  const [movError, setMovError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProductosSinRedirigir({ incluirNoDisponibles: true })
      .then((result) => {
        if (cancelled) return;
        setProductos(result.data);
        setError(result.error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let seq = 0;
    const onStock = () => {
      const my = ++seq;
      setLoading(true);
      setError(null);
      getProductosSinRedirigir({ incluirNoDisponibles: true })
        .then((result) => {
          if (my !== seq) return;
          setProductos(result.data);
          setError(result.error);
        })
        .finally(() => {
          if (my === seq) setLoading(false);
        });
    };
    window.addEventListener(MIRU_CATALOG_STOCK_CHANGED, onStock);
    return () => {
      seq += 1;
      window.removeEventListener(MIRU_CATALOG_STOCK_CHANGED, onStock);
    };
  }, []);

  const categorias = useMemo(
    () => ['all', ...Array.from(new Set(productos.map((p) => p.categoria).filter(Boolean)))],
    [productos]
  );

  const marcas = useMemo(
    () =>
      Array.from(new Set(productos.map((p) => p.marca).filter((m): m is string => !!m?.trim()))).sort(
        (a, b) => a.localeCompare(b)
      ),
    [productos]
  );

  const categoriasUnicas = useMemo(
    () => categorias.filter((c) => c !== 'all'),
    [categorias]
  );

  const presentacionesOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (const p of productos) {
      for (const pr of p.presentaciones ?? []) {
        if (pr.id != null) {
          opts.push({ value: String(pr.id), label: `${p.nombre} - ${pr.tamaño}` });
        }
      }
    }
    return opts;
  }, [productos]);

  const stockPresentacionSeleccionada = useMemo(() => {
    if (!movPresentacionId) return null;
    for (const p of productos) {
      for (const pr of p.presentaciones ?? []) {
        if (String(pr.id) === movPresentacionId) return pr.stock;
      }
    }
    return null;
  }, [productos, movPresentacionId]);

  const productosAfectadosDescuento = useMemo(() => {
    return productos.filter((p) => {
      const cumpleMarca =
        !marcaDescuento.trim() ||
        (p.marca && p.marca.trim().toLowerCase() === marcaDescuento.trim().toLowerCase());
      const cumpleCategoria =
        !categoriaDescuento.trim() ||
        (p.categoria && p.categoria.trim().toLowerCase() === categoriaDescuento.trim().toLowerCase());
      return cumpleMarca && cumpleCategoria;
    });
  }, [productos, marcaDescuento, categoriaDescuento]);

  const handleAplicarDescuento = async (e: React.FormEvent) => {
    e.preventDefault();
    setResultadoDescuento(null);
    const pct = parseInt(porcentajeDescuento, 10);
    if (!marcaDescuento.trim() && !categoriaDescuento.trim()) {
      setResultadoDescuento({
        ok: false,
        mensaje: 'Selecciona al menos una marca o una categoría para aplicar el descuento.',
      });
      return;
    }
    if (Number.isNaN(pct) || pct <= 0 || pct > 100) {
      setResultadoDescuento({ ok: false, mensaje: 'El porcentaje debe ser entre 1 y 100.' });
      return;
    }
    setAplicandoDescuento(true);
    try {
      const res = await aplicarDescuentoGlobal({
        marca: marcaDescuento.trim() || undefined,
        categoria: categoriaDescuento.trim() || undefined,
        porcentaje: pct,
      });
      if (res.success) {
        setResultadoDescuento({
          ok: true,
          mensaje: res.mensaje ?? `Descuento aplicado a ${res.actualizados} producto(s).`,
        });
        setPorcentajeDescuento('');
        const result = await getProductosSinRedirigir({ incluirNoDisponibles: true });
        setProductos(result.data);
      } else {
        setResultadoDescuento({ ok: false, mensaje: res.error });
      }
    } catch (err) {
      setResultadoDescuento({
        ok: false,
        mensaje: err instanceof Error ? err.message : 'Error al aplicar el descuento.',
      });
    } finally {
      setAplicandoDescuento(false);
    }
  };

  const resetMovForm = () => {
    setMovPresentacionId('');
    setMovCantidad('');
    setMovMotivo('');
    setMovStockReal('');
    setMovError(null);
  };

  const recargarProductos = async () => {
    const result = await getProductosSinRedirigir({ incluirNoDisponibles: true });
    setProductos(result.data);
  };

  const handleEntrada = async () => {
    if (!movPresentacionId || !movCantidad) { setMovError('Presentación y cantidad son requeridas'); return; }
    setMovSaving(true);
    setMovError(null);
    try {
      await registrarEntrada({ presentacionId: Number(movPresentacionId), cantidad: Number(movCantidad), motivo: movMotivo || undefined });
      setIsModalEntradaOpen(false);
      resetMovForm();
      await recargarProductos();
    } catch (e) {
      setMovError(e instanceof Error ? e.message : 'Error al registrar entrada');
    } finally {
      setMovSaving(false);
    }
  };

  const handleSalida = async () => {
    if (!movPresentacionId || !movCantidad) { setMovError('Presentación y cantidad son requeridas'); return; }
    setMovSaving(true);
    setMovError(null);
    try {
      await registrarSalida({ presentacionId: Number(movPresentacionId), cantidad: Number(movCantidad), motivo: movMotivo || undefined });
      setIsModalSalidaOpen(false);
      resetMovForm();
      await recargarProductos();
    } catch (e) {
      setMovError(e instanceof Error ? e.message : 'Error al registrar salida');
    } finally {
      setMovSaving(false);
    }
  };

  const handleAjuste = async () => {
    if (!movPresentacionId || !movStockReal || !movMotivo.trim()) { setMovError('Todos los campos son requeridos'); return; }
    setMovSaving(true);
    setMovError(null);
    try {
      await registrarAjuste({ presentacionId: Number(movPresentacionId), stockReal: Number(movStockReal), motivo: movMotivo });
      setIsModalAjusteOpen(false);
      resetMovForm();
      await recargarProductos();
    } catch (e) {
      setMovError(e instanceof Error ? e.message : 'Error al registrar ajuste');
    } finally {
      setMovSaving(false);
    }
  };

  const productosFiltrados = productos.filter((p) => {
    const texto = `${p.nombre} ${p.categoria ?? ''} ${p.marca ?? ''}`.toLowerCase();
    const q = busqueda.toLowerCase();
    const coincideBusqueda = !q || texto.includes(q);
    const coincideCategoria = categoriaFiltro === 'all' || p.categoria === categoriaFiltro;
    const coincideDisponibilidad = mostrarSoloInactivos ? !p.disponible : p.disponible;
    return coincideBusqueda && coincideCategoria && coincideDisponibilidad;
  });

  // Reinicia a la página 1 cuando cambian los filtros o la búsqueda, para no quedar en una página vacía.
  useEffect(() => {
    setPagina(1);
  }, [busqueda, categoriaFiltro, mostrarSoloInactivos]);

  const totalPaginas = Math.max(1, Math.ceil(productosFiltrados.length / PRODUCTOS_POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const productosPagina = productosFiltrados.slice(
    (paginaActual - 1) * PRODUCTOS_POR_PAGINA,
    paginaActual * PRODUCTOS_POR_PAGINA
  );

  const totalProductos = productos.length;
  const stockBajo = productos.filter((p) => { const t = p.stockCantidad ?? 0; return t > 0 && t <= 5; }).length;
  const sinStock = productos.filter((p) => (p.stockCantidad ?? 0) === 0).length;
  const valorTotal = productos.reduce(
    (acc, p) =>
      acc +
      (p.presentaciones ?? []).reduce(
        (s, pr) => s + precioANumero(pr.precio) * pr.stock,
        0
      ),
    0
  );

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              Inventario
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              {totalProductos} producto{totalProductos === 1 ? '' : 's'} en catálogo
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => router.push('/admin/control-caducidad')}>
              <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} aria-hidden /> Control de caducidad</span>
            </Button>
            <Button variant="outline" onClick={() => router.push('/admin/inventario/prediccion')}>
              Predicción de inventario
            </Button>
            <Button variant="outline" onClick={() => setIsModalDescuentoOpen(true)}>
              <span className="inline-flex items-center gap-1.5"><Percent size={15} aria-hidden /> Descuento global</span>
            </Button>
            <Button onClick={() => router.push('/admin/productos/nuevo')}>+ Agregar producto</Button>
          </div>
        </div>

        {/* KPIs con jerarquía */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Package size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Total productos</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{totalProductos}</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <BadgeDollarSign size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Valor total</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>${valorTotal.toLocaleString('es-MX')}</p>
              </div>
            </div>
          </Card>

          <Card
            variant="elevated"
            padding="lg"
            style={{ boxShadow: '0 0 0 1.5px var(--warning), 0 4px 12px rgba(0,0,0,0.15)' }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(217, 142, 4, 0.2)' }}>
                <AlertTriangle size={22} style={{ color: 'var(--warning)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Stock bajo (≤5)</p>
                <p className="text-3xl font-bold mt-0.5" style={{ color: 'var(--warning-texto)' }}>{stockBajo}</p>
              </div>
            </div>
          </Card>

          <Card
            variant="elevated"
            padding="lg"
            style={{ boxShadow: '0 0 0 1.5px var(--danger), 0 4px 12px rgba(0,0,0,0.15)' }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(113, 0, 20, 0.15)' }}>
                <CircleX size={24} style={{ color: 'var(--danger)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Sin stock</p>
                <p className="text-4xl font-bold mt-0.5" style={{ color: 'var(--danger-texto)' }}>{sinStock}</p>
              </div>
            </div>
          </Card>
        </div>

        {error && (
          <Card className="border-l-4" padding="md" style={{ borderLeftColor: 'var(--danger)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--danger-texto)' }}>{error}</p>
          </Card>
        )}

        {/* Listado */}
        <Card variant="elevated" padding="lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>Listado de productos</h2>
              <span className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                {productosFiltrados.length} producto{productosFiltrados.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="success"
                onClick={() => { resetMovForm(); setIsModalEntradaOpen(true); }}
              >
                <span className="inline-flex items-center gap-1.5"><ArrowDownToLine size={14} aria-hidden /> Entrada</span>
              </Button>
              <Button
                size="sm"
                variant="warning"
                onClick={() => { resetMovForm(); setIsModalSalidaOpen(true); }}
              >
                <span className="inline-flex items-center gap-1.5"><ArrowUpFromLine size={14} aria-hidden /> Salida</span>
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => { resetMovForm(); setIsModalAjusteOpen(true); }}
              >
                <span className="inline-flex items-center gap-1.5"><Settings2 size={14} aria-hidden /> Ajuste</span>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Input
              placeholder="Buscar producto..."
              className="w-full sm:w-56"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <Select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              options={categorias.map((cat) => ({
                value: cat,
                label: cat === 'all' ? 'Todas las categorías' : cat,
              }))}
            />
            <label className="flex items-center gap-2 cursor-pointer text-sm px-2" style={{ color: 'var(--menu-texto-principal)' }}>
              <input
                type="checkbox"
                checked={mostrarSoloInactivos}
                onChange={(e) => setMostrarSoloInactivos(e.target.checked)}
                className="rounded"
              />
              Mostrar solo inactivos
            </label>
          </div>

          {loading ? (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>Cargando productos…</p>
          ) : productosFiltrados.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>
              No hay productos que coincidan con la búsqueda.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {productosPagina.map((producto) => {
                const cad = proximaCaducidad(producto);
                const stock = typeof producto.stockCantidad === 'number' ? producto.stockCantidad : null;
                return (
                  <CatalogoCard
                    key={producto.id}
                    imagenUrl={producto.imagen}
                    imagenFallback={IMG_SERVICIO_PLACEHOLDER}
                    titulo={producto.nombre}
                    estadoBadge={
                      <Badge variant={getEstadoColor(!!producto.disponible)} size="sm">
                        {producto.disponible ? 'Disponible' : 'No disponible'}
                      </Badge>
                    }
                    acciones={
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/admin/productos/${producto.id}`)}
                      >
                        Editar
                      </Button>
                    }
                  >
                    <Badge variant={getCategoryColor(producto.categoria || '')} size="sm">
                      {producto.categoria || 'Sin categoría'}
                    </Badge>
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: 'var(--encabezados-alterno)' }}>Stock</span>
                      <span className="inline-flex items-center gap-2">
                        <span className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>{stock ?? '—'}</span>
                        {stock === 0 ? (
                          <Badge variant="danger" size="sm">Sin stock</Badge>
                        ) : stock !== null && stock <= 5 ? (
                          <Badge variant="warning" size="sm">Stock bajo</Badge>
                        ) : null}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-auto pt-1">
                      <span style={{ color: 'var(--encabezados-alterno)' }}>Próxima caducidad</span>
                      {cad.fecha ? (
                        <span className="inline-flex items-center gap-2">
                          <span style={{ color: 'var(--menu-texto-principal)' }}>{cad.fecha}</span>
                          {cad.estado && (
                            <Badge
                              variant={
                                cad.estado === 'vencido' ? 'danger' :
                                cad.estado === 'proximo' ? 'warning' : 'success'
                              }
                              size="sm"
                            >
                              {cad.estado === 'vencido'
                                ? `Vencido hace ${Math.abs(cad.diasRestantes ?? 0)}d`
                                : `${cad.diasRestantes}d`}
                            </Badge>
                          )}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--menu-texto-principal)' }}>—</span>
                      )}
                    </div>
                  </CatalogoCard>
                );
              })}
            </div>
          )}

          {!loading && productosFiltrados.length > PRODUCTOS_POR_PAGINA && (
            <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
              <span className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                Página {paginaActual} de {totalPaginas}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={paginaActual <= 1}
                >
                  Anterior
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaActual >= totalPaginas}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Modal: Descuento global */}
      <Modal
        isOpen={isModalDescuentoOpen}
        onClose={() => { if (!aplicandoDescuento) setIsModalDescuentoOpen(false); }}
        title="Descuento global"
        size="md"
      >
        <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
          Aplica un porcentaje de descuento filtrando por marca, categoría o ambos. Ejemplo: marca «AVYNA» + categoría «Cuidado del cabello» aplica solo a esos productos. Deja en «Todas» el filtro que no quieras usar.
        </p>
        {aplicandoDescuento && (
          <div
            className="flex items-center gap-3 mb-4 p-3 rounded-lg"
            style={{ backgroundColor: 'rgba(217, 142, 4, 0.15)', borderLeft: `4px solid ${'var(--warning)'}` }}
          >
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-current shrink-0" style={{ color: 'var(--warning)' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
                Aplicando descuento…
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--encabezados-alterno)' }}>
                Por favor espera. Puede tardar unos segundos según la cantidad de productos. No cierres esta página.
              </p>
            </div>
          </div>
        )}
        <form onSubmit={handleAplicarDescuento} className="flex flex-wrap items-end gap-4">
          <div className="min-w-[180px]">
            <Select
              label="Marca"
              value={marcaDescuento}
              onChange={(e) => setMarcaDescuento(e.target.value)}
              options={[
                { value: '', label: 'Todas las marcas' },
                ...marcas.map((m) => ({ value: m, label: m })),
              ]}
              fullWidth
            />
          </div>
          <div className="min-w-[180px]">
            <Select
              label="Categoría"
              value={categoriaDescuento}
              onChange={(e) => setCategoriaDescuento(e.target.value)}
              options={[
                { value: '', label: 'Todas las categorías' },
                ...categoriasUnicas.map((c) => ({ value: c, label: c })),
              ]}
              fullWidth
            />
          </div>
          <div className="w-40">
            <Input
              label="% descuento (1–100)"
              type="number"
              min={1}
              max={100}
              value={porcentajeDescuento}
              onChange={(e) => setPorcentajeDescuento(e.target.value)}
              placeholder="Ej. 15"
              fullWidth
            />
          </div>
          <Button type="submit" disabled={aplicandoDescuento || loading}>
            {aplicandoDescuento ? 'Espera…' : 'Aplicar'}
          </Button>
        </form>
        {(marcaDescuento.trim() || categoriaDescuento.trim()) && (
          <p className="text-sm mt-3" style={{ color: 'var(--encabezados-alterno)' }}>
            Se actualizarán <strong>{productosAfectadosDescuento.length}</strong> producto(s)
            {marcaDescuento.trim() && categoriaDescuento.trim()
              ? ` de la marca «${marcaDescuento}» y categoría «${categoriaDescuento}».`
              : marcaDescuento.trim()
              ? ` de la marca «${marcaDescuento}».`
              : ` de la categoría «${categoriaDescuento}».`}
          </p>
        )}
        {resultadoDescuento && (
          <p
            className="text-sm font-medium mt-3"
            style={{ color: resultadoDescuento.ok ? 'var(--success-texto)' : 'var(--danger-texto)' }}
          >
            {resultadoDescuento.mensaje}
          </p>
        )}
      </Modal>

      {/* Modal: Registrar Entrada */}
      <Modal
        isOpen={isModalEntradaOpen}
        onClose={() => { if (!movSaving) { setIsModalEntradaOpen(false); resetMovForm(); } }}
        title="Registrar Entrada"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setIsModalEntradaOpen(false); resetMovForm(); }} disabled={movSaving}>Cancelar</Button>
            <Button onClick={handleEntrada} disabled={movSaving}>{movSaving ? 'Guardando...' : 'Registrar'}</Button>
          </>
        }
      >
        {movError && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{movError}</p>}
        <div className="space-y-4">
          <Select
            label="Presentación *"
            value={movPresentacionId}
            onChange={(e) => setMovPresentacionId(e.target.value)}
            options={[{ value: '', label: 'Seleccionar...' }, ...presentacionesOptions]}
            fullWidth
          />
          <Input label="Cantidad *" type="number" min={1} value={movCantidad} onChange={(e) => setMovCantidad(e.target.value)} fullWidth />
          <Input label="Motivo" value={movMotivo} onChange={(e) => setMovMotivo(e.target.value)} placeholder="Ej. Compra a proveedor" fullWidth />
        </div>
      </Modal>

      {/* Modal: Registrar Salida */}
      <Modal
        isOpen={isModalSalidaOpen}
        onClose={() => { if (!movSaving) { setIsModalSalidaOpen(false); resetMovForm(); } }}
        title="Registrar Salida"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setIsModalSalidaOpen(false); resetMovForm(); }} disabled={movSaving}>Cancelar</Button>
            <Button onClick={handleSalida} disabled={movSaving}>{movSaving ? 'Guardando...' : 'Registrar'}</Button>
          </>
        }
      >
        {movError && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{movError}</p>}
        <div className="space-y-4">
          <Select
            label="Presentación *"
            value={movPresentacionId}
            onChange={(e) => setMovPresentacionId(e.target.value)}
            options={[{ value: '', label: 'Seleccionar...' }, ...presentacionesOptions]}
            fullWidth
          />
          {stockPresentacionSeleccionada != null && (
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Stock actual: <strong>{stockPresentacionSeleccionada}</strong></p>
          )}
          {movCantidad && stockPresentacionSeleccionada != null && Number(movCantidad) > stockPresentacionSeleccionada && (
            <p className="text-sm" style={{ color: 'var(--warning-texto)' }}>Aviso: la cantidad supera el stock disponible.</p>
          )}
          <Input label="Cantidad *" type="number" min={1} value={movCantidad} onChange={(e) => setMovCantidad(e.target.value)} fullWidth />
          <Input label="Motivo" value={movMotivo} onChange={(e) => setMovMotivo(e.target.value)} placeholder="Ej. Uso en servicio" fullWidth />
        </div>
      </Modal>

      {/* Modal: Ajuste de Stock */}
      <Modal
        isOpen={isModalAjusteOpen}
        onClose={() => { if (!movSaving) { setIsModalAjusteOpen(false); resetMovForm(); } }}
        title="Ajuste de Stock"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setIsModalAjusteOpen(false); resetMovForm(); }} disabled={movSaving}>Cancelar</Button>
            <Button onClick={handleAjuste} disabled={movSaving}>{movSaving ? 'Guardando...' : 'Ajustar'}</Button>
          </>
        }
      >
        {movError && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{movError}</p>}
        <div className="space-y-4">
          <Select
            label="Presentación *"
            value={movPresentacionId}
            onChange={(e) => setMovPresentacionId(e.target.value)}
            options={[{ value: '', label: 'Seleccionar...' }, ...presentacionesOptions]}
            fullWidth
          />
          {stockPresentacionSeleccionada != null && (
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Stock actual: <strong>{stockPresentacionSeleccionada}</strong></p>
          )}
          <Input label="Stock real (conteo físico) *" type="number" min={0} value={movStockReal} onChange={(e) => setMovStockReal(e.target.value)} fullWidth />
          <Input label="Motivo *" value={movMotivo} onChange={(e) => setMovMotivo(e.target.value)} placeholder="Ej. Conteo físico mensual" fullWidth />
        </div>
      </Modal>
    </AdminLayout>
  );
}
