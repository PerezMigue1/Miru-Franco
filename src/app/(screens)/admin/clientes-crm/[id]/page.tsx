'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import PageHeader from '../../../../components/ui/PageHeader';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import Input from '../../../../components/ui/Input';
import Table, { TableRow, TableCell } from '../../../../components/ui/Table';
import Modal from '../../../../components/ui/Modal';
import {
  getUsuarioById,
  getUsuarioDatosRelacionados,
  updateUsuario,
  patchUsuarioEstado,
  type Usuario,
  type UsuarioDatosRelacionados,
} from '../../../../services/usuarios';

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

export default function ClienteDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [cliente, setCliente] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rel, setRel] = useState<UsuarioDatosRelacionados>({ pedidos: [], notificaciones: [], direcciones: [] });

  const [formNombre, setFormNombre] = useState('');
  const [formTelefono, setFormTelefono] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getUsuarioById(id)
      .then((u) => {
        if (!cancelled) {
          setCliente(u);
          setFormNombre(u.nombre);
          setFormTelefono(u.telefono ?? '');
        }
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

  const handleGuardar = async () => {
    if (!cliente) return;
    setSaving(true);
    try {
      const actualizado = await updateUsuario(cliente.id, {
        nombre: formNombre.trim(),
        telefono: formTelefono.trim() || null,
      });
      setCliente(actualizado);
      setShowEditModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="layout-page py-12">
          <p className="text-center" style={{ color: 'var(--encabezados-alterno)' }}>Cargando cliente...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error || !cliente) {
    return (
      <AdminLayout>
        <div className="layout-page py-12">
          <p className="text-center" style={{ color: 'var(--danger)' }}>{error || 'Cliente no encontrado'}</p>
          <div className="text-center mt-4">
            <Button variant="outline" onClick={() => router.push('/admin/clientes-crm')}>
              Volver al listado
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const servicios: { id: number; servicio: string; fecha: string; especialista: string; precio: string; estado: string }[] =
    rel.pedidos.slice(0, 8).map((p) => ({
      id: p.id,
      servicio: `Pedido #${p.id}`,
      fecha: formatearFecha(p.creadoEn),
      especialista: '—',
      precio: `$${(p.total || 0).toFixed(2)}`,
      estado: p.estado,
    }));
  return (
    <AdminLayout>
      <PageHeader
        title={cliente.nombre}
        subtitle="Perfil del cliente"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowEditModal(true)}>Editar</Button>
            <Button onClick={() => router.push('/admin/gestion-citas')}>Nueva Cita</Button>
          </div>
        }
      />

      <div className="layout-page pb-12">
        <div className="w-full max-w-none">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
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

              <Card>
                <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  Seguridad y Sesión
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Cuenta confirmada</label>
                    <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>{siNo(cliente.confirmado !== false)}</p>
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Intentos login fallidos</label>
                    <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>{cliente.intentosLoginFallidos ?? 0}</p>
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Cuenta bloqueada hasta</label>
                    <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>{formatearFecha(cliente.cuentaBloqueadaHasta)}</p>
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Último intento login</label>
                    <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>{formatearFecha(cliente.ultimoIntentoLogin)}</p>
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Reset password expira</label>
                    <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>{formatearFecha(cliente.resetPasswordExpires)}</p>
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>OTP expira</label>
                    <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>{formatearFecha(cliente.otpExpira)}</p>
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Código OTP</label>
                    <p className="font-medium break-all" style={{ color: 'var(--menu-texto-principal)' }}>{cliente.codigoOtp || '—'}</p>
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Reset password token</label>
                    <p className="font-medium break-all" style={{ color: 'var(--menu-texto-principal)' }}>{cliente.resetPasswordToken || '—'}</p>
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Tokens revocados desde</label>
                    <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>{formatearFecha(cliente.tokensRevocadosDesde)}</p>
                  </div>
                </div>
              </Card>

              <Card>
                <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
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
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Pregunta de seguridad</label>
                    <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>{cliente.preguntaSeguridad || '—'}</p>
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Respuesta de seguridad</label>
                    <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>{cliente.respuestaSeguridad || '—'}</p>
                  </div>
                </div>
              </Card>

              <Card>
                <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  Historial de Servicios
                </h2>
                {servicios.length > 0 ? (
                  <Table headers={['Servicio', 'Fecha', 'Especialista', 'Precio', 'Estado']}>
                    {servicios.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.servicio}</TableCell>
                        <TableCell>{s.fecha}</TableCell>
                        <TableCell>{s.especialista}</TableCell>
                        <TableCell className="font-semibold">{s.precio}</TableCell>
                        <TableCell><Badge variant="success">{s.estado}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </Table>
                ) : (
                  <p className="text-sm py-6" style={{ color: 'var(--encabezados-alterno)' }}>
                    No hay historial de servicios registrado. Cuando exista un endpoint de citas/servicios, se mostrará aquí.
                  </p>
                )}
              </Card>

              <Card>
                <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
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

              <Card>
                <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
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
              <Card>
                <h3 className="text-subtitle mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
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
                    <span style={{ color: 'var(--encabezados-alterno)' }}>Pedidos ligados:</span>
                    <span className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>{rel.pedidos.length}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                    <span style={{ color: 'var(--encabezados-alterno)' }}>Direcciones ligadas:</span>
                    <span className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>{rel.direcciones.length}</span>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="text-subtitle mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  Acciones Rápidas
                </h3>
                <div className="space-y-2">
                  <Button fullWidth onClick={() => router.push('/admin/gestion-citas')}>
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

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Editar Cliente"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowEditModal(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleGuardar} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          <Input
            label="Nombre completo *"
            value={formNombre}
            onChange={(e) => setFormNombre(e.target.value)}
            placeholder="Nombre y apellidos"
            fullWidth
          />
          <Input
            label="Teléfono"
            value={formTelefono}
            onChange={(e) => setFormTelefono(e.target.value)}
            placeholder="555-0000"
            fullWidth
          />
          <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            El email no se puede cambiar desde aquí.
          </p>
        </div>
      </Modal>
    </AdminLayout>
  );
}
