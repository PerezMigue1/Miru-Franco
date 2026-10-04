'use client';

import { useCallback, useEffect, useState } from 'react';
import { BadgeDollarSign, ChevronDown, HandCoins, Scissors, Users } from 'lucide-react';
import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Input from '../../../../components/ui/Input';
import Badge from '../../../../components/ui/Badge';
import TarjetaKpi from '../../../../components/ui/TarjetaKpi';
import Table, { TableRow, TableCell } from '../../../../components/ui/Table';
import {
  cambiarRecibeComisiones,
  guardarComisionServicio,
  listarComisionesServicio,
  listarPersonalComisiones,
  obtenerReporteComisiones,
  quitarComisionServicio,
  type ComisionServicioApi,
  type PersonalComisionApi,
  type ReporteComisionesApi,
} from '../../../../services/comisiones';
import { PERMISOS_COMISIONES, usePermisos } from '../../../../utils/permisos';
import { hoyEnMexico, rangoDelMes } from '../../../../utils/fechaSoloDia';
import { fmtMoneda, montoValido } from '../../../../utils/cobroPos';
import { showToast } from '../../../../utils/toast';

const ETIQUETA_ROL: Record<string, string> = { estilista: 'Estilista', empleado: 'Empleado', becario: 'Becario', admin: 'Administración' };

