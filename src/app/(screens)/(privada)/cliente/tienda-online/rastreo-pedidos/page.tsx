'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ModuleLayout from '../../../../../components/layouts/ModuleLayout';
import Card from '../../../../../components/ui/Card';
import Badge from '../../../../../components/ui/Badge';
import Button from '../../../../../components/ui/Button';
import {
  listarPedidos,
  listarEnviosPorPedido,
  listarHistorialPedido,
  etiquetaEstadoPedido,
  varianteBadgeEstadoPedido,
} from '../../../../../services/ecommerce';
import type { PedidoApi, EnvioApi, HistorialEstadoPedidoApi } from '../../../../../services/ecommerce';
import { hasValidToken } from '../../../../../utils/security';

export default function RastreoPedidosPage() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<PedidoApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seleccionId, setSeleccionId] = useState<number | null>(null);
  const [envios, setEnvios] = useState<EnvioApi[]>([]);
  const [historial, setHistorial] = useState<HistorialEstadoPedidoApi[]>([]);
  const [detalleLoading, setDetalleLoading] = useState(false);

  useEffect(() => {
    if (!hasValidToken()) {
      setLoading(false);
      setError('Inicia sesión para ver el rastreo de tus pedidos.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await listarPedidos();
        if (cancelled) return;
        setPedidos(list);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error al cargar pedidos');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (seleccionId == null) {
      setEnvios([]);
      setHistorial([]);
      return;
    }
    let cancelled = false;
    setDetalleLoading(true);
    (async () => {
      try {
        const [e, h] = await Promise.all([
          listarEnviosPorPedido(seleccionId),
          listarHistorialPedido(seleccionId),
        ]);
        if (cancelled) return;
        setEnvios(e);
        setHistorial(h);
      } catch {
        if (!cancelled) {
          setEnvios([]);
          setHistorial([]);
        }
      } finally {
        if (!cancelled) setDetalleLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [seleccionId]);

  const pedidoSel = seleccionId != null ? pedidos.find((p) => p.id === seleccionId) : undefined;

  return (
    <ModuleLayout>
      <div className="max-w-6xl mx-auto py-4">
        <div className="text-center mb-8">
          <h1 className="text-hero mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Rastreo de pedidos
          </h1>
          <p className="text-lead" style={{ color: 'var(--encabezados-alterno)' }}>
            Estado de envío e historial según los datos del sistema
          </p>
        </div>

        {error && (
          <Card className="mb-6 p-6 text-center">
            <p className="mb-4" style={{ color: 'var(--danger)' }}>
              {error}
            </p>
            <Button variant="outline" onClick={() => router.push('/login')}>
              Ir a iniciar sesión
            </Button>
          </Card>
        )}

        {loading && !error && (
          <Card className="p-8 text-center">
            <p style={{ color: 'var(--encabezados-alterno)' }}>Cargando…</p>
          </Card>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            {pedidos.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
                  No hay pedidos para mostrar
                </p>
                <Button onClick={() => router.push('/cliente/tienda-online')}>Ir a la tienda</Button>
              </Card>
            ) : (
              pedidos.map((p) => (
                <Card key={p.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-subtitle" style={{ color: 'var(--menu-texto-principal)' }}>
                          Pedido #{p.id}
                        </h3>
                        <Badge variant={varianteBadgeEstadoPedido(p.estado)}>
                          {etiquetaEstadoPedido(p.estado)}
                        </Badge>
                      </div>
                      <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                        Total: ${p.total.toLocaleString()} {p.moneda} ·{' '}
                        {p.creadoEn ? new Date(p.creadoEn).toLocaleDateString('es-MX') : '—'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSeleccionId(seleccionId === p.id ? null : p.id)}
                    >
                      {seleccionId === p.id ? 'Ocultar rastreo' : 'Ver rastreo'}
                    </Button>
                  </div>

                  {seleccionId === p.id && (
                    <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
                      {detalleLoading ? (
                        <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                          Cargando envío e historial…
                        </p>
                      ) : (
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold mb-3" style={{ color: 'var(--menu-texto-principal)' }}>
                              Envío
                            </h4>
                            {envios.length === 0 ? (
                              <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                                Aún no hay registro de envío para este pedido.
                              </p>
                            ) : (
                              envios.map((env) => (
                                <div key={env.id} className="text-sm space-y-1 mb-4">
                                  <p style={{ color: 'var(--menu-texto-principal)' }}>
                                    <strong>Guía:</strong> {env.numeroGuia ?? '—'}
                                  </p>
                                  <p style={{ color: 'var(--menu-texto-principal)' }}>
                                    <strong>Empresa:</strong> {env.empresaEnvio ?? '—'}
                                  </p>
                                  <p style={{ color: 'var(--menu-texto-principal)' }}>
                                    <strong>Estado:</strong> {env.estadoEnvio}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold mb-3" style={{ color: 'var(--menu-texto-principal)' }}>
                              Historial de estados del pedido
                            </h4>
                            {historial.length === 0 ? (
                              <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                                Sin historial registrado.
                              </p>
                            ) : (
                              <ul className="space-y-2 text-sm">
                                {historial.map((h) => (
                                  <li key={h.id} style={{ color: 'var(--encabezados-alterno)' }}>
                                    <span className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
                                      {etiquetaEstadoPedido(h.estadoNuevo)}
                                    </span>
                                    {h.creadoEn && (
                                      <span className="block text-xs">
                                        {new Date(h.creadoEn).toLocaleString('es-MX')}
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        {pedidoSel && seleccionId === pedidoSel.id && pedidoSel.direccionTextoCompleta && (
          <Card className="mt-6 p-4">
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--menu-texto-principal)' }}>
              Dirección de envío
            </p>
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
              {pedidoSel.direccionTextoCompleta}
            </p>
          </Card>
        )}
      </div>
    </ModuleLayout>
  );
}
