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
import { colors } from '../../../utils/colors';
import { getCategoryColor } from '../../../utils/categoryColors';
import {
  getProductosSinRedirigir,
  aplicarDescuentoPorMarca,
  type Producto,
} from '../../../services/productos';

// Helper simple para sacar número de un precio tipo \"$350\"
function precioANumero(precio: string | undefined): number {
  if (!precio) return 0;
  const s = String(precio).replace(/[^0-9.,]/g, '').replace(',', '.');
  return parseFloat(s) || 0;
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

  const productosDeLaMarca =
    marcaDescuento.trim() === ''
      ? []
      : productos.filter(
          (p) =>
            p.marca && p.marca.trim().toLowerCase() === marcaDescuento.trim().toLowerCase()
        );

  const handleAplicarDescuento = async (e: React.FormEvent) => {
    e.preventDefault();
    setResultadoDescuento(null);
    const pct = parseInt(porcentajeDescuento, 10);
    if (!marcaDescuento.trim()) {
      setResultadoDescuento({ ok: false, mensaje: 'Selecciona una marca.' });
      return;
    }
    if (Number.isNaN(pct) || pct <= 0 || pct > 100) {
      setResultadoDescuento({ ok: false, mensaje: 'El porcentaje debe ser entre 1 y 100.' });
      return;
    }
    setAplicandoDescuento(true);
    try {
      const res = await aplicarDescuentoPorMarca(marcaDescuento.trim(), pct);
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
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: colors.menuTextoPrincipal }}>
              Gestión de Inventario
            </h1>
            <p className="text-sm mt-1" style={{ color: colors.encabezadosAlterno }}>
              Control y supervisión en tiempo real de todos los productos de la tienda online
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => router.push('/admin/productos/nuevo')}>+ Agregar Producto</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="transition-all duration-200 hover:shadow-lg" variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ backgroundColor: colors.fondosSuaves }}>📦</div>
              <div>
                <p className="text-sm font-medium" style={{ color: colors.encabezadosAlterno }}>Total Productos</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: colors.menuTextoPrincipal }}>{totalProductos}</p>
              </div>
            </div>
          </Card>
          <Card className="transition-all duration-200 hover:shadow-lg" variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ backgroundColor: 'rgba(217, 142, 4, 0.2)' }}>⚠️</div>
              <div>
                <p className="text-sm font-medium" style={{ color: colors.encabezadosAlterno }}>Stock Bajo (≤5)</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: colors.warning }}>{stockBajo}</p>
              </div>
            </div>
          </Card>
          <Card className="transition-all duration-200 hover:shadow-lg" variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ backgroundColor: 'rgba(89, 12, 12, 0.15)' }}>🚫</div>
              <div>
                <p className="text-sm font-medium" style={{ color: colors.encabezadosAlterno }}>Sin stock</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: colors.danger }}>{sinStock}</p>
              </div>
            </div>
          </Card>
          <Card className="transition-all duration-200 hover:shadow-lg" variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ backgroundColor: 'rgba(110, 125, 87, 0.25)' }}>💰</div>
              <div>
                <p className="text-sm font-medium" style={{ color: colors.encabezadosAlterno }}>Valor Total</p>
                <p className="text-xl font-bold mt-0.5" style={{ color: colors.menuTextoPrincipal }}>${valorTotal.toLocaleString('es-MX')}</p>
              </div>
            </div>
          </Card>
        </div>

        {error && (
          <Card className="mb-6 border-l-4" padding="md" style={{ borderLeftColor: colors.danger }}>
            <p className="text-sm font-medium" style={{ color: colors.danger }}>{error}</p>
          </Card>
        )}

        <Card variant="elevated" padding="lg" className="mb-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: colors.menuTextoPrincipal }}>
            Descuento por marca
          </h2>
          <p className="text-sm mb-4" style={{ color: colors.encabezadosAlterno }}>
            Aplica un porcentaje de descuento a todos los productos de una misma marca.
          </p>
          {aplicandoDescuento && (
            <div
              className="flex items-center gap-3 mb-4 p-3 rounded-lg"
              style={{ backgroundColor: 'rgba(217, 142, 4, 0.15)', borderLeft: `4px solid ${colors.warning}` }}
            >
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-current shrink-0" style={{ color: colors.warning }} />
              <div>
                <p className="text-sm font-medium" style={{ color: colors.menuTextoPrincipal }}>
                  Aplicando descuento a todos los productos de la marca…
                </p>
                <p className="text-xs mt-0.5" style={{ color: colors.encabezadosAlterno }}>
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
                  { value: '', label: 'Selecciona una marca' },
                  ...marcas.map((m) => ({ value: m, label: m })),
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
          {marcaDescuento.trim() && (
            <p className="text-sm mt-3" style={{ color: colors.encabezadosAlterno }}>
              Se actualizarán <strong>{productosDeLaMarca.length}</strong> producto(s) de la marca «{marcaDescuento}».
            </p>
          )}
          {resultadoDescuento && (
            <p
              className="text-sm font-medium mt-3"
              style={{ color: resultadoDescuento.ok ? colors.success : colors.danger }}
            >
              {resultadoDescuento.mensaje}
            </p>
          )}
        </Card>

        <Card variant="elevated" padding="lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
            <h2 className="text-lg font-semibold" style={{ color: colors.menuTextoPrincipal }}>Listado de productos</h2>
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
          <Table headers={['Producto', 'Categoría', 'Stock', 'Estado', 'Acciones']}>
          {!loading && productosFiltrados.map((producto) => (
            <TableRow key={producto.id}>
              <TableCell className="font-semibold">{producto.nombre}</TableCell>
              <TableCell>
                <Badge variant={getCategoryColor(producto.categoria || '')} size="sm">
                  {producto.categoria || 'Sin categoría'}
                </Badge>
              </TableCell>
              <TableCell>{typeof producto.stockCantidad === 'number' ? producto.stockCantidad : '—'}</TableCell>
              <TableCell>
                <Badge variant={producto.stock ? 'success' : 'danger'}>
                  {producto.stock ? 'Disponible' : 'Agotado'}
                </Badge>
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/admin/productos/${producto.id}`)}
                >
                  Ver y editar
                </Button>
              </TableCell>
            </TableRow>
          ))}
          </Table>
        </Card>
      </div>
    </AdminLayout>
  );
}

