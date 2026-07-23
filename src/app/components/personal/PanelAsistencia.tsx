'use client';

import { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Table, { TableRow, TableCell } from '../ui/Table';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import { listarAsistencia, corregirAsistencia, type RegistroAsistenciaApi } from '../../services/asistencia';
import { Clock3 } from 'lucide-react';

const ZONA_SALON = 'America/Mexico_City';

/** `fecha` de asistencia ya es "YYYY-MM-DD" plano (hora de México) — solo se reordena para mostrar. */
function fmtFechaAsistencia(fecha: string): string {
  const [y, m, d] = fecha.split('-');
  return y && m && d ? `${d}/${m}/${y}` : fecha;
}

/** Hora del marcado (timestamp real) mostrada en hora de México, sin importar dónde esté el navegador. */
function fmtHoraAsistencia(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('es-MX', { timeZone: ZONA_SALON, hour: '2-digit', minute: '2-digit' });
}

/** Convierte un ISO a valor de <input type="datetime-local"> en la hora local del navegador (limitación nativa del input). */
function isoADatetimeLocal(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Ver/corregir la asistencia del equipo. Autocontenido: hace su propio fetch y maneja
 * su propio estado — se usa igual en admin/gestion-personal y en operacion/gestion-equipo.
 */
export default function PanelAsistencia() {
  const [asistencias, setAsistencias] = useState<RegistroAsistenciaApi[]>([]);
  const [loadingAsistencia, setLoadingAsistencia] = useState(true);
  const [asistenciaError, setAsistenciaError] = useState<string | null>(null);
  const [corrigiendoRegistro, setCorrigiendoRegistro] = useState<RegistroAsistenciaApi | null>(null);
  const [corrEntrada, setCorrEntrada] = useState('');
  const [corrSalida, setCorrSalida] = useState('');
  const [guardandoCorreccion, setGuardandoCorreccion] = useState(false);
  const [corrError, setCorrError] = useState<string | null>(null);

  const cargarAsistencia = async () => {
    setLoadingAsistencia(true);
    setAsistenciaError(null);
    try {
      const data = await listarAsistencia();
      setAsistencias(data);
    } catch (e) {
      setAsistenciaError(e instanceof Error ? e.message : 'Error al cargar la asistencia');
    } finally {
      setLoadingAsistencia(false);
    }
  };

  useEffect(() => { cargarAsistencia(); }, []);

  const abrirCorregir = (registro: RegistroAsistenciaApi) => {
    setCorrigiendoRegistro(registro);
    setCorrEntrada(isoADatetimeLocal(registro.horaEntrada));
    setCorrSalida(isoADatetimeLocal(registro.horaSalida));
    setCorrError(null);
  };

  const confirmarCorreccion = async () => {
    if (!corrigiendoRegistro) return;
    setGuardandoCorreccion(true);
    setCorrError(null);
    try {
      await corregirAsistencia(corrigiendoRegistro.id, {
        horaEntrada: corrEntrada ? new Date(corrEntrada).toISOString() : undefined,
        horaSalida: corrSalida ? new Date(corrSalida).toISOString() : undefined,
      });
      setCorrigiendoRegistro(null);
      await cargarAsistencia();
    } catch (e) {
      setCorrError(e instanceof Error ? e.message : 'No se pudo corregir el registro');
    } finally {
      setGuardandoCorreccion(false);
    }
  };

  return (
    <>
      <Card variant="elevated" padding="lg">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--menu-texto-principal)' }}>
          <Clock3 size={18} /> Asistencia
        </h2>
        {asistenciaError && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{asistenciaError}</p>}
        {loadingAsistencia ? (
          <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Cargando asistencia…</p>
        ) : asistencias.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Aún no hay marcas registradas.</p>
        ) : (
          <Table headers={['Empleado', 'Fecha', 'Entrada', 'Salida', 'Acciones']} headerSutil>
            {asistencias.map((r) => (
              <TableRow key={r.id}>
                <TableCell rowPadding="lg" className="font-semibold">{r.usuarioNombre || 'Empleado'}</TableCell>
                <TableCell rowPadding="lg">{fmtFechaAsistencia(r.fecha)}</TableCell>
                <TableCell rowPadding="lg">{fmtHoraAsistencia(r.horaEntrada)}</TableCell>
                <TableCell rowPadding="lg">
                  {fmtHoraAsistencia(r.horaSalida)}
                  {r.cerradoAutomatico && (
                    <Badge variant="warning" className="ml-2">Cierre automático</Badge>
                  )}
                </TableCell>
                <TableCell rowPadding="lg">
                  <Button size="sm" variant="outline" onClick={() => abrirCorregir(r)}>Corregir</Button>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        )}
      </Card>

      {/* Modal: Corregir asistencia */}
      <Modal
        isOpen={corrigiendoRegistro !== null}
        onClose={() => { if (!guardandoCorreccion) setCorrigiendoRegistro(null); }}
        title={`Corregir asistencia — ${corrigiendoRegistro?.usuarioNombre || 'Empleado'}`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCorrigiendoRegistro(null)} disabled={guardandoCorreccion}>Cancelar</Button>
            <Button onClick={confirmarCorreccion} disabled={guardandoCorreccion}>
              {guardandoCorreccion ? 'Guardando...' : 'Guardar'}
            </Button>
          </>
        }
      >
        {corrError && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{corrError}</p>}
        <div className="space-y-4">
          <Input label="Entrada" type="datetime-local" value={corrEntrada} onChange={(e) => setCorrEntrada(e.target.value)} fullWidth />
          <Input label="Salida" type="datetime-local" value={corrSalida} onChange={(e) => setCorrSalida(e.target.value)} fullWidth />
          {corrigiendoRegistro?.cerradoAutomatico && (
            <p className="text-xs" style={{ color: 'var(--warning-texto)' }}>
              Esta salida fue cerrada automáticamente por la regla de las 2:00 AM — corrígela si no es correcta.
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
