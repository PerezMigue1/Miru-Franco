'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import { CONFIGURACION_POR_OMISION, type HorarioDia } from '../../../../services/configuracionSitio';
import { guardarDiasInhabilesOperacion, guardarHorarioOperacion, obtenerOperacionSitio, type DatosOperacionSitio } from '../../../../services/operacionSitio';
import type { DiaInhabil } from '../../../../utils/reglasNegocio';
import { mensajeDeError } from '../../../../utils/errorRed';
import { showToast } from '../../../../utils/toast';
import { fechaHoraMexico } from '../../../../components/privacidad/textosPrivacidad';
import { FormHorario, VistaPreviaHorario } from '../../../admin/configuracion-sitio/FormHorario';
import { CampoRegla } from '../../../admin/configuracion-sitio/FormReglasNegocio';
import { errorDeRegla } from '../../../admin/configuracion-sitio/reglasNegocioAdmin';
import { ErroresGenerales, PantallaCargando, PantallaError, PantallaSinPermiso } from '../../../admin/configuracion-sitio/piezas';
import { mensajesDelServidor, prepararValor, validarHorario } from '../../../admin/configuracion-sitio/validacionConfiguracion';

export const PERMISO_HORARIO = 'horario:editar';

type Estado = 'cargando' | 'listo' | 'error' | 'sin-permiso';

function UltimoCambio({ dato }: { dato: { actualizadoEn: string; actualizadoPor: string | null } | null }) {
  if (!dato?.actualizadoEn) return null;
  return (
    <p className="mt-1 text-xs tabular-nums text-encabezados-alterno">
      {`Último cambio: ${fechaHoraMexico(dato.actualizadoEn)}${dato.actualizadoPor ? ` por ${dato.actualizadoPor}` : ''}.`}
    </p>
  );
}

/**
 * Operaciones > Horario y días inhábiles (permiso horario:editar). El horario es el del sitio y de la agenda en línea;
 * los días inhábiles se suman a domingos y festivos de ley en los plazos de días hábiles. Lo que se guarda se ve en el
 * sitio al momento (la caché de un minuto queda de respaldo).
 */
