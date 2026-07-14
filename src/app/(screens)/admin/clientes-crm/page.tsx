'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import { CheckCircle2, Filter, PowerOff, Users } from 'lucide-react';
import {
  getUsuarios,
  patchUsuarioEstado,
  type Usuario,
} from '../../../services/usuarios';

function formatearFecha(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
}

export default function ClientesCRMPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<Usuario | null>(null);
  const [saving, setSaving] = useState(false);

  // incluirInactivos=true: igual que en Usuarios y Roles y Servicios, los KPIs (Activos/Inactivos)
  // necesitan el total real. Antes solo se pedían activos y "Inactivos" siempre mostraba 0.
  const loadClientes = async () => {
    setLoading(true);
    setError(null);
    try {
      const todos = await getUsuarios(undefined, true);
      const soloClientes = todos.filter((u) => {
        const r = String(u.rol || '').toLowerCase();
        return r === 'cliente';
      });
      setClientes(soloClientes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar clientes');
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientes();
  }, []);

  const filtrados = clientes.filter((c) => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return true;
    return (
      c.nombre.toLowerCase().includes(q) ||
      (c.telefono ?? '').includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  const handleDesactivar = async () => {
    if (!clienteToDelete) return;
    setSaving(true);
    try {
      await patchUsuarioEstado(clienteToDelete.id, false);
      setClientes((prev) =>
        prev.map((c) => (c.id === clienteToDelete.id ? { ...c, activo: false } : c))
      );
      setShowDeleteModal(false);
      setClienteToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al desactivar');
    } finally {
      setSaving(false);
    }
  };

  const clientesActivos = clientes.filter((c) => c.activo).length;
  const clientesInactivos = clientes.filter((c) => !c.activo).length;

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
          Clientes CRM
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
          {clientes.length} cliente{clientes.length === 1 ? '' : 's'} registrados
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card variant="elevated" padding="lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
              <Users size={20} style={{ color: 'var(--encabezados-alterno)' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Total clientes</p>
              <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{clientes.length}</p>
            </div>
          </div>
        </Card>

        <Card variant="elevated" padding="lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
              <CheckCircle2 size={20} style={{ color: 'var(--encabezados-alterno)' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Activos</p>
              <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{clientesActivos}</p>
            </div>
          </div>
        </Card>

        <Card
          variant="elevated"
          padding="lg"
          style={clientesInactivos > 0 ? { boxShadow: '0 0 0 1.5px var(--warning), 0 4px 12px rgba(0,0,0,0.15)' } : undefined}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: clientesInactivos > 0 ? 'rgba(217, 142, 4, 0.2)' : 'var(--fondos-suaves)' }}
            >
              <PowerOff size={20} style={{ color: clientesInactivos > 0 ? 'var(--warning)' : 'var(--encabezados-alterno)' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Inactivos</p>
              <p className="text-2xl font-bold mt-0.5" style={{ color: clientesInactivos > 0 ? 'var(--warning-texto)' : 'var(--menu-texto-principal)' }}>{clientesInactivos}</p>
            </div>
          </div>
        </Card>

        <Card variant="elevated" padding="lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
              <Filter size={20} style={{ color: 'var(--encabezados-alterno)' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Filtrados</p>
              <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{filtrados.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {error && (
        <Card className="mb-6 border-l-4" padding="md" style={{ borderLeftColor: 'var(--danger)' }}>
          <p className="text-sm" style={{ color: 'var(--danger-texto)' }}>{error}</p>
        </Card>
      )}

      <div className="mb-6">
        <Input
          placeholder="Buscar por nombre, teléfono o email..."
          className="w-full sm:w-64"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <Card variant="elevated" padding="lg">
        {loading ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>
            Cargando clientes...
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table headers={['Cliente', 'Teléfono', 'Email', 'Estado', 'Última actividad', 'Acciones']} headerSutil>
              {filtrados.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell className="font-semibold" rowPadding="lg">{cliente.nombre}</TableCell>
                  <TableCell rowPadding="lg">{cliente.telefono || '—'}</TableCell>
                  <TableCell rowPadding="lg">{cliente.email}</TableCell>
                  <TableCell rowPadding="lg">
                    <Badge variant={cliente.activo ? 'success' : 'danger'}>
                      {cliente.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell rowPadding="lg">{formatearFecha(cliente.ultimaActividad ?? cliente.creadoEn)}</TableCell>
                  <TableCell rowPadding="lg">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/admin/clientes-crm/${cliente.id}`)}
                      >
                        Ver Perfil
                      </Button>
                      {cliente.activo && (
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
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          </div>
        )}
        {!loading && filtrados.length === 0 && (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>
            No hay clientes. Los usuarios con rol «Cliente» aparecerán aquí.
          </p>
        )}
      </Card>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Eliminar cliente"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDesactivar} disabled={saving}>
              {saving ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </>
        }
      >
        <p style={{ color: 'var(--menu-texto-principal)' }}>
          ¿Eliminar a &quot;{clienteToDelete?.nombre}&quot;? Se desactivará y no podrá iniciar sesión.
        </p>
      </Modal>
    </AdminLayout>
  );
}
