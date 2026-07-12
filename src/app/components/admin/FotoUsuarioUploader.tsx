'use client';

import { useRef, useState } from 'react';
import { UserRound } from 'lucide-react';
import Button from '../ui/Button';
import { subirFotoPerfilCloudinary } from '../../utils/cloudinary';

type Props = {
  /** URL actual de la foto, o null/vacío si no tiene. */
  value: string | null;
  /**
   * Componente puramente controlado: solo sube a Cloudinary y notifica la URL resultante.
   * NO llama a ningún endpoint de usuario — el guardado real lo hace el botón "Guardar" de la pantalla.
   */
  onChange: (url: string | null) => void;
  disabled?: boolean;
};

/** Subida + previsualización de UNA sola foto (usuario), usando el preset de avatar. */
export default function FotoUsuarioUploader({ value, onChange, disabled }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const busy = disabled || uploading;
  const mostrarPreview = !!value?.trim() && !imgError;

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await subirFotoPerfilCloudinary(file);
      setImgError(false);
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la foto');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleQuitar = () => {
    setImgError(false);
    onChange(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="block mb-1 font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
        Foto
      </label>
      <div className="flex items-center gap-4">
        <div
          className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 border-2 flex items-center justify-center"
          style={{ borderColor: 'var(--encabezados-alterno)', backgroundColor: 'var(--fondos-suaves)' }}
        >
          {mostrarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value as string}
              alt="Foto de usuario"
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <UserRound size={28} style={{ color: 'var(--encabezados-alterno)' }} />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="relative inline-flex self-start min-h-[2.25rem] min-w-[8rem]">
            <Button type="button" size="sm" variant="outline" disabled={busy} className="pointer-events-none select-none" tabIndex={-1} aria-hidden>
              {uploading ? 'Subiendo…' : value ? 'Cambiar foto' : 'Subir foto'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={busy}
              aria-label={value ? 'Cambiar foto' : 'Subir foto'}
              className="absolute inset-0 z-10 cursor-pointer opacity-0 w-full h-full disabled:cursor-not-allowed"
              onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
            />
          </div>
          {value && (
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={handleQuitar}>
              Quitar foto
            </Button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
