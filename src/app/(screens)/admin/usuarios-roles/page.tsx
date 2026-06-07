'use client';

import { useEffect, useState, useRef } from 'react';
import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Textarea from '../../../components/ui/Textarea';
import Modal from '../../../components/ui/Modal';
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

const ROLES_PERMITIDOS = ['admin', 'estilista', 'empleado', 'becario'] as const;

function rolValorParaSelect(rol: string): string {
  const r = String(rol || '').toLowerCase().trim();
  if (r === 'becado') return 'becario';
  return r || 'empleado';
}

function esRolPermitido(rol: string): boolean {
  const r = rolValorParaSelect(rol);
  return ROLES_PERMITIDOS.includes(r as (typeof ROLES_PERMITIDOS)[number]);
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
  const [formTelefono, setFormTelefono] = useState('');
  const [formRol, setFormRol] = useState<string>('empleado');
  const [formFechaNacimiento, setFormFechaNacimiento] = useState('');
  const [formPregunta, setFormPregunta] = useState('');
  const [formRespuesta, setFormRespuesta] = useState('');
  const [preguntasSeguridad, setPreguntasSeguridad] = useState<Array<{ id?: string; pregunta: string }>>([]);
  const [loadingPreguntas, setLoadingPreguntas] = useState(false);
  const [verificandoEmail, setVerificandoEmail] = useState(false);
  const [emailYaRegistrado, setEmailYaRegistrado] = useState(false);
  const emailTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [formTipoCabello, setFormTipoCabello] = useState('liso');
  const [formTieneAlergias, setFormTieneAlergias] = useState(false);
  const [formAlergias, setFormAlergias] = useState('');
  const [formTratamientosQuimicos, setFormTratamientosQuimicos] = useState(false);
  const [formTratamientos, setFormTratamientos] = useState('');
  const [formAceptaAviso, setFormAceptaAviso] = useState(true);
  const [formRecibePromo, setFormRecibePromo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [editRol, setEditRol] = useState<string>('empleado');
  const [savingEdit, setSavingEdit] = useState(false);

  const [cambiandoRolId, setCambiandoRolId] = useState<string | null>(null);
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState<Usuario | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usuariosRes, rolesRes] = await Promise.all([getUsuarios(), getRoles()]);
      let list = usuariosRes;
      const profileRes = await authApi.getProfile().catch(() => null);
      if (profileRes?.success && profileRes.data?.id && profileRes.data?.rol) {
        const profileId = profileRes.data.id;
        const profileRol = String(profileRes.data.rol).toLowerCase().trim() || 'admin';
        list = list.map((u) => (u.id === profileId ? { ...u, rol: profileRol } : u));
      }
      const enriched = await Promise.all(
        list.map((u) => getUsuarioById(u.id).catch(() => u))
      );
      const soloPersonal = enriched.filter((u) => esRolPermitido(u.rol));
      setUsuarios(soloPersonal);
      setRoles(rolesRes);
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

  // Cargar preguntas de seguridad al abrir modal de crear
  useEffect(() => {
    if (isModalCrearOpen && preguntasSeguridad.length === 0) {
      setLoadingPreguntas(true);
      authApi
        .getAvailableSecurityQuestions()
        .then((data) => {
          const questions = (data.questions || []).map((q: { id?: string; pregunta?: string; question?: string } | string) =>
            typeof q === 'string'
              ? { pregunta: q }
              : { id: (q as { id?: string }).id, pregunta: (q as { pregunta?: string }).pregunta || (q as { question?: string }).question || '' }
          );
          setPreguntasSeguridad(questions);
        })
        .catch(() => setPreguntasSeguridad([]))
        .finally(() => setLoadingPreguntas(false));
    }
  }, [isModalCrearOpen, preguntasSeguridad.length]);

  const verificarEmail = async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setEmailYaRegistrado(false);
      return;
    }
    setVerificandoEmail(true);
    setEmailYaRegistrado(false);
    try {
      const res = await authApi.verificarCorreoExistente(trimmed);
      setEmailYaRegistrado(res.existe === true);
    } catch {
      setEmailYaRegistrado(false);
    } finally {
      setVerificandoEmail(false);
    }
  };

  const handleEmailBlur = () => {
    if (emailTimeoutRef.current) clearTimeout(emailTimeoutRef.current);
    emailTimeoutRef.current = setTimeout(() => {
      verificarEmail(formEmail);
    }, 300);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormEmail(e.target.value);
    setEmailYaRegistrado(false);
  };

  useEffect(() => () => {
    if (emailTimeoutRef.current) clearTimeout(emailTimeoutRef.current);
  }, []);

  const openEditar = (usuario: Usuario) => {
    setEditingUser(usuario);
    setEditNombre(usuario.nombre);
    setEditEmail(usuario.email);
    setEditTelefono(usuario.telefono ?? '');
    setEditRol(rolValorParaSelect(usuario.rol));
    setError(null);
  };

  const resetFormCrear = () => {
    setFormNombre('');
    setFormEmail('');
    setEmailYaRegistrado(false);
    setFormPassword('');
    setFormTelefono('');
    setFormRol('empleado');
    setFormFechaNacimiento('');
    setFormPregunta('');
    setFormRespuesta('');
    setFormTipoCabello('liso');
    setFormTieneAlergias(false);
    setFormAlergias('');
    setFormTratamientosQuimicos(false);
    setFormTratamientos('');
    setFormAceptaAviso(true);
    setFormRecibePromo(false);
  };

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    const emailTrimmed = formEmail.trim().toLowerCase();
    const resVerify = await authApi.verificarCorreoExistente(emailTrimmed);
    if (resVerify.existe) {
      setCreateError('Este correo ya está registrado. Usa otro correo.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const nuevoUsuario = await createUsuario({
        nombre: formNombre.trim(),
        email: emailTrimmed,
        password: formPassword,
        telefono: formTelefono.trim() || undefined,
        rol: formRol as RolValor,
        fechaNacimiento: formFechaNacimiento || undefined,
        preguntaSeguridad: formPregunta.trim()
          ? { pregunta: formPregunta.trim(), respuesta: formRespuesta.trim() }
          : undefined,
        perfilCapilar: {
          tipoCabello: formTipoCabello,
          tieneAlergias: formTieneAlergias,
          alergias: formAlergias.trim() || undefined,
          tratamientosQuimicos: formTratamientosQuimicos,
          tratamientos: formTratamientos.trim() || undefined,
        },
        aceptaAvisoPrivacidad: formAceptaAviso,
        recibePromociones: formRecibePromo,
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
      resetFormCrear();
      setCreateError(null);
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear usuario';
      const errWithValidation = err as Error & { validationErrors?: Record<string, string> };
      const details =
        errWithValidation.validationErrors && Object.keys(errWithValidation.validationErrors).length > 0
          ? '\n' +
            Object.entries(errWithValidation.validationErrors)
              .map(([k, v]) => `• ${k}: ${v}`)
              .join('\n')
          : '';
      setCreateError(msg + details);
      setError(msg + details);
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
      await updateUsuario(editingUser.id, {
        nombre: editNombre.trim(),
        telefono: editTelefono.trim() || null,
        rol: editRol as RolValor,
      });
      setSuccessMessage('Usuario actualizado.');
      setEditingUser(null);
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar';
      const errWithValidation = err as Error & { validationErrors?: Record<string, string> };
      const details =
        errWithValidation.validationErrors && Object.keys(errWithValidation.validationErrors).length > 0
          ? ' ' +
            Object.entries(errWithValidation.validationErrors)
              .map(([k, v]) => `${k}: ${v}`)
              .join('. ')
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

  const rolesFiltrados = roles.filter((r) =>
    ROLES_PERMITIDOS.includes(r.valor as (typeof ROLES_PERMITIDOS)[number])
  );
  const opcionesRol =
    rolesFiltrados.length > 0
      ? rolesFiltrados.map((r) => ({
          value: r.valor,
          label: r.nombre === 'Becario' ? 'Becado' : r.nombre,
        }))
      : opcionesRolPermitidas;

  const gridForm = 'grid grid-cols-1 sm:grid-cols-2 gap-4';

  return (
    <AdminLayout>
      <PageHeader
        title="Usuarios y Roles"
        subtitle="Administra personal: administradores, estilistas, empleados y becados"
        actions={
          <Button onClick={() => { setError(null); setIsModalCrearOpen(true); }}>
            + Nuevo Usuario
          </Button>
        }
      />

      {successMessage && (
        <p className="text-sm font-medium mb-4" style={{ color: 'var(--success)' }}>
          {successMessage}
        </p>
      )}
      {error && (
        <Card className="mb-6 border-l-4" padding="md" style={{ borderLeftColor: 'var(--danger)' }}>
          <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <Card className="xl:col-span-2 overflow-hidden">
          <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Personal (admin, estilista, empleado, becado)
          </h2>
          {loading ? (
            <p className="text-sm py-4" style={{ color: 'var(--encabezados-alterno)' }}>
              Cargando usuarios...
            </p>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[600px] px-4 sm:px-0">
                <Table headers={['Nombre', 'Email', 'Teléfono', 'Rol', 'Estado', 'Acciones']}>
                  {usuarios.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell className="font-semibold">{usuario.nombre}</TableCell>
                      <TableCell className="text-sm">{usuario.email}</TableCell>
                      <TableCell className="text-sm">{usuario.telefono || '—'}</TableCell>
                      <TableCell>
                        <Select
                          value={rolValorParaSelect(usuario.rol)}
                          onChange={(e) => handleCambiarRol(usuario, e.target.value)}
                          options={opcionesRol}
                          className="min-w-[120px] sm:min-w-[130px] w-full max-w-[140px]"
                          disabled={cambiandoRolId === usuario.id}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={usuario.activo ? 'success' : 'danger'}>
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditar(usuario)}>
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
          {!loading && usuarios.length === 0 && (
            <p className="text-sm py-4" style={{ color: 'var(--encabezados-alterno)' }}>
              No hay usuarios de personal (admin, estilista, empleado, becado) o no tienes permiso para listarlos.
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

      {/* Modal: Nuevo Usuario */}
      <Modal
        isOpen={isModalCrearOpen}
        onClose={() => {
          if (!saving) {
            setCreateError(null);
            setIsModalCrearOpen(false);
          }
        }}
        title="Nuevo Usuario"
        size="xl"
        footer={
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => {
                setCreateError(null);
                setIsModalCrearOpen(false);
              }}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button onClick={handleCrearUsuario} disabled={saving || emailYaRegistrado} className="w-full sm:w-auto">
              {saving ? 'Creando...' : 'Crear Usuario'}
            </Button>
          </div>
        }
      >
        {createError && (
          <div
            className="mb-4 p-3 rounded-lg text-sm border-l-4 whitespace-pre-line"
            style={{
              borderLeftColor: 'var(--danger)',
              color: 'var(--danger)',
              backgroundColor: 'var(--fondos-suaves)',
            }}
          >
            {createError}
          </div>
        )}
        <form onSubmit={handleCrearUsuario} className="space-y-6 overflow-y-auto max-h-[70vh] pr-2">
          <div>
            <h3 className="text-subtitle mb-3" style={{ color: 'var(--menu-texto-principal)' }}>
              Datos básicos
            </h3>
            <div className={gridForm}>
              <Input
                label="Nombre Completo *"
                placeholder="Nombre del usuario"
                value={formNombre}
                onChange={(e) => setFormNombre(e.target.value)}
                fullWidth
                required
              />
              <div>
                <Input
                  label="Email *"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={formEmail}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  fullWidth
                  required
                  error={emailYaRegistrado ? 'Este correo ya está registrado' : undefined}
                />
                {verificandoEmail && (
                  <p className="text-xs mt-1" style={{ color: 'var(--encabezados-alterno)' }}>Verificando...</p>
                )}
              </div>
              <Input
                label="Contraseña *"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                fullWidth
                required
                minLength={6}
              />
              <Input
                label="Teléfono"
                type="tel"
                placeholder="Opcional"
                value={formTelefono}
                onChange={(e) => setFormTelefono(e.target.value)}
                fullWidth
              />
              <Input
                label="Fecha de nacimiento"
                type="date"
                value={formFechaNacimiento}
                onChange={(e) => setFormFechaNacimiento(e.target.value)}
                fullWidth
              />
              <Select
                label="Rol *"
                value={formRol}
                onChange={(e) => setFormRol(e.target.value)}
                options={opcionesRol}
                fullWidth
                required
              />
            </div>
          </div>

          <div>
            <h3 className="text-subtitle mb-3" style={{ color: 'var(--menu-texto-principal)' }}>
              Seguridad
            </h3>
            <div className={gridForm}>
              <div>
                <Select
                  label="Pregunta de seguridad"
                  value={formPregunta}
                  onChange={(e) => setFormPregunta(e.target.value)}
                  options={[
                    { value: '', label: 'Selecciona una pregunta' },
                    ...preguntasSeguridad
                      .filter((q) => q.pregunta)
                      .map((q) => ({ value: q.pregunta, label: q.pregunta })),
                  ]}
                  fullWidth
                />
                {loadingPreguntas && (
                  <p className="text-xs mt-1" style={{ color: 'var(--encabezados-alterno)' }}>Cargando preguntas...</p>
                )}
              </div>
              <Input
                label="Respuesta"
                placeholder="Respuesta secreta"
                value={formRespuesta}
                onChange={(e) => setFormRespuesta(e.target.value)}
                fullWidth
              />
            </div>
          </div>

          <p className="text-xs -mt-2 mb-2" style={{ color: 'var(--encabezados-alterno)' }}>
            Las direcciones de envío ya no se registran aquí: el usuario las agrega después (tabla <code className="text-[11px]">direcciones_usuario</code>).
          </p>

          <div>
            <h3 className="text-subtitle mb-3" style={{ color: 'var(--menu-texto-principal)' }}>
              Perfil capilar (opcional)
            </h3>
            <div className={gridForm}>
              <Select
                label="Tipo de cabello"
                value={formTipoCabello}
                onChange={(e) => setFormTipoCabello(e.target.value)}
                options={[
                  { value: 'liso', label: 'Liso' },
                  { value: 'ondulado', label: 'Ondulado' },
                  { value: 'rizado', label: 'Rizado' },
                  { value: 'afro', label: 'Afro' },
                ]}
                fullWidth
              />
              <div className="flex flex-col gap-4 sm:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formTieneAlergias}
                    onChange={(e) => setFormTieneAlergias(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm" style={{ color: 'var(--menu-texto-principal)' }}>Tiene alergias</span>
                </label>
                {formTieneAlergias && (
                  <Textarea
                    label="Alergias"
                    value={formAlergias}
                    onChange={(e) => setFormAlergias(e.target.value)}
                    placeholder="Especificar"
                    fullWidth
                    rows={2}
                  />
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formTratamientosQuimicos}
                    onChange={(e) => setFormTratamientosQuimicos(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm" style={{ color: 'var(--menu-texto-principal)' }}>Tratamientos químicos previos</span>
                </label>
                {formTratamientosQuimicos && (
                  <Textarea
                    label="Tratamientos"
                    value={formTratamientos}
                    onChange={(e) => setFormTratamientos(e.target.value)}
                    placeholder="Especificar"
                    fullWidth
                    rows={2}
                  />
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formAceptaAviso}
                onChange={(e) => setFormAceptaAviso(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm" style={{ color: 'var(--menu-texto-principal)' }}>Acepta aviso de privacidad</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={formRecibePromo}
                onChange={(e) => setFormRecibePromo(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm" style={{ color: 'var(--menu-texto-principal)' }}>Recibe promociones</span>
            </label>
          </div>
        </form>
      </Modal>

      {/* Modal: Editar Usuario */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => !savingEdit && setEditingUser(null)}
        title="Editar Usuario"
        size="lg"
        footer={
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => setEditingUser(null)}
              disabled={savingEdit}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button onClick={handleGuardarEdicion} disabled={savingEdit} className="w-full sm:w-auto">
              {savingEdit ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        }
      >
        {editingUser && (
          <form onSubmit={handleGuardarEdicion} className="space-y-4">
            <div className={gridForm}>
              <Input
                label="Nombre Completo *"
                value={editNombre}
                onChange={(e) => setEditNombre(e.target.value)}
                fullWidth
                required
              />
              <Input
                label="Email"
                type="email"
                value={editEmail}
                fullWidth
                disabled
                title="El email no se puede cambiar"
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
                label="Rol *"
                value={editRol}
                onChange={(e) => setEditRol(e.target.value)}
                options={opcionesRol}
                fullWidth
                required
              />
            </div>
            <p className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
              Para cambiar la contraseña, el usuario puede usar «Olvidé mi contraseña» en el login.
            </p>
          </form>
        )}
      </Modal>

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
    </AdminLayout>
  );
}
