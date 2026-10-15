'use client';

import { useState } from 'react';
import Button from '../ui/Button';
import { subirImagenesCloudinary, type TipoImagenGaleria } from '../../utils/cloudinary';
import { showToast } from '../../utils/toast';
import ElegirTipoImagen from './ElegirTipoImagen';
import { errorTipoImagen } from './tipoImagenGaleria';

/** Solo bloquea tamaños absurdos (p. ej. ISO); el límite real lo marca Cloudinary. */
const MAX_BYTES_SANE = 120 * 1024 * 1024; // 120 MB

/**
 * Windows / diálogo «Archivos personalizados» a veces dejan `type` vacío y el nombre sin extensión.
 * OneDrive u “solo en línea” a veces devuelve `file.size` inflado: por eso **no** limitamos a 12 MB en cliente.
 */
function archivoPareceImagen(f: File): boolean {
  if (f.type.startsWith('image/')) return true;
  if (!f.type) {
    if (/\.(jpe?g|png|gif|webp|avif|bmp|heic|heif)$/i.test(f.name)) return true;
    return f.size > 0;
  }
  return false;
}

type Props = {
  /** Se llama con las `secure_url` devueltas por Cloudinary (en orden). */
  onUrlsAdded: (urls: string[]) => void;
  disabled?: boolean;
  /** Texto del botón cuando no está subiendo. */
  label?: string;
  /**
   * Imágenes que llegan a la galería (servicios): antes de subir hay que elegir, sin opción preseleccionada,
   * si es una foto real de un trabajo del salón o una imagen ilustrativa.
   */
  pedirTipo?: boolean;
};

/**
 * Selector de archivos locales → subida firmada a Cloudinary (carpeta galeria, una firma por lote; con
 * `pedirTipo` y "Imagen ilustrativa", carpeta galeria/ilustrativas).
 */
export function SubirImagenesCloudinaryButton({
  onUrlsAdded,
  disabled,
  label = 'Subir imágenes',
  pedirTipo = false,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoImagenGaleria | null>(null);
  const [errorTipo, setErrorTipo] = useState<string | null>(null);
  const bloqueado = disabled || busy || (pedirTipo && !tipo);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    try {
      const list = Array.from(input.files ?? []);
      if (!list.length) return;
      if (pedirTipo) {
        const falta = errorTipoImagen(tipo);
        if (falta) {
          setErrorTipo(falta);
          return;
        }
      }

      const absurd = list.find((f) => f.size > MAX_BYTES_SANE);
      if (absurd) {
        setError(
          `El archivo «${absurd.name}» indica un tamaño muy grande (${(absurd.size / (1024 * 1024)).toFixed(1)} MB). Si es una foto pequeña, descárgala del almacenamiento en la nube (OneDrive/Google) a esta carpeta y vuelve a elegirla, o elige otro archivo.`
        );
        return;
      }
      const notImage = list.find((f) => !archivoPareceImagen(f));
      if (notImage) {
        setError('Solo se permiten imágenes (JPG, PNG, WebP, etc.).');
        return;
      }

      setError(null);
      setBusy(true);
      try {
        const urls = await subirImagenesCloudinary(list, pedirTipo ? tipo ?? undefined : undefined);
        onUrlsAdded(urls);
        // Cada lote se clasifica de nuevo: el siguiente no hereda "real" o "ilustrativa" sin elegirlo.
        setTipo(null);
        if (urls.length) {
          showToast(`${urls.length} imagen(es) subida(s).`, 'success');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al subir';
        setError(msg);
        showToast(msg, 'error', 6000);
      } finally {
        setBusy(false);
      }
    } finally {
      input.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {pedirTipo && (
        <ElegirTipoImagen
          valor={tipo}
          onCambiar={(t) => {
            setTipo(t);
            setErrorTipo(null);
          }}
          disabled={disabled || busy}
          error={errorTipo}
        />
      )}
      {/*
        No usar input con display:none + .click(): en Chrome/Edge a veces no abre el diálogo.
        El input transparente encima del botón recibe el clic del usuario (gesto “real”).
      */}
      <div className="relative inline-flex self-start min-h-11 min-w-[8rem]">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={bloqueado}
          className="pointer-events-none select-none"
          tabIndex={-1}
          aria-hidden
        >
          {busy ? 'Subiendo…' : label}
        </Button>
        <input
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          disabled={bloqueado}
          aria-label={label}
          title={label}
          className="absolute inset-0 z-10 cursor-pointer opacity-0 w-full h-full disabled:cursor-not-allowed"
          onChange={onChange}
        />
      </div>
      {error && (
        <p
          role="alert"
          className="text-xs font-medium rounded px-2 py-1.5 border"
          style={{
            color: 'var(--danger-texto)',
            borderColor: 'var(--danger)',
            backgroundColor: 'var(--rojo-08)',
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
