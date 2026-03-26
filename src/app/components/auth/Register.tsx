'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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

export default function Register({ 
  onSwitchToLogin,
  onRegisterSuccess 
}: RegisterProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  
  // Funcion para navegar usando router
  const handleSwitchToLogin = () => {
    if (onSwitchToLogin) {
      onSwitchToLogin();
    } else {
      router.push('/login');
    }
  };
  const [formData, setFormData] = useState({
    // Paso 1: Información básica
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    birthDate: '',
    securityQuestion: '',
    
    // Paso 2: Perfil capilar (las direcciones van en DireccionUsuario, fuera del registro)
    hairType: '',
    colorNatural: '',
    colorActual: '',
    productosUsados: '',
    hasAllergies: null as boolean | null,
    allergies: '',
    hasChemicalTreatments: null as boolean | null,
    chemicalTreatments: '',
    acceptTerms: false,
    receivePromotions: false,
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [securityQuestions, setSecurityQuestions] = useState<Array<{_id?: string, pregunta: string}>>([]);
  const [selectedQuestionText, setSelectedQuestionText] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [showActivation, setShowActivation] = useState(false);
  const [emailForActivation, setEmailForActivation] = useState('');
  const [verificandoCorreo, setVerificandoCorreo] = useState(false);
  const [correoExiste, setCorreoExiste] = useState(false);
  const emailTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar preguntas de seguridad disponibles
  useEffect(() => {
    const loadSecurityQuestions = async () => {
      setLoadingQuestions(true);
      setErrors({}); // Limpiar errores previos
      try {
        const { api } = await import('../../services');
        console.log('Cargando preguntas de seguridad...');
        const data = await api.getAvailableSecurityQuestions();
        console.log('Datos recibidos:', data);
        
        // Normalizar los datos - puede venir con 'pregunta' o 'question'
        const questions = (data.questions || []).map((q: {_id?: string, pregunta?: string, question?: string} | string) => {
          if (typeof q === 'string') {
            return { pregunta: q };
          }
          return {
            _id: q._id,
            pregunta: q.pregunta || q.question || ''
          };
        });
        
        console.log('Preguntas normalizadas:', questions);
        
        if (questions.length === 0) {
          console.warn('No se encontraron preguntas de seguridad');
          setErrors({ general: 'No se encontraron preguntas de seguridad disponibles' });
        } else {
          setSecurityQuestions(questions);
        }
      } catch (error: unknown) {
        console.error('Error cargando preguntas de seguridad:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        setErrors({ 
          general: `Error al cargar preguntas: ${errorMessage}. Verifica que el endpoint /api/pregunta-seguridad esté disponible en el backend.` 
        });
      } finally {
        setLoadingQuestions(false);
      }
    };

    loadSecurityQuestions();
  }, []);

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    
    // ✅ Validar entrada de usuario - NO permitir caracteres peligrosos
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre completo es requerido';
    } else {
      // Verificar caracteres peligrosos ANTES de sanitizar
      if (hasDangerousCharacters(formData.name)) {
        newErrors.name = 'El nombre no puede contener caracteres especiales peligrosos (<, >, script, etc.)';
      } else {
        const sanitizedName = sanitizeInput(formData.name);
        if (sanitizedName.length < 2) {
          newErrors.name = 'El nombre debe tener al menos 2 caracteres';
        }
      }
    }
    
    if (!formData.email) {
      newErrors.email = 'El correo electrónico es requerido';
    } else {
      const sanitizedEmail = sanitizeEmail(formData.email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
        newErrors.email = 'El correo electrónico no es válido';
      }
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es requerido';
    } else if (!esTelefonoMexicoValido(formData.phone)) {
      newErrors.phone = mensajeTelefonoInvalido();
    }
    
    // ✅ Usar validación centralizada de seguridad con todos los datos del usuario
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else {
      const validation = validatePassword(formData.password, {
        nombre: formData.name,
        email: formData.email,
        telefono: formData.phone,
        fechaNacimiento: formData.birthDate,
        preguntaSeguridad: {
          respuesta: securityAnswer,
        },
      });
      if (!validation.valid) {
        // Mostrar el primer error o todos los errores
        newErrors.password = validation.errors?.[0] || validation.message || 'La contraseña no cumple con los requisitos';
      }
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }
    
    if (!formData.birthDate) {
      newErrors.birthDate = 'La fecha de nacimiento es requerida';
    } else {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
      
      if (actualAge < 18) {
        newErrors.birthDate = 'Debes ser mayor de 18 años';
      }
    }
    
    if (!formData.securityQuestion) {
      newErrors.securityQuestion = 'Debes seleccionar una pregunta de seguridad';
    }
    
    if (!securityAnswer.trim()) {
      newErrors.securityAnswer = 'La respuesta a la pregunta de seguridad es requerida';
    } else {
      // Verificar caracteres peligrosos
      if (hasDangerousCharacters(securityAnswer)) {
        newErrors.securityAnswer = 'La respuesta no puede contener caracteres especiales peligrosos (<, >, script, etc.)';
      } else if (securityAnswer.trim().length < 2) {
        newErrors.securityAnswer = 'La respuesta debe tener al menos 2 caracteres';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.hairType) {
      newErrors.hairType = 'Selecciona tu tipo de cabello';
    }
    
    // hasAllergies es obligatorio (debe ser true o false, no null)
    if (formData.hasAllergies === null) {
      newErrors.hasAllergies = 'Debes indicar si tienes alergias a productos';
    } else if (formData.hasAllergies === true && !formData.allergies.trim()) {
      newErrors.allergies = 'Especifica tus alergias';
    } else if (formData.hasAllergies === true && formData.allergies.trim() && hasDangerousCharacters(formData.allergies)) {
      newErrors.allergies = 'Las alergias no pueden contener caracteres especiales peligrosos (<, >, script, etc.)';
    }
    
    // hasChemicalTreatments es obligatorio (debe ser true o false, no null)
    if (formData.hasChemicalTreatments === null) {
      newErrors.hasChemicalTreatments = 'Debes indicar si has tenido tratamientos químicos previos';
    } else if (formData.hasChemicalTreatments === true && !formData.chemicalTreatments.trim()) {
      newErrors.chemicalTreatments = 'Especifica los tratamientos';
    } else if (formData.hasChemicalTreatments === true && formData.chemicalTreatments.trim() && hasDangerousCharacters(formData.chemicalTreatments)) {
      newErrors.chemicalTreatments = 'Los tratamientos no pueden contener caracteres especiales peligrosos (<, >, script, etc.)';
    }
    
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'Debes aceptar los Términos y Condiciones';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // ✅ Validar caracteres peligrosos en tiempo real para campos de texto
    if (typeof value === 'string') {
      const textFieldsToValidate = ['name', 'allergies', 'chemicalTreatments'];
      if (textFieldsToValidate.includes(field)) {
        if (value.trim() && hasDangerousCharacters(value)) {
          // Mostrar error pero permitir que el usuario vea lo que escribió
          setErrors(prev => ({
            ...prev,
            [field]: 'No se permiten caracteres especiales peligrosos (<, >, script, etc.)'
          }));
        } else {
          // Limpiar error si ya no hay caracteres peligrosos
          if (errors[field] && errors[field].includes('caracteres especiales peligrosos')) {
            setErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors[field];
              return newErrors;
            });
          }
        }
      }
    }
    
    // Limpiar error del campo si ya no hay errores (para otros tipos de errores)
    if (errors[field] && !errors[field].includes('caracteres especiales peligrosos')) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    // Validación en tiempo real de contraseña con todos los datos del usuario
    if (field === 'password' && typeof value === 'string') {
      const validation = validatePassword(value, {
        nombre: formData.name,
        email: formData.email,
        telefono: formData.phone,
        fechaNacimiento: formData.birthDate,
        preguntaSeguridad: {
          respuesta: securityAnswer,
        },
      });
      
      if (!validation.valid && validation.errors) {
        setPasswordErrors(validation.errors);
      } else {
        setPasswordErrors([]);
      }
      
      // Actualizar indicador de fortaleza
      setPasswordStrength(validation.strength || null);
    }
    
    // Validación en tiempo real del correo
    if (field === 'email' && typeof value === 'string') {
      const emailValue = value.trim();
      
      // Limpiar timeout anterior si existe
      if (emailTimeoutRef.current) {
        clearTimeout(emailTimeoutRef.current);
        emailTimeoutRef.current = null;
      }
      
      // Si el campo está vacío, limpiar estados
      if (!emailValue) {
        setCorreoExiste(false);
        setVerificandoCorreo(false);
        return;
      }
      
      // Validar formato de email antes de verificar
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
        // Debounce: esperar 500ms después de que el usuario deje de escribir
        emailTimeoutRef.current = setTimeout(async () => {
          setVerificandoCorreo(true);
          try {
            const { api } = await import('../../services');
            const resultado = await api.verificarCorreoExistente(emailValue);
            setCorreoExiste(resultado.existe);
            if (resultado.existe) {
              setErrors(prev => ({
                ...prev,
                email: 'Este correo ya está registrado. Por favor, usa otro correo o inicia sesión.'
              }));
            } else {
              // Limpiar error si el correo está disponible
              setErrors(prev => {
                const newErrors = { ...prev };
                if (newErrors.email && newErrors.email.includes('ya está registrado')) {
                  delete newErrors.email;
                }
                return newErrors;
              });
            }
          } catch (error) {
            console.error('Error al verificar correo:', error);
            // No mostrar error si falla la verificación, solo si el correo existe
          } finally {
            setVerificandoCorreo(false);
          }
        }, 500);
      } else {
        // Si el formato no es válido, limpiar el estado de verificación
        setCorreoExiste(false);
        setVerificandoCorreo(false);
      }
    }
  };
  
  // Limpiar timeout al desmontar el componente
  useEffect(() => {
    return () => {
      if (emailTimeoutRef.current) {
        clearTimeout(emailTimeoutRef.current);
      }
    };
  }, []);

  const handleNext = () => {
    if (currentStep !== 1) return;
    if (!validateStep1()) return;
    setFormData((prev) => ({
      ...prev,
      hairType: '',
      colorNatural: '',
      colorActual: '',
      productosUsados: '',
      hasAllergies: null,
      allergies: '',
      hasChemicalTreatments: null,
      chemicalTreatments: '',
      acceptTerms: false,
      receivePromotions: false,
    }));
    setCurrentStep(2);
  };

  const handleSubmit = async (skipValidation = false) => {
    // ✅ Prevenir doble submit - verificar ANTES de cualquier otra lógica
    if (isLoading) {
      console.warn('⚠️ Submit ya en proceso, ignorando...');
      return;
    }
    
    if (!skipValidation) {
      // Primero validar y obtener los errores
      const validationErrors: Record<string, string> = {};
      
      if (!formData.hairType) {
        validationErrors.hairType = 'Selecciona tu tipo de cabello';
      }
      
      if (formData.hasAllergies === null) {
        validationErrors.hasAllergies = 'Debes indicar si tienes alergias a productos';
      } else if (formData.hasAllergies === true && !formData.allergies.trim()) {
        validationErrors.allergies = 'Especifica tus alergias';
      } else if (formData.hasAllergies === true && formData.allergies.trim() && hasDangerousCharacters(formData.allergies)) {
        validationErrors.allergies = 'Las alergias no pueden contener caracteres especiales peligrosos (<, >, script, etc.)';
      }
      
      if (formData.hasChemicalTreatments === null) {
        validationErrors.hasChemicalTreatments = 'Debes indicar si has tenido tratamientos químicos previos';
      } else if (formData.hasChemicalTreatments === true && !formData.chemicalTreatments.trim()) {
        validationErrors.chemicalTreatments = 'Especifica los tratamientos';
      } else if (formData.hasChemicalTreatments === true && formData.chemicalTreatments.trim() && hasDangerousCharacters(formData.chemicalTreatments)) {
        validationErrors.chemicalTreatments = 'Los tratamientos no pueden contener caracteres especiales peligrosos (<, >, script, etc.)';
      }
      
      if (!formData.acceptTerms) {
        validationErrors.acceptTerms = 'Debes aceptar los Términos y Condiciones';
      }
      
      if (Object.keys(validationErrors).length > 0) {
        // Si hay errores, establecerlos y mostrar mensaje general apropiado
        if (!formData.acceptTerms) {
          validationErrors.general = 'Debes aceptar los Términos y Condiciones para continuar';
        } else {
          validationErrors.general = 'Por favor, completa todos los campos obligatorios antes de continuar';
        }
        setErrors(validationErrors);
        return;
      }
    }
    
    setIsLoading(true);
    
    try {
      const { api } = await import('../../services');
      
      // ✅ Sanitizar todos los campos de texto antes de enviar al backend para prevenir XSS
      // IMPORTANTE: Esta sanitización del frontend NO es suficiente por sí sola.
      // El BACKEND también DEBE sanitizar todos los campos recibidos para prevenir XSS
      // cuando se reciben peticiones directas (bypass del frontend, Postman, curl, etc.)
      // Preparar datos para enviar según la estructura del backend
      const registerData = {
        nombre: sanitizeInput(formData.name),
        email: sanitizeEmail(formData.email), // Email solo se normaliza, no escapa HTML
        password: formData.password, // Las contraseñas no se sanitizan (se hashean en el backend)
        telefono: normalizarTelefonoRegistro(formData.phone),
        fechaNacimiento: formData.birthDate, // Las fechas no necesitan sanitización
        preguntaSeguridad: {
          pregunta: sanitizeInput(selectedQuestionText || ''), // Texto completo de la pregunta
          respuesta: sanitizeInput(securityAnswer || '') // Respuesta del usuario
        },
        perfilCapilar: {
          tipoCabello: formData.hairType === 'lacio' ? 'liso' : 
                      formData.hairType === 'ondulado' ? 'ondulado' :
                      formData.hairType === 'rizado' ? 'rizado' : 
                      formData.hairType || 'liso', // Fallback a 'liso' si está vacío
          colorNatural: formData.colorNatural ? sanitizeInput(formData.colorNatural) : undefined,
          colorActual: formData.colorActual ? sanitizeInput(formData.colorActual) : undefined,
          productosUsados: formData.productosUsados ? sanitizeInput(formData.productosUsados) : undefined,
          tieneAlergias: formData.hasAllergies === true, // Boolean: true o false (no null)
          alergias: formData.hasAllergies === true ? sanitizeInput(formData.allergies) : undefined,
          tratamientosQuimicos: formData.hasChemicalTreatments === true, // Boolean: true o false (no null)
          tratamientos: formData.hasChemicalTreatments === true ? sanitizeInput(formData.chemicalTreatments) : undefined,
        },
        aceptaAvisoPrivacidad: formData.acceptTerms, // El backend espera aceptaAvisoPrivacidad
        recibePromociones: formData.receivePromotions,
      };
      
      // ✅ Log seguro: solo en desarrollo y sin datos sensibles
      if (process.env.NODE_ENV === 'development') {
        // ❌ NO loguear datos completos (pueden contener información sensible)
        // Solo loguear estructura sin valores sensibles
        console.log('Datos de registro preparados:', {
          hasNombre: !!registerData.nombre,
          hasEmail: !!registerData.email,
          hasPassword: !!registerData.password,
          passwordLength: registerData.password?.length || 0,
          // ❌ NUNCA loguear: contraseñas, emails, nombres completos, ni JSON.stringify
        });
      }
      
      const response = await api.register(registerData);
      
      // Validar que el registro fue exitoso
      if (response.success) {
        setErrors({}); // Limpiar errores
        
        // Si requiere verificación OTP, mostrar pantalla de activación
        if (response.requiereVerificacion || response.message?.toLowerCase().includes('código') || response.message?.toLowerCase().includes('activar')) {
          setEmailForActivation(formData.email);
          setShowActivation(true);
        } else {
          // Si no requiere verificación y hay token, guardarlo y redirigir a home
          if (response.token) {
            localStorage.setItem('token', response.token);
            setRegisterSuccess(true);
            setTimeout(() => {
              // Redirigir a home en lugar de cambiar a login
              if (typeof window !== 'undefined') {
                window.location.href = '/home';
              } else {
                onRegisterSuccess?.();
              }
            }, 2000);
          } else {
            // Si no hay token, mostrar éxito y cambiar a login
            setRegisterSuccess(true);
            setTimeout(() => {
              onRegisterSuccess?.();
            }, 2000);
          }
        }
      } else {
        // Si el backend devuelve un error específico, mostrarlo
        const backendError = response.error || 'Error al crear la cuenta';
        throw new Error(backendError);
      }
    } catch (error: unknown) {
      console.error('Error en registro:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al crear la cuenta';
      
      if (errorMessage.toLowerCase().includes('faltan campos') || errorMessage.toLowerCase().includes('campos obligatorios')) {
        setErrors({ 
          general: 'Por favor, verifica que todos los campos obligatorios estén completos. Si el problema persiste, recarga la página e intenta nuevamente.' 
        });
      } else {
        setErrors({ general: errorMessage });
      }
      setRegisterSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Renderizado del Paso 1: Información Básica
  const renderStep1 = () => (
    <div className="space-y-5">
      <div>
        <label 
          htmlFor="name" 
                className="block text-sm font-medium mb-2"
                style={{ color: '#F2F1ED' }}
        >
          Nombre Completo
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className={`w-full px-4 py-3 rounded-lg border ${
            errors.name 
              ? 'border-red-500 dark:border-red-600' 
              : 'border-zinc-300 dark:border-zinc-700'
          } focus:outline-none focus:ring-2 transition-colors`}
              style={{ 
                backgroundColor: '#f2f1ed', 
                color: '#161616',
                borderColor: errors.name ? '#590C0C' : 'rgba(255,255,255,0.2)'
              }}
          placeholder="Juan Pérez"
          disabled={isLoading}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label 
          htmlFor="email" 
                className="block text-sm font-medium mb-2"
                style={{ color: '#F2F1ED' }}
        >
          Correo Electrónico
        </label>
        <div className="relative">
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className={`w-full px-4 py-3 rounded-lg border ${
              errors.email || correoExiste
                ? 'border-red-500 dark:border-red-600' 
                : verificandoCorreo
                ? 'border-yellow-500 dark:border-yellow-600'
                : 'border-zinc-300 dark:border-zinc-700'
            } focus:outline-none focus:ring-2 transition-colors pr-12`}
                style={{ 
                  backgroundColor: '#f2f1ed', 
                  color: '#161616',
                  borderColor: errors.email || correoExiste ? '#590C0C' : verificandoCorreo ? '#F59E0B' : 'rgba(255,255,255,0.2)'
                }}
            placeholder="tu@email.com"
            disabled={isLoading}
          />
          {verificandoCorreo && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
            </div>
          )}
          {!verificandoCorreo && correoExiste && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
          )}
          {!verificandoCorreo && !correoExiste && formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()) && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
        {errors.email && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.email}
          </p>
        )}
        {!errors.email && verificandoCorreo && (
          <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">
            Verificando correo...
          </p>
        )}
        {!errors.email && !verificandoCorreo && !correoExiste && formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()) && (
          <p className="mt-1 text-sm text-green-600 dark:text-green-400">
            ✓ Correo disponible
          </p>
        )}
      </div>

      <div>
        <label 
          htmlFor="phone" 
                className="block text-sm font-medium mb-2"
                style={{ color: '#F2F1ED' }}
        >
          Teléfono
        </label>
        <input
          type="tel"
          id="phone"
          inputMode="tel"
          autoComplete="tel"
          value={formData.phone}
          onChange={(e) => handleChange('phone', sanitizarEntradaTelefono10(e.target.value))}
          onBlur={(e) => {
            const v = sanitizarEntradaTelefono10(e.target.value);
            if (!v) {
              setErrors((prev) => {
                const next = { ...prev };
                delete next.phone;
                return next;
              });
              return;
            }
            if (!esTelefonoMexicoValido(v)) {
              setErrors((prev) => ({ ...prev, phone: mensajeTelefonoInvalido() }));
            } else {
              setErrors((prev) => {
                const next = { ...prev };
                delete next.phone;
                return next;
              });
            }
          }}
          className={`w-full px-4 py-3 rounded-lg border ${
            errors.phone 
              ? 'border-red-500 dark:border-red-600' 
              : 'border-zinc-300 dark:border-zinc-700'
          } focus:outline-none focus:ring-2 transition-colors`}
              style={{ 
                backgroundColor: '#f2f1ed', 
                color: '#161616',
                borderColor: errors.phone ? '#590C0C' : 'rgba(255,255,255,0.2)'
              }}
          placeholder="5512345678"
          maxLength={10}
          disabled={isLoading}
        />
        <p className="mt-1 text-xs opacity-80" style={{ color: '#F2F1ED' }}>
          {MENSAJE_FORMATO_TELEFONO}
        </p>
        {errors.phone && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.phone}
          </p>
        )}
      </div>

      <div>
        <label 
          htmlFor="password" 
                className="block text-sm font-medium mb-2"
                style={{ color: '#F2F1ED' }}
        >
          Contraseña
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            id="password"
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            className={`w-full px-4 py-3 rounded-lg border ${
              errors.password 
                ? 'border-red-500 dark:border-red-600' 
                : 'border-zinc-300 dark:border-zinc-700'
            } focus:outline-none focus:ring-2 transition-colors pr-12`}
            style={{ 
              backgroundColor: '#f2f1ed', 
              color: '#161616',
              borderColor: errors.password ? '#590C0C' : 'rgba(255,255,255,0.2)'
            }}
            placeholder="••••••••"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: '#161616' }}
            disabled={isLoading}
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.password}
          </p>
        )}
        {passwordErrors.length > 0 && (
          <div className="mt-1 space-y-1">
            {passwordErrors.map((error, i) => (
              <p key={i} className="text-xs text-red-600 dark:text-red-400">
                • {error}
              </p>
            ))}
          </div>
        )}
        {passwordErrors.length === 0 && formData.password && (
          <div className="mt-1">
            <p className="text-xs text-green-600 dark:text-green-400 mb-1">
              ✓ Contraseña válida
            </p>
            {passwordStrength && (
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: '#F2F1ED' }}>Fortaleza:</span>
                <div className="flex-1 h-2 bg-gray-300 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      passwordStrength === 'strong'
                        ? 'bg-green-500 w-full'
                        : passwordStrength === 'medium'
                        ? 'bg-yellow-500 w-2/3'
                        : 'bg-red-500 w-1/3'
                    }`}
                  />
                </div>
                <span
                  className={`text-xs font-medium ${
                    passwordStrength === 'strong'
                      ? 'text-green-600'
                      : passwordStrength === 'medium'
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}
                >
                  {passwordStrength === 'strong' ? 'Fuerte' : passwordStrength === 'medium' ? 'Media' : 'Débil'}
                </span>
              </div>
            )}
          </div>
        )}
        {passwordErrors.length === 0 && !formData.password && (
          <p className="mt-1 text-xs"
          style={{ color: 'rgba(242,241,237,0.7)' }}>
            Mínimo 8 caracteres, con mayúsculas, minúsculas y números
          </p>
        )}
      </div>

      <div>
        <label 
          htmlFor="confirmPassword" 
                className="block text-sm font-medium mb-2"
                style={{ color: '#F2F1ED' }}
        >
          Confirmar Contraseña
        </label>
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            id="confirmPassword"
            value={formData.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            className={`w-full px-4 py-3 rounded-lg border ${
              errors.confirmPassword 
                ? 'border-red-500 dark:border-red-600' 
                : 'border-zinc-300 dark:border-zinc-700'
            } focus:outline-none focus:ring-2 transition-colors pr-12`}
            style={{ 
              backgroundColor: '#f2f1ed', 
              color: '#161616',
              borderColor: errors.confirmPassword ? '#590C0C' : 'rgba(255,255,255,0.2)'
            }}
            placeholder="••••••••"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: '#161616' }}
            disabled={isLoading}
          >
            {showConfirmPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.confirmPassword}
          </p>
        )}
      </div>

      <div>
        <label 
          htmlFor="birthDate" 
                className="block text-sm font-medium mb-2"
                style={{ color: '#F2F1ED' }}
        >
          Fecha de Nacimiento
        </label>
        <input
          type="date"
          id="birthDate"
          value={formData.birthDate}
          onChange={(e) => handleChange('birthDate', e.target.value)}
          className={`w-full px-4 py-3 rounded-lg border ${
            errors.birthDate 
              ? 'border-red-500 dark:border-red-600' 
              : 'border-zinc-300 dark:border-zinc-700'
          } focus:outline-none focus:ring-2 transition-colors`}
              style={{ 
                backgroundColor: '#f2f1ed', 
                color: '#161616',
                borderColor: errors.name ? '#590C0C' : 'rgba(255,255,255,0.2)'
              }}
          max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
          disabled={isLoading}
        />
        {errors.birthDate && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.birthDate}
          </p>
        )}
      </div>

      <div>
        <label 
          htmlFor="securityQuestion" 
                className="block text-sm font-medium mb-2"
                style={{ color: '#F2F1ED' }}
        >
          Pregunta de Seguridad para Recuperación de Contraseña
        </label>
        {loadingQuestions ? (
          <div className="w-full px-4 py-3 rounded-lg border" style={{ backgroundColor: '#f2f1ed', borderColor: 'rgba(255,255,255,0.2)' }}>
            <p style={{ color: '#161616' }}>Cargando preguntas...</p>
          </div>
        ) : securityQuestions.length === 0 && errors.general ? (
          <div className="mt-4">
            <Notification
              type="error"
              message={errors.general}
            />
          </div>
        ) : (
          <>
            <select
          id="securityQuestion"
          value={formData.securityQuestion}
              onChange={(e) => {
                const selectedId = e.target.value;
                handleChange('securityQuestion', selectedId);
                // Guardar el texto de la pregunta seleccionada
                const selectedQuestion = securityQuestions.find(q => q._id === selectedId || q.pregunta === selectedId);
                if (selectedQuestion) {
                  setSelectedQuestionText(selectedQuestion.pregunta);
                  // Limpiar la respuesta cuando se cambia la pregunta
                  setSecurityAnswer('');
                }
              }}
          className={`w-full px-4 py-3 rounded-lg border ${
            errors.securityQuestion 
              ? 'border-red-500 dark:border-red-600' 
              : 'border-zinc-300 dark:border-zinc-700'
              } focus:outline-none focus:ring-2 transition-colors`}
          style={{ 
            backgroundColor: '#f2f1ed', 
            color: '#161616',
                borderColor: errors.securityQuestion ? '#590C0C' : 'rgba(255,255,255,0.2)'
          }}
              disabled={isLoading || loadingQuestions}
            >
              <option value="">Selecciona una pregunta de seguridad</option>
              {securityQuestions.map((question, index) => {
                const questionId = question._id || question.pregunta || `q-${index}`;
                return (
                  <option key={questionId} value={questionId}>
                    {question.pregunta}
                  </option>
                );
              })}
            </select>
        {errors.securityQuestion && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.securityQuestion}
          </p>
            )}
          </>
        )}
      </div>

      {formData.securityQuestion && (
        <div>
          <label 
            htmlFor="securityAnswer" 
                  className="block text-sm font-medium mb-2"
                  style={{ color: '#F2F1ED' }}
          >
            Respuesta a la Pregunta de Seguridad
          </label>
          <input
            type="text"
            id="securityAnswer"
            value={securityAnswer}
            onChange={(e) => {
              const value = e.target.value;
              setSecurityAnswer(value);
              
              // ✅ Validar caracteres peligrosos en tiempo real
              if (value.trim() && hasDangerousCharacters(value)) {
                setErrors(prev => ({
                  ...prev,
                  securityAnswer: 'La respuesta no puede contener caracteres especiales peligrosos (<, >, script, etc.)'
                }));
              } else {
                // Limpiar error si ya no hay caracteres peligrosos
                if (errors.securityAnswer && errors.securityAnswer.includes('caracteres especiales peligrosos')) {
                  setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.securityAnswer;
                    return newErrors;
                  });
                } else if (errors.securityAnswer && value.trim().length >= 2) {
                  // Limpiar otros errores si el campo es válido
                  setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.securityAnswer;
                    return newErrors;
                  });
                }
              }
            }}
            className={`w-full px-4 py-3 rounded-lg border ${
              errors.securityAnswer 
                ? 'border-red-500 dark:border-red-600' 
                : 'border-zinc-300 dark:border-zinc-700'
            } focus:outline-none focus:ring-2 transition-colors`}
            style={{ 
              backgroundColor: '#f2f1ed', 
              color: '#161616',
              borderColor: errors.securityAnswer ? '#590C0C' : 'rgba(255,255,255,0.2)'
            }}
            placeholder="Tu respuesta"
            disabled={isLoading}
          />
          {errors.securityAnswer && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.securityAnswer}
            </p>
          )}
        </div>
      )}
    </div>
  );

  // Renderizado del Paso 2: Perfil Capilar
  const renderStep3 = () => (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold mb-2" style={{ color: '#F2F1ED' }}>
        Cuéntanos sobre tu cabello
      </h3>
      <p className="text-sm mb-4 opacity-90" style={{ color: '#F2F1ED' }}>
        Las direcciones de envío las podrás agregar después desde tu perfil o al comprar en línea.
      </p>

      <div>
        <label className="block text-sm font-medium mb-3 text-zinc-700 dark:text-zinc-300">
          Tipo de cabello
        </label>
        <div className="space-y-2">
          {['Lacio', 'Ondulado', 'Rizado'].map((type) => (
            <label key={type} className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="hairType"
                value={type.toLowerCase()}
                checked={formData.hairType === type.toLowerCase()}
                onChange={(e) => handleChange('hairType', e.target.value)}
                className="h-4 w-4 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400"
                disabled={isLoading}
              />
              <span className="ml-2" style={{ color: '#F2F1ED' }}>{type}</span>
            </label>
          ))}
        </div>
        {errors.hairType && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.hairType}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#F2F1ED' }}>
          Color natural (opcional)
        </label>
        <input
          type="text"
          value={formData.colorNatural}
          onChange={(e) => handleChange('colorNatural', e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 transition-colors"
          style={{ backgroundColor: '#f2f1ed', color: '#161616', borderColor: 'rgba(255,255,255,0.2)' }}
          placeholder="Ej. Castaño oscuro"
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#F2F1ED' }}>
          Color actual (opcional)
        </label>
        <input
          type="text"
          value={formData.colorActual}
          onChange={(e) => handleChange('colorActual', e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 transition-colors"
          style={{ backgroundColor: '#f2f1ed', color: '#161616', borderColor: 'rgba(255,255,255,0.2)' }}
          placeholder="Ej. Rubio cenizo"
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#F2F1ED' }}>
          Productos usados (opcional)
        </label>
        <input
          type="text"
          value={formData.productosUsados}
          onChange={(e) => handleChange('productosUsados', e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 transition-colors"
          style={{ backgroundColor: '#f2f1ed', color: '#161616', borderColor: 'rgba(255,255,255,0.2)' }}
          placeholder="Ej. Shampoo sin sulfatos"
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-3 text-zinc-700 dark:text-zinc-300">
          ¿Tienes alergias a productos?
        </label>
        <div className="space-y-3">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="hasAllergies"
              value="no"
              checked={formData.hasAllergies === false}
              onChange={() => {
                handleChange('hasAllergies', false);
                handleChange('allergies', '');
              }}
              className="h-4 w-4 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400"
              disabled={isLoading}
            />
            <span className="ml-2" style={{ color: '#F2F1ED' }}>No</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="hasAllergies"
              value="yes"
              checked={formData.hasAllergies === true}
              onChange={() => handleChange('hasAllergies', true)}
              className="h-4 w-4 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400"
              disabled={isLoading}
            />
            <span className="ml-2" style={{ color: '#F2F1ED' }}>Sí</span>
          </label>
          {formData.hasAllergies === true && (
            <input
              type="text"
              value={formData.allergies}
              onChange={(e) => handleChange('allergies', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.allergies 
                  ? 'border-red-500 dark:border-red-600' 
                  : 'border-zinc-300 dark:border-zinc-700'
              } focus:outline-none focus:ring-2 transition-colors`}
              style={{ 
                backgroundColor: '#f2f1ed', 
                color: '#161616',
                borderColor: errors.name ? '#590C0C' : 'rgba(255,255,255,0.2)'
              }}
              placeholder="Especifica tus alergias"
              disabled={isLoading}
            />
          )}
          {errors.hasAllergies && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.hasAllergies}
            </p>
          )}
          {errors.allergies && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.allergies}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-3 text-zinc-700 dark:text-zinc-300">
          ¿Tratamientos químicos previos?
        </label>
        <div className="space-y-3">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="hasChemicalTreatments"
              value="no"
              checked={formData.hasChemicalTreatments === false}
              onChange={() => {
                handleChange('hasChemicalTreatments', false);
                handleChange('chemicalTreatments', '');
              }}
              className="h-4 w-4 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400"
              disabled={isLoading}
            />
            <span className="ml-2" style={{ color: '#F2F1ED' }}>No</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="hasChemicalTreatments"
              value="yes"
              checked={formData.hasChemicalTreatments === true}
              onChange={() => handleChange('hasChemicalTreatments', true)}
              className="h-4 w-4 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400"
              disabled={isLoading}
            />
            <span className="ml-2" style={{ color: '#F2F1ED' }}>Sí</span>
          </label>
          {formData.hasChemicalTreatments === true && (
            <input
              type="text"
              value={formData.chemicalTreatments}
              onChange={(e) => handleChange('chemicalTreatments', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.chemicalTreatments 
                  ? 'border-red-500 dark:border-red-600' 
                  : 'border-zinc-300 dark:border-zinc-700'
              } focus:outline-none focus:ring-2 transition-colors`}
              style={{ 
                backgroundColor: '#f2f1ed', 
                color: '#161616',
                borderColor: errors.name ? '#590C0C' : 'rgba(255,255,255,0.2)'
              }}
              placeholder="Especifica los tratamientos"
              disabled={isLoading}
            />
          )}
          {errors.hasChemicalTreatments && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.hasChemicalTreatments}
            </p>
          )}
          {errors.chemicalTreatments && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.chemicalTreatments}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3 pt-4">
        <label className="flex items-start cursor-pointer">
          <input
            type="checkbox"
            checked={formData.acceptTerms}
            onChange={(e) => handleChange('acceptTerms', e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400"
            disabled={isLoading}
            required
          />
          <span className="ml-2 text-sm" style={{ color: '#F2F1ED' }}>
            Acepto los{' '}
            <a 
              href="/terminos" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:underline" 
              style={{ color: '#243B5A' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--hover)'; }}
              onMouseLeave={(e) => e.currentTarget.style.color = '#243B5A'}
              onClick={(e) => e.stopPropagation()}
            >
              Términos y Condiciones
            </a>
          </span>
        </label>
        {errors.acceptTerms && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {errors.acceptTerms}
          </p>
        )}

        <label className="flex items-start cursor-pointer">
          <input
            type="checkbox"
            checked={formData.receivePromotions}
            onChange={(e) => handleChange('receivePromotions', e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400"
            disabled={isLoading}
          />
          <span className="ml-2 text-sm" style={{ color: '#F2F1ED' }}>
            Deseo recibir promociones
          </span>
        </label>
      </div>
    </div>
  );

  // Si se requiere activación, mostrar pantalla de activación
  if (showActivation && emailForActivation) {
    return (
      <ActivateAccount
        email={emailForActivation}
        onActivationSuccess={() => {
          setShowActivation(false);
          setRegisterSuccess(true);
          setTimeout(() => {
            onRegisterSuccess?.();
          }, 1500);
        }}
        onBackToRegister={() => {
          setShowActivation(false);
          setEmailForActivation('');
        }}
        onSkipToLogin={() => {
          // Si el usuario no verifica el correo, redirigirlo al login
          setShowActivation(false);
          setEmailForActivation('');
          if (onSwitchToLogin) {
            onSwitchToLogin();
          } else {
            // Si no hay callback, intentar redirigir usando el router de Next.js
            if (typeof window !== 'undefined') {
              window.location.href = '/auth?view=login';
            }
          }
        }}
      />
    );
  }

  return (
    <div className="w-full max-w-md mx-auto relative">
      {/* Notificación de éxito */}
      {registerSuccess && (
        <div 
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 min-w-[350px] max-w-[90%] animate-slide-down"
        >
          <Notification
            type="success"
            message="Cliente registrada exitosamente"
          />
        </div>
      )}

      <div className="rounded-lg shadow-lg p-8 border" style={{ backgroundColor: '#161616', borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="mb-6">
          <h2 className="text-page-title text-center mb-2" style={{ color: '#F2F1ED' }}>
            Crear Cuenta
          </h2>
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                  style={{
                    backgroundColor: step === currentStep
                      ? '#710014'
                      : step < currentStep
                      ? '#710014'
                      : 'rgba(255,255,255,0.2)',
                    color: step === currentStep || step < currentStep ? '#F2F1ED' : 'rgba(255,255,255,0.5)'
                  }}
                >
                  {step < currentStep ? '✓' : step}
                </div>
                {step < 2 && (
                  <div
                    className="w-12 h-1"
                    style={{
                      backgroundColor: step < currentStep ? '#710014' : 'rgba(255,255,255,0.2)'
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        
        <form onSubmit={(e) => {
          e.preventDefault();
          if (currentStep === 2) {
            handleSubmit();
          } else {
            handleNext();
          }
        }} className="space-y-5">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep3()}

          {errors.general && (
            <div className="mb-4">
              <Notification
                type="error"
                message={errors.general}
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="flex-1 py-3 px-4 rounded-lg border font-medium hover:opacity-80 transition-colors"
              style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#F2F1ED' }}
                disabled={isLoading}
              >
                Atrás
              </button>
            )}
            
            {currentStep < 2 ? (
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3 px-4 rounded-lg text-white font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#710014' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--hover)'; }}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#710014'}
              >
                Continuar
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-lg text-white font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#710014' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--hover)'; }}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#710014'}
              >
                {isLoading ? 'Registrando...' : 'Finalizar registro'}
              </button>
            )}
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm" style={{ color: '#F2F1ED' }}>
            ¿Ya tienes una cuenta?{' '}
            <button
              onClick={handleSwitchToLogin}
              className="font-medium hover:underline"
              style={{ color: '#243B5A' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--hover)'; }}
              onMouseLeave={(e) => e.currentTarget.style.color = '#243B5A'}
              disabled={isLoading}
            >
              Inicia Sesión
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
