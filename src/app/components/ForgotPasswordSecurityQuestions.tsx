'use client';

import { useState } from 'react';

interface ForgotPasswordSecurityQuestionsProps {
  onSwitchToLogin?: () => void;
  onSwitchToEmail?: () => void;
  onSwitchToSMS?: () => void;
  onQuestionsVerified?: () => void;
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
    
    try {
      const { api } = await import('@/lib/api');
      const result = await api.getSecurityQuestions(email);
      
      if (result.questions && result.questions.length > 0) {
        const selectedQuestions = result.questions.map((q: any, index: number) => ({
          id: `q${index + 1}`,
          question: q.question,
          answer: '',
        }));
        
        setQuestions(selectedQuestions);
        setQuestionsLoaded(true);
        setUserAnswers({});
      } else {
        // Si no hay preguntas configuradas, usar preguntas predeterminadas
        const shuffled = [...predefinedQuestions].sort(() => 0.5 - Math.random());
        const selectedQuestions = shuffled.slice(0, 3).map((q, index) => ({
          id: `q${index + 1}`,
          question: q,
          answer: '',
        }));
        
        setQuestions(selectedQuestions);
        setQuestionsLoaded(true);
        setUserAnswers({});
      }
    } catch (error: any) {
      console.error('Error cargando preguntas:', error);
      setErrors({ email: error.message || 'No se encontró una cuenta con este email' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswers = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateAnswers()) return;
    
    setIsLoading(true);
    
    try {
      const { api } = await import('@/lib/api');
      const answersObject: Record<string, string> = {};
      questions.forEach(q => {
        answersObject[q.question] = userAnswers[q.id];
      });
      
      await api.verifySecurityQuestions(email, answersObject);
      onQuestionsVerified?.();
    } catch (error: any) {
      console.error('Error verificando respuestas:', error);
      setErrors({ answers: error.message || 'Una o más respuestas son incorrectas. Intenta nuevamente.' });
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
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8 border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-2xl font-bold text-center mb-2 text-zinc-900 dark:text-zinc-50">
            Preguntas de Seguridad
          </h2>
          <p className="text-center text-zinc-600 dark:text-zinc-400 mb-6 text-sm">
            Por favor responde las siguientes preguntas de seguridad
          </p>
          
          <form onSubmit={handleSubmitAnswers} className="space-y-5">
            {questions.map((question) => (
              <div key={question.id}>
                <label 
                  htmlFor={question.id}
                  className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300"
                >
                  {question.question}
                </label>
                <input
                  type="text"
                  id={question.id}
                  value={userAnswers[question.id] || ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400 transition-colors"
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
              className="w-full py-3 px-4 rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
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
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8 border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-2xl font-bold text-center mb-2 text-zinc-900 dark:text-zinc-50">
          Recuperar por Preguntas de Seguridad
        </h2>
        <p className="text-center text-zinc-600 dark:text-zinc-400 mb-6 text-sm">
          Ingresa tu correo electrónico para cargar tus preguntas de seguridad
        </p>
        
        <form onSubmit={handleLoadQuestions} className="space-y-5">
          <div>
            <label 
              htmlFor="email" 
              className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300"
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
              } bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400 transition-colors`}
              placeholder="tu@email.com"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.email}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Cargando...' : 'Cargar Preguntas'}
          </button>
        </form>

        {(onSwitchToEmail || onSwitchToSMS) && (
          <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <p className="text-center text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Otras opciones de recuperación:
            </p>
            <div className="space-y-2">
              {onSwitchToEmail && (
                <button
                  onClick={onSwitchToEmail}
                  className="w-full py-2 px-4 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-sm"
                  disabled={isLoading}
                >
                  Recuperar por Email
                </button>
              )}
              {onSwitchToSMS && (
                <button
                  onClick={onSwitchToSMS}
                  className="w-full py-2 px-4 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-sm"
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
              className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
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

