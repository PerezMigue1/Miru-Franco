'use client';

import { useState, useEffect, useCallback } from 'react';
import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import TarjetaKpi from '../../../../components/ui/TarjetaKpi';
import Table, { TableRow, TableCell } from '../../../../components/ui/Table';
import Badge from '../../../../components/ui/Badge';
import Modal from '../../../../components/ui/Modal';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Textarea from '../../../../components/ui/Textarea';
import BuscadorClienta from '../../../../components/operacion/BuscadorClienta';
import { listarSeguimientos, crearSeguimiento, actualizarSeguimiento, SeguimientoApi } from '../../../../services/seguimientos';
import { AlertTriangle, Check, ClipboardCheck, ThumbsUp } from 'lucide-react';
import { fechaCortaEnMexico, hoyEnMexico } from '../../../../utils/fechaSoloDia';
import { usePermisos } from '../../../../utils/permisos';
import { puedeCrearSeguimientos } from '../../../../utils/permisosCitas';
import { mensajeUsuarioDesdeErrorApi } from '../../../../utils/apiErrorMessage';
import { showToast } from '../../../../utils/toast';
import { puedeMarcarAtendido } from '../_lib/panelOperacion';

export default function SeguimientoPostServicioPage() {
  // Leer: todo el personal. Crear: solo con seguimientos:escritura (el becario no).
  const { tienePermiso } = usePermisos();
  const puedeEscribir = tienePermiso('seguimientos:escritura');
  const [seguimientos, setSeguimientos] = useState<SeguimientoApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Cerrar un seguimiento que requiere acción (PUT /seguimientos/:id con requiereAccion=false)
  const [atendiendoId, setAtendiendoId] = useState<number | null>(null);
  const [errorAtender, setErrorAtender] = useState<string | null>(null);

  /** Toggle de filtro: por defecto solo lo que requiere acción (cola accionable del día). */
  const [soloRequiereAccion, setSoloRequiereAccion] = useState(true);

  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fCliente, setFCliente] = useState<{ id: string; nombre: string } | null>(null);
  const [fCitaId, setFCitaId] = useState('');
  const [fNotas, setFNotas] = useState('');
  const [fFecha, setFFecha] = useState(() => hoyEnMexico());
  const [fSatisfaccion, setFSatisfaccion] = useState('');
  const [fRequiereAccion, setFRequiereAccion] = useState('false');

  const cargar = useCallback(() => {
    setLoading(true);
    setError(null);
    listarSeguimientos({ requiereAccion: soloRequiereAccion ? true : undefined, limit: 100 })
      .then(({ data }) => setSeguimientos(data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar los seguimientos'))
      .finally(() => setLoading(false));
  }, [soloRequiereAccion]);

  // La clienta se busca en el modal con BuscadorClienta, que solo abre quien puede crear seguimientos.
  useEffect(() => {
    cargar();
  }, [cargar]);

  const marcarAtendido = async (s: SeguimientoApi) => {
    setAtendiendoId(s.id);
    setErrorAtender(null);
    try {
      await actualizarSeguimiento(s.id, { requiereAccion: false });
      showToast(`Seguimiento de ${s.clienteNombre ?? 'la clienta'} marcado como atendido`, 'success');
      cargar();
    } catch (e) {
      setErrorAtender(`No se pudo marcar como atendido: ${mensajeUsuarioDesdeErrorApi(e)}`);
    } finally {
      setAtendiendoId(null);
    }
  };

  const reset = () => {
    setFCliente(null); setFCitaId(''); setFNotas(''); setFFecha(hoyEnMexico());
    setFSatisfaccion(''); setFRequiereAccion('false'); setFormError(null);
  };

  const handleCrear = async () => {
    if (!fCliente || !fNotas.trim() || !fFecha) {
      setFormError('Cliente, notas y fecha de contacto son obligatorios');
      return;
    }
    setSaving(true); setFormError(null);
    try {
      await crearSeguimiento({
        usuarioId: fCliente.id,
        citaId: fCitaId ? Number(fCitaId) : undefined,
        notas: fNotas.trim(),
        fechaContacto: new Date(`${fFecha}T09:00:00`).toISOString(),
        satisfaccion: fSatisfaccion ? Number(fSatisfaccion) : undefined,
        requiereAccion: fRequiereAccion === 'true',
      });
      setIsOpen(false); reset(); cargar();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'No se pudo registrar el seguimiento');
    } finally {
      setSaving(false);
    }
  };

  const requierenAccion = seguimientos.filter((s) => s.requiereAccion).length;
  const bienEvaluados = seguimientos.filter((s) => (s.satisfaccion ?? 0) >= 4).length;

  return (
    <OperacionLayout permisoRequerido="seguimientos:lectura">
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              Seguimiento Post-Servicio
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              Da seguimiento a la satisfacción de los clientes tras el servicio
            </p>
          </div>
          {puedeCrearSeguimientos(tienePermiso) && (
            <Button onClick={() => { reset(); setIsOpen(true); }}>+ Nuevo Seguimiento</Button>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <TarjetaKpi icono={AlertTriangle} etiqueta="Requieren acción" cargando={loading} valor={requierenAccion} tono="peligro" alerta={requierenAccion > 0} />
          <TarjetaKpi icono={ClipboardCheck} etiqueta="Total en vista" cargando={loading} valor={seguimientos.length} />
          <TarjetaKpi icono={ThumbsUp} etiqueta="Bien evaluados" cargando={loading} valor={bienEvaluados} />
        </div>

        {/* Filtro toggle */}
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={soloRequiereAccion ? 'primary' : 'outline'}
            onClick={() => setSoloRequiereAccion(true)}
          >
            Solo requiere acción
          </Button>
          <Button
            type="button"
            size="sm"
            variant={!soloRequiereAccion ? 'primary' : 'outline'}
            onClick={() => setSoloRequiereAccion(false)}
          >
            Todos
          </Button>
        </div>

        {/* Listado */}
        <Card variant="elevated" padding="lg">
          {errorAtender && <p role="alert" className="mb-4 text-sm text-[var(--danger-texto)]">{errorAtender}</p>}
          {loading ? (
            <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>Cargando seguimientos…</p>
          ) : error ? (
            <div className="text-center py-8">
              <p className="mb-3" style={{ color: 'var(--danger-texto)' }}>{error}</p>
              <Button variant="outline" onClick={cargar}>Reintentar</Button>
            </div>
          ) : seguimientos.length === 0 ? (
            <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>
              {soloRequiereAccion ? 'No hay seguimientos que requieran acción.' : 'No hay seguimientos registrados.'}
            </p>
          ) : (
            <Table headers={['Cliente', 'Fecha contacto', 'Satisfacción', '¿Requiere acción?', 'Notas', ...(puedeEscribir ? ['Acciones'] : [])]} headerSutil>
              {seguimientos.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-semibold" rowPadding="lg">{s.clienteNombre ?? 'Cliente sin nombre'}</TableCell>
                  <TableCell rowPadding="lg">{fechaCortaEnMexico(s.fechaContacto) ?? '-'}</TableCell>
                  <TableCell rowPadding="lg">{s.satisfaccion != null ? `${s.satisfaccion}/5` : '-'}</TableCell>
                  <TableCell rowPadding="lg">
                    <Badge variant={s.requiereAccion ? 'danger' : 'success'}>
                      {s.requiereAccion ? 'Sí' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs" rowPadding="lg">
                    <span className="block truncate" title={s.notas}>{s.notas}</span>
                  </TableCell>
                  {puedeEscribir && (
                    <TableCell rowPadding="lg">
                      {puedeMarcarAtendido(tienePermiso, s) ? (
                        <Button size="sm" variant="outline" onClick={() => marcarAtendido(s)} disabled={atendiendoId === s.id}>
                          <span className="inline-flex items-center gap-1.5">
                            <Check size={14} aria-hidden /> {atendiendoId === s.id ? 'Guardando…' : 'Marcar atendido'}
                          </span>
                        </Button>
                      ) : (
                        <span className="text-xs text-encabezados-alterno">-</span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </Table>
          )}
        </Card>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={() => { if (!saving) { setIsOpen(false); reset(); } }}
        title="Nuevo Seguimiento"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setIsOpen(false); reset(); }} disabled={saving}>Cancelar</Button>
            <Button onClick={handleCrear} disabled={saving}>{saving ? 'Guardando…' : 'Registrar'}</Button>
          </>
        }
      >
        {formError && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{formError}</p>}
        <div className="space-y-4">
          <BuscadorClienta seleccion={fCliente} onSeleccionar={setFCliente} label="Cliente *" />
          <Input label="Fecha de contacto *" type="date" value={fFecha} onChange={(e) => setFFecha(e.target.value)} fullWidth />
          <Input label="ID de cita (opcional)" type="number" min={1} value={fCitaId} onChange={(e) => setFCitaId(e.target.value)} placeholder="Ej. 42" fullWidth />
          <Select
            label="Satisfacción (1-5)"
            value={fSatisfaccion}
            onChange={(e) => setFSatisfaccion(e.target.value)}
            options={[
              { value: '', label: 'Sin calificar' },
              { value: '1', label: '1 - Muy insatisfecho' },
              { value: '2', label: '2' },
              { value: '3', label: '3' },
              { value: '4', label: '4' },
              { value: '5', label: '5 - Muy satisfecho' },
            ]}
            fullWidth
          />
          <Select
            label="¿Requiere acción?"
            value={fRequiereAccion}
            onChange={(e) => setFRequiereAccion(e.target.value)}
            options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Sí' }]}
            fullWidth
          />
          <Textarea label="Notas *" value={fNotas} onChange={(e) => setFNotas(e.target.value)} rows={3} fullWidth />
        </div>
      </Modal>
    </OperacionLayout>
  );
}
