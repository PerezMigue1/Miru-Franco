'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPaquetes, createPaquete, deletePaquete } from '../../../services/paquetes';

import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';
import { House } from 'lucide-react';

type PaqueteRow = {
  id?: string | number;
  _id?: string;
  tipo_evento?: string;
  tipoEvento?: string;
  servicios_vinculados?: string[];
  serviciosVinculados?: string[];
  precio_especial?: number | string;
  precioEspecial?: number | string;
};

function etiquetaTipoEvento(p: PaqueteRow): string {
  return String(p.tipo_evento ?? p.tipoEvento ?? '');
}

function listaServiciosVinculados(p: PaqueteRow): string[] {
  const a = p.servicios_vinculados ?? p.serviciosVinculados;
  return Array.isArray(a) ? a.map((x) => String(x)) : [];
}

function precioMostrar(p: PaqueteRow): string | number {
  const v = p.precio_especial ?? p.precioEspecial;
  return v ?? '—';
}

const getPaqueteId = (p: PaqueteRow): string | null => {
  const raw = p.id ?? p._id;
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  return s.length > 0 ? s : null;
};

export default function PaquetesPage() {
  const router = useRouter();
  const [paquetes, setPaquetes] = useState<PaqueteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Estados para el Modal de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [idParaEliminar, setIdParaEliminar] = useState<string | null>(null);

  // Estados para el Modal de creación
  const [isModalCrearOpen, setIsModalCrearOpen] = useState(false);
  const [formTipoEvento, setFormTipoEvento] = useState('');
  const [formPrecioEspecial, setFormPrecioEspecial] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formServiciosVinculados, setFormServiciosVinculados] = useState('');
  const [savingCrear, setSavingCrear] = useState(false);
  const [crearError, setCrearError] = useState<string | null>(null);

  const cargarDatos = async () => {
    try {
      setLoadError(null);
      setLoading(true);
      const list = await getPaquetes();
      setPaquetes(list as PaqueteRow[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar paquetes';
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const handleCrearPaquete = async () => {
    if (!formTipoEvento.trim() || !formPrecioEspecial) {
      setCrearError('Tipo de evento y precio son requeridos');
      return;
    }
    setSavingCrear(true);
    setCrearError(null);
    try {
      const serviciosArr = formServiciosVinculados.trim()
        ? formServiciosVinculados.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      await createPaquete({
        tipoEvento: formTipoEvento.trim(),
        precioEspecial: Number(formPrecioEspecial),
        descripcion: formDescripcion.trim() || undefined,
        serviciosVinculados: serviciosArr,
      });
      setIsModalCrearOpen(false);
      setFormTipoEvento('');
      setFormPrecioEspecial('');
      setFormDescripcion('');
      setFormServiciosVinculados('');
      await cargarDatos();
    } catch (e) {
      setCrearError(e instanceof Error ? e.message : 'Error al crear paquete');
    } finally {
      setSavingCrear(false);
    }
  };

  const manejarEliminacion = async () => {
    if (!idParaEliminar) return;

    try {
      await deletePaquete(idParaEliminar);
      // Filtramos la lista local para que desaparezca de la tabla de inmediato
      setPaquetes(paquetes.filter((p) => getPaqueteId(p) !== idParaEliminar));
      setShowDeleteModal(false);
      setIdParaEliminar(null);
      alert("Paquete eliminado correctamente");
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      alert(`No se pudo eliminar: ${message}`);
    }
  };

  return (
    <AdminLayout>
      {/* Breadcrumbs de navegación */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <button onClick={() => router.push('/')} className="px-3 py-1.5 rounded-full border border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors"><House size={14} className="inline-block mr-1" />Inicio</button>
        <span className="text-gray-600">›</span>
        <button onClick={() => router.push('/admin')} className="px-3 py-1.5 rounded-full border border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors">Panel</button>
        <span className="text-gray-600">›</span>
        <button onClick={() => router.push('/admin/servicios')} className="px-3 py-1.5 rounded-full border border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors">Servicios</button>
        <span className="text-gray-600">›</span>
        <span className="px-4 py-1.5 rounded-full bg-[#4a0404] text-white font-bold border border-[#4a0404]">Paquetes</span>
      </div>

      <PageHeader 
        title="Paquetes Especiales" 
        subtitle="Administra los combos de belleza"
        actions={
          <div className="flex gap-2">
            <Button onClick={() => { setCrearError(null); setIsModalCrearOpen(true); }}>+ Nuevo paquete</Button>
            <Button variant="outline" onClick={() => router.push('/admin/servicios')}>Volver</Button>
          </div>
        }
      />

      {loadError && (
        <Card className="mb-4 border-amber-700/50 bg-amber-950/30">
          <div className="p-4 text-amber-100 text-sm space-y-2">
            <p className="font-semibold text-amber-50">No se pudieron cargar los paquetes</p>
            <p className="text-amber-200/90 whitespace-pre-wrap">{loadError}</p>
            <Button variant="outline" size="sm" onClick={() => cargarDatos()}>
              Reintentar
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <Table headers={['Evento', 'Servicios', 'Precio', 'Acciones']}>
          {!loading && paquetes.map((p) => {
            const currentId = getPaqueteId(p);
            if (!currentId) return null;
            return (
              <TableRow key={currentId}>
                <TableCell className="font-bold text-white">{etiquetaTipoEvento(p)}</TableCell>
                <TableCell className="text-gray-400 text-xs">
                  {listaServiciosVinculados(p).length ? listaServiciosVinculados(p).join(', ') : 'N/A'}
                </TableCell>
                <TableCell className="text-yellow-400 font-bold">${precioMostrar(p)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => router.push(`/admin/paquetes/${currentId}`)}>Ver</Button>
                    <Button 
                      variant="danger" 
                      size="sm" 
                      onClick={() => {
                        setIdParaEliminar(currentId);
                        setShowDeleteModal(true);
                      }}
                    >
                      Eliminar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </Table>
        {loading && <div className="p-10 text-center">Cargando paquetes...</div>}
        {!loading && !loadError && paquetes.length === 0 && (
          <div className="p-10 text-center text-gray-500">No hay paquetes registrados.</div>
        )}
      </Card>

      {/* Modal: Nuevo Paquete */}
      <Modal
        isOpen={isModalCrearOpen}
        onClose={() => { if (!savingCrear) { setIsModalCrearOpen(false); setCrearError(null); } }}
        title="Nuevo Paquete"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setIsModalCrearOpen(false); setCrearError(null); }} disabled={savingCrear}>Cancelar</Button>
            <Button onClick={handleCrearPaquete} disabled={savingCrear}>{savingCrear ? 'Guardando...' : 'Crear'}</Button>
          </>
        }
      >
        {crearError && <p className="text-sm mb-3" style={{ color: 'var(--danger)' }}>{crearError}</p>}
        <div className="space-y-4">
          <Input label="Tipo de evento *" value={formTipoEvento} onChange={(e) => setFormTipoEvento(e.target.value)} placeholder="Ej. Quinceañera, Boda..." fullWidth />
          <Input label="Precio especial *" type="number" min={0} value={formPrecioEspecial} onChange={(e) => setFormPrecioEspecial(e.target.value)} placeholder="0.00" fullWidth />
          <Input label="Servicios vinculados (separados por coma)" value={formServiciosVinculados} onChange={(e) => setFormServiciosVinculados(e.target.value)} placeholder="Corte, Tinte, Peinado..." fullWidth />
          <Textarea label="Descripción" value={formDescripcion} onChange={(e) => setFormDescripcion(e.target.value)} placeholder="Descripción del paquete..." rows={3} fullWidth />
        </div>
      </Modal>

      {/* Modal de Confirmación */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirmar eliminación"
      >
        <div className="p-4 text-black">
          <p className="mb-6 text-lg">¿Estás seguro de que deseas borrar este paquete? Esta acción es permanente.</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
            <Button variant="danger" onClick={manejarEliminacion}>Sí, eliminar ahora</Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}