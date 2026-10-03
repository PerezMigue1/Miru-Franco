'use client';

import { Check, Eye, EyeOff } from 'lucide-react';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { validatePassword, sanitizeInput, sanitizeEmail, hasDangerousCharacters } from '../../utils/security';
import {
  esTelefonoMexicoValido,
  mensajeTelefonoInvalido,
  normalizarTelefonoRegistro,
  MENSAJE_FORMATO_TELEFONO,
  sanitizarEntradaTelefono10,
} from '../../utils/phone';
import ActivateAccount from './ActivateAccount';
import Notification from '../ui/Notification';

interface RegisterProps {
  onSwitchToLogin?: () => void;
  onRegisterSuccess?: () => void;
}

interface FormValues {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  birthDate: string;
  securityQuestion: string;
  securityAnswer: string;
  hairType: string;
  colorNatural: string;
  colorActual: string;
  productosUsados: string;
  hasAllergies: 'yes' | 'no' | '';
  allergies: string;
  hasChemicalTreatments: 'yes' | 'no' | '';
  chemicalTreatments: string;
  acceptTerms: boolean;
  receivePromotions: boolean;
}

const STEP1_FIELDS: (keyof FormValues)[] = [
  'name', 'email', 'phone', 'password', 'confirmPassword',
  'birthDate', 'securityQuestion', 'securityAnswer',
];

