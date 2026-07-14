'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Textarea from '../../../../components/ui/Textarea';
import Modal from '../../../../components/ui/Modal';
import { getCategoryColor } from '../../../../utils/categoryColors';
import {
  getServicioPorId,
  updateServicio,
  deleteServicio,
  type Servicio,
  type ServicioPayload,
} from '../../../../services/servicios';
import { EditorImagenesPresentacionCloudinary } from '../../../../components/admin/EditorImagenesPresentacionCloudinary';
import { PRESET_SERVICIOS } from '../../../../utils/cloudinary';

const CATEGORIAS_OPCIONES = [
  { label: 'Alaciados y Alisados', value: 'Alaciados y Alisados' },
  { label: 'Tratamientos Capilares', value: 'Tratamientos Capilares' },
  { label: 'Estilismo y Belleza', value: 'Estilismo y Belleza' },
  { label: 'Depilación', value: 'Depilación' },
];

const DURACION_OPCIONES = [
  { label: '30 min', value: '30' },
  { label: '45 min', value: '45' },
  { label: '1 hora', value: '60' },
  { label: '1.5 horas', value: '90' },
  { label: '2 horas', value: '120' },
  { label: '3 horas', value: '180' },
];

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
  // Campos agregados para completar el CRUD (antes faltaban en esta pantalla)
  const [descripcionLarga, setDescripcionLarga] = useState('');
  const [incluye, setIncluye] = useState('');
  const [recomendaciones, setRecomendaciones] = useState('');
  const [requiereEvaluacion, setRequiereEvaluacion] = useState(false);
  const [activo, setActivo] = useState(true);

  // --- ESTADO DE IMÁGENES (galería, se conserva) ---
  const [imagenes, setImagenes] = useState<string[]>([]);

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
          setDuracion(s.duracionMinutos ? String(s.duracionMinutos) : '');
          setCategoria(s.categoria ?? '');
          setDescripcion(s.descripcion ?? '');
          setDescripcionLarga(s.descripcionLarga ?? '');
          setIncluye((s.incluye ?? []).join(', '));
          setRecomendaciones((s.recomendaciones ?? []).join(', '));
          setRequiereEvaluacion(s.requiereEvaluacion ?? false);
          // Inicializar el checkbox con el estado REAL del servicio (no forzar true → evita reactivarlo sin querer).
          setActivo(s.activo ?? true);
          // Cargar imágenes existentes (soporta array 'imagenes' o campo único 'imagen')
          setImagenes(s.imagenes || (s.imagen ? [s.imagen] : []));
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

  // Opciones de Select, preservando el valor actual si no está en el catálogo estándar.
  const duracionOptions = [{ value: '', label: 'Seleccionar...' }, ...DURACION_OPCIONES];
  if (duracion && !DURACION_OPCIONES.some((d) => d.value === duracion)) {
    duracionOptions.push({ value: duracion, label: `${duracion} min` });
  }
  const categoriaOptions = [{ value: '', label: 'Elegir categoría...' }, ...CATEGORIAS_OPCIONES];
  if (categoria && !CATEGORIAS_OPCIONES.some((c) => c.value === categoria)) {
    categoriaOptions.push({ value: categoria, label: categoria });
  }

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
        descripcion: descripcion.trim() || nombre.trim(),
        descripcionLarga: descripcionLarga.trim() || undefined,
        precio: parsePrecio(precioStr),
        duracionMinutos: duracion ? parseInt(duracion) : undefined,
        categoria: categoria.trim() || undefined,
        incluye: incluye.trim() ? incluye.split(',').map((i) => i.trim()).filter(Boolean) : [],
        recomendaciones: recomendaciones.trim() ? recomendaciones.split(',').map((r) => r.trim()).filter(Boolean) : [],
        requiereEvaluacion,
        activo,
        // El DTO del backend espera `imagen` como array (nunca un campo `imagenes` ni un string suelto).
        imagen: imagenes,
      };
      const actualizado = await updateServicio(servicio.id, payload);
      setServicio(actualizado);
      router.push('/admin/servicios');
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
        <div className="w-full max-w-none py-12">
          <p style={{ color: 'var(--encabezados-alterno)' }}>Cargando servicio...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error && !servicio) {
    return (
      <AdminLayout>
        <div className="w-full max-w-none py-12">
          <p className="mb-4" style={{ color: 'var(--danger-texto)' }}>{error}</p>
          <Button variant="outline" onClick={() => router.push('/admin/servicios')}>Volver a servicios</Button>
        </div>
      </AdminLayout>
    );
  }

  if (!servicio) return null;

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              {nombre || servicio.nombre}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              Editar servicio
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/admin/servicios')} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleGuardar} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
            <Button variant="danger" onClick={() => setShowDeleteModal(true)} disabled={deleting}>
              Eliminar
            </Button>
          </div>
        </div>

        {error && (
          <Card className="border-l-4" padding="md" style={{ borderLeftColor: 'var(--danger)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--danger-texto)' }}>{error}</p>
          </Card>
        )}

          <Card variant="elevated" padding="lg">
            <div className="mb-4">
              <Badge variant={getCategoryColor((categoria || servicio.categoria) ?? '')} size="lg">
                {categoria || servicio.categoria || 'Sin categoría'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input label="Nombre del servicio *" value={nombre} onChange={(e) => setNombre(e.target.value)} fullWidth />
              </div>
              <div className="md:col-span-2">
                <Textarea label="Descripción corta" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} fullWidth />
              </div>
              <div className="md:col-span-2">
                <Textarea label="Descripción larga" value={descripcionLarga} onChange={(e) => setDescripcionLarga(e.target.value)} placeholder="Descripción detallada del servicio..." rows={3} fullWidth />
              </div>
              <div className="md:col-span-2">
                <Input label="Productos que incluye (separar por coma)" value={incluye} onChange={(e) => setIncluye(e.target.value)} fullWidth />
              </div>
              <div className="md:col-span-2">
                <Input label="Recomendaciones (separar por coma)" value={recomendaciones} onChange={(e) => setRecomendaciones(e.target.value)} placeholder="Evitar lavar el cabello 48h..." fullWidth />
              </div>
              <Input label="Precio ($)" value={precioStr} onChange={(e) => setPrecioStr(e.target.value)} placeholder="0" type="number" fullWidth />
              <Select label="Duración" value={duracion} onChange={(e) => setDuracion(e.target.value)} options={duracionOptions} fullWidth />
              <Select label="Categoría" value={categoria} onChange={(e) => setCategoria(e.target.value)} options={categoriaOptions} fullWidth />
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
                  <input type="checkbox" checked={requiereEvaluacion} onChange={(e) => setRequiereEvaluacion(e.target.checked)} className="rounded" />
                  Requiere evaluación previa
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
                  <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="rounded" />
                  Servicio activo
                </label>
              </div>

              {/* --- SECCIÓN DE GESTIÓN DE IMÁGENES (galería, se conserva) --- */}
              <div className="md:col-span-2 mt-4 border-t pt-4">
                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                  Galería de Imágenes
                </label>
                <EditorImagenesPresentacionCloudinary
                  urls={imagenes}
                  onChange={setImagenes}
                  preset={PRESET_SERVICIOS}
                />
              </div>
            </div>
          </Card>
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
        <p style={{ color: 'var(--menu-texto-principal)' }}>
          ¿Estás seguro de que deseas eliminar el servicio &quot;{servicio.nombre}&quot;?
        </p>
      </Modal>
    </AdminLayout>
  );
}
