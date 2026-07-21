'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import { BadgeDollarSign, Package, ShoppingCart, Truck } from 'lucide-react';
import {
  listarProveedores,
  crearProveedor,
  actualizarProveedor,
  eliminarProveedor,
  ProveedorApi,
} from '../../../services/proveedores';

function fmtFecha(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('es-MX');
}

export default function ProveedoresPage() {
  const router = useRouter();
  const [proveedores, setProveedores] = useState<ProveedorApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [proveedorToDelete, setProveedorToDelete] = useState<ProveedorApi | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formNombre, setFormNombre] = useState('');
  const [formContacto, setFormContacto] = useState('');
  const [formProductos, setFormProductos] = useState('');
  const [formDireccion, setFormDireccion] = useState('');

  const cargar = useCallback(() => {
    setLoading(true);
    setError(null);
    listarProveedores()
      .then(({ data }) => setProveedores(data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar los proveedores'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const openNuevo = () => {
    setEditingId(null);
    setFormNombre('');
    setFormContacto('');
    setFormProductos('');
    setFormDireccion('');
    setFormError(null);
    setShowForm(true);
  };

  const openEditar = (p: ProveedorApi) => {
    setEditingId(p.id);
    setFormNombre(p.nombre);
    setFormContacto(p.contacto ?? '');
    setFormProductos(p.productos ?? '');
    setFormDireccion(p.direccion ?? '');
    setFormError(null);
    setShowForm(true);
  };

  const handleGuardar = async () => {
    if (!formNombre.trim()) return;
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        nombre: formNombre.trim(),
        contacto: formContacto.trim() || undefined,
        productos: formProductos.trim() || undefined,
        direccion: formDireccion.trim() || undefined,
      };
      if (editingId !== null) {
        await actualizarProveedor(editingId, payload);
      } else {
        await crearProveedor(payload);
      }
      setShowForm(false);
      cargar();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'No se pudo guardar el proveedor');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async () => {
    if (!proveedorToDelete) return;
    setSaving(true);
    try {
      await eliminarProveedor(proveedorToDelete.id);
      setShowDeleteModal(false);
      setProveedorToDelete(null);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar el proveedor');
      setShowDeleteModal(false);
    } finally {
      setSaving(false);
    }
  };

  const totalCompras = proveedores.reduce((acc, p) => acc + p.compras, 0);
  const promedioCompras = proveedores.length > 0 ? Math.round(totalCompras / proveedores.length) : 0;

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              Proveedores
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              {proveedores.length} proveedor{proveedores.length === 1 ? '' : 'es'} registrados
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => router.push('/admin/compras-proveedores')}>
              <span className="inline-flex items-center gap-1.5"><ShoppingCart size={15} aria-hidden /> Compras a proveedores</span>
            </Button>
            <Button onClick={openNuevo}>+ Nuevo Proveedor</Button>
          </div>
        </div>

        {error && (
          <Card variant="elevated" padding="md" className="border-l-4" style={{ borderLeftColor: 'var(--danger)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--danger-texto)' }}>{error}</p>
          </Card>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Truck size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Total proveedores</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : proveedores.length}</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Package size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Compras totales</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : totalCompras}</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <BadgeDollarSign size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Compras promedio</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : promedioCompras}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Listado */}
        <Card variant="elevated" padding="lg">
        {loading ? (
          <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>Cargando proveedores…</p>
        ) : proveedores.length === 0 ? (
          <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>No hay proveedores registrados.</p>
        ) : (
        <Table headers={['Proveedor', 'Contacto', 'Productos', 'Compras', 'Última Compra', 'Acciones']} headerSutil>
          {proveedores.map((proveedor) => (
            <TableRow key={proveedor.id}>
              <TableCell className="font-semibold" rowPadding="lg">{proveedor.nombre}</TableCell>
              <TableCell rowPadding="lg">{proveedor.contacto || '-'}</TableCell>
              <TableCell rowPadding="lg">{proveedor.productos || '-'}</TableCell>
              <TableCell rowPadding="lg">{proveedor.compras}</TableCell>
              <TableCell rowPadding="lg">{fmtFecha(proveedor.ultimaCompra)}</TableCell>
              <TableCell rowPadding="lg">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditar(proveedor)}>
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      setProveedorToDelete(proveedor);
                      setShowDeleteModal(true);
                    }}
                  >
                    Eliminar
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
        )}
        </Card>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => { if (!saving) setShowForm(false); }}
        title={editingId !== null ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleGuardar} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </>
        }
      >
        {formError && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{formError}</p>}
        <div className="grid grid-cols-1 gap-4">
          <Input
            label="Nombre del Proveedor *"
            value={formNombre}
            onChange={(e) => setFormNombre(e.target.value)}
            placeholder="Nombre comercial"
            fullWidth
          />
          <Input
            label="Contacto"
            value={formContacto}
            onChange={(e) => setFormContacto(e.target.value)}
            placeholder="Teléfono o email"
            fullWidth
          />
          <Input
            label="Productos que Suministra"
            value={formProductos}
            onChange={(e) => setFormProductos(e.target.value)}
            placeholder="Descripción de productos"
            fullWidth
          />
          <Input
            label="Dirección"
            value={formDireccion}
            onChange={(e) => setFormDireccion(e.target.value)}
            placeholder="Dirección del proveedor"
            fullWidth
          />
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => { if (!saving) setShowDeleteModal(false); }}
        title="Eliminar proveedor"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleEliminar} disabled={saving}>
              {saving ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </>
        }
      >
        <p style={{ color: 'var(--menu-texto-principal)' }}>
          ¿Estás seguro de que deseas eliminar a &quot;{proveedorToDelete?.nombre}&quot;?
        </p>
      </Modal>
    </AdminLayout>
  );
}
