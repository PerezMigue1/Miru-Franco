'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Store } from 'lucide-react';
import Button from '../ui/Button';
import CasillaPoliticaAnticipos from './CasillaPoliticaAnticipos';
import { conAceptacionDeAnticipos, ENLACE_POLITICA_ANTICIPOS, MENSAJE_FALTA_ANTICIPOS } from './consentimientoAnticipo';
import { puedeElegirPagoEnSalon, textosAdvertenciaAnticipo } from './advertenciaAnticipo';
import { crearPreferenciaAnticipo, pagarAnticipoEnSalon, type CitaApi } from '../../services/citas';
import { mensajeUsuarioDesdeErrorApi } from '../../utils/apiErrorMessage';

interface Props {
  cita: Pick<CitaApi, 'id' | 'fechaHoraInicio' | 'anticipoEnSalon'>;
  venceEn: string | null;
  enSalon: boolean;
  ahora: Date;
  /** Página donde se marca la casilla (evidencia del consentimiento). */
  rutaOrigen: string;
  /** El backend aceptó el pago en el salón: el plazo nuevo vence 15 min antes del inicio. */
  onCambioASalon: (anticipoVenceEn: string) => void;
}

/**
 * Pago de un anticipo pendiente (confirmación y detalle de la cita): casilla de la Política de anticipos, "Pagar
 * anticipo con Mercado Pago", "Pagar en el salón" si todavía da tiempo, y la advertencia de plazo y consecuencias.
 */
export default function OpcionesAnticipo({ cita, venceEn, enSalon, ahora, rutaOrigen, onCambioASalon }: Props) {
  const [acepta, setAcepta] = useState(false);
  const [errorCasilla, setErrorCasilla] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<'linea' | 'salon' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idCasilla = `anticipo-politica-${cita.id}`;
  const ofrecerSalon = !enSalon && puedeElegirPagoEnSalon({ fechaHoraInicio: cita.fechaHoraInicio, anticipoEnSalon: enSalon }, ahora);

  const revisarCasilla = () => {
    if (acepta) return true;
    setErrorCasilla(MENSAJE_FALTA_ANTICIPOS);
    document.getElementById(idCasilla)?.focus();
    return false;
  };

  const pagarEnLinea = async () => {
    if (!revisarCasilla()) return;
    setOcupado('linea');
    setError(null);
    try {
      const { initPoint } = await conAceptacionDeAnticipos(rutaOrigen, () => crearPreferenciaAnticipo(cita.id));
      window.location.assign(initPoint);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir Mercado Pago. Intenta de nuevo.');
      setOcupado(null);
    }
  };

  const pagarEnSalon = async () => {
    if (!revisarCasilla()) return;
    setOcupado('salon');
    setError(null);
    try {
      const { anticipoVenceEn } = await conAceptacionDeAnticipos(rutaOrigen, () => pagarAnticipoEnSalon(cita.id));
      onCambioASalon(anticipoVenceEn);
    } catch (e) {
      setError(mensajeUsuarioDesdeErrorApi(e));
    } finally {
      setOcupado(null);
    }
  };

  return (
    <div className="space-y-3 text-left">
      <ul className="space-y-1.5 rounded-[12px] bg-fondos-suaves px-4 py-3 text-sm text-encabezados-alterno">
        {textosAdvertenciaAnticipo({ enSalon, venceEn, ahora }).map((t) => (
          <li key={t}>{t}</li>
        ))}
        <li>
          <Link href={ENLACE_POLITICA_ANTICIPOS} className="inline-flex min-h-11 items-center font-semibold text-menu-texto-principal underline underline-offset-2">
            Leer la Política de anticipos y cancelación
          </Link>
        </li>
      </ul>
      <CasillaPoliticaAnticipos
        id={idCasilla}
        checked={acepta}
        onChange={(marcada) => {
          setAcepta(marcada);
          if (marcada) setErrorCasilla(null);
        }}
        error={errorCasilla}
      />
      <Button fullWidth size="lg" onClick={() => void pagarEnLinea()} disabled={ocupado !== null}>
        {ocupado === 'linea' ? 'Abriendo Mercado Pago…' : 'Pagar anticipo con Mercado Pago'}
      </Button>
      {ofrecerSalon && (
        <Button fullWidth size="lg" variant="outline" onClick={() => void pagarEnSalon()} disabled={ocupado !== null}>
          <Store size={18} aria-hidden /> {ocupado === 'salon' ? 'Guardando…' : 'Pagar en el salón'}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-[var(--danger-texto)]">
          {error}
        </p>
      )}
    </div>
  );
}
