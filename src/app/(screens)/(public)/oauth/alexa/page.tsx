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
import {
  cuerpoSolicitudCodigo,
  destinoVinculacion,
  mensajeErrorVinculacion,
  type RespuestaCodigoOauth,
} from './vinculacion';

/** Página de login para el Account Linking de la Skill de Alexa (Auth Code Grant). */
function OauthAlexaContent() {
  const searchParams = useSearchParams();
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state') ?? '';
  const clientId = searchParams.get('client_id');

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
      // La sesión queda en la cookie httpOnly: /api/oauth/code la usa para emitir el código.
      if (!loginResult.success) {
        setError(loginResult.error || 'Credenciales inválidas.');
        return;
      }

      // El backend valida redirect_uri (y client_id) y devuelve el destino; un 400 cae en el catch.
      const codeResult = await apiClient.post<RespuestaCodigoOauth>(
        '/api/oauth/code',
        cuerpoSolicitudCodigo(redirectUri, state, clientId),
        getBackendBaseUrl(),
      );

      const destino = destinoVinculacion(codeResult, state);
      if (!destino) {
        setError('No se pudo completar la vinculación de la cuenta.');
        return;
      }

      window.location.assign(destino);
    } catch (err: unknown) {
      setError(mensajeErrorVinculacion(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--fondo-general)' }}>
      <Card padding="lg" className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6 text-center">
          <Mic size={32} style={{ color: 'var(--menu-texto-principal)' }} />
          <h1 className="text-2xl font-bold mt-3" style={{ color: 'var(--menu-texto-principal)', fontFamily: 'var(--font-family-serif)' }}>
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
            <p role="alert" className="text-sm" style={{ color: 'var(--danger-texto)' }}>
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
    <Suspense fallback={<div className="min-h-dvh" style={{ backgroundColor: 'var(--fondo-general)' }} />}>
      <OauthAlexaContent />
    </Suspense>
  );
}
