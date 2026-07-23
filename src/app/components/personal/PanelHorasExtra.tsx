'use client';

import { useState, useEffect } from 'react';
import Card from '../ui/Card';
import { listarHorasExtra, type ListadoHorasExtraApi } from '../../services/horasExtra';

function fmtMoneda(v: number): string {
  return `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Horas extra del equipo, calculadas (asistencia + configuración de horario). Autocontenido:
 * hace su propio fetch y maneja su propio estado — se usa igual en admin/gestion-personal
 * y en operacion/gestion-equipo.
 */
export default function PanelHorasExtra() {
  const [mesHorasExtra, setMesHorasExtra] = useState(() => new Date().toISOString().slice(0, 7));
  const [horasExtraData, setHorasExtraData] = useState<ListadoHorasExtraApi | null>(null);
  const [loadingHorasExtra, setLoadingHorasExtra] = useState(true);
  const [horasExtraError, setHorasExtraError] = useState<string | null>(null);

  const cargarHorasExtra = async (mes: string) => {
    setLoadingHorasExtra(true);
    setHorasExtraError(null);
    try {
      const data = await listarHorasExtra(mes);
      setHorasExtraData(data);
    } catch (e) {
      setHorasExtraError(e instanceof Error ? e.message : 'Error al calcular las horas extra');
    } finally {
      setLoadingHorasExtra(false);
    }
  };

  useEffect(() => { cargarHorasExtra(mesHorasExtra); }, [mesHorasExtra]);

  return (
    <Card variant="elevated" padding="lg">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
          Horas Extras del Mes
        </h2>
        <input
          type="month"
          value={mesHorasExtra}
          onChange={(e) => setMesHorasExtra(e.target.value)}
          className="text-sm rounded-lg px-2 py-1.5 border"
          style={{ borderColor: 'var(--borde-visible)', color: 'var(--menu-texto-principal)', backgroundColor: 'var(--fondo-general)' }}
        />
      </div>

      {horasExtraError && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{horasExtraError}</p>}

      {loadingHorasExtra ? (
        <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Calculando…</p>
      ) : !horasExtraData || horasExtraData.data.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Sin horas extra registradas este mes.</p>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {horasExtraData.data.map((r) => (
              <div key={r.usuarioId} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>{r.nombre}</p>
                    <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>{r.horasExtra} extra</p>
                  </div>
                  <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                    {r.tarifaConfigurada ? fmtMoneda(r.montoTotal) : 'Tarifa no configurada'}
                  </p>
                </div>

                {r.registrosCerradosAutomaticos > 0 && (
                  <p className="text-xs mt-2" style={{ color: 'var(--warning-texto)' }}>
                    {r.registrosCerradosAutomaticos} registro{r.registrosCerradosAutomaticos === 1 ? '' : 's'} cerrado{r.registrosCerradosAutomaticos === 1 ? '' : 's'} automáticamente no se contó{r.registrosCerradosAutomaticos === 1 ? '' : 'aron'} — revísalo{r.registrosCerradosAutomaticos === 1 ? '' : 's'} y corrige la salida en la tabla de Asistencia si trabajó extra ese día.
                  </p>
                )}
                {r.registrosSinHorarioEsperado > 0 && (
                  <p className="text-xs mt-1" style={{ color: 'var(--warning-texto)' }}>
                    {r.registrosSinHorarioEsperado} marca{r.registrosSinHorarioEsperado === 1 ? '' : 's'} en domingo sin horario configurado — define el horario de domingo en la configuración si el salón abrió, o verifica por qué se marcó ese día.
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: 'var(--borde-visible)' }}>
            <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>Total ({horasExtraData.totalGeneral.horasExtra})</p>
            <p className="font-bold" style={{ color: 'var(--menu-texto-principal)' }}>{fmtMoneda(horasExtraData.totalGeneral.montoTotal)}</p>
          </div>
        </>
      )}
    </Card>
  );
}
