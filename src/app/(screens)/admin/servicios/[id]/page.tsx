'use client';

import Image from 'next/image';
import { useEffect, useState, type ChangeEvent, type SyntheticEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import Input from '../../../../components/ui/Input';
import Textarea from '../../../../components/ui/Textarea';
import Modal from '../../../../components/ui/Modal';
import { X } from 'lucide-react';
import { getCategoryColor } from '../../../../utils/categoryColors';
import {
  getServicioPorId,
  updateServicio,
  deleteServicio,
  type Servicio,
  type ServicioPayload,
} from '../../../../services/servicios';
import { IMG_SERVICIO_PLACEHOLDER } from '../../../../utils/serviceImagePlaceholder';

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
  
  // --- NUEVOS ESTADOS PARA IMÁGENES ---
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [nuevaImagenUrl, setNuevaImagenUrl] = useState('');

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

  const handleAgregarImagen = () => {
    if (!nuevaImagenUrl.trim()) return;
    if (imagenes.length >= 5) {
      alert("Máximo 5 imágenes permitidas");
      return;
    }
    setImagenes([...imagenes, nuevaImagenUrl.trim()]);
    setNuevaImagenUrl('');
  };

  const handleQuitarImagen = (index: number) => {
    setImagenes(imagenes.filter((_, i) => i !== index));
  };

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
        // ENVIAR IMÁGENES ACTUALIZADAS
        imagenes: imagenes,
        imagen: imagenes[0] || '', // Mantenemos compatibilidad con campo único
      };
      const actualizado = await updateServicio(servicio.id, payload);
      setServicio(actualizado);
      alert("Cambios guardados correctamente");
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
        <div className="layout-page py-12">
          <p style={{ color: 'var(--encabezados-alterno)' }}>Cargando servicio...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error && !servicio) {
    return (
      <AdminLayout>
        <div className="layout-page py-12">
          <p className="mb-4" style={{ color: 'var(--danger)' }}>{error}</p>
        </div>
      </AdminLayout>
    );
  }

  if (!servicio) return null;

  return (
    <AdminLayout>
      <div className="layout-page py-12">
        <div className="max-w-4xl mx-auto">
          {error && (
            <Card className="mb-6 border-l-4" padding="md" style={{ borderLeftColor: 'var(--danger)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>{error}</p>
            </Card>
          )}

          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-hero mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                  {nombre || servicio.nombre}
                </h1>
                <Badge variant={getCategoryColor((categoria || servicio.categoria) ?? '')} size="lg">
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

              {/* --- SECCIÓN DE GESTIÓN DE IMÁGENES --- */}
              <div className="md:col-span-2 mt-4 border-t pt-4">
                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                  Galería de Imágenes (Máx. 5)
                </label>
                
                <div className="flex gap-2 mb-4">
                  <Input 
                    placeholder="Pegar URL de la imagen..."
                    value={nuevaImagenUrl}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setNuevaImagenUrl(e.target.value)}
                    fullWidth
                  />
                  <Button variant="outline" onClick={handleAgregarImagen} disabled={imagenes.length >= 5}>
                    Agregar
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {imagenes.map((img, index) => (
                    <div key={index} className="relative aspect-square border rounded-md overflow-hidden bg-gray-50 group">
                      <Image
                        src={img}
                        alt={`Servicio ${index}`}
                        fill
                        sizes="160px"
                        className="object-cover"
                        unoptimized
                        onError={(e: SyntheticEvent<HTMLImageElement>) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = IMG_SERVICIO_PLACEHOLDER;
                        }}
                      />
                      <button
                        onClick={() => handleQuitarImagen(index)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        title="Quitar imagen"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  
                  {/* Espacios vacíos sugeridos */}
                  {Array.from({ length: 5 - imagenes.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square border-2 border-dashed border-gray-200 rounded-md flex items-center justify-center text-gray-300 text-xs">
                      Vacío
                    </div>
                  ))}
                </div>
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
        <p style={{ color: 'var(--menu-texto-principal)' }}>
          ¿Estás seguro de que deseas eliminar el servicio &quot;{servicio.nombre}&quot;?
        </p>
      </Modal>
    </AdminLayout>
  );
}