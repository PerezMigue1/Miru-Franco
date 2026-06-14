'use client';

import { useState, useEffect } from 'react';
import { listarCitas, checkInCita, CitaApi } from '../../../services/citas';
import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';

interface TurnoFila {
  id: number;
  cliente: string;
  llegada: string;
  servicio: string;
  estado: string;
  posicion: number;
}

function mapearCita(c: CitaApi, idx: number): TurnoFila {
  const fechaHora = c.fechaHoraInicio ? new Date(c.fechaHoraInicio) : null;
  return {
    id: c.id,
    cliente: c.clienteNombre ?? '-',
    llegada: fechaHora ? fechaHora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '-',
    servicio: c.servicioNombre ?? '-',
    estado: c.estado === 'en_curso' ? 'en_atencion' : 'esperando',
    posicion: c.estado === 'en_curso' ? 0 : idx + 1,
  };
}

export default function AtencionSinCitaPage() {
  const [turnos, setTurnos] = useState<TurnoFila[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = () => {
    const hoy = new Date().toISOString().slice(0, 10);
    setLoading(true);
    listarCitas({ estado: 'pendiente', desde: hoy })
      .then(({ data }) => setTurnos(data.map(mapearCita)))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const handleCheckIn = async (id: number) => {
    await checkInCita(id);
    cargar();
  };

  const enEspera = turnos.filter((t) => t.estado === 'esperando').length;
  const enAtencion = turnos.filter((t) => t.estado === 'en_atencion').length;

  return (
    <AdminLayout>
      <PageHeader
        title="Atención de Clientes sin Cita"
        subtitle="Gestiona clientes que llegan sin cita previa por orden de turno"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>En Espera</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : enEspera}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>En Atención</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : enAtencion}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Tiempo Promedio</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>25 min</p>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
          Lista de Turnos
        </h2>
        <Table headers={['Posición', 'Cliente', 'Hora de Llegada', 'Servicio', 'Estado', 'Tiempo de Espera', 'Acciones']}>
          {turnos.map((turno) => (
            <TableRow key={turno.id}>
              <TableCell>
                {turno.posicion > 0 ? (
                  <Badge variant="info">{turno.posicion}</Badge>
                ) : (
                  <Badge variant="success">En Atención</Badge>
                )}
              </TableCell>
              <TableCell className="font-semibold">{turno.cliente}</TableCell>
              <TableCell>{turno.llegada}</TableCell>
              <TableCell>{turno.servicio}</TableCell>
              <TableCell>
                <Badge variant={turno.estado === 'en_atencion' ? 'success' : 'warning'}>
                  {turno.estado === 'en_atencion' ? 'En Atención' : 'Esperando'}
                </Badge>
              </TableCell>
              <TableCell>
                {turno.estado === 'esperando' ? '15 min' : '-'}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {turno.estado === 'esperando' && (
                    <Button size="sm" onClick={() => handleCheckIn(turno.id)}>Llamar</Button>
                  )}
                  {turno.estado === 'en_atencion' && (
                    <Button size="sm" variant="success">Finalizar</Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>

      <Card className="mt-6">
        <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
          Registrar Nuevo Turno
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Nombre del Cliente" placeholder="Nombre completo" fullWidth />
          <Input label="Teléfono (opcional)" placeholder="555-1234-5678" fullWidth />
          <Input label="Servicio Deseado" placeholder="Tipo de servicio" fullWidth />
          <Input label="Hora de Llegada" type="time" fullWidth />
          <div className="md:col-span-2">
            <Button fullWidth>Agregar a Lista de Espera</Button>
          </div>
        </div>
      </Card>
    </AdminLayout>
  );
}
