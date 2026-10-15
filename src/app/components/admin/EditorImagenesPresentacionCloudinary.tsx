'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import Modal from '../ui/Modal';
import { SubirImagenesCloudinaryButton } from './SubirImagenesCloudinaryButton';

type Props = {
  urls: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  /** Texto del botón de subida. */
  uploadLabel?: string;
  /** Imágenes que llegan a la galería (servicios): pide elegir foto real o imagen ilustrativa antes de subir. */
  pedirTipo?: boolean;
};

/**
 * Solo subida a Cloudinary (sin pegar URLs): miniaturas, quitar y añadir más.
 */
export function EditorImagenesPresentacionCloudinary({
  urls,
  onChange,
  disabled,
  uploadLabel = 'Subir imágenes',
  pedirTipo = false,
}: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const effectivePreviewUrl = previewUrl && urls.includes(previewUrl) ? previewUrl : null;
  const urlsRef = useRef(urls);
  useEffect(() => {
    urlsRef.current = urls;
  }, [urls]);

  useEffect(() => {
    if (!effectivePreviewUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewUrl(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [effectivePreviewUrl]);

  const remove = (index: number) => {
    onChange(urls.filter((_, i) => i !== index));
  };

  /** Tras `await` en la subida, `urls` del render viejo estaría obsoleto; usamos ref. */
  const add = (newUrls: string[]) => {
    const limpias = newUrls.map((u) => String(u).trim()).filter(Boolean);
    const merged = [...urlsRef.current, ...limpias];
    onChange(merged);
  };

  return (
    <div className="space-y-2">
      {urls.length > 0 ? (
        <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
          {urls.map((url, i) => (
            <li
              key={`${i}-${url.slice(0, 64)}`}
              className="relative w-[76px] h-[76px] shrink-0 rounded-md overflow-hidden border"
              style={{ borderColor: 'var(--tarjetas-paneles)' }}
            >
              <button
                type="button"
                className="absolute inset-0 z-[1] block h-full w-full cursor-zoom-in overflow-hidden rounded-[inherit] p-0 text-left ring-offset-2 transition-shadow hover:ring-2 hover:ring-[var(--botones-principales)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--botones-principales)]"
                style={{ backgroundColor: 'transparent' }}
                onClick={() => setPreviewUrl(url)}
                aria-label={`Ver imagen ${i + 1} en grande`}
                title="Clic para ver en grande"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="pointer-events-none h-full w-full object-cover bg-negro/5"
                />
              </button>
              {/* Objetivo de 44x44 en la esquina (antes 24x24); el círculo visible sigue siendo pequeño. */}
              <button
                type="button"
                aria-label={`Quitar imagen ${i + 1}`}
                className="group absolute top-0 right-0 z-[2] flex h-11 w-11 items-start justify-end p-1 disabled:cursor-not-allowed"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(i);
                }}
                disabled={disabled}
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full shadow opacity-90 transition-opacity group-hover:opacity-100 group-disabled:opacity-50"
                  style={{ backgroundColor: 'var(--danger)', color: 'var(--blanco)' }}
                >
                  <X size={14} aria-hidden />
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
          Ninguna imagen aún. Sube una o varias desde tu dispositivo.
        </p>
      )}
      <SubirImagenesCloudinaryButton
        onUrlsAdded={add}
        disabled={disabled}
        label={uploadLabel}
        pedirTipo={pedirTipo}
      />

      <Modal
        isOpen={!!effectivePreviewUrl}
        onClose={() => setPreviewUrl(null)}
        title="Vista previa"
        size="xl"
      >
        {effectivePreviewUrl && (
          <div className="flex flex-col gap-2">
            <p className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
              Clic fuera del recuadro, el botón Cerrar o la tecla Escape para cerrar.
            </p>
            <div
              className="flex max-h-[min(85vh,900px)] w-full items-center justify-center overflow-auto rounded-md bg-negro/40 p-2"
              style={{ minHeight: '200px' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={effectivePreviewUrl}
                alt="Vista previa ampliada"
                className="max-h-[min(82vh,880px)] w-auto max-w-full object-contain"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
