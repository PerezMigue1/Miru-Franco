'use client';

import Image from 'next/image';
import { useState, type ChangeEvent, type SyntheticEvent } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Textarea from '../../../../components/ui/Textarea';
import { X } from 'lucide-react';
import { createServicio, type ServicioPayload } from '../../../../services/servicios';
import { IMG_SERVICIO_PLACEHOLDER } from '../../../../utils/serviceImagePlaceholder';

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

export default function NuevoServicioPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [precioStr, setPrecioStr] = useState('');
  const [duracion, setDuracion] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [descripcionLarga, setDescripcionLarga] = useState('');
  const [incluye, setIncluye] = useState('');
  const [recomendaciones, setRecomendaciones] = useState('');
  const [requiereEvaluacion, setRequiereEvaluacion] = useState(false);
  const [activo, setActivo] = useState(true);

  // --- ESTADOS PARA IMÁGENES (misma galería que editar) ---
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [nuevaImagenUrl, setNuevaImagenUrl] = useState('');

  const duracionOptions = [{ value: '', label: 'Seleccionar...' }, ...DURACION_OPCIONES];
  const categoriaOptions = [{ value: '', label: 'Elegir categoría...' }, ...CATEGORIAS_OPCIONES];

  const handleAgregarImagen = () => {
    if (!nuevaImagenUrl.trim()) return;
    if (imagenes.length >= 5) {
      alert('Máximo 5 imágenes permitidas');
      return;
    }
    setImagenes([...imagenes, nuevaImagenUrl.trim()]);
    setNuevaImagenUrl('');
  };

  const handleQuitarImagen = (index: number) => {
    setImagenes(imagenes.filter((_, i) => i !== index));
  };

  const handleCrear = async () => {
    if (!nombre.trim() || !categoria || !duracion) {
      setError('Rellena los campos obligatorios (nombre, categoría y duración).');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: ServicioPayload = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || nombre.trim(),
        descripcionLarga: descripcionLarga.trim() || undefined,
        precio: parseFloat(precioStr) || 0,
        duracionMinutos: parseInt(duracion),
        categoria,
        incluye: incluye.trim() ? incluye.split(',').map((i) => i.trim()).filter(Boolean) : [],
        recomendaciones: recomendaciones.trim() ? recomendaciones.split(',').map((r) => r.trim()).filter(Boolean) : [],
        requiereEvaluacion,
        activo,
        // El DTO del backend espera `imagen` como array (nunca un campo `imagenes` ni un string suelto).
        imagen: imagenes,
      };
      await createServicio(payload);
      router.push('/admin/servicios');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar el servicio');
    } finally {
      setSaving(false);
    }
  };

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
              <h1 className="text-hero" style={{ color: 'var(--menu-texto-principal)' }}>Nuevo servicio</h1>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.push('/admin/servicios')} disabled={saving}>
                  Cancelar
                </Button>
                <Button variant="primary" onClick={handleCrear} disabled={saving}>
                  {saving ? 'Creando...' : 'Crear servicio'}
                </Button>
              </div>
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
              <Input label="Precio ($) *" value={precioStr} onChange={(e) => setPrecioStr(e.target.value)} placeholder="0" type="number" fullWidth />
              <Select label="Duración *" value={duracion} onChange={(e) => setDuracion(e.target.value)} options={duracionOptions} fullWidth />
              <Select label="Categoría *" value={categoria} onChange={(e) => setCategoria(e.target.value)} options={categoriaOptions} fullWidth />
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

              {/* --- SECCIÓN DE GESTIÓN DE IMÁGENES (misma galería que editar) --- */}
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
    </AdminLayout>
  );
}
