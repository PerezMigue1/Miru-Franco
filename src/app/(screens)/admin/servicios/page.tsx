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
import { getServicios, createServicio, deleteServicio } from '../../../services/servicios';
import { createPaquete } from '../../../services/paquetes'; 

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
  const [servicios, setServicios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [servicioToDelete, setServicioToDelete] = useState<any | null>(null);
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
  const [formImagenUrl, setFormImagenUrl] = useState('');
  const [formIncluye, setFormIncluye] = useState('');

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
    } catch (err) {
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
      const payload: any = {
        nombre: formNombre.trim(),
        precio: parseFloat(formPrecio) || 0,
        duracionMinutos: parseInt(formDuracion),
        categoria: formCategoria,
        descripcion: formDescripcion.trim() || formNombre.trim(),
        imagen: formImagenUrl.trim(), 
        incluye: formIncluye.trim() ? formIncluye.split(',').map(i => i.trim()) : [],
        activo: true
      };
      await createServicio(payload);
      setSuccess("¡Servicio guardado correctamente!");
      setShowForm(false);
      resetServicioForm();
      loadServicios();
    } catch (err: any) {
      setError("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const resetServicioForm = () => {
    setFormNombre(''); setFormPrecio(''); setFormDuracion(''); 
    setFormCategoria(''); setFormDescripcion(''); setFormImagenUrl('');
    setFormIncluye('');
  };

  const handleCrearPaquete = async () => {
    if (!formPaqueteTipo || !formPaquetePrecio || !formPaqueteDescripcion) {
      setError("Rellena los campos del paquete");
      return;
    }
    setSaving(true);
    try {
      const nombresSeleccionados = servicios
        .filter(s => formPaqueteServicios.includes(s.id || s._id))
        .map(s => s.nombre);

      const payload = {
        tipo_evento: formPaqueteTipo,
        descripcion: formPaqueteDescripcion,
        servicios_vinculados: nombresSeleccionados,
        precio_especial: parseFloat(formPaquetePrecio)
      };

      await createPaquete(payload);

      setSuccess("¡Paquete guardado correctamente!");
      setShowPaqueteForm(false);
      
      setFormPaqueteTipo(''); setFormPaquetePrecio(''); setFormPaqueteDescripcion(''); setFormPaqueteServicios([]);

      // REDIRECCIÓN TRAS GUARDAR
      router.push('/admin/paquetes'); 

    } catch (err) {
      setError("Error al crear el paquete. Revisa la conexión con el servidor.");
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
    } catch (err: any) {
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
              📋 Ver Paquetes
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
          ✅ {success}
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
                    src={s.imagen || 'https://via.placeholder.com/150?text=No+Image'} 
                    alt="" 
                    className="w-full h-full object-cover" 
                    onError={(e:any) => {
                      e.target.onerror = null; 
                      e.target.src = 'https://via.placeholder.com/150?text=Error';
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
                <Badge variant={getCategoryColor(s.categoria)}>
                  {s.categoria}
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
      <Modal isOpen={showForm} onClose={() => !saving && setShowForm(false)} title={"" as any}>
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold" style={{ color: colorGuindaHex }}>Nuevo Servicio</h2>
          <Input label="Nombre del Servicio *" value={formNombre} onChange={(e:any) => setFormNombre(e.target.value)} fullWidth />
          <Input label="URL de la Imagen" value={formImagenUrl} onChange={(e:any) => setFormImagenUrl(e.target.value)} fullWidth />
          <Input label="Productos que incluye (Separar por comas)" value={formIncluye} onChange={(e:any) => setFormIncluye(e.target.value)} fullWidth />
          <div className="grid grid-cols-2 gap-4 items-end">
            <Input label="Precio ($) *" value={formPrecio} onChange={(e:any) => setFormPrecio(e.target.value)} />
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
          <div className="flex justify-end gap-2 mt-4">
             <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
             <Button onClick={handleCrear} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </div>
      </Modal>

      {/* MODAL PAQUETES */}
      <Modal isOpen={showPaqueteForm} onClose={() => !saving && setShowPaqueteForm(false)} title={"" as any}>
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
            <label className="text-sm font-medium mb-1 text-black">Vincular Servicios Individuales</label>
            <div className="border rounded-md p-2 max-h-32 overflow-y-auto bg-gray-50 flex flex-col gap-1 text-black">
              {servicios.map((s) => (
                <label key={s.id || s._id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded">
                  <input 
                    type="checkbox" 
                    checked={formPaqueteServicios.includes(s.id || s._id)}
                    onChange={(e) => {
                      const id = s.id || s._id;
                      if(e.target.checked) setFormPaqueteServicios([...formPaqueteServicios, id]);
                      else setFormPaqueteServicios(formPaqueteServicios.filter(x => x !== id));
                    }}
                  />
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
                  .filter(s => formPaqueteServicios.includes(s.id || s._id))
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

          <Input label="Precio del Paquete ($) *" type="number" value={formPaquetePrecio} onChange={(e:any) => setFormPaquetePrecio(e.target.value)} fullWidth />
          
          <div className="flex justify-end gap-2 mt-4">
             <Button variant="outline" onClick={() => setShowPaqueteForm(false)}>Cancelar</Button>
             <Button onClick={handleCrearPaquete} disabled={saving}>{saving ? 'Guardando...' : 'Guardar Paquete'}</Button>
          </div>
        </div>
      </Modal>

      {/* MODAL ELIMINAR */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title={"" as any}>
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