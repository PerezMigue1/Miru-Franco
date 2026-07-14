'use client';

import { useState } from 'react';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import { BadgeDollarSign, Package, Truck } from 'lucide-react';

export interface ProveedorItem {
  id: number;
  nombre: string;
  contacto: string;
  productos: string;
  direccion: string;
  compras: number;
  ultimaCompra: string;
}

const PROVEEDORES_INICIALES: ProveedorItem[] = [
  { id: 1, nombre: 'Floractiv', contacto: '555-1001', productos: 'Nanoplastía', direccion: '', compras: 12, ultimaCompra: '2024-01-10' },
  { id: 2, nombre: 'Avina', contacto: '555-1002', productos: 'Cabello y Tratamientos', direccion: '', compras: 18, ultimaCompra: '2024-01-08' },
  { id: 3, nombre: 'Tech Italy', contacto: '555-1003', productos: 'Productos Profesionales', direccion: '', compras: 15, ultimaCompra: '2024-01-12' },
  { id: 4, nombre: 'Alfaparf', contacto: '555-1004', productos: 'Productos Profesionales', direccion: '', compras: 10, ultimaCompra: '2024-01-05' },
];

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<ProveedorItem[]>(PROVEEDORES_INICIALES);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [proveedorToDelete, setProveedorToDelete] = useState<ProveedorItem | null>(null);

  const [formNombre, setFormNombre] = useState('');
  const [formContacto, setFormContacto] = useState('');
  const [formProductos, setFormProductos] = useState('');
  const [formDireccion, setFormDireccion] = useState('');

  const nextId = Math.max(0, ...proveedores.map((p) => p.id)) + 1;

  const openNuevo = () => {
    setEditingId(null);
    setFormNombre('');
    setFormContacto('');
    setFormProductos('');
    setFormDireccion('');
    setShowForm(true);
  };

  const openEditar = (p: ProveedorItem) => {
    setEditingId(p.id);
    setFormNombre(p.nombre);
    setFormContacto(p.contacto);
    setFormProductos(p.productos);
    setFormDireccion(p.direccion);
    setShowForm(true);
  };

  const handleGuardar = () => {
    if (!formNombre.trim()) return;
    if (editingId !== null) {
      setProveedores((prev) =>
        prev.map((p) =>
          p.id === editingId
            ? {
                ...p,
                nombre: formNombre.trim(),
                contacto: formContacto.trim(),
                productos: formProductos.trim(),
                direccion: formDireccion.trim(),
              }
            : p
        )
      );
    } else {
      setProveedores((prev) => [
        ...prev,
        {
          id: nextId,
          nombre: formNombre.trim(),
          contacto: formContacto.trim(),
          productos: formProductos.trim(),
          direccion: formDireccion.trim(),
          compras: 0,
          ultimaCompra: '-',
        },
      ]);
    }
    setShowForm(false);
  };

  const handleEliminar = () => {
    if (proveedorToDelete) {
      setProveedores((prev) => prev.filter((p) => p.id !== proveedorToDelete.id));
      setShowDeleteModal(false);
      setProveedorToDelete(null);
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
          <Button onClick={openNuevo}>+ Nuevo Proveedor</Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Truck size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Total proveedores</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{proveedores.length}</p>
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
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{totalCompras}</p>
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
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{promedioCompras}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Listado */}
        <Card variant="elevated" padding="lg">
        <Table headers={['Proveedor', 'Contacto', 'Productos', 'Compras', 'Última Compra', 'Acciones']} headerSutil>
          {proveedores.map((proveedor) => (
            <TableRow key={proveedor.id}>
              <TableCell className="font-semibold" rowPadding="lg">{proveedor.nombre}</TableCell>
              <TableCell rowPadding="lg">{proveedor.contacto}</TableCell>
              <TableCell rowPadding="lg">{proveedor.productos}</TableCell>
              <TableCell rowPadding="lg">{proveedor.compras}</TableCell>
              <TableCell rowPadding="lg">{proveedor.ultimaCompra}</TableCell>
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
        </Card>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingId !== null ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardar}>Guardar</Button>
          </>
        }
      >
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
        onClose={() => setShowDeleteModal(false)}
        title="Eliminar proveedor"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleEliminar}>
              Eliminar
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
