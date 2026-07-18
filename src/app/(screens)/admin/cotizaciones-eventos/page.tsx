'use client';

import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Textarea from '../../../components/ui/Textarea';
import Modal from '../../../components/ui/Modal';
import { CalendarCheck2, Clock3, FileText } from 'lucide-react';
import { getPaquetes, camposPaqueteApi } from '../../../services/paquetes';
import {
  listarCotizaciones,
  crearCotizacion,
  actualizarCotizacion,
  CotizacionApi,
  EstadoCotizacion,
} from '../../../services/cotizaciones';
import { etiquetaEstadoCotizacion, varianteEstadoCotizacion } from '../../../utils/estados';

interface PaqueteOpcion {
  id: number;
  tipoEvento: string;
  descripcion: string;
  precioEspecial: number;
}

function fmtFecha(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('es-MX');
}

function fmtMoneda(v: number): string {
  return `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CotizacionesEventosPage() {
  const [cotizaciones, setCotizaciones] = useState<CotizacionApi[]>([]);
  const [paquetes, setPaquetes] = useState<PaqueteOpcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formCliente, setFormCliente] = useState('');
  const [formPaqueteId, setFormPaqueteId] = useState('');
  const [formFecha, setFormFecha] = useState('');
  const [formPersonas, setFormPersonas] = useState('');
  const [formMonto, setFormMonto] = useState('');
  const [formAnticipo, setFormAnticipo] = useState('');
  const [formNotas, setFormNotas] = useState('');

  const cargar = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.allSettled([listarCotizaciones(), getPaquetes()])
      .then(([cotRes, paqRes]) => {
        if (cotRes.status === 'fulfilled') setCotizaciones(cotRes.value.data);
        else setError((prev) => prev ?? 'No se pudieron cargar las cotizaciones');

        if (paqRes.status === 'fulfilled') {
          setPaquetes(
            paqRes.value.map((raw) => {
              const c = camposPaqueteApi(raw);
              return { id: Number(raw.id), tipoEvento: c.tipoEvento, descripcion: c.descripcion, precioEspecial: Number(c.precioEspecial) || 0 };
            })
          );
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const resetForm = () => {
    setFormCliente('');
    setFormPaqueteId('');
    setFormFecha('');
    setFormPersonas('');
    setFormMonto('');
    setFormAnticipo('');
    setFormNotas('');
    setFormError(null);
  };

  const openNueva = () => {
    setEditingId(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEditar = (c: CotizacionApi) => {
    setEditingId(c.id);
    setFormCliente(c.clienteNombre);
    setFormPaqueteId(String(c.paqueteId));
    setFormFecha(c.fechaEvento ? c.fechaEvento.slice(0, 10) : '');
    setFormPersonas(c.cantidadPersonas != null ? String(c.cantidadPersonas) : '');
    setFormMonto(String(c.monto));
    setFormAnticipo(String(c.anticipo));
    setFormNotas(c.notas ?? '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSeleccionarPaquete = (paqueteId: string) => {
    setFormPaqueteId(paqueteId);
    // El precio del paquete solo sugiere el monto — el campo queda editable después.
    if (!editingId) {
      const paquete = paquetes.find((p) => String(p.id) === paqueteId);
      if (paquete) setFormMonto(String(paquete.precioEspecial));
    }
  };

  const handleGuardar = async () => {
    setFormError(null);
    if (!formCliente.trim()) { setFormError('Ingresa el nombre del cliente'); return; }
    if (!formPaqueteId) { setFormError('Selecciona un paquete'); return; }
    if (!formFecha) { setFormError('Ingresa la fecha del evento'); return; }
    const monto = Number(formMonto);
    const anticipo = formAnticipo ? Number(formAnticipo) : 0;
    if (!formMonto || monto < 0) { setFormError('Monto inválido'); return; }
    if (anticipo > monto) { setFormError('El anticipo no puede ser mayor al monto total'); return; }

    setSaving(true);
    try {
      const payload = {
        clienteNombre: formCliente.trim(),
        paqueteId: Number(formPaqueteId),
        fechaEvento: formFecha,
        cantidadPersonas: formPersonas ? Number(formPersonas) : undefined,
        monto,
        anticipo,
        notas: formNotas.trim() || undefined,
      };
      if (editingId !== null) {
        await actualizarCotizacion(editingId, payload);
      } else {
        await crearCotizacion(payload);
      }
      setIsModalOpen(false);
      cargar();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'No se pudo guardar la cotización');
    } finally {
      setSaving(false);
    }
  };

  const handleCambiarEstado = async (c: CotizacionApi, estado: EstadoCotizacion) => {
    try {
      await actualizarCotizacion(c.id, { estado });
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar el estado');
    }
  };

  const confirmadas = cotizaciones.filter((c) => c.estado === 'confirmada').length;
  const pendientes = cotizaciones.filter((c) => c.estado === 'pendiente').length;
  const montoTotal = cotizaciones.reduce((acc, c) => acc + c.monto, 0);

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              Cotizaciones y Eventos
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              {cotizaciones.length} cotización{cotizaciones.length === 1 ? '' : 'es'} registradas
            </p>
          </div>
          <Button onClick={openNueva}>+ Nueva Cotización</Button>
        </div>

        {error && (
          <Card variant="elevated" padding="md" className="border-l-4" style={{ borderLeftColor: 'var(--danger)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--danger-texto)' }}>{error}</p>
          </Card>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <FileText size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Total cotizaciones</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : cotizaciones.length}</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <CalendarCheck2 size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Confirmadas</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : confirmadas}</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Clock3 size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Pendientes</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : pendientes}</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <FileText size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Monto total</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : fmtMoneda(montoTotal)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Paquetes disponibles */}
        {paquetes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {paquetes.slice(0, 3).map((paquete) => (
            <Card key={paquete.id} variant="elevated" padding="lg">
              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                {paquete.tipoEvento}
              </h3>
              <p className="text-2xl font-bold mb-2" style={{ color: 'var(--oro-texto)' }}>
                {fmtMoneda(paquete.precioEspecial)}
              </p>
              <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
                {paquete.descripcion || 'Sin descripción'}
              </p>
              <Button size="sm" fullWidth onClick={() => { openNueva(); handleSeleccionarPaquete(String(paquete.id)); }}>Cotizar</Button>
            </Card>
          ))}
        </div>
        )}

        {/* Listado */}
        <Card variant="elevated" padding="lg">
        {loading ? (
          <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>Cargando cotizaciones…</p>
        ) : cotizaciones.length === 0 ? (
          <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>No hay cotizaciones registradas.</p>
        ) : (
        <Table headers={['Cliente', 'Paquete', 'Fecha', 'Monto Total', 'Anticipo', 'Estado', 'Acciones']} headerSutil>
          {cotizaciones.map((cotizacion) => (
            <TableRow key={cotizacion.id}>
              <TableCell rowPadding="lg">{cotizacion.clienteNombre}</TableCell>
              <TableCell rowPadding="lg">{cotizacion.paqueteTipoEvento ?? '-'}</TableCell>
              <TableCell rowPadding="lg">{fmtFecha(cotizacion.fechaEvento)}</TableCell>
              <TableCell className="font-semibold" rowPadding="lg">{fmtMoneda(cotizacion.monto)}</TableCell>
              <TableCell rowPadding="lg">{fmtMoneda(cotizacion.anticipo)}</TableCell>
              <TableCell rowPadding="lg">
                <Badge variant={varianteEstadoCotizacion(cotizacion.estado)}>
                  {etiquetaEstadoCotizacion(cotizacion.estado)}
                </Badge>
              </TableCell>
              <TableCell rowPadding="lg">
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => openEditar(cotizacion)}>Editar</Button>
                  {cotizacion.estado === 'pendiente' && (
                    <Button size="sm" onClick={() => handleCambiarEstado(cotizacion, 'confirmada')}>Confirmar</Button>
                  )}
                  {cotizacion.estado !== 'cancelada' && (
                    <Button size="sm" variant="danger" onClick={() => handleCambiarEstado(cotizacion, 'cancelada')}>Cancelar</Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
        )}
        </Card>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => { if (!saving) setIsModalOpen(false); }}
        title={editingId !== null ? 'Editar Cotización' : 'Nueva Cotización'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleGuardar} disabled={saving}>{saving ? 'Guardando...' : 'Generar Cotización'}</Button>
          </>
        }
      >
        {formError && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{formError}</p>}
        <div className="space-y-4">
          <Input label="Cliente" value={formCliente} onChange={(e) => setFormCliente(e.target.value)} placeholder="Nombre del cliente" fullWidth />
          <Select
            label="Paquete"
            value={formPaqueteId}
            onChange={(e) => handleSeleccionarPaquete(e.target.value)}
            options={[
              { value: '', label: 'Selecciona un paquete…' },
              ...paquetes.map((p) => ({ value: String(p.id), label: `${p.tipoEvento} — ${fmtMoneda(p.precioEspecial)}` })),
            ]}
            fullWidth
          />
          <Input label="Fecha del Evento" type="date" value={formFecha} onChange={(e) => setFormFecha(e.target.value)} fullWidth />
          <Input label="Cantidad de Personas" type="number" min={1} value={formPersonas} onChange={(e) => setFormPersonas(e.target.value)} fullWidth />
          <Input label="Monto Total" type="number" min={0} step="0.01" value={formMonto} onChange={(e) => setFormMonto(e.target.value)} placeholder="0.00" fullWidth />
          <Input label="Anticipo" type="number" min={0} step="0.01" value={formAnticipo} onChange={(e) => setFormAnticipo(e.target.value)} placeholder="0.00" fullWidth />
          <Textarea label="Notas Adicionales" value={formNotas} onChange={(e) => setFormNotas(e.target.value)} placeholder="Detalles especiales..." rows={3} fullWidth />
        </div>
      </Modal>
    </AdminLayout>
  );
}
