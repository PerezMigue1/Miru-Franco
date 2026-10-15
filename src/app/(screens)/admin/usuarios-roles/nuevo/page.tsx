'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Textarea from '../../../../components/ui/Textarea';
import {
  createUsuario,
  patchUsuarioRol,
  getRoles,
  validarAltaUsuario,
  erroresCamposAlta,
  erroresConsentimientoAlta,
  perfilCapilarAlta,
  NOTA_PROMOCIONES_PANEL,
  TIPOS_CABELLO,
  type CampoAlta,
  type RolCatalogoItem,
  type RolValor,
} from '../../../../services/usuarios';
import { documentosAceptados } from '../../../../services/consentimientos';
import { documentoLegal } from '../../../../utils/documentosLegales';
import { normalizarTelefonoRegistro, MENSAJE_FORMATO_TELEFONO } from '../../../../utils/phone';
import { api as authApi } from '../../../../services/auth';
import CasillaDatosSalud from '../../../../components/legal/CasillaDatosSalud';
import CasillaDocumento, { EnlaceDocumento } from '../../../../components/legal/CasillaDocumento';
import { errorConsentimientoAlergias, mensajeSaludDelBackend, requiereConsentimiento } from '../../../../utils/consentimientoDatosSensibles';

const ROLES_PERMITIDOS = ['admin', 'estilista', 'empleado', 'becario'] as const;

const opcionesRolPermitidas = [
  { value: 'admin', label: 'Administrador' },
  { value: 'estilista', label: 'Estilista' },
  { value: 'empleado', label: 'Empleado' },
  { value: 'becario', label: 'Becado' },
];

const gridForm = 'grid grid-cols-1 sm:grid-cols-2 gap-4';
/** Enlaces dentro de las casillas: en móvil, objetivo de 44 px. */
const enlaceCasilla = 'max-sm:inline-flex max-sm:min-h-11 max-sm:items-center';
/** id de cada campo marcado, en el orden del formulario (el foco va al primero con error). */
const ID_CAMPO: Record<CampoAlta, string> = {
  nombre: 'alta-nombre',
  email: 'alta-email',
  password: 'alta-password',
  telefono: 'alta-telefono',
  pregunta: 'alta-pregunta',
  respuesta: 'alta-respuesta',
  tipoCabello: 'alta-tipo-cabello',
};

