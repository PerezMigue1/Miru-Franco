'use client';

import { useCallback, useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Input from '../../../../components/ui/Input';
import Badge from '../../../../components/ui/Badge';
import { actualizarAnticipoServicio, getServicios, type Servicio } from '../../../../services/servicios';
import { fmtMoneda, montoValido } from '../../../../utils/cobroPos';
import { PLAZOS_TERMINOS } from '../../../../utils/terminosCondiciones';
import { showToast } from '../../../../utils/toast';

const precioNum = (p?: string | number | null) => Number(String(p ?? '').replace(/[^0-9.]/g, '')) || 0;

/**
 * Anticipo que pide cada servicio al agendar en línea (servicios:escritura: estilista y admin).
 * Vacío o 0: el servicio no pide anticipo. El monto queda fijo en cada cita al agendarla.
 */
export default function AnticiposPorServicioPage() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [borradores, setBorradores] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const pedir = useCallback(() => {
    getServicios().then(({ data, error: e }) => {
      setServicios(data);
      setBorradores(Object.fromEntries(data.map((s) => [String(s.id), s.anticipoMonto ? String(s.anticipoMonto) : ''])));
      setError(e && data.length === 0 ? e : null);
      setCargando(false);
    });
  }, []);

  useEffect(() => { pedir(); }, [pedir]);

  const guardar = async (s: Servicio) => {
    const id = String(s.id);
    const texto = (borradores[id] ?? '').trim();
    const monto = texto === '' ? 0 : Number(texto);
    if (texto !== '' && !montoValido(texto)) {
      setErrores((e) => ({ ...e, [id]: 'Monto inválido: cero o más, con hasta 2 decimales' }));
      return;
    }
    if (monto > precioNum(s.precio)) {
      setErrores((e) => ({ ...e, [id]: 'El anticipo no puede ser mayor que el precio del servicio' }));
      return;
    }
    setGuardandoId(id);
    setErrores((e) => ({ ...e, [id]: '' }));
    try {
      await actualizarAnticipoServicio(s.id, monto > 0 ? monto : null);
      setServicios((lista) => lista.map((x) => (String(x.id) === id ? { ...x, anticipoMonto: monto > 0 ? monto : null } : x)));
      showToast(monto > 0 ? `${s.nombre}: anticipo de ${fmtMoneda(monto)}` : `${s.nombre} ya no pide anticipo`, 'success');
    } catch (e) {
      setErrores((x) => ({ ...x, [id]: e instanceof Error ? e.message : 'No se pudo guardar' }));
    } finally {
      setGuardandoId(null);
    }
  };

  return (
    <OperacionLayout permisoRequerido="servicios:escritura">
      <div className="w-full max-w-none space-y-8">
        <div>
          <h1 className="text-elegant-title text-menu-texto-principal">Anticipos por servicio</h1>
          <p className="mt-1 max-w-3xl text-sm text-encabezados-alterno">
            Lo que pide cada servicio cuando una clienta agenda en línea. Tiene {PLAZOS_TERMINOS.horasAnticipoCita} horas
            para pagarlo con Mercado Pago o en el salón; si no, la cita se libera. Déjalo vacío o en 0 para no pedir anticipo.
          </p>
        </div>

        <Card variant="elevated" padding="lg">
          {cargando ? (
            <p className="py-6 text-center text-sm text-encabezados-alterno">Cargando servicios…</p>
          ) : error ? (
            <div className="py-6 text-center">
              <p role="alert" className="mb-3 text-[var(--danger-texto)]">{error}</p>
              <Button variant="outline" onClick={() => { setCargando(true); pedir(); }}>Reintentar</Button>
            </div>
          ) : servicios.length === 0 ? (
            <p className="py-6 text-center text-sm text-encabezados-alterno">No hay servicios activos.</p>
          ) : (
            <ul className="divide-y divide-[var(--borde-visible)]">
              {servicios.map((s) => {
                const id = String(s.id);
                const actual = s.anticipoMonto ? String(s.anticipoMonto) : '';
                const borrador = borradores[id] ?? '';
                const cambio = borrador.trim() !== actual && !(borrador.trim() === '0' && actual === '');
                const ocupado = guardandoId === id;
                return (
                  <li key={id} className="py-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                      <div className="min-w-0 md:pb-2">
                        <p className="flex flex-wrap items-center gap-2 font-semibold text-menu-texto-principal">
                          {s.nombre}
                          {s.anticipoMonto ? (
                            <Badge variant="info" size="sm">
                              <span className="inline-flex items-center gap-1"><Wallet size={12} aria-hidden /> Pide {fmtMoneda(s.anticipoMonto)}</span>
                            </Badge>
                          ) : (
                            <Badge variant="default" size="sm">Sin anticipo</Badge>
                          )}
                        </p>
                        <p className="text-sm text-encabezados-alterno">
                          Precio <span className="mf-cifras">{fmtMoneda(precioNum(s.precio))}</span>
                          {s.duracion ? ` · ${s.duracion}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="w-36">
                          <Input
                            label="Anticipo ($)"
                            type="number"
                            min={0}
                            step={0.01}
                            inputMode="decimal"
                            value={borrador}
                            onChange={(e) => setBorradores((b) => ({ ...b, [id]: e.target.value }))}
                            placeholder="Sin anticipo"
                            fullWidth
                          />
                        </div>
                        <Button size="sm" onClick={() => guardar(s)} disabled={ocupado || !cambio} className="mb-1">
                          {ocupado ? 'Guardando…' : 'Guardar'}
                        </Button>
                      </div>
                    </div>
                    {errores[id] && <p role="alert" className="mt-2 text-sm text-[var(--danger-texto)]">{errores[id]}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </OperacionLayout>
  );
}
