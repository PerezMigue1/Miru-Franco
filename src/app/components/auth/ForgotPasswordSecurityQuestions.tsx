'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Timer } from 'lucide-react';

const PRIMARIO = {
  ['--btn-bg' as string]: 'var(--botones-principales)',
  ['--btn-bg-hover' as string]: 'var(--hover)',
  ['--btn-texto' as string]: 'var(--marfil)',
} as React.CSSProperties;

const SECUNDARIO = {
  ['--btn-bg' as string]: 'transparent',
  ['--btn-texto' as string]: 'var(--menu-texto-principal)',
  ['--btn-borde' as string]: '1.5px solid var(--mf-linea-fuerte)',
  ['--btn-bg-hover' as string]: 'var(--nav-hover-bg)',
  ['--btn-borde-hover' as string]: 'var(--menu-texto-principal)',
} as React.CSSProperties;

interface ForgotPasswordSecurityQuestionsProps {
  onSwitchToLogin?: () => void;
  onSwitchToEmail?: () => void;
  onSwitchToSMS?: () => void;
  onQuestionsVerified?: (email: string, token?: string) => void;
}

interface SecurityQuestion {
  id: string;
  question: string;
  answer: string;
}

export default function ForgotPasswordSecurityQuestions({ 
  onSwitchToLogin,
  onSwitchToEmail,
  onSwitchToSMS,
  onQuestionsVerified
}: ForgotPasswordSecurityQuestionsProps) {
  const [email, setEmail] = useState('');
  const [questionsLoaded, setQuestionsLoaded] = useState(false);
  const [questions, setQuestions] = useState<SecurityQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<{ email?: string; answers?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  // Contador regresivo para rate limiting
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCountdown(null);
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.email;
        return newErrors;
      });
    }
  }, [countdown]);

  const validateEmail = () => {
    const newErrors: { email?: string } = {};
    
    if (!email) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'El correo electrónico no es válido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateAnswers = () => {
    const allAnswered = questions.every(q => 
      userAnswers[q.id] && userAnswers[q.id].trim().length > 0
    );
    
    if (!allAnswered) {
      setErrors({ answers: 'Por favor responde todas las preguntas' });
      return false;
    }
    
    setErrors({});
    return true;
  };

  const handleLoadQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail()) return;
    
    // Prevenir envío si hay rate limiting activo
    if (countdown !== null) {
      return;
    }
    
    setIsLoading(true);
    setCountdown(null);
    setErrors({}); // Limpiar errores previos
    
    try {
      const { api } = await import('../../services');
      // ✅ Usar el nuevo método según GUIA_FRONTEND_RECUPERACION_PASSWORD.md
      const result = await api.getUserSecurityQuestion(email);

      if (result.success && result.pregunta) {
        // ✅ Usuario tiene pregunta de seguridad (no se registra en consola: es un factor de recuperación)
        const selectedQuestion = [{
          id: 'q1',
          question: result.pregunta,
          answer: '',
        }];
        setQuestions(selectedQuestion);
        setQuestionsLoaded(true);
        setUserAnswers({});
        setErrors({}); // Limpiar errores
      } else {
        // Mensaje genérico del backend (no revela si la cuenta existe); remite a la recuperación por
        // correo, cuyo botón sigue debajo en "Otras opciones de recuperación"
        setErrors({ email: result.message || 'No pudimos continuar con la recuperación por pregunta de seguridad. Intenta recuperar tu cuenta por correo.' });
      }
    } catch (error: unknown) {
      // ✅ Manejar error 429 (Rate Limiting)
      const err = error as Error & { status?: number; retryAfter?: number };
      if (err.status === 429) {
        const retrySeconds = err.retryAfter || 60;
        setCountdown(retrySeconds);
        setErrors({ 
          email: `Demasiados intentos. Espera ${retrySeconds} segundos antes de intentar nuevamente.` 
        });
      } else {
        console.error('Error cargando pregunta de seguridad:', error);
        setErrors({ email: 'No pudimos continuar con la recuperación por pregunta de seguridad. Intenta recuperar tu cuenta por correo.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswers = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateAnswers()) return;
    
    setIsLoading(true);
    
    try {
      const { api } = await import('../../services');
      const answersObject: Record<string, string> = {};
      questions.forEach(q => {
        answersObject[q.question] = userAnswers[q.id];
      });
      
      const result = await api.verifySecurityQuestions(email, answersObject);
      if (result.success && result.token) {
        // Guardar token con expiración de 10 minutos
        localStorage.setItem('resetPasswordToken', result.token);
        localStorage.setItem('resetPasswordEmail', email);
        localStorage.setItem('resetPasswordExpires', String(Date.now() + 10 * 60 * 1000));
        
        onQuestionsVerified?.(email, result.token);
      } else {
        onQuestionsVerified?.(email);
      }
    } catch (error: unknown) {
      console.error('Error verificando respuestas:', error);
      const msg = error instanceof Error ? error.message : 'Una o más respuestas son incorrectas. Intenta nuevamente.';
      setErrors({ answers: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: answer }));
    if (errors.answers) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.answers;
        return newErrors;
      });
    }
  };

  if (questionsLoaded) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div>
          <h2 className="mf-titulo-pagina text-center mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
            Preguntas de Seguridad
          </h2>
          <p className="text-center mb-6 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            Por favor responde las siguientes preguntas de seguridad
          </p>

          <form onSubmit={handleSubmitAnswers} className="space-y-5">
            {questions.map((question) => (
              <div key={question.id}>
                <label
                  htmlFor={question.id}
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--menu-texto-principal)' }}
                >
                  {question.question}
                </label>
                <input
                  type="text"
                  id={question.id}
                  value={userAnswers[question.id] || ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  className="mf-campo w-full px-4 py-3"
                  aria-invalid={Boolean(errors.answers)}
                  placeholder="Tu respuesta..."
                  disabled={isLoading}
                />
              </div>
            ))}

            {errors.answers && (
              <p className="text-sm" role="alert" style={{ color: 'var(--danger-texto)' }}>
                {errors.answers}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="mf-btn mf-btn-color w-full py-3 px-4 rounded-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              style={PRIMARIO}
            >
              {isLoading ? 'Verificando...' : 'Verificar Respuestas'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setQuestionsLoaded(false);
                setQuestions([]);
                setUserAnswers({});
              }}
              className="inline-flex items-center gap-1.5 min-h-11 text-sm font-semibold underline-offset-4 hover:underline"
              style={{ color: 'var(--menu-texto-principal)' }}
              disabled={isLoading}
            >
              <ArrowLeft size={16} aria-hidden />
              Cambiar email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div>
        <h2 className="mf-titulo-pagina text-center mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
          Recuperar por Preguntas de Seguridad
        </h2>
        <p className="text-center mb-6 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
          Ingresa tu correo electrónico para cargar tus preguntas de seguridad
        </p>

        <form onSubmit={handleLoadQuestions} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--menu-texto-principal)' }}
            >
              Correo Electrónico
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) {
                  setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.email;
                    return newErrors;
                  });
                }
              }}
              className="mf-campo w-full px-4 py-3"
              aria-invalid={Boolean(errors.email)}
              placeholder="tu@email.com"
              disabled={isLoading}
            />
            {errors.email && (
              <div className="mt-1">
                <p className="text-sm" role="alert" style={{ color: 'var(--danger-texto)' }}>
                  {errors.email}
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || countdown !== null}
            className="mf-btn mf-btn-color w-full py-3 px-4 rounded-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            style={PRIMARIO}
          >
            {isLoading
              ? 'Cargando...'
              : countdown !== null
                ? `Espera ${countdown}s`
                : 'Cargar Preguntas'
            }
          </button>

          {/* Mostrar contador regresivo si hay rate limiting */}
          {countdown !== null && countdown > 0 && (
            <div className="mt-4 p-3 rounded-[10px] border" style={{
              backgroundColor: 'color-mix(in srgb, var(--warning) 12%, transparent)',
              borderColor: 'var(--warning)'
            }}>
              <p className="flex items-center justify-center gap-2 text-sm text-center" style={{ color: 'var(--warning-texto)' }}>
                <Timer size={16} aria-hidden className="shrink-0" />
                <span>Puedes intentar nuevamente en: <strong>{countdown}</strong> segundos</span>
              </p>
            </div>
          )}
        </form>

        {(onSwitchToEmail || onSwitchToSMS) && (
          <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--mf-linea-fuerte)' }}>
            <p className="text-center text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
              Otras opciones de recuperación:
            </p>
            <div className="space-y-2">
              {onSwitchToEmail && (
                <button
                  type="button"
                  onClick={onSwitchToEmail}
                  className="mf-btn mf-btn-color w-full min-h-11 py-2 px-4 rounded-[10px] font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  style={SECUNDARIO}
                  disabled={isLoading}
                >
                  Recuperar por Email
                </button>
              )}
              {onSwitchToSMS && (
                <button
                  type="button"
                  onClick={onSwitchToSMS}
                  className="mf-btn mf-btn-color w-full min-h-11 py-2 px-4 rounded-[10px] font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  style={SECUNDARIO}
                  disabled={isLoading}
                >
                  Recuperar por SMS
                </button>
              )}
            </div>
          </div>
        )}

        {onSwitchToLogin && (
          <div className="mt-6 text-center">
            <button
              onClick={onSwitchToLogin}
              className="inline-flex items-center gap-1.5 min-h-11 text-sm font-semibold underline-offset-4 hover:underline"
              style={{ color: 'var(--menu-texto-principal)' }}
              disabled={isLoading}
            >
              <ArrowLeft size={16} aria-hidden />
              Volver a Iniciar Sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
