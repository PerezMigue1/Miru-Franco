'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Bold, Braces, Heading2, Heading3, Link2, List, ListOrdered, RefreshCw, Save, Send, Trash2 } from 'lucide-react';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import {
  borradorDocumentoLegal,
  descartarBorradorDocumentoLegal,
  guardarBorradorDocumentoLegal,
  vistaPreviaDocumentoLegal,
  type DocumentoAdmin,
  type ResultadoPublicacion,
  type VariableDisponible,
  type VistaPreviaDocumento,
} from '../../../services/documentosLegales';
import { mensajeDeError } from '../../../utils/errorRed';
import { showToast } from '../../../utils/toast';
import DialogoPublicar from './DialogoPublicar';
import { aplicarFormato, GUIA_FORMATO, variablesDesconocidasEnTexto, type Formato } from './editorDocumentos';
import VistaDocumento from './VistaDocumento';

const COLOR_TEXTO = 'var(--menu-texto-principal)';
const COLOR_SUAVE = 'var(--encabezados-alterno)';
const ESPERA_VISTA_MS = 700;

const ESTILO_BOTON_ICONO = {
  '--btn-bg': 'transparent',
  '--btn-texto': 'var(--menu-texto-principal)',
  '--btn-borde': '1px solid var(--campo-borde)',
  '--btn-bg-hover': 'var(--nav-hover-bg)',
} as CSSProperties;

function BotonFormato({ etiqueta, onClick, children }: { etiqueta: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      onClick={onClick}
      className="mf-btn mf-btn-color grid h-11 w-11 shrink-0 place-items-center rounded-[10px]"
      style={ESTILO_BOTON_ICONO}
    >
      {children}
    </button>
  );
}

const BOTONES: Array<{ formato: Formato; etiqueta: string; icono: ReactNode }> = [
  { formato: 'seccion', etiqueta: 'Nueva sección (## Título)', icono: <Heading2 size={18} aria-hidden /> },
  { formato: 'subtitulo', etiqueta: 'Subtítulo (### Subtítulo)', icono: <Heading3 size={18} aria-hidden /> },
  { formato: 'lista', etiqueta: 'Lista con viñetas', icono: <List size={18} aria-hidden /> },
  { formato: 'numerada', etiqueta: 'Lista numerada', icono: <ListOrdered size={18} aria-hidden /> },
  { formato: 'negritas', etiqueta: 'Negritas', icono: <Bold size={18} aria-hidden /> },
  { formato: 'enlace', etiqueta: 'Enlace', icono: <Link2 size={18} aria-hidden /> },
];

interface Props {
  doc: DocumentoAdmin;
  versionMayor: string | null;
  ultimaVigencia: string | null;
  onPublicado: (r: ResultadoPublicacion) => void;
  onBorradorCambio: () => void;
}

/**
 * Editor del borrador de un documento legal: formato sencillo con barra de botones, variables de reglas, vista previa
 * con las reglas de hoy (la arma el backend) y "Publicar nueva versión". Nunca edita una versión publicada.
 */
