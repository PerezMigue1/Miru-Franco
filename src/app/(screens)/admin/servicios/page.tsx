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
import Modal from '../../../components/ui/Modal';
import { getCategoryColor } from '../../../utils/categoryColors';
import {
  getServicios,
  createServicio,
  deleteServicio,
  type Servicio,
  type ServicioPayload,
} from '../../../services/servicios';

export default function ServiciosPage() {
  const router = useRouter();
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [servicioToDelete, setServicioToDelete] = useState<Servicio | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formNombre, setFormNombre] = useState('');
  const [formPrecio, setFormPrecio] = useState('');
  const [formDuracion, setFormDuracion] = useState('');
  const [formCategoria, setFormCategoria] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');

  const loadServicios = () => {
    setLoading(true);
    setError(null);
    getServicios()
      .then((result) => {
        setServicios(result.data);
        if (result.error) setError(result.error);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadServicios();
  }, []);

  const handleCrear = async () => {
    if (!formNombre.trim()) {
      setError('El nombre del servicio es obligatorio.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: ServicioPayload = {
        nombre: formNombre.trim(),
        descripcion: formDescripcion.trim() || undefined,
        precio: formPrecio.trim() ? parseFloat(formPrecio.replace(/[^0-9.]/g, '')) || undefined : undefined,
        duracion: formDuracion.trim() || undefined,
        categoria: formCategoria.trim() || undefined,
      };
      await createServicio(payload);
      setShowForm(false);
      setFormNombre('');
      setFormPrecio('');
      setFormDuracion('');
      setFormCategoria('');
      setFormDescripcion('');
      loadServicios();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el servicio');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async () => {
    if (!servicioToDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteServicio(servicioToDelete.id);
      setShowDeleteModal(false);
      setServicioToDelete(null);
      loadServicios();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el servicio');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Servicios"
        subtitle="Administra el catálogo completo de servicios ofrecidos"
        actions={
          <Button onClick={() => setShowForm(true)}>+ Nuevo Servicio</Button>
        }
      />

      {error && (
        <Card className="mb-6 border-l-4" padding="md" style={{ borderLeftColor: 'var(--danger)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>{error}</p>
        </Card>
      )}

      <Card>
        <Table headers={['Servicio', 'Precio', 'Duración', 'Categoría', 'Acciones']}>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} style={{ color: 'var(--encabezados-alterno)' }}>
                Cargando servicios...
              </TableCell>
            </TableRow>
          ) : (
            servicios.map((servicio) => (
              <TableRow key={servicio.id}>
                <TableCell className="font-semibold">{servicio.nombre}</TableCell>
                <TableCell>{servicio.precio ?? '-'}</TableCell>
                <TableCell>{servicio.duracion ?? '-'}</TableCell>
                <TableCell>
                  <Badge variant={getCategoryColor(servicio.categoria ?? '')}>
                    {servicio.categoria ?? 'Sin categoría'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/admin/servicios/${servicio.id}`)}
                    >
                      Ver / Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        setServicioToDelete(servicio);
                        setShowDeleteModal(true);
                      }}
                    >
                      Eliminar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </Table>
      </Card>

      <Modal
        isOpen={showForm}
        onClose={() => !saving && setShowForm(false)}
        title="Nuevo Servicio"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleCrear} disabled={saving}>
              {saving ? 'Guardando...' : 'Registrar Servicio'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          <Input
            label="Nombre del Servicio *"
            value={formNombre}
            onChange={(e) => setFormNombre(e.target.value)}
            placeholder="Ej: Corte, Alaciado..."
            fullWidth
          />
          <Input
            label="Precio"
            value={formPrecio}
            onChange={(e) => setFormPrecio(e.target.value)}
            placeholder="$0.00"
            fullWidth
          />
          <Input
            label="Duración Estimada"
            value={formDuracion}
            onChange={(e) => setFormDuracion(e.target.value)}
            placeholder="Ej: 45 min, 2 horas"
            fullWidth
          />
          <Input
            label="Categoría"
            value={formCategoria}
            onChange={(e) => setFormCategoria(e.target.value)}
            placeholder="Corte, Químico, Depilación..."
            fullWidth
          />
          <Input
            label="Descripción"
            value={formDescripcion}
            onChange={(e) => setFormDescripcion(e.target.value)}
            placeholder="Descripción opcional"
            fullWidth
          />
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => !deleting && setShowDeleteModal(false)}
        title="Eliminar servicio"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleEliminar} disabled={deleting}>
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </>
        }
      >
        <p style={{ color: 'var(--menu-texto-principal)' }}>
          ¿Estás seguro de que deseas eliminar el servicio &quot;{servicioToDelete?.nombre}&quot;?
        </p>
      </Modal>
    </AdminLayout>
  );
}
