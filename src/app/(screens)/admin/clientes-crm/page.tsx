'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import { colors } from '../../../utils/colors';

export interface ClienteItem {
  id: number;
  nombre: string;
  telefono: string;
  email: string;
  servicios: number;
  ultimaVisita: string;
  estado: 'frecuente' | 'regular' | 'nuevo';
  confiabilidad: 'alta' | 'media' | 'baja';
}

const CLIENTES_INICIALES: ClienteItem[] = [
  { id: 1, nombre: 'María González', telefono: '555-1234', email: 'maria@ejemplo.com', servicios: 8, ultimaVisita: '2024-01-15', estado: 'frecuente', confiabilidad: 'alta' },
  { id: 2, nombre: 'Ana López', telefono: '555-5678', email: 'ana@ejemplo.com', servicios: 3, ultimaVisita: '2024-01-14', estado: 'regular', confiabilidad: 'media' },
  { id: 3, nombre: 'Carmen Ruiz', telefono: '555-9012', email: 'carmen@ejemplo.com', servicios: 12, ultimaVisita: '2024-01-13', estado: 'frecuente', confiabilidad: 'alta' },
  { id: 4, nombre: 'Laura Martínez', telefono: '555-3456', email: 'laura@ejemplo.com', servicios: 1, ultimaVisita: '2023-12-20', estado: 'nuevo', confiabilidad: 'baja' },
];

export default function ClientesCRMPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<ClienteItem[]>(CLIENTES_INICIALES);
  const [busqueda, setBusqueda] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<ClienteItem | null>(null);

  const [formNombre, setFormNombre] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formEmail, setFormEmail] = useState('');

  const nextId = Math.max(0, ...clientes.map((c) => c.id)) + 1;

  const filtrados = clientes.filter((c) => {
    const q = busqueda.toLowerCase();
    if (!q) return true;
    return (
      c.nombre.toLowerCase().includes(q) ||
      c.telefono.includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  const openNuevo = () => {
    setEditingId(null);
    setFormNombre('');
    setFormTelefono('');
    setFormEmail('');
    setShowForm(true);
  };

  const openEditar = (c: ClienteItem) => {
    setEditingId(c.id);
    setFormNombre(c.nombre);
    setFormTelefono(c.telefono);
    setFormEmail(c.email);
    setShowForm(true);
  };

  const handleGuardar = () => {
    if (!formNombre.trim()) return;
    if (editingId !== null) {
      setClientes((prev) =>
        prev.map((c) =>
          c.id === editingId
            ? { ...c, nombre: formNombre.trim(), telefono: formTelefono.trim(), email: formEmail.trim() }
            : c
        )
      );
    } else {
      setClientes((prev) => [
        ...prev,
        {
          id: nextId,
          nombre: formNombre.trim(),
          telefono: formTelefono.trim(),
          email: formEmail.trim(),
          servicios: 0,
          ultimaVisita: '-',
          estado: 'nuevo',
          confiabilidad: 'baja',
        },
      ]);
    }
    setShowForm(false);
  };

  const handleEliminar = () => {
    if (clienteToDelete) {
      setClientes((prev) => prev.filter((c) => c.id !== clienteToDelete.id));
      setShowDeleteModal(false);
      setClienteToDelete(null);
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Clientes (CRM)"
        subtitle="Gestiona la información completa de las clientas y su historial"
        actions={<Button onClick={openNuevo}>+ Nuevo Cliente</Button>}
      />

      <div className="mb-6">
        <Input
          placeholder="Buscar cliente por nombre, teléfono, email..."
          className="w-full"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <Card>
        <Table headers={['Cliente', 'Teléfono', 'Email', 'Servicios', 'Última Visita', 'Estado', 'Confiabilidad', 'Acciones']}>
          {filtrados.map((cliente) => (
            <TableRow key={cliente.id}>
              <TableCell className="font-semibold">{cliente.nombre}</TableCell>
              <TableCell>{cliente.telefono}</TableCell>
              <TableCell>{cliente.email}</TableCell>
              <TableCell>{cliente.servicios}</TableCell>
              <TableCell>{cliente.ultimaVisita}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    cliente.estado === 'frecuente' ? 'success' : cliente.estado === 'regular' ? 'info' : 'default'
                  }
                >
                  {cliente.estado}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    cliente.confiabilidad === 'alta' ? 'success' : cliente.confiabilidad === 'media' ? 'warning' : 'danger'
                  }
                >
                  {cliente.confiabilidad}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => router.push(`/admin/clientes-crm/${cliente.id}`)}>
                    Ver Perfil
                  </Button>
                  <Button size="sm" onClick={() => openEditar(cliente)}>
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      setClienteToDelete(cliente);
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

      <Card className="mt-6">
        <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
          Estadísticas de Clientes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
            <p className="text-2xl font-bold mb-1" style={{ color: colors.menuTextoPrincipal }}>{clientes.length}</p>
            <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>Total Clientes</p>
          </div>
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
            <p className="text-2xl font-bold mb-1" style={{ color: colors.menuTextoPrincipal }}>
              {clientes.filter((c) => c.estado === 'frecuente').length}
            </p>
            <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>Clientes Frecuentes</p>
          </div>
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
            <p className="text-2xl font-bold mb-1" style={{ color: colors.menuTextoPrincipal }}>
              {clientes.filter((c) => c.estado === 'nuevo').length}
            </p>
            <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>Clientes Nuevos</p>
          </div>
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
            <p className="text-2xl font-bold mb-1" style={{ color: colors.menuTextoPrincipal }}>
              {clientes.filter((c) => c.confiabilidad === 'alta').length}
            </p>
            <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>Confiabilidad Alta</p>
          </div>
        </div>
      </Card>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingId !== null ? 'Editar Cliente' : 'Nuevo Cliente'}
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
            label="Nombre completo *"
            value={formNombre}
            onChange={(e) => setFormNombre(e.target.value)}
            placeholder="Nombre y apellidos"
            fullWidth
          />
          <Input
            label="Teléfono"
            value={formTelefono}
            onChange={(e) => setFormTelefono(e.target.value)}
            placeholder="555-0000"
            fullWidth
          />
          <Input
            label="Email"
            type="email"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
            placeholder="email@ejemplo.com"
            fullWidth
          />
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Eliminar cliente"
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
        <p style={{ color: colors.menuTextoPrincipal }}>
          ¿Estás seguro de que deseas eliminar a &quot;{clienteToDelete?.nombre}&quot;?
        </p>
      </Modal>
    </AdminLayout>
  );
}
