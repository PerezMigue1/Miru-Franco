'use client';

import { useState } from 'react';
import { Ban, Banknote, CircleSlash, HandCoins, Undo2 } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import { marcarNoAsistio, reembolsarAnticipo, registrarAnticipo, retenerAnticipo, type CitaApi } from '../../services/citas';
import { accionesAnticipo, estadoAnticipo, INFO_ANTICIPO, reembolsoSaleDeCaja, tiempoRestante } from '../../utils/anticipoCita';
import { fmtMoneda } from '../../utils/cobroPos';
import { usePermisos } from '../../utils/permisos';
import { showToast } from '../../utils/toast';

/** Badge del anticipo con el monto y, si está pendiente, el tiempo que queda. Nada si la cita no pide anticipo. */
export function IndicadorAnticipo({ cita, ahora }: { cita: CitaApi; ahora: Date }) {
  const estado = estadoAnticipo(cita, ahora);
  if (estado === 'no_requiere') return null;
  const info = INFO_ANTICIPO[estado];
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <Badge variant={info.variante} size="sm">{info.etiqueta}</Badge>
      <span className="text-xs text-encabezados-alterno mf-cifras">
        {fmtMoneda(cita.anticipoRequerido ?? 0)}
        {estado === 'pendiente' && cita.anticipoVenceEn ? ` · quedan ${tiempoRestante(cita.anticipoVenceEn, ahora)}` : ''}
      </span>
    </span>
  );
}

type Accion = 'reembolsar' | 'retener' | 'noAsistio';
const CONFIRMACION: Record<Accion, { titulo: string; texto: string; boton: string }> = {
  reembolsar: {
    titulo: 'Reembolsar anticipo',
    texto: 'Si se pagó con Mercado Pago, se devuelve a la clienta por la misma vía. Si se pagó en el salón, queda registrado y entregas el dinero tú.',
    boton: 'Reembolsar',
  },
  retener: {
    titulo: 'Retener anticipo',
    texto: 'El salón se queda el anticipo de esta cita (Términos y condiciones, sección 6).',
    boton: 'Retener',
  },
  noAsistio: {
    titulo: 'Marcar "no asistió"',
    texto: 'La cita se cierra y libera el horario. Si tenía anticipo pagado, se retiene.',
    boton: 'Marcar no asistió',
  },
};

/**
 * Acciones del personal sobre el anticipo de una cita: registrar el pago en el salón, reembolsar, retener
 * y "no asistió". Cada botón aparece solo si el rol y el estado lo permiten (el backend lo valida igual).
 */
