'use client';

import { useState, useEffect } from 'react';
import { listarCitas, checkOutCita, CitaApi } from '../../../services/citas';
import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Textarea from '../../../components/ui/Textarea';

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

export default function EjecucionServiciosPage() {
  const [servicios, setServicios] = useState<ServicioFila[]>([]);
  const [loading, setLoading] = useState(true);

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
    <AdminLayout>
      <PageHeader
        title="Ejecución de Servicios"
        subtitle="Gestiona los servicios en curso y registra la información detallada de cada trabajo"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Servicios Pendientes</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : pendientes}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>En Proceso</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : enProceso}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Completados Hoy</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>-</p>
          </div>
        </Card>
      </div>

      <Card>
        <Table headers={['Cliente', 'Servicio', 'Especialista', 'Inicio', 'Fin', 'Duración', 'Productos', 'Estado', 'Acciones']}>
          {servicios.map((servicio) => (
            <TableRow key={servicio.id}>
              <TableCell>{servicio.cliente}</TableCell>
              <TableCell>{servicio.servicio}</TableCell>
              <TableCell>{servicio.especialista}</TableCell>
              <TableCell>{servicio.inicio}</TableCell>
              <TableCell>{servicio.fin || '-'}</TableCell>
              <TableCell>
                {servicio.fin ? `${servicio.inicio} - ${servicio.fin}` : 'En curso'}
              </TableCell>
              <TableCell>
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
              <TableCell>
                <Badge variant={estados[servicio.estado as keyof typeof estados]?.variant || 'default'}>
                  {estados[servicio.estado as keyof typeof estados]?.label || servicio.estado}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={servicio.estado === 'en_proceso' ? () => handleCheckOut(servicio.id) : undefined}
                  >
                    {servicio.estado === 'pendiente' ? 'Iniciar' : servicio.estado === 'en_proceso' ? 'Finalizar' : 'Ver Detalles'}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>

      <Card className="mt-6">
        <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
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
    </AdminLayout>
  );
}
