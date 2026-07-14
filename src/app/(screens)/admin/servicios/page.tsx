'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Textarea from '../../../components/ui/Textarea';
import Modal from '../../../components/ui/Modal';
import CatalogoCard from '../../../components/admin/CatalogoCard';
import { CheckCircle2, ClipboardList, LayoutGrid, Package, PowerOff, Tag } from 'lucide-react';
import { getCategoryColor } from '../../../utils/categoryColors';
import { getServiciosAdmin, updateServicio, deleteServicio, type Servicio } from '../../../services/servicios';
import { createPaquete, serializarPaqueteParaApi } from '../../../services/paquetes';
import { mensajeUsuarioDesdeErrorApi } from '../../../utils/apiErrorMessage';
import { IMG_SERVICIO_PLACEHOLDER } from '../../../utils/serviceImagePlaceholder';

export default function ServiciosPage() {
  const router = useRouter();
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [servicioToDelete, setServicioToDelete] = useState<Servicio | null>(null);
  const [saving, setSaving] = useState(false);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [reactivandoId, setReactivandoId] = useState<string | number | null>(null);
  const [busqueda, setBusqueda] = useState('');

  // --- ESTADOS PARA PAQUETES ---
  const [showPaqueteForm, setShowPaqueteForm] = useState(false);
  const [formPaqueteTipo, setFormPaqueteTipo] = useState('');
  const [formPaquetePrecio, setFormPaquetePrecio] = useState('');
  const [formPaqueteDescripcion, setFormPaqueteDescripcion] = useState('');
  const [formPaqueteServicios, setFormPaqueteServicios] = useState<string[]>([]);

  // Siempre trae el catálogo completo (activos + inactivos): los KPIs (Activos/Inactivos)
  // necesitan el total real sin depender del toggle. El toggle solo filtra qué se MUESTRA.
  const loadServicios = async () => {
    setLoading(true);
    try {
      const result = await getServiciosAdmin(true);
      setServicios(result.data || []);
    } catch {
      setError("Error al cargar servicios");
    } finally {
      setLoading(false);
    }
  };

  // Toggle "Mostrar inactivos": desmarcado = solo activos (como hoy); marcado = SOLO inactivos
  // (no mezclados). `servicios` ya trae ambos siempre; aquí se filtra para la tabla.
  const serviciosVisibles = (mostrarInactivos
    ? servicios.filter((s) => s.activo === false)
    : servicios.filter((s) => s.activo !== false)
  ).filter((s) => !busqueda.trim() || s.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()));

  useEffect(() => { loadServicios(); }, []);

  const handleReactivar = async (servicio: Servicio) => {
    const id = servicio.id || servicio._id;
    if (!id) return;
    setReactivandoId(id);
    setError(null);
    try {
      await updateServicio(id, { nombre: servicio.nombre, activo: true });
      setSuccess('Servicio reactivado correctamente');
      await loadServicios();
    } catch {
      setError('Error al reactivar el servicio');
    } finally {
      setReactivandoId(null);
    }
  };

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

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

  const totalServicios = servicios.length;
  const activos = servicios.filter((s) => s.activo !== false).length;
  const inactivos = servicios.filter((s) => s.activo === false).length;
  const categoriasUnicas = new Set(servicios.map((s) => s.categoria).filter(Boolean)).size;

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              Servicios
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              {totalServicios} servicio{totalServicios === 1 ? '' : 's'} en catálogo
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/admin/paquetes')}
              style={{ backgroundColor: 'transparent', color: 'var(--texto-enlace-sobre-calido)', border: '2px solid transparent' }}
            >
              <span className="inline-flex items-center gap-1.5"><ClipboardList size={16} aria-hidden /> Ver Paquetes</span>
            </Button>
            <Button variant="outline" onClick={() => setShowPaqueteForm(true)}>
              + Crear Paquete
            </Button>
            <Button onClick={() => router.push('/admin/servicios/nuevo')}>
              + Nuevo Servicio
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Package size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Total servicios</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{totalServicios}</p>
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
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{activos}</p>
              </div>
            </div>
          </Card>

          <Card
            variant="elevated"
            padding="lg"
            style={inactivos > 0 ? { boxShadow: '0 0 0 1.5px var(--warning), 0 4px 12px rgba(0,0,0,0.15)' } : undefined}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: inactivos > 0 ? 'rgba(217, 142, 4, 0.2)' : 'var(--fondos-suaves)' }}
              >
                <PowerOff size={20} style={{ color: inactivos > 0 ? 'var(--warning)' : 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Inactivos</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: inactivos > 0 ? 'var(--warning-texto)' : 'var(--menu-texto-principal)' }}>{inactivos}</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Tag size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Categorías</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{categoriasUnicas}</p>
              </div>
            </div>
          </Card>
        </div>

        {success && (
          <div className="bg-green-600 border border-green-700 text-white px-4 py-3 rounded text-xs font-bold shadow-md">
            <CheckCircle2 size={14} className="inline-block mr-1" /> {success}
          </div>
        )}

        {error && (
          <div className="bg-red-600 border border-red-700 text-white px-4 py-3 rounded text-xs font-bold shadow-md">
            {error}
          </div>
        )}

        {/* Catálogo */}
        <Card variant="elevated" padding="lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <LayoutGrid size={18} style={{ color: 'var(--hover)' }} />
              <h2 className="text-lg font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>Catálogo</h2>
              <span className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                {serviciosVisibles.length} servicio{serviciosVisibles.length === 1 ? '' : 's'} mostrados
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Input
                placeholder="Buscar por nombre..."
                className="w-full sm:w-56"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <label className="flex items-center gap-2 cursor-pointer text-sm px-2" style={{ color: 'var(--menu-texto-principal)' }}>
                <input
                  type="checkbox"
                  checked={mostrarInactivos}
                  onChange={(e) => setMostrarInactivos(e.target.checked)}
                  className="rounded"
                />
                Mostrar solo inactivos
              </label>
            </div>
          </div>

          {loading ? (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>Cargando servicios…</p>
          ) : serviciosVisibles.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>
              {mostrarInactivos ? 'No hay servicios inactivos.' : 'No hay servicios que coincidan con la búsqueda.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {serviciosVisibles.map((s) => {
                const id = s.id || s._id;
                return (
                  <CatalogoCard
                    key={id || Math.random()}
                    imagenUrl={s.imagen}
                    imagenFallback={IMG_SERVICIO_PLACEHOLDER}
                    titulo={s.nombre}
                    estadoBadge={
                      s.activo === false ? (
                        <Badge variant="danger" size="sm">Inactivo</Badge>
                      ) : (
                        <Badge variant="success" size="sm">Activo</Badge>
                      )
                    }
                    acciones={
                      <>
                        <Button variant="outline" size="sm" onClick={() => router.push(`/admin/servicios/${id}`)}>Editar</Button>
                        {s.activo === false ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleReactivar(s)}
                            disabled={reactivandoId === id}
                          >
                            {reactivandoId === id ? 'Reactivando...' : 'Reactivar'}
                          </Button>
                        ) : (
                          <Button variant="danger" size="sm" onClick={() => { setServicioToDelete(s); setShowDeleteModal(true); }}>Eliminar</Button>
                        )}
                      </>
                    }
                  >
                    <Badge variant={getCategoryColor(s.categoria ?? 'General')} size="sm">
                      {s.categoria ?? 'General'}
                    </Badge>
                    <div className="flex items-center justify-between text-sm mt-auto pt-1">
                      <span className="font-bold text-lg" style={{ color: 'var(--oro-texto)' }}>${s.precio}</span>
                      <span style={{ color: 'var(--encabezados-alterno)' }}>{s.duracionMinutos || s.duracion} min</span>
                    </div>
                  </CatalogoCard>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* MODAL PAQUETES */}
      <Modal isOpen={showPaqueteForm} onClose={() => !saving && setShowPaqueteForm(false)} title="Configurar Paquete Especial">
        <div className="flex flex-col gap-4">
          <Select
            label="Tipo de Evento *"
            value={formPaqueteTipo}
            onChange={(e) => setFormPaqueteTipo(e.target.value)}
            options={[
              { value: '', label: 'Seleccione...' },
              { value: 'Maquillaje Social', label: 'Maquillaje Social' },
              { value: 'Quinceañera', label: 'Quinceañera (XV Años)' },
              { value: 'Boda', label: 'Paquete Novia / Boda' },
            ]}
            fullWidth
          />

          <Textarea
            label="¿Qué incluye el paquete? *"
            placeholder="Ej: Incluye prueba de peinado, maquillaje con aerógrafo..."
            value={formPaqueteDescripcion}
            onChange={(e) => setFormPaqueteDescripcion(e.target.value)}
            rows={3}
            fullWidth
          />

          <div className="flex flex-col">
            <label className="block mb-2 font-medium" style={{ color: 'var(--menu-texto-principal)' }}>Vincular servicios individuales *</label>
            <p className="text-xs mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Marca al menos uno; el paquete debe incluir servicios del catálogo.</p>
            <div
              className="rounded-md p-2 max-h-32 overflow-y-auto flex flex-col gap-1"
              style={{ border: '1px solid var(--fondos-suaves)', backgroundColor: 'var(--fondo-general)' }}
            >
              {servicios.map((s) => {
                const sid = String(s.id ?? s._id ?? '');
                return (
                  <label key={s.id || s._id} className="flex items-center gap-2 text-sm cursor-pointer p-1 rounded" style={{ color: 'var(--menu-texto-principal)' }}>
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
                      className="rounded"
                    />
                    {s.nombre}
                  </label>
                );
              })}
            </div>
          </div>

          {/* PREVISUALIZACIÓN VISUAL */}
          {formPaqueteServicios.length > 0 && (
            <div className="p-4 rounded-md" style={{ backgroundColor: 'var(--header-footer)' }}>
              <p
                className="w-full text-[11px] uppercase font-extrabold mb-3 tracking-wider border-b pb-1"
                style={{ color: 'var(--texto-fondo-oscuro)', borderColor: 'var(--texto-fondo-oscuro-10)' }}
              >
                Servicios en el paquete:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {servicios
                  .filter((s) => {
                    const sid = String(s.id ?? s._id ?? '');
                    return sid.length > 0 && formPaqueteServicios.includes(sid);
                  })
                  .map(s => (
                    <div key={s.id || s._id} className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: 'var(--texto-fondo-oscuro-10)', border: '1px solid var(--texto-fondo-oscuro-10)' }}>
                      <div className="w-8 h-8 rounded overflow-hidden shrink-0" style={{ backgroundColor: 'var(--texto-fondo-oscuro-10)' }}>
                        <img src={s.imagen} className="w-full h-full object-cover" alt="" />
                      </div>
                      <span className="text-[10px] font-bold leading-tight truncate" style={{ color: 'var(--texto-fondo-oscuro)' }}>{s.nombre}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          <Input label="Precio del Paquete ($) *" type="number" value={formPaquetePrecio} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormPaquetePrecio(e.target.value)} fullWidth />

          <div className="flex justify-end gap-2 mt-2">
             <Button variant="outline" onClick={() => setShowPaqueteForm(false)}>Cancelar</Button>
             <Button onClick={handleCrearPaquete} disabled={saving}>{saving ? 'Guardando...' : 'Guardar Paquete'}</Button>
          </div>
        </div>
      </Modal>

      {/* MODAL ELIMINAR */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Confirmar eliminación">
        <div className="flex flex-col gap-4">
          <p style={{ color: 'var(--menu-texto-principal)' }}>¿Estás seguro de que deseas borrar este servicio?</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleConfirmarEliminar}>Eliminar definitivamente</Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
