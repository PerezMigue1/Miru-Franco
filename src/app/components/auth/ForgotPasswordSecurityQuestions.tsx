'use client';

import { useState } from 'react';

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

  const predefinedQuestions = [
    '¿Cuál era el nombre de tu primera mascota?',
    '¿En qué ciudad naciste?',
    '¿Cuál era el nombre de tu mejor amigo/a de la infancia?',
    '¿Cuál era el nombre de tu colegio primario?',
    '¿Cuál era el nombre de tu profesor/a favorito/a?',
    '¿Cuál era el modelo de tu primer auto?',
    '¿Cómo se llamaba tu abuela materna?',
  ];

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
    
    setIsLoading(true);
    setErrors({}); // Limpiar errores previos
    
    try {
      const { api } = await import('../../services');
      // ✅ Usar el nuevo método según GUIA_FRONTEND_RECUPERACION_PASSWORD.md
      const result = await api.getUserSecurityQuestion(email);
      
      if (result.success && result.pregunta) {
        // ✅ Usuario tiene pregunta de seguridad
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
        // ❌ Por seguridad, no revelar si el email existe o no
        // Solo mostrar mensaje genérico
        const errorMessage = result.message || result.error || '';
        
        // Verificar si es un usuario de Google (este caso sí se puede revelar porque es específico)
        if (errorMessage && (errorMessage.toLowerCase().includes('google') || errorMessage.toLowerCase().includes('cuenta de google'))) {
          setErrors({ 
            email: `${errorMessage}. Por favor, usa "Continuar con Google" para iniciar sesión.` 
          });
        } else {
          // Mensaje genérico que no revela si el email existe
          // Si el email existe y tiene pregunta, se mostrará. Si no, no se muestra nada (por seguridad)
          setErrors({ 
            email: 'Si el email existe y tiene pregunta de seguridad configurada, se mostrará la pregunta.' 
          });
        }
      }
    } catch (error: unknown) {
      console.error('Error cargando pregunta de seguridad:', error);
      // Por seguridad, no revelar detalles del error
      // Mensaje genérico que no revela si el email existe
      setErrors({ 
        email: 'Si el email existe y tiene pregunta de seguridad configurada, se mostrará la pregunta.' 
      });
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
        <div className="rounded-lg shadow-lg p-8 border" style={{ backgroundColor: '#161616', borderColor: 'rgba(255,255,255,0.1)' }}>
          <h2 className="text-page-title text-center mb-2" style={{ color: '#F2F1ED' }}>
            Preguntas de Seguridad
          </h2>
          <p className="text-center mb-6 text-sm" style={{ color: '#F2F1ED' }}>
            Por favor responde las siguientes preguntas de seguridad
          </p>
          
          <form onSubmit={handleSubmitAnswers} className="space-y-5">
            {questions.map((question) => (
              <div key={question.id}>
                <label 
                  htmlFor={question.id}
                  className="block text-sm font-medium mb-2"
              style={{ color: '#F2F1ED' }}
                >
                  {question.question}
                </label>
                <input
                  type="text"
                  id={question.id}
                  value={userAnswers[question.id] || ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-colors"
                  style={{ 
                    backgroundColor: '#f2f1ed', 
                    color: '#161616',
                    borderColor: 'rgba(255,255,255,0.2)'
                  }}
                  placeholder="Tu respuesta..."
                  disabled={isLoading}
                />
              </div>
            ))}

            {errors.answers && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.answers}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg text-white font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#710014' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#A64B63'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#710014'}
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
              className="text-sm transition-colors"
              style={{ color: '#F2F1ED' }}
              disabled={isLoading}
            >
              ← Cambiar email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-lg shadow-lg p-8 border" style={{ backgroundColor: '#161616', borderColor: 'rgba(255,255,255,0.1)' }}>
        <h2 className="text-2xl font-bold text-center mb-2" style={{ color: '#F2F1ED' }}>
          Recuperar por Preguntas de Seguridad
        </h2>
        <p className="text-center mb-6 text-sm" style={{ color: '#F2F1ED' }}>
          Ingresa tu correo electrónico para cargar tus preguntas de seguridad
        </p>
        
        <form onSubmit={handleLoadQuestions} className="space-y-5">
          <div>
            <label 
              htmlFor="email" 
              className="block text-sm font-medium mb-2"
              style={{ color: '#F2F1ED' }}
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
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.email 
                  ? 'border-red-500 dark:border-red-600' 
                  : 'border-zinc-300 dark:border-zinc-700'
              } focus:outline-none focus:ring-2 transition-colors`}
              style={{ 
                backgroundColor: '#f2f1ed', 
                color: '#161616',
                borderColor: errors.email ? '#590C0C' : 'rgba(255,255,255,0.2)'
              }}
              placeholder="tu@email.com"
              disabled={isLoading}
            />
            {errors.email && (
              <div className="mt-1">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.email}
                </p>
                {errors.email.toLowerCase().includes('google') && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={async () => {
                        // Redirigir a login con Google
                        const { api } = await import('../../services');
                        api.loginWithGoogle();
                      }}
                      className="w-full py-2 px-4 rounded-lg border font-medium hover:opacity-80 transition-colors text-sm"
                      style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#F2F1ED' }}
                    >
                      Continuar con Google
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-lg text-white font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#710014' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#A64B63'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#710014'}
          >
            {isLoading ? 'Cargando...' : 'Cargar Preguntas'}
          </button>
        </form>

        {(onSwitchToEmail || onSwitchToSMS) && (
          <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <p className="text-center text-sm mb-4" style={{ color: '#F2F1ED' }}>
              Otras opciones de recuperación:
            </p>
            <div className="space-y-2">
              {onSwitchToEmail && (
                <button
                  onClick={onSwitchToEmail}
                  className="w-full py-2 px-4 rounded-lg border font-medium hover:opacity-80 transition-colors text-sm"
            style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#F2F1ED' }}
                  disabled={isLoading}
                >
                  Recuperar por Email
                </button>
              )}
              {onSwitchToSMS && (
                <button
                  onClick={onSwitchToSMS}
                  className="w-full py-2 px-4 rounded-lg border font-medium hover:opacity-80 transition-colors text-sm"
            style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#F2F1ED' }}
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
              className="text-sm transition-colors"
              style={{ color: '#F2F1ED' }}
              disabled={isLoading}
            >
              ← Volver a Iniciar Sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

