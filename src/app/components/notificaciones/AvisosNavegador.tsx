'use client';

import { BellOff, BellPlus, BellRing } from 'lucide-react';
import Button from '../ui/Button';
import { activarAvisosNavegador, useEstadoAvisosNavegador } from '../../hooks/useEstadoAvisosNavegador';
import { textoEstadoAvisos, type EstadoAvisos } from '../../utils/avisosNotificaciones';

interface VistaProps {
  estado: EstadoAvisos;
  onActivar: () => void;
}

/** Presentación (probada sin DOM): bloque con texto en el perfil. */
export function VistaAvisosNavegador({ estado, onActivar }: VistaProps) {
  const { accion, detalle } = textoEstadoAvisos(estado);
  const Icono = estado === 'activados' ? BellRing : estado === 'sin_pedir' ? BellPlus : BellOff;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mf-perfil-fila__icono shrink-0">
          <Icono size={20} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
            Avisos del navegador
          </p>
          <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }} role={estado === 'sin_pedir' ? undefined : 'status'}>
            {detalle}
          </p>
        </div>
      </div>
      {estado === 'sin_pedir' && (
        <Button size="sm" onClick={onActivar} className="self-start sm:self-auto">
          {accion}
        </Button>
      )}
    </div>
  );
}

/**
 * "Activar avisos del navegador" en el perfil (en los encabezados vive dentro del menú de la campana,
 * CampanaAvisos). El permiso se pide SOLO al hacer clic. Muestra si están activados, bloqueados (con cómo
 * desbloquearlos) o si el navegador no los permite (Android, iPhone o iPad, sin Notification): ahí solo
 * queda el aviso interno de la campana.
 */
export default function AvisosNavegador({ variante }: { variante: 'perfil' }) {
  const estado = useEstadoAvisosNavegador();
  if (estado === null || variante !== 'perfil') return null;
  return <VistaAvisosNavegador estado={estado} onActivar={() => void activarAvisosNavegador()} />;
}
