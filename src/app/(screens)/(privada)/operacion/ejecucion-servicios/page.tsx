'use client';

import { useState, useEffect } from 'react';
import { listarCitas, checkOutCita, registrarMateriales, CitaApi } from '../../../../services/citas';
import { getProductosSinRedirigir } from '../../../../services/productos';
import Modal from '../../../../components/ui/Modal';
import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../../components/ui/Table';
import Badge from '../../../../components/ui/Badge';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Textarea from '../../../../components/ui/Textarea';
import { Wrench, Clock3, CheckCircle2 } from 'lucide-react';

interface ServicioFila {
  id: number;
  cliente: string;
  servicio: string;
  especialista: string;
  inicio: string;
  fin: string;
  estado: string;
  productos: string[];
}

function mapearCita(c: CitaApi): ServicioFila {
  const inicio = c.fechaHoraInicio ? new Date(c.fechaHoraInicio).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '-';
  const fin = c.fechaHoraFin ? new Date(c.fechaHoraFin).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '';
  const estadoMap: Record<string, string> = {
    pendiente: 'pendiente',
    confirmada: 'pendiente',
    en_curso: 'en_proceso',
    completada: 'completado',
  };
  return {
    id: c.id,
    cliente: c.clienteNombre ?? '-',
    servicio: c.servicioNombre ?? '-',
    especialista: c.especialistaNombre ?? '-',
    inicio,
    fin,
    estado: estadoMap[c.estado] ?? c.estado,
    productos: [],
  };
}

interface PresentacionOpcion {
  id: number;
  label: string;
}