export function AccionesAnticipo({ cita, ahora, onCambio, conNoAsistio = false }: { cita: CitaApi; ahora: Date; onCambio: () => void; conNoAsistio?: boolean }) {
  const { tienePermiso } = usePermisos();
  const acciones = accionesAnticipo(cita, ahora, tienePermiso);
  const [registrando, setRegistrando] = useState(false);
  const [metodo, setMetodo] = useState<'efectivo' | 'transferencia' | 'tarjeta'>('efectivo');
  const [confirmar, setConfirmar] = useState<Accion | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ejecutar = async (accion: () => Promise<void>, exito: string) => {
    setGuardando(true);
    setError(null);
    try {
      await accion();
      showToast(exito, 'success');
      setRegistrando(false);
      setConfirmar(null);
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la acción');
    } finally {
      setGuardando(false);
    }
  };

  const hayAlgo = acciones.registrar || acciones.reembolsar || acciones.retener || (conNoAsistio && acciones.noAsistio);
  if (!hayAlgo) return null;

  return (
    <>
      {acciones.registrar && (
        <Button size="sm" variant="outline" onClick={() => { setError(null); setRegistrando(true); }}>
          <span className="inline-flex items-center gap-1.5"><Banknote size={14} aria-hidden /> Registrar anticipo</span>
        </Button>
      )}
      {acciones.reembolsar && (
        <Button size="sm" variant="outline" onClick={() => { setError(null); setConfirmar('reembolsar'); }}>
          <span className="inline-flex items-center gap-1.5"><Undo2 size={14} aria-hidden /> Reembolsar</span>
        </Button>
      )}
      {acciones.retener && (
        <Button size="sm" variant="outline" onClick={() => { setError(null); setConfirmar('retener'); }}>
          <span className="inline-flex items-center gap-1.5"><HandCoins size={14} aria-hidden /> Retener</span>
        </Button>
      )}
      {conNoAsistio && acciones.noAsistio && (
        <Button size="sm" variant="outline" onClick={() => { setError(null); setConfirmar('noAsistio'); }}>
          <span className="inline-flex items-center gap-1.5"><CircleSlash size={14} aria-hidden /> No asistió</span>
        </Button>
      )}

      <Modal
        isOpen={registrando}
        onClose={() => { if (!guardando) setRegistrando(false); }}
        title="Registrar anticipo"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setRegistrando(false)} disabled={guardando}>Cancelar</Button>
            <Button onClick={() => ejecutar(() => registrarAnticipo(cita.id, metodo), 'Anticipo registrado: la cita quedó confirmada')} disabled={guardando}>
              {guardando ? 'Registrando…' : `Cobrar ${fmtMoneda(cita.anticipoRequerido ?? 0)}`}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-menu-texto-principal">
            {cita.clienteNombre || 'Clienta'} · {cita.servicioNombre || 'Servicio'}
          </p>
          <Select
            label="Método de pago"
            value={metodo}
            onChange={(e) => setMetodo(e.target.value as typeof metodo)}
            options={[
              { value: 'efectivo', label: 'Efectivo' },
              { value: 'transferencia', label: 'Transferencia' },
              { value: 'tarjeta', label: 'Tarjeta (terminal)' },
            ]}
            fullWidth
          />
          <p className="text-xs text-encabezados-alterno">Entra al corte de caja de hoy con este método. En el cobro final se descuenta del servicio.</p>
          {error && <p role="alert" className="text-sm font-medium text-[var(--danger-texto)]">{error}</p>}
        </div>
      </Modal>

      <Modal
        isOpen={confirmar !== null}
        onClose={() => { if (!guardando) setConfirmar(null); }}
        title={confirmar ? CONFIRMACION[confirmar].titulo : ''}
        size="sm"
        footer={
          confirmar && (
            <>
              <Button variant="outline" onClick={() => setConfirmar(null)} disabled={guardando}>Volver</Button>
              <Button
                variant={confirmar === 'retener' ? 'primary' : 'danger'}
                disabled={guardando}
                onClick={() =>
                  ejecutar(
                    confirmar === 'reembolsar'
                      ? () => reembolsarAnticipo(cita.id)
                      : confirmar === 'retener'
                        ? () => retenerAnticipo(cita.id)
                        : () => marcarNoAsistio(cita.id),
                    confirmar === 'reembolsar' ? 'Anticipo reembolsado' : confirmar === 'retener' ? 'Anticipo retenido' : 'Cita marcada como no asistió',
                  )
                }
              >
                {guardando ? 'Guardando…' : CONFIRMACION[confirmar].boton}
              </Button>
            </>
          )
        }
      >
        {confirmar && (
          <div className="space-y-3">
            <p className="flex items-start gap-2 text-sm text-menu-texto-principal">
              <Ban size={16} aria-hidden className="mt-0.5 shrink-0 text-encabezados-alterno" />
              {CONFIRMACION[confirmar].texto}
            </p>
            {confirmar !== 'noAsistio' && (
              <p className="text-sm text-encabezados-alterno">
                Anticipo: <span className="mf-cifras font-semibold text-menu-texto-principal">{fmtMoneda(cita.anticipoRequerido ?? 0)}</span>
              </p>
            )}
            {confirmar === 'reembolsar' && reembolsoSaleDeCaja(cita) && (
              <p className="flex items-center gap-2 text-sm font-medium text-menu-texto-principal">
                <Banknote size={16} aria-hidden className="shrink-0 text-encabezados-alterno" />
                El efectivo sale de la caja de hoy.
              </p>
            )}
            {error && <p role="alert" className="text-sm font-medium text-[var(--danger-texto)]">{error}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
