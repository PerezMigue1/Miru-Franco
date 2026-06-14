'use client';

import { useEffect, useState, type ChangeEvent, type SyntheticEvent } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';
import Modal from '../../../components/ui/Modal';
import { CheckCircle2, ClipboardList } from 'lucide-react';
import { getCategoryColor } from '../../../utils/categoryColors';
import { getServicios, createServicio, deleteServicio, type Servicio, type ServicioPayload } from '../../../services/servicios';
import { createPaquete, serializarPaqueteParaApi } from '../../../services/paquetes';
import { mensajeUsuarioDesdeErrorApi } from '../../../utils/apiErrorMessage';
import { IMG_SERVICIO_PLACEHOLDER } from '../../../utils/serviceImagePlaceholder';

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

export default function ServiciosPage() {
  const router = useRouter();
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [servicioToDelete, setServicioToDelete] = useState<Servicio | null>(null);
  const [saving, setSaving] = useState(false);

  // --- ESTADOS PARA PAQUETES ---
  const [showPaqueteForm, setShowPaqueteForm] = useState(false);
  const [formPaqueteTipo, setFormPaqueteTipo] = useState(''); 
  const [formPaquetePrecio, setFormPaquetePrecio] = useState('');
  const [formPaqueteDescripcion, setFormPaqueteDescripcion] = useState('');
  const [formPaqueteServicios, setFormPaqueteServicios] = useState<string[]>([]);

  // --- ESTADOS PARA SERVICIOS ---
  const [formNombre, setFormNombre] = useState('');
  const [formPrecio, setFormPrecio] = useState('');
  const [formDuracion, setFormDuracion] = useState('');
  const [formCategoria, setFormCategoria] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formDescripcionLarga, setFormDescripcionLarga] = useState('');
  const [formImagenUrl, setFormImagenUrl] = useState('');
  const [formIncluye, setFormIncluye] = useState('');
  const [formRecomendaciones, setFormRecomendaciones] = useState('');
  const [formRequiereEvaluacion, setFormRequiereEvaluacion] = useState(false);
  const [formActivo, setFormActivo] = useState(true);

  // --- CONFIGURACIÓN DE COLORES PARA CONTRASTE ---
  const colorGuindaHex = '#4a0404';
  const colorTextoBlanco = '#FFFFFF';
  const colorTextoDorado = '#FACC15'; 
  const colorTextoGrisClaro = '#D1D5DB';

  const loadServicios = async () => {
    setLoading(true);
    try {
      const result = await getServicios();
      setServicios(result.data || []);
    } catch {
      setError("Error al cargar servicios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadServicios(); }, []);

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const handleCrear = async () => {
    if (!formNombre.trim() || !formCategoria || !formDuracion) {
      setError("Rellena los campos obligatorios");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        nombre: formNombre.trim(),
        precio: parseFloat(formPrecio) || 0,
        duracionMinutos: parseInt(formDuracion),
        categoria: formCategoria,
        descripcion: formDescripcion.trim() || formNombre.trim(),
        descripcionLarga: formDescripcionLarga.trim() || undefined,
        imagen: formImagenUrl.trim(),
        incluye: formIncluye.trim() ? formIncluye.split(',').map(i => i.trim()) : [],
        recomendaciones: formRecomendaciones.trim() ? formRecomendaciones.split(',').map(r => r.trim()).filter(Boolean) : [],
        requiereEvaluacion: formRequiereEvaluacion,
        activo: formActivo,
      } as ServicioPayload;
      await createServicio(payload);
      setSuccess("¡Servicio guardado correctamente!");
      setShowForm(false);
      resetServicioForm();
      loadServicios();
    } catch {
      setError("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const resetServicioForm = () => {
    setFormNombre(''); setFormPrecio(''); setFormDuracion('');
    setFormCategoria(''); setFormDescripcion(''); setFormDescripcionLarga('');
    setFormImagenUrl(''); setFormIncluye(''); setFormRecomendaciones('');
    setFormRequiereEvaluacion(false); setFormActivo(true);
  };

  const handleCrearPaquete = async () => {
    if (!formPaqueteTipo || !formPaquetePrecio.trim() || !formPaqueteDescripcion.trim()) {
      setError('Rellena los campos obligatorios del paquete.');
      return;
    }
    const precioNum = parseFloat(formPaquetePrecio.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(precioNum) || precioNum < 0) {
      setError('Indica un precio válido para el paquete.');
      return;
    }
    const nombresSeleccionados = servicios
      .filter((s) => {
        const sid = String(s.id ?? s._id ?? '');
        return sid.length > 0 && formPaqueteServicios.includes(sid);
      })
      .map((s) => s.nombre.trim())
      .filter(Boolean);
    if (nombresSeleccionados.length === 0) {
      setError('Selecciona al menos un servicio individual para incluir en el paquete.');
      return;
    }

    setSaving(true);
    setError(null);
    const paquetePayload = {
      tipoEvento: formPaqueteTipo.trim(),
      descripcion: formPaqueteDescripcion.trim(),
      serviciosVinculados: nombresSeleccionados,
      precioEspecial: precioNum,
    };
    try {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[paquetes] POST /api/paquetes body', serializarPaqueteParaApi(paquetePayload));
      }
      await createPaquete(paquetePayload);

      setSuccess('¡Paquete guardado correctamente!');
      setShowPaqueteForm(false);

      setFormPaqueteTipo('');
      setFormPaquetePrecio('');
      setFormPaqueteDescripcion('');
      setFormPaqueteServicios([]);

      router.push('/admin/paquetes');
    } catch (e) {
      setError(mensajeUsuarioDesdeErrorApi(e));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmarEliminar = async () => {
    const id = servicioToDelete?.id || servicioToDelete?._id;
    if (!id) return;
    try {
      await deleteServicio(id);
      setSuccess("Servicio eliminado correctamente");
      setShowDeleteModal(false);
      loadServicios();
    } catch {
      setError("Error al eliminar");
    }
  };

  return (
    <AdminLayout>
      <PageHeader 
        title="Servicios" 
        subtitle="Gestión de Catálogo Miru-Franco"
        actions={
          <div className="flex gap-2">
            {/* BOTÓN PARA IR A LA LISTA DE PAQUETES */}
            <Button variant="outline" onClick={() => router.push('/admin/paquetes')}>
              <ClipboardList size={16} className="inline-block mr-1" /> Ver Paquetes
            </Button>
            <Button variant="outline" onClick={() => setShowPaqueteForm(true)}>
              + Crear Paquete
            </Button>
            <Button onClick={() => setShowForm(true)}>
              + Nuevo Servicio
            </Button>
          </div>
        }
      />

      {success && (
        <div className="bg-green-600 border border-green-700 text-white px-4 py-3 rounded mb-4 text-xs font-bold shadow-md animate-pulse">
          <CheckCircle2 size={14} className="inline-block mr-1" /> {success}
        </div>
      )}

      {error && (
        <div className="bg-red-600 border border-red-700 text-white px-4 py-3 rounded mb-4 text-xs font-bold shadow-md">
          {error}
        </div>
      )}

      <Card>
        <Table headers={['Imagen', 'Servicio', 'Precio', 'Duración', 'Categoría', 'Acciones']}>
          {!loading && servicios.map((s) => (
            <TableRow key={s.id || s._id || Math.random()}>
              <TableCell>
                <div className="w-12 h-12 rounded bg-gray-200 overflow-hidden flex items-center justify-center border">
                  <img
                    src={s.imagen?.trim() ? s.imagen : IMG_SERVICIO_PLACEHOLDER}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e: SyntheticEvent<HTMLImageElement>) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = IMG_SERVICIO_PLACEHOLDER;
                    }}
                  />
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-bold text-base" style={{ color: colorTextoBlanco }}>{s.nombre}</span>
                  {s.incluye && s.incluye.length > 0 && (
                    <div className="text-[11px] mt-0.5" style={{ color: colorTextoGrisClaro }}>
                      <span className="font-bold">Productos que incluye:</span> {Array.isArray(s.incluye) ? s.incluye.join(', ') : s.incluye}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="font-bold text-lg" style={{ color: colorTextoDorado }}>${s.precio}</span>
              </TableCell>
              <TableCell>
                <span style={{ color: colorTextoBlanco }}>{s.duracionMinutos || s.duracion} min</span>
              </TableCell>
              <TableCell>
                <Badge variant={getCategoryColor(s.categoria ?? 'General')}>
                  {s.categoria ?? 'General'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => router.push(`/admin/servicios/${s.id || s._id}`)}>Ver</Button>
                  <Button variant="danger" size="sm" onClick={() => { setServicioToDelete(s); setShowDeleteModal(true); }}>Eliminar</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>

      {/* MODAL SERVICIOS */}
      <Modal isOpen={showForm} onClose={() => !saving && setShowForm(false)} title="">
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold" style={{ color: colorGuindaHex }}>Nuevo Servicio</h2>
          <Input label="Nombre del Servicio *" value={formNombre} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormNombre(e.target.value)} fullWidth />
          <Textarea label="Descripción corta" value={formDescripcion} onChange={(e) => setFormDescripcion(e.target.value)} placeholder="Breve descripción del servicio..." rows={2} fullWidth />
          <Textarea label="Descripción larga" value={formDescripcionLarga} onChange={(e) => setFormDescripcionLarga(e.target.value)} placeholder="Descripción detallada del servicio..." rows={3} fullWidth />
          <Input label="URL de la Imagen" value={formImagenUrl} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormImagenUrl(e.target.value)} fullWidth />
          <Input label="Productos que incluye (Separar por comas)" value={formIncluye} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormIncluye(e.target.value)} fullWidth />
          <Input label="Recomendaciones (separar por coma)" value={formRecomendaciones} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormRecomendaciones(e.target.value)} placeholder="Evitar lavar el cabello 48h, No usar productos con sulfatos..." fullWidth />
          <div className="grid grid-cols-2 gap-4 items-end">
            <Input label="Precio ($) *" value={formPrecio} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormPrecio(e.target.value)} />
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1 text-black">Duración *</label>
              <select className="w-full p-2 border rounded-md text-sm bg-white text-black h-[42px]" value={formDuracion} onChange={e => setFormDuracion(e.target.value)}>
                <option value="">Seleccionar...</option>
                {DURACION_OPCIONES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1 text-black">Categoría *</label>
            <select className="w-full p-2 border rounded-md text-sm bg-white text-black h-[42px]" value={formCategoria} onChange={e => setFormCategoria(e.target.value)}>
              <option value="">Elegir categoría...</option>
              {CATEGORIAS_OPCIONES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
            </select>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-black">
              <input type="checkbox" checked={formRequiereEvaluacion} onChange={(e) => setFormRequiereEvaluacion(e.target.checked)} className="rounded" />
              Requiere evaluación previa
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-black">
              <input type="checkbox" checked={formActivo} onChange={(e) => setFormActivo(e.target.checked)} className="rounded" />
              Servicio activo
            </label>
          </div>
          <div className="flex justify-end gap-2 mt-4">
             <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
             <Button onClick={handleCrear} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </div>
      </Modal>

      {/* MODAL PAQUETES */}
      <Modal isOpen={showPaqueteForm} onClose={() => !saving && setShowPaqueteForm(false)} title="">
        <div className="flex flex-col gap-4 p-1">
          <h2 className="text-xl font-bold mb-2" style={{ color: colorGuindaHex }}>Configurar Paquete Especial</h2>
          
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1 text-black">Tipo de Evento *</label>
            <select 
              className="w-full p-2 border rounded-md text-sm bg-white text-black h-[42px]"
              value={formPaqueteTipo}
              onChange={(e) => setFormPaqueteTipo(e.target.value)}
            >
              <option value="">Seleccione...</option>
              <option value="Maquillaje Social">Maquillaje Social</option>
              <option value="Quinceañera">Quinceañera (XV Años)</option>
              <option value="Boda">Paquete Novia / Boda</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1 text-black">¿Qué incluye el paquete? *</label>
            <textarea 
              className="w-full p-2 border rounded-md text-sm bg-white text-black min-h-[80px]"
              placeholder="Ej: Incluye prueba de peinado, maquillaje con aerógrafo..."
              value={formPaqueteDescripcion}
              onChange={(e) => setFormPaqueteDescripcion(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1 text-black">Vincular servicios individuales *</label>
            <p className="text-xs text-gray-600 mb-1">Marca al menos uno; el paquete debe incluir servicios del catálogo.</p>
            <div className="border rounded-md p-2 max-h-32 overflow-y-auto bg-gray-50 flex flex-col gap-1 text-black">
              {servicios.map((s) => (
                <label key={s.id || s._id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded">
                  {(() => {
                    const sid = String(s.id ?? s._id ?? '');
                    return (
                  <input 
                    type="checkbox" 
                    checked={sid.length > 0 && formPaqueteServicios.includes(sid)}
                    onChange={(e) => {
                      if (!sid) return;
                      if (e.target.checked) {
                        setFormPaqueteServicios([...formPaqueteServicios, sid]);
                      } else {
                        setFormPaqueteServicios(formPaqueteServicios.filter((x) => x !== sid));
                      }
                    }}
                  />
                    );
                  })()}
                  {s.nombre}
                </label>
              ))}
            </div>
          </div>

          {/* PREVISUALIZACIÓN VISUAL */}
          {formPaqueteServicios.length > 0 && (
            <div className="p-4 rounded-md shadow-inner" style={{ backgroundColor: colorGuindaHex }}>
              <p className="w-full text-[11px] uppercase font-extrabold text-white mb-3 tracking-wider border-b border-white/20 pb-1">
                Servicios en el paquete:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {servicios
                  .filter((s) => {
                    const sid = String(s.id ?? s._id ?? '');
                    return sid.length > 0 && formPaqueteServicios.includes(sid);
                  })
                  .map(s => (
                    <div key={s.id || s._id} className="flex items-center gap-2 bg-white/10 p-2 rounded border border-white/20">
                      <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-white/5">
                        <img src={s.imagen} className="w-full h-full object-cover" alt="" />
                      </div>
                      <span className="text-[10px] font-bold text-white leading-tight truncate">{s.nombre}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          <Input label="Precio del Paquete ($) *" type="number" value={formPaquetePrecio} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormPaquetePrecio(e.target.value)} fullWidth />
          
          <div className="flex justify-end gap-2 mt-4">
             <Button variant="outline" onClick={() => setShowPaqueteForm(false)}>Cancelar</Button>
             <Button onClick={handleCrearPaquete} disabled={saving}>{saving ? 'Guardando...' : 'Guardar Paquete'}</Button>
          </div>
        </div>
      </Modal>

      {/* MODAL ELIMINAR */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="">
        <div className="p-2 flex flex-col gap-4">
          <h2 className="text-black text-xl font-bold">Confirmar eliminación</h2>
          <p className="text-black">¿Estás seguro de que deseas borrar este servicio?</p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleConfirmarEliminar}>Eliminar definitivamente</Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}