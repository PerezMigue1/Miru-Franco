'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCw, UserPlus } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import BuscadorClienta from './BuscadorClienta';
import { crearCitaSinCita, especialistasLibres, type CitaApi, type PersonaPersonal } from '../../services/citas';
import { getServicios, type Servicio } from '../../services/servicios';
import { FORM_TURNO_VACIO, payloadTurnoSinCita, validarTurnoSinCita, type FormTurnoSinCita } from '../../utils/turnoSinCita';
import { showToast } from '../../utils/toast';
import { usePermisos } from '../../utils/permisos';

interface RegistrarSinCitaProps {
  titulo: string;
  descripcion: string;
  textoBoton: string;
  /** true: el servicio empieza ya (queda en curso); false: entra a la lista de espera. */
  iniciarAhora: boolean;
  onCreado: (cita: CitaApi) => void;
}

/**
 * Registro de alguien que llega sin cita (POST /api/citas/sin-cita). Lo comparten la cola de atención
 * (entra a la lista de espera) y la ejecución de servicios (empieza en ese momento).
 */
export default function RegistrarSinCita({ titulo, descripcion, textoBoton, iniciarAhora, onCreado }: RegistrarSinCitaProps) {
  // Buscar clientas registradas exige clientes:lectura (GET /api/clientes); sin él solo se registra sin cuenta.
  const puedeBuscarClienta = usePermisos().tienePermiso('clientes:lectura');
  const [form, setForm] = useState<FormTurnoSinCita>(FORM_TURNO_VACIO);
  /** Solo cuenta la respuesta de la última consulta de libres (si cambian de servicio rápido). */
  const consultaLibres = useRef(0);
  const [clienta, setClienta] = useState<{ id: string; nombre: string } | null>(null);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [errorCatalogo, setErrorCatalogo] = useState<string | null>(null);
  const [libres, setLibres] = useState<PersonaPersonal[]>([]);
  const [cargandoLibres, setCargandoLibres] = useState(false);
  const [errorLibres, setErrorLibres] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getServicios().then(({ data, error: e }) => {
      setServicios(data.filter((s) => s.activo !== false));
      setErrorCatalogo(e && data.length === 0 ? 'No se pudo cargar el catálogo de servicios' : null);
    });
  }, []);

  const cambiar = (cambios: Partial<FormTurnoSinCita>) => setForm((f) => ({ ...f, ...cambios }));

  const cargarLibres = (servicioId: string) => {
    setLibres([]);
    setErrorLibres(null);
    if (!servicioId) { consultaLibres.current++; setCargandoLibres(false); return; }
    setCargandoLibres(true);
    const consulta = ++consultaLibres.current;
    const vigente = () => consulta === consultaLibres.current;
    especialistasLibres(Number(servicioId))
      .then((lista) => {
        if (!vigente()) return;
        setLibres(lista);
        // Si quien estaba elegida ya no está libre, se limpia la elección.
        setForm((f) => (lista.some((p) => p.id === f.especialistaId) ? f : { ...f, especialistaId: lista.length === 1 ? lista[0].id : '' }));
      })
      .catch((e) => { if (vigente()) setErrorLibres(e instanceof Error ? e.message : 'No se pudo consultar quién está libre'); })
      .finally(() => { if (vigente()) setCargandoLibres(false); });
  };

  const elegirServicio = (servicioId: string) => {
    cambiar({ servicioId, especialistaId: '' });
    cargarLibres(servicioId);
  };

  const registrar = async () => {
    const f = { ...form, clienteId: clienta?.id ?? '' };
    const problema = validarTurnoSinCita(f);
    if (problema) { setError(problema); return; }
    setGuardando(true);
    setError(null);
    try {
      const cita = await crearCitaSinCita(payloadTurnoSinCita(f, iniciarAhora));
      const nombre = f.modo === 'registrada' ? clienta?.nombre : f.nombre.trim();
      showToast(iniciarAhora ? `Servicio de ${nombre} iniciado` : `${nombre} quedó en la lista de espera`, 'success');
      setForm({ ...FORM_TURNO_VACIO, modo: f.modo });
      setClienta(null);
      setLibres([]);
      onCreado(cita);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar');
      // Alguien pudo ocuparse mientras tanto: se refresca la lista de libres.
      cargarLibres(f.servicioId);
    } finally {
      setGuardando(false);
    }
  };

  const opcionesEspecialista = !form.servicioId
    ? [{ value: '', label: 'Elige primero el servicio' }]
    : cargandoLibres
      ? [{ value: '', label: 'Consultando quién está libre…' }]
      : libres.length === 0
        ? [{ value: '', label: 'Nadie libre ahora para este servicio' }]
        : [{ value: '', label: 'Seleccionar…' }, ...libres.map((p) => ({ value: p.id, label: p.nombre }))];

  return (
    <Card variant="elevated" padding="lg">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fondos-suaves text-menu-texto-principal" aria-hidden>
          <UserPlus size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-menu-texto-principal">{titulo}</h2>
          <p className="text-sm text-encabezados-alterno">{descripcion}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Tipo de persona">
        <Button size="sm" variant={form.modo === 'invitada' ? 'primary' : 'outline'} aria-pressed={form.modo === 'invitada'} onClick={() => { cambiar({ modo: 'invitada' }); setError(null); }}>
          Sin cuenta
        </Button>
        {puedeBuscarClienta && (
          <Button size="sm" variant={form.modo === 'registrada' ? 'primary' : 'outline'} aria-pressed={form.modo === 'registrada'} onClick={() => { cambiar({ modo: 'registrada' }); setError(null); }}>
            Clienta registrada
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {form.modo === 'invitada' ? (
          <>
            <Input label="Nombre *" value={form.nombre} maxLength={120} onChange={(e) => cambiar({ nombre: e.target.value })} placeholder="Nombre y apellido" autoComplete="off" fullWidth />
            <Input label="Teléfono (opcional)" type="tel" inputMode="tel" value={form.telefono} maxLength={20} onChange={(e) => cambiar({ telefono: e.target.value })} placeholder="771 123 4567" autoComplete="off" fullWidth />
          </>
        ) : (
          <div className="md:col-span-2">
            <BuscadorClienta seleccion={clienta} onSeleccionar={setClienta} label="Clienta registrada *" />
          </div>
        )}
        <Select
          label="Servicio *"
          value={form.servicioId}
          onChange={(e) => elegirServicio(e.target.value)}
          error={errorCatalogo ?? undefined}
          options={[{ value: '', label: 'Seleccionar servicio…' }, ...servicios.map((s) => ({ value: String(s.id), label: s.duracionMinutos ? `${s.nombre} (${s.duracionMinutos} min)` : s.nombre }))]}
          fullWidth
        />
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Select
              label="Quién la atiende *"
              value={form.especialistaId}
              onChange={(e) => cambiar({ especialistaId: e.target.value })}
              disabled={!form.servicioId || cargandoLibres || libres.length === 0}
              error={errorLibres ?? undefined}
              helperText={form.servicioId && !cargandoLibres && libres.length === 0 && !errorLibres ? 'Prueba con otro servicio o actualiza cuando alguien termine.' : undefined}
              options={opcionesEspecialista}
              fullWidth
            />
          </div>
          {form.servicioId && (
            <Button size="sm" variant="outline" onClick={() => cargarLibres(form.servicioId)} disabled={cargandoLibres} aria-label="Actualizar quién está libre" className="mb-[2px]">
              <RefreshCw size={16} aria-hidden className={cargandoLibres ? 'animate-spin' : undefined} />
            </Button>
          )}
        </div>
      </div>

      {error && <p role="alert" className="mt-4 text-sm font-medium text-[var(--danger-texto)]">{error}</p>}
      <div className="mt-5">
        <Button onClick={registrar} disabled={guardando} className="w-full sm:w-auto">
          {guardando ? 'Registrando…' : textoBoton}
        </Button>
      </div>
    </Card>
  );
}
