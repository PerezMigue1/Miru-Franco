'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import { subirImagenesCloudinary } from '../../../../utils/cloudinary';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import { showToast } from '../../../../utils/toast';
import { copiarAlPortapapeles } from '../_lib/panelOperacion';

const AVISO_NO_COPIADO = 'No se pudo copiar. Selecciona la URL y cópiala a mano.';

export default function SubirImagenesPage() {
  const [subiendo, setSubiendo] = useState(false);
  const [urls, setUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setError(null);
    setUrls([]);
    setSubiendo(true);
    try {
      // Subida firmada a la carpeta galeria (sirve para productos y servicios).
      const resultado = await subirImagenesCloudinary(files);
      setUrls(resultado);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir');
    } finally {
      setSubiendo(false);
      e.target.value = '';
    }
  };

  const copiar = async (texto: string, indice: number) => {
    if (!(await copiarAlPortapapeles(texto, navigator.clipboard))) {
      showToast(AVISO_NO_COPIADO, 'error');
      return;
    }
    setCopiado(indice);
    setTimeout(() => setCopiado(null), 2000);
  };

  const copiarUrl = (url: string, index: number) => { void copiar(url, index); };

  const copiarTodas = () => { void copiar(urls.join('\n'), -1); };

  return (
    <OperacionLayout>
      <div className="max-w-2xl mx-auto py-4">
        <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
          Subir imágenes
        </h1>
        <p className="text-sm mt-1 mb-6" style={{ color: 'var(--encabezados-alterno)' }}>
          Selecciona una o varias imágenes y obtendrás las URLs para usar en productos o servicios.
        </p>

        <Card variant="elevated" padding="lg" className="mb-6">
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
          <Card variant="elevated" padding="md" className="mb-6" style={{ backgroundColor: 'color-mix(in srgb, var(--danger) 10%, var(--badge-base))', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--danger-texto) 35%, transparent)' }}>
            <p className="text-sm" style={{ color: 'var(--danger-texto)' }}>{error}</p>
          </Card>
        )}

        {urls.length > 0 && (
          <Card variant="elevated" padding="lg">
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
                      style={{ color: 'var(--texto-enlace-sobre-calido)' }}
                    >
                      {url}
                    </a>
                    <Button size="sm" variant="outline" onClick={() => copiarUrl(url, i)}>
                      {copiado === i ? '¡Copiado!' : 'Copiar'}
                    </Button>
                  </div>
                  <Image
                    src={url}
                    alt={`Vista previa ${i + 1}`}
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
              Pega estas URLs en el campo de imágenes al crear o editar un producto o un servicio.
            </p>
          </Card>
        )}
      </div>
    </OperacionLayout>
  );
}
