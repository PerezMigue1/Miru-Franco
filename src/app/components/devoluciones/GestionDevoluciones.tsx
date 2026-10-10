'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  aprobarDevolucion,
  listarDevolucionesPaginado,
  listarPedidos,
  rechazarDevolucion,
  type DevolucionApi,
  type EstadoDevolucion,
  type MetodoReembolso,
  type PedidoApi,
} from '../../services/ecommerce';
import Modal from '../ui/Modal';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import Card from '../ui/Card';
import TarjetaKpi from '../ui/TarjetaKpi';
import Table, { TableRow, TableCell } from '../ui/Table';
import Badge from '../ui/Badge';
import Select from '../ui/Select';
import NuevaSolicitudDevolucion from '../admin/NuevaSolicitudDevolucion';
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, RotateCcw } from 'lucide-react';
import { diaEnMexico } from '../../utils/fechaSoloDia';
import { usePermisos } from '../../utils/permisos';
import { detalleMotivoDevolucion, etiquetaCausa, etiquetaEstadoDevolucion } from '../../utils/politicaDevolucion';

const POR_PAGINA = 20;
const PERMISO_GESTIONAR = 'devoluciones:gestionar';

const varianteEstado = (estado: string) =>
  estado === 'aprobada' ? 'success' : estado === 'rechazada' ? 'danger' : estado === 'pendiente' ? 'warning' : 'default';

type Resolucion = { devolucion: DevolucionApi; accion: 'aprobar' | 'rechazar' };

interface GestionDevolucionesProps {
  /**
   * Alta de solicitudes sobre pedidos ajenos (panel de admin). En operación se oculta: lista pedidos
   * ajenos y no todo rol con devoluciones:gestionar puede verlos; ahí la tarea es aprobar y rechazar.
   */
  conNuevaSolicitud?: boolean;
}

/**
 * Lista paginada de solicitudes de cambio y reembolso con Aprobar y Rechazar (devoluciones:gestionar).
 * La usan el panel de admin y el de operación.
 */
