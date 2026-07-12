'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import PageHeader from '../../../../components/ui/PageHeader';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Textarea from '../../../../components/ui/Textarea';
import { createUsuario, patchUsuarioRol, getRoles, type RolCatalogoItem, type RolValor } from '../../../../services/usuarios';
import { api as authApi } from '../../../../services/auth';

const ROLES_PERMITIDOS = ['admin', 'estilista', 'empleado', 'becario'] as const;

const opcionesRolPermitidas = [
  { value: 'admin', label: 'Administrador' },
  { value: 'estilista', label: 'Estilista' },
  { value: 'empleado', label: 'Empleado' },
  { value: 'becario', label: 'Becado' },
];

const gridForm = 'grid grid-cols-1 sm:grid-cols-2 gap-4';

export default function NuevoUsuarioPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<RolCatalogoItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telefono, setTelefono] = useState('');
  const [rol, setRol] = useState('empleado');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [preguntasSeguridad, setPreguntasSeguridad] = useState<Array<{ id?: string; pregunta: string }>>([]);
  const [loadingPreguntas, setLoadingPreguntas] = useState(false);
  const [verificandoEmail, setVerificandoEmail] = useState(false);
  const [emailYaRegistrado, setEmailYaRegistrado] = useState(false);
  const emailTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [tipoCabello, setTipoCabello] = useState('liso');
  const [tieneAlergias, setTieneAlergias] = useState(false);
  const [alergias, setAlergias] = useState('');
  const [tratamientosQuimicos, setTratamientosQuimicos] = useState(false);
  const [tratamientos, setTratamientos] = useState('');
  const [aceptaAviso, setAceptaAviso] = useState(true);
  const [recibePromo, setRecibePromo] = useState(false);

  useEffect(() => {
    getRoles().then(setRoles).catch(() => setRoles([]));
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
  }, []);

  useEffect(() => () => {
    if (emailTimeoutRef.current) clearTimeout(emailTimeoutRef.current);
  }, []);

  const verificarEmail = async (value: string) => {
    const trimmed = value.trim().toLowerCase();
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

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setEmailYaRegistrado(false);
  };

  const handleEmailBlur = () => {
    if (emailTimeoutRef.current) clearTimeout(emailTimeoutRef.current);
    emailTimeoutRef.current = setTimeout(() => verificarEmail(email), 300);
  };

  const rolesFiltrados = roles.filter((r) =>
    ROLES_PERMITIDOS.includes(r.valor as (typeof ROLES_PERMITIDOS)[number])
  );
  const opcionesRol =
    rolesFiltrados.length > 0
      ? rolesFiltrados.map((r) => ({ value: r.valor, label: r.nombre === 'Becario' ? 'Becado' : r.nombre }))
      : opcionesRolPermitidas;

  const handleCrear = async () => {
    if (!nombre.trim() || !email.trim() || !password.trim()) {
      setError('Nombre, email y contraseña son obligatorios.');
      return;
    }
    const emailTrimmed = email.trim().toLowerCase();
    const resVerify = await authApi.verificarCorreoExistente(emailTrimmed);
    if (resVerify.existe) {
      setError('Este correo ya está registrado. Usa otro correo.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const nuevoUsuario = await createUsuario({
        nombre: nombre.trim(),
        email: emailTrimmed,
        password,
        telefono: telefono.trim() || undefined,
        rol: rol as RolValor,
        fechaNacimiento: fechaNacimiento || undefined,
        preguntaSeguridad: pregunta.trim()
          ? { pregunta: pregunta.trim(), respuesta: respuesta.trim() }
          : undefined,
        perfilCapilar: {
          tipoCabello,
          tieneAlergias,
          alergias: alergias.trim() || undefined,
          tratamientosQuimicos,
          tratamientos: tratamientos.trim() || undefined,
        },
        aceptaAvisoPrivacidad: aceptaAviso,
        recibePromociones: recibePromo,
      });
      if (rol && rol !== 'cliente') {
        try {
          await patchUsuarioRol(nuevoUsuario.id, rol as RolValor);
        } catch {
          // el usuario ya se creó; si el rol no se aplicó, se puede corregir desde la lista
        }
      }
      router.push('/admin/usuarios-roles');
    } catch (err) {
      const e = err as Error & { validationErrors?: Record<string, string> };
      let msg = e instanceof Error ? e.message : 'Error al crear usuario';
      if (e.validationErrors && Object.keys(e.validationErrors).length > 0) {
        msg += '\n' + Object.entries(e.validationErrors).map(([k, v]) => `• ${k}: ${v}`).join('\n');
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <PageHeader title="Nuevo usuario" subtitle="Alta de personal (admin, estilista, empleado, becado)" />

      {error && (
        <div className="bg-red-600 border border-red-700 text-white px-4 py-3 rounded mb-4 text-xs font-bold shadow-md whitespace-pre-line">
          {error}
        </div>
      )}

      <Card>
        <div className="space-y-6">
          <div>
            <h3 className="text-subtitle mb-3" style={{ color: 'var(--menu-texto-principal)' }}>Datos básicos</h3>
            <div className={gridForm}>
              <Input label="Nombre completo *" placeholder="Nombre del usuario" value={nombre} onChange={(e) => setNombre(e.target.value)} fullWidth required />
              <div>
                <Input
                  label="Email *"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={email}
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
              <Input label="Contraseña *" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth required minLength={6} />
              <Input label="Teléfono" type="tel" placeholder="Opcional" value={telefono} onChange={(e) => setTelefono(e.target.value)} fullWidth />
              <Input label="Fecha de nacimiento" type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} fullWidth />
              <Select label="Rol *" value={rol} onChange={(e) => setRol(e.target.value)} options={opcionesRol} fullWidth required />
            </div>
          </div>

          <div>
            <h3 className="text-subtitle mb-3" style={{ color: 'var(--menu-texto-principal)' }}>Seguridad</h3>
            <div className={gridForm}>
              <div>
                <Select
                  label="Pregunta de seguridad"
                  value={pregunta}
                  onChange={(e) => setPregunta(e.target.value)}
                  options={[
                    { value: '', label: 'Selecciona una pregunta' },
                    ...preguntasSeguridad.filter((q) => q.pregunta).map((q) => ({ value: q.pregunta, label: q.pregunta })),
                  ]}
                  fullWidth
                />
                {loadingPreguntas && (
                  <p className="text-xs mt-1" style={{ color: 'var(--encabezados-alterno)' }}>Cargando preguntas...</p>
                )}
              </div>
              <Input label="Respuesta" placeholder="Respuesta secreta" value={respuesta} onChange={(e) => setRespuesta(e.target.value)} fullWidth />
            </div>
          </div>

          <div>
            <h3 className="text-subtitle mb-3" style={{ color: 'var(--menu-texto-principal)' }}>Perfil capilar (opcional)</h3>
            <div className={gridForm}>
              <Select
                label="Tipo de cabello"
                value={tipoCabello}
                onChange={(e) => setTipoCabello(e.target.value)}
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
                  <input type="checkbox" checked={tieneAlergias} onChange={(e) => setTieneAlergias(e.target.checked)} className="rounded" />
                  <span className="text-sm" style={{ color: 'var(--menu-texto-principal)' }}>Tiene alergias</span>
                </label>
                {tieneAlergias && (
                  <Textarea label="Alergias" value={alergias} onChange={(e) => setAlergias(e.target.value)} placeholder="Especificar" fullWidth rows={2} />
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={tratamientosQuimicos} onChange={(e) => setTratamientosQuimicos(e.target.checked)} className="rounded" />
                  <span className="text-sm" style={{ color: 'var(--menu-texto-principal)' }}>Tratamientos químicos previos</span>
                </label>
                {tratamientosQuimicos && (
                  <Textarea label="Tratamientos" value={tratamientos} onChange={(e) => setTratamientos(e.target.value)} placeholder="Especificar" fullWidth rows={2} />
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={aceptaAviso} onChange={(e) => setAceptaAviso(e.target.checked)} className="rounded" />
              <span className="text-sm" style={{ color: 'var(--menu-texto-principal)' }}>Acepta aviso de privacidad</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input type="checkbox" checked={recibePromo} onChange={(e) => setRecibePromo(e.target.checked)} className="rounded" />
              <span className="text-sm" style={{ color: 'var(--menu-texto-principal)' }}>Recibe promociones</span>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.push('/admin/usuarios-roles')} disabled={saving}>Cancelar</Button>
            <Button onClick={handleCrear} disabled={saving || emailYaRegistrado}>{saving ? 'Creando...' : 'Crear usuario'}</Button>
          </div>
        </div>
      </Card>
    </AdminLayout>
  );
}
