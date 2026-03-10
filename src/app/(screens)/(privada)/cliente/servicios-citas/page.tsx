'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import ModuleLayout from '../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../components/ui/PageHeader';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Input from '../../../../components/ui/Input';
import Badge from '../../../../components/ui/Badge';
import Select from '../../../../components/ui/Select';
import { getServicios } from '../../../../services/servicios';
import type { Servicio } from '../../../../services/servicios';

/** Parsea precio tipo "$350" o "350" a número para filtros. */
function precioANumero(precio?: string): number {
  if (!precio) return 0;
  const s = String(precio).replace(/[^0-9.,]/g, '').replace(',', '.');
  return parseFloat(s) || 0;
}

/** Devuelve la duración en minutos a partir del servicio. */
function duracionEnMinutos(servicio: Servicio): number {
  if (typeof servicio.duracionMinutos === 'number') return servicio.duracionMinutos;
  if (servicio.duracion) {
    const match = servicio.duracion.match(/(\d+(\.\d+)?)/);
    if (match) {
      const n = parseFloat(match[1]);
      if (!Number.isNaN(n)) return n;
    }
  }
  return 0;
}

export default function ListaServiciosPage() {
  const router = useRouter();
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('Todas');
  const [precioMin, setPrecioMin] = useState<string>('');
  const [precioMax, setPrecioMax] = useState<string>('');
  const [duracionMin, setDuracionMin] = useState<string>('');
  const [duracionMax, setDuracionMax] = useState<string>('');
  const [soloRequiereEvaluacion, setSoloRequiereEvaluacion] = useState<boolean>(false);
  const [especialistaSeleccionado, setEspecialistaSeleccionado] = useState<string>('');

  useEffect(() => {
    getServicios().then(({ data, error: err }) => {
      setServicios(data);
      setError(err ?? null);
      setLoading(false);
    });
  }, []);

  const categorias = useMemo(
    () =>
      ['Todas', ...Array.from(new Set(servicios.map((s) => s.categoria).filter(Boolean)) as Set<string>)],
    [servicios]
  );

  const especialistasDisponibles = useMemo(
    () => {
      const mapa = new Map<string, string>();
      servicios.forEach((s) => {
        s.especialistas?.forEach((e) => {
          const value = e.usuarioId;
          const label = e.nombre || e.usuarioId;
          if (value && !mapa.has(value)) {
            mapa.set(value, label);
          }
        });
      });
      return Array.from(mapa.entries()).map(([value, label]) => ({ value, label }));
    },
    [servicios]
  );

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();

    const minPrecio = precioMin.trim() !== '' ? parseFloat(precioMin) : undefined;
    const maxPrecio = precioMax.trim() !== '' ? parseFloat(precioMax) : undefined;
    const minDuracion = duracionMin.trim() !== '' ? parseFloat(duracionMin) : undefined;
    const maxDuracion = duracionMax.trim() !== '' ? parseFloat(duracionMax) : undefined;

    return servicios.filter((s) => {
      const textoNombre = s.nombre?.toLowerCase() ?? '';
      const textoCategoria = s.categoria?.toLowerCase() ?? '';
      const textoDescripcion = s.descripcion?.toLowerCase() ?? '';

      const cumpleBusqueda =
        !q ||
        textoNombre.includes(q) ||
        textoCategoria.includes(q) ||
        textoDescripcion.includes(q);

      const cumpleCategoria =
        categoriaSeleccionada === 'Todas' || s.categoria === categoriaSeleccionada;

      const precioNum = precioANumero(s.precio);
      const cumplePrecio =
        (minPrecio == null || precioNum >= minPrecio) &&
        (maxPrecio == null || precioNum <= maxPrecio);

      const durMin = duracionEnMinutos(s);
      const cumpleDuracion =
        (minDuracion == null || durMin >= minDuracion) &&
        (maxDuracion == null || durMin <= maxDuracion);

      const cumpleEval = !soloRequiereEvaluacion || s.requiereEvaluacion === true;

      const cumpleEspecialista =
        !especialistaSeleccionado ||
        s.especialistas?.some((e) => e.usuarioId === especialistaSeleccionado);

      return (
        cumpleBusqueda &&
        cumpleCategoria &&
        cumplePrecio &&
        cumpleDuracion &&
        cumpleEval &&
        cumpleEspecialista
      );
    });
  }, [
    servicios,
    busqueda,
    categoriaSeleccionada,
    precioMin,
    precioMax,
    duracionMin,
    duracionMax,
    soloRequiereEvaluacion,
    especialistaSeleccionado,
  ]);

  return (
    <ModuleLayout>
      <PageHeader
        title="Servicios Disponibles"
        subtitle="Explora nuestros servicios y agenda tu cita"
      />

      <div className="mb-6 space-y-3">
        <Input
          placeholder="Buscar servicio por nombre, categoría..."
          className="w-full max-w-md"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        {categorias.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {categorias.map((cat) => {
              const isActive = categoriaSeleccionada === cat;
              return (
                <Button
                  key={cat}
                  size="sm"
                  variant={isActive ? 'chip' : 'outline'}
                  onClick={() => setCategoriaSeleccionada(cat)}
                >
                  {cat}
                </Button>
              );
            })}
          </div>
        )}
        {especialistasDisponibles.length > 0 && (
          <div className="w-full max-w-xs">
            <Select
              label="Especialista"
              options={[
                { value: '', label: 'Cualquier especialista' },
                ...especialistasDisponibles,
              ]}
              value={especialistaSeleccionado}
              onChange={(e) => setEspecialistaSeleccionado(e.target.value)}
              fullWidth
            />
          </div>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current" style={{ color: 'var(--menu-texto-principal)' }} />
        </div>
      )}
      {error && !loading && (
        <p className="text-center py-6" style={{ color: 'var(--danger)' }}>{error}</p>
      )}
      {!loading && !error && filtrados.length === 0 && (
        <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>
          {busqueda.trim() ? 'No hay servicios que coincidan con la búsqueda.' : 'No hay servicios disponibles.'}
        </p>
      )}
      {!loading && !error && filtrados.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-72 flex-shrink-0">
            <Card className="p-4 space-y-4" style={{ backgroundColor: 'var(--tarjetas-paneles)' }}>
              <h3
                className="text-subtitle font-semibold"
                style={{ color: 'var(--menu-texto-principal)' }}
              >
                Filtros avanzados
              </h3>

              <div>
                <h4
                  className="text-sm font-semibold mb-2"
                  style={{ color: 'var(--encabezados-alterno)' }}
                >
                  Precio (MXN)
                </h4>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    placeholder="Mín"
                    value={precioMin}
                    onChange={(e) => setPrecioMin(e.target.value)}
                    min={0}
                    className="w-24"
                  />
                  <span style={{ color: 'var(--encabezados-alterno)' }}>–</span>
                  <Input
                    type="number"
                    placeholder="Máx"
                    value={precioMax}
                    onChange={(e) => setPrecioMax(e.target.value)}
                    min={0}
                    className="w-24"
                  />
                </div>
              </div>

              <div>
                <h4
                  className="text-sm font-semibold mb-2"
                  style={{ color: 'var(--encabezados-alterno)' }}
                >
                  Duración (minutos)
                </h4>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    placeholder="Mín"
                    value={duracionMin}
                    onChange={(e) => setDuracionMin(e.target.value)}
                    min={0}
                    className="w-24"
                  />
                  <span style={{ color: 'var(--encabezados-alterno)' }}>–</span>
                  <Input
                    type="number"
                    placeholder="Máx"
                    value={duracionMax}
                    onChange={(e) => setDuracionMax(e.target.value)}
                    min={0}
                    className="w-24"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="requiere-evaluacion"
                  type="checkbox"
                  checked={soloRequiereEvaluacion}
                  onChange={(e) => setSoloRequiereEvaluacion(e.target.checked)}
                  className="rounded"
                />
                <label
                  htmlFor="requiere-evaluacion"
                  className="text-sm"
                  style={{ color: 'var(--menu-texto-principal)' }}
                >
                  Solo servicios que requieren evaluación previa
                </label>
              </div>

              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={() => {
                  setPrecioMin('');
                  setPrecioMax('');
                  setDuracionMin('');
                  setDuracionMax('');
                  setSoloRequiereEvaluacion(false);
                }}
              >
                Limpiar filtros
              </Button>
            </Card>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtrados.map((servicio) => (
                <Card
                  key={servicio.id}
                  className="cursor-pointer text-left"
                  onClick={() => router.push(`/cliente/servicios-citas/servicios/${servicio.id}`)}
                >
                  <div className="mb-4">
                    <div
                      className="w-full h-48 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden"
                      style={{ backgroundColor: 'var(--fondos-suaves)' }}
                    >
                      {(() => {
                        const imgSrc = servicio.imagen ?? servicio.imagenes?.[0];
                        const isValidSrc =
                          typeof imgSrc === 'string' &&
                          (imgSrc.startsWith('http') || imgSrc.startsWith('/'));
                        return isValidSrc ? (
                          <Image
                            src={imgSrc}
                            alt={servicio.nombre}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 33vw"
                          />
                        ) : (
                          <span style={{ color: 'var(--menu-texto-principal)' }}>
                            Imagen del Servicio
                          </span>
                        );
                      })()}
                    </div>
                    <div className="flex items-start justify-between mb-2">
                      <h3
                        className="text-subtitle"
                        style={{ color: 'var(--menu-texto-principal)' }}
                      >
                        {servicio.nombre}
                      </h3>
                      {servicio.categoria && <Badge variant="info">{servicio.categoria}</Badge>}
                    </div>
                    {servicio.descripcion && (
                      <p
                        className="text-sm mb-3 line-clamp-2"
                        style={{ color: 'var(--encabezados-alterno)' }}
                      >
                        {servicio.descripcion}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        {servicio.duracion && (
                          <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                            Duración:{' '}
                            <span className="font-semibold">{servicio.duracion}</span>
                          </p>
                        )}
                        {servicio.precio && (
                          <p
                            className="text-lg font-bold mt-1"
                            style={{ color: 'var(--menu-texto-principal)' }}
                          >
                            {servicio.precio}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/cliente/servicios-citas/servicios/${servicio.id}`);
                        }}
                      >
                        Ver Detalles
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}













