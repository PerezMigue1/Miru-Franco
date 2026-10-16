'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, FilePenLine, FileText, History, ShieldAlert } from 'lucide-react';
import AdminLayout from '../../../components/layouts/AdminLayout';
import AvisoReglasEnDocumentos from '../../../components/legal/AvisoReglasEnDocumentos';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import {
  listarDocumentosLegalesAdmin,
  prepararVersionDocumentoLegal,
  type DocumentoAdmin,
  type ResultadoPublicacion,
  type SlugEditable,
} from '../../../services/documentosLegales';
import { mensajeDeError } from '../../../utils/errorRed';
import { formatearFechaSoloDia } from '../../../utils/fechaSoloDia';
import { showToast } from '../../../utils/toast';
import { compararVersiones } from './editorDocumentos';
import EditorDocumento from './EditorDocumento';
import HistorialDocumento from './HistorialDocumento';

const COLOR_TEXTO = 'var(--menu-texto-principal)';
const COLOR_SUAVE = 'var(--encabezados-alterno)';

const fechaLarga = (dia: string) => formatearFechaSoloDia(dia, { day: 'numeric', month: 'long', year: 'numeric' }) ?? dia;

type Estado = 'cargando' | 'listo' | 'error' | 'sin-permiso';
type Vista = { slug: SlugEditable; modo: 'editar' | 'historial' } | null;

/** La versión más alta ya publicada y la vigencia de la última (vigente o programada). */
function ultimas(doc: DocumentoAdmin): { versionMayor: string | null; ultimaVigencia: string | null } {
  const versiones = [doc.vigente, doc.programada].filter((v): v is { version: string; vigenteDesde: string } & Record<string, unknown> => !!v);
  if (versiones.length === 0) return { versionMayor: null, ultimaVigencia: null };
  const mayor = versiones.reduce((m, v) => (compararVersiones(v.version, m.version) > 0 ? v : m));
  const ultima = versiones.reduce((m, v) => (v.vigenteDesde > m.vigenteDesde ? v : m));
  return { versionMayor: mayor.version, ultimaVigencia: ultima.vigenteDesde };
}

/**
 * Admin > Documentos legales (permiso configuracion:editar, solo admin): Términos, Aviso de privacidad, Cookies y
 * Reembolsos (con Anticipos). Cada documento tiene un borrador editable con vista previa; publicar inserta una versión
 * nueva (número, fecha y motivo) y las anteriores quedan solo para consulta.
 */