export default function HorarioOperacionPage() {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  const [datos, setDatos] = useState<DatosOperacionSitio | null>(null);
  const [dias, setDias] = useState<HorarioDia[]>(CONFIGURACION_POR_OMISION.horario.dias);
  const [inhabiles, setInhabiles] = useState<DiaInhabil[]>([]);
  const [guardando, setGuardando] = useState<'horario' | 'inhabiles' | null>(null);
  const [erroresServidor, setErroresServidor] = useState<{ horario: string[]; inhabiles: string[] }>({ horario: [], inhabiles: [] });

  useEffect(() => {
    let vigente = true;
    obtenerOperacionSitio()
      .then((d) => {
        if (!vigente) return;
        setDatos(d);
        const guardados = d.horario?.valor?.dias;
        setDias(Array.isArray(guardados) && guardados.length === 7 ? guardados : CONFIGURACION_POR_OMISION.horario.dias);
        setInhabiles(d.diasInhabiles ?? []);
        setEstado('listo');
      })
      .catch((e) => {
        if (!vigente) return;
        if ((e as { status?: number } | null)?.status === 403) return setEstado('sin-permiso');
        setError(mensajeDeError(e, 'No se pudo cargar el horario. Intenta de nuevo.'));
        setEstado('error');
      });
    return () => {
      vigente = false;
    };
  }, [intento]);

  const reintentar = useCallback(() => {
    setEstado('cargando');
    setIntento((n) => n + 1);
  }, []);

  const erroresHorario = useMemo(() => validarHorario(dias), [dias]);
  const definicion = datos?.definicionDiasInhabiles ?? null;
  const errorInhabiles = definicion ? errorDeRegla(definicion, inhabiles) : null;

  const guardar = async (que: 'horario' | 'inhabiles') => {
    setGuardando(que);
    setErroresServidor((e) => ({ ...e, [que]: [] }));
    try {
      if (que === 'horario') {
        await guardarHorarioOperacion((prepararValor('horario', { dias }) as { dias: HorarioDia[] }).dias, datos?.horario?.actualizadoEn);
        showToast('Horario guardado. El sitio y la agenda ya lo muestran.', 'success');
      } else {
        await guardarDiasInhabilesOperacion(
          inhabiles.map((d) => ({ fecha: d.fecha, motivo: d.motivo.trim() })),
          datos?.diasInhabilesActualizado?.actualizadoEn,
        );
        showToast('Días inhábiles guardados. Ya cuentan en los plazos de días hábiles.', 'success');
      }
      setIntento((n) => n + 1);
    } catch (e) {
      const conflicto = (e as { status?: number } | null)?.status === 409;
      setErroresServidor((x) => ({
        ...x,
        [que]: conflicto
          ? [mensajeDeError(e, 'Otra persona guardó cambios. Recarga la página y vuelve a intentarlo.')]
          : (mensajesDelServidor(e) ?? [mensajeDeError(e, 'No se pudo guardar. Intenta de nuevo.')]),
      }));
    } finally {
      setGuardando(null);
    }
  };

  return (
    <OperacionLayout permisoRequerido={PERMISO_HORARIO}>
      <div className="w-full max-w-none space-y-6">
        <div>
          <h1 className="text-elegant-title text-menu-texto-principal">Horario y días inhábiles</h1>
          <p className="mt-1 max-w-[65ch] text-sm text-encabezados-alterno">
            El horario del salón que ven las clientas y que usa la agenda en línea, y los días que el salón no abre. Lo que
            guardes aquí se ve en el sitio al momento.
          </p>
        </div>

        {estado === 'cargando' && <PantallaCargando />}
        {estado === 'sin-permiso' && <PantallaSinPermiso />}
        {estado === 'error' && <PantallaError mensaje={error} onReintentar={reintentar} />}

        {estado === 'listo' && (
          <>
            <Card padding="lg">
              <section aria-labelledby="titulo-horario" className="space-y-5">
                <header>
                  <h2 id="titulo-horario" className="text-lg font-semibold text-menu-texto-principal">Horario</h2>
                  <UltimoCambio dato={datos?.horario ?? null} />
                </header>
                <ErroresGenerales mensajes={erroresServidor.horario} />
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
                  <div className="min-w-0">
                    <FormHorario dias={dias} errores={erroresHorario} onCambiar={setDias} legal />
                  </div>
                  <div className="min-w-0">
                    <VistaPreviaHorario dias={dias} errores={erroresHorario} />
                  </div>
                </div>
                <div className="flex justify-end border-t pt-4" style={{ borderColor: 'var(--mf-linea-fuerte)' }}>
                  <Button onClick={() => void guardar('horario')} disabled={guardando !== null || Object.keys(erroresHorario).length > 0}>
                    {guardando === 'horario' ? 'Guardando…' : 'Guardar horario'}
                  </Button>
                </div>
              </section>
            </Card>

            {definicion && (
              <Card padding="lg">
                <section aria-labelledby="titulo-inhabiles" className="space-y-5">
                  <header>
                    <h2 id="titulo-inhabiles" className="text-lg font-semibold text-menu-texto-principal">Días inhábiles</h2>
                    <UltimoCambio dato={datos?.diasInhabilesActualizado ?? null} />
                  </header>
                  <ErroresGenerales mensajes={erroresServidor.inhabiles} />
                  <CampoRegla d={definicion} valor={inhabiles} error={errorInhabiles ?? undefined} onCambiar={(v) => setInhabiles(v as DiaInhabil[])} respaldoApartados={null} />
                  <div className="flex justify-end border-t pt-4" style={{ borderColor: 'var(--mf-linea-fuerte)' }}>
                    <Button onClick={() => void guardar('inhabiles')} disabled={guardando !== null || Boolean(errorInhabiles)}>
                      {guardando === 'inhabiles' ? 'Guardando…' : 'Guardar días inhábiles'}
                    </Button>
                  </div>
                </section>
              </Card>
            )}
          </>
        )}
      </div>
    </OperacionLayout>
  );
}
