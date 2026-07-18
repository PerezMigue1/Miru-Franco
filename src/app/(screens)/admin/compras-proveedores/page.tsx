'use client';

import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Modal from '../../../components/ui/Modal';
import { BadgeDollarSign, ShoppingCart, Trash2 } from 'lucide-react';
import { listarProveedores, ProveedorApi } from '../../../services/proveedores';
import { getProductosSinRedirigir } from '../../../services/productos';
import { listarCompras, crearCompra, CompraApi, CrearCompraItemPayload } from '../../../services/compras';

interface PresentacionOpcion {
  id: number;
  label: string;
}

interface LineaCompra extends CrearCompraItemPayload {
  label: string;
}

function fmtFecha(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('es-MX');
}

function fmtMoneda(v: number): string {
  return `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ComprasProveedoresPage() {
  const [proveedores, setProveedores] = useState<ProveedorApi[]>([]);
  const [compras, setCompras] = useState<CompraApi[]>([]);
  const [presentaciones, setPresentaciones] = useState<PresentacionOpcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formProveedorId, setFormProveedorId] = useState('');
  const [formPresentacionId, setFormPresentacionId] = useState('');
  const [formCantidad, setFormCantidad] = useState('1');
  const [formCosto, setFormCosto] = useState('');
  const [lineas, setLineas] = useState<LineaCompra[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [detalleCompra, setDetalleCompra] = useState<CompraApi | null>(null);

  const cargar = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.allSettled([listarProveedores(), listarCompras(), getProductosSinRedirigir()])
      .then(([provRes, comprasRes, prodRes]) => {
        if (provRes.status === 'fulfilled') setProveedores(provRes.value.data);
        else setError((prev) => prev ?? 'No se pudieron cargar los proveedores');

        if (comprasRes.status === 'fulfilled') setCompras(comprasRes.value.data);
        else setError((prev) => prev ?? 'No se pudieron cargar las compras');

        if (prodRes.status === 'fulfilled') {
          const opts: PresentacionOpcion[] = [];
          prodRes.value.data.forEach((p) => (p.presentaciones ?? []).forEach((pr) => {
            const id = Number(pr.id);
            if (!isNaN(id)) opts.push({ id, label: `${p.nombre} — ${pr.tamaño ?? pr.id}` });
          }));
          setPresentaciones(opts);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const agregarLinea = () => {
    setFormError(null);
    const cantidad = Number(formCantidad);
    const costo = Number(formCosto);
    if (!formPresentacionId) { setFormError('Selecciona una presentación'); return; }
    if (!cantidad || cantidad < 1) { setFormError('Cantidad inválida'); return; }
    if (!formCosto || costo < 0) { setFormError('Costo unitario inválido'); return; }
    const opcion = presentaciones.find((p) => String(p.id) === formPresentacionId);
    setLineas((prev) => [...prev, { presentacionId: Number(formPresentacionId), cantidad, costoUnitario: costo, label: opcion?.label ?? `Presentación ${formPresentacionId}` }]);
    setFormPresentacionId('');
    setFormCantidad('1');
    setFormCosto('');
  };

  const quitarLinea = (idx: number) => {
    setLineas((prev) => prev.filter((_, i) => i !== idx));
  };

  const totalOrden = lineas.reduce((acc, l) => acc + l.cantidad * l.costoUnitario, 0);

  const handleRegistrarCompra = async () => {
    setFormError(null);
    if (!formProveedorId) { setFormError('Selecciona un proveedor'); return; }
    if (lineas.length === 0) { setFormError('Agrega al menos una línea de producto'); return; }
    setSaving(true);
    try {
      await crearCompra({
        proveedorId: Number(formProveedorId),
        items: lineas.map(({ presentacionId, cantidad, costoUnitario }) => ({ presentacionId, cantidad, costoUnitario })),
      });
      setFormProveedorId('');
      setLineas([]);
      cargar();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'No se pudo registrar la compra');
    } finally {
      setSaving(false);
    }
  };

  const montoTotal = compras.reduce((acc, c) => acc + c.total, 0);

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              Compras a Proveedores
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              {compras.length} compra{compras.length === 1 ? '' : 's'} registradas
            </p>
          </div>
        </div>

        {error && (
          <Card variant="elevated" padding="md" className="border-l-4" style={{ borderLeftColor: 'var(--danger)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--danger-texto)' }}>{error}</p>
          </Card>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <ShoppingCart size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Total compras</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : compras.length}</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <BadgeDollarSign size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Monto total</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : fmtMoneda(montoTotal)}</p>
              </div>
            </div>
          </Card>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Proveedores
          </h2>
          {loading ? (
            <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>Cargando…</p>
          ) : proveedores.length === 0 ? (
            <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>No hay proveedores registrados.</p>
          ) : (
          <div className="space-y-3">
            {proveedores.map((proveedor) => (
              <div
                key={proveedor.id}
                className="flex items-center justify-between p-4 rounded-lg"
                style={{ backgroundColor: 'var(--fondos-suaves)' }}
              >
                <div>
                  <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                    {proveedor.nombre}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                    {proveedor.productos || 'Sin descripción'} {proveedor.contacto ? `• Tel: ${proveedor.contacto}` : ''}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
                    Última compra: {fmtFecha(proveedor.ultimaCompra ?? undefined)}
                  </p>
                </div>
                <Button size="sm" onClick={() => setFormProveedorId(String(proveedor.id))}>Comprar</Button>
              </div>
            ))}
          </div>
          )}
        </Card>

        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Nueva Orden de Compra
          </h2>
          {formError && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{formError}</p>}
          <div className="space-y-4">
            <Select
              label="Proveedor"
              value={formProveedorId}
              onChange={(e) => setFormProveedorId(e.target.value)}
              options={[{ value: '', label: 'Selecciona un proveedor…' }, ...proveedores.map((p) => ({ value: String(p.id), label: p.nombre }))]}
              fullWidth
            />
            <Select
              label="Presentación"
              value={formPresentacionId}
              onChange={(e) => setFormPresentacionId(e.target.value)}
              options={[{ value: '', label: 'Selecciona un producto…' }, ...presentaciones.map((p) => ({ value: String(p.id), label: p.label }))]}
              fullWidth
            />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Cantidad" type="number" min={1} value={formCantidad} onChange={(e) => setFormCantidad(e.target.value)} fullWidth />
              <Input label="Costo Unitario" type="number" min={0} step="0.01" value={formCosto} onChange={(e) => setFormCosto(e.target.value)} placeholder="0.00" fullWidth />
            </div>
            <Button variant="outline" fullWidth onClick={agregarLinea}>+ Agregar línea</Button>

            {lineas.length > 0 && (
              <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
                {lineas.map((linea, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm p-2 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                    <span style={{ color: 'var(--menu-texto-principal)' }}>{linea.label} — {linea.cantidad} × {fmtMoneda(linea.costoUnitario)}</span>
                    <button type="button" onClick={() => quitarLinea(idx)} aria-label="Quitar línea">
                      <Trash2 size={15} style={{ color: 'var(--danger-texto)' }} />
                    </button>
                  </div>
                ))}
                <p className="text-right text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                  Total: {fmtMoneda(totalOrden)}
                </p>
              </div>
            )}

            <Button fullWidth onClick={handleRegistrarCompra} disabled={saving}>
              {saving ? 'Registrando...' : 'Registrar Compra'}
            </Button>
          </div>
        </Card>
      </div>

      <Card variant="elevated" padding="lg">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
          Historial de Compras
        </h2>
        {loading ? (
          <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>Cargando…</p>
        ) : compras.length === 0 ? (
          <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>No hay compras registradas.</p>
        ) : (
        <Table headers={['Proveedor', 'Fecha', 'Productos', 'Total', 'Acciones']} headerSutil>
          {compras.map((compra) => (
            <TableRow key={compra.id}>
              <TableCell className="font-semibold" rowPadding="lg">{compra.proveedorNombre ?? 'Proveedor'}</TableCell>
              <TableCell rowPadding="lg">{fmtFecha(compra.fecha)}</TableCell>
              <TableCell rowPadding="lg">{compra.items.length} producto{compra.items.length === 1 ? '' : 's'}</TableCell>
              <TableCell className="font-semibold" rowPadding="lg">{fmtMoneda(compra.total)}</TableCell>
              <TableCell rowPadding="lg">
                <Button size="sm" variant="outline" onClick={() => setDetalleCompra(compra)}>Ver Detalles</Button>
              </TableCell>
            </TableRow>
          ))}
        </Table>
        )}
      </Card>
      </div>

      <Modal
        isOpen={detalleCompra !== null}
        onClose={() => setDetalleCompra(null)}
        title={`Compra a ${detalleCompra?.proveedorNombre ?? 'proveedor'}`}
        size="md"
        footer={<Button variant="outline" onClick={() => setDetalleCompra(null)}>Cerrar</Button>}
      >
        {detalleCompra && (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
              Fecha: {fmtFecha(detalleCompra.fecha)} {detalleCompra.usuarioNombre ? `· Registrada por ${detalleCompra.usuarioNombre}` : ''}
            </p>
            {detalleCompra.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <div>
                  <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>{item.productoNombre ?? 'Producto'} — {item.presentacionTamanio ?? ''}</p>
                  <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>{item.cantidad} × {fmtMoneda(item.costoUnitario)}</p>
                </div>
                <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>{fmtMoneda(item.subtotal)}</p>
              </div>
            ))}
            <p className="text-right font-bold" style={{ color: 'var(--menu-texto-principal)' }}>Total: {fmtMoneda(detalleCompra.total)}</p>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
