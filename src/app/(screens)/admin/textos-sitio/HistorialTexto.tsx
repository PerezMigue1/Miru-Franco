'use client';

import { useEffect, useRef, useState } from 'react';
import { History } from 'lucide-react';
import Badge from '../../../components/ui/Badge';
import { obtenerHistorialTexto, type CambioTexto } from '../../../services/textosSitio';
import { fechaHoraMexico } from '../../../components/privacidad/textosPrivacidad';
import { mensajeDeError } from '../../../utils/errorRed';
import { COLOR_SUAVE, COLOR_TEXTO, MensajeError } from '../configuracion-sitio/piezas';

/** Un cambio: cuándo, quién, antes y ahora (y si fue "Restaurar texto original"). */
export function CambioTextoVista({ cambio }: { cambio: CambioTexto }) {
  return (
    <li className="space-y-2 border-t pt-3" style={{ borderColor: 'var(--mf-linea-fuerte)' }}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-semibold tabular-nums" style={{ color: COLOR_TEXTO }}>
          {fechaHoraMexico(cambio.creadoEn)}
        </span>
        <span style={{ color: COLOR_SUAVE }}>{`por ${cambio.actualizadoPor ?? 'usuario sin nombre'}`}</span>
        {cambio.restaurado && (
          <Badge variant="info" size="sm">
            Texto original restaurado
          </Badge>
        )}
      </div>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-xs font-semibold" style={{ color: COLOR_SUAVE }}>
            Antes
          </dt>
          <dd className="whitespace-pre-line break-words" style={{ color: COLOR_TEXTO }}>
            {cambio.valorAnterior ?? 'Texto original'}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-semibold" style={{ color: COLOR_SUAVE }}>
            Ahora
          </dt>
          <dd className="whitespace-pre-line break-words" style={{ color: COLOR_TEXTO }}>
            {cambio.valorNuevo}
          </dd>
        </div>
      </dl>
    </li>
  );
}

/** Historial de un texto, plegado: se lee del API la primera vez que se abre y después de cada guardado. */
export default function HistorialTexto({ clave, version = 0 }: { clave: string; version?: number }) {
  const [abierto, setAbierto] = useState(false);
  const [cambios, setCambios] = useState<CambioTexto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const pedido = useRef(0);

  useEffect(() => {
    if (!abierto) return;
    const n = ++pedido.current;
    let vigente = true;
    // La carga se marca al pedir: es el estado del pedido que sale aquí.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCargando(true);
    obtenerHistorialTexto(clave)
      .then((r) => {
        if (vigente && n === pedido.current) {
          setCambios(r);
          setError(null);
        }
      })
      .catch((e) => {
        if (vigente) setError(mensajeDeError(e, 'No se pudo leer el historial. Intenta de nuevo.'));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [abierto, clave, version]);

  return (
    <details className="rounded-[10px] border" style={{ borderColor: 'var(--mf-linea-fuerte)' }} onToggle={(e) => setAbierto((e.currentTarget as HTMLDetailsElement).open)}>
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] px-4 py-2 text-sm font-semibold" style={{ color: COLOR_TEXTO }}>
        <History size={16} aria-hidden />
        Historial de cambios
      </summary>
      <div className="space-y-3 px-4 pb-4" aria-live="polite" aria-busy={cargando}>
        {cargando && !cambios && (
          <div className="space-y-2">
            <div className="mf-skeleton h-5 w-48" />
            <div className="mf-skeleton h-14 w-full" />
          </div>
        )}
        {error && <MensajeError>{error}</MensajeError>}
        {cambios && cambios.length === 0 && (
          <p className="text-sm" style={{ color: COLOR_SUAVE }}>
            Este texto no se ha cambiado desde esta pantalla.
          </p>
        )}
        {cambios && cambios.length > 0 && (
          <ol className="space-y-3">
            {cambios.map((c) => (
              <CambioTextoVista key={c.id} cambio={c} />
            ))}
          </ol>
        )}
      </div>
    </details>
  );
}
