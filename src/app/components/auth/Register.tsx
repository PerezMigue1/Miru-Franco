'use client';

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
          if (response.token) {
            localStorage.setItem('token', response.token);
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

  const inputStyle = (hasError: boolean) => ({
    backgroundColor: '#f2f1ed',
    color: '#161616',
    borderColor: hasError ? '#590C0C' : 'rgba(255,255,255,0.2)',
  });

  const inputClass = (hasError: boolean) =>
    `w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-colors ${
      hasError ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'
    }`;

  const renderStep1 = () => (
    <div className="space-y-5">
      {/* Nombre */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-2" style={{ color: '#F2F1ED' }}>Nombre Completo</label>
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
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: '#F2F1ED' }}>Correo Electrónico</label>
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
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600" />
            </div>
          )}
          {!verificandoCorreo && correoExiste && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
          )}
          {!verificandoCorreo && !correoExiste && emailValue && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue.trim()) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
        {correoExiste && !errors.email && <p className="mt-1 text-sm text-red-600">Este correo ya está registrado.</p>}
        {!errors.email && verificandoCorreo && <p className="mt-1 text-sm text-yellow-600">Verificando correo...</p>}
        {!errors.email && !verificandoCorreo && !correoExiste && emailValue && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue.trim()) && (
          <p className="mt-1 text-sm text-green-600">✓ Correo disponible</p>
        )}
      </div>

      {/* Teléfono */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium mb-2" style={{ color: '#F2F1ED' }}>Teléfono</label>
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
        <p className="mt-1 text-xs opacity-80" style={{ color: '#F2F1ED' }}>{MENSAJE_FORMATO_TELEFONO}</p>
        {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
      </div>

      {/* Contraseña */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: '#F2F1ED' }}>Contraseña</label>
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
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#161616' }} disabled={isSubmitting}>
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            )}
          </button>
        </div>
        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
        {passwordErrors.length > 0 && !errors.password && (
          <div className="mt-1 space-y-1">
            {passwordErrors.map((e, i) => <p key={i} className="text-xs text-red-600">• {e}</p>)}
          </div>
        )}
        {passwordErrors.length === 0 && passwordValue && (
          <div className="mt-1">
            <p className="text-xs text-green-600 mb-1">✓ Contraseña válida</p>
            {passwordStrength && (
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: '#F2F1ED' }}>Fortaleza:</span>
                <div className="flex-1 h-2 bg-gray-300 rounded-full overflow-hidden">
                  <div className={`h-full transition-all ${passwordStrength === 'strong' ? 'bg-green-500 w-full' : passwordStrength === 'medium' ? 'bg-yellow-500 w-2/3' : 'bg-red-500 w-1/3'}`} />
                </div>
                <span className={`text-xs font-medium ${passwordStrength === 'strong' ? 'text-green-600' : passwordStrength === 'medium' ? 'text-yellow-600' : 'text-red-600'}`}>
                  {passwordStrength === 'strong' ? 'Fuerte' : passwordStrength === 'medium' ? 'Media' : 'Débil'}
                </span>
              </div>
            )}
          </div>
        )}
        {!passwordValue && <p className="mt-1 text-xs" style={{ color: 'rgba(242,241,237,0.7)' }}>Mínimo 8 caracteres, con mayúsculas, minúsculas y números</p>}
      </div>

      {/* Confirmar contraseña */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2" style={{ color: '#F2F1ED' }}>Confirmar Contraseña</label>
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
          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#161616' }} disabled={isSubmitting}>
            {showConfirmPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            )}
          </button>
        </div>
        {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>}
      </div>

      {/* Fecha de nacimiento */}
      <div>
        <label htmlFor="birthDate" className="block text-sm font-medium mb-2" style={{ color: '#F2F1ED' }}>Fecha de Nacimiento</label>
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
              const birth = new Date(v);
              const today = new Date();
              const age = today.getFullYear() - birth.getFullYear();
              const monthDiff = today.getMonth() - birth.getMonth();
              const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate()) ? age - 1 : age;
              return actualAge >= 18 || 'Debes ser mayor de 18 años';
            },
          })}
        />
        {errors.birthDate && <p className="mt-1 text-sm text-red-600">{errors.birthDate.message}</p>}
      </div>

      {/* Pregunta de seguridad */}
      <div>
        <label htmlFor="securityQuestion" className="block text-sm font-medium mb-2" style={{ color: '#F2F1ED' }}>
          Pregunta de Seguridad para Recuperación de Contraseña
        </label>
        {loadingQuestions ? (
          <div className="w-full px-4 py-3 rounded-lg border" style={{ backgroundColor: '#f2f1ed', borderColor: 'rgba(255,255,255,0.2)' }}>
            <p style={{ color: '#161616' }}>Cargando preguntas...</p>
          </div>
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
            {errors.securityQuestion && <p className="mt-1 text-sm text-red-600">{errors.securityQuestion.message}</p>}
          </>
        )}
      </div>

      {/* Respuesta de seguridad */}
      {securityQuestionId && (
        <div>
          <label htmlFor="securityAnswer" className="block text-sm font-medium mb-2" style={{ color: '#F2F1ED' }}>
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
          {errors.securityAnswer && <p className="mt-1 text-sm text-red-600">{errors.securityAnswer.message}</p>}
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold mb-2" style={{ color: '#F2F1ED' }}>Cuéntanos sobre tu cabello</h3>
      <p className="text-sm mb-4 opacity-90" style={{ color: '#F2F1ED' }}>
        Las direcciones de envío las podrás agregar después desde tu perfil o al comprar en línea.
      </p>

      {/* Tipo de cabello */}
      <div>
        <label className="block text-sm font-medium mb-3 text-zinc-700 dark:text-zinc-300">Tipo de cabello</label>
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
                      className="h-4 w-4"
                      checked={field.value === val}
                      onChange={() => field.onChange(val)}
                      onBlur={field.onBlur}
                    />
                    <span className="ml-2" style={{ color: '#F2F1ED' }}>{type}</span>
                  </label>
                );
              })}
            </div>
          )}
        />
        {errors.hairType && <p className="mt-1 text-sm text-red-600">{errors.hairType.message}</p>}
      </div>

      {/* Color natural */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#F2F1ED' }}>Color natural (opcional)</label>
        <input type="text" placeholder="Ej. Castaño oscuro" disabled={isSubmitting} className={inputClass(false)} style={inputStyle(false)} {...register('colorNatural')} />
      </div>

      {/* Color actual */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#F2F1ED' }}>Color actual (opcional)</label>
        <input type="text" placeholder="Ej. Rubio cenizo" disabled={isSubmitting} className={inputClass(false)} style={inputStyle(false)} {...register('colorActual')} />
      </div>

      {/* Productos usados */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#F2F1ED' }}>Productos usados (opcional)</label>
        <input type="text" placeholder="Ej. Shampoo sin sulfatos" disabled={isSubmitting} className={inputClass(false)} style={inputStyle(false)} {...register('productosUsados')} />
      </div>

      {/* Alergias */}
      <div>
        <label className="block text-sm font-medium mb-3 text-zinc-700 dark:text-zinc-300">¿Tienes alergias a productos?</label>
        <div className="space-y-3">
          <Controller
            name="hasAllergies"
            control={control}
            rules={{ required: 'Debes indicar si tienes alergias a productos' }}
            render={({ field }) => (
              <>
                <label className="flex items-center cursor-pointer">
                  <input type="radio" value="no" disabled={isSubmitting} className="h-4 w-4"
                    checked={field.value === 'no'}
                    onChange={() => { field.onChange('no'); setValue('allergies', ''); }}
                    onBlur={field.onBlur}
                  />
                  <span className="ml-2" style={{ color: '#F2F1ED' }}>No</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input type="radio" value="yes" disabled={isSubmitting} className="h-4 w-4"
                    checked={field.value === 'yes'}
                    onChange={() => field.onChange('yes')}
                    onBlur={field.onBlur}
                  />
                  <span className="ml-2" style={{ color: '#F2F1ED' }}>Sí</span>
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
          {errors.hasAllergies && <p className="mt-1 text-sm text-red-600">{errors.hasAllergies.message}</p>}
          {errors.allergies && <p className="mt-1 text-sm text-red-600">{errors.allergies.message}</p>}
        </div>
      </div>

      {/* Tratamientos químicos */}
      <div>
        <label className="block text-sm font-medium mb-3 text-zinc-700 dark:text-zinc-300">¿Tratamientos químicos previos?</label>
        <div className="space-y-3">
          <Controller
            name="hasChemicalTreatments"
            control={control}
            rules={{ required: 'Debes indicar si has tenido tratamientos químicos previos' }}
            render={({ field }) => (
              <>
                <label className="flex items-center cursor-pointer">
                  <input type="radio" value="no" disabled={isSubmitting} className="h-4 w-4"
                    checked={field.value === 'no'}
                    onChange={() => { field.onChange('no'); setValue('chemicalTreatments', ''); }}
                    onBlur={field.onBlur}
                  />
                  <span className="ml-2" style={{ color: '#F2F1ED' }}>No</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input type="radio" value="yes" disabled={isSubmitting} className="h-4 w-4"
                    checked={field.value === 'yes'}
                    onChange={() => field.onChange('yes')}
                    onBlur={field.onBlur}
                  />
                  <span className="ml-2" style={{ color: '#F2F1ED' }}>Sí</span>
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
          {errors.hasChemicalTreatments && <p className="mt-1 text-sm text-red-600">{errors.hasChemicalTreatments.message}</p>}
          {errors.chemicalTreatments && <p className="mt-1 text-sm text-red-600">{errors.chemicalTreatments.message}</p>}
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
                className="mt-1 h-4 w-4 rounded border-zinc-300"
                checked={!!field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                onBlur={field.onBlur}
              />
            )}
          />
          <span className="ml-2 text-sm" style={{ color: '#F2F1ED' }}>
            Acepto los{' '}
            <a href="/terminos" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: '#243B5A' }} onClick={(e) => e.stopPropagation()}>
              Términos y Condiciones
            </a>
          </span>
        </label>
        {errors.acceptTerms && <p className="text-sm text-red-600">{errors.acceptTerms.message}</p>}
        <label className="flex items-start cursor-pointer">
          <Controller
            name="receivePromotions"
            control={control}
            render={({ field }) => (
              <input
                type="checkbox"
                disabled={isSubmitting}
                className="mt-1 h-4 w-4 rounded border-zinc-300"
                checked={!!field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                onBlur={field.onBlur}
              />
            )}
          />
          <span className="ml-2 text-sm" style={{ color: '#F2F1ED' }}>Deseo recibir promociones</span>
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

      <div className="rounded-lg shadow-lg p-8 border" style={{ backgroundColor: '#161616', borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="mb-6">
          <h2 className="text-page-title text-center mb-2" style={{ color: '#F2F1ED' }}>Crear Cuenta</h2>
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                  style={{
                    backgroundColor: step <= currentStep ? '#710014' : 'rgba(255,255,255,0.2)',
                    color: step <= currentStep ? '#F2F1ED' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {step < currentStep ? '✓' : step}
                </div>
                {step < 2 && <div className="w-12 h-1" style={{ backgroundColor: step < currentStep ? '#710014' : 'rgba(255,255,255,0.2)' }} />}
              </div>
            ))}
          </div>
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
                className="flex-1 py-3 px-4 rounded-lg border font-medium hover:opacity-80 transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#F2F1ED' }}
                disabled={isSubmitting}
              >
                Atrás
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-lg text-white font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#710014' }}
            >
              {currentStep === 1 ? 'Continuar' : isSubmitting ? 'Registrando...' : 'Finalizar registro'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm" style={{ color: '#F2F1ED' }}>
            ¿Ya tienes una cuenta?{' '}
            <button
              onClick={handleSwitchToLogin}
              className="font-medium hover:underline"
              style={{ color: '#243B5A' }}
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
