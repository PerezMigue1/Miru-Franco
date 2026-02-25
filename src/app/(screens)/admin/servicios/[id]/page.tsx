'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import Input from '../../../../components/ui/Input';
import Textarea from '../../../../components/ui/Textarea';
import Modal from '../../../../components/ui/Modal';
import { colors } from '../../../../utils/colors';
import { getCategoryColor } from '../../../../utils/categoryColors';
import {
  getServicioPorId,
  updateServicio,
  deleteServicio,
  type Servicio,
  type ServicioPayload,
} from '../../../../services/servicios';

function parsePrecio(str: string | undefined): number | undefined {
  if (!str) return undefined;
  const n = parseFloat(String(str).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? undefined : n;
}

export default function ServicioDetalleAdminPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [nombre, setNombre] = useState('');
  const [precioStr, setPrecioStr] = useState('');
  const [duracion, setDuracion] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descripcion, setDescripcion] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getServicioPorId(id)
      .then((s) => {
        if (cancelled) return;
        if (s) {
          setServicio(s);
          setNombre(s.nombre);
          setPrecioStr(s.precio?.replace(/[^0-9.]/g, '') ?? '');
          setDuracion(s.duracion ?? '');
          setCategoria(s.categoria ?? '');
          setDescripcion(s.descripcion ?? '');
        } else {
          setError('Servicio no encontrado');
        }
      })
      .catch(() => {
        if (!cancelled) setError('Error al cargar el servicio');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  const handleGuardar = async () => {
    if (!servicio) return;
    if (!nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: ServicioPayload = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        precio: parsePrecio(precioStr),
        duracion: duracion.trim() || undefined,
        categoria: categoria.trim() || undefined,
      };
      const actualizado = await updateServicio(servicio.id, payload);
      setServicio(actualizado);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async () => {
    if (!servicio) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteServicio(servicio.id);
      router.push('/admin/servicios');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-12">
          <p style={{ color: colors.encabezadosAlterno }}>Cargando servicio...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error && !servicio) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-12">
          <p className="mb-4" style={{ color: colors.danger }}>{error}</p>
        </div>
      </AdminLayout>
    );
  }

  if (!servicio) return null;

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {error && (
            <Card className="mb-6 border-l-4" padding="md" style={{ borderLeftColor: colors.danger }}>
              <p className="text-sm font-medium" style={{ color: colors.danger }}>{error}</p>
            </Card>
          )}

          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-hero mb-2" style={{ color: colors.menuTextoPrincipal }}>
                  {nombre || servicio.nombre}
                </h1>
                <Badge variant={getCategoryColor(categoria || servicio.categoria ?? '')} size="lg">
                  {categoria || servicio.categoria || 'Sin categoría'}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="primary" onClick={handleGuardar} disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </Button>
                <Button variant="danger" onClick={() => setShowDeleteModal(true)} disabled={deleting}>
                  Eliminar
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nombre del Servicio"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                fullWidth
              />
              <Input
                label="Precio"
                value={precioStr}
                onChange={(e) => setPrecioStr(e.target.value)}
                placeholder="0"
                fullWidth
              />
              <Input
                label="Duración"
                value={duracion}
                onChange={(e) => setDuracion(e.target.value)}
                placeholder="Ej: 45 min"
                fullWidth
              />
              <Input
                label="Categoría"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                fullWidth
              />
              <div className="md:col-span-2">
                <Textarea
                  label="Descripción"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={3}
                  fullWidth
                />
              </div>
            </div>
          </Card>
        </div>
      </div>

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
        <p style={{ color: colors.menuTextoPrincipal }}>
          ¿Estás seguro de que deseas eliminar el servicio &quot;{servicio.nombre}&quot;?
        </p>
      </Modal>
    </AdminLayout>
  );
}