export default function GestionDevoluciones({ conNuevaSolicitud = true }: GestionDevolucionesProps) {
  const { tienePermiso } = usePermisos();
  const puedeGestionar = tienePermiso(PERMISO_GESTIONAR);

  const [solicitudes, setSolicitudes] = useState<DevolucionApi[]>([]);
  const [total, setTotal] = useState(0);
  const [pendientes, setPendientes] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [filtroEstado, setFiltroEstado] = useState<EstadoDevolucion | ''>('');
  const [pedidos, setPedidos] = useState<PedidoApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal de aprobar o rechazar
  const [resolucion, setResolucion] = useState<Resolucion | null>(null);
  const [metodo, setMetodo] = useState<MetodoReembolso>('metodo_original');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorResolucion, setErrorResolucion] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Una página con pedido, clienta y artículo incluidos (sin una llamada por pedido).
      const [pag, soloPendientes] = await Promise.all([
        listarDevolucionesPaginado({ page: pagina, limit: POR_PAGINA, estado: filtroEstado || undefined }),
        listarDevolucionesPaginado({ page: 1, limit: 1, estado: 'pendiente' }),
      ]);
      setSolicitudes(pag.data);
      setTotal(pag.count);
      setTotalPaginas(Math.max(1, pag.totalPages));
      setPendientes(soloPendientes.count);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  }, [pagina, filtroEstado]);

  useEffect(() => { void cargar(); }, [cargar]);

  useEffect(() => {
    if (!conNuevaSolicitud) return;
    listarPedidos().then(setPedidos).catch(() => setPedidos([]));
  }, [conNuevaSolicitud]);

  const abrirResolucion = (devolucion: DevolucionApi, accion: Resolucion['accion']) => {
    setResolucion({ devolucion, accion });
    setMetodo('metodo_original');
    setNota('');
    setErrorResolucion(null);
  };

  const cerrarResolucion = () => {
    if (!guardando) setResolucion(null);
  };

  const confirmarResolucion = async () => {
    if (!resolucion) return;
    const { devolucion, accion } = resolucion;
    setGuardando(true);
    setErrorResolucion(null);
    try {
      const notaLimpia = nota.trim() || undefined;
      if (accion === 'aprobar') {
        await aprobarDevolucion(devolucion.id, {
          ...(devolucion.tipo === 'reembolso' ? { metodoReembolso: metodo } : {}),
          nota: notaLimpia,
        });
      } else {
        await rechazarDevolucion(devolucion.id, { nota: notaLimpia });
      }
      setResolucion(null);
      await cargar();
    } catch (e) {
      setErrorResolucion(e instanceof Error ? e.message : 'No se pudo guardar la resolución');
    } finally {
      setGuardando(false);
    }
  };

  const desde = total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
  const hasta = Math.min(pagina * POR_PAGINA, total);
  const esReembolso = resolucion?.devolucion.tipo === 'reembolso';

  return (
    <>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div>
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
            Devoluciones y Cambios
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
            {total} solicitud{total === 1 ? '' : 'es'} · un reembolso aprobado en efectivo sale de la caja de quien lo aprueba y se descuenta en su siguiente corte
          </p>
        </div>

        {error && (
          <div role="alert" className="px-4 py-3 rounded-[10px] text-sm font-semibold" style={{ backgroundColor: 'var(--danger)', color: 'var(--marfil)', boxShadow: 'var(--mf-sombra-1)' }}>
            {error}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <TarjetaKpi icono={RotateCcw} etiqueta={filtroEstado ? 'Con este estado' : 'Total solicitudes'} valor={total} />

          <TarjetaKpi
            icono={Clock3}
            etiqueta="Pendientes"
            valor={pendientes}
            tono={pendientes > 0 ? 'aviso' : 'normal'}
            alerta={pendientes > 0}
          />

          {!filtroEstado && <TarjetaKpi icono={CheckCircle2} etiqueta="Resueltas o canceladas" valor={Math.max(0, total - pendientes)} />}
        </div>

        {/* Listado */}
        <Card variant="elevated" padding="lg">
          <div className="mb-4 max-w-xs">
            <Select
              label="Estado"
              value={filtroEstado}
              onChange={(e) => { setFiltroEstado(e.target.value as EstadoDevolucion | ''); setPagina(1); }}
              options={[
                { value: '', label: 'Todos' },
                { value: 'pendiente', label: 'Pendientes' },
                { value: 'aprobada', label: 'Aprobadas' },
                { value: 'rechazada', label: 'Rechazadas' },
                { value: 'cancelada', label: 'Canceladas por la clienta' },
              ]}
              fullWidth
            />
          </div>
          {loading ? (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>Cargando solicitudes…</p>
          ) : solicitudes.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>No hay solicitudes de devolución o cambio.</p>
          ) : (
            <>
              <Table headers={['Cliente', 'Producto', 'Solicitud', 'Monto', 'Fecha', 'Estado', 'Acciones']} headerSutil>
                {solicitudes.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-semibold" rowPadding="lg">
                      {d.clienteNombre || d.clienteEmail || '-'}
                      <span className="block text-xs font-normal" style={{ color: 'var(--encabezados-alterno)' }}>Pedido #{d.pedidoId}</span>
                    </TableCell>
                    <TableCell rowPadding="lg">{d.producto || 'Pedido completo'}</TableCell>
                    <TableCell rowPadding="lg">
                      <span className="block font-medium">
                        {d.tipo === 'reembolso' ? 'Reembolso' : d.tipo === 'cambio' ? 'Cambio' : 'Solicitud'}
                        {d.causa ? ` · ${etiquetaCausa(d.causa)}` : ''}
                      </span>
                      {detalleMotivoDevolucion(d) && <span className="block text-sm" style={{ color: 'var(--encabezados-alterno)' }}>{detalleMotivoDevolucion(d)}</span>}
                      {d.estado !== 'pendiente' && (d.resueltoPorNombre || d.notaResolucion) && (
                        <span className="block text-xs mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
                          {d.resueltoPorNombre ? `Resolvió: ${d.resueltoPorNombre}` : ''}
                          {d.metodoReembolso ? ` · ${d.metodoReembolso === 'efectivo' ? 'Efectivo' : 'Método original'}` : ''}
                          {d.notaResolucion ? ` · ${d.notaResolucion}` : ''}
                        </span>
                      )}
                    </TableCell>
                    <TableCell rowPadding="lg">{d.monto != null ? `$${d.monto.toLocaleString('es-MX')}` : '-'}</TableCell>
                    <TableCell rowPadding="lg">{diaEnMexico(d.creadoEn) ?? '-'}</TableCell>
                    <TableCell rowPadding="lg">
                      <Badge variant={varianteEstado(d.estado)}>{etiquetaEstadoDevolucion(d.estado)}</Badge>
                    </TableCell>
                    <TableCell rowPadding="lg">
                      {puedeGestionar && d.estado === 'pendiente' ? (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => abrirResolucion(d, 'aprobar')}>Aprobar</Button>
                          <Button size="sm" variant="outline" onClick={() => abrirResolucion(d, 'rechazar')}>Rechazar</Button>
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </Table>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
                <p className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                  Mostrando {desde}-{hasta} de {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="inline-flex items-center gap-1"
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    disabled={pagina <= 1 || loading}
                  >
                    <ChevronLeft size={14} /> Anterior
                  </Button>
                  <span className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                    Página {pagina} de {totalPaginas}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="inline-flex items-center gap-1"
                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                    disabled={pagina >= totalPaginas || loading}
                  >
                    Siguiente <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>

        {conNuevaSolicitud && <NuevaSolicitudDevolucion pedidos={pedidos} onCreada={() => void cargar()} />}
      </div>

      {/* Modal: aprobar o rechazar */}
      <Modal
        isOpen={resolucion !== null}
        onClose={cerrarResolucion}
        title={resolucion?.accion === 'aprobar' ? 'Aprobar solicitud' : 'Rechazar solicitud'}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={cerrarResolucion} disabled={guardando}>Volver</Button>
            <Button onClick={() => void confirmarResolucion()} disabled={guardando}>
              {guardando ? 'Guardando…' : resolucion?.accion === 'aprobar' ? 'Aprobar' : 'Rechazar'}
            </Button>
          </>
        }
      >
        {errorResolucion && <p role="alert" className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{errorResolucion}</p>}
        {resolucion && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
              {resolucion.devolucion.tipo === 'reembolso' ? 'Reembolso' : resolucion.devolucion.tipo === 'cambio' ? 'Cambio' : 'Solicitud'}
              {resolucion.devolucion.causa ? ` · ${etiquetaCausa(resolucion.devolucion.causa)}` : ''} del pedido #{resolucion.devolucion.pedidoId}
              {resolucion.devolucion.monto != null && (
                <> · Monto: <strong style={{ color: 'var(--menu-texto-principal)' }}>${resolucion.devolucion.monto.toLocaleString('es-MX')}</strong></>
              )}
            </p>
            {resolucion.accion === 'aprobar' && esReembolso && (
              <Select
                label="Cómo se devuelve el dinero"
                value={metodo}
                onChange={(e) => setMetodo(e.target.value as MetodoReembolso)}
                helperText={metodo === 'efectivo' ? 'Sale de tu caja y se descuenta en tu siguiente corte.' : 'Se devuelve al mismo medio con el que se pagó.'}
                options={[
                  { value: 'metodo_original', label: 'Método original' },
                  { value: 'efectivo', label: 'Efectivo en el salón' },
                ]}
                fullWidth
              />
            )}
            <Textarea
              label="Nota (opcional)"
              value={nota}
              maxLength={1000}
              onChange={(e) => setNota(e.target.value)}
              placeholder={resolucion.accion === 'aprobar' ? 'Ej. defecto confirmado en mostrador' : 'Ej. el producto está abierto'}
              rows={2}
              fullWidth
            />
          </div>
        )}
      </Modal>
    </>
  );
}
