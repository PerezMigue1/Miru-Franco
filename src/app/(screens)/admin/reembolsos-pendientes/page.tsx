'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { HandCoins, RefreshCw, RotateCcw, Undo2 } from 'lucide-react';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Textarea from '../../../components/ui/Textarea';
import { formatearPrecioMXN } from '../../../utils/formatoPrecio';
import { mensajeDeError } from '../../../utils/errorRed';
import { showConfirm, showToast } from '../../../utils/toast';
import { fechaHoraMexico } from '../../../components/privacidad/textosPrivacidad';
import {
  listarReembolsosPendientes,
  marcarReembolsoManual,
  reintentarReembolso,
  type ReembolsoPendiente,
} from '../../../services/reembolsosPendientes';
import { ETIQUETA_ACCION_HISTORIAL, MAX_NOTA, MAX_REFERENCIA, origenDelPago, validarReembolsoManual } from './reembolsosPendientes';

/**
 * Admin > Reembolsos pendientes: dinero recibido que quedó en revisión (por ejemplo, un reembolso automático que
 * falló, "reembolsar a mano"). "Reintentar reembolso" vuelve a pedirlo a Mercado Pago con la misma clave (nunca
 * devuelve dos veces); "Marcar como reembolsado manualmente" registra la referencia y la nota. Todo queda en el
 * historial de cada pago.
 */