export default function NuevoUsuarioPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<RolCatalogoItem[]>([]);
  const [saving, setSaving] = useState(false);
  // Evita un segundo envío mientras el primero sigue en curso (el estado tarda un render en reflejarse).
  const enviandoRef = useRef(false);
  // Si el usuario ya se creó pero el rol falló, no se permite volver a crear.
  const [usuarioCreado, setUsuarioCreado] = useState(false);
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
  const [tipoCabello, setTipoCabello] = useState('');
  const [tieneAlergias, setTieneAlergias] = useState(false);
  const [alergias, setAlergias] = useState('');
  // Consentimiento de la clienta para datos de salud: se confirma al registrar alergias y no se guarda.
  const [consienteDatosSensibles, setConsienteDatosSensibles] = useState(false);
  const [errorConsentimiento, setErrorConsentimiento] = useState<string | null>(null);
  const [tratamientosQuimicos, setTratamientosQuimicos] = useState(false);
  const [tratamientos, setTratamientos] = useState('');
  // Casillas legales sin premarcar: el backend exige Términos y Aviso aceptados.
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [aceptaAviso, setAceptaAviso] = useState(false);
  const [erroresCasillas, setErroresCasillas] = useState<Partial<Record<'aceptaTerminos' | 'aceptaAviso', string>>>({});
  // Cada campo que falta se marca junto a él (aria-invalid), además del aviso de arriba.
  const [erroresCampos, setErroresCampos] = useState<Partial<Record<CampoAlta, string>>>({});
  const limpiarCampo = (campo: CampoAlta) => setErroresCampos((prev) => (prev[campo] ? { ...prev, [campo]: undefined } : prev));
  // Solo se mandan alergias si la casilla "Tiene alergias" está marcada; con texto, se pide el consentimiento.
  const alergiasEnviadas = tieneAlergias ? alergias.trim() : '';

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
    if (enviandoRef.current || usuarioCreado) return;
    const faltanCampos = erroresCamposAlta({ nombre, email, password, telefono, fechaNacimiento, pregunta, respuesta, tipoCabello, aceptaTerminos, aceptaAviso });
    setErroresCampos(faltanCampos);
    setErroresCasillas(erroresConsentimientoAlta({ aceptaTerminos, aceptaAviso }));
    const errorValidacion = validarAltaUsuario({ nombre, email, password, telefono, fechaNacimiento, pregunta, respuesta, tipoCabello, aceptaTerminos, aceptaAviso });
    if (errorValidacion) {
      setError(errorValidacion);
      const primero = (Object.keys(ID_CAMPO) as CampoAlta[]).find((c) => faltanCampos[c]);
      if (primero) document.getElementById(ID_CAMPO[primero])?.focus();
      return;
    }
    const faltaConsentimiento = errorConsentimientoAlergias(alergiasEnviadas, consienteDatosSensibles, 'personal');
    setErrorConsentimiento(faltaConsentimiento);
    if (faltaConsentimiento) {
      document.getElementById('alta-consiente-salud')?.focus();
      return;
    }
    enviandoRef.current = true;
    setSaving(true);
    setError(null);
    const emailTrimmed = email.trim().toLowerCase();
    try {
      const resVerify = await authApi.verificarCorreoExistente(emailTrimmed);
      if (resVerify.existe) {
        setError('Este correo ya está registrado. Usa otro correo.');
        return;
      }
      const nuevoUsuario = await createUsuario({
        nombre: nombre.trim(),
        email: emailTrimmed,
        password,
        telefono: normalizarTelefonoRegistro(telefono),
        rol: rol as RolValor,
        // Opcional (minimización): createUsuario la manda solo si se capturó.
        fechaNacimiento: fechaNacimiento || undefined,
        // Sin pregunta elegida no se manda nada: nunca una respuesta por defecto.
        preguntaSeguridad: pregunta.trim() ? { pregunta: pregunta.trim(), respuesta: respuesta.trim() } : undefined,
        // Solo lo capturado: sin tipo de cabello no se manda, y las alergias no se pierden por eso.
        perfilCapilar: perfilCapilarAlta({ tipoCabello, tieneAlergias, alergias, tratamientosQuimicos, tratamientos }),
        aceptaTerminos,
        aceptaAvisoPrivacidad: aceptaAviso,
        // Sin recibePromociones: solo la persona puede aceptarlas (el backend rechaza true desde el panel).
        // Versión vigente de cada documento que la persona aceptó.
        documentos: documentosAceptados(['terminos', 'aviso-privacidad']),
        ...(requiereConsentimiento(alergiasEnviadas) ? { consienteDatosSensibles: true } : {}),
      });
      if (rol && rol !== 'cliente') {
        try {
          await patchUsuarioRol(nuevoUsuario.id, rol as RolValor);
        } catch (errRol) {
          // El usuario ya se creó: se avisa y no se permite crearlo otra vez.
          setUsuarioCreado(true);
          const detalle = errRol instanceof Error && errRol.message ? ` (${errRol.message})` : '';
          setError(`El usuario se creó, pero no se pudo asignar el rol${detalle}. Corrígelo desde la lista de usuarios.`);
          return;
        }
      }
      router.push('/admin/usuarios-roles');
    } catch (err) {
      // 400 CONSENTIMIENTO_SALUD_REQUERIDO: el mensaje va junto a la casilla de datos de salud.
      const salud = mensajeSaludDelBackend(err);
      if (salud) {
        setErrorConsentimiento(salud);
        return;
      }
      const e = err as Error & { validationErrors?: Record<string, string> };
      let msg = e instanceof Error ? e.message : 'Error al crear usuario';
      if (e.validationErrors && Object.keys(e.validationErrors).length > 0) {
        msg += '\n' + Object.entries(e.validationErrors).map(([k, v]) => `• ${k}: ${v}`).join('\n');
      }
      setError(msg);
    } finally {
      enviandoRef.current = false;
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              Nuevo Usuario
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              Alta de personal (admin, estilista, empleado, becado)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/admin/usuarios-roles')} disabled={saving}>Cancelar</Button>
            {usuarioCreado ? (
              <Button variant="primary" onClick={() => router.push('/admin/usuarios-roles')}>Ir a la lista</Button>
            ) : (
              <Button variant="primary" onClick={handleCrear} disabled={saving || emailYaRegistrado}>{saving ? 'Creando...' : 'Crear usuario'}</Button>
            )}
          </div>
        </div>

        {error && (
          <Card padding="md" role="alert" style={{ backgroundColor: 'color-mix(in srgb, var(--danger) 10%, var(--badge-base))', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--danger-texto) 35%, transparent)' }}>
            <p className="text-sm font-medium whitespace-pre-line" style={{ color: 'var(--danger-texto)' }}>{error}</p>
          </Card>
        )}

      <Card variant="elevated" padding="lg">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--menu-texto-principal)' }}>Datos básicos</h3>
            <div className={gridForm}>
              <Input
                id={ID_CAMPO.nombre}
                label="Nombre completo *"
                placeholder="Nombre del usuario"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  limpiarCampo('nombre');
                }}
                fullWidth
                required
                error={erroresCampos.nombre}
              />
              <div>
                <Input
                  id={ID_CAMPO.email}
                  label="Email *"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => {
                    handleEmailChange(e);
                    limpiarCampo('email');
                  }}
                  onBlur={handleEmailBlur}
                  fullWidth
                  required
                  error={erroresCampos.email ?? (emailYaRegistrado ? 'Este correo ya está registrado' : undefined)}
                />
                {verificandoEmail && (
                  <p className="text-xs mt-1" style={{ color: 'var(--encabezados-alterno)' }}>Verificando...</p>
                )}
              </div>
              <Input
                id={ID_CAMPO.password}
                label="Contraseña *"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  limpiarCampo('password');
                }}
                fullWidth
                required
                minLength={8}
                error={erroresCampos.password}
                helperText="Mínimo 8 caracteres, con mayúscula, minúscula, número y carácter especial."
              />
              <Input
                id={ID_CAMPO.telefono}
                label="Teléfono *"
                type="tel"
                placeholder="10 dígitos"
                value={telefono}
                onChange={(e) => {
                  setTelefono(e.target.value);
                  limpiarCampo('telefono');
                }}
                fullWidth
                required
                error={erroresCampos.telefono}
                helperText={MENSAJE_FORMATO_TELEFONO}
              />
              <Input label="Fecha de nacimiento (opcional)" type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} fullWidth />
              <Select label="Rol *" value={rol} onChange={(e) => setRol(e.target.value)} options={opcionesRol} fullWidth required />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--menu-texto-principal)' }}>Seguridad</h3>
            <div className={gridForm}>
              <div>
                <Select
                  id={ID_CAMPO.pregunta}
                  label="Pregunta de seguridad"
                  value={pregunta}
                  onChange={(e) => {
                    setPregunta(e.target.value);
                    if (!e.target.value) setRespuesta('');
                    limpiarCampo('pregunta');
                    limpiarCampo('respuesta');
                  }}
                  options={[
                    { value: '', label: 'Sin pregunta de seguridad' },
                    ...preguntasSeguridad.filter((q) => q.pregunta).map((q) => ({ value: q.pregunta, label: q.pregunta })),
                  ]}
                  fullWidth
                  error={erroresCampos.pregunta}
                  helperText="Opcional. Sin pregunta, la cuenta no podrá recuperarse por este medio."
                />
                {loadingPreguntas && (
                  <p className="text-xs mt-1" style={{ color: 'var(--encabezados-alterno)' }}>Cargando preguntas...</p>
                )}
              </div>
              <Input
                id={ID_CAMPO.respuesta}
                label={pregunta ? 'Respuesta *' : 'Respuesta'}
                placeholder="Respuesta secreta"
                value={respuesta}
                onChange={(e) => {
                  setRespuesta(e.target.value);
                  limpiarCampo('respuesta');
                }}
                fullWidth
                required={Boolean(pregunta)}
                disabled={!pregunta}
                error={erroresCampos.respuesta}
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--menu-texto-principal)' }}>Perfil capilar</h3>
            <div className={gridForm}>
              <Select
                id={ID_CAMPO.tipoCabello}
                label="Tipo de cabello (opcional)"
                value={tipoCabello}
                onChange={(e) => {
                  setTipoCabello(e.target.value);
                  limpiarCampo('tipoCabello');
                }}
                options={[{ value: '', label: 'Sin especificar' }, ...TIPOS_CABELLO]}
                fullWidth
                error={erroresCampos.tipoCabello}
              />
              <div className="flex flex-col gap-2 sm:col-span-2">
                <CasillaDocumento id="alta-tiene-alergias" checked={tieneAlergias} onChange={(e) => setTieneAlergias(e.target.checked)}>
                  Tiene alergias
                </CasillaDocumento>
                {tieneAlergias && (
                  <Textarea label="Alergias" value={alergias} onChange={(e) => setAlergias(e.target.value)} placeholder="Especificar" fullWidth rows={2} />
                )}
                {requiereConsentimiento(alergiasEnviadas) && (
                  <CasillaDatosSalud
                    quien="personal"
                    id="alta-consiente-salud"
                    checked={consienteDatosSensibles}
                    onChange={(e) => {
                      setConsienteDatosSensibles(e.target.checked);
                      if (e.target.checked) setErrorConsentimiento(null);
                    }}
                    aria-required
                    error={errorConsentimiento}
                  />
                )}
                <CasillaDocumento id="alta-tratamientos" checked={tratamientosQuimicos} onChange={(e) => setTratamientosQuimicos(e.target.checked)}>
                  Tratamientos químicos previos
                </CasillaDocumento>
                {tratamientosQuimicos && (
                  <Textarea label="Tratamientos" value={tratamientos} onChange={(e) => setTratamientos(e.target.value)} placeholder="Especificar" fullWidth rows={2} />
                )}
              </div>
            </div>
          </div>

          <fieldset>
            <legend className="text-lg font-semibold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>Consentimientos</legend>
            <CasillaDocumento
              id="alta-acepta-terminos"
              checked={aceptaTerminos}
              onChange={(e) => {
                setAceptaTerminos(e.target.checked);
                if (e.target.checked) setErroresCasillas((prev) => ({ ...prev, aceptaTerminos: undefined }));
              }}
              aria-required
              error={erroresCasillas.aceptaTerminos}
            >
              La persona leyó y aceptó los{' '}
              <EnlaceDocumento href={documentoLegal('terminos').ruta} className={enlaceCasilla}>Términos y condiciones</EnlaceDocumento>
            </CasillaDocumento>
            <CasillaDocumento
              id="alta-acepta-aviso"
              checked={aceptaAviso}
              onChange={(e) => {
                setAceptaAviso(e.target.checked);
                if (e.target.checked) setErroresCasillas((prev) => ({ ...prev, aceptaAviso: undefined }));
              }}
              aria-required
              error={erroresCasillas.aceptaAviso}
            >
              La persona leyó y aceptó el{' '}
              <EnlaceDocumento href={documentoLegal('aviso-privacidad').ruta} className={enlaceCasilla}>aviso de privacidad</EnlaceDocumento>
            </CasillaDocumento>
            {/* Contrato del backend: el personal no puede aceptar promociones por la persona (400). */}
            <CasillaDocumento id="alta-recibe-promociones" checked={false} disabled readOnly aria-describedby="alta-recibe-promociones-nota">
              Recibe promociones
            </CasillaDocumento>
            <p id="alta-recibe-promociones-nota" className="text-xs -mt-1 pl-7" style={{ color: 'var(--encabezados-alterno)' }}>
              {NOTA_PROMOCIONES_PANEL}
            </p>
          </fieldset>

        </div>
      </Card>
      </div>
    </AdminLayout>
  );
}
