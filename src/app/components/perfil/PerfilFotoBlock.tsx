'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Button from '../ui/Button';
import { getMiPerfil } from '../../services/auth';
import {
  mergePerfilEnLocalStorage,
  patchMiPerfil,
  type PerfilUsuarioCompleto,
} from '../../services/perfil';
import { subirFotoPerfilCloudinary } from '../../utils/cloudinary';
import { normalizarUrlImagenExterna } from '../../utils/normalizarUrlImagen';

function fotoUrlNormalizada(url: string | null | undefined): string | null {
  const n = normalizarUrlImagenExterna(url);
  return n || null;
}

export interface PerfilFotoBlockProps {
  /** URL inicial (p. ej. desde cabecera); si no hay, opcionalmente se carga del API */
  initialFotoUrl?: string | null;
  displayName?: string;
  /** Si true, al montar pide GET /api/auth/me para tener la foto actual */
  fetchOnMount?: boolean;
  disabled?: boolean;
  onUpdated?: (p: PerfilUsuarioCompleto) => void;
  /** compact = tarjeta en grid; full = bloque grande en formulario */
  variant?: 'compact' | 'full';
  className?: string;
}

export default function PerfilFotoBlock({
  initialFotoUrl = null,
  displayName = '',
  fetchOnMount = false,
  disabled = false,
  onUpdated,
  variant = 'full',
  className = '',
}: PerfilFotoBlockProps) {
  const [fotoUrl, setFotoUrl] = useState<string | null>(() => fotoUrlNormalizada(initialFotoUrl));
  const [fetching, setFetching] = useState(fetchOnMount);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFotoUrl(fotoUrlNormalizada(initialFotoUrl));
  }, [initialFotoUrl]);

  useEffect(() => {
    if (!fetchOnMount) return;
    let cancelled = false;
    (async () => {
      setFetching(true);
      setError(null);
      try {
        const p = await getMiPerfil();
        if (!cancelled) setFotoUrl(fotoUrlNormalizada(p.foto));
      } catch {
        /* sin API, se queda initial */
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchOnMount]);

  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';

  const sizeClass = variant === 'compact' ? 'w-20 h-20' : 'w-28 h-28';
  const textSize = variant === 'compact' ? 'text-2xl' : 'text-3xl';

  const busy = disabled || uploading || fetching;

  const handleFotoFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setOk(null);
    setUploading(true);
    try {
      const url = await subirFotoPerfilCloudinary(file);
      const updated = await patchMiPerfil({ foto: url });
      const next = fotoUrlNormalizada(updated.foto?.trim() ? updated.foto.trim() : url) || url;
      setFotoUrl(next);
      setOk('Foto guardada.');
      mergePerfilEnLocalStorage(updated, next);
      onUpdated?.(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la foto');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleQuitarFoto = async () => {
    setError(null);
    setOk(null);
    setUploading(true);
    try {
      const updated = await patchMiPerfil({ foto: null });
      setFotoUrl(null);
      setOk('Foto eliminada.');
      mergePerfilEnLocalStorage(updated);
      onUpdated?.(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo quitar la foto');
    } finally {
      setUploading(false);
    }
  };

  const inner = (
    <>
      {ok && (
        <p className="text-sm" style={{ color: 'var(--success)' }} role="status">
          {ok}
        </p>
      )}
      <div
        className={`flex flex-col sm:flex-row items-center gap-4 ${variant === 'full' ? 'sm:gap-6' : ''} ${variant === 'full' ? 'pb-6 border-b border-[var(--fondos-suaves)]' : ''}`}
      >
        <div
          className={`relative ${sizeClass} rounded-full overflow-hidden shrink-0 border-2 border-[var(--fondos-suaves)] bg-[var(--fondos-suaves)]`}
          style={variant === 'full' ? { boxShadow: '0 2px 12px rgba(0,0,0,0.08)' } : undefined}
        >
          {fotoUrl ? (
            <Image
              src={fotoUrl}
              alt={displayName.trim() ? `Foto de ${displayName.trim()}` : 'Foto de perfil'}
              fill
              className="object-cover"
              sizes={variant === 'compact' ? '80px' : '112px'}
              unoptimized={
                fotoUrl.startsWith('http') && !fotoUrl.includes('res.cloudinary.com')
              }
            />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center ${textSize} font-bold text-[var(--texto-fondo-oscuro)] bg-[var(--tarjetas-paneles)]`}
            >
              {initials}
            </div>
          )}
        </div>
        <div className="flex flex-col items-center sm:items-start gap-2 text-center sm:text-left min-w-0 flex-1">
          {variant === 'full' && (
            <p className="text-sm font-medium text-[var(--menu-texto-principal)]">Foto de perfil</p>
          )}
          {variant === 'compact' && (
            <p className="text-base font-bold text-[var(--menu-texto-principal)]">Tu foto de perfil</p>
          )}
          <p className="text-xs text-[var(--encabezados-alterno)] max-w-md">
            {variant === 'compact'
              ? 'JPG, PNG o WebP (máx. 5 MB). Se guarda en tu cuenta.'
              : 'JPG, PNG o WebP. Máx. 5 MB. Se sube a Cloudinary y se guarda la URL en tu cuenta.'}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={busy}
            onChange={(e) => void handleFotoFile(e.target.files?.[0] ?? null)}
          />
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? 'Subiendo…' : fetching ? 'Cargando…' : fotoUrl ? 'Cambiar foto' : 'Elegir foto'}
            </Button>
            {fotoUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void handleQuitarFoto()}
              >
                Quitar
              </Button>
            )}
          </div>
          {error && (
            <p className="text-sm" style={{ color: 'var(--danger)' }} role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </>
  );

  if (variant === 'compact') {
    return (
      <div
        className={`rounded-lg border border-[var(--fondos-suaves)] bg-[var(--tarjetas-paneles)] p-5 ${className}`}
      >
        {inner}
      </div>
    );
  }

  return <div className={className}>{inner}</div>;
}
