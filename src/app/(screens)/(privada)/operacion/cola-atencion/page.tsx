'use client';

import { useState, useEffect, useMemo } from 'react';
import { listarCitas, checkInCita, checkOutCita, CitaApi } from '../../../../services/citas';
import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../../components/ui/Table';
import Badge from '../../../../components/ui/Badge';
import Input from '../../../../components/ui/Input';
import { Users, UserCheck, Timer } from 'lucide-react';

interface TurnoFila {
  id: number;
  cliente: string;
  llegada: string;
  fechaHoraInicio: string;
  horaCheckIn: string | null;
  servicio: string;
  estado: string;
  posicion: number;
}

function mapearCita(c: CitaApi, posicionEnEspera: number): TurnoFila {
  const fechaHora = c.fechaHoraInicio ? new Date(c.fechaHoraInicio) : null;
  return {
    id: c.id,
    cliente: c.clienteNombre ?? '-',
    llegada: fechaHora && !isNaN(fechaHora.getTime()) ? fechaHora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '-',
    fechaHoraInicio: c.fechaHoraInicio,
    horaCheckIn: c.horaCheckIn ?? null,
    servicio: c.servicioNombre ?? '-',
    estado: c.estado === 'en_curso' ? 'en_atencion' : 'esperando',
    posicion: c.estado === 'en_curso' ? 0 : posicionEnEspera,
  };
}

/**
 * Rango [inicio, fin] del día de hoy en hora local, como datetimes ISO completos.
 * El backend interpreta 'YYYY-MM-DD' como medianoche UTC, así que desde=hasta='YYYY-MM-DD'
 * produce una ventana de ancho cero que excluye casi todas las citas reales del día — por eso
 * se envían límites de día completo (00:00:00.000 a 23:59:59.999 locales) ya convertidos a ISO.
 */
function rangoHoyISO(): { desde: string; hasta: string } {
  const d = new Date();
  const inicio = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const fin = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return { desde: inicio.toISOString(), hasta: fin.toISOString() };
}

/** Diferencia en minutos entre dos datetimes ISO completos (con hora), nunca fechas de solo-día. */
function diffMinutos(desdeISO: string, hastaISO: string | Date): number | null {
  const desde = new Date(desdeISO);
  const hasta = typeof hastaISO === 'string' ? new Date(hastaISO) : hastaISO;
  if (isNaN(desde.getTime()) || isNaN(hasta.getTime())) return null;
  return Math.max(0, Math.round((hasta.getTime() - desde.getTime()) / 60000));
}

function fmtMinutos(min: number | null): string {
  return min === null ? '—' : `${min} min`;
}

/** Espera de un turno: si ya fue atendido, tiempo final (horaCheckIn - llegada); si sigue esperando, tiempo transcurrido en vivo. */
function tiempoEsperaTurno(turno: TurnoFila, ahora: Date): number | null {
  if (!turno.fechaHoraInicio) return null;
  if (turno.horaCheckIn) return diffMinutos(turno.fechaHoraInicio, turno.horaCheckIn);
  return diffMinutos(turno.fechaHoraInicio, ahora);
}

const ESTADOS_TURNO = ['pendiente', 'confirmada', 'en_curso'];

export default function ColaAtencionPage() {
  const [citasHoy, setCitasHoy] = useState<CitaApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ahora, setAhora] = useState(() => new Date());

  const cargar = () => {
    const { desde, hasta } = rangoHoyISO();
    setLoading(true);
    // Una sola consulta con todas las citas de hoy: sirve tanto para la lista de turnos
    // (pendiente/confirmada/en_curso) como para el promedio real de espera.
    listarCitas({ desde, hasta, limit: 200 })
      .then(({ data }) => setCitasHoy(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  // Refresca el tiempo transcurrido en vivo de los turnos que aún esperan.
  useEffect(() => {
    const interval = setInterval(() => setAhora(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const turnos = useMemo(() => {
    const relevantes = citasHoy.filter((c) => ESTADOS_TURNO.includes(c.estado));
    const ordenados = [...relevantes].sort((a, b) => a.fechaHoraInicio.localeCompare(b.fechaHoraInicio));
    let posicion = 0;
    return ordenados.map((c) => {
      if (c.estado !== 'en_curso') posicion += 1;
      return mapearCita(c, posicion);
    });
  }, [citasHoy]);

  const handleCheckIn = async (id: number) => {
    setSavingId(id);
    setError(null);
    try { await checkInCita(id); cargar(); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo registrar el check-in'); }
    finally { setSavingId(null); }
  };

  const handleCheckOut = async (id: number) => {
    setSavingId(id);
    setError(null);
    try { await checkOutCita(id); cargar(); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo finalizar el turno'); }
    finally { setSavingId(null); }
  };

  const enEspera = turnos.filter((t) => t.estado === 'esperando').length;
  const enAtencion = turnos.filter((t) => t.estado === 'en_atencion').length;

  const tiempoPromedioMin = useMemo(() => {
    const esperas = citasHoy
      .filter((c) => c.horaCheckIn)
      .map((c) => diffMinutos(c.fechaHoraInicio, c.horaCheckIn as string))
      .filter((m): m is number => m !== null);
    if (esperas.length === 0) return null;
    return Math.round(esperas.reduce((a, b) => a + b, 0) / esperas.length);
  }, [citasHoy]);

  return (
    <OperacionLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div>
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
            Cola de Atención
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
            Registro de llegada (check-in) de clientes sin cita previa — {enEspera} turno{enEspera === 1 ? '' : 's'} en lista de espera
          </p>
        </div>

        {error && (
          <Card variant="elevated" padding="md" className="border-l-4" style={{ borderLeftColor: 'var(--danger)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--danger-texto)' }}>{error}</p>
          </Card>
        )}

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
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : fmtMinutos(tiempoPromedioMin)}</p>
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
                {fmtMinutos(tiempoEsperaTurno(turno, ahora))}
              </TableCell>
              <TableCell rowPadding="lg">
                <div className="flex gap-2">
                  {turno.estado === 'esperando' && (
                    <Button size="sm" onClick={() => handleCheckIn(turno.id)} disabled={savingId === turno.id}>
                      {savingId === turno.id ? 'Llamando...' : 'Llamar'}
                    </Button>
                  )}
                  {turno.estado === 'en_atencion' && (
                    <Button size="sm" variant="success" onClick={() => handleCheckOut(turno.id)} disabled={savingId === turno.id}>
                      {savingId === turno.id ? 'Finalizando...' : 'Finalizar'}
                    </Button>
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
    </OperacionLayout>
  );
}
