'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { validatePassword, sanitizeInput, sanitizeEmail } from '../../utils/security';
import ActivateAccount from './ActivateAccount';

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
    
    // Paso 2: Dirección
    street: '',
    number: '',
    colony: '',
    postalCode: '',
    reference: '',
    
    // Paso 3: Perfil capilar
    hairType: '',
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
    
    // ✅ Sanitizar entrada de usuario
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre completo es requerido';
    } else {
      const sanitizedName = sanitizeInput(formData.name);
      if (sanitizedName.length < 2) {
        newErrors.name = 'El nombre debe tener al menos 2 caracteres';
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
    
    if (!formData.phone) {
      newErrors.phone = 'El teléfono es requerido';
    } else if (!/^\+?[\d\s-()]{10,}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'El teléfono no es válido';
    }
    
    // ✅ Usar validación centralizada de seguridad
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else {
      const validation = validatePassword(formData.password);
      if (!validation.valid) {
        newErrors.password = validation.message || 'La contraseña no cumple con los requisitos';
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
    } else if (securityAnswer.trim().length < 2) {
      newErrors.securityAnswer = 'La respuesta debe tener al menos 2 caracteres';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.street.trim()) {
      newErrors.street = 'La calle es requerida';
    }
    
    if (!formData.number.trim()) {
      newErrors.number = 'El número es requerido';
    }
    
    if (!formData.colony.trim()) {
      newErrors.colony = 'La colonia es requerida';
    }
    
    if (!formData.postalCode) {
      newErrors.postalCode = 'El código postal es requerido';
    } else if (!/^\d{5}$/.test(formData.postalCode)) {
      newErrors.postalCode = 'El código postal debe tener 5 dígitos';
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
    }
    
    // hasChemicalTreatments es obligatorio (debe ser true o false, no null)
    if (formData.hasChemicalTreatments === null) {
      newErrors.hasChemicalTreatments = 'Debes indicar si has tenido tratamientos químicos previos';
    } else if (formData.hasChemicalTreatments === true && !formData.chemicalTreatments.trim()) {
      newErrors.chemicalTreatments = 'Especifica los tratamientos';
    }
    
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'Debes aceptar los Términos y Condiciones';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    // Validación en tiempo real de contraseña
    if (field === 'password' && typeof value === 'string') {
      const validation = validatePassword(value);
      if (!validation.valid) {
        const errorsList: string[] = [];
        if (value.length < 8) {
          errorsList.push('La contraseña debe tener al menos 8 caracteres');
        }
        if (!/[A-Z]/.test(value)) {
          errorsList.push('Debe incluir al menos una letra mayúscula');
        }
        if (!/[a-z]/.test(value)) {
          errorsList.push('Debe incluir al menos una letra minúscula');
        }
        if (!/[0-9]/.test(value)) {
          errorsList.push('Debe incluir al menos un número');
        }
        setPasswordErrors(errorsList);
      } else {
        setPasswordErrors([]);
      }
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
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    
    // Si vamos al paso 3, resetear todos los campos del paso 3 para que estén desmarcados
    if (currentStep === 2) {
      setFormData(prev => ({
        ...prev,
        hairType: '',
        hasAllergies: null,
        allergies: '',
        hasChemicalTreatments: null,
        chemicalTreatments: '',
        acceptTerms: false,
        receivePromotions: false,
      }));
    }
    
    setCurrentStep(prev => prev + 1);
  };

  const handleSkip = () => {
    if (currentStep === 2) {
      // Omitir dirección, continuar al paso 3
      // Resetear todos los campos del paso 3 para que estén desmarcados
      setFormData(prev => ({
        ...prev,
        hairType: '',
        hasAllergies: null,
        allergies: '',
        hasChemicalTreatments: null,
        chemicalTreatments: '',
        acceptTerms: false,
        receivePromotions: false,
      }));
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // Omitir perfil capilar, finalizar registro
      handleSubmit(true);
    }
  };

  const handleSubmit = async (skipValidation = false) => {
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
      }
      
      if (formData.hasChemicalTreatments === null) {
        validationErrors.hasChemicalTreatments = 'Debes indicar si has tenido tratamientos químicos previos';
      } else if (formData.hasChemicalTreatments === true && !formData.chemicalTreatments.trim()) {
        validationErrors.chemicalTreatments = 'Especifica los tratamientos';
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
      
      // Preparar datos para enviar según la estructura del backend
      const registerData = {
        nombre: formData.name,
        email: formData.email,
        password: formData.password,
        telefono: formData.phone,
        fechaNacimiento: formData.birthDate,
        preguntaSeguridad: {
          pregunta: selectedQuestionText || '', // Texto completo de la pregunta
          respuesta: securityAnswer || '' // Respuesta del usuario
        },
        direccion: {
          calle: formData.street || '',
          numero: formData.number || '',
          colonia: formData.colony || '',
          codigoPostal: formData.postalCode || '',
          referencia: formData.reference || '',
        },
        perfilCapilar: {
          tipoCabello: formData.hairType === 'lacio' ? 'liso' : 
                      formData.hairType === 'ondulado' ? 'ondulado' :
                      formData.hairType === 'rizado' ? 'rizado' : 
                      formData.hairType || 'liso', // Fallback a 'liso' si está vacío
          tieneAlergias: formData.hasAllergies === true, // Boolean: true o false (no null)
          alergias: formData.hasAllergies === true ? formData.allergies : undefined,
          tratamientosQuimicos: formData.hasChemicalTreatments === true, // Boolean: true o false (no null)
          tratamientos: formData.hasChemicalTreatments === true ? formData.chemicalTreatments : undefined,
        },
        aceptaAvisoPrivacidad: formData.acceptTerms, // El backend espera aceptaAvisoPrivacidad
        recibePromociones: formData.receivePromotions,
      };
      
      // Log para debug (solo en desarrollo)
      if (process.env.NODE_ENV === 'development') {
        console.log('Datos a enviar al backend:', JSON.stringify(registerData, null, 2));
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
      
      // Si el mensaje contiene "Faltan campos obligatorios", mostrar un mensaje más útil
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
          value={formData.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          className={`w-full px-4 py-3 rounded-lg border ${
            errors.phone 
              ? 'border-red-500 dark:border-red-600' 
              : 'border-zinc-300 dark:border-zinc-700'
          } focus:outline-none focus:ring-2 transition-colors`}
              style={{ 
                backgroundColor: '#f2f1ed', 
                color: '#161616',
                borderColor: errors.name ? '#590C0C' : 'rgba(255,255,255,0.2)'
              }}
          placeholder="+52 123 456 7890"
          disabled={isLoading}
        />
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
          <p className="mt-1 text-xs text-green-600 dark:text-green-400">
            ✓ Contraseña válida
          </p>
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
          <div className="w-full px-4 py-3 rounded-lg border" style={{ backgroundColor: '#f2f1ed', borderColor: '#590C0C' }}>
            <p className="text-sm" style={{ color: '#590C0C' }}>{errors.general}</p>
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
              setSecurityAnswer(e.target.value);
              if (errors.securityAnswer) {
                setErrors(prev => {
                  const newErrors = { ...prev };
                  delete newErrors.securityAnswer;
                  return newErrors;
                });
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

  // Renderizado del Paso 2: Dirección
  const renderStep2 = () => (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold mb-4" style={{ color: '#F2F1ED' }}>
        Dirección de Entrega
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label 
            htmlFor="street" 
                className="block text-sm font-medium mb-2"
                style={{ color: '#F2F1ED' }}
          >
            Calle
          </label>
          <input
            type="text"
            id="street"
            value={formData.street}
            onChange={(e) => handleChange('street', e.target.value)}
            className={`w-full px-4 py-3 rounded-lg border ${
              errors.street 
                ? 'border-red-500 dark:border-red-600' 
                : 'border-zinc-300 dark:border-zinc-700'
            } focus:outline-none focus:ring-2 transition-colors`}
              style={{ 
                backgroundColor: '#f2f1ed', 
                color: '#161616',
                borderColor: errors.name ? '#590C0C' : 'rgba(255,255,255,0.2)'
              }}
            placeholder="Calle"
            disabled={isLoading}
          />
          {errors.street && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.street}
            </p>
          )}
        </div>

        <div>
          <label 
            htmlFor="number" 
                className="block text-sm font-medium mb-2"
                style={{ color: '#F2F1ED' }}
          >
            Número
          </label>
          <input
            type="text"
            id="number"
            value={formData.number}
            onChange={(e) => handleChange('number', e.target.value)}
            className={`w-full px-4 py-3 rounded-lg border ${
              errors.number 
                ? 'border-red-500 dark:border-red-600' 
                : 'border-zinc-300 dark:border-zinc-700'
            } focus:outline-none focus:ring-2 transition-colors`}
              style={{ 
                backgroundColor: '#f2f1ed', 
                color: '#161616',
                borderColor: errors.name ? '#590C0C' : 'rgba(255,255,255,0.2)'
              }}
            placeholder="123"
            disabled={isLoading}
          />
          {errors.number && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.number}
            </p>
          )}
        </div>
      </div>

      <div>
        <label 
          htmlFor="colony" 
                className="block text-sm font-medium mb-2"
                style={{ color: '#F2F1ED' }}
        >
          Colonia
        </label>
        <input
          type="text"
          id="colony"
          value={formData.colony}
          onChange={(e) => handleChange('colony', e.target.value)}
          className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-colors"
              style={{ 
                backgroundColor: '#f2f1ed', 
                color: '#161616',
                borderColor: errors.name ? '#590C0C' : 'rgba(255,255,255,0.2)'
              }}
          placeholder="Colonia"
          disabled={isLoading}
        />
        {errors.colony && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.colony}
          </p>
        )}
      </div>

      <div>
        <label 
          htmlFor="postalCode" 
                className="block text-sm font-medium mb-2"
                style={{ color: '#F2F1ED' }}
        >
          Código Postal
        </label>
        <input
          type="text"
          id="postalCode"
          value={formData.postalCode}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '').slice(0, 5);
            handleChange('postalCode', value);
          }}
          className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-colors"
          style={{ 
            backgroundColor: '#f2f1ed', 
            color: '#161616',
            borderColor: errors.postalCode ? '#590C0C' : 'rgba(255,255,255,0.2)'
          }}
          placeholder="12345"
          maxLength={5}
          disabled={isLoading}
        />
        {errors.postalCode && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.postalCode}
          </p>
        )}
      </div>

      <div>
        <label 
          htmlFor="reference" 
                className="block text-sm font-medium mb-2"
                style={{ color: '#F2F1ED' }}
        >
          Referencia (Opcional)
        </label>
        <textarea
          id="reference"
          value={formData.reference}
          onChange={(e) => handleChange('reference', e.target.value)}
          rows={2}
          className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-colors resize-none"
          style={{ 
            backgroundColor: '#f2f1ed', 
            color: '#161616',
            borderColor: 'rgba(255,255,255,0.2)'
          }}
          placeholder="Ej: Entre calle A y calle B, casa azul"
          disabled={isLoading}
        />
      </div>
    </div>
  );

  // Renderizado del Paso 3: Perfil Capilar
  const renderStep3 = () => (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold mb-4" style={{ color: '#F2F1ED' }}>
        Cuéntanos sobre tu cabello
      </h3>

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
              onMouseEnter={(e) => e.currentTarget.style.color = '#A64B63'}
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
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 p-6 rounded-lg shadow-xl animate-slide-down"
          style={{ 
            backgroundColor: '#6E7D57', 
            border: '1px solid #6E7D57',
            minWidth: '350px',
            maxWidth: '90%'
          }}
        >
          <p className="text-sm font-medium text-center text-white mb-2">
            ¡Registro exitoso!
          </p>
          <p className="text-xs text-center text-white opacity-90">
            Tu cuenta ha sido creada exitosamente. Ya puedes iniciar sesión.
          </p>
        </div>
      )}

      <div className="rounded-lg shadow-lg p-8 border" style={{ backgroundColor: '#161616', borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="mb-6">
          <h2 className="text-page-title text-center mb-2" style={{ color: '#F2F1ED' }}>
            Crear Cuenta
          </h2>
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3].map((step) => (
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
                {step < 3 && (
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
          if (currentStep === 3) {
            handleSubmit();
          } else {
            handleNext();
          }
        }} className="space-y-5">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          {errors.general && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">
              {errors.general}
            </p>
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
            
            {currentStep < 3 ? (
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3 px-4 rounded-lg text-white font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#710014' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#A64B63'}
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
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#A64B63'}
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
              onMouseEnter={(e) => e.currentTarget.style.color = '#A64B63'}
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
