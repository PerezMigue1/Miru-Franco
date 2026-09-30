'use client';

import { useEffect, useMemo, useState } from 'react';
import ModuleLayout from '../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../components/ui/PageHeader';
import Button from '../../../../components/ui/Button';
import FilaChipsDesplazable from '../../../../components/cliente/FilaChipsDesplazable';
import GaleriaTrabajo from '../../../../components/galeria/GaleriaTrabajo';
import GaleriaVacia from '../../../../components/galeria/GaleriaVacia';
import { getServicios } from '../../../../services/servicios';
import { fotosDeServicios, type FotoGaleria } from '../../../../utils/galeria';

const TODAS = 'Todas';

/**
 * Galería del salón: fotos reales de los servicios (las que el equipo sube desde
 * /operacion/subir-imagenes y asigna a cada servicio). Sin fotos, estado vacío; sin relleno.
 */
export default function GaleriaPage() {
  const [fotos, setFotos] = useState<FotoGaleria[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoria, setCategoria] = useState(TODAS);

  useEffect(() => {
    let vigente = true;
    getServicios().then(({ data, error: err }) => {
      if (!vigente) return;
      setFotos(fotosDeServicios(data));
      setError(err);
    });
    return () => {
      vigente = false;
    };
  }, []);

  const categorias = useMemo(() => {
    const set = new Set((fotos ?? []).map((f) => f.categoria).filter((c): c is string => !!c));
    return [TODAS, ...[...set].sort((a, b) => a.localeCompare(b, 'es'))];
  }, [fotos]);

  const visibles = useMemo(
    () => (fotos ?? []).filter((f) => categoria === TODAS || f.categoria === categoria),
    [fotos, categoria]
  );

  return (
    <ModuleLayout>
      <div className="w-full max-w-none py-4">
        <PageHeader
          title="Galería de Trabajos"
          subtitle={
            fotos && fotos.length === 0
              ? 'Aquí verás fotos de servicios hechos en Mirú Franco.'
              : 'Fotos de servicios hechos en Mirú Franco. Toca cualquiera para verla en grande.'
          }
        />

        {fotos === null ? (
          <div className="mf-galeria-mosaico" aria-busy="true" aria-label="Cargando galería">
            {Array.from({ length: 7 }, (_, i) => (
              <div
                key={i}
                className="mf-skeleton mf-galeria-celda"
                data-forma={i === 0 ? 'grande' : i === 4 ? 'alta' : i === 6 ? 'ancha' : 'normal'}
                style={{ borderRadius: 'var(--mf-radio)' }}
              />
            ))}
          </div>
        ) : fotos.length === 0 ? (
          <>
            {error && (
              <p role="alert" className="mb-4 text-sm" style={{ color: 'var(--danger-texto)' }}>
                No pudimos cargar las fotos en este momento. Intenta de nuevo más tarde.
              </p>
            )}
            <GaleriaVacia />
          </>
        ) : (
          <>
            {categorias.length > 2 && (
              <div className="mb-6">
                <FilaChipsDesplazable etiqueta="Filtrar por categoría">
                  {categorias.map((cat) => (
                    <Button
                      key={cat}
                      size="sm"
                      variant={categoria === cat ? 'chip' : 'outline'}
                      className="shrink-0 whitespace-nowrap"
                      aria-pressed={categoria === cat}
                      onClick={() => setCategoria(cat)}
                    >
                      {cat}
                    </Button>
                  ))}
                </FilaChipsDesplazable>
              </div>
            )}
            <GaleriaTrabajo
              key={categoria}
              fotos={visibles}
              etiqueta={categoria === TODAS ? 'Todas las fotos' : `Fotos de ${categoria}`}
            />
          </>
        )}
      </div>
    </ModuleLayout>
  );
}
