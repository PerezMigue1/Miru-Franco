'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import { CheckCircle2, PowerOff, UserCog, Users } from 'lucide-react';
import {
  getUsuarios,
  getRoles,
  patchUsuarioEstado,
  patchUsuarioRol,
  type Usuario,
  type RolCatalogoItem,
  type RolValor,
} from '../../../services/usuarios';
import { api as authApi } from '../../../services/auth';

/** Roles de staff (referencia del panel de permisos a la derecha). */
const ROLES_PERMITIDOS = ['admin', 'estilista', 'empleado', 'becario'] as const;
/** Todos los roles que se pueden asignar desde el Select de la fila (incluye cliente). */
const ROLES_SELECCIONABLES = ['admin', 'estilista', 'empleado', 'becario', 'cliente'] as const;

function rolValorParaSelect(rol: string): string {
  const r = String(rol || '').toLowerCase().trim();
  if (r === 'becado') return 'becario';
  return r || 'empleado';
}

const ETIQUETAS_ROL: Record<string, string> = {
  admin: 'Administrador',
  estilista: 'Estilista',
  empleado: 'Empleado',
  becario: 'Becado',
  cliente: 'Cliente',
};

function rolLabel(rol: string): string {
  return ETIQUETAS_ROL[rolValorParaSelect(rol)] ?? rol;
}

