'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BrainCircuit,
  CircleDollarSign,
  RefreshCw,
  ShoppingBag,
  Users,
} from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Table, { TableCell, TableRow } from '../ui/Table';
import {
  listarSegmentacionClientes,
  type ModeloClusteringApi,
  type SegmentacionClienteApi,
} from '../../services/clientes';

const SEGMENTOS = [
  'Sin compras registradas',
  'Recientes de consumo bajo',
  'Clientes ocasionales por reactivar',
  'Frecuentes de alto valor',
];

function varianteSegmento(
  cluster: number
): 'default' | 'success' | 'warning' | 'info' {
  if (cluster === 2) return 'success';
  if (cluster === 3) return 'warning';
  if (cluster === 0) return 'info';
  return 'default';
}

function moneda(valor: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(valor);
}

interface PanelSegmentacionClientesProps {
  /** El admin técnico puede navegar al perfil del cliente; operación no tiene esa ruta. */
  mostrarEnlacePerfil?: boolean;
}

export default function PanelSegmentacionClientes({
  mostrarEnlacePerfil = true,
}: PanelSegmentacionClientesProps) {
  const router = useRouter();
  const [clientes, setClientes] = useState<SegmentacionClienteApi[]>([]);
  const [modelo, setModelo] = useState<ModeloClusteringApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [segmento, setSegmento] = useState('');

  const cargar = async () => {
    setLoading(true);
    setError(null);
    try {
      const respuesta = await listarSegmentacionClientes(true);
      setClientes(respuesta.data);
      setModelo(respuesta.modelo);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo calcular la segmentación de clientes.'
      );
      setClientes([]);
      setModelo(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const resumen = useMemo(
    () =>
      clientes.reduce<Record<string, number>>((acc, cliente) => {
        acc[cliente.segmento] = (acc[cliente.segmento] ?? 0) + 1;
        return acc;
      }, {}),
    [clientes]
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return clientes.filter((cliente) => {
      const coincideTexto =
        !q ||
        cliente.clienteNombre.toLowerCase().includes(q) ||
        cliente.clienteEmail.toLowerCase().includes(q);
      const coincideSegmento = !segmento || cliente.segmento === segmento;
      return coincideTexto && coincideSegmento;
    });
  }, [busqueda, clientes, segmento]);

  const gastoTotal = clientes.reduce(
    (total, cliente) => total + cliente.variables.gasto_total,
    0
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1
            className="text-elegant-title"
            style={{ color: 'var(--menu-texto-principal)' }}
          >
            Segmentación de clientes
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--encabezados-alterno)' }}
          >
            Perfiles comerciales calculados desde compras online y ventas locales
          </p>
        </div>
        <Button
          variant="outline"
          onClick={cargar}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Calculando…' : 'Actualizar segmentos'}
        </Button>
      </div>

      <Card variant="elevated" padding="lg">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--fondos-suaves)' }}
          >
            <BrainCircuit
              size={26}
              style={{ color: 'var(--encabezados-alterno)' }}
            />
          </div>
          <div className="flex-1">
            <h2
              className="text-lg font-semibold"
              style={{ color: 'var(--menu-texto-principal)' }}
            >
              Modelo K-Means de patrones de compra
            </h2>
            <p
              className="text-sm mt-1"
              style={{ color: 'var(--encabezados-alterno)' }}
            >
              El modelo asigna el grupo más cercano usando frecuencia, productos,
              servicios, gasto, ticket, canal y recencia. Es una segmentación, no
              una probabilidad ni una calificación del cliente.
            </p>
          </div>
          {modelo && (
            <div className="text-sm lg:text-right">
              <p style={{ color: 'var(--menu-texto-principal)' }}>
                Entrenamiento: {modelo.filasEntrenamiento.toLocaleString('es-MX')} clientes
              </p>
              <p style={{ color: 'var(--encabezados-alterno)' }}>
                Silhouette: {modelo.silhouette.toFixed(4)}
              </p>
            </div>
          )}
        </div>
      </Card>

      {error && (
        <Card
          padding="md"
          className="border-l-4"
          style={{ borderLeftColor: 'var(--danger)' }}
        >
          <p className="text-sm" style={{ color: 'var(--danger-texto)' }}>
            {error}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {SEGMENTOS.map((nombre, index) => (
          <Card key={nombre} variant="elevated" padding="lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: 'var(--encabezados-alterno)' }}
                >
                  {nombre}
                </p>
                <p
                  className="text-3xl font-bold mt-2"
                  style={{ color: 'var(--menu-texto-principal)' }}
                >
                  {loading ? '…' : resumen[nombre] ?? 0}
                </p>
              </div>
              <Badge
                variant={varianteSegmento(
                  nombre === 'Sin compras registradas'
                    ? 1
                    : nombre === 'Recientes de consumo bajo'
                      ? 0
                      : nombre === 'Frecuentes de alto valor'
                        ? 2
                        : 3
                )}
                size="sm"
              >
                Grupo {index + 1}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="elevated" padding="lg">
          <div className="flex items-center gap-3">
            <Users size={20} style={{ color: 'var(--encabezados-alterno)' }} />
            <div>
              <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                Clientes segmentados
              </p>
              <p className="text-xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                {clientes.length}
              </p>
            </div>
          </div>
        </Card>
        <Card variant="elevated" padding="lg">
          <div className="flex items-center gap-3">
            <ShoppingBag size={20} style={{ color: 'var(--encabezados-alterno)' }} />
            <div>
              <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                Compras registradas
              </p>
              <p className="text-xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                {clientes.reduce(
                  (total, cliente) =>
                    total + cliente.variables.frecuencia_total,
                  0
                )}
              </p>
            </div>
          </div>
        </Card>
        <Card variant="elevated" padding="lg">
          <div className="flex items-center gap-3">
            <CircleDollarSign size={20} style={{ color: 'var(--encabezados-alterno)' }} />
            <div>
              <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                Gasto histórico analizado
              </p>
              <p className="text-xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                {moneda(gastoTotal)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card variant="elevated" padding="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Input
            placeholder="Buscar por nombre o correo…"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            fullWidth
          />
          <Select
            value={segmento}
            onChange={(event) => setSegmento(event.target.value)}
            options={[
              { value: '', label: 'Todos los segmentos' },
              ...SEGMENTOS.map((nombre) => ({
                value: nombre,
                label: nombre,
              })),
            ]}
            fullWidth
          />
        </div>

        {loading ? (
          <p
            className="py-10 text-center text-sm"
            style={{ color: 'var(--encabezados-alterno)' }}
          >
            Calculando segmentos con el historial de compras…
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table
              headers={[
                'Cliente',
                'Segmento',
                'Compras',
                'Gasto',
                'Recencia',
                'Acción sugerida',
                ...(mostrarEnlacePerfil ? ['Perfil'] : []),
              ]}
              headerSutil
            >
              {filtrados.map((cliente) => (
                <TableRow key={cliente.clienteId}>
                  <TableCell>
                    <p className="font-semibold">{cliente.clienteNombre}</p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: 'var(--encabezados-alterno)' }}
                    >
                      {cliente.clienteEmail}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={varianteSegmento(cliente.cluster)} size="sm">
                      {cliente.segmento}
                    </Badge>
                  </TableCell>
                  <TableCell>{cliente.variables.frecuencia_total}</TableCell>
                  <TableCell className="font-semibold">
                    {moneda(cliente.variables.gasto_total)}
                  </TableCell>
                  <TableCell>
                    {cliente.variables.recencia_dias.toLocaleString('es-MX')} días
                  </TableCell>
                  <TableCell className="min-w-[260px]">
                    <span className="text-sm">{cliente.accionSugerida}</span>
                  </TableCell>
                  {mostrarEnlacePerfil && (
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          router.push(
                            `/admin/clientes-crm/${cliente.clienteId}`
                          )
                        }
                      >
                        Ver
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </Table>
          </div>
        )}

        {!loading && filtrados.length === 0 && (
          <p
            className="py-8 text-center text-sm"
            style={{ color: 'var(--encabezados-alterno)' }}
          >
            No hay clientes que coincidan con los filtros.
          </p>
        )}
      </Card>
    </div>
  );
}
