'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { LogIn, Mic } from 'lucide-react';
import Card from '../../../../components/ui/Card';
import Input from '../../../../components/ui/Input';
import Button from '../../../../components/ui/Button';
import { api } from '../../../../services/auth';
import { apiClient } from '../../../../services/client';
import { getBackendBaseUrl } from '../../../../services/config';

/** Página de login para el Account Linking de la Skill de Alexa (Auth Code Grant). */
function OauthAlexaContent() {
  const searchParams = useSearchParams();
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state') ?? '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!redirectUri) {
      setError('Enlace de vinculación inválido: falta redirect_uri.');
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const loginResult = await api.login(email, password);
      if (!loginResult.success || !loginResult.token) {
        setError(loginResult.error || 'Credenciales inválidas.');
        return;
      }

      const codeResult = await apiClient.post<{ success: boolean; code?: string }>(
        '/api/oauth/code',
        {},
        getBackendBaseUrl(),
      );

      if (!codeResult.success || !codeResult.code) {
        setError('No se pudo completar la vinculación de la cuenta.');
        return;
      }

      const destino = `${redirectUri}?code=${encodeURIComponent(codeResult.code)}&state=${encodeURIComponent(state)}`;
      window.location.href = destino;
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'No se pudo iniciar sesión.';
      setError(mensaje);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--fondo-general)' }}>
      <Card padding="lg" className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6 text-center">
          <Mic size={32} style={{ color: 'var(--menu-texto-principal)' }} />
          <h1 className="text-xl font-semibold mt-3" style={{ color: 'var(--menu-texto-principal)' }}>
            Vincular cuenta con Alexa
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
            Inicia sesión con tu cuenta de empleada de Miru Franco.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            type="email"
            label="Correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            autoComplete="username"
          />
          <Input
            type="password"
            label="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            autoComplete="current-password"
          />

          {error && (
            <p className="text-sm" style={{ color: 'var(--danger)' }}>
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" fullWidth disabled={cargando}>
            <span className="flex items-center justify-center gap-2">
              <LogIn size={18} />
              {cargando ? 'Vinculando…' : 'Vincular cuenta'}
            </span>
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function OauthAlexaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
      <OauthAlexaContent />
    </Suspense>
  );
}
