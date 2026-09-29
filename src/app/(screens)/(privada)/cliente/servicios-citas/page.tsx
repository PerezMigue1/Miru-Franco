'use client';

import { useEffect, useState, useMemo } from 'react';
import { SearchX, SlidersHorizontal } from 'lucide-react';
import TarjetaServicio from '../../../../components/servicios/TarjetaServicio';
import FilaChipsDesplazable from '../../../../components/cliente/FilaChipsDesplazable';
import ModuleLayout from '../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../components/ui/PageHeader';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Input from '../../../../components/ui/Input';
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
  // Móvil: filtros plegados para que los servicios queden a la vista (en escritorio siempre visibles).
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

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
          <FilaChipsDesplazable>
            {categorias.map((cat) => {
              const isActive = categoriaSeleccionada === cat;
              return (
                <Button
                  key={cat}
                  size="sm"
                  variant={isActive ? 'chip' : 'outline'}
                  className="shrink-0 whitespace-nowrap"
                  onClick={() => setCategoriaSeleccionada(cat)}
                >
                  {cat}
                </Button>
              );
            })}
          </FilaChipsDesplazable>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6" aria-busy="true" aria-label="Cargando servicios">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="overflow-hidden" style={{ borderRadius: 'var(--mf-radio)', backgroundColor: 'var(--tarjetas-paneles)' }}>
              <div className="mf-skeleton aspect-[4/3]" style={{ borderRadius: 0 }} />
              <div className="p-5 space-y-3">
                <div className="mf-skeleton h-3 w-1/3" />
                <div className="mf-skeleton h-5 w-2/3" />
                <div className="mf-skeleton h-4 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      )}
      {error && !loading && (
        <p className="text-center py-6" style={{ color: 'var(--danger-texto)' }}>{error}</p>
      )}
      {!loading && !error && filtrados.length === 0 && (
        <Card className="text-center py-14 px-6">
          <SearchX size={36} strokeWidth={1.5} className="mx-auto mb-4" style={{ color: 'var(--logo-branding)' }} aria-hidden />
          <p className="text-lg font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
            {busqueda.trim() ? 'No hay servicios que coincidan con la búsqueda.' : 'No hay servicios disponibles.'}
          </p>
        </Card>
      )}
      {!loading && !error && filtrados.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-72 flex-shrink-0 lg:self-start lg:sticky lg:top-[calc(var(--mf-header-offset,136px)+1rem)]">
            <Button
              variant="outline"
              fullWidth
              className="lg:hidden inline-flex items-center justify-center gap-2"
              aria-expanded={filtrosAbiertos}
              aria-controls="panel-filtros-servicios"
              onClick={() => setFiltrosAbiertos((v) => !v)}
            >
              <SlidersHorizontal size={16} aria-hidden />
              {filtrosAbiertos ? 'Ocultar filtros' : 'Mostrar filtros'}
            </Button>
            <Card
              id="panel-filtros-servicios"
              className={`p-5 space-y-4 mt-3 lg:mt-0 ${filtrosAbiertos ? '' : 'hidden'} lg:block`}
              style={{ backgroundColor: 'var(--tarjetas-paneles)' }}
            >
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtrados.map((servicio, index) => (
                <TarjetaServicio key={servicio.id} servicio={servicio} indice={index} />
              ))}
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}













