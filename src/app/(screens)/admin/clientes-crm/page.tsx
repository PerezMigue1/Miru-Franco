'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Textarea from '../../../components/ui/Textarea';
import Modal from '../../../components/ui/Modal';
import {
  getUsuarios,
  updateUsuario,
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
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<Usuario | null>(null);
  const [saving, setSaving] = useState(false);

  const [formNombre, setFormNombre] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formFechaNacimiento, setFormFechaNacimiento] = useState('');
  const [formFoto, setFormFoto] = useState('');
  const [formRecibePromociones, setFormRecibePromociones] = useState(false);
  const [formTipoCabello, setFormTipoCabello] = useState('');
  const [formColorNatural, setFormColorNatural] = useState('');
  const [formColorActual, setFormColorActual] = useState('');
  const [formProductosUsados, setFormProductosUsados] = useState('');
  const [formAlergias, setFormAlergias] = useState('');

  const loadClientes = async () => {
    setLoading(true);
    setError(null);
    try {
      const todos = await getUsuarios();
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

  const resetCamposExtra = () => {
    setFormFechaNacimiento('');
    setFormFoto('');
    setFormRecibePromociones(false);
    setFormTipoCabello('');
    setFormColorNatural('');
    setFormColorActual('');
    setFormProductosUsados('');
    setFormAlergias('');
  };

  const openNuevo = () => {
    setEditingUser(null);
    setFormNombre('');
    setFormTelefono('');
    setFormEmail('');
    resetCamposExtra();
    setShowForm(true);
  };

  const openEditar = (u: Usuario) => {
    setEditingUser(u);
    setFormNombre(u.nombre);
    setFormTelefono(u.telefono ?? '');
    setFormEmail(u.email);
    setFormFechaNacimiento(u.fechaNacimiento ? u.fechaNacimiento.slice(0, 10) : '');
    setFormFoto(u.foto ?? '');
    setFormRecibePromociones(u.recibePromociones ?? false);
    setFormTipoCabello(u.tipoCabello ?? '');
    setFormColorNatural(u.colorNatural ?? '');
    setFormColorActual(u.colorActual ?? '');
    setFormProductosUsados(u.productosUsados ?? '');
    setFormAlergias(u.alergias ?? '');
    setShowForm(true);
  };

  const handleGuardar = async () => {
    if (!formNombre.trim()) return;
    if (editingUser) {
      setSaving(true);
      try {
        const actualizado = await updateUsuario(editingUser.id, {
          nombre: formNombre.trim(),
          telefono: formTelefono.trim() || null,
          fechaNacimiento: formFechaNacimiento || undefined,
          foto: formFoto.trim() || undefined,
          recibePromociones: formRecibePromociones,
          tipoCabello: formTipoCabello || undefined,
          colorNatural: formColorNatural.trim() || undefined,
          colorActual: formColorActual.trim() || undefined,
          productosUsados: formProductosUsados.trim() || undefined,
          alergias: formAlergias.trim() || undefined,
        } as unknown as Parameters<typeof updateUsuario>[1]);
        setClientes((prev) => prev.map((c) => (c.id === actualizado.id ? actualizado : c)));
        setShowForm(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al guardar');
      } finally {
        setSaving(false);
      }
    } else {
      setShowForm(false);
      router.push('/admin/usuarios-roles');
    }
  };

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

  return (
    <AdminLayout>
      <PageHeader
        title="Clientes (CRM)"
        subtitle="Gestiona la información de las clientas"
        actions={<Button onClick={openNuevo}>+ Nuevo Cliente</Button>}
      />

      {error && (
        <Card className="mb-6 border-l-4" padding="md" style={{ borderLeftColor: 'var(--danger)' }}>
          <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
        </Card>
      )}

      <div className="mb-6">
        <Input
          placeholder="Buscar por nombre, teléfono o email..."
          className="w-full"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <Card>
        {loading ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>
            Cargando clientes...
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table headers={['Cliente', 'Teléfono', 'Email', 'Estado', 'Última actividad', 'Acciones']}>
              {filtrados.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell className="font-semibold">{cliente.nombre}</TableCell>
                  <TableCell>{cliente.telefono || '—'}</TableCell>
                  <TableCell>{cliente.email}</TableCell>
                  <TableCell>
                    <Badge variant={cliente.activo ? 'success' : 'danger'}>
                      {cliente.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatearFecha(cliente.ultimaActividad ?? cliente.creadoEn)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/admin/clientes-crm/${cliente.id}`)}
                      >
                        Ver Perfil
                      </Button>
                      <Button size="sm" onClick={() => openEditar(cliente)}>
                        Editar
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

      <Card className="mt-6">
        <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
          Estadísticas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
            <p className="text-2xl font-bold mb-1" style={{ color: 'var(--menu-texto-principal)' }}>
              {clientes.length}
            </p>
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Total Clientes</p>
          </div>
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
            <p className="text-2xl font-bold mb-1" style={{ color: 'var(--success)' }}>
              {clientes.filter((c) => c.activo).length}
            </p>
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Activos</p>
          </div>
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
            <p className="text-2xl font-bold mb-1" style={{ color: 'var(--danger)' }}>
              {clientes.filter((c) => !c.activo).length}
            </p>
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Inactivos</p>
          </div>
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
            <p className="text-2xl font-bold mb-1" style={{ color: 'var(--menu-texto-principal)' }}>
              {filtrados.length}
            </p>
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Filtrados</p>
          </div>
        </div>
      </Card>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingUser ? 'Editar Cliente' : 'Nuevo Cliente'}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleGuardar} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </>
        }
      >
        {editingUser ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Nombre completo *"
                value={formNombre}
                onChange={(e) => setFormNombre(e.target.value)}
                placeholder="Nombre y apellidos"
                fullWidth
              />
            </div>
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
              fullWidth
              disabled
              title="El email no se puede cambiar desde aquí"
            />
            <Input
              label="Fecha de nacimiento"
              type="date"
              value={formFechaNacimiento}
              onChange={(e) => setFormFechaNacimiento(e.target.value)}
              fullWidth
            />
            <Input
              label="URL de foto"
              value={formFoto}
              onChange={(e) => setFormFoto(e.target.value)}
              placeholder="https://..."
              fullWidth
            />
            <Select
              label="Tipo de cabello"
              value={formTipoCabello}
              onChange={(e) => setFormTipoCabello(e.target.value)}
              options={[
                { value: '', label: 'Sin especificar' },
                { value: 'liso', label: 'Liso' },
                { value: 'ondulado', label: 'Ondulado' },
                { value: 'rizado', label: 'Rizado' },
              ]}
              fullWidth
            />
            <div className="flex items-center gap-2 pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formRecibePromociones}
                  onChange={(e) => setFormRecibePromociones(e.target.checked)}
                  className="rounded"
                />
                <span style={{ color: 'var(--menu-texto-principal)' }}>Acepta recibir promociones</span>
              </label>
            </div>
            <Input
              label="Color natural del cabello"
              value={formColorNatural}
              onChange={(e) => setFormColorNatural(e.target.value)}
              placeholder="Ej. Castaño oscuro"
              fullWidth
            />
            <Input
              label="Color actual"
              value={formColorActual}
              onChange={(e) => setFormColorActual(e.target.value)}
              placeholder="Ej. Rubio ceniza"
              fullWidth
            />
            <div className="sm:col-span-2">
              <Textarea
                label="Productos que usa actualmente"
                value={formProductosUsados}
                onChange={(e) => setFormProductosUsados(e.target.value)}
                placeholder="Shampoo, acondicionador, mascarilla..."
                rows={2}
                fullWidth
              />
            </div>
            <div className="sm:col-span-2">
              <Textarea
                label="Alergias conocidas"
                value={formAlergias}
                onChange={(e) => setFormAlergias(e.target.value)}
                placeholder="Ninguna / describir si las hay..."
                rows={2}
                fullWidth
              />
            </div>
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            Para crear un nuevo cliente, ve a <strong>Usuarios y Roles</strong> y crea un usuario con rol «Cliente».
          </p>
        )}
      </Modal>

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
