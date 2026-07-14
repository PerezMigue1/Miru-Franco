'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPaquetes, createPaquete, deletePaquete } from '../../../services/paquetes';

import AdminLayout from '../../../components/layouts/AdminLayout';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';
import { Gift } from 'lucide-react';

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

  const preciosNumericos = paquetes
    .map((p) => Number(p.precio_especial ?? p.precioEspecial))
    .filter((n) => Number.isFinite(n));
  const precioPromedio = preciosNumericos.length > 0
    ? Math.round(preciosNumericos.reduce((acc, n) => acc + n, 0) / preciosNumericos.length)
    : 0;

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              Paquetes Especiales
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              {paquetes.length} paquete{paquetes.length === 1 ? '' : 's'} en catálogo
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { setCrearError(null); setIsModalCrearOpen(true); }}>+ Nuevo paquete</Button>
            <Button variant="outline" onClick={() => router.push('/admin/servicios')}>Volver</Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Gift size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Total paquetes</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{paquetes.length}</p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Gift size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Precio promedio</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>${precioPromedio.toLocaleString('es-MX')}</p>
              </div>
            </div>
          </Card>
        </div>

        {loadError && (
          <Card className="border-l-4" padding="md" style={{ borderLeftColor: 'var(--warning)' }}>
            <div className="text-sm space-y-2">
              <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>No se pudieron cargar los paquetes</p>
              <p className="whitespace-pre-wrap" style={{ color: 'var(--encabezados-alterno)' }}>{loadError}</p>
              <Button variant="outline" size="sm" onClick={() => cargarDatos()}>
                Reintentar
              </Button>
            </div>
          </Card>
        )}

        {/* Listado */}
        <Card variant="elevated" padding="lg">
        <Table headers={['Evento', 'Servicios', 'Precio', 'Acciones']} headerSutil>
          {!loading && paquetes.map((p) => {
            const currentId = getPaqueteId(p);
            if (!currentId) return null;
            return (
              <TableRow key={currentId}>
                <TableCell className="font-bold" rowPadding="lg">{etiquetaTipoEvento(p)}</TableCell>
                <TableCell className="text-xs" rowPadding="lg" style={{ color: 'var(--encabezados-alterno)' }}>
                  {listaServiciosVinculados(p).length ? listaServiciosVinculados(p).join(', ') : 'N/A'}
                </TableCell>
                <TableCell className="font-bold" rowPadding="lg" style={{ color: 'var(--oro-texto)' }}>${precioMostrar(p)}</TableCell>
                <TableCell rowPadding="lg">
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
        {loading && <p className="p-10 text-center" style={{ color: 'var(--encabezados-alterno)' }}>Cargando paquetes...</p>}
        {!loading && !loadError && paquetes.length === 0 && (
          <p className="p-10 text-center" style={{ color: 'var(--encabezados-alterno)' }}>No hay paquetes registrados.</p>
        )}
        </Card>
      </div>

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
        {crearError && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{crearError}</p>}
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
        <div className="p-4">
          <p className="mb-6 text-lg" style={{ color: 'var(--menu-texto-principal)' }}>¿Estás seguro de que deseas borrar este paquete? Esta acción es permanente.</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
            <Button variant="danger" onClick={manejarEliminacion}>Sí, eliminar ahora</Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}