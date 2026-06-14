'use client';

import { useState, useEffect } from 'react';
import { listarCitas, cancelarCita, CitaApi } from '../../../services/citas';
import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

interface CitaFila {
  id: number;
  cliente: string;
  telefono: string;
  fecha: string;
  hora: string;
  servicio: string;
  especialista: string;
  estado: string;
  anticipo: string;
}

function mapearCita(c: CitaApi): CitaFila {
  const fechaHora = c.fechaHoraInicio ? new Date(c.fechaHoraInicio) : null;
  return {
    id: c.id,
    cliente: c.clienteNombre ?? '-',
    telefono: '-',
    fecha: fechaHora ? fechaHora.toLocaleDateString('es-MX') : '-',
    hora: fechaHora ? fechaHora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '-',
    servicio: c.servicioNombre ?? '-',
    especialista: c.especialistaNombre ?? '-',
    estado: c.estado,
    anticipo: '-',
  };
}

export default function GestionCitasPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [citas, setCitas] = useState<CitaFila[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = () => {
    const hoy = new Date().toISOString().slice(0, 10);
    const en7Dias = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    setLoading(true);
    listarCitas({ desde: hoy, hasta: en7Dias })
      .then(({ data }) => setCitas(data.map(mapearCita)))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const handleCancelar = async (id: number) => {
    await cancelarCita(id, { motivoCancelacion: 'Cancelada desde panel admin' });
    cargar();
  };

  const estados = {
    confirmada: 'success',
    pendiente: 'warning',
    cancelada: 'danger',
    completada: 'info',
  } as const;

  return (
    <AdminLayout>
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
                  <Button size="sm" variant="danger" onClick={() => handleCancelar(cita.id)}>
                    Cancelar
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>

      {/* Modal Nueva Cita */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nueva Cita"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setIsModalOpen(false)}>
              Agendar Cita
            </Button>
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

      {/* Modal Editar Cita */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Cita"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setIsEditModalOpen(false)}>
              Guardar Cambios
            </Button>
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
    </AdminLayout>
  );
}