export default function EditorDocumento({ doc, versionMayor, ultimaVigencia, onPublicado, onBorradorCambio }: Props) {
  const [plantilla, setPlantilla] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [sinGuardar, setSinGuardar] = useState(false);
  const [variables, setVariables] = useState<VariableDisponible[]>([]);
  const [vista, setVista] = useState<VistaPreviaDocumento | null>(null);
  const [cargandoVista, setCargandoVista] = useState(false);
  const [errorCarga, setErrorCarga] = useState('');
  const [errorVista, setErrorVista] = useState('');
  const [ocupado, setOcupado] = useState<'guardar' | 'descartar' | null>(null);
  const [publicando, setPublicando] = useState(false);
  const [intento, setIntento] = useState(0);
  const area = useRef<HTMLTextAreaElement>(null);
  const idEditor = `editor-${doc.slug}`;

  useEffect(() => {
    let vigente = true;
    setPlantilla(null);
    borradorDocumentoLegal(doc.slug)
      .then((b) => {
        if (!vigente) return;
        setPlantilla(b.plantilla);
        setGuardado(b.guardado);
        setSinGuardar(false);
        setVariables(b.variablesDisponibles ?? []);
        setErrorCarga('');
      })
      .catch((e) => {
        if (vigente) setErrorCarga(mensajeDeError(e, 'No se pudo cargar el borrador.'));
      });
    return () => {
      vigente = false;
    };
  }, [doc.slug, intento]);

  const actualizarVista = useCallback(
    async (texto: string) => {
      setCargandoVista(true);
      try {
        setVista(await vistaPreviaDocumentoLegal(doc.slug, { plantilla: texto }));
        setErrorVista('');
      } catch (e) {
        setErrorVista(mensajeDeError(e, 'No se pudo armar la vista previa.'));
      } finally {
        setCargandoVista(false);
      }
    },
    [doc.slug],
  );

  // Vista previa: cuando deja de escribir un momento.
  useEffect(() => {
    if (plantilla === null || !plantilla.trim()) return;
    const t = setTimeout(() => actualizarVista(plantilla), ESPERA_VISTA_MS);
    return () => clearTimeout(t);
  }, [plantilla, actualizarVista]);

  const cambiar = (texto: string) => {
    setPlantilla(texto);
    setSinGuardar(true);
  };

  const formatear = (formato: Formato, variable?: string) => {
    const el = area.current;
    if (plantilla === null || !el) return;
    const r = aplicarFormato(plantilla, el.selectionStart, el.selectionEnd, formato, variable);
    cambiar(r.texto);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(r.inicio, r.fin);
    });
  };

  const guardar = async () => {
    if (plantilla === null) return;
    setOcupado('guardar');
    try {
      await guardarBorradorDocumentoLegal(doc.slug, plantilla);
      setGuardado(true);
      setSinGuardar(false);
      onBorradorCambio();
      showToast(`${doc.titulo}: borrador guardado. Aún no está publicado.`, 'success');
    } catch (e) {
      showToast(mensajeDeError(e, 'No se pudo guardar el borrador.'), 'error');
    } finally {
      setOcupado(null);
    }
  };

  const descartar = async () => {
    if (!window.confirm('¿Descartar el borrador? Se vuelve al texto de la versión vigente. Lo publicado no cambia.')) return;
    setOcupado('descartar');
    try {
      await descartarBorradorDocumentoLegal(doc.slug);
      onBorradorCambio();
      setIntento((n) => n + 1);
      showToast('Borrador descartado.', 'success');
    } catch (e) {
      showToast(mensajeDeError(e, 'No se pudo descartar el borrador.'), 'error');
    } finally {
      setOcupado(null);
    }
  };

  const desconocidas = plantilla ? variablesDesconocidasEnTexto(plantilla, variables.map((v) => v.nombre)) : [];
  const errores = [...(desconocidas.length ? [`Estas variables no existen: ${desconocidas.map((v) => `{${v}}`).join(', ')}.`] : []), ...(vista?.errores ?? [])];
  const vistaAlDia = !!vista && !cargandoVista;
  const puedePublicar = plantilla !== null && !!plantilla.trim() && errores.length === 0 && vistaAlDia && !errorVista;

  return (
    <Card padding="md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold" style={{ color: COLOR_TEXTO }}>
            Borrador de {doc.titulo}
          </h2>
          <p className="mt-1 max-w-[65ch] text-sm" style={{ color: COLOR_SUAVE }}>
            Lo que escribas aquí no se publica hasta que uses «Publicar nueva versión». La versión vigente no cambia.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {guardado && <Badge variant="info" size="sm">Borrador guardado</Badge>}
          {sinGuardar && <Badge variant="warning" size="sm">Cambios sin guardar</Badge>}
        </div>
      </div>

      {errorCarga && (
        <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 text-sm font-semibold" style={{ color: 'var(--danger-texto)' }}>
          {errorCarga}
          <Button variant="outline" size="sm" onClick={() => setIntento((n) => n + 1)}>
            <RefreshCw size={16} aria-hidden />
            Reintentar
          </Button>
        </div>
      )}

      {plantilla === null && !errorCarga && (
        <div className="mt-4 space-y-3" aria-busy="true">
          <span className="sr-only">Cargando el borrador…</span>
          <div className="mf-skeleton h-11 w-full" />
          <div className="mf-skeleton h-80 w-full" />
        </div>
      )}

      {plantilla !== null && (
        <div className="mt-4 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="min-w-0 space-y-3">
            <div role="toolbar" aria-label="Formato del texto" aria-controls={idEditor} className="flex flex-wrap items-center gap-2">
              {BOTONES.map((b) => (
                <BotonFormato key={b.formato} etiqueta={b.etiqueta} onClick={() => formatear(b.formato)}>
                  {b.icono}
                </BotonFormato>
              ))}
              <label className="sr-only" htmlFor={`${idEditor}-variable`}>
                Insertar una variable de las reglas
              </label>
              <div className="relative min-w-0 grow sm:grow-0">
                <Braces size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--campo-placeholder)' }} />
                <select
                  id={`${idEditor}-variable`}
                  className="mf-campo h-11 w-full py-2 pl-9 pr-3 text-sm sm:w-72"
                  value=""
                  onChange={(e) => e.target.value && formatear('variable', e.target.value)}
                >
                  <option value="">Insertar variable…</option>
                  {variables.map((v) => (
                    <option key={v.nombre} value={v.nombre}>
                      {`${v.etiqueta} (hoy: ${v.valor || 'sin valor'})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label htmlFor={idEditor} className="mf-etiqueta">
              Texto del documento
            </label>
            <textarea
              id={idEditor}
              ref={area}
              value={plantilla}
              onChange={(e) => cambiar(e.target.value)}
              spellCheck
              rows={24}
              aria-describedby={`${idEditor}-guia`}
              className="mf-campo w-full resize-y px-4 py-3 text-sm leading-relaxed"
              style={{ fontFamily: 'var(--font-family-mono)' }}
            />

            <details id={`${idEditor}-guia`} className="rounded-[10px] border px-4 py-3 text-sm" style={{ borderColor: 'var(--mf-linea-fuerte)' }}>
              <summary className="min-h-11 cursor-pointer content-center font-semibold" style={{ color: COLOR_TEXTO }}>
                Cómo dar formato
              </summary>
              <dl className="mt-2 space-y-2">
                {GUIA_FORMATO.map((g) => (
                  <div key={g.marca} className="grid grid-cols-1 gap-1 sm:grid-cols-[10rem_1fr]">
                    <dt>
                      <code className="text-xs" style={{ color: COLOR_TEXTO }}>
                        {g.marca}
                      </code>
                    </dt>
                    <dd style={{ color: COLOR_SUAVE }}>{g.explica}</dd>
                  </div>
                ))}
              </dl>
            </details>

            {errores.length > 0 && (
              <div role="alert" className="rounded-[10px] px-4 py-3 text-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--danger) 10%, var(--fondo-general))', color: 'var(--danger-texto)' }}>
                <p className="font-semibold">Corrige esto antes de publicar:</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {errores.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button onClick={() => setPublicando(true)} disabled={!puedePublicar}>
                <Send size={16} aria-hidden />
                Publicar nueva versión
              </Button>
              <Button variant="outline" onClick={guardar} disabled={ocupado !== null || !sinGuardar}>
                <Save size={16} aria-hidden />
                {ocupado === 'guardar' ? 'Guardando…' : 'Guardar borrador'}
              </Button>
              {guardado && (
                <Button variant="outline-danger" onClick={descartar} disabled={ocupado !== null}>
                  <Trash2 size={16} aria-hidden />
                  {ocupado === 'descartar' ? 'Descartando…' : 'Descartar borrador'}
                </Button>
              )}
            </div>
          </div>

          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold" style={{ color: COLOR_SUAVE }}>
                Vista previa con las reglas de hoy
              </h3>
              <Button variant="outline" size="sm" onClick={() => actualizarVista(plantilla)} disabled={cargandoVista || !plantilla.trim()}>
                <RefreshCw size={16} aria-hidden />
                {cargandoVista ? 'Actualizando…' : 'Actualizar'}
              </Button>
            </div>
            <p aria-live="polite" className="sr-only">
              {cargandoVista ? 'Actualizando la vista previa…' : vista ? 'Vista previa actualizada.' : ''}
            </p>
            {errorVista && (
              <p role="alert" className="text-sm font-medium" style={{ color: 'var(--danger-texto)' }}>
                {errorVista}
              </p>
            )}
            {vista ? (
              <VistaDocumento html={vista.html} etiqueta={`Vista previa de ${doc.titulo}`} />
            ) : (
              <div className="mf-skeleton h-80 w-full" aria-hidden />
            )}
          </div>
        </div>
      )}

      {publicando && plantilla !== null && (
        <DialogoPublicar
          doc={doc}
          plantilla={plantilla}
          versionMayor={versionMayor}
          ultimaVigencia={ultimaVigencia}
          onCerrar={() => setPublicando(false)}
          onPublicado={(r) => {
            setPublicando(false);
            setSinGuardar(false);
            setGuardado(false);
            onPublicado(r);
          }}
        />
      )}
    </Card>
  );
}
