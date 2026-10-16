'use client';

import { useEffect, useState } from 'react';
import { Eye, History, Lock } from 'lucide-react';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Modal from '../../../components/ui/Modal';
import {
  historialDocumentoLegal,
  versionDocumentoLegal,
  type HistorialDocumento as Historial,
  type SlugEditable,
  type VersionPublicada,
} from '../../../services/documentosLegales';
import { mensajeDeError } from '../../../utils/errorRed';
import { fechaCortaEnMexico, formatearFechaSoloDia } from '../../../utils/fechaSoloDia';
import { etiquetaEstado } from './editorDocumentos';
import VistaDocumento from './VistaDocumento';

const COLOR_TEXTO = 'var(--menu-texto-principal)';
const COLOR_SUAVE = 'var(--encabezados-alterno)';

const fechaLarga = (dia: string) => formatearFechaSoloDia(dia, { day: 'numeric', month: 'long', year: 'numeric' }) ?? dia;

/**
 * Historial de versiones de un documento (solo lectura): fecha de vigencia, cuándo y quién la publicó, el motivo y si
 * pidió volver a aceptar. Una versión publicada no se edita: para cambiarla se publica otra.
 */
export default function HistorialDocumento({ slug, titulo, recarga }: { slug: SlugEditable; titulo: string; recarga: number }) {
  const [historial, setHistorial] = useState<Historial | null>(null);
  const [error, setError] = useState('');
  const [viendo, setViendo] = useState<VersionPublicada | null>(null);
  const [cargandoTexto, setCargandoTexto] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    historialDocumentoLegal(slug)
      .then((h) => {
        if (!vigente) return;
        setHistorial(h);
        setError('');
      })
      .catch((e) => {
        if (vigente) setError(mensajeDeError(e, 'No se pudo cargar el historial.'));
      });
    return () => {
      vigente = false;
    };
  }, [slug, recarga]);

  const verTexto = async (version: string) => {
    setCargandoTexto(version);
    try {
      setViendo(await versionDocumentoLegal(slug, version));
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo abrir el texto de esa versión.'));
    } finally {
      setCargandoTexto(null);
    }
  };

  return (
    <Card padding="md">
      <h2 className="flex items-center gap-2 text-lg font-semibold" style={{ color: COLOR_TEXTO }}>
        <History size={20} aria-hidden style={{ color: 'var(--logo-branding)' }} />
        Historial de versiones
      </h2>
      <p className="mt-1 flex max-w-[65ch] items-start gap-2 text-sm" style={{ color: COLOR_SUAVE }}>
        <Lock size={14} aria-hidden className="mt-1 shrink-0" />
        Las versiones publicadas quedan solo para consulta: no se editan ni se borran.
      </p>

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium" style={{ color: 'var(--danger-texto)' }}>
          {error}
        </p>
      )}
      {!historial && !error && (
        <div className="mt-4 space-y-3" aria-busy="true">
          <span className="sr-only">Cargando el historial…</span>
          <div className="mf-skeleton h-20 w-full" />
          <div className="mf-skeleton h-20 w-full" />
        </div>
      )}

      {historial && (
        <ol className="mt-4 space-y-3">
          {historial.versiones.map((v) => (
            <li key={v.version} className="rounded-[10px] border px-4 py-3" style={{ borderColor: 'var(--mf-linea-fuerte)' }}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold tabular-nums" style={{ color: COLOR_TEXTO }}>
                  Versión {v.version}
                </p>
                <Badge variant={v.estado === 'vigente' ? 'success' : v.estado === 'programada' ? 'info' : 'default'} size="sm">
                  {etiquetaEstado(v.estado)}
                </Badge>
                <Badge variant={v.requiereAceptacion ? 'warning' : 'default'} size="sm">
                  {v.requiereAceptacion ? 'Pidió volver a aceptar' : 'Corrección menor'}
                </Badge>
              </div>
              <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <div>
                  <dt className="inline font-medium" style={{ color: COLOR_SUAVE }}>
                    Vigente desde:{' '}
                  </dt>
                  <dd className="inline" style={{ color: COLOR_TEXTO }}>
                    {fechaLarga(v.vigenteDesde)}
                  </dd>
                </div>
                <div>
                  <dt className="inline font-medium" style={{ color: COLOR_SUAVE }}>
                    Publicada:{' '}
                  </dt>
                  <dd className="inline" style={{ color: COLOR_TEXTO }}>
                    {`${fechaCortaEnMexico(v.publicadoEn) ?? ''}${v.publicadoPor ? `, por ${v.publicadoPor.nombre}` : ', antes del editor'}`}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="inline font-medium" style={{ color: COLOR_SUAVE }}>
                    Motivo:{' '}
                  </dt>
                  <dd className="inline break-words" style={{ color: COLOR_TEXTO }}>
                    {v.motivo ?? 'Sin motivo registrado (versión anterior al editor).'}
                  </dd>
                </div>
              </dl>
              {v.tieneTexto ? (
                <Button variant="outline" size="sm" className="mt-3" onClick={() => verTexto(v.version)} disabled={cargandoTexto === v.version}>
                  <Eye size={16} aria-hidden />
                  {cargandoTexto === v.version ? 'Abriendo…' : 'Ver el texto publicado'}
                </Button>
              ) : (
                <p className="mt-2 text-sm" style={{ color: COLOR_SUAVE }}>
                  El texto de esta versión no está en la base (se publicó antes del editor); queda su hash como constancia.
                </p>
              )}
            </li>
          ))}
        </ol>
      )}

      <Modal isOpen={!!viendo} onClose={() => setViendo(null)} title={viendo ? `${titulo}, versión ${viendo.version}` : undefined} size="xl">
        {viendo?.html ? <VistaDocumento html={viendo.html} etiqueta={`Texto publicado de la versión ${viendo.version}`} /> : null}
      </Modal>
    </Card>
  );
}
