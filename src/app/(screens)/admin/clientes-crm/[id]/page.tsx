'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import Table, { TableRow, TableCell } from '../../../../components/ui/Table';
import Modal from '../../../../components/ui/Modal';
import {
  getUsuarioById,
  getUsuarioDatosRelacionados,
  patchUsuarioEstado,
  type Usuario,
  type UsuarioDatosRelacionados,
} from '../../../../services/usuarios';
import { historialCitasCliente, historialComprasCliente } from '../../../../services/clientes';
import { listarQuejasPorCliente, type QuejaApi } from '../../../../services/quejas';
import { listarSeguimientosPorCliente, type SeguimientoApi } from '../../../../services/seguimientos';

function formatearFecha(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
}

function siNo(value?: boolean): string {
  return value ? 'Sí' : 'No';
}

function r(x: unknown): Record<string, unknown> {
  return x && typeof x === 'object' ? (x as Record<string, unknown>) : {};
}

const estadoQuejaLabel: Record<string, string> = {
  abierta: 'Abierta',
  en_proceso: 'En proceso',
  resuelta: 'Resuelta',
  cerrada: 'Cerrada',
};

/** Estado de carga de una sección secundaria de la ficha (independiente entre sí). */
type EstadoSeccion<T> = { loading: boolean; error: boolean; data: T[] };