export default function DocumentosLegalesPage() {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [error, setError] = useState('');
  const [documentos, setDocumentos] = useState<DocumentoAdmin[]>([]);
  const [vista, setVista] = useState<Vista>(null);
  const [preparando, setPreparando] = useState<SlugEditable | null>(null);
  const [recarga, setRecarga] = useState(0);
  /** Cambia cuando hay que volver a leer el borrador abierto (al prepararlo desde la versión vigente). */
  const [versionEditor, setVersionEditor] = useState(0);

  const cargar = useCallback(async () => {
    try {
      setDocumentos(await listarDocumentosLegalesAdmin());
      setEstado('listo');
    } catch (e) {
      if ((e as { status?: number } | null)?.status === 403) {
        setEstado('sin-permiso');
        return;
      }
      setError(mensajeDeError(e, 'No se pudieron cargar los documentos legales. Intenta de nuevo.'));
      setEstado('error');
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar, recarga]);

  const preparar = useCallback(async (slug: SlugEditable) => {
    setPreparando(slug);
    try {
      const r = await prepararVersionDocumentoLegal(slug);
      showToast(r.creado ? 'Borrador preparado desde la versión vigente. Revísalo y publícalo.' : 'Ya había un borrador: se abre tal como estaba.', 'info');
      setVista({ slug, modo: 'editar' });
      setVersionEditor((n) => n + 1);
      setRecarga((n) => n + 1);
    } catch (e) {
      showToast(mensajeDeError(e, 'No se pudo preparar el borrador.'), 'error');
    } finally {
      setPreparando(null);
    }
  }, []);

  // Desde Configuración del sitio: /admin/documentos-legales?preparar=terminos prepara el borrador al entrar.
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get('preparar');
    if (!slug || !['terminos', 'aviso-privacidad', 'cookies', 'reembolsos'].includes(slug)) return;
    window.history.replaceState(null, '', window.location.pathname);
    const t = setTimeout(() => void preparar(slug as SlugEditable), 0);
    return () => clearTimeout(t);
  }, [preparar]);

  const publicado = (doc: DocumentoAdmin, r: ResultadoPublicacion) => {
    showToast(
      `${doc.titulo}: versión ${r.version} publicada, vigente desde el ${fechaLarga(r.vigenteDesde)}.${r.requiereAceptacion ? ' Se pedirá volver a aceptar.' : ''}`,
      'success',
      6000,
    );
    setVista({ slug: doc.slug, modo: 'historial' });
    setRecarga((n) => n + 1);
  };

  const afectados = documentos
    .filter((d) => d.variablesDesactualizadas.length > 0)
    .map((d) => ({ slug: d.slug, titulo: d.titulo, version: d.vigente?.version ?? '', variables: d.variablesDesactualizadas }));
  const seleccionado = vista ? documentos.find((d) => d.slug === vista.slug) ?? null : null;

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-6">
        <div>
          <h1 className="text-elegant-title" style={{ color: COLOR_TEXTO }}>
            Documentos legales
          </h1>
          <p className="mt-1 max-w-[65ch] text-sm" style={{ color: COLOR_SUAVE }}>
            Términos, aviso de privacidad, cookies y reembolsos. Edita el borrador y revisa la vista previa; al publicar
            eliges la versión, la fecha y el motivo. Una versión publicada nunca se edita: queda para consulta.
          </p>
        </div>

        {estado === 'cargando' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-busy="true">
            <span className="sr-only">Cargando los documentos legales…</span>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="mf-skeleton h-40 w-full" />
            ))}
          </div>
        )}

        {estado === 'sin-permiso' && (
          <Card padding="lg">
            <div className="flex flex-col items-start gap-3">
              <ShieldAlert size={28} aria-hidden style={{ color: 'var(--logo-branding)' }} />
              <h2 className="text-lg font-semibold" style={{ color: COLOR_TEXTO }}>
                No tienes permiso para editar los documentos legales.
              </h2>
              <p className="max-w-[65ch] text-sm" style={{ color: COLOR_SUAVE }}>
                Solo la administradora puede publicar versiones nuevas de los documentos legales.
              </p>
            </div>
          </Card>
        )}

        {estado === 'error' && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-[10px] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
            style={{ backgroundColor: 'color-mix(in srgb, var(--danger) 10%, var(--fondo-general))', color: 'var(--danger-texto)' }}
          >
            <span className="font-semibold">{error}</span>
            <Button variant="outline" onClick={() => setRecarga((n) => n + 1)}>
              Reintentar
            </Button>
          </div>
        )}

        {estado === 'listo' && (
          <>
            <AvisoReglasEnDocumentos afectados={afectados} onPreparar={preparar} preparando={preparando} />

            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {documentos.map((d) => {
                const activo = vista?.slug === d.slug;
                return (
                  <li key={d.slug}>
                    <Card padding="md" className="h-full">
                      <div className="flex h-full flex-col gap-3">
                        <div className="flex items-start gap-3">
                          <FileText size={22} aria-hidden className="mt-0.5 shrink-0" style={{ color: 'var(--logo-branding)' }} />
                          <div className="min-w-0">
                            <h2 className="font-semibold" style={{ color: COLOR_TEXTO }}>
                              {d.titulo}
                            </h2>
                            <p className="text-sm tabular-nums" style={{ color: COLOR_SUAVE }}>
                              {d.vigente ? `Versión ${d.vigente.version}, vigente desde el ${fechaLarga(d.vigente.vigenteDesde)}` : 'Sin versión publicada'}
                            </p>
                            {d.incluye && (
                              <p className="mt-1 text-sm" style={{ color: COLOR_SUAVE }}>
                                {d.incluye}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {d.programada && (
                            <Badge variant="info" size="sm">{`Versión ${d.programada.version} programada para el ${fechaLarga(d.programada.vigenteDesde)}`}</Badge>
                          )}
                          {d.borrador && <Badge variant="default" size="sm">Borrador guardado</Badge>}
                          {d.variablesDesactualizadas.length > 0 && <Badge variant="warning" size="sm">Requiere nueva versión</Badge>}
                        </div>
                        <div className="mt-auto flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                          <Button
                            variant={activo && vista?.modo === 'editar' ? 'primary' : 'outline'}
                            onClick={() => setVista({ slug: d.slug, modo: 'editar' })}
                            aria-pressed={activo && vista?.modo === 'editar'}
                          >
                            <FilePenLine size={16} aria-hidden />
                            Editar borrador
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setVista({ slug: d.slug, modo: 'historial' })}
                            aria-pressed={activo && vista?.modo === 'historial'}
                          >
                            <History size={16} aria-hidden />
                            Historial
                          </Button>
                          <Button variant="outline" asChild>
                            <a href={d.ruta} target="_blank" rel="noopener noreferrer">
                              <ExternalLink size={16} aria-hidden />
                              Ver página
                              <span className="sr-only"> (se abre en otra pestaña)</span>
                            </a>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>

            {seleccionado && vista?.modo === 'editar' && (
              <EditorDocumento
                key={`${seleccionado.slug}-${versionEditor}`}
                doc={seleccionado}
                {...ultimas(seleccionado)}
                onPublicado={(r) => publicado(seleccionado, r)}
                onBorradorCambio={() => setRecarga((n) => n + 1)}
              />
            )}
            {seleccionado && vista?.modo === 'historial' && <HistorialDocumento slug={seleccionado.slug} titulo={seleccionado.titulo} recarga={recarga} />}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
