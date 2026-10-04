'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { listarCitas, checkInCita, checkOutCita, CitaApi } from '../../../../services/citas';
import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import TarjetaKpi from '../../../../components/ui/TarjetaKpi';
import Table, { TableRow, TableCell } from '../../../../components/ui/Table';
import Badge from '../../../../components/ui/Badge';
import RegistrarSinCita from '../../../../components/operacion/RegistrarSinCita';
import { showToast } from '../../../../utils/toast';
import { Users, UserCheck, Timer } from 'lucide-react';
import { usePermisos } from '../../../../utils/permisos';
import { idUsuarioSesion, puedeAtenderCita } from '../../../../utils/permisosCitas';

interface TurnoFila {
  id: number;
  cliente: string;
  sinCita: boolean;
  llegada: string;
  fechaHoraInicio: string;
  horaCheckIn: string | null;
  servicio: string;
  especialistaId?: string;
  estado: string;
  posicion: number;
}

function mapearCita(c: CitaApi, posicionEnEspera: number): TurnoFila {
  const fechaHora = c.fechaHoraInicio ? new Date(c.fechaHoraInicio) : null;
  return {
    id: c.id,
    cliente: c.clienteNombre ?? '-',
    sinCita: c.origen === 'sin_cita',
    llegada: fechaHora && !isNaN(fechaHora.getTime()) ? fechaHora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '-',
    fechaHoraInicio: c.fechaHoraInicio,
    horaCheckIn: c.horaCheckIn ?? null,
    servicio: c.servicioNombre ?? '-',
    especialistaId: c.especialistaId,
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
  // El becario solo llama y finaliza sus citas asignadas (el backend responde 403 en las demás).
  const { tienePermiso } = usePermisos();
  const router = useRouter();
  const miId = idUsuarioSesion();
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
    try {
      await checkOutCita(id);
      // Quien cobra pasa directo al punto de venta con la cita precargada; quien no, la deja por cobrar.
      if (tienePermiso('ventas:escritura')) { router.push(`/operacion/punto-de-venta?citaId=${id}`); return; }
      showToast('Turno finalizado: queda en servicios por cobrar', 'success');
      cargar();
    }
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
          <Card variant="elevated" padding="md" role="alert" style={{ backgroundColor: 'color-mix(in srgb, var(--danger) 10%, var(--badge-base))', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--danger-texto) 35%, transparent)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--danger-texto)' }}>{error}</p>
          </Card>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <TarjetaKpi icono={Users} etiqueta="En Espera" cargando={loading} valor={enEspera} tono="aviso" alerta={enEspera > 0} />
          <TarjetaKpi icono={UserCheck} etiqueta="En Atención" cargando={loading} valor={enAtencion} />
          <TarjetaKpi icono={Timer} etiqueta="Tiempo Promedio" cargando={loading} valor={fmtMinutos(tiempoPromedioMin)} />
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
              <TableCell className="font-semibold" rowPadding="lg">
                <span className="inline-flex flex-wrap items-center gap-2">
                  {turno.cliente}
                  {turno.sinCita && <Badge variant="default" size="sm">Sin cita</Badge>}
                </span>
              </TableCell>
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
                {puedeAtenderCita(tienePermiso, turno.especialistaId, miId) && (
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
                )}
              </TableCell>
            </TableRow>
          ))}
        </Table>
        {!loading && turnos.length === 0 && (
          <p className="py-6 text-center text-sm text-encabezados-alterno">Nadie en la lista de espera.</p>
        )}
        </Card>

        {tienePermiso('citas:escritura') && (
          <RegistrarSinCita
            titulo="Registrar nuevo turno"
            descripcion="Para quien llega sin cita: entra a la lista de espera con la hora de llegada de ahora."
            textoBoton="Agregar a la lista de espera"
            iniciarAhora={false}
            onCreado={() => cargar()}
          />
        )}
      </div>
    </OperacionLayout>
  );
}