export default function ReembolsosPendientesPage() {
  const [filas, setFilas] = useState<ReembolsoPendiente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [manual, setManual] = useState<ReembolsoPendiente | null>(null);
  const [referencia, setReferencia] = useState('');
  const [nota, setNota] = useState('');
  const [errores, setErrores] = useState<{ referencia?: string; nota?: string }>({});
  const [errorManual, setErrorManual] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    listarReembolsosPendientes()
      .then((lista) => {
        if (!vigente) return;
        setFilas(lista);
        setError(null);
      })
      .catch((e) => vigente && setError(mensajeDeError(e, 'No pudimos cargar los reembolsos pendientes.')))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [intento]);

  const recargar = useCallback(() => {
    setCargando(true);
    setIntento((n) => n + 1);
  }, []);

  const reintentar = async (p: ReembolsoPendiente) => {
    const ok = await showConfirm(
      `Se pedirá a Mercado Pago devolver ${formatearPrecioMXN(p.monto)} del pago ${p.referenciaExterna}. Si ya se había devuelto, no se devuelve dos veces.`,
      { title: 'Reintentar reembolso', confirmText: 'Reintentar reembolso', cancelText: 'Cancelar' },
    );
    if (!ok) return;
    setOcupado(p.id);
    try {
      await reintentarReembolso(p.id);
      showToast('Reembolso hecho. La clienta recibe el aviso en su cuenta.', 'success');
      recargar();
    } catch (e) {
      showToast(mensajeDeError(e, 'Mercado Pago no pudo hacer el reembolso. Intenta de nuevo.'), 'error');
      recargar();
    } finally {
      setOcupado(null);
    }
  };

  const abrirManual = (p: ReembolsoPendiente) => {
    setManual(p);
    setReferencia('');
    setNota('');
    setErrores({});
    setErrorManual(null);
  };

  const guardarManual = async () => {
    if (!manual) return;
    const e = validarReembolsoManual(referencia, nota);
    setErrores(e);
    if (e.referencia || e.nota) return;
    const ok = await showConfirm(`El pago de ${formatearPrecioMXN(manual.monto)} quedará como reembolsado con la referencia "${referencia.trim()}". No se puede deshacer.`, {
      title: 'Marcar como reembolsado manualmente',
      confirmText: 'Marcar como reembolsado',
      cancelText: 'Cancelar',
    });
    if (!ok) return;
    setOcupado(manual.id);
    try {
      await marcarReembolsoManual(manual.id, referencia, nota);
      showToast('Quedó registrado como reembolsado. La clienta recibe el aviso en su cuenta.', 'success');
      setManual(null);
      recargar();
    } catch (err) {
      setErrorManual(mensajeDeError(err, 'No se pudo registrar el reembolso.'));
    } finally {
      setOcupado(null);
    }
  };

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              Reembolsos pendientes
            </h1>
            <p className="mt-1 max-w-[65ch] text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
              Pagos recibidos que hay que devolver o revisar: un reembolso automático que falló, o un pago que llegó cuando el pedido o
              la cita ya no lo esperaban.
            </p>
          </div>
          <Button variant="outline" onClick={recargar} disabled={cargando}>
            <RefreshCw size={16} aria-hidden /> Actualizar
          </Button>
        </div>

        {cargando ? (
          <div className="space-y-3" aria-busy="true" aria-label="Cargando reembolsos pendientes">
            <div className="mf-skeleton h-28 rounded-[12px]" />
            <div className="mf-skeleton h-28 rounded-[12px]" />
          </div>
        ) : error ? (
          <Card padding="md">
            <p role="alert" className="text-sm" style={{ color: 'var(--danger-texto)' }}>
              {error}
            </p>
            <Button className="mt-3" variant="outline" onClick={recargar}>
              Reintentar
            </Button>
          </Card>
        ) : filas.length === 0 ? (
          <Card padding="lg" className="text-center">
            <HandCoins size={32} aria-hidden className="mx-auto mb-3 text-encabezados-alterno" />
            <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
              No hay reembolsos pendientes
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
              Cuando un reembolso falle o llegue un pago que no se pueda aplicar, aparecerá aquí.
            </p>
          </Card>
        ) : (
          <ul className="space-y-4">
            {filas.map((p) => {
              const origen = origenDelPago(p);
              return (
                <li key={p.id}>
                  <Card padding="md">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                          <span className="mf-cifras text-lg">{formatearPrecioMXN(p.monto)}</span>
                          <Badge variant="warning" size="sm">
                            En revisión
                          </Badge>
                        </p>
                        <p className="mt-1 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                          <Link href={origen.href} className="font-semibold underline underline-offset-2" style={{ color: 'var(--menu-texto-principal)' }}>
                            {origen.texto}
                          </Link>
                          {p.clienta ? ` · ${p.clienta}` : ''}
                          {p.servicio ? ` · ${p.servicio}` : ''}
                        </p>
                        <p className="mt-1 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                          {p.motivo}
                        </p>
                        <p className="mt-1 text-xs tabular-nums" style={{ color: 'var(--encabezados-alterno)' }}>
                          {p.referenciaExterna ? `Pago de Mercado Pago ${p.referenciaExterna}` : `Pago ${p.metodo}`}
                          {p.pagadoEn ? ` · pagado el ${fechaHoraMexico(p.pagadoEn)}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {p.puedeReintentar && (
                          <Button onClick={() => void reintentar(p)} disabled={ocupado !== null}>
                            <RotateCcw size={16} aria-hidden /> {ocupado === p.id ? 'Reintentando…' : 'Reintentar reembolso'}
                          </Button>
                        )}
                        <Button variant="outline" onClick={() => abrirManual(p)} disabled={ocupado !== null}>
                          <Undo2 size={16} aria-hidden /> Marcar como reembolsado manualmente
                        </Button>
                      </div>
                    </div>
                    {p.historial.length > 0 && (
                      <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--mf-linea)' }}>
                        <p className="text-xs font-semibold" style={{ color: 'var(--encabezados-alterno)' }}>
                          Historial
                        </p>
                        <ul className="mt-1 space-y-1 text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
                          {p.historial.map((h, i) => (
                            <li key={i}>
                              <span className="tabular-nums">{fechaHoraMexico(h.creadoEn)}</span>: {ETIQUETA_ACCION_HISTORIAL[h.accion]}
                              {h.referencia ? `, referencia ${h.referencia}` : ''}
                              {h.usuario ? `, por ${h.usuario}` : ''}
                              {h.nota ? `. ${h.nota}` : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal
        isOpen={manual !== null}
        onClose={() => ocupado === null && setManual(null)}
        title="Marcar como reembolsado manualmente"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setManual(null)} disabled={ocupado !== null}>
              Cancelar
            </Button>
            <Button onClick={() => void guardarManual()} disabled={ocupado !== null}>
              {ocupado !== null ? 'Guardando…' : 'Guardar'}
            </Button>
          </>
        }
      >
        {manual && (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
              Úsalo si ya devolviste {formatearPrecioMXN(manual.monto)} por otro medio (transferencia, efectivo o el panel de Mercado Pago).
            </p>
            <Input
              label="Referencia del reembolso"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              maxLength={MAX_REFERENCIA}
              required
              aria-required
              error={errores.referencia}
              helperText="Folio de la transferencia o número del reembolso."
              fullWidth
            />
            <Textarea label="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} maxLength={MAX_NOTA} rows={3} error={errores.nota} fullWidth />
            {errorManual && (
              <p role="alert" className="text-sm" style={{ color: 'var(--danger-texto)' }}>
                {errorManual}
              </p>
            )}
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