export default function UsuariosRolesPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<RolCatalogoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [rolFiltro, setRolFiltro] = useState('all');
  const [miPropioId, setMiPropioId] = useState<string | null>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<{ usuario: Usuario; nuevoRol: string } | null>(null);

  const [cambiandoRolId, setCambiandoRolId] = useState<string | null>(null);
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState<Usuario | null>(null);

  // Siempre trae activos + inactivos (incluirInactivos=true): los KPIs (Activos/Inactivos)
  // necesitan el total real sin depender del toggle. El toggle solo filtra qué se MUESTRA
  // en la tabla (usuariosVisibles, más abajo), igual que ya se corrigió en Servicios.
  const loadData = async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const [usuariosRes, rolesRes] = await Promise.all([getUsuarios(q || undefined, true), getRoles()]);
      setUsuarios(usuariosRes);
      setRoles(rolesRes);
      const profileRes = await authApi.getProfile().catch(() => null);
      if (profileRes?.success && profileRes.data?.id) {
        setMiPropioId(profileRes.data.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
      setUsuarios([]);
      const rolesFallback = await getRoles().catch(() => []);
      setRoles(rolesFallback);
    } finally {
      setLoading(false);
    }
  };

  // Debounce solo cuando hay texto de búsqueda.
  useEffect(() => {
    const t = setTimeout(() => { loadData(busqueda); }, busqueda ? 300 : 0);
    return () => clearTimeout(t);
  }, [busqueda]);

  const handleCambiarRol = async (usuario: Usuario, nuevoRol: string) => {
    setCambiandoRolId(usuario.id);
    setError(null);
    try {
      const rolNormalizado = String(nuevoRol).toLowerCase().trim().replace('becado', 'becario') || usuario.rol;
      await patchUsuarioRol(usuario.id, rolNormalizado as RolValor);
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuario.id ? { ...u, rol: rolNormalizado } : u))
      );
      setSuccessMessage('Rol actualizado.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar rol.';
      const errWithValidation = err as Error & { validationErrors?: Record<string, string> };
      const details =
        errWithValidation.validationErrors && Object.keys(errWithValidation.validationErrors).length > 0
          ? ' ' +
            Object.entries(errWithValidation.validationErrors)
              .map(([k, v]) => `${k}: ${v}`)
              .join('. ')
          : '';
      const yaExplica = /quitarte|tu mismo|propio rol|no puedes|no está permitido/i.test(msg);
      const hint = yaExplica ? '' : ' Comprueba que tu usuario tenga permiso de administrador.';
      setError(msg + details + hint);
    } finally {
      setCambiandoRolId(null);
    }
  };

  /** El Select de la fila solo guarda el cambio pendiente; se aplica al confirmar el modal. */
  const solicitarCambioRol = (usuario: Usuario, nuevoRol: string) => {
    if (usuario.id === miPropioId) return; // guard extra; el Select ya está disabled para la propia fila
    if (rolValorParaSelect(usuario.rol) === rolValorParaSelect(nuevoRol)) return;
    setPendingRoleChange({ usuario, nuevoRol });
  };

  const handleConfirmarCambioRol = async () => {
    if (!pendingRoleChange) return;
    await handleCambiarRol(pendingRoleChange.usuario, pendingRoleChange.nuevoRol);
    setPendingRoleChange(null);
  };

  const handleActivar = async (usuario: Usuario) => {
    setCambiandoEstadoId(usuario.id);
    setError(null);
    try {
      await patchUsuarioEstado(usuario.id, true);
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuario.id ? { ...u, activo: true } : u))
      );
      setSuccessMessage('Usuario activado.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al cambiar estado. Comprueba que tu usuario tenga permiso de administrador.'
      );
    } finally {
      setCambiandoEstadoId(null);
    }
  };

  const handleEliminarClick = (usuario: Usuario) => {
    if (usuario.activo) {
      setUsuarioToDelete(usuario);
      setShowDeleteModal(true);
    }
  };

  const handleEliminarUsuario = async () => {
    if (!usuarioToDelete) return;
    setCambiandoEstadoId(usuarioToDelete.id);
    setError(null);
    try {
      await patchUsuarioEstado(usuarioToDelete.id, false);
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuarioToDelete.id ? { ...u, activo: false } : u))
      );
      setSuccessMessage('Usuario eliminado (desactivado).');
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowDeleteModal(false);
      setUsuarioToDelete(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al eliminar. Comprueba que tu usuario tenga permiso de administrador.'
      );
    } finally {
      setCambiandoEstadoId(null);
    }
  };

  const opcionesRolPermitidas = [
    { value: 'admin', label: 'Administrador' },
    { value: 'estilista', label: 'Estilista' },
    { value: 'empleado', label: 'Empleado' },
    { value: 'becario', label: 'Becado' },
  ];
  const opcionesRolSeleccionables = [...opcionesRolPermitidas, { value: 'cliente', label: 'Cliente' }];

  // Panel lateral "Roles" (referencia de permisos): solo staff, sin cambios.
  const rolesFiltrados = roles.filter((r) =>
    ROLES_PERMITIDOS.includes(r.valor as (typeof ROLES_PERMITIDOS)[number])
  );

  // Opciones del Select de cada fila (cambiar rol) y del filtro por rol: incluyen Cliente.
  const rolesSeleccionables = roles.filter((r) =>
    ROLES_SELECCIONABLES.includes(r.valor as (typeof ROLES_SELECCIONABLES)[number])
  );
  const opcionesRol =
    rolesSeleccionables.length > 0
      ? rolesSeleccionables.map((r) => ({
          value: r.valor,
          label: r.nombre === 'Becario' ? 'Becado' : r.nombre,
        }))
      : opcionesRolSeleccionables;

  const opcionesFiltroRol = [{ value: 'all', label: 'Todos los roles' }, ...opcionesRol];

  // Filtros combinados: estado (activo/inactivo) + rol. La búsqueda por texto ya la aplica el backend.
  const usuariosVisibles = usuarios
    .filter((u) => (mostrarInactivos ? !u.activo : u.activo))
    .filter((u) => rolFiltro === 'all' || rolValorParaSelect(u.rol) === rolFiltro);

  const totalUsuarios = usuarios.length;
  const usuariosActivos = usuarios.filter((u) => u.activo).length;
  const usuariosInactivos = usuarios.filter((u) => !u.activo).length;
  const totalClientes = usuarios.filter((u) => rolValorParaSelect(u.rol) === 'cliente').length;

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
            Usuarios y Roles
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
            {totalUsuarios} usuario{totalUsuarios === 1 ? '' : 's'} registrados
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card variant="elevated" padding="lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
              <Users size={20} style={{ color: 'var(--encabezados-alterno)' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Total usuarios</p>
              <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{totalUsuarios}</p>
            </div>
          </div>
        </Card>

        <Card variant="elevated" padding="lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
              <CheckCircle2 size={20} style={{ color: 'var(--encabezados-alterno)' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Activos</p>
              <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{usuariosActivos}</p>
            </div>
          </div>
        </Card>

        <Card
          variant="elevated"
          padding="lg"
          style={usuariosInactivos > 0 ? { boxShadow: '0 0 0 1.5px var(--warning), 0 4px 12px rgba(0,0,0,0.15)' } : undefined}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: usuariosInactivos > 0 ? 'rgba(217, 142, 4, 0.2)' : 'var(--fondos-suaves)' }}
            >
              <PowerOff size={20} style={{ color: usuariosInactivos > 0 ? 'var(--warning)' : 'var(--encabezados-alterno)' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Inactivos</p>
              <p className="text-2xl font-bold mt-0.5" style={{ color: usuariosInactivos > 0 ? 'var(--warning-texto)' : 'var(--menu-texto-principal)' }}>{usuariosInactivos}</p>
            </div>
          </div>
        </Card>

        <Card variant="elevated" padding="lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
              <UserCog size={20} style={{ color: 'var(--encabezados-alterno)' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Clientes</p>
              <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{totalClientes}</p>
            </div>
          </div>
        </Card>
      </div>

      {successMessage && (
        <p className="text-sm font-medium mb-4" style={{ color: 'var(--success-texto)' }}>
          {successMessage}
        </p>
      )}
      {error && (
        <Card className="mb-6 border-l-4" padding="md" style={{ borderLeftColor: 'var(--danger)' }}>
          <p className="text-sm" style={{ color: 'var(--danger-texto)' }}>{error}</p>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Input
          placeholder="Buscar por nombre, email o teléfono..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full sm:w-64"
        />
        <Select
          value={rolFiltro}
          onChange={(e) => setRolFiltro(e.target.value)}
          options={opcionesFiltroRol}
          className="w-full sm:w-48"
        />
        <label className="flex items-center gap-2 cursor-pointer text-sm px-2" style={{ color: 'var(--menu-texto-principal)' }}>
          <input
            type="checkbox"
            checked={mostrarInactivos}
            onChange={(e) => setMostrarInactivos(e.target.checked)}
            className="rounded"
          />
          Mostrar solo inactivos
        </label>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <Card className="xl:col-span-2 overflow-hidden">
          <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Usuarios
          </h2>
          {loading ? (
            <p className="text-sm py-4" style={{ color: 'var(--encabezados-alterno)' }}>
              Cargando usuarios...
            </p>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[600px] px-4 sm:px-0">
                <Table headers={['Nombre', 'Email', 'Teléfono', 'Rol', 'Estado', 'Acciones']} headerSutil>
                  {usuariosVisibles.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell className="font-semibold" rowPadding="lg">{usuario.nombre}</TableCell>
                      <TableCell className="text-sm" rowPadding="lg">{usuario.email}</TableCell>
                      <TableCell className="text-sm" rowPadding="lg">{usuario.telefono || '—'}</TableCell>
                      <TableCell rowPadding="lg">
                        <div className="flex flex-col gap-1">
                          <Badge variant={rolValorParaSelect(usuario.rol) === 'cliente' ? 'default' : 'info'} size="sm">
                            {rolLabel(usuario.rol)}
                          </Badge>
                          <Select
                            value={rolValorParaSelect(usuario.rol)}
                            onChange={(e) => solicitarCambioRol(usuario, e.target.value)}
                            options={opcionesRol}
                            className="min-w-[120px] sm:min-w-[130px] w-full max-w-[140px]"
                            disabled={cambiandoRolId === usuario.id || usuario.id === miPropioId}
                            title={usuario.id === miPropioId ? 'No puedes cambiar tu propio rol desde aquí' : undefined}
                          />
                        </div>
                      </TableCell>
                      <TableCell rowPadding="lg">
                        <Badge variant={usuario.activo ? 'success' : 'danger'}>
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell rowPadding="lg">
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          <Button size="sm" variant="outline" onClick={() => router.push(`/admin/usuarios-roles/${usuario.id}`)}>
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleEliminarClick(usuario)}
                            disabled={!usuario.activo || cambiandoEstadoId === usuario.id}
                            title="Eliminar (desactivar)"
                          >
                            Eliminar
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleActivar(usuario)}
                            disabled={usuario.activo || cambiandoEstadoId === usuario.id}
                            title="Activar"
                          >
                            {cambiandoEstadoId === usuario.id && !usuario.activo ? '...' : 'Activar'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </Table>
              </div>
            </div>
          )}
          {!loading && usuariosVisibles.length === 0 && (
            <p className="text-sm py-4" style={{ color: 'var(--encabezados-alterno)' }}>
              {mostrarInactivos ? 'No hay usuarios inactivos.' : 'No se encontraron usuarios con estos filtros.'}
            </p>
          )}
        </Card>

        <Card>
          <h2 className="text-page-title mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
            Roles
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
            Permisos predefinidos por rol.
          </p>
          {loading && roles.length === 0 ? (
            <p className="text-sm py-4" style={{ color: 'var(--encabezados-alterno)' }}>Cargando...</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {(rolesFiltrados.length ? rolesFiltrados : [
                { id: 1, valor: 'admin', nombre: 'Administrador', descripcion: 'Acceso total', permisos: 'Panel admin, usuarios' },
                { id: 2, valor: 'estilista', nombre: 'Estilista', descripcion: 'Servicios y agenda', permisos: 'Operación' },
                { id: 3, valor: 'empleado', nombre: 'Empleado', descripcion: 'Operaciones', permisos: 'Operación' },
                { id: 4, valor: 'becario', nombre: 'Becado', descripcion: 'Becario', permisos: 'Operación' },
              ]).map((rol) => (
                <div
                  key={rol.id}
                  className="p-3 sm:p-4 rounded-lg"
                  style={{ backgroundColor: 'var(--fondos-suaves)' }}
                >
                  <h3 className="font-semibold text-sm sm:text-base mb-1" style={{ color: 'var(--menu-texto-principal)' }}>
                    {rol.nombre === 'Becario' ? 'Becado' : rol.nombre}
                  </h3>
                  <p className="text-xs sm:text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                    {rol.descripcion}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                    {rol.permisos}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>


      {/* Modal: Eliminar Usuario */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Eliminar usuario"
        size="sm"
        footer={
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => { setShowDeleteModal(false); setUsuarioToDelete(null); }}
              disabled={cambiandoEstadoId !== null}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleEliminarUsuario}
              disabled={cambiandoEstadoId !== null}
              className="w-full sm:w-auto"
            >
              {cambiandoEstadoId ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        }
      >
        <p style={{ color: 'var(--menu-texto-principal)' }}>
          ¿Eliminar a &quot;{usuarioToDelete?.nombre}&quot;? Se desactivará y no podrá iniciar sesión.
        </p>
      </Modal>

      {/* Modal: Confirmar cambio de rol */}
      <Modal
        isOpen={!!pendingRoleChange}
        onClose={() => setPendingRoleChange(null)}
        title="Cambiar rol"
        size="sm"
        footer={
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => setPendingRoleChange(null)}
              disabled={cambiandoRolId !== null}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmarCambioRol}
              disabled={cambiandoRolId !== null}
              className="w-full sm:w-auto"
            >
              {cambiandoRolId ? 'Cambiando...' : 'Confirmar'}
            </Button>
          </div>
        }
      >
        {pendingRoleChange && (
          <p style={{ color: 'var(--menu-texto-principal)' }}>
            ¿Cambiar el rol de &quot;{pendingRoleChange.usuario.nombre}&quot; de{' '}
            <strong>{rolLabel(pendingRoleChange.usuario.rol)}</strong> a{' '}
            <strong>{rolLabel(pendingRoleChange.nuevoRol)}</strong>?
          </p>
        )}
      </Modal>
    </AdminLayout>
  );
}