function fechaHora(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const mensaje = (e: unknown, def: string) => (e instanceof Error ? e.message : def);

export default function ComisionesPage() {
  const { tienePermiso } = usePermisos();
  const puedeConfigurar = tienePermiso('comisiones:configurar');

  return (
    <OperacionLayout permisoRequerido={PERMISOS_COMISIONES}>
      <div className="w-full max-w-none space-y-8">
        <div>
          <h1 className="text-elegant-title text-menu-texto-principal">Comisiones</h1>
          <p className="mt-1 text-sm text-encabezados-alterno">
            {puedeConfigurar
              ? 'Monto fijo por servicio para el personal que recibe comisiones, y lo que lleva cada quien.'
              : 'Lo que llevas ganado por los servicios en los que participaste y que ya se cobraron.'}
          </p>
        </div>

        <Reporte todos={puedeConfigurar} />

        {puedeConfigurar && (
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[3fr_2fr]">
            <MontosPorServicio />
            <PersonalQueRecibe />
          </div>
        )}
      </div>
    </OperacionLayout>
  );
}

/** Reporte del periodo: con comisiones:configurar llega todo el personal; con ver_propias el backend solo manda lo propio. */
function Reporte({ todos }: { todos: boolean }) {
  const [inicial] = useState(() => rangoDelMes(hoyEnMexico()));
  const [periodo, setPeriodo] = useState(inicial);
  const [reporte, setReporte] = useState<ReporteComisionesApi | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Solo actualiza estado al responder (el estado de "cargando" lo pone quien la llama).
  const pedir = useCallback((desde: string, hasta: string) => {
    obtenerReporteComisiones(desde, hasta)
      .then((r) => { setReporte(r); setError(null); })
      .catch((e) => setError(mensaje(e, 'No se pudo cargar el reporte')))
      .finally(() => setCargando(false));
  }, []);

  const cargar = (desde: string, hasta: string) => {
    setCargando(true);
    setError(null);
    pedir(desde, hasta);
  };

  // Carga inicial con el mes en curso (cargando ya empieza en true); después se consulta con el botón.
  useEffect(() => { pedir(inicial.desde, inicial.hasta); }, [pedir, inicial]);

  const servicios = reporte?.personas.reduce((acc, p) => acc + p.servicios, 0) ?? 0;
  const periodoValido = periodo.desde && periodo.hasta && periodo.desde <= periodo.hasta;

  return (
    <section aria-labelledby="titulo-reporte" className="space-y-4">
      <Card variant="elevated" padding="lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <h2 id="titulo-reporte" className="text-lg font-semibold text-menu-texto-principal">
            {todos ? 'Reporte por persona' : 'Mis comisiones'}
          </h2>
          <form
            className="grid grid-cols-2 items-end gap-3 sm:flex"
            onSubmit={(e) => { e.preventDefault(); if (periodoValido) cargar(periodo.desde, periodo.hasta); }}
          >
            <Input label="Desde" type="date" value={periodo.desde} max={periodo.hasta} onChange={(e) => setPeriodo((p) => ({ ...p, desde: e.target.value }))} />
            <Input label="Hasta" type="date" value={periodo.hasta} min={periodo.desde} onChange={(e) => setPeriodo((p) => ({ ...p, hasta: e.target.value }))} />
            <Button type="submit" disabled={!periodoValido || cargando} className="col-span-2 sm:col-span-1">
              {cargando ? 'Consultando…' : 'Consultar'}
            </Button>
          </form>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <TarjetaKpi icono={BadgeDollarSign} etiqueta={todos ? 'Total del periodo' : 'Ganado en el periodo'} cargando={cargando} valor={fmtMoneda(reporte?.total ?? 0)} />
        <TarjetaKpi icono={Scissors} etiqueta="Servicios con participación" cargando={cargando} valor={servicios} />
        {todos && <TarjetaKpi icono={Users} etiqueta="Personas con comisión" cargando={cargando} valor={reporte?.personas.filter((p) => p.totalComision > 0).length ?? 0} />}
      </div>

      <Card variant="elevated" padding="lg">
        {cargando && !reporte ? (
          <p className="py-6 text-center text-sm text-encabezados-alterno">Cargando…</p>
        ) : error ? (
          <div className="py-6 text-center">
            <p role="alert" className="mb-3 text-[var(--danger-texto)]">{error}</p>
            <Button variant="outline" onClick={() => cargar(periodo.desde, periodo.hasta)}>Reintentar</Button>
          </div>
        ) : !reporte || reporte.personas.length === 0 ? (
          <p className="py-6 text-center text-sm text-encabezados-alterno">
            {todos ? 'Nadie tiene participaciones cobradas en este periodo.' : 'Aún no tienes servicios cobrados en este periodo.'}
          </p>
        ) : (
          <ul className="divide-y divide-[var(--borde-visible)]">
            {reporte.personas.map((p) => (
              <li key={p.usuarioId}>
                <details className="group" open={!todos}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-menu-texto-principal">{p.nombre}</span>
                      <span className="text-sm text-encabezados-alterno">{p.servicios} servicio{p.servicios === 1 ? '' : 's'}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-lg font-bold text-menu-texto-principal">{fmtMoneda(p.totalComision)}</span>
                      <ChevronDown size={18} aria-hidden className="text-encabezados-alterno transition-transform group-open:rotate-180" />
                    </span>
                  </summary>
                  <div className="pb-4">
                    <Table headers={['Fecha', 'Folio', 'Servicio', 'Comisión']} headerSutil>
                      {p.detalle.map((d, i) => (
                        <TableRow key={`${d.folio}-${i}`}>
                          <TableCell>{fechaHora(d.fecha)}</TableCell>
                          <TableCell>{d.folio || '-'}</TableCell>
                          <TableCell>{d.servicio}</TableCell>
                          <TableCell className="font-semibold">
                            {d.comision > 0 ? fmtMoneda(d.comision) : <span className="text-encabezados-alterno">Sin comisión</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </Table>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}

type Borrador = { monto: string; activo: boolean };

function MontosPorServicio() {
  const [servicios, setServicios] = useState<ComisionServicioApi[]>([]);
  const [borradores, setBorradores] = useState<Record<number, Borrador>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardandoId, setGuardandoId] = useState<number | null>(null);
  const [errores, setErrores] = useState<Record<number, string>>({});

  const pedir = useCallback(() => {
    listarComisionesServicio()
      .then((lista) => {
        setError(null);
        setServicios(lista);
        setBorradores(Object.fromEntries(lista.map((s) => [s.servicioId, { monto: s.comision ? String(s.comision.monto) : '', activo: s.comision?.activo ?? true }])));
      })
      .catch((e) => setError(mensaje(e, 'No se pudieron cargar los servicios')))
      .finally(() => setCargando(false));
  }, []);

  const cargar = () => { setCargando(true); setError(null); pedir(); };

  useEffect(() => { pedir(); }, [pedir]);

  const cambiar = (id: number, cambios: Partial<Borrador>) => setBorradores((b) => ({ ...b, [id]: { ...b[id], ...cambios } }));

  const guardar = async (s: ComisionServicioApi) => {
    const b = borradores[s.servicioId];
    const monto = Number(b.monto);
    if (!montoValido(b.monto)) {
      setErrores((e) => ({ ...e, [s.servicioId]: 'Monto inválido: cero o más, con hasta 2 decimales' }));
      return;
    }
    setGuardandoId(s.servicioId);
    setErrores((e) => ({ ...e, [s.servicioId]: '' }));
    try {
      await guardarComisionServicio(s.servicioId, { monto, activo: b.activo });
      setServicios((lista) => lista.map((x) => (x.servicioId === s.servicioId ? { ...x, comision: { monto, activo: b.activo } } : x)));
      showToast(`Comisión de ${s.nombre} guardada`, 'success');
    } catch (e) {
      setErrores((x) => ({ ...x, [s.servicioId]: mensaje(e, 'No se pudo guardar') }));
    } finally {
      setGuardandoId(null);
    }
  };

  const quitar = async (s: ComisionServicioApi) => {
    setGuardandoId(s.servicioId);
    try {
      await quitarComisionServicio(s.servicioId);
      setServicios((lista) => lista.map((x) => (x.servicioId === s.servicioId ? { ...x, comision: null } : x)));
      cambiar(s.servicioId, { monto: '', activo: true });
      showToast(`${s.nombre} ya no genera comisión`, 'success');
    } catch (e) {
      setErrores((x) => ({ ...x, [s.servicioId]: mensaje(e, 'No se pudo quitar') }));
    } finally {
      setGuardandoId(null);
    }
  };

  return (
    <Card variant="elevated" padding="lg">
      <h2 className="text-lg font-semibold text-menu-texto-principal">Monto por servicio</h2>
      <p className="mb-4 text-sm text-encabezados-alterno">Cantidad fija que gana cada persona que participa en el servicio y recibe comisiones. Se calcula al cobrar.</p>
      {cargando ? (
        <p className="py-6 text-center text-sm text-encabezados-alterno">Cargando…</p>
      ) : error ? (
        <div className="py-6 text-center">
          <p role="alert" className="mb-3 text-[var(--danger-texto)]">{error}</p>
          <Button variant="outline" onClick={cargar}>Reintentar</Button>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--borde-visible)]">
          {servicios.map((s) => {
            const b = borradores[s.servicioId] ?? { monto: '', activo: true };
            const cambio = !s.comision || String(s.comision.monto) !== b.monto || s.comision.activo !== b.activo;
            const ocupado = guardandoId === s.servicioId;
            return (
              <li key={s.servicioId} className="py-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div className="min-w-0 md:pb-2">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-menu-texto-principal">
                      {s.nombre}
                      {s.comision && !s.comision.activo && <Badge variant="warning" size="sm">Pausada</Badge>}
                    </p>
                    <p className="text-sm text-encabezados-alterno">Precio {fmtMoneda(s.precio)}</p>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="w-32">
                      <Input
                        label="Comisión ($)"
                        type="number"
                        min={0}
                        step={0.01}
                        inputMode="decimal"
                        value={b.monto}
                        onChange={(e) => cambiar(s.servicioId, { monto: e.target.value })}
                        placeholder="0.00"
                        fullWidth
                      />
                    </div>
                    <label className="flex min-h-11 items-center gap-2 text-sm text-menu-texto-principal">
                      <input type="checkbox" checked={b.activo} onChange={(e) => cambiar(s.servicioId, { activo: e.target.checked })} className="h-5 w-5 accent-[var(--botones-principales)]" />
                      Activa
                    </label>
                    <Button size="sm" onClick={() => guardar(s)} disabled={ocupado || !cambio || b.monto.trim() === ''} className="mb-1">
                      {ocupado ? 'Guardando…' : 'Guardar'}
                    </Button>
                    {s.comision && (
                      <Button size="sm" variant="outline" onClick={() => quitar(s)} disabled={ocupado} className="mb-1">Quitar</Button>
                    )}
                  </div>
                </div>
                {errores[s.servicioId] && <p role="alert" className="mt-2 text-sm text-[var(--danger-texto)]">{errores[s.servicioId]}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function PersonalQueRecibe() {
  const [personal, setPersonal] = useState<PersonalComisionApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);

  const pedir = useCallback(() => {
    listarPersonalComisiones()
      .then((lista) => { setPersonal(lista); setError(null); })
      .catch((e) => setError(mensaje(e, 'No se pudo cargar el personal')))
      .finally(() => setCargando(false));
  }, []);

  const cargar = () => { setCargando(true); setError(null); pedir(); };

  useEffect(() => { pedir(); }, [pedir]);

  const alternar = async (p: PersonalComisionApi) => {
    setGuardandoId(p.id);
    setError(null);
    try {
      await cambiarRecibeComisiones(p.id, !p.recibeComisiones);
      setPersonal((lista) => lista.map((x) => (x.id === p.id ? { ...x, recibeComisiones: !p.recibeComisiones } : x)));
    } catch (e) {
      setError(mensaje(e, 'No se pudo cambiar'));
    } finally {
      setGuardandoId(null);
    }
  };

  return (
    <Card variant="elevated" padding="lg">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-menu-texto-principal">
        <HandCoins size={20} aria-hidden /> Quién recibe comisiones
      </h2>
      <p className="mb-4 text-sm text-encabezados-alterno">Solo quien esté marcado gana comisión. Aplica a los cobros que se hagan desde ahora.</p>
      {error && <p role="alert" className="mb-3 text-sm text-[var(--danger-texto)]">{error}</p>}
      {cargando ? (
        <p className="py-6 text-center text-sm text-encabezados-alterno">Cargando…</p>
      ) : personal.length === 0 && error ? (
        <div className="text-center"><Button variant="outline" onClick={cargar}>Reintentar</Button></div>
      ) : (
        <ul className="divide-y divide-[var(--borde-visible)]">
          {personal.map((p) => (
            <li key={p.id}>
              <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-menu-texto-principal">{p.nombre}</span>
                  <span className="text-sm text-encabezados-alterno">{ETIQUETA_ROL[p.rol] ?? p.rol}</span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  aria-checked={p.recibeComisiones}
                  checked={p.recibeComisiones}
                  disabled={guardandoId === p.id}
                  onChange={() => alternar(p)}
                  className="h-5 w-5 shrink-0 accent-[var(--botones-principales)]"
                />
              </label>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
