'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../../components/ui/Table';
import Badge from '../../../../components/ui/Badge';
import { marcarAsistencia, listarMiAsistencia, type RegistroAsistenciaApi } from '../../../../services/asistencia';
import { obtenerMisHorasExtra, type ResumenHorasExtraApi } from '../../../../services/horasExtra';
import { Clock3, LogIn, LogOut, TrendingUp } from 'lucide-react';

const ZONA_SALON = 'America/Mexico_City';

/** Mismo criterio que el backend: "hoy" en hora de México, no la del navegador. */
function hoyMexico(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: ZONA_SALON });
}

function fmtMoneda(v: number): string {
  return `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtHora(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('es-MX', { timeZone: ZONA_SALON, hour: '2-digit', minute: '2-digit' });
}

function fmtFechaSolo(fecha: string): string {
  const [y, m, d] = fecha.split('-');
  return y && m && d ? `${d}/${m}/${y}` : fecha;
}

export default function MiAsistenciaPage() {
  const [registros, setRegistros] = useState<RegistroAsistenciaApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [marcando, setMarcando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [misHorasExtra, setMisHorasExtra] = useState<ResumenHorasExtraApi | null>(null);
  const [loadingHorasExtra, setLoadingHorasExtra] = useState(true);

  useEffect(() => {
    setLoadingHorasExtra(true);
    obtenerMisHorasExtra()
      .then(setMisHorasExtra)
      .catch(() => setMisHorasExtra(null))
      .finally(() => setLoadingHorasExtra(false));
  }, []);

  const cargar = useCallback(() => {
    setLoading(true);
    setError(null);
    listarMiAsistencia()
      .then(setRegistros)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar tu asistencia'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const registroHoy = useMemo(() => registros.find((r) => r.fecha === hoyMexico()) ?? null, [registros]);

  const estadoBoton = useMemo(() => {
    if (!registroHoy) return 'marcar_entrada' as const;
    if (!registroHoy.horaSalida) return 'marcar_salida' as const;
    return 'completo' as const;
  }, [registroHoy]);

  const handleMarcar = async () => {
    setMarcando(true);
    setError(null);
    try {
      await marcarAsistencia();
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar la marca');
    } finally {
      setMarcando(false);
    }
  };

  return (
    <OperacionLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div>
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
            Mi asistencia
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
            Marca tu entrada y salida del día
          </p>
        </div>

        {error && (
          <div className="bg-red-600 border border-red-700 text-white px-4 py-3 rounded text-xs font-bold shadow-md">
            {error}
          </div>
        )}

        {/* Marcado del día */}
        <Card variant="elevated" padding="lg">
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <Clock3 size={32} style={{ color: 'var(--encabezados-alterno)' }} />

            {registroHoy ? (
              <div className="flex gap-8 text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
                <div>
                  <p className="font-semibold">Entrada</p>
                  <p>{fmtHora(registroHoy.horaEntrada)}</p>
                </div>
                <div>
                  <p className="font-semibold">Salida</p>
                  <p>{fmtHora(registroHoy.horaSalida)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                Aún no marcas tu jornada de hoy
              </p>
            )}

            <Button
              size="lg"
              onClick={handleMarcar}
              disabled={marcando || loading || estadoBoton === 'completo'}
            >
              <span className="inline-flex items-center gap-2">
                {estadoBoton === 'marcar_salida' ? <LogOut size={18} aria-hidden /> : <LogIn size={18} aria-hidden />}
                {marcando
                  ? 'Guardando...'
                  : estadoBoton === 'marcar_entrada'
                  ? 'Marcar entrada'
                  : estadoBoton === 'marcar_salida'
                  ? 'Marcar salida'
                  : 'Jornada completa'}
              </span>
            </Button>
          </div>
        </Card>

        {/* Horas extra del mes */}
        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--menu-texto-principal)' }}>
            <TrendingUp size={18} /> Mis horas extra del mes
          </h2>
          {loadingHorasExtra ? (
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Calculando…</p>
          ) : !misHorasExtra || misHorasExtra.minutosExtraTotal === 0 ? (
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Sin horas extra este mes.</p>
          ) : (
            <div className="flex justify-between items-center">
              <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>{misHorasExtra.horasExtra} extra</p>
              <p className="font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                {misHorasExtra.tarifaConfigurada ? fmtMoneda(misHorasExtra.montoTotal) : 'Tarifa no configurada'}
              </p>
            </div>
          )}
        </Card>

        {/* Historial */}
        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Historial reciente
          </h2>
          {loading ? (
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Cargando…</p>
          ) : registros.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Aún no tienes marcas registradas.</p>
          ) : (
            <Table headers={['Fecha', 'Entrada', 'Salida']} headerSutil>
              {registros.map((r) => (
                <TableRow key={r.id}>
                  <TableCell rowPadding="lg">{fmtFechaSolo(r.fecha)}</TableCell>
                  <TableCell rowPadding="lg">{fmtHora(r.horaEntrada)}</TableCell>
                  <TableCell rowPadding="lg">
                    {fmtHora(r.horaSalida)}
                    {r.cerradoAutomatico && (
                      <Badge variant="warning" className="ml-2">Cierre automático</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </OperacionLayout>
  );
}
