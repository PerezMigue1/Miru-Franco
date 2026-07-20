'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { getRecomendaciones, type RecomendacionItem } from '../../services/recomendaciones';

interface RecomendacionesWidgetProps {
  /** Nombres de servicios/productos que el cliente ya tiene (carrito o cita). */
  items: string[];
  titulo?: string;
  topN?: number;
  className?: string;
}

/**
 * Sugerencias basadas en reglas de asociación (Apriori), como mini-tarjetas
 * en una fila con scroll horizontal que llevan al detalle real del producto
 * o servicio. Se oculta sola si no hay items, si aún no hay resultado, o si
 * el backend no encontró ninguna coincidencia — nunca muestra un bloque vacío.
 *
 * Si el backend no pudo resolver el nombre contra el catálogo actual
 * (`tipoItem: null`), la tarjeta se muestra igual pero sin acción de click,
 * en vez de ocultarla — sigue aportando la sugerencia como texto.
 */
export default function RecomendacionesWidget({
  items,
  titulo = 'Quizá también te interese',
  topN = 4,
  className = '',
}: RecomendacionesWidgetProps) {
  const router = useRouter();
  const [recomendaciones, setRecomendaciones] = useState<RecomendacionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const key = items.join('|');

  useEffect(() => {
    if (!items.length) {
      setRecomendaciones([]);
      return;
    }
    let cancelado = false;
    setLoading(true);
    getRecomendaciones(items, topN)
      .then(({ data }) => {
        if (!cancelado) setRecomendaciones(data);
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, topN]);

  if (!items.length) return null;
  if (!loading && recomendaciones.length === 0) return null;

  const irADetalle = (r: RecomendacionItem) => {
    if (!r.tipoItem || r.id == null) return;
    if (r.tipoItem === 'producto') {
      router.push(`/cliente/tienda-online/productos/${encodeURIComponent(String(r.id))}`);
    } else {
      router.push(`/cliente/servicios-citas/servicios/${encodeURIComponent(String(r.id))}`);
    }
  };

  return (
    <Card className={className} style={{ animation: 'fadeUp 400ms ease-out both' }}>
      <h3 className="text-subtitle mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
        {titulo}
      </h3>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
          Buscando sugerencias…
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {recomendaciones.map((r) => {
            const clicable = !!r.tipoItem && r.id != null;
            return (
              <div
                key={`${r.basadoEn}-${r.item}`}
                role={clicable ? 'button' : undefined}
                tabIndex={clicable ? 0 : undefined}
                onClick={clicable ? () => irADetalle(r) : undefined}
                onKeyDown={
                  clicable
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') irADetalle(r);
                      }
                    : undefined
                }
                className={`flex-shrink-0 w-36 rounded-lg transition-colors ${
                  clicable ? 'cursor-pointer hover:opacity-80' : ''
                }`}
                style={{ outline: 'none' }}
              >
                <div
                  className="w-36 h-32 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{ backgroundColor: 'var(--fondos-suaves)' }}
                >
                  {r.imagenUrl ? (
                    <Image
                      src={r.imagenUrl}
                      alt={r.item}
                      width={144}
                      height={128}
                      className="w-full h-full object-contain"
                      unoptimized
                    />
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--menu-texto-principal)' }}>
                      Imagen
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <div className="flex items-center gap-1 flex-wrap">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: 'var(--menu-texto-principal)' }}
                    >
                      {r.item}
                    </p>
                  </div>
                  {r.tipo === 'alta_confianza' && (
                    <Badge variant="success" size="sm">
                      Recomendado
                    </Badge>
                  )}
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--encabezados-alterno)' }}>
                    Porque ya tienes: {r.basadoEn}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
