'use client';

import { useId, useRef, useState } from 'react';
import { ImageOff, Trash2, Upload } from 'lucide-react';
import Button from '../../../components/ui/Button';
import ElegirTipoImagen from '../../../components/admin/ElegirTipoImagen';
import { errorTipoImagen } from '../../../components/admin/tipoImagenGaleria';
import { subirImagenSegura, vistaPreviaDe, type TipoImagenGaleria } from '../../../utils/cloudinary';
import { mensajeDeError } from '../../../utils/errorRed';
import { COLOR_SUAVE, MensajeError } from './piezas';
import { type DefCampo } from './validacionConfiguracion';

interface Props {
  id: string;
  def: DefCampo;
  /** La imagen guardada (URL) o la recién subida (public_id del servidor). */
  valor: string;
  onCambiar: (valor: string) => void;
  error?: string;
}

/** Lo que se puede mostrar de la imagen (guardada o recién subida); null si no hay vista previa. */
export const urlImagenMostrable = (valor: string) => vistaPreviaDe(valor);

/**
 * Imagen del sitio con vista previa y botón "Subir foto": subida segura a sitio/ (firma del servidor y public_id del
 * servidor; pide elegir si es foto real del salón o ilustrativa). Se puede cambiar o quitar. No hay campo para pegar
 * una URL: el backend la rechaza.
 */
export default function ImagenCloudinary({ id, def, valor, onCambiar, error }: Props) {
  const idArchivo = useId();
  const archivo = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState<TipoImagenGaleria | null>(null);
  const [errorSubida, setErrorSubida] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  const subir = async (file: File | undefined) => {
    if (!file) return;
    const falta = errorTipoImagen(tipo);
    if (falta) {
      setErrorSubida(falta);
      return;
    }
    setSubiendo(true);
    setErrorSubida(null);
    try {
      const { publicId } = await subirImagenSegura(file, 'sitio', { ilustrativa: tipo === 'ilustrativa' });
      onCambiar(publicId);
    } catch (e) {
      setErrorSubida(mensajeDeError(e, 'No se pudo subir la imagen. Intenta de nuevo.'));
    } finally {
      setSubiendo(false);
      if (archivo.current) archivo.current.value = '';
    }
  };

  const vista = urlImagenMostrable(valor);
  const idError = `${id}-error`;

  return (
    <div className="min-w-0 space-y-3" role="group" aria-labelledby={`${id}-titulo`} aria-describedby={error ? idError : undefined}>
      <p id={`${id}-titulo`} className="mf-etiqueta">
        {def.titulo}
      </p>
      <p className="text-xs" style={{ color: COLOR_SUAVE }}>
        {def.ayuda ?? 'Opcional. Sube una foto desde tu dispositivo (JPG, PNG o WebP).'}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <div
          className="grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-[10px] border sm:w-40"
          style={{ borderColor: 'var(--mf-linea-fuerte)', backgroundColor: 'var(--fondos-suaves)' }}
        >
          {vista ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vista} alt="Vista previa de la imagen" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span className="flex flex-col items-center gap-1 p-2 text-center text-xs" style={{ color: 'var(--menu-texto-principal)' }}>
              <ImageOff size={20} aria-hidden />
              Sin imagen
            </span>
          )}
        </div>
        <div className="min-w-0 space-y-2">
          <ElegirTipoImagen valor={tipo} onCambiar={(t) => { setTipo(t); setErrorSubida(null); }} disabled={subiendo} />
          <input ref={archivo} id={idArchivo} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => subir(e.target.files?.[0])} disabled={subiendo} tabIndex={-1} />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => (errorTipoImagen(tipo) ? setErrorSubida(errorTipoImagen(tipo)) : archivo.current?.click())} disabled={subiendo}>
              <Upload size={16} aria-hidden />
              {subiendo ? 'Subiendo…' : valor ? 'Cambiar foto' : 'Subir foto'}
            </Button>
            {valor && (
              <Button variant="outline-danger" onClick={() => onCambiar('')} disabled={subiendo}>
                <Trash2 size={16} aria-hidden />
                Quitar foto
              </Button>
            )}
          </div>
          {errorSubida && <MensajeError>{errorSubida}</MensajeError>}
          {!errorSubida && error && <MensajeError id={idError}>{error}</MensajeError>}
        </div>
      </div>
    </div>
  );
}
