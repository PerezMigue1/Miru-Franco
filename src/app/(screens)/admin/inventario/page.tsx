'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { AlertTriangle, BadgeDollarSign, CircleX, Package } from 'lucide-react';
import { getCategoryColor, getEstadoColor } from '../../../utils/categoryColors';
import {
  getProductosSinRedirigir,
  aplicarDescuentoGlobal,
  type Producto,
} from '../../../services/productos';
import { MIRU_CATALOG_STOCK_CHANGED } from '../../../utils/catalogStockSync';

// Helper simple para sacar número de un precio tipo \"$350\"
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
  const [filtroDisponibilidad, setFiltroDisponibilidad] = useState<'all' | 'disponibles' | 'noDisponibles'>('all');
  const [marcaDescuento, setMarcaDescuento] = useState('');
  const [categoriaDescuento, setCategoriaDescuento] = useState('');
  const [porcentajeDescuento, setPorcentajeDescuento] = useState('');
  const [aplicandoDescuento, setAplicandoDescuento] = useState(false);
  const [resultadoDescuento, setResultadoDescuento] = useState<{ ok: boolean; mensaje: string } | null>(null);

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

  const productosFiltrados = productos.filter((p) => {
    const texto = `${p.nombre} ${p.categoria ?? ''} ${p.marca ?? ''}`.toLowerCase();
    const q = busqueda.toLowerCase();
    const coincideBusqueda = !q || texto.includes(q);
    const coincideCategoria = categoriaFiltro === 'all' || p.categoria === categoriaFiltro;
    const coincideDisponibilidad =
      filtroDisponibilidad === 'all' ||
      (filtroDisponibilidad === 'disponibles' && p.stock) ||
      (filtroDisponibilidad === 'noDisponibles' && !p.stock);
    return coincideBusqueda && coincideCategoria && coincideDisponibilidad;
  });

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
      <div className="w-full max-w-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
              Gestión de Inventario
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              Control y supervisión en tiempo real de todos los productos de la tienda online
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push('/admin/inventario/prediccion')}>
              Predicción de inventario
            </Button>
            <Button onClick={() => router.push('/admin/productos/nuevo')}>+ Agregar Producto</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="transition-all duration-200 hover:shadow-lg" variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}><Package size={22} /></div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Total Productos</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{totalProductos}</p>
              </div>
            </div>
          </Card>
          <Card className="transition-all duration-200 hover:shadow-lg" variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(217, 142, 4, 0.2)' }}><AlertTriangle size={22} /></div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Stock Bajo (≤5)</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--warning)' }}>{stockBajo}</p>
              </div>
            </div>
          </Card>
          <Card className="transition-all duration-200 hover:shadow-lg" variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(89, 12, 12, 0.15)' }}><CircleX size={22} /></div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Sin stock</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--danger)' }}>{sinStock}</p>
              </div>
            </div>
          </Card>
          <Card className="transition-all duration-200 hover:shadow-lg" variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(110, 125, 87, 0.25)' }}><BadgeDollarSign size={22} /></div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Valor Total</p>
                <p className="text-xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>${valorTotal.toLocaleString('es-MX')}</p>
              </div>
            </div>
          </Card>
        </div>

        {error && (
          <Card className="mb-6 border-l-4" padding="md" style={{ borderLeftColor: 'var(--danger)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>{error}</p>
          </Card>
        )}

        <Card variant="elevated" padding="lg" className="mb-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Descuento global
          </h2>
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
              style={{ color: resultadoDescuento.ok ? 'var(--success)' : 'var(--danger)' }}
            >
              {resultadoDescuento.mensaje}
            </p>
          )}
        </Card>

        <Card variant="elevated" padding="lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>Listado de productos</h2>
            <div className="flex flex-wrap gap-2">
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
              <Select
                value={filtroDisponibilidad}
                onChange={(e) => setFiltroDisponibilidad(e.target.value as 'all' | 'disponibles' | 'noDisponibles')}
                options={[
                  { value: 'all', label: 'Todos (disponibles y no disponibles)' },
                  { value: 'disponibles', label: 'Solo disponibles' },
                  { value: 'noDisponibles', label: 'Solo no disponibles' },
                ]}
              />
            </div>
          </div>
          <Table headers={['Producto', 'Categoría', 'Stock', 'Próxima caducidad', 'Estado', 'Acciones']}>
          {!loading && productosFiltrados.map((producto) => {
            const cad = proximaCaducidad(producto);
            return (
            <TableRow key={producto.id}>
              <TableCell className="font-semibold">{producto.nombre}</TableCell>
              <TableCell>
                <Badge variant={getCategoryColor(producto.categoria || '')} size="sm">
                  {producto.categoria || 'Sin categoría'}
                </Badge>
              </TableCell>
              <TableCell>{typeof producto.stockCantidad === 'number' ? producto.stockCantidad : '—'}</TableCell>
              <TableCell>
                {cad.fecha ? (
                  <span className="inline-flex items-center gap-2">
                    <span>{cad.fecha}</span>
                    {cad.estado && (
                      <Badge
                        variant={
                          cad.estado === 'vencido' ? 'danger' :
                          cad.estado === 'proximo' ? 'warning' : 'success'
                        }
                        size="sm"
                      >
                        {cad.estado === 'vencido'
                          ? `Vencido hace ${Math.abs(cad.diasRestantes ?? 0)} d`
                          : cad.estado === 'proximo'
                          ? `${cad.diasRestantes}d`
                          : `${cad.diasRestantes}d`}
                      </Badge>
                    )}
                  </span>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell>
                <Badge variant={getEstadoColor(!!producto.stock)}>
                  {producto.stock ? 'Disponible' : 'Agotado'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      router.push(
                        `/admin/inventario/prediccion?producto=${encodeURIComponent(String(producto.id))}`
                      )
                    }
                  >
                    Predicción y análisis
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/admin/productos/${producto.id}`)}
                  >
                    Ver y editar
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
          })}
          </Table>
        </Card>
      </div>
    </AdminLayout>
  );
}

