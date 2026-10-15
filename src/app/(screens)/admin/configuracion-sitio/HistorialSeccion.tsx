'use client';

import { useEffect, useRef, useState } from 'react';
import { History } from 'lucide-react';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import { obtenerHistorialEnPantalla, type EntradaHistorial, type SeccionConfiguracion } from '../../../services/configuracionSitio';
import { fechaHoraMexico } from '../../../components/privacidad/textosPrivacidad';
import { mensajeDeError } from '../../../utils/errorRed';
import { cambiosDePermisos, cambiosDeSeccion, type PermisoCatalogo } from './cambiosConfiguracion';
import { CambiosPermisos, COLOR_SUAVE, COLOR_TEXTO, ListaCambios, MensajeError } from './piezas';

const POR_PAGINA = 10;

/** Un cambio del historial: cuándo, quién y qué campos cambiaron (en permisos, claves agregadas y quitadas). */
export function EntradaHistorialVista({ entrada, catalogo = [] }: { entrada: EntradaHistorial; catalogo?: PermisoCatalogo[] }) {
  const esPermisos = entrada.clave.startsWith('permisos:');
  return (
    <li className="space-y-2 border-t pt-3" style={{ borderColor: 'var(--mf-linea-fuerte)' }}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-semibold tabular-nums" style={{ color: COLOR_TEXTO }}>
          {fechaHoraMexico(entrada.creadoEn)}
        </span>
        <span style={{ color: COLOR_SUAVE }}>{`por ${entrada.actualizadoPor ?? 'usuario sin nombre'}`}</span>
        {entrada.afectaDocumentosLegales && (
          <Badge variant="warning" size="sm">
            Tocó datos de los documentos legales
          </Badge>
        )}
      </div>
      {esPermisos ? (
        <CambiosPermisos {...cambiosDePermisos(entrada.valorAnterior, entrada.valorNuevo, catalogo)} />
      ) : (
        <ListaCambios cambios={cambiosDeSeccion(entrada.clave as SeccionConfiguracion, entrada.valorAnterior, entrada.valorNuevo)} />
      )}
    </li>
  );
}

interface Props {
  /** Clave del historial: la sección o 'permisos:<rol>'. */
  clave: string;
  /** Cambia después de cada guardado: si el historial está abierto, se vuelve a leer. */
  version?: number;
  catalogo?: PermisoCatalogo[];
}

/** Historial de una sección, plegado: se lee del API la primera vez que se abre. */
export default function HistorialSeccion({ clave, version = 0, catalogo }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [entradas, setEntradas] = useState<EntradaHistorial[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [visibles, setVisibles] = useState(POR_PAGINA);
  const pedido = useRef(0);

  useEffect(() => {
    if (!abierto) return;
    const n = ++pedido.current;
    let vigente = true;
    // La carga se marca al pedir: es el estado del pedido que sale aquí.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCargando(true);
    obtenerHistorialEnPantalla(clave)
      .then((r) => {
        if (vigente && n === pedido.current) {
          setEntradas(r);
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
    <details className="mt-6 rounded-[10px] border" style={{ borderColor: 'var(--mf-linea-fuerte)' }} onToggle={(e) => setAbierto((e.currentTarget as HTMLDetailsElement).open)}>
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] px-4 py-2 text-sm font-semibold" style={{ color: COLOR_TEXTO }}>
        <History size={16} aria-hidden />
        Historial de cambios
      </summary>
      <div className="space-y-3 px-4 pb-4" aria-live="polite" aria-busy={cargando}>
        {cargando && !entradas && (
          <div className="space-y-2">
            <div className="mf-skeleton h-5 w-48" />
            <div className="mf-skeleton h-14 w-full" />
          </div>
        )}
        {error && <MensajeError>{error}</MensajeError>}
        {entradas && entradas.length === 0 && (
          <p className="text-sm" style={{ color: COLOR_SUAVE }}>
            Todavía no hay cambios guardados desde esta pantalla.
          </p>
        )}
        {entradas && entradas.length > 0 && (
          <>
            <ol className="space-y-3">
              {entradas.slice(0, visibles).map((e) => (
                <EntradaHistorialVista key={e.id} entrada={e} catalogo={catalogo} />
              ))}
            </ol>
            {entradas.length > visibles && (
              <Button variant="outline" onClick={() => setVisibles((v) => v + POR_PAGINA)}>
                {`Ver ${Math.min(POR_PAGINA, entradas.length - visibles)} cambios más`}
              </Button>
            )}
          </>
        )}
      </div>
    </details>
  );
}
