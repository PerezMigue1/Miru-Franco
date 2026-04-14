'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ModuleLayout from '../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../components/ui/PageHeader';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Input from '../../../../components/ui/Input';
import Badge from '../../../../components/ui/Badge';
import { getProductos, urlsGaleriaProductoCatalogo, type Producto } from '../../../../services/productos';
import { MIRU_CATALOG_STOCK_CHANGED } from '../../../../utils/catalogStockSync';
import { ProductoImagenCarruselTarjeta } from '../../../../components/tienda/ProductoImagenCarruselTarjeta';

/** Parsea precio tipo "$350" o "350" a número */
function precioANumero(precio: string | undefined): number {
  if (!precio) return 0;
  const s = String(precio).replace(/[^0-9.,]/g, '').replace(',', '.');
  return parseFloat(s) || 0;
}

const OPCIONES_COLOR = ['Negro', 'Blanco', 'Rojo', 'Rosa', 'Nude', 'Coral', 'Vino', 'Marrón', 'Dorado', 'Plateado', 'Multicolor'];
const OPCIONES_DESCUENTO = [{ label: 'Con descuento', min: 1 }, { label: '10% o más', min: 10 }, { label: '20% o más', min: 20 }, { label: '30% o más', min: 30 }, { label: '50% o más', min: 50 }];
const OPCIONES_ACABADO = ['Mate', 'Satinado', 'Brillante', 'Metalizado', 'Cremoso', 'Líquido'];
const OPCIONES_FORMATO_LABIAL = ['Barra', 'Líquido', 'Lápiz', 'Gloss', 'Tint', 'Crayón'];
const OPCIONES_UNIDADES_PACK = ['1', '2', '3', '4', '6', '12', '24'];
// Cuidado de la piel
const OPCIONES_TIPO_PIEL = ['Normal', 'Seca', 'Grasa', 'Mixta', 'Sensible', 'Madura', 'Con acné'];
const OPCIONES_TEXTURA = ['Gel', 'Crema', 'Loción', 'Sérum', 'Aceite', 'Mascarilla', 'Espuma'];
const OPCIONES_SPF = ['Sin SPF', 'SPF 15', 'SPF 30', 'SPF 50', 'SPF 50+'];
const PRODUCTOS_POR_PAGINA = 15;

/** Qué filtros mostrar según la categoría seleccionada */
type FiltroKey = 'precio' | 'descuento' | 'marca' | 'color' | 'acabado' | 'formatoLabial' | 'unidadesPack' | 'tipoPiel' | 'textura' | 'spf' | 'otrasCaracteristicas';
function filtrosParaCategoria(categoria: string): FiltroKey[] {
  const c = categoria.toLowerCase();
  const comunes: FiltroKey[] = ['precio', 'descuento', 'marca', 'otrasCaracteristicas'];
  if (categoria === 'Todas') return comunes;
  if (c.includes('maquillaje')) return [...comunes, 'color', 'acabado', 'formatoLabial', 'unidadesPack'];
  if (c.includes('piel') || c.includes('skincare') || c.includes('facial')) return [...comunes, 'tipoPiel', 'textura', 'spf'];
  if (c.includes('cabello') || c.includes('capilar')) return comunes;
  return comunes;
}

