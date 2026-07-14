'use client';

import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Textarea from '../../../components/ui/Textarea';
import Modal from '../../../components/ui/Modal';
import { useState } from 'react';
import { CalendarCheck2, Clock3, FileText } from 'lucide-react';

export default function CotizacionesEventosPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const paquetes = [
    { id: 1, nombre: 'Maquillaje Social', precio: '$800', descripcion: 'Maquillaje para eventos sociales generales' },
    { id: 2, nombre: 'Quince Años', precio: '$1,200', descripcion: 'Paquete completo para quinceañeras (maquillaje + peinado)' },
    { id: 3, nombre: 'Bodas', precio: '$1,500', descripcion: 'Paquete para novias (maquillaje + peinado)' },
  ];

  const cotizaciones = [
    { id: 1, cliente: 'María González', evento: 'Boda', fecha: '2024-02-14', paquete: 'Bodas', monto: '$1,500', anticipo: '$500', estado: 'confirmada' },
    { id: 2, cliente: 'Ana López', evento: 'Quince Años', fecha: '2024-03-20', paquete: 'Quince Años', monto: '$1,200', anticipo: '$0', estado: 'pendiente' },
  ];

  const confirmadas = cotizaciones.filter((c) => c.estado === 'confirmada').length;
  const pendientes = cotizaciones.filter((c) => c.estado === 'pendiente').length;
  const montoTotal = cotizaciones.reduce((acc, c) => acc + (parseFloat(c.monto.replace(/[^0-9.]/g, '')) || 0), 0);

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
          <Button onClick={() => setIsModalOpen(true)}>+ Nueva Cotización</Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <FileText size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Total cotizaciones</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{cotizaciones.length}</p>
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
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{confirmadas}</p>
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
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{pendientes}</p>
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
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>${montoTotal.toLocaleString('es-MX')}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Paquetes disponibles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {paquetes.map((paquete) => (
            <Card key={paquete.id} variant="elevated" padding="lg">
              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                {paquete.nombre}
              </h3>
              <p className="text-2xl font-bold mb-2" style={{ color: 'var(--oro-texto)' }}>
                {paquete.precio}
              </p>
              <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
                {paquete.descripcion}
              </p>
              <Button size="sm" fullWidth>Ver Detalles</Button>
            </Card>
          ))}
        </div>

        {/* Listado */}
        <Card variant="elevated" padding="lg">
        <Table headers={['Cliente', 'Evento', 'Fecha', 'Paquete', 'Monto Total', 'Anticipo', 'Estado', 'Acciones']} headerSutil>
          {cotizaciones.map((cotizacion) => (
            <TableRow key={cotizacion.id}>
              <TableCell rowPadding="lg">{cotizacion.cliente}</TableCell>
              <TableCell rowPadding="lg">{cotizacion.evento}</TableCell>
              <TableCell rowPadding="lg">{cotizacion.fecha}</TableCell>
              <TableCell rowPadding="lg">{cotizacion.paquete}</TableCell>
              <TableCell className="font-semibold" rowPadding="lg">{cotizacion.monto}</TableCell>
              <TableCell rowPadding="lg">{cotizacion.anticipo}</TableCell>
              <TableCell rowPadding="lg">
                <Badge variant={cotizacion.estado === 'confirmada' ? 'success' : 'warning'}>
                  {cotizacion.estado}
                </Badge>
              </TableCell>
              <TableCell rowPadding="lg">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Ver</Button>
                  <Button size="sm">Editar</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
        </Card>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nueva Cotización"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => setIsModalOpen(false)}>Generar Cotización</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Cliente" placeholder="Nombre del cliente" fullWidth />
          <Select
            label="Tipo de Evento"
            options={[
              { value: 'social', label: 'Maquillaje Social' },
              { value: 'quince', label: 'Quince Años' },
              { value: 'boda', label: 'Boda' },
            ]}
            fullWidth
          />
          <Input label="Fecha del Evento" type="date" fullWidth />
          <Input label="Cantidad de Personas" type="number" fullWidth />
          <Input label="Monto Total" placeholder="$0.00" fullWidth />
          <Input label="Anticipo" placeholder="$0.00" fullWidth />
          <Textarea label="Notas Adicionales" placeholder="Detalles especiales..." rows={3} fullWidth />
        </div>
      </Modal>
    </AdminLayout>
  );
}

