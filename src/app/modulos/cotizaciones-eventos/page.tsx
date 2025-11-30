'use client';

import ModuleLayout from '../../components/layouts/ModuleLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import Modal from '../../components/ui/Modal';
import { useState } from 'react';
import { colors } from '../../utils/colors';

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

  return (
    <ModuleLayout>
      <PageHeader
        title="Cotizaciones y Eventos Especiales"
        subtitle="Gestiona cotizaciones para maquillaje y peinado en eventos especiales"
        actions={
          <Button onClick={() => setIsModalOpen(true)}>+ Nueva Cotización</Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {paquetes.map((paquete) => (
          <Card key={paquete.id}>
            <h3 className="text-subtitle mb-2" style={{ color: colors.textoFondoOscuro }}>
              {paquete.nombre}
            </h3>
            <p className="text-2xl font-bold mb-2" style={{ color: colors.textoFondoOscuro }}>
              {paquete.precio}
            </p>
            <p className="text-sm mb-4" style={{ color: colors.textoFondoOscuro }}>
              {paquete.descripcion}
            </p>
            <Button size="sm" fullWidth>Ver Detalles</Button>
          </Card>
        ))}
      </div>

      <Card>
        <Table headers={['Cliente', 'Evento', 'Fecha', 'Paquete', 'Monto Total', 'Anticipo', 'Estado', 'Acciones']}>
          {cotizaciones.map((cotizacion) => (
            <TableRow key={cotizacion.id}>
              <TableCell>{cotizacion.cliente}</TableCell>
              <TableCell>{cotizacion.evento}</TableCell>
              <TableCell>{cotizacion.fecha}</TableCell>
              <TableCell>{cotizacion.paquete}</TableCell>
              <TableCell className="font-semibold">{cotizacion.monto}</TableCell>
              <TableCell>{cotizacion.anticipo}</TableCell>
              <TableCell>
                <Badge variant={cotizacion.estado === 'confirmada' ? 'success' : 'warning'}>
                  {cotizacion.estado}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Ver</Button>
                  <Button size="sm">Editar</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>

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
    </ModuleLayout>
  );
}