export default function ClienteDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [cliente, setCliente] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rel, setRel] = useState<UsuarioDatosRelacionados>({ pedidos: [], notificaciones: [], direcciones: [] });

  const [citas, setCitas] = useState<EstadoSeccion<Record<string, unknown>>>({ loading: true, error: false, data: [] });
  const [compras, setCompras] = useState<EstadoSeccion<Record<string, unknown>>>({ loading: true, error: false, data: [] });
  const [quejas, setQuejas] = useState<EstadoSeccion<QuejaApi>>({ loading: true, error: false, data: [] });
  const [seguimientos, setSeguimientos] = useState<EstadoSeccion<SeguimientoApi>>({ loading: true, error: false, data: [] });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getUsuarioById(id)
      .then((u) => {
        if (!cancelled) setCliente(u);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error al cargar cliente');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    getUsuarioDatosRelacionados(id)
      .then((data) => {
        if (!cancelled) setRel(data);
      })
      .catch(() => {
        if (!cancelled) setRel({ pedidos: [], notificaciones: [], direcciones: [] });
      });

    historialCitasCliente(id)
      .then((data) => { if (!cancelled) setCitas({ loading: false, error: false, data: data.map(r) }); })
      .catch(() => { if (!cancelled) setCitas({ loading: false, error: true, data: [] }); });

    historialComprasCliente(id)
      .then((data) => { if (!cancelled) setCompras({ loading: false, error: false, data: data.map(r) }); })
      .catch(() => { if (!cancelled) setCompras({ loading: false, error: true, data: [] }); });

    listarQuejasPorCliente(id)
      .then((data) => { if (!cancelled) setQuejas({ loading: false, error: false, data }); })
      .catch(() => { if (!cancelled) setQuejas({ loading: false, error: true, data: [] }); });

    listarSeguimientosPorCliente(id)
      .then((data) => { if (!cancelled) setSeguimientos({ loading: false, error: false, data }); })
      .catch(() => { if (!cancelled) setSeguimientos({ loading: false, error: true, data: [] }); });

    return () => { cancelled = true; };
  }, [id]);

  const handleEliminar = async () => {
    if (!cliente) return;
    setSaving(true);
    try {
      await patchUsuarioEstado(cliente.id, false);
      router.push('/admin/clientes-crm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="w-full max-w-none py-12">
          <p className="text-center" style={{ color: 'var(--encabezados-alterno)' }}>Cargando cliente...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error || !cliente) {
    return (
      <AdminLayout>
        <div className="w-full max-w-none py-12">
          <p className="text-center" style={{ color: 'var(--danger-texto)' }}>{error || 'Cliente no encontrado'}</p>
          <div className="text-center mt-4">
            <Button variant="outline" onClick={() => router.push('/admin/clientes-crm')}>
              Volver al listado
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              {cliente.nombre}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              Perfil del cliente
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/admin/clientes-crm/${id}/editar`)}>Editar</Button>
            <Button variant="primary" onClick={() => router.push('/operacion/gestion-citas')}>Nueva Cita</Button>
          </div>
        </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card variant="elevated" padding="lg">
                <div className="flex items-center gap-2 mb-6">
                  <Badge variant={cliente.activo ? 'success' : 'danger'}>
                    {cliente.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                  {cliente.confirmado !== false && (
                    <Badge variant="success">Cuenta confirmada</Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Nombre completo</label>
                    <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>{cliente.nombre}</p>
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Teléfono</label>
                    <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>{cliente.telefono || '—'}</p>
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Email</label>
                    <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>{cliente.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Rol</label>
                    <p className="font-medium capitalize" style={{ color: 'var(--menu-texto-principal)' }}>{cliente.rol}</p>
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Fecha de nacimiento</label>
                    <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>{formatearFecha(cliente.fechaNacimiento)}</p>
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Google ID</label>
                    <p className="font-medium break-all" style={{ color: 'var(--menu-texto-principal)' }}>{cliente.googleId || '—'}</p>
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Foto (URL)</label>
                    <p className="font-medium break-all" style={{ color: 'var(--menu-texto-principal)' }}>{cliente.foto || '—'}</p>
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Acepta aviso privacidad</label>
                    <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>{siNo(cliente.aceptaAvisoPrivacidad)}</p>
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Recibe promociones</label>
                    <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>{siNo(cliente.recibePromociones)}</p>
                  </div>
                </div>
              </Card>

              <Card variant="elevated" padding="lg">
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  Perfil Capilar y Salud
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Tipo de cabello</label>
                    <p className="font-medium capitalize" style={{ color: 'var(--menu-texto-principal)' }}>{cliente.tipoCabello || '—'}</p>
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Color natural</label>
                    <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>{cliente.colorNatural || '—'}</p>
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Color actual</label>
                    <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>{cliente.colorActual || '—'}</p>
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Productos usados</label>
                    <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>{cliente.productosUsados || '—'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Alergias</label>
                    <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>{cliente.alergias || '—'}</p>
                  </div>
                </div>
              </Card>

              <Card variant="elevated" padding="lg">
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  Historial de Citas
                </h2>
                {citas.loading ? (
                  <p className="text-sm py-4" style={{ color: 'var(--encabezados-alterno)' }}>Cargando citas…</p>
                ) : citas.error ? (
                  <p className="text-sm py-4" style={{ color: 'var(--danger-texto)' }}>No se pudo cargar el historial de citas.</p>
                ) : citas.data.length > 0 ? (
                  <Table headers={['Servicio', 'Fecha', 'Especialista', 'Precio', 'Estado']}>
                    {citas.data.map((c) => {
                      const servicio = r(c.servicio);
                      const especialista = r(c.especialista);
                      return (
                        <TableRow key={String(c.id)}>
                          <TableCell>{String(servicio.nombre ?? '—')}</TableCell>
                          <TableCell>{formatearFecha(c.fechaHoraInicio as string | undefined)}</TableCell>
                          <TableCell>{String(especialista.nombre ?? '—')}</TableCell>
                          <TableCell className="font-semibold">
                            {servicio.precio != null ? `$${Number(servicio.precio).toFixed(2)}` : '—'}
                          </TableCell>
                          <TableCell><Badge variant="info">{String(c.estado ?? '—')}</Badge></TableCell>
                        </TableRow>
                      );
                    })}
                  </Table>
                ) : (
                  <p className="text-sm py-4" style={{ color: 'var(--encabezados-alterno)' }}>Sin registros de citas.</p>
                )}
              </Card>

              <Card variant="elevated" padding="lg">
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  Historial de Compras
                </h2>
                {compras.loading ? (
                  <p className="text-sm py-4" style={{ color: 'var(--encabezados-alterno)' }}>Cargando compras…</p>
                ) : compras.error ? (
                  <p className="text-sm py-4" style={{ color: 'var(--danger-texto)' }}>No se pudo cargar el historial de compras.</p>
                ) : compras.data.length > 0 ? (
                  <Table headers={['Pedido', 'Fecha', 'Artículos', 'Total', 'Estado']}>
                    {compras.data.map((p) => {
                      const items = Array.isArray(p.items) ? p.items : [];
                      return (
                        <TableRow key={String(p.id)}>
                          <TableCell>#{String(p.id)}</TableCell>
                          <TableCell>{formatearFecha(p.creadoEn as string | undefined)}</TableCell>
                          <TableCell>{items.length}</TableCell>
                          <TableCell className="font-semibold">
                            {p.total != null ? `$${Number(p.total).toFixed(2)}` : '—'}
                          </TableCell>
                          <TableCell><Badge variant="info">{String(p.estado ?? '—')}</Badge></TableCell>
                        </TableRow>
                      );
                    })}
                  </Table>
                ) : (
                  <p className="text-sm py-4" style={{ color: 'var(--encabezados-alterno)' }}>Sin registros de compras.</p>
                )}
              </Card>

              <Card variant="elevated" padding="lg">
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  Quejas
                </h2>
                {quejas.loading ? (
                  <p className="text-sm py-4" style={{ color: 'var(--encabezados-alterno)' }}>Cargando quejas…</p>
                ) : quejas.error ? (
                  <p className="text-sm py-4" style={{ color: 'var(--danger-texto)' }}>No se pudo cargar el historial de quejas.</p>
                ) : quejas.data.length > 0 ? (
                  <div className="space-y-2">
                    {quejas.data.map((q) => (
                      <div key={q.id} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>{q.asunto}</p>
                          <Badge variant={q.estado === 'resuelta' || q.estado === 'cerrada' ? 'success' : 'danger'}>
                            {estadoQuejaLabel[q.estado] ?? q.estado}
                          </Badge>
                        </div>
                        <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>{q.descripcion}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--encabezados-alterno)' }}>{formatearFecha(q.creadoEn)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm py-4" style={{ color: 'var(--encabezados-alterno)' }}>Sin registros de quejas.</p>
                )}
              </Card>

              <Card variant="elevated" padding="lg">
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  Seguimiento Post-Servicio
                </h2>
                {seguimientos.loading ? (
                  <p className="text-sm py-4" style={{ color: 'var(--encabezados-alterno)' }}>Cargando seguimientos…</p>
                ) : seguimientos.error ? (
                  <p className="text-sm py-4" style={{ color: 'var(--danger-texto)' }}>No se pudo cargar el seguimiento post-servicio.</p>
                ) : seguimientos.data.length > 0 ? (
                  <div className="space-y-2">
                    {seguimientos.data.map((sgm) => (
                      <div key={sgm.id} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                            {formatearFecha(sgm.fechaContacto)}
                          </p>
                          {sgm.requiereAccion && <Badge variant="danger">Requiere acción</Badge>}
                        </div>
                        <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>{sgm.notas}</p>
                        {sgm.satisfaccion != null && (
                          <p className="text-xs mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
                            Satisfacción: {sgm.satisfaccion}/5
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm py-4" style={{ color: 'var(--encabezados-alterno)' }}>Sin registros de seguimiento.</p>
                )}
              </Card>

              <Card variant="elevated" padding="lg">
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  Direcciones Ligadas
                </h2>
                {rel.direcciones.length > 0 ? (
                  <div className="space-y-2">
                    {rel.direcciones.map((d) => (
                      <div key={d.id} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                        <p className="text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                          {d.esPrincipal ? 'Principal' : 'Secundaria'}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                          {[d.calle, d.coloniaBarrio, d.municipioAlcaldia, d.estado, d.codigoPostal].filter(Boolean).join(', ') || '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm py-4" style={{ color: 'var(--encabezados-alterno)' }}>
                    No hay direcciones disponibles para este cliente.
                  </p>
                )}
              </Card>

              <Card variant="elevated" padding="lg">
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  Observaciones Importantes
                </h2>
                {rel.notificaciones.length > 0 ? (
                  <div className="space-y-2">
                    {rel.notificaciones.slice(0, 8).map((n) => (
                      <div key={n.id} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                        <p className="text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>{n.titulo}</p>
                        <p className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                          {n.tipo} · {formatearFecha(n.creadoEn)} · {n.leida ? 'Leída' : 'No leída'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm py-4" style={{ color: 'var(--encabezados-alterno)' }}>
                    No hay observaciones/notificaciones registradas.
                  </p>
                )}
                <div className="mt-4">
                  <Button variant="outline" disabled>Agregar Observación</Button>
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <Card variant="elevated" padding="lg">
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  Resumen
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                    <span style={{ color: 'var(--encabezados-alterno)' }}>Estado:</span>
                    <Badge variant={cliente.activo ? 'success' : 'danger'}>
                      {cliente.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                    <span style={{ color: 'var(--encabezados-alterno)' }}>Última actividad:</span>
                    <span className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                      {formatearFecha(cliente.ultimaActividad ?? cliente.creadoEn)}
                    </span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                    <span style={{ color: 'var(--encabezados-alterno)' }}>Cuenta creada:</span>
                    <span className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                      {formatearFecha(cliente.creadoEn)}
                    </span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                    <span style={{ color: 'var(--encabezados-alterno)' }}>Citas registradas:</span>
                    <span className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>{citas.data.length}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                    <span style={{ color: 'var(--encabezados-alterno)' }}>Compras registradas:</span>
                    <span className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>{compras.data.length}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                    <span style={{ color: 'var(--encabezados-alterno)' }}>Direcciones ligadas:</span>
                    <span className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>{rel.direcciones.length}</span>
                  </div>
                </div>
              </Card>

              <Card variant="elevated" padding="lg">
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  Acciones Rápidas
                </h3>
                <div className="space-y-2">
                  <Button fullWidth onClick={() => router.push('/operacion/gestion-citas')}>
                    Agendar Nueva Cita
                  </Button>
                  <Button fullWidth variant="outline" onClick={() => router.push('/admin/clientes-crm')}>
                    Volver al listado
                  </Button>
                  {cliente.activo && (
                    <Button fullWidth variant="danger" onClick={() => setShowDeleteModal(true)}>
                      Eliminar cliente
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          </div>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Eliminar cliente"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={saving}>Cancelar</Button>
            <Button variant="danger" onClick={handleEliminar} disabled={saving}>
              {saving ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </>
        }
      >
        <p style={{ color: 'var(--menu-texto-principal)' }}>
          ¿Eliminar a &quot;{cliente.nombre}&quot;? Se desactivará y no podrá iniciar sesión.
        </p>
      </Modal>
    </AdminLayout>
  );
}
