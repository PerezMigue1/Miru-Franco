'use client';

import { useEffect, useState } from 'react';
import { KeyRound, Lock, Mail } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { showToast } from '../../utils/toast';
import { cuentaTienePassword } from '../../services/auth';
import {
  campoDelErrorCambioCorreo,
  campoPasswordCambioCorreo,
  confirmarCambioCorreo,
  solicitarCambioCorreo,
  validarCodigoCambioCorreo,
  validarCodigoCorreoActual,
  validarCorreoNuevo,
  validarPasswordActualCambioCorreo,
} from '../../services/perfil';

interface CambioCorreoModalProps {
  isOpen: boolean;
  onClose: () => void;
  correoActual: string;
  /** Se llama con el correo nuevo cuando el cambio quedó confirmado. */
  onCambiado: (correoNuevo: string) => void;
}

type Paso = 'correo' | 'codigo';

/**
 * "Modificar" del correo en el perfil: paso 1, correo nuevo; paso 2, el código que llega a ese correo y, si la
 * cuenta no tiene contraseña (solo Google), también el que llega al correo actual.
 */
export default function CambioCorreoModal({ isOpen, onClose, correoActual, onCambiado }: CambioCorreoModalProps) {
  const [paso, setPaso] = useState<Paso>('correo');
  const [correoNuevo, setCorreoNuevo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [aviso, setAviso] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Contraseña actual: obligatoria si la cuenta tiene una (tienePassword de GET /auth/me); null = no se sabe.
  const [passwordActual, setPasswordActual] = useState('');
  const [errorPassword, setErrorPassword] = useState<string | null>(null);
  const [tienePassword, setTienePassword] = useState<boolean | null>(null);
  const campoPassword = campoPasswordCambioCorreo(tienePassword);
  // Cuenta sin contraseña: el backend manda otro código al correo actual y hacen falta los dos.
  const [pideCodigoActual, setPideCodigoActual] = useState(false);
  const [codigoActual, setCodigoActual] = useState('');
  const [errorCodigoActual, setErrorCodigoActual] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let vigente = true;
    void cuentaTienePassword().then((valor) => {
      if (vigente) setTienePassword(valor);
    });
    return () => {
      vigente = false;
    };
  }, [isOpen]);

  const reiniciar = () => {
    setPaso('correo');
    setCorreoNuevo('');
    setCodigo('');
    setAviso('');
    setError(null);
    setPasswordActual('');
    setErrorPassword(null);
    setPideCodigoActual(false);
    setCodigoActual('');
    setErrorCodigoActual(null);
  };

  const cerrar = () => {
    if (cargando) return;
    reiniciar();
    onClose();
  };

  const enviarCodigo = async () => {
    const invalido = validarCorreoNuevo(correoNuevo, correoActual);
    const faltaPassword = validarPasswordActualCambioCorreo(passwordActual, tienePassword);
    setError(invalido);
    setErrorPassword(faltaPassword);
    if (invalido || faltaPassword) {
      if (paso === 'codigo') setPaso('correo');
      return;
    }
    setCargando(true);
    try {
      const res = await solicitarCambioCorreo(correoNuevo, correoActual, passwordActual);
      setAviso(res.mensaje);
      setCodigo('');
      setPideCodigoActual(res.codigoAlCorreoActual);
      setCodigoActual('');
      setErrorCodigoActual(null);
      setPaso('codigo');
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'No pudimos enviar el código. Intenta de nuevo.';
      // PASSWORD_ACTUAL_REQUERIDA o _INCORRECTA: junto al campo de contraseña; lo demás junto al correo.
      if (campoDelErrorCambioCorreo(e) === 'password') {
        setErrorPassword(mensaje);
        setPaso('correo');
      } else {
        setError(mensaje);
      }
    } finally {
      setCargando(false);
    }
  };

  const confirmar = async () => {
    const invalido = validarCodigoCambioCorreo(codigo);
    const invalidoActual = pideCodigoActual ? validarCodigoCorreoActual(codigoActual) : null;
    setError(invalido);
    setErrorCodigoActual(invalidoActual);
    if (invalido || invalidoActual) return;
    setCargando(true);
    try {
      const correo = await confirmarCambioCorreo(codigo, pideCodigoActual ? codigoActual : undefined);
      showToast('Listo, tu correo cambió. Te avisamos en tu correo anterior.', 'success');
      reiniciar();
      onCambiado(correo);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos confirmar el código. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={cerrar}
      title="Cambiar tu correo"
      size="sm"
      footer={
        paso === 'correo' ? (
          <>
            <Button variant="outline" onClick={cerrar} disabled={cargando}>Cancelar</Button>
            <Button onClick={() => void enviarCodigo()} disabled={cargando}>
              {cargando ? 'Enviando…' : 'Enviar código'}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={() => {
                setError(null);
                setPaso('correo');
              }}
              disabled={cargando}
            >
              Usar otro correo
            </Button>
            <Button onClick={() => void confirmar()} disabled={cargando}>
              {cargando ? 'Confirmando…' : 'Cambiar correo'}
            </Button>
          </>
        )
      }
    >
      {paso === 'correo' ? (
        <div className="space-y-3">
          <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            Tu correo actual es <span className="font-semibold break-all" style={{ color: 'var(--menu-texto-principal)' }}>{correoActual || 'sin registrar'}</span>.
          </p>
          <Input
            label="Tu correo nuevo"
            type="email"
            autoComplete="email"
            value={correoNuevo}
            onChange={(e) => setCorreoNuevo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void enviarCodigo();
            }}
            icon={<Mail size={16} aria-hidden />}
            disabled={cargando}
            error={error ?? undefined}
            helperText="Te enviaremos un código a ese correo para confirmar que es tuyo."
            fullWidth
          />
          {campoPassword.visible && (
            <Input
              label="Contraseña actual"
              type="password"
              autoComplete="current-password"
              value={passwordActual}
              onChange={(e) => {
                setPasswordActual(e.target.value);
                if (errorPassword) setErrorPassword(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void enviarCodigo();
              }}
              icon={<Lock size={16} aria-hidden />}
              disabled={cargando}
              required={campoPassword.obligatorio}
              aria-required={campoPassword.obligatorio || undefined}
              error={errorPassword ?? undefined}
              helperText={campoPassword.ayuda ?? undefined}
              fullWidth
            />
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            {aviso} {pideCodigoActual ? 'Escríbelos' : 'Escríbelo'} aquí para usar <span className="font-semibold break-all" style={{ color: 'var(--menu-texto-principal)' }}>{correoNuevo.trim()}</span> en tu cuenta.
          </p>
          <Input
            label={pideCodigoActual ? 'Código de tu correo nuevo' : 'Código de 6 dígitos'}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void confirmar();
            }}
            icon={<KeyRound size={16} aria-hidden />}
            disabled={cargando}
            error={error ?? undefined}
            fullWidth
          />
          {pideCodigoActual && (
            <Input
              label="Código de tu correo actual"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={codigoActual}
              onChange={(e) => {
                setCodigoActual(e.target.value.replace(/\D/g, ''));
                if (errorCodigoActual) setErrorCodigoActual(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void confirmar();
              }}
              icon={<KeyRound size={16} aria-hidden />}
              disabled={cargando}
              required
              aria-required
              error={errorCodigoActual ?? undefined}
              helperText={`Lo enviamos a ${correoActual || 'tu correo actual'} para confirmar que eres tú.`}
              fullWidth
            />
          )}
          <button
            type="button"
            onClick={() => void enviarCodigo()}
            disabled={cargando}
            className="inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline disabled:opacity-60"
            style={{ color: 'var(--menu-texto-principal)' }}
          >
            ¿No te llegó? Envíame otro código
          </button>
        </div>
      )}
    </Modal>
  );
}