export default function CatalogoProductosPage() {
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorUrl, setErrorUrl] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todas');
  // Filtros sidebar
  const [colores, setColores] = useState<string[]>([]);
  const [descuentos, setDescuentos] = useState<number[]>([]);
  const [precioMin, setPrecioMin] = useState<string>('');
  const [precioMax, setPrecioMax] = useState<string>('');
  const [marcas, setMarcas] = useState<string[]>([]);
  const [acabados, setAcabados] = useState<string[]>([]);
  const [formatosLabial, setFormatosLabial] = useState<string[]>([]);
  const [unidadesPack, setUnidadesPack] = useState<string[]>([]);
  const [tipoPiel, setTipoPiel] = useState<string[]>([]);
  const [textura, setTextura] = useState<string[]>([]);
  const [spf, setSpf] = useState<string[]>([]);
  const [otrasCaracteristicas, setOtrasCaracteristicas] = useState<string[]>([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const [firmaPaginacion, setFirmaPaginacion] = useState('');

  const abrirDetalleProducto = (id: string | number | undefined) => {
    const idStr = String(id ?? '').trim();
    if (!idStr) return;
    router.push(`/cliente/tienda-online/productos/${encodeURIComponent(idStr)}`);
  };

  const filtrosActivos = useMemo(() => filtrosParaCategoria(categoriaSeleccionada), [categoriaSeleccionada]);
  const mostrarFiltro = (key: FiltroKey) => filtrosActivos.includes(key);

  useEffect(() => {
    let cancelled = false;
    getProductos()
      .then((data) => {
        if (!cancelled) {
          setProductos(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al cargar productos');
          const url = (err as Error & { url?: string }).url;
          setErrorUrl(url ?? null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let seq = 0;
    const onStock = () => {
      const id = ++seq;
      setLoading(true);
      setError(null);
      getProductos()
        .then((data) => {
          if (id !== seq) return;
          setProductos(data);
        })
        .catch((err) => {
          if (id !== seq) return;
          setError(err instanceof Error ? err.message : 'Error al cargar productos');
          const url = (err as Error & { url?: string }).url;
          setErrorUrl(url ?? null);
        })
        .finally(() => {
          if (id === seq) setLoading(false);
        });
    };
    window.addEventListener(MIRU_CATALOG_STOCK_CHANGED, onStock);
    return () => {
      seq += 1;
      window.removeEventListener(MIRU_CATALOG_STOCK_CHANGED, onStock);
    };
  }, []);

  // Categorías dinámicas desde el backend (sin valores estáticos hardcodeados)
  const categoriasDesdeBackend = useMemo(
    () => Array.from(new Set(productos.map((p) => p.categoria).filter(Boolean))),
    [productos]
  );
  const categorias = ['Todas', ...categoriasDesdeBackend];

  const marcasUnicas = useMemo(() => Array.from(new Set(productos.map((p) => p.marca).filter(Boolean))) as string[], [productos]);
  const caracteristicasUnicas = useMemo(() => {
    const set = new Set<string>();
    productos.forEach((p) => (p.caracteristicas ?? []).forEach((c) => set.add(c)));
    return Array.from(set);
  }, [productos]);

  const toggleFiltro = <T,>(arr: T[], setArr: (a: T[]) => void, valor: T) => {
    if (arr.includes(valor)) setArr(arr.filter((x) => x !== valor));
    else setArr([...arr, valor]);
  };

  const productosFiltrados = productos.filter((p) => {
    const cumpleCategoria = categoriaSeleccionada === 'Todas' || p.categoria === categoriaSeleccionada;
    const cumpleBusqueda = !busqueda.trim() ||
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.categoria && p.categoria.toLowerCase().includes(busqueda.toLowerCase())) ||
      (p.marca && p.marca.toLowerCase().includes(busqueda.toLowerCase()));
    const precioNum = precioANumero(p.precio);
    const min = precioMin.trim() !== '' ? parseFloat(precioMin) : undefined;
    const max = precioMax.trim() !== '' ? parseFloat(precioMax) : undefined;
    const cumplePrecio = (min == null || precioNum >= min) && (max == null || precioNum <= max);
    const cumpleDescuento = descuentos.length === 0 || descuentos.some((d) => (p.descuento ?? 0) >= d);
    const cumpleMarca = marcas.length === 0 || (p.marca && marcas.includes(p.marca));
    const cumpleCaracteristicas = otrasCaracteristicas.length === 0 ||
      otrasCaracteristicas.some((c) => p.caracteristicas?.includes(c));
    const textoProducto = [p.nombre, p.descripcion, ...(p.caracteristicas ?? [])].join(' ').toLowerCase();
    const cumpleColor = !mostrarFiltro('color') || colores.length === 0 || colores.some((c) => textoProducto.includes(c.toLowerCase()));
    const cumpleAcabado = !mostrarFiltro('acabado') || acabados.length === 0 || acabados.some((a) => textoProducto.includes(a.toLowerCase()));
    const cumpleFormatoLabial = !mostrarFiltro('formatoLabial') || formatosLabial.length === 0 || formatosLabial.some((f) => textoProducto.includes(f.toLowerCase()));
    const cumpleUnidadesPack = !mostrarFiltro('unidadesPack') || unidadesPack.length === 0 || unidadesPack.some((u) => textoProducto.includes(u));
    const cumpleTipoPiel = !mostrarFiltro('tipoPiel') || tipoPiel.length === 0 || tipoPiel.some((t) => textoProducto.includes(t.toLowerCase()));
    const cumpleTextura = !mostrarFiltro('textura') || textura.length === 0 || textura.some((t) => textoProducto.includes(t.toLowerCase()));
    const cumpleSpf = !mostrarFiltro('spf') || spf.length === 0 || spf.some((s) => textoProducto.includes(s.toLowerCase()));
    return cumpleCategoria && cumpleBusqueda && cumplePrecio && cumpleDescuento && cumpleMarca && cumpleCaracteristicas &&
      cumpleColor && cumpleAcabado && cumpleFormatoLabial && cumpleUnidadesPack && cumpleTipoPiel && cumpleTextura && cumpleSpf;
  });

  const productosOrdenados = useMemo(
    () => [...productosFiltrados].sort((a, b) => (a.stock === b.stock ? 0 : a.stock ? -1 : 1)),
    [productosFiltrados]
  );

  const firmaListaFiltrada = productosFiltrados.map((p) => p.id).join(',');
  const totalPaginas = Math.max(1, Math.ceil(productosOrdenados.length / PRODUCTOS_POR_PAGINA));

  let resetPaginaPorFiltro = false;
  if (firmaListaFiltrada !== firmaPaginacion) {
    setFirmaPaginacion(firmaListaFiltrada);
    setPaginaActual(1);
    resetPaginaPorFiltro = true;
  }
  const paginaEfectiva = resetPaginaPorFiltro
    ? 1
    : Math.min(Math.max(1, paginaActual), totalPaginas);
  if (!resetPaginaPorFiltro && paginaEfectiva !== paginaActual) {
    setPaginaActual(paginaEfectiva);
  }

  const productosPagina = useMemo(() => {
    const inicio = (paginaEfectiva - 1) * PRODUCTOS_POR_PAGINA;
    return productosOrdenados.slice(inicio, inicio + PRODUCTOS_POR_PAGINA);
  }, [productosOrdenados, paginaEfectiva]);

  const irAPagina = (nueva: number) => {
    const siguiente = Math.min(Math.max(1, nueva), totalPaginas);
    if (siguiente === paginaEfectiva) return;
    setPaginaActual(siguiente);
    queueMicrotask(() => {
      document.getElementById('catalogo-productos-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const rangoDesde =
    productosOrdenados.length === 0 ? 0 : (paginaEfectiva - 1) * PRODUCTOS_POR_PAGINA + 1;
  const rangoHasta = Math.min(paginaEfectiva * PRODUCTOS_POR_PAGINA, productosOrdenados.length);

  return (
    <ModuleLayout>
      <PageHeader
        title="Tienda en Línea"
        subtitle="Explora nuestro catálogo de productos profesionales"
      />

      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <Input
          placeholder="Buscar producto..."
          className="flex-1"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {categorias.map((cat) => {
            const isActive = categoriaSeleccionada === cat;
            return (
              <Button
                key={cat}
                size="sm"
                variant={isActive ? 'chip' : 'outline'}
                onClick={() => setCategoriaSeleccionada(cat)}
              >
                {cat}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-72 flex-shrink-0">
          <Card className="p-4 space-y-6" style={{ backgroundColor: 'var(--tarjetas-paneles)' }}>
            <h3 className="text-subtitle font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
              Filtros {categoriaSeleccionada !== 'Todas' && <span className="text-sm font-normal" style={{ color: 'var(--encabezados-alterno)' }}>({categoriaSeleccionada})</span>}
            </h3>

            {mostrarFiltro('precio') && (
            <div>
              <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Precio</h4>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  placeholder="Mín"
                  value={precioMin}
                  onChange={(e) => setPrecioMin(e.target.value)}
                  min={0}
                  className="w-24"
                />
                <span style={{ color: 'var(--encabezados-alterno)' }}>–</span>
                <Input
                  type="number"
                  placeholder="Máx"
                  value={precioMax}
                  onChange={(e) => setPrecioMax(e.target.value)}
                  min={0}
                  className="w-24"
                />
              </div>
            </div>
            )}

            {mostrarFiltro('descuento') && (
            <div>
              <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Descuentos</h4>
              <ul className="space-y-1.5">
                {OPCIONES_DESCUENTO.map((opt) => (
                  <li key={opt.min}>
                    <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
                      <input
                        type="checkbox"
                        checked={descuentos.includes(opt.min)}
                        onChange={() => toggleFiltro(descuentos, setDescuentos, opt.min)}
                        className="rounded"
                      />
                      {opt.label}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            )}

            {mostrarFiltro('marca') && (
            <div>
              <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Marca</h4>
              <ul className="space-y-1.5 max-h-32 overflow-y-auto">
                {marcasUnicas.length ? marcasUnicas.map((m) => (
                  <li key={m}>
                    <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
                      <input
                        type="checkbox"
                        checked={marcas.includes(m)}
                        onChange={() => toggleFiltro(marcas, setMarcas, m)}
                        className="rounded"
                      />
                      {m}
                    </label>
                  </li>
                )) : (
                  <li className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Sin marcas en catálogo</li>
                )}
              </ul>
            </div>
            )}

            {mostrarFiltro('color') && (
            <div>
              <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Color</h4>
              <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                {OPCIONES_COLOR.map((c) => (
                  <li key={c}>
                    <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
                      <input
                        type="checkbox"
                        checked={colores.includes(c)}
                        onChange={() => toggleFiltro(colores, setColores, c)}
                        className="rounded"
                      />
                      {c}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            )}

            {mostrarFiltro('acabado') && (
            <div>
              <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Acabado</h4>
              <ul className="space-y-1.5 max-h-32 overflow-y-auto">
                {OPCIONES_ACABADO.map((a) => (
                  <li key={a}>
                    <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
                      <input
                        type="checkbox"
                        checked={acabados.includes(a)}
                        onChange={() => toggleFiltro(acabados, setAcabados, a)}
                        className="rounded"
                      />
                      {a}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            )}

            {mostrarFiltro('formatoLabial') && (
            <div>
              <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Formato de labial</h4>
              <ul className="space-y-1.5">
                {OPCIONES_FORMATO_LABIAL.map((f) => (
                  <li key={f}>
                    <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
                      <input
                        type="checkbox"
                        checked={formatosLabial.includes(f)}
                        onChange={() => toggleFiltro(formatosLabial, setFormatosLabial, f)}
                        className="rounded"
                      />
                      {f}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            )}

            {mostrarFiltro('unidadesPack') && (
            <div>
              <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Unidades por pack</h4>
              <ul className="space-y-1.5 flex flex-wrap gap-x-3 gap-y-1">
                {OPCIONES_UNIDADES_PACK.map((u) => (
                  <li key={u}>
                    <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
                      <input
                        type="checkbox"
                        checked={unidadesPack.includes(u)}
                        onChange={() => toggleFiltro(unidadesPack, setUnidadesPack, u)}
                        className="rounded"
                      />
                      {u}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            )}

            {mostrarFiltro('tipoPiel') && (
            <div>
              <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Tipo de piel</h4>
              <ul className="space-y-1.5 max-h-32 overflow-y-auto">
                {OPCIONES_TIPO_PIEL.map((t) => (
                  <li key={t}>
                    <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
                      <input
                        type="checkbox"
                        checked={tipoPiel.includes(t)}
                        onChange={() => toggleFiltro(tipoPiel, setTipoPiel, t)}
                        className="rounded"
                      />
                      {t}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            )}

            {mostrarFiltro('textura') && (
            <div>
              <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Textura</h4>
              <ul className="space-y-1.5">
                {OPCIONES_TEXTURA.map((t) => (
                  <li key={t}>
                    <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
                      <input
                        type="checkbox"
                        checked={textura.includes(t)}
                        onChange={() => toggleFiltro(textura, setTextura, t)}
                        className="rounded"
                      />
                      {t}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            )}

            {mostrarFiltro('spf') && (
            <div>
              <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Protección solar (SPF)</h4>
              <ul className="space-y-1.5">
                {OPCIONES_SPF.map((s) => (
                  <li key={s}>
                    <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
                      <input
                        type="checkbox"
                        checked={spf.includes(s)}
                        onChange={() => toggleFiltro(spf, setSpf, s)}
                        className="rounded"
                      />
                      {s}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            )}

            {mostrarFiltro('otrasCaracteristicas') && (
            <div>
              <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Otras características</h4>
              <ul className="space-y-1.5 max-h-32 overflow-y-auto">
                {caracteristicasUnicas.length ? caracteristicasUnicas.map((c) => (
                  <li key={c}>
                    <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
                      <input
                        type="checkbox"
                        checked={otrasCaracteristicas.includes(c)}
                        onChange={() => toggleFiltro(otrasCaracteristicas, setOtrasCaracteristicas, c)}
                        className="rounded"
                      />
                      {c}
                    </label>
                  </li>
                )) : (
                  <li className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Sin características en catálogo</li>
                )}
              </ul>
            </div>
            )}

            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={() => {
                setColores([]);
                setDescuentos([]);
                setPrecioMin('');
                setPrecioMax('');
                setMarcas([]);
                setAcabados([]);
                setFormatosLabial([]);
                setUnidadesPack([]);
                setTipoPiel([]);
                setTextura([]);
                setSpf([]);
                setOtrasCaracteristicas([]);
              }}
            >
              Limpiar filtros
            </Button>
          </Card>
        </aside>

        {/* Contenido principal: grid de productos */}
        <div className="flex-1 min-w-0">
      {loading && (
        <Card className="text-center py-12">
          <p className="text-lead" style={{ color: 'var(--encabezados-alterno)' }}>
            Cargando productos...
          </p>
        </Card>
      )}

      {error && (
        <Card className="text-center py-12 max-w-xl mx-auto" style={{ borderColor: 'var(--danger)' }}>
          <p className="text-lead mb-4" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
          {error.includes('conectar') && (
            <div className="text-sm mb-4 text-left" style={{ color: 'var(--encabezados-alterno)' }}>
              <p className="mb-2">El frontend está intentando conectar a:</p>
              <code className="block mb-3 p-2 rounded break-all bg-black/10" title="Abre esta URL en otra pestaña para comprobar si el backend responde">
                {errorUrl ?? '…'}
              </code>
              <p className="mb-1">Comprueba:</p>
              <ul className="list-disc list-inside space-y-1 mb-2">
                <li>Que el backend esté en ejecución en ese puerto (ej. <strong>npm run dev</strong> en el proyecto del API).</li>
                <li>Que en la raíz de este proyecto tengas <strong>.env</strong> o <strong>.env.local</strong> con <code>NEXT_PUBLIC_API_URL=http://localhost:3001</code> (sin /api/productos al final).</li>
                <li>Haber reiniciado el frontend (<strong>npm run dev</strong>) después de crear o cambiar el .env.</li>
              </ul>
              <p>Abre la URL de arriba en otra pestaña: si ves JSON, el backend responde y el fallo puede ser CORS.</p>
            </div>
          )}
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Reintentar
          </Button>
        </Card>
      )}

      {!loading && !error && (
        <div id="catalogo-productos-grid" className="space-y-6 scroll-mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {productosPagina.map((producto) => {
            const sinStock = (producto.stockCantidad ?? 0) === 0;
            const noDisponible = !producto.stock || sinStock;
            return (
              <Card
                key={producto.id}
                className={`cursor-pointer transition-all relative overflow-hidden ${noDisponible ? 'opacity-50' : 'hover:scale-105'}`}
                onClick={() => abrirDetalleProducto(producto.id)}
              >
                {noDisponible && (
                  <>
                    <div
                      className="absolute inset-0 z-10 rounded-lg pointer-events-none"
                      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                    />
                    <div
                      className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none select-none"
                      style={{
                        color: 'rgba(255,255,255,0.95)',
                        fontSize: 'clamp(4rem, 18vw, 9rem)',
                        fontWeight: 800,
                        textShadow: '0 0 30px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.8)',
                      }}
                    >
                      ✕
                    </div>
                  </>
                )}
                <div className="relative mb-4">
                  <div
                    className="relative mb-4 h-64 w-full overflow-hidden rounded-lg"
                    style={{ backgroundColor: 'var(--fondos-suaves)' }}
                  >
                    <div className="relative z-0 h-full min-h-[16rem] w-full">
                      <ProductoImagenCarruselTarjeta
                        urls={urlsGaleriaProductoCatalogo(producto)}
                        alt={producto.nombre}
                      />
                    </div>
                    {/* Por encima del carrusel (capas z-[1] del next/image); sin esto las etiquetas quedan tapadas */}
                    <div className="absolute top-2 right-2 z-30 flex flex-wrap justify-end gap-2">
                      {producto.nuevo && (
                        <Badge variant="success" size="sm">Nuevo</Badge>
                      )}
                      {(producto.descuento ?? 0) > 0 && (
                        <Badge variant="warning" size="sm">-{producto.descuento}%</Badge>
                      )}
                      {noDisponible && (
                        <Badge variant="danger" size="sm">No disponible</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mb-2">
                  <Badge variant="info" size="sm">{producto.categoria || 'Producto'}</Badge>
                </div>
                <h3
                  className="text-subtitle mb-2"
                  style={{ color: 'var(--menu-texto-principal)' }}
                >
                  {producto.nombre}
                </h3>
                <p
                  className="text-sm mb-3"
                  style={{ color: 'var(--encabezados-alterno)' }}
                >
                  {producto.descripcion}
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    {producto.precioOriginal && (
                      <p
                        className="text-sm line-through"
                        style={{ color: 'var(--encabezados-alterno)' }}
                      >
                        {producto.precioOriginal}
                      </p>
                    )}
                    <p
                      className="text-xl font-bold"
                      style={{ color: 'var(--menu-texto-principal)' }}
                    >
                      {producto.precio}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      abrirDetalleProducto(producto.id);
                    }}
                  >
                    Ver Detalles
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {productosOrdenados.length > 0 && (
          <div
            className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-3 pt-2 border-t"
            style={{ borderColor: 'var(--fondos-suaves)' }}
          >
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
              Mostrando {rangoDesde}–{rangoHasta} de {productosOrdenados.length} productos
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={paginaEfectiva <= 1}
                onClick={() => irAPagina(paginaEfectiva - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm px-2" style={{ color: 'var(--menu-texto-principal)' }}>
                Página {paginaActual} de {totalPaginas}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={paginaEfectiva >= totalPaginas}
                onClick={() => irAPagina(paginaEfectiva + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
        </div>
      )}

      {!loading && !error && productosFiltrados.length === 0 && (
        <Card className="text-center py-12">
          <p className="text-lead" style={{ color: 'var(--encabezados-alterno)' }}>
            No se encontraron productos con los filtros seleccionados
          </p>
        </Card>
      )}
        </div>
      </div>
    </ModuleLayout>
  );
}
