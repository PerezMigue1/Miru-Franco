'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import { subirImagenesCloudinary, PRESET_PRODUCTOS, PRESET_SERVICIOS } from '../../../../utils/cloudinary';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';

type Preset = 'productos' | 'servicios';

export default function SubirImagenesPage() {
  const [preset, setPreset] = useState<Preset>('productos');
  const [subiendo, setSubiendo] = useState(false);
  const [urls, setUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const presetNombre = preset === 'productos' ? (PRESET_PRODUCTOS || 'ml_productos') : (PRESET_SERVICIOS || 'ml_servicios');

  const handleSubir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setError(null);
    setUrls([]);
    setSubiendo(true);
    try {
      const presetValue = preset === 'productos' ? PRESET_PRODUCTOS : PRESET_SERVICIOS;
      if (!presetValue) {
        setError(`Preset de ${preset} no configurado en .env (NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_PRODUCTOS / _SERVICIOS)`);
        return;
      }
      const resultado = await subirImagenesCloudinary(files, presetValue);
      setUrls(resultado);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir');
    } finally {
      setSubiendo(false);
      e.target.value = '';
    }
  };

  const copiarUrl = (url: string, index: number) => {
    navigator.clipboard.writeText(url);
    setCopiado(index);
    setTimeout(() => setCopiado(null), 2000);
  };

  const copiarTodas = () => {
    const texto = urls.join('\n');
    navigator.clipboard.writeText(texto);
    setCopiado(-1);
    setTimeout(() => setCopiado(null), 2000);
  };

  return (
    <OperacionLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
          Subir imágenes a Cloudinary
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--encabezados-alterno)' }}>
          Elige el tipo, selecciona una o varias imágenes y obtendrás las URLs para usar en productos o servicios.
        </p>

        <Card className="mb-6 p-6">
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
            ¿Dónde guardar?
          </p>
          <div className="flex gap-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="preset"
                checked={preset === 'productos'}
                onChange={() => setPreset('productos')}
              />
              <span style={{ color: 'var(--menu-texto-principal)' }}>Productos</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="preset"
                checked={preset === 'servicios'}
                onChange={() => setPreset('servicios')}
              />
              <span style={{ color: 'var(--menu-texto-principal)' }}>Servicios</span>
            </label>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
            Preset: <strong>{presetNombre}</strong>
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleSubir}
            className="hidden"
          />
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={subiendo}
          >
            {subiendo ? 'Subiendo...' : 'Elegir imágenes y subir'}
          </Button>
        </Card>

        {error && (
          <Card className="mb-6 p-4" style={{ borderColor: 'var(--danger)' }}>
            <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
            <p className="text-xs mt-2" style={{ color: 'var(--encabezados-alterno)' }}>
              Revisa que en tu .env tengas NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME y NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_PRODUCTOS (y _SERVICIOS si usas servicios). En Cloudinary el preset debe ser Unsigned.
            </p>
          </Card>
        )}

        {urls.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                URLs generadas ({urls.length})
              </h2>
              <Button size="sm" variant="outline" onClick={copiarTodas}>
                {copiado === -1 ? '¡Copiado!' : 'Copiar todas'}
              </Button>
            </div>
            <ul className="space-y-3">
              {urls.map((url, i) => (
                <li key={i} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--encabezados-alterno)' }}>
                      {i + 1}.
                    </span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm truncate flex-1 hover:underline"
                      style={{ color: 'var(--enlaces-textos-interactivos)' }}
                    >
                      {url}
                    </a>
                    <Button size="sm" variant="outline" onClick={() => copiarUrl(url, i)}>
                      {copiado === i ? '¡Copiado!' : 'Copiar'}
                    </Button>
                  </div>
                  <Image
                    src={url}
                    alt={`Preview ${i + 1}`}
                    width={80}
                    height={80}
                    className="h-20 w-20 object-cover rounded border"
                    style={{ borderColor: 'var(--fondos-suaves)' }}
                    unoptimized
                  />
                </li>
              ))}
            </ul>
            <p className="text-xs mt-4" style={{ color: 'var(--encabezados-alterno)' }}>
              Usa estas URLs en el campo <strong>imagenes</strong> al crear o editar un producto en tu backend.
            </p>
          </Card>
        )}
      </div>
    </OperacionLayout>
  );
}
