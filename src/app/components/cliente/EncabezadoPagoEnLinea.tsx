'use client';

import { AlertCircle, Clock } from 'lucide-react';
import Button from '../ui/Button';
import SelloConfirmacion from './SelloConfirmacion';
import type { EstadoPagoEnLinea } from '../../services/ecommerce';
import { useTextosSitio } from '../../hooks/useTextosSitio';

/**
 * Encabezado del pedido pagado en línea (confirmación de compra) según el estado real que confirma el
 * servidor. Si la consulta falla (503) muestra el error con "Reintentar pago" en lugar de quedarse
 * consultando para siempre.
 */
export default function EncabezadoPagoEnLinea({
  estado,
  esperando,
  venceEn,
  reintentando,
  onReintentar,
  errorConsulta,
}: {
  estado: EstadoPagoEnLinea | null;
  esperando: boolean;
  venceEn: Date | null;
  reintentando: boolean;
  onReintentar: () => void;
  /** Mensaje en español si no se pudo consultar el estado del pago. */
  errorConsulta: string | null;
}) {
  // Textos de Admin > Textos del sitio (página Checkout).
  const { t } = useTextosSitio();
  const circulo = (icono: React.ReactNode, fondo: string) => (
    <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: fondo }}>
      {icono}
    </div>
  );
  const venceTexto = venceEn
    ? venceEn.toLocaleString('es-MX', { timeZone: 'America/Mexico_City', weekday: 'long', hour: '2-digit', minute: '2-digit' })
    : null;
  const botonReintentar = (
    <Button onClick={onReintentar} disabled={reintentando}>
      {reintentando ? 'Abriendo Mercado Pago…' : 'Reintentar pago'}
    </Button>
  );

  if (estado === 'aprobado') {
    return (
      <>
        <div className="mb-5 flex justify-center">
          <SelloConfirmacion />
        </div>
        <h1 className="mf-titulo-pagina mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
          ¡Pago recibido!
        </h1>
        <p className="text-lg" style={{ color: 'var(--encabezados-alterno)' }}>
          {t('tienda.pagoRecibidoTexto')}
        </p>
      </>
    );
  }
  if (estado === 'revision') {
    return (
      <>
        {circulo(<AlertCircle size={36} aria-hidden style={{ color: 'var(--texto-fondo-oscuro)' }} />, 'var(--warning)')}
        <h1 className="mf-titulo-pagina mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
          Recibimos tu pago
        </h1>
        <p className="text-lg" style={{ color: 'var(--encabezados-alterno)' }}>
          Necesitamos revisarlo antes de preparar tu pedido. El salón te contactará; no tienes que pagar otra vez.
        </p>
      </>
    );
  }
  const noSeCompleto = estado === 'rechazado' || (estado === 'sin_pago' && !esperando);
  if (noSeCompleto) {
    return (
      <>
        {circulo(<AlertCircle size={36} aria-hidden style={{ color: 'var(--texto-fondo-oscuro)' }} />, 'var(--danger)')}
        <h1 className="mf-titulo-pagina mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
          Tu pago no se completó
        </h1>
        <p className="text-lg mb-5" style={{ color: 'var(--encabezados-alterno)' }}>
          {estado === 'rechazado' ? 'Mercado Pago no aprobó el pago y no se hizo ningún cargo.' : 'Todavía no recibimos tu pago.'}{' '}
          Tu pedido sigue apartado{venceTexto ? <> hasta el <span className="mf-cifras">{venceTexto}</span></> : null}.
        </p>
        {botonReintentar}
      </>
    );
  }
  if (estado === null && errorConsulta) {
    return (
      <>
        {circulo(<AlertCircle size={36} aria-hidden style={{ color: 'var(--texto-fondo-oscuro)' }} />, 'var(--warning)')}
        <h1 className="mf-titulo-pagina mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
          No pudimos consultar tu pago
        </h1>
        <p className="text-lg mb-2" style={{ color: 'var(--encabezados-alterno)' }}>
          {errorConsulta}
        </p>
        <p className="text-sm mb-5" style={{ color: 'var(--encabezados-alterno)' }}>
          Si ya pagaste, no pagues otra vez: revisa tu pedido en Mis pedidos en unos minutos. Si no, puedes intentarlo de nuevo.
        </p>
        {botonReintentar}
      </>
    );
  }
  if (estado === null) {
    return (
      <>
        {circulo(<Clock size={36} aria-hidden style={{ color: 'var(--texto-fondo-oscuro)' }} />, 'var(--botones-principales)')}
        <h1 className="mf-titulo-pagina mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
          Consultando el estado de tu pago…
        </h1>
      </>
    );
  }
  return (
    <>
      {circulo(<Clock size={36} aria-hidden style={{ color: 'var(--texto-fondo-oscuro)' }} />, 'var(--botones-principales)')}
      <h1 className="mf-titulo-pagina mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
        Tu pago se está procesando
      </h1>
      <p className="text-lg" style={{ color: 'var(--encabezados-alterno)' }}>
        {esperando
          ? 'Mercado Pago aún no lo confirma. Esta página se actualiza sola.'
          : t('tienda.pagoEnProcesoTexto')}
      </p>
    </>
  );
}
