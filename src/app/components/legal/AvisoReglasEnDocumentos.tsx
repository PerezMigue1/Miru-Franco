'use client';

import Link from 'next/link';
import { FilePenLine, Scale } from 'lucide-react';
import Button from '../ui/Button';
import type { DocumentoAfectado, SlugEditable } from '../../services/documentosLegales';

/** Ruta del panel que prepara el borrador de un documento (Admin > Documentos legales lo lee al abrir). */
export const rutaPrepararVersion = (slug: SlugEditable) => `/admin/documentos-legales?preparar=${encodeURIComponent(slug)}`;

/** "Este cambio requiere publicar una nueva versión de Términos y Condiciones". */
export function textoAvisoDocumento(titulo: string): string {
  return `Este cambio requiere publicar una nueva versión de ${titulo}`;
}

/**
 * Aviso de Admin cuando una regla que aparece en un documento legal vigente cambió (o cambiaría): el documento sigue
 * publicado con el valor anterior hasta que se publique una versión nueva. Sirve en Admin > Documentos legales y en
 * Admin > Configuración del sitio (con documentosAfectadosPorReglas de services/documentosLegales.ts). Con
 * `onPreparar` el botón prepara el borrador ahí mismo; sin él, lleva a Admin > Documentos legales.
 */
export default function AvisoReglasEnDocumentos({
  afectados,
  onPreparar,
  preparando,
}: {
  afectados: DocumentoAfectado[];
  onPreparar?: (slug: SlugEditable) => void;
  preparando?: SlugEditable | null;
}) {
  if (afectados.length === 0) return null;
  return (
    <div
      role="status"
      className="space-y-3 rounded-[10px] border px-4 py-3 text-sm"
      style={{ backgroundColor: 'color-mix(in srgb, var(--warning) 12%, var(--fondo-general))', borderColor: 'var(--warning)', color: 'var(--warning-texto)' }}
    >
      {afectados.map((d) => (
        <div key={d.slug} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex gap-2 font-semibold">
              <Scale size={18} aria-hidden className="mt-0.5 shrink-0" />
              {textoAvisoDocumento(d.titulo)}
            </p>
            <ul className="mt-1 space-y-0.5 pl-7">
              {d.variables.map((v) => (
                <li key={v.nombre}>{`{${v.nombre}}: publicado ${v.publicado}, ahora ${v.actual}`}</li>
              ))}
            </ul>
          </div>
          {onPreparar ? (
            <Button variant="outline" className="shrink-0" onClick={() => onPreparar(d.slug)} disabled={preparando === d.slug}>
              <FilePenLine size={16} aria-hidden />
              {preparando === d.slug ? 'Preparando…' : 'Preparar nueva versión'}
            </Button>
          ) : (
            <Button variant="outline" className="shrink-0" asChild>
              <Link href={rutaPrepararVersion(d.slug)}>
                <FilePenLine size={16} aria-hidden />
                Preparar nueva versión
              </Link>
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