export default function Register({ onSwitchToLogin, onRegisterSuccess }: RegisterProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);

  const handleSwitchToLogin = () => {
    if (onSwitchToLogin) onSwitchToLogin();
    else router.push('/login');
  };

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    getValues,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      name: '', email: '', phone: '', password: '', confirmPassword: '',
      birthDate: '', securityQuestion: '', securityAnswer: '',
      hairType: '', colorNatural: '', colorActual: '', productosUsados: '',
      hasAllergies: '', allergies: '',
      hasChemicalTreatments: '', chemicalTreatments: '',
      acceptTerms: false, receivePromotions: false,
    },
    mode: 'onBlur',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  const [securityQuestions, setSecurityQuestions] = useState<Array<{ id?: string; pregunta: string }>>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [showActivation, setShowActivation] = useState(false);
  const [emailForActivation, setEmailForActivation] = useState('');
  const [verificandoCorreo, setVerificandoCorreo] = useState(false);
  const [correoExiste, setCorreoExiste] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const emailTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const passwordValue = watch('password');
  const emailValue = watch('email');
  const securityQuestionId = watch('securityQuestion');
  const hasAllergiesValue = watch('hasAllergies');
  const hasChemicalTreatmentsValue = watch('hasChemicalTreatments');

  const selectedQuestion = securityQuestions.find(
    (q) => q.id === securityQuestionId || q.pregunta === securityQuestionId
  );

  // Cargar preguntas de seguridad
  useEffect(() => {
    setLoadingQuestions(true);
    (async () => {
      try {
        const { api } = await import('../../services');
        const data = await api.getAvailableSecurityQuestions();
        const questions = (data.questions || []).map(
          (q: { id?: string; pregunta?: string; question?: string } | string) => {
            if (typeof q === 'string') return { pregunta: q };
            return { id: q.id, pregunta: q.pregunta || q.question || '' };
          }
        );
        if (questions.length === 0) {
          setGeneralError('No se encontraron preguntas de seguridad disponibles');
        } else {
          setSecurityQuestions(questions);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Error desconocido';
        setGeneralError(`Error al cargar preguntas: ${msg}`);
      } finally {
        setLoadingQuestions(false);
      }
    })();
  }, []);

  // Fuerza de contraseña en tiempo real
  useEffect(() => {
    if (!passwordValue) { setPasswordStrength(null); setPasswordErrors([]); return; }
    const v = validatePassword(passwordValue, {
      nombre: getValues('name'),
      email: getValues('email'),
      telefono: getValues('phone'),
      fechaNacimiento: getValues('birthDate'),
      preguntaSeguridad: { respuesta: getValues('securityAnswer') },
    });
    setPasswordStrength(v.strength || null);
    setPasswordErrors(v.valid ? [] : (v.errors || []));
  }, [passwordValue, getValues]);

  // Verificación de email con debounce
  useEffect(() => {
    if (emailTimeoutRef.current) clearTimeout(emailTimeoutRef.current);
    if (!emailValue || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue.trim())) {
      setCorreoExiste(false);
      setVerificandoCorreo(false);
      return;
    }
    emailTimeoutRef.current = setTimeout(async () => {
      setVerificandoCorreo(true);
      try {
        const { api } = await import('../../services');
        const result = await api.verificarCorreoExistente(emailValue.trim());
        setCorreoExiste(result.existe);
      } catch {
        // silencioso — si falla la verificación, no bloqueamos el registro
      } finally {
        setVerificandoCorreo(false);
      }
    }, 500);
    return () => { if (emailTimeoutRef.current) clearTimeout(emailTimeoutRef.current); };
  }, [emailValue]);

  const handleNext = async () => {
    const valid = await trigger(STEP1_FIELDS);
    if (!valid || correoExiste) return;
    setCurrentStep(2);
  };

  const onFinalSubmit = async (values: FormValues) => {
    setGeneralError('');
    try {
      const { api } = await import('../../services');
      const registerData = {
        nombre: sanitizeInput(values.name),
        email: sanitizeEmail(values.email),
        password: values.password,
        telefono: normalizarTelefonoRegistro(values.phone),
        fechaNacimiento: values.birthDate,
        preguntaSeguridad: {
          pregunta: sanitizeInput(selectedQuestion?.pregunta || ''),
          respuesta: sanitizeInput(values.securityAnswer),
        },
        perfilCapilar: {
          tipoCabello:
            values.hairType === 'lacio' ? 'liso' :
            values.hairType === 'ondulado' ? 'ondulado' :
            values.hairType === 'rizado' ? 'rizado' :
            values.hairType || 'liso',
          colorNatural: values.colorNatural ? sanitizeInput(values.colorNatural) : undefined,
          colorActual: values.colorActual ? sanitizeInput(values.colorActual) : undefined,
          productosUsados: values.productosUsados ? sanitizeInput(values.productosUsados) : undefined,
          tieneAlergias: values.hasAllergies === 'yes',
          alergias: values.hasAllergies === 'yes' ? sanitizeInput(values.allergies) : undefined,
          tratamientosQuimicos: values.hasChemicalTreatments === 'yes',
          tratamientos: values.hasChemicalTreatments === 'yes' ? sanitizeInput(values.chemicalTreatments) : undefined,
        },
        aceptaAvisoPrivacidad: values.acceptTerms,
        recibePromociones: values.receivePromotions,
      };

      const response = await api.register(registerData);
      if (response.success) {
        if (response.requiereVerificacion || response.message?.toLowerCase().includes('código') || response.message?.toLowerCase().includes('activar')) {
          setEmailForActivation(values.email);
          setShowActivation(true);
        } else {
          // El JWT nunca se guarda en localStorage (la sesión viaja en cookie httpOnly).
          if (response.token) {
            setRegisterSuccess(true);
            setTimeout(() => {
              if (typeof window !== 'undefined') window.location.href = '/home';
              else onRegisterSuccess?.();
            }, 2000);
          } else {
            setRegisterSuccess(true);
            setTimeout(() => { onRegisterSuccess?.(); }, 2000);
          }
        }
      } else {
        throw new Error(response.error || 'Error al crear la cuenta');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al crear la cuenta';
      if (msg.toLowerCase().includes('faltan campos') || msg.toLowerCase().includes('campos obligatorios')) {
        setGeneralError('Por favor, verifica que todos los campos obligatorios estén completos.');
      } else {
        setGeneralError(msg);
      }
    }
  };

  if (showActivation && emailForActivation) {
    return (
      <ActivateAccount
        email={emailForActivation}
        onActivationSuccess={() => {
          setShowActivation(false);
          setRegisterSuccess(true);
          setTimeout(() => { onRegisterSuccess?.(); }, 1500);
        }}
        onBackToRegister={() => { setShowActivation(false); setEmailForActivation(''); }}
        onSkipToLogin={() => {
          setShowActivation(false);
          setEmailForActivation('');
          if (onSwitchToLogin) onSwitchToLogin();
          else if (typeof window !== 'undefined') window.location.href = '/auth?view=login';
        }}
      />
    );
  }

  // Campo del sistema (.mf-campo, sistema.css): tema claro/oscuro y foco visibles; con error, borde de peligro.
  const inputStyle = (hasError: boolean) => (hasError ? { borderColor: 'var(--danger-texto)' } : undefined);

  const inputClass = (hasError: boolean) => `mf-campo w-full px-4 py-3${hasError ? ' shadow-[0_0_0_1px_var(--danger-texto)]' : ''}`;

  const renderStep1 = () => (
    <div className="space-y-5">
      {/* Nombre */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-2" style={{ color: 'var(--menu-texto-principal)' }}>Nombre Completo</label>
        <input
          type="text"
          id="name"
          placeholder="Juan Pérez"
          disabled={isSubmitting}
          className={inputClass(!!errors.name)}
          style={inputStyle(!!errors.name)}
          {...register('name', {
            required: 'El nombre completo es requerido',
            validate: (v) => {
              if (hasDangerousCharacters(v)) return 'El nombre no puede contener caracteres especiales peligrosos';
              return sanitizeInput(v).length >= 2 || 'El nombre debe tener al menos 2 caracteres';
            },
          })}
        />
        {errors.name && <p className="mt-1 text-sm text-[color:var(--danger-texto)]">{errors.name.message}</p>}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: 'var(--menu-texto-principal)' }}>Correo Electrónico</label>
        <div className="relative">
          <input
            type="email"
            id="email"
            placeholder="tu@email.com"
            disabled={isSubmitting}
            className={`${inputClass(!!errors.email || correoExiste)} pr-12`}
            style={inputStyle(!!errors.email || correoExiste)}
            {...register('email', {
              required: 'El correo electrónico es requerido',
              validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizeEmail(v)) || 'El correo electrónico no es válido',
            })}
          />
          {verificandoCorreo && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: 'var(--logo-branding)' }} aria-label="Verificando correo" />
            </div>
          )}
          {!verificandoCorreo && correoExiste && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg className="h-5 w-5 text-[color:var(--danger-texto)]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
          )}
          {!verificandoCorreo && !correoExiste && emailValue && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue.trim()) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg className="h-5 w-5 text-[color:var(--success-texto)]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
        {errors.email && <p className="mt-1 text-sm text-[color:var(--danger-texto)]">{errors.email.message}</p>}
        {correoExiste && !errors.email && <p className="mt-1 text-sm text-[color:var(--danger-texto)]">Este correo ya está registrado.</p>}
        {!errors.email && verificandoCorreo && <p className="mt-1 text-sm text-[color:var(--warning-texto)]">Verificando correo...</p>}
        {!errors.email && !verificandoCorreo && !correoExiste && emailValue && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue.trim()) && (
          <p className="mt-1 flex items-center gap-1 text-sm text-[color:var(--success-texto)]"><Check size={14} aria-hidden />Correo disponible</p>
        )}
      </div>

      {/* Teléfono */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium mb-2" style={{ color: 'var(--menu-texto-principal)' }}>Teléfono</label>
        <input
          type="tel"
          id="phone"
          inputMode="tel"
          autoComplete="tel"
          placeholder="5512345678"
          maxLength={10}
          disabled={isSubmitting}
          className={inputClass(!!errors.phone)}
          style={inputStyle(!!errors.phone)}
          {...register('phone', {
            required: 'El teléfono es requerido',
            validate: (v) => esTelefonoMexicoValido(v) || mensajeTelefonoInvalido(),
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              setValue('phone', sanitizarEntradaTelefono10(e.target.value)),
          })}
        />
        <p className="mt-1.5 text-xs" style={{ color: 'var(--encabezados-alterno)' }}>{MENSAJE_FORMATO_TELEFONO}</p>
        {errors.phone && <p className="mt-1 text-sm text-[color:var(--danger-texto)]">{errors.phone.message}</p>}
      </div>

      {/* Contraseña */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: 'var(--menu-texto-principal)' }}>Contraseña</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            id="password"
            placeholder="••••••••"
            disabled={isSubmitting}
            className={`${inputClass(!!errors.password)} pr-12`}
            style={inputStyle(!!errors.password)}
            {...register('password', {
              required: 'La contraseña es requerida',
              validate: (v) => {
                const r = validatePassword(v, {
                  nombre: getValues('name'), email: getValues('email'),
                  telefono: getValues('phone'), fechaNacimiento: getValues('birthDate'),
                  preguntaSeguridad: { respuesta: getValues('securityAnswer') },
                });
                return r.valid || r.errors?.[0] || r.message || 'La contraseña no cumple los requisitos';
              },
            })}
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-1/2 -translate-y-1/2 grid h-11 w-11 place-items-center rounded-[10px]" style={{ color: 'var(--campo-placeholder)' }} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} disabled={isSubmitting}>
            {showPassword ? <EyeOff size={19} aria-hidden /> : <Eye size={19} aria-hidden />}
          </button>
        </div>
        {errors.password && <p className="mt-1 text-sm text-[color:var(--danger-texto)]">{errors.password.message}</p>}
        {passwordErrors.length > 0 && !errors.password && (
          <div className="mt-1 space-y-1">
            {passwordErrors.map((e, i) => <p key={i} className="text-xs text-[color:var(--danger-texto)]">• {e}</p>)}
          </div>
        )}
        {passwordErrors.length === 0 && passwordValue && (
          <div className="mt-1">
            <p className="text-xs text-[color:var(--success-texto)] mb-1 flex items-center gap-1"><Check size={13} aria-hidden />Contraseña válida</p>
            {passwordStrength && (
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--menu-texto-principal)' }}>Fortaleza:</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                  <div className={`h-full transition-[width] duration-300 ${passwordStrength === 'strong' ? 'bg-[color:var(--success)] w-full' : passwordStrength === 'medium' ? 'bg-[color:var(--warning)] w-2/3' : 'bg-[color:var(--danger-texto)] w-1/3'}`} />
                </div>
                <span className={`text-xs font-medium ${passwordStrength === 'strong' ? 'text-[color:var(--success-texto)]' : passwordStrength === 'medium' ? 'text-[color:var(--warning-texto)]' : 'text-[color:var(--danger-texto)]'}`}>
                  {passwordStrength === 'strong' ? 'Fuerte' : passwordStrength === 'medium' ? 'Media' : 'Débil'}
                </span>
              </div>
            )}
          </div>
        )}
        {!passwordValue && <p className="mt-1.5 text-xs" style={{ color: 'var(--encabezados-alterno)' }}>Mínimo 8 caracteres, con mayúsculas, minúsculas y números</p>}
      </div>

      {/* Confirmar contraseña */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2" style={{ color: 'var(--menu-texto-principal)' }}>Confirmar Contraseña</label>
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            id="confirmPassword"
            placeholder="••••••••"
            disabled={isSubmitting}
            className={`${inputClass(!!errors.confirmPassword)} pr-12`}
            style={inputStyle(!!errors.confirmPassword)}
            {...register('confirmPassword', {
              required: 'Confirma tu contraseña',
              validate: (v) => v === getValues('password') || 'Las contraseñas no coinciden',
            })}
          />
          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-1 top-1/2 -translate-y-1/2 grid h-11 w-11 place-items-center rounded-[10px]" style={{ color: 'var(--campo-placeholder)' }} aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} disabled={isSubmitting}>
            {showConfirmPassword ? <EyeOff size={19} aria-hidden /> : <Eye size={19} aria-hidden />}
          </button>
        </div>
        {errors.confirmPassword && <p className="mt-1 text-sm text-[color:var(--danger-texto)]">{errors.confirmPassword.message}</p>}
      </div>

      {/* Fecha de nacimiento */}
      <div>
        <label htmlFor="birthDate" className="block text-sm font-medium mb-2" style={{ color: 'var(--menu-texto-principal)' }}>Fecha de Nacimiento</label>
        <input
          type="date"
          id="birthDate"
          disabled={isSubmitting}
          className={inputClass(!!errors.birthDate)}
          style={inputStyle(!!errors.birthDate)}
          max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
          {...register('birthDate', {
            required: 'La fecha de nacimiento es requerida',
            validate: (v) => {
              // 'YYYY-MM-DD' se lee como medianoche UTC: getters UTC para no tomar el día anterior.
              const birth = new Date(v);
              const today = new Date();
              const age = today.getFullYear() - birth.getUTCFullYear();
              const monthDiff = today.getMonth() - birth.getUTCMonth();
              const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getUTCDate()) ? age - 1 : age;
              return actualAge >= 18 || 'Debes ser mayor de 18 años';
            },
          })}
        />
        {errors.birthDate && <p className="mt-1 text-sm text-[color:var(--danger-texto)]">{errors.birthDate.message}</p>}
      </div>

      {/* Pregunta de seguridad */}
      <div>
        <label htmlFor="securityQuestion" className="block text-sm font-medium mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
          Pregunta de Seguridad para Recuperación de Contraseña
        </label>
        {loadingQuestions ? (
          <div className="mf-skeleton h-11 w-full" aria-busy="true" aria-label="Cargando preguntas de seguridad" />
        ) : securityQuestions.length === 0 && generalError ? (
          <Notification type="error" message={generalError} />
        ) : (
          <>
            <select
              id="securityQuestion"
              disabled={isSubmitting || loadingQuestions}
              className={inputClass(!!errors.securityQuestion)}
              style={inputStyle(!!errors.securityQuestion)}
              {...register('securityQuestion', {
                required: 'Debes seleccionar una pregunta de seguridad',
                onChange: () => setValue('securityAnswer', ''),
              })}
            >
              <option value="">Selecciona una pregunta de seguridad</option>
              {securityQuestions.map((q, i) => {
                const key = q.id || q.pregunta || `q-${i}`;
                return <option key={key} value={key}>{q.pregunta}</option>;
              })}
            </select>
            {errors.securityQuestion && <p className="mt-1 text-sm text-[color:var(--danger-texto)]">{errors.securityQuestion.message}</p>}
          </>
        )}
      </div>

      {/* Respuesta de seguridad */}
      {securityQuestionId && (
        <div>
          <label htmlFor="securityAnswer" className="block text-sm font-medium mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
            Respuesta a la Pregunta de Seguridad
          </label>
          <input
            type="text"
            id="securityAnswer"
            placeholder="Tu respuesta"
            disabled={isSubmitting}
            className={inputClass(!!errors.securityAnswer)}
            style={inputStyle(!!errors.securityAnswer)}
            {...register('securityAnswer', {
              required: 'La respuesta a la pregunta de seguridad es requerida',
              validate: (v) => {
                if (hasDangerousCharacters(v)) return 'La respuesta no puede contener caracteres especiales peligrosos';
                return v.trim().length >= 2 || 'La respuesta debe tener al menos 2 caracteres';
              },
            })}
          />
          {errors.securityAnswer && <p className="mt-1 text-sm text-[color:var(--danger-texto)]">{errors.securityAnswer.message}</p>}
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5">
      <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--menu-texto-principal)', fontFamily: 'var(--font-family-serif)' }}>Cuéntanos sobre tu cabello</h3>
      <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
        Las direcciones de envío las podrás agregar después desde tu perfil o al comprar en línea.
      </p>

      {/* Tipo de cabello */}
      <div>
        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--menu-texto-principal)' }}>Tipo de cabello</label>
        <Controller
          name="hairType"
          control={control}
          rules={{ required: 'Selecciona tu tipo de cabello' }}
          render={({ field }) => (
            <div className="space-y-2">
              {['Lacio', 'Ondulado', 'Rizado'].map((type) => {
                const val = type.toLowerCase();
                return (
                  <label key={type} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      value={val}
                      disabled={isSubmitting}
                      className="h-4 w-4 accent-[var(--botones-principales)]"
                      checked={field.value === val}
                      onChange={() => field.onChange(val)}
                      onBlur={field.onBlur}
                    />
                    <span className="ml-2" style={{ color: 'var(--menu-texto-principal)' }}>{type}</span>
                  </label>
                );
              })}
            </div>
          )}
        />
        {errors.hairType && <p className="mt-1 text-sm text-[color:var(--danger-texto)]">{errors.hairType.message}</p>}
      </div>

      {/* Color natural */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--menu-texto-principal)' }}>Color natural (opcional)</label>
        <input type="text" placeholder="Ej. Castaño oscuro" disabled={isSubmitting} className={inputClass(false)} style={inputStyle(false)} {...register('colorNatural')} />
      </div>

      {/* Color actual */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--menu-texto-principal)' }}>Color actual (opcional)</label>
        <input type="text" placeholder="Ej. Rubio cenizo" disabled={isSubmitting} className={inputClass(false)} style={inputStyle(false)} {...register('colorActual')} />
      </div>

      {/* Productos usados */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--menu-texto-principal)' }}>Productos usados (opcional)</label>
        <input type="text" placeholder="Ej. Shampoo sin sulfatos" disabled={isSubmitting} className={inputClass(false)} style={inputStyle(false)} {...register('productosUsados')} />
      </div>

      {/* Alergias */}
      <div>
        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--menu-texto-principal)' }}>¿Tienes alergias a productos?</label>
        <div className="space-y-3">
          <Controller
            name="hasAllergies"
            control={control}
            rules={{ required: 'Debes indicar si tienes alergias a productos' }}
            render={({ field }) => (
              <>
                <label className="flex items-center cursor-pointer">
                  <input type="radio" value="no" disabled={isSubmitting} className="h-4 w-4 accent-[var(--botones-principales)]"
                    checked={field.value === 'no'}
                    onChange={() => { field.onChange('no'); setValue('allergies', ''); }}
                    onBlur={field.onBlur}
                  />
                  <span className="ml-2" style={{ color: 'var(--menu-texto-principal)' }}>No</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input type="radio" value="yes" disabled={isSubmitting} className="h-4 w-4 accent-[var(--botones-principales)]"
                    checked={field.value === 'yes'}
                    onChange={() => field.onChange('yes')}
                    onBlur={field.onBlur}
                  />
                  <span className="ml-2" style={{ color: 'var(--menu-texto-principal)' }}>Sí</span>
                </label>
              </>
            )}
          />
          {hasAllergiesValue === 'yes' && (
            <input
              type="text"
              placeholder="Especifica tus alergias"
              disabled={isSubmitting}
              className={inputClass(!!errors.allergies)}
              style={inputStyle(!!errors.allergies)}
              {...register('allergies', {
                validate: (v, all) => {
                  if (all.hasAllergies !== 'yes') return true;
                  if (!v.trim()) return 'Especifica tus alergias';
                  if (hasDangerousCharacters(v)) return 'Las alergias no pueden contener caracteres especiales peligrosos';
                  return true;
                },
              })}
            />
          )}
          {errors.hasAllergies && <p className="mt-1 text-sm text-[color:var(--danger-texto)]">{errors.hasAllergies.message}</p>}
          {errors.allergies && <p className="mt-1 text-sm text-[color:var(--danger-texto)]">{errors.allergies.message}</p>}
        </div>
      </div>

      {/* Tratamientos químicos */}
      <div>
        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--menu-texto-principal)' }}>¿Tratamientos químicos previos?</label>
        <div className="space-y-3">
          <Controller
            name="hasChemicalTreatments"
            control={control}
            rules={{ required: 'Debes indicar si has tenido tratamientos químicos previos' }}
            render={({ field }) => (
              <>
                <label className="flex items-center cursor-pointer">
                  <input type="radio" value="no" disabled={isSubmitting} className="h-4 w-4 accent-[var(--botones-principales)]"
                    checked={field.value === 'no'}
                    onChange={() => { field.onChange('no'); setValue('chemicalTreatments', ''); }}
                    onBlur={field.onBlur}
                  />
                  <span className="ml-2" style={{ color: 'var(--menu-texto-principal)' }}>No</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input type="radio" value="yes" disabled={isSubmitting} className="h-4 w-4 accent-[var(--botones-principales)]"
                    checked={field.value === 'yes'}
                    onChange={() => field.onChange('yes')}
                    onBlur={field.onBlur}
                  />
                  <span className="ml-2" style={{ color: 'var(--menu-texto-principal)' }}>Sí</span>
                </label>
              </>
            )}
          />
          {hasChemicalTreatmentsValue === 'yes' && (
            <input
              type="text"
              placeholder="Especifica los tratamientos"
              disabled={isSubmitting}
              className={inputClass(!!errors.chemicalTreatments)}
              style={inputStyle(!!errors.chemicalTreatments)}
              {...register('chemicalTreatments', {
                validate: (v, all) => {
                  if (all.hasChemicalTreatments !== 'yes') return true;
                  if (!v.trim()) return 'Especifica los tratamientos';
                  if (hasDangerousCharacters(v)) return 'Los tratamientos no pueden contener caracteres especiales peligrosos';
                  return true;
                },
              })}
            />
          )}
          {errors.hasChemicalTreatments && <p className="mt-1 text-sm text-[color:var(--danger-texto)]">{errors.hasChemicalTreatments.message}</p>}
          {errors.chemicalTreatments && <p className="mt-1 text-sm text-[color:var(--danger-texto)]">{errors.chemicalTreatments.message}</p>}
        </div>
      </div>

      {/* Términos */}
      <div className="space-y-3 pt-4">
        <label className="flex items-start cursor-pointer">
          <Controller
            name="acceptTerms"
            control={control}
            rules={{ required: 'Debes aceptar los Términos y Condiciones' }}
            render={({ field }) => (
              <input
                type="checkbox"
                disabled={isSubmitting}
                className="mt-1 h-4 w-4 rounded accent-[var(--botones-principales)]"
                checked={!!field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                onBlur={field.onBlur}
              />
            )}
          />
          <span className="ml-2 text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
            Acepto los{' '}
            <a href="/terminos" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4" style={{ color: 'var(--menu-texto-principal)' }} onClick={(e) => e.stopPropagation()}>
              Términos y Condiciones
            </a>
          </span>
        </label>
        {errors.acceptTerms && <p className="text-sm text-[color:var(--danger-texto)]">{errors.acceptTerms.message}</p>}
        <label className="flex items-start cursor-pointer">
          <Controller
            name="receivePromotions"
            control={control}
            render={({ field }) => (
              <input
                type="checkbox"
                disabled={isSubmitting}
                className="mt-1 h-4 w-4 rounded accent-[var(--botones-principales)]"
                checked={!!field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                onBlur={field.onBlur}
              />
            )}
          />
          <span className="ml-2 text-sm" style={{ color: 'var(--menu-texto-principal)' }}>Deseo recibir promociones</span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-md mx-auto relative">
      {registerSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 min-w-[350px] max-w-[90%] animate-slide-down">
          <Notification type="success" message="Cliente registrada exitosamente" />
        </div>
      )}

      <div>
        <div className="mb-7">
          <h1 className="mf-titulo-pagina mb-2" style={{ color: 'var(--menu-texto-principal)' }}>Crear Cuenta</h1>
          {/* Pasos con nombre: la persona sabe qué falta antes de empezar (UX: progreso visible) */}
          <ol className="flex items-start gap-3 mt-5 mb-2">
            {[
              { n: 1, etiqueta: 'Tu cuenta' },
              { n: 2, etiqueta: 'Tu cabello' },
            ].map(({ n, etiqueta }) => {
              const hecho = n < currentStep;
              const activo = n === currentStep;
              return (
                <li key={n} className="flex items-center gap-3" aria-current={activo ? 'step' : undefined}>
                  <div className="flex flex-col items-center gap-1.5 w-20">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                      style={{
                        backgroundColor: n <= currentStep ? 'var(--botones-principales)' : 'var(--fondos-suaves)',
                        color: n <= currentStep ? '#F2F1ED' : 'var(--encabezados-alterno)',
                        boxShadow: activo ? '0 0 0 3px rgba(159, 109, 31, 0.55)' : 'none',
                        transition: 'background-color 240ms ease, box-shadow 240ms ease',
                      }}
                    >
                      {hecho ? <Check size={16} aria-hidden /> : n}
                    </div>
                    <span className={`text-xs ${activo ? 'font-semibold' : ''}`} style={{ color: activo ? 'var(--menu-texto-principal)' : 'var(--encabezados-alterno)' }}>
                      {etiqueta}
                    </span>
                  </div>
                  {n < 2 && (
                    <div className="w-10 h-px mt-4" style={{ backgroundColor: hecho ? 'var(--botones-principales)' : 'var(--mf-linea-fuerte)' }} aria-hidden />
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (currentStep === 1) { void handleNext(); }
            else { void handleSubmit(onFinalSubmit)(e); }
          }}
          className="space-y-5"
        >
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}

          {generalError && currentStep === 2 && (
            <div className="mb-4"><Notification type="error" message={generalError} /></div>
          )}

          <div className="flex gap-3 pt-4">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((p) => p - 1)}
                className="mf-btn mf-btn-color flex-1 min-h-12 py-3 px-4 rounded-[10px] font-semibold"
                style={{
                  ['--btn-bg' as string]: 'transparent',
                  ['--btn-texto' as string]: 'var(--menu-texto-principal)',
                  ['--btn-borde' as string]: '1.5px solid var(--mf-linea-fuerte)',
                  ['--btn-bg-hover' as string]: 'var(--nav-hover-bg)',
                }}
                disabled={isSubmitting}
              >
                Atrás
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mf-btn mf-btn-color flex-1 min-h-12 py-3 px-4 rounded-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                ['--btn-bg' as string]: 'var(--botones-principales)',
                ['--btn-bg-hover' as string]: 'var(--hover)',
                ['--btn-texto' as string]: '#F2F1ED',
              }}
            >
              <span className="mf-feedback-contenido" data-cambiando={isSubmitting ? 'true' : 'false'}>
                {currentStep === 1 ? 'Continuar' : isSubmitting ? 'Registrando…' : 'Finalizar registro'}
              </span>
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            ¿Ya tienes una cuenta?{' '}
            <button
              type="button"
              onClick={handleSwitchToLogin}
              className="inline-flex min-h-11 items-center font-semibold underline-offset-4 hover:underline"
              style={{ color: 'var(--menu-texto-principal)' }}
              disabled={isSubmitting}
            >
              Inicia Sesión
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
