'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPaquetes, deletePaquete } from '../../../services/paquetes'; 

import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';

type PaqueteRow = {
  id?: string;
  _id?: string;
  tipo_evento?: string;
  servicios_vinculados?: string[];
  precio_especial?: number | string;
};

export default function PaquetesPage() {
  const router = useRouter();
  const [paquetes, setPaquetes] = useState<PaqueteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Estados para el Modal de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [idParaEliminar, setIdParaEliminar] = useState<string | null>(null);

  const cargarDatos = async () => {
    try {
      setLoadError(null);
      setLoading(true);
      const data = await getPaquetes();
      let list: PaqueteRow[] = [];
      if (Array.isArray(data)) list = data;
      else if (data && typeof data === 'object' && 'data' in data) {
        const inner = (data as { data: unknown }).data;
        if (Array.isArray(inner)) list = inner as PaqueteRow[];
      }
      setPaquetes(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar paquetes';
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const manejarEliminacion = async () => {
    if (!idParaEliminar) return;

    try {
      await deletePaquete(idParaEliminar);
      // Filtramos la lista local para que desaparezca de la tabla de inmediato
      setPaquetes(paquetes.filter(p => (p.id || p._id) !== idParaEliminar));
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
        <button onClick={() => router.push('/')} className="px-3 py-1.5 rounded-full border border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors">🏠 Inicio</button>
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
        actions={<Button variant="outline" onClick={() => router.push('/admin/servicios')}>Volver</Button>}
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
            const currentId = p.id || p._id;
            return (
              <TableRow key={currentId}>
                <TableCell className="font-bold text-white">{p.tipo_evento}</TableCell>
                <TableCell className="text-gray-400 text-xs">
                  {Array.isArray(p.servicios_vinculados) ? p.servicios_vinculados.join(', ') : 'N/A'}
                </TableCell>
                <TableCell className="text-yellow-400 font-bold">${p.precio_especial}</TableCell>
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