export default function EjecucionServiciosPage() {
  const [servicios, setServicios] = useState<ServicioFila[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal materiales
  const [isModalMaterialesOpen, setIsModalMaterialesOpen] = useState(false);
  const [citaIdMateriales, setCitaIdMateriales] = useState<number | null>(null);
  const [presentaciones, setPresentaciones] = useState<PresentacionOpcion[]>([]);
  const [formPresentacionId, setFormPresentacionId] = useState('');
  const [formCantidad, setFormCantidad] = useState('');
  const [formMotivoMat, setFormMotivoMat] = useState('');
  const [savingMat, setSavingMat] = useState(false);
  const [matError, setMatError] = useState<string | null>(null);

  const openMateriales = async (citaId: number) => {
    setCitaIdMateriales(citaId);
    setFormPresentacionId(''); setFormCantidad(''); setFormMotivoMat(''); setMatError(null);
    try {
      const { data: productos } = await getProductosSinRedirigir();
      const opts: PresentacionOpcion[] = [];
      productos.forEach((p) => (p.presentaciones ?? []).forEach((pr) => {
        const id = Number(pr.id);
        if (!isNaN(id)) opts.push({ id, label: `${p.nombre} — ${pr.tamaño ?? pr.id}` });
      }));
      setPresentaciones(opts);
    } catch { setPresentaciones([]); }
    setIsModalMaterialesOpen(true);
  };

  const handleRegistrarMateriales = async () => {
    if (!citaIdMateriales || !formPresentacionId || !formCantidad) {
      setMatError('Presentación y cantidad son requeridos'); return;
    }
    setSavingMat(true); setMatError(null);
    try {
      await registrarMateriales(citaIdMateriales, { presentacionId: Number(formPresentacionId), cantidad: Number(formCantidad), motivo: formMotivoMat.trim() || undefined });
      setIsModalMaterialesOpen(false); setCitaIdMateriales(null);
    } catch (e) { setMatError(e instanceof Error ? e.message : 'Error al registrar materiales'); }
    finally { setSavingMat(false); }
  };

  const cargar = () => {
    setLoading(true);
    listarCitas({ estado: 'en_curso' })
      .then(({ data }) => setServicios(data.map(mapearCita)))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const handleCheckOut = async (id: number) => {
    await checkOutCita(id);
    cargar();
  };

  const estados = {
    pendiente: { label: 'Pendiente', variant: 'warning' as const },
    en_proceso: { label: 'En Proceso', variant: 'info' as const },
    completado: { label: 'Completado', variant: 'success' as const },
  };

  const pendientes = servicios.filter((s) => s.estado === 'pendiente').length;
  const enProceso = servicios.filter((s) => s.estado === 'en_proceso').length;

  return (
    <OperacionLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div>
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
            Ejecución de Servicios
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
            {servicios.length} servicio{servicios.length === 1 ? '' : 's'} en curso
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="elevated" padding="lg" style={pendientes > 0 ? { boxShadow: '0 0 0 2px var(--warning)' } : undefined}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Clock3 size={20} style={{ color: 'var(--warning-texto)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Servicios Pendientes</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--warning-texto)' }}>{loading ? '…' : pendientes}</p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Wrench size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>En Proceso</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : enProceso}</p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <CheckCircle2 size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Completados Hoy</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>-</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Listado */}
        <Card variant="elevated" padding="lg">
        <Table headers={['Cliente', 'Servicio', 'Especialista', 'Inicio', 'Fin', 'Duración', 'Productos', 'Estado', 'Acciones']} headerSutil>
          {servicios.map((servicio) => (
            <TableRow key={servicio.id}>
              <TableCell rowPadding="lg">{servicio.cliente}</TableCell>
              <TableCell rowPadding="lg">{servicio.servicio}</TableCell>
              <TableCell rowPadding="lg">{servicio.especialista}</TableCell>
              <TableCell rowPadding="lg">{servicio.inicio}</TableCell>
              <TableCell rowPadding="lg">{servicio.fin || '-'}</TableCell>
              <TableCell rowPadding="lg">
                {servicio.fin ? `${servicio.inicio} - ${servicio.fin}` : 'En curso'}
              </TableCell>
              <TableCell rowPadding="lg">
                {servicio.productos.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {servicio.productos.map((p, i) => (
                      <Badge key={i} variant="default" size="sm">{p}</Badge>
                    ))}
                  </div>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell rowPadding="lg">
                <Badge variant={estados[servicio.estado as keyof typeof estados]?.variant || 'default'}>
                  {estados[servicio.estado as keyof typeof estados]?.label || servicio.estado}
                </Badge>
              </TableCell>
              <TableCell rowPadding="lg">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={servicio.estado === 'en_proceso' ? () => handleCheckOut(servicio.id) : undefined}
                  >
                    {servicio.estado === 'pendiente' ? 'Iniciar' : servicio.estado === 'en_proceso' ? 'Finalizar' : 'Ver Detalles'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openMateriales(servicio.id)}>
                    + Materiales
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
        </Card>

        <Card variant="elevated" padding="lg">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
          Registrar Nuevo Servicio
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Cliente" placeholder="Buscar cliente..." fullWidth />
          <Select
            label="Tipo de Servicio"
            options={[
              { value: 'corte', label: 'Corte' },
              { value: 'alaciado', label: 'Alaciado' },
              { value: 'nanoplastia', label: 'Nanoplastía' },
            ]}
            fullWidth
          />
          <Input label="Productos Utilizados" placeholder="Separar por comas" fullWidth />
          <Input label="Tiempo Empleado (minutos)" type="number" fullWidth />
          <div className="md:col-span-2">
            <Textarea label="Observaciones" placeholder="Notas sobre el servicio..." rows={4} fullWidth />
          </div>
          <div className="md:col-span-2">
            <Button>Registrar Servicio</Button>
          </div>
        </div>
        </Card>
      </div>

      {/* Modal: Registrar Materiales */}
      <Modal
        isOpen={isModalMaterialesOpen}
        onClose={() => { if (!savingMat) { setIsModalMaterialesOpen(false); setCitaIdMateriales(null); } }}
        title="Registrar Materiales"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setIsModalMaterialesOpen(false); setCitaIdMateriales(null); }} disabled={savingMat}>Cancelar</Button>
            <Button onClick={handleRegistrarMateriales} disabled={savingMat}>{savingMat ? 'Guardando...' : 'Registrar'}</Button>
          </>
        }
      >
        {matError && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{matError}</p>}
        <div className="space-y-4">
          <Select
            label="Presentación / Producto *"
            value={formPresentacionId}
            onChange={(e) => setFormPresentacionId(e.target.value)}
            options={[{ value: '', label: 'Seleccionar presentación...' }, ...presentaciones.map((p) => ({ value: String(p.id), label: p.label }))]}
            fullWidth
          />
          <Input label="Cantidad *" type="number" min={1} value={formCantidad} onChange={(e) => setFormCantidad(e.target.value)} placeholder="1" fullWidth />
          <Textarea label="Motivo (opcional)" value={formMotivoMat} onChange={(e) => setFormMotivoMat(e.target.value)} placeholder="Ej. Aplicación en servicio de tinte..." rows={3} fullWidth />
        </div>
      </Modal>
    </OperacionLayout>
  );
}
