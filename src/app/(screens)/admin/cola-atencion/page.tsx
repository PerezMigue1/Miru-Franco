'use client';

import { useState, useEffect } from 'react';
import { listarCitas, checkInCita, CitaApi } from '../../../services/citas';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import { Users, UserCheck, Timer } from 'lucide-react';

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

export default function ColaAtencionPage() {
  const [turnos, setTurnos] = useState<TurnoFila[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

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
    setSavingId(id);
    try { await checkInCita(id); cargar(); }
    finally { setSavingId(null); }
  };

  const enEspera = turnos.filter((t) => t.estado === 'esperando').length;
  const enAtencion = turnos.filter((t) => t.estado === 'en_atencion').length;

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div>
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
            Cola de Atención
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
            Registro de llegada (check-in) de clientes sin cita previa — {turnos.length} turno{turnos.length === 1 ? '' : 's'} en lista de espera
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="elevated" padding="lg" style={enEspera > 0 ? { boxShadow: '0 0 0 2px var(--warning)' } : undefined}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Users size={20} style={{ color: 'var(--warning-texto)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>En Espera</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--warning-texto)' }}>{loading ? '…' : enEspera}</p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <UserCheck size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>En Atención</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : enAtencion}</p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Timer size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Tiempo Promedio</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>25 min</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Listado */}
        <Card variant="elevated" padding="lg">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
          Lista de Turnos
        </h2>
        <Table headers={['Posición', 'Cliente', 'Hora de Llegada', 'Servicio', 'Estado', 'Tiempo de Espera', 'Acciones']} headerSutil>
          {turnos.map((turno) => (
            <TableRow key={turno.id}>
              <TableCell rowPadding="lg">
                {turno.posicion > 0 ? (
                  <Badge variant="info">{turno.posicion}</Badge>
                ) : (
                  <Badge variant="success">En Atención</Badge>
                )}
              </TableCell>
              <TableCell className="font-semibold" rowPadding="lg">{turno.cliente}</TableCell>
              <TableCell rowPadding="lg">{turno.llegada}</TableCell>
              <TableCell rowPadding="lg">{turno.servicio}</TableCell>
              <TableCell rowPadding="lg">
                <Badge variant={turno.estado === 'en_atencion' ? 'success' : 'warning'}>
                  {turno.estado === 'en_atencion' ? 'En Atención' : 'Esperando'}
                </Badge>
              </TableCell>
              <TableCell rowPadding="lg">
                {turno.estado === 'esperando' ? '15 min' : '-'}
              </TableCell>
              <TableCell rowPadding="lg">
                <div className="flex gap-2">
                  {turno.estado === 'esperando' && (
                    <Button size="sm" onClick={() => handleCheckIn(turno.id)} disabled={savingId === turno.id}>
                      {savingId === turno.id ? 'Llamando...' : 'Llamar'}
                    </Button>
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

        <Card variant="elevated" padding="lg">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
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
      </div>
    </AdminLayout>
  );
}
