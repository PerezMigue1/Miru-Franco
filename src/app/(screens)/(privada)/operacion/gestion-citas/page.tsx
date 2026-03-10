'use client';

import { useState } from 'react';
import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import PageHeader from '../../../../components/ui/PageHeader';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../../components/ui/Table';
import Badge from '../../../../components/ui/Badge';
import Modal from '../../../../components/ui/Modal';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import { colors } from '../../../../utils/colors';

export default function GestionCitasPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const citas = [
    { id: 1, cliente: 'María González', telefono: '555-1234', fecha: '2024-01-15', hora: '10:00', servicio: 'Corte', especialista: 'Mildred', estado: 'confirmada', anticipo: '$200' },
    { id: 2, cliente: 'Ana López', telefono: '555-5678', fecha: '2024-01-15', hora: '14:00', servicio: 'Alaciado', especialista: 'Auxiliar', estado: 'pendiente', anticipo: '$500' },
    { id: 3, cliente: 'Carmen Ruiz', telefono: '555-9012', fecha: '2024-01-16', hora: '11:00', servicio: 'Nanoplastía', especialista: 'Mildred', estado: 'confirmada', anticipo: '$800' },
  ];

  const estados = {
    confirmada: 'success',
    pendiente: 'warning',
    cancelada: 'danger',
    completada: 'info',
  } as const;

  return (
    <OperacionLayout>
      <PageHeader
        title="Gestión de Citas"
        subtitle="Administra las citas del salón: agendar, confirmar, modificar o cancelar servicios"
        actions={
          <Button onClick={() => setIsModalOpen(true)}>
            + Nueva Cita
          </Button>
        }
      />

      <Card>
        <Table headers={['Cliente', 'Teléfono', 'Fecha', 'Hora', 'Servicio', 'Especialista', 'Estado', 'Anticipo', 'Acciones']}>
          {citas.map((cita) => (
            <TableRow key={cita.id}>
              <TableCell>{cita.cliente}</TableCell>
              <TableCell>{cita.telefono}</TableCell>
              <TableCell>{cita.fecha}</TableCell>
              <TableCell>{cita.hora}</TableCell>
              <TableCell>{cita.servicio}</TableCell>
              <TableCell>{cita.especialista}</TableCell>
              <TableCell>
                <Badge variant={estados[cita.estado as keyof typeof estados] || 'default'}>
                  {cita.estado}
                </Badge>
              </TableCell>
              <TableCell>{cita.anticipo}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setIsEditModalOpen(true)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="danger">
                    Cancelar
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nueva Cita"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => setIsModalOpen(false)}>Agendar Cita</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Nombre del Cliente" placeholder="Ingresa el nombre completo" fullWidth />
          <Input label="Teléfono" placeholder="555-1234-5678" fullWidth />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Fecha" type="date" fullWidth />
            <Input label="Hora" type="time" fullWidth />
          </div>
          <Select
            label="Tipo de Servicio"
            options={[
              { value: 'corte', label: 'Corte' },
              { value: 'alaciado', label: 'Alaciado' },
              { value: 'nanoplastia', label: 'Nanoplastía' },
              { value: 'depilacion', label: 'Depilación' },
            ]}
            fullWidth
          />
          <Select
            label="Especialista"
            options={[
              { value: 'mildred', label: 'Mildred' },
              { value: 'auxiliar', label: 'Auxiliar' },
            ]}
            fullWidth
          />
          <Input label="Anticipo" placeholder="$0.00" type="number" fullWidth />
        </div>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Cita"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => setIsEditModalOpen(false)}>Guardar Cambios</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Nombre del Cliente" defaultValue="María González" fullWidth />
          <Input label="Teléfono" defaultValue="555-1234" fullWidth />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Fecha" type="date" defaultValue="2024-01-15" fullWidth />
            <Input label="Hora" type="time" defaultValue="10:00" fullWidth />
          </div>
          <Select
            label="Tipo de Servicio"
            options={[
              { value: 'corte', label: 'Corte' },
              { value: 'alaciado', label: 'Alaciado' },
              { value: 'nanoplastia', label: 'Nanoplastía' },
            ]}
            defaultValue="corte"
            fullWidth
          />
          <Select
            label="Estado"
            options={[
              { value: 'pendiente', label: 'Pendiente' },
              { value: 'confirmada', label: 'Confirmada' },
              { value: 'completada', label: 'Completada' },
              { value: 'cancelada', label: 'Cancelada' },
            ]}
            defaultValue="confirmada"
            fullWidth
          />
        </div>
      </Modal>
    </OperacionLayout>
  );
}
