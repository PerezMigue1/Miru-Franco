'use client';

import { useMemo, useState } from 'react';
import Button from '../ui/Button';
import FilaChipsDesplazable from '../cliente/FilaChipsDesplazable';
import GaleriaTrabajo from './GaleriaTrabajo';
import type { FotoGaleria } from '../../utils/galeria';

const TODAS = 'Todas';

/** Mosaico de la galería con chips por categoría del servicio (solo si hay más de una categoría). */
export default function GaleriaFiltrable({ fotos }: { fotos: FotoGaleria[] }) {
  const [categoria, setCategoria] = useState(TODAS);

  const categorias = useMemo(() => {
    const set = new Set(fotos.map((f) => f.categoria).filter((c): c is string => !!c));
    return [TODAS, ...[...set].sort((a, b) => a.localeCompare(b, 'es'))];
  }, [fotos]);

  const visibles = useMemo(() => fotos.filter((f) => categoria === TODAS || f.categoria === categoria), [fotos, categoria]);

  return (
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
      <GaleriaTrabajo key={categoria} fotos={visibles} etiqueta={categoria === TODAS ? 'Todas las fotos' : `Fotos de ${categoria}`} />
    </>
  );
}
