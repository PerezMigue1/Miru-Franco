'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Modal from '../../../components/ui/Modal';
import { colors } from '../../../utils/colors';
import {
  getUsuarios,
  getUsuarioById,
  getRoles,
  createUsuario,
  updateUsuario,
  patchUsuarioEstado,
  patchUsuarioRol,
  type Usuario,
  type RolCatalogoItem,
  type RolValor,
} from '../../../services/usuarios';
import { api as authApi } from '../../../services/auth';

/** Normaliza el valor de rol para que coincida con el catálogo (backend puede devolver "Admin" o "admin"). */
function rolValorParaSelect(rol: string): string {
  const r = String(rol || '').toLowerCase().trim();
  return r || 'cliente';
}

export default function UsuariosRolesPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<RolCatalogoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isModalCrearOpen, setIsModalCrearOpen] = useState(false);
  const [formNombre, setFormNombre] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRol, setFormRol] = useState<string>('cliente');
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [editRol, setEditRol] = useState<string>('cliente');
  const [editPasswordNueva, setEditPasswordNueva] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [cambiandoRolId, setCambiandoRolId] = useState<string | null>(null);
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usuariosRes, rolesRes] = await Promise.all([getUsuarios(), getRoles()]);
      let list = usuariosRes;
      // Completar rol del usuario actual con GET /api/auth/me (el listado a veces no incluye rol)
      const profileRes = await authApi.getProfile().catch(() => null);
      if (profileRes?.success && profileRes.data?.id && profileRes.data?.rol) {
        const profileId = profileRes.data.id;
        const profileRol = String(profileRes.data.rol).toLowerCase().trim() || 'cliente';
        list = list.map((u) => (u.id === profileId ? { ...u, rol: profileRol } : u));
      }
      // Si el listado no trae rol para todos, completar con GET /api/usuarios/:id (cada usuario con rol real)
      const enriched = await Promise.all(
        list.map((u) => getUsuarioById(u.id).catch(() => u))
      );
      setUsuarios(enriched);
      setRoles(rolesRes);
      if (rolesRes.length && formRol === 'cliente' && !formNombre) setFormRol(rolesRes[0].valor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
      setUsuarios([]);
      const rolesFallback = await getRoles().catch(() => []);
      setRoles(rolesFallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openEditar = (usuario: Usuario) => {
    setEditingUser(usuario);
    setEditNombre(usuario.nombre);
    setEditEmail(usuario.email);
    setEditTelefono(usuario.telefono ?? '');
    setEditRol(rolValorParaSelect(usuario.rol));
    setEditPasswordNueva('');
    setError(null);
  };

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setCreateError(null);
    try {
      const nuevoUsuario = await createUsuario({
        nombre: formNombre.trim(),
        email: formEmail.trim().toLowerCase(),
        password: formPassword,
      });
      if (formRol && formRol !== 'cliente') {
        try {
          await patchUsuarioRol(nuevoUsuario.id, formRol as RolValor);
        } catch {
          setSuccessMessage('Usuario creado. Asigna el rol manualmente si no se aplicó.');
        }
      }
      setSuccessMessage('Usuario creado correctamente.');
      setIsModalCrearOpen(false);
      setFormNombre('');
      setFormEmail('');
      setFormPassword('');
      setFormRol(roles[0]?.valor ?? 'cliente');
      setCreateError(null);
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear usuario';
      const errWithValidation = err as Error & { validationErrors?: Record<string, string> };
      const details = errWithValidation.validationErrors && Object.keys(errWithValidation.validationErrors).length > 0
        ? '\n' + Object.entries(errWithValidation.validationErrors).map(([k, v]) => `• ${k}: ${v}`).join('\n')
        : '';
      const fullMessage = msg + details;
      setCreateError(fullMessage);
      setError(fullMessage);
    } finally {
      setSaving(false);
    }
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingEdit(true);
    setError(null);
    try {
      // El backend no acepta "email" ni "password" en el PUT; solo nombre, telefono, rol
      const payload: Parameters<typeof updateUsuario>[1] = {
        nombre: editNombre.trim(),
        telefono: editTelefono.trim() || null,
        rol: editRol as RolValor,
      };
      await updateUsuario(editingUser.id, payload);
      setSuccessMessage('Usuario actualizado.');
      setEditingUser(null);
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar';
      const errWithValidation = err as Error & { validationErrors?: Record<string, string> };
      const details = errWithValidation.validationErrors && Object.keys(errWithValidation.validationErrors).length > 0
        ? ' ' + Object.entries(errWithValidation.validationErrors).map(([k, v]) => `${k}: ${v}`).join('. ')
        : '';
      setError(msg + details);
    } finally {
      setSavingEdit(false);
    }
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleCambiarRol = async (usuario: Usuario, nuevoRol: string) => {
    setCambiandoRolId(usuario.id);
    setError(null);
    try {
      // Enviar rol en minúsculas para que el backend lo acepte (BD suele tener admin, cliente, etc.)
      const rolNormalizado = String(nuevoRol).toLowerCase().trim() || usuario.rol;
      await patchUsuarioRol(usuario.id, rolNormalizado as RolValor);
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuario.id ? { ...u, rol: rolNormalizado } : u))
      );
      setSuccessMessage('Rol actualizado.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar rol.';
      const errWithValidation = err as Error & { validationErrors?: Record<string, string> };
      const details = errWithValidation.validationErrors && Object.keys(errWithValidation.validationErrors).length > 0
        ? ' ' + Object.entries(errWithValidation.validationErrors).map(([k, v]) => `${k}: ${v}`).join('. ')
        : '';
      // No añadir hint genérico si el backend ya explicó el motivo (ej. "No puedes quitarte el rol de administrador")
      const yaExplica = /quitarte|tu mismo|propio rol|no puedes|no está permitido/i.test(msg);
      const hint = yaExplica ? '' : ' Comprueba que tu usuario tenga permiso de administrador.';
      setError(msg + details + hint);
    } finally {
      setCambiandoRolId(null);
    }
  };

  const handleToggleEstado = async (usuario: Usuario) => {
    setCambiandoEstadoId(usuario.id);
    setError(null);
    const nuevoActivo = !usuario.activo;
    try {
      await patchUsuarioEstado(usuario.id, nuevoActivo);
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuario.id ? { ...u, activo: nuevoActivo } : u))
      );
      setSuccessMessage(nuevoActivo ? 'Usuario activado.' : 'Usuario desactivado.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar estado. Comprueba que tu usuario tenga permiso de administrador.');
    } finally {
      setCambiandoEstadoId(null);
    }
  };

  const baseOpcionesRol = roles.length
    ? roles.map((r) => ({ value: r.valor, label: r.nombre }))
    : [
        { value: 'admin', label: 'Admin' },
        { value: 'estilista', label: 'Estilista' },
        { value: 'empleado', label: 'Empleado' },
        { value: 'becario', label: 'Becado' },
        { value: 'cliente', label: 'Cliente' },
      ];
  const valoresEnOpciones = new Set(baseOpcionesRol.map((o) => o.value));
  const opcionesRolExtra = usuarios
    .map((u) => rolValorParaSelect(u.rol))
    .filter((v) => v && !valoresEnOpciones.has(v))
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
  const opcionesRol = [...baseOpcionesRol, ...opcionesRolExtra];

  return (
    <AdminLayout>
      <PageHeader
        title="Usuarios y Roles"
        subtitle="Administra usuarios, roles y permisos del sistema"
        actions={
          <Button onClick={() => { setError(null); setIsModalCrearOpen(true); }}>
            + Nuevo Usuario
          </Button>
        }
      />

      {successMessage && (
        <p className="text-sm font-medium mb-4" style={{ color: colors.success }}>
          {successMessage}
        </p>
      )}
      {error && (
        <Card className="mb-6 border-l-4" padding="md" style={{ borderLeftColor: colors.danger }}>
          <p className="text-sm" style={{ color: colors.danger }}>{error}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
            Usuarios
          </h2>
          {loading ? (
            <p className="text-sm py-4" style={{ color: colors.encabezadosAlterno }}>
              Cargando usuarios...
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table headers={['Nombre', 'Email', 'Rol actual', 'Estado', 'Acciones']}>
                {usuarios.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell className="font-semibold">{usuario.nombre}</TableCell>
                    <TableCell>{usuario.email}</TableCell>
                    <TableCell>
                      <Select
                        value={rolValorParaSelect(usuario.rol)}
                        onChange={(e) => handleCambiarRol(usuario, e.target.value)}
                        options={opcionesRol}
                        className="min-w-[130px]"
                        disabled={cambiandoRolId === usuario.id}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant={usuario.activo ? 'success' : 'danger'}>
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditar(usuario)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant={usuario.activo ? 'danger' : 'primary'}
                          onClick={() => handleToggleEstado(usuario)}
                          disabled={cambiandoEstadoId === usuario.id}
                          title={usuario.activo ? 'Desactivar usuario' : 'Activar usuario'}
                        >
                          {cambiandoEstadoId === usuario.id
                            ? '...'
                            : usuario.activo
                            ? 'Desactivar usuario'
                            : 'Activar usuario'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </Table>
            </div>
          )}
          {!loading && usuarios.length === 0 && (
            <p className="text-sm py-4" style={{ color: colors.encabezadosAlterno }}>
              No hay usuarios o no tienes permiso para listarlos (GET /api/usuarios).
            </p>
          )}
        </Card>

        <Card>
          <h2 className="text-page-title mb-2" style={{ color: colors.menuTextoPrincipal }}>
            Roles del Sistema
          </h2>
          <p className="text-sm mb-4" style={{ color: colors.encabezadosAlterno }}>
            Cada rol tiene permisos predefinidos en el sistema. Esta lista es solo informativa; los permisos indican qué puede hacer cada tipo de usuario.
          </p>
          {loading && roles.length === 0 ? (
            <p className="text-sm py-4" style={{ color: colors.encabezadosAlterno }}>
              Cargando roles...
            </p>
          ) : (
            <div className="space-y-3">
              {roles.map((rol) => (
                <div
                  key={rol.id}
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: colors.fondosSuaves }}
                >
                  <h3 className="font-semibold mb-2" style={{ color: colors.menuTextoPrincipal }}>
                    {rol.nombre}
                  </h3>
                  <p className="text-sm mb-2" style={{ color: colors.encabezadosAlterno }}>
                    {rol.descripcion}
                  </p>
                  <p className="text-xs" style={{ color: colors.encabezadosAlterno }}>
                    Permisos: {rol.permisos}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Modal: Nuevo Usuario */}
      <Modal
        isOpen={isModalCrearOpen}
        onClose={() => { if (!saving) { setCreateError(null); setIsModalCrearOpen(false); } }}
        title="Nuevo Usuario"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setCreateError(null); setIsModalCrearOpen(false); }} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleCrearUsuario} disabled={saving}>
              {saving ? 'Creando...' : 'Crear Usuario'}
            </Button>
          </>
        }
      >
        {createError && (
          <div
            className="mb-4 p-3 rounded-lg text-sm border-l-4 whitespace-pre-line"
            style={{ borderLeftColor: colors.danger, color: colors.danger, backgroundColor: colors.fondosSuaves }}
          >
            {createError}
          </div>
        )}
        <div
          className="mb-4 p-3 rounded-lg text-sm"
          style={{ backgroundColor: colors.fondosSuaves, color: colors.encabezadosAlterno }}
        >
          <strong>Requisitos para crear un usuario:</strong>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li>Nombre obligatorio</li>
            <li>Email que no esté ya registrado</li>
            <li>Contraseña mínimo 6 caracteres (el backend puede exigir más: 8 caracteres, mayúscula, número, etc.)</li>
            <li>Debes estar logueado como administrador</li>
          </ul>
        </div>
        <form onSubmit={handleCrearUsuario} className="space-y-4">
          <Input
            label="Nombre Completo"
            placeholder="Nombre del usuario"
            value={formNombre}
            onChange={(e) => setFormNombre(e.target.value)}
            fullWidth
            required
          />
          <Input
            label="Email"
            type="email"
            placeholder="usuario@ejemplo.com"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
            fullWidth
            required
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={formPassword}
            onChange={(e) => setFormPassword(e.target.value)}
            fullWidth
            required
            minLength={6}
          />
          <Select
            label="Rol"
            value={formRol}
            onChange={(e) => setFormRol(e.target.value)}
            options={opcionesRol}
            fullWidth
          />
        </form>
      </Modal>

      {/* Modal: Editar Usuario */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => !savingEdit && setEditingUser(null)}
        title="Editar Usuario"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditingUser(null)} disabled={savingEdit}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarEdicion} disabled={savingEdit}>
              {savingEdit ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </>
        }
      >
        {editingUser && (
          <form onSubmit={handleGuardarEdicion} className="space-y-4">
            <Input
              label="Nombre Completo"
              value={editNombre}
              onChange={(e) => setEditNombre(e.target.value)}
              fullWidth
              required
            />
            <Input
              label="Email"
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              fullWidth
              disabled
              title="El email no se puede cambiar desde aquí (el backend no lo permite en la actualización)."
            />
            <Input
              label="Teléfono"
              type="tel"
              value={editTelefono}
              onChange={(e) => setEditTelefono(e.target.value)}
              placeholder="Opcional"
              fullWidth
            />
            <Select
              label="Rol"
              value={editRol}
              onChange={(e) => setEditRol(e.target.value)}
              options={opcionesRol}
              fullWidth
            />
            <p className="text-xs mt-2" style={{ color: colors.encabezadosAlterno }}>
              El cambio de contraseña no está disponible en esta pantalla (el backend no lo permite en la actualización). El usuario puede usar «Olvidé mi contraseña» en el login.
            </p>
          </form>
        )}
      </Modal>
    </AdminLayout>
  );
}
