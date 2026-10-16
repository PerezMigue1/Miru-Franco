'use client';

import { useId, useMemo, useState } from 'react';
import { ChevronDown, Search, ShieldAlert } from 'lucide-react';
import Badge from '../../../components/ui/Badge';
import Card from '../../../components/ui/Card';
import type { CatalogoTextos, TextoAdmin } from '../../../services/textosSitio';
import { fechaHoraMexico } from '../../../components/privacidad/textosPrivacidad';
import { COLOR_SUAVE, COLOR_TEXTO } from '../configuracion-sitio/piezas';
import EditorTexto from './EditorTexto';
import { contarPersonalizados, ETIQUETA_TIPO, filtrarTextos, TODAS_LAS_PAGINAS } from './textosSitioAdmin';

/** Piezas de Admin > Textos del sitio: carga, sin permiso, la lista con buscador y filtro, y cada texto. */

export function TextosCargando() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando los textos del sitio…</span>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="mf-skeleton h-11 w-full sm:w-80" />
        <div className="mf-skeleton h-11 w-full sm:w-56" />
      </div>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="mf-skeleton h-20 w-full" />
      ))}
    </div>
  );
}

export function TextosSinPermiso() {
  return (
    <Card padding="lg">
      <div className="flex flex-col items-start gap-3">
        <ShieldAlert size={28} aria-hidden style={{ color: 'var(--logo-branding)' }} />
        <h2 className="text-lg font-semibold" style={{ color: COLOR_TEXTO }}>
          No tienes permiso para ver los textos del sitio.
        </h2>
        <p className="max-w-[65ch] text-sm" style={{ color: COLOR_SUAVE }}>
          Solo el administrador puede cambiar los textos del sitio, de los correos y de los avisos. Si crees que es un
          error, pide a la administradora que revise tu cuenta.
        </p>
      </div>
    </Card>
  );
}

/** Un texto de la lista: página, descripción y texto actual; al abrirlo, su editor. */
export function FilaTexto({
  texto,
  abierto,
  onAlternar,
  nombreSalon,
  onGuardado,
}: {
  texto: TextoAdmin;
  abierto: boolean;
  onAlternar: () => void;
  nombreSalon?: string;
  onGuardado: (valor: string) => void;
}) {
  const id = useId();
  const cambiado = texto.valor !== texto.porDefecto;
  return (
    <li>
      <Card padding="md">
        <h3 className="m-0">
          <button
            type="button"
            onClick={onAlternar}
            aria-expanded={abierto}
            aria-controls={`${id}-editor`}
            className="flex min-h-11 w-full cursor-pointer items-start gap-3 rounded-[10px] text-left"
          >
            <span className="min-w-0 flex-1 space-y-1">
              <span className="flex flex-wrap items-center gap-2">
                <Badge size="sm">{texto.pagina}</Badge>
                <span className="text-xs" style={{ color: COLOR_SUAVE }}>
                  {ETIQUETA_TIPO[texto.tipo] ?? texto.tipo}
                </span>
                {cambiado && (
                  <Badge variant="warning" size="sm">
                    Cambiado
                  </Badge>
                )}
              </span>
              <span className="block text-sm font-semibold" style={{ color: COLOR_TEXTO }}>
                {texto.descripcion}
              </span>
              <span className="block whitespace-pre-line break-words text-sm" style={{ color: COLOR_SUAVE }}>
                {texto.valor.length > 180 ? `${texto.valor.slice(0, 180)}…` : texto.valor}
              </span>
              {texto.actualizadoEn && (
                <span className="block text-xs tabular-nums" style={{ color: COLOR_SUAVE }}>
                  {`Última actualización: ${fechaHoraMexico(texto.actualizadoEn)}${texto.actualizadoPor ? ` por ${texto.actualizadoPor}` : ''}.`}
                </span>
              )}
            </span>
            <ChevronDown
              size={20}
              aria-hidden
              className="mt-1 shrink-0"
              style={{ color: COLOR_TEXTO, transform: abierto ? 'rotate(180deg)' : undefined, transition: 'transform 200ms var(--mf-ease-out)' }}
            />
            <span className="sr-only">{abierto ? 'Cerrar editor' : 'Editar texto'}</span>
          </button>
        </h3>
        {abierto && (
          <div id={`${id}-editor`} className="mt-4 border-t pt-4" style={{ borderColor: 'var(--mf-linea-fuerte)' }}>
            <EditorTexto texto={texto} nombreSalon={nombreSalon} onGuardado={onGuardado} />
          </div>
        )}
      </Card>
    </li>
  );
}

/** Buscador, filtro por página y lista. */
export function ListaTextos({ catalogo, nombreSalon, onGuardado }: { catalogo: CatalogoTextos; nombreSalon?: string; onGuardado: (clave: string, valor: string) => void }) {
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(TODAS_LAS_PAGINAS);
  const [abierto, setAbierto] = useState<string | null>(null);
  const visibles = useMemo(() => filtrarTextos(catalogo.data, busqueda, pagina), [catalogo.data, busqueda, pagina]);
  const cambiados = contarPersonalizados(catalogo.data);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 sm:w-96">
          <label htmlFor="textos-buscar" className="mf-etiqueta">
            Buscar
          </label>
          <div className="relative">
            <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLOR_SUAVE }} />
            <input
              id="textos-buscar"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Palabra del texto o qué es"
              className="mf-campo w-full py-2.5 pl-9 pr-4"
              autoComplete="off"
            />
          </div>
        </div>
        <div className="min-w-0 sm:w-64">
          <label htmlFor="textos-pagina" className="mf-etiqueta">
            Página
          </label>
          <select id="textos-pagina" value={pagina} onChange={(e) => setPagina(e.target.value)} className="mf-campo w-full px-4 py-2.5">
            <option value={TODAS_LAS_PAGINAS}>Todas las páginas</option>
            {catalogo.paginas.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-sm tabular-nums" style={{ color: COLOR_SUAVE }} aria-live="polite">
        {`${visibles.length} de ${catalogo.data.length} textos. ${cambiados} ${cambiados === 1 ? 'cambiado' : 'cambiados'} desde esta pantalla.`}
      </p>
      {visibles.length === 0 ? (
        <Card padding="lg">
          <p className="text-sm" style={{ color: COLOR_SUAVE }}>
            Ningún texto coincide con la búsqueda. Prueba con otra palabra o elige otra página.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {visibles.map((t) => (
            <FilaTexto
              key={t.clave}
              texto={t}
              abierto={abierto === t.clave}
              onAlternar={() => setAbierto((a) => (a === t.clave ? null : t.clave))}
              nombreSalon={nombreSalon}
              onGuardado={(valor) => onGuardado(t.clave, valor)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

