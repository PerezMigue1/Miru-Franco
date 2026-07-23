'use client';

import { useState, useEffect, useCallback } from 'react';
import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../../components/ui/Table';
import Badge from '../../../../components/ui/Badge';
import Modal from '../../../../components/ui/Modal';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Textarea from '../../../../components/ui/Textarea';
import {
  listarMisSolicitudesPermiso,
  crearSolicitudPermiso,
  etiquetaTipoSolicitud,
  etiquetaEstadoSolicitud,
  varianteBadgeEstadoSolicitud,
  type SolicitudPermisoApi,
  type TipoSolicitudPermiso,
} from '../../../../services/solicitudesPermiso';
import { ClipboardList } from 'lucide-react';

/**
 * fechaInicio/fechaFin son fechas puras guardadas como medianoche UTC — formatear con
 * componentes UTC evita el desfase de un día que da `toLocaleDateString` con hora local.
 */
function fmtFechaSolo(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

export default function MisSolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPermisoApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formTipo, setFormTipo] = useState<TipoSolicitudPermiso>('permiso');
  const [formFechaInicio, setFormFechaInicio] = useState('');
  const [formFechaFin, setFormFechaFin] = useState('');
  const [formMotivo, setFormMotivo] = useState('');

  const cargar = useCallback(() => {
    setLoading(true);
    setError(null);
    listarMisSolicitudesPermiso()
      .then(setSolicitudes)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar tus solicitudes'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const openNueva = () => {
    setFormTipo('permiso');
    setFormFechaInicio('');
    setFormFechaFin('');
    setFormMotivo('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCrear = async () => {
    if (!formFechaInicio || !formFechaFin) { setFormError('Selecciona el rango de fechas'); return; }
    if (formFechaFin < formFechaInicio) { setFormError('La fecha de fin no puede ser anterior a la de inicio'); return; }
    if (!formMotivo.trim()) { setFormError('Ingresa el motivo'); return; }

    setSaving(true);
    setFormError(null);
    try {
      await crearSolicitudPermiso({
        tipo: formTipo,
        fechaInicio: formFechaInicio,
        fechaFin: formFechaFin,
        motivo: formMotivo.trim(),
      });
      setIsModalOpen(false);
      cargar();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'No se pudo registrar la solicitud');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OperacionLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              Mis solicitudes
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              {solicitudes.length} solicitud{solicitudes.length === 1 ? '' : 'es'} · permisos, vacaciones, faltas justificadas e incapacidades
            </p>
          </div>
          <Button onClick={openNueva}>+ Nueva solicitud</Button>
        </div>

        {error && (
          <div className="bg-red-600 border border-red-700 text-white px-4 py-3 rounded text-xs font-bold shadow-md">
            {error}
          </div>
        )}

        <Card variant="elevated" padding="lg">
          {loading ? (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>Cargando…</p>
          ) : solicitudes.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList size={28} className="mx-auto mb-2" style={{ color: 'var(--encabezados-alterno)' }} />
              <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Aún no has registrado ninguna solicitud.</p>
            </div>
          ) : (
            <Table headers={['Tipo', 'Rango de fechas', 'Motivo', 'Estado', 'Comentario']} headerSutil>
              {solicitudes.map((s) => (
                <TableRow key={s.id}>
                  <TableCell rowPadding="lg">{etiquetaTipoSolicitud(s.tipo)}</TableCell>
                  <TableCell rowPadding="lg">{fmtFechaSolo(s.fechaInicio)} – {fmtFechaSolo(s.fechaFin)}</TableCell>
                  <TableCell rowPadding="lg" className="max-w-xs truncate">
                    <span title={s.motivo}>{s.motivo}</span>
                  </TableCell>
                  <TableCell rowPadding="lg">
                    <Badge variant={varianteBadgeEstadoSolicitud(s.estado)}>{etiquetaEstadoSolicitud(s.estado)}</Badge>
                  </TableCell>
                  <TableCell rowPadding="lg">{s.comentarioResolucion || '-'}</TableCell>
                </TableRow>
              ))}
            </Table>
          )}
        </Card>
      </div>

      {/* Modal: Nueva solicitud */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { if (!saving) setIsModalOpen(false); }}
        title="Nueva solicitud"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleCrear} disabled={saving}>{saving ? 'Enviando...' : 'Enviar solicitud'}</Button>
          </>
        }
      >
        {formError && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{formError}</p>}
        <div className="space-y-4">
          <Select
            label="Tipo"
            value={formTipo}
            onChange={(e) => setFormTipo(e.target.value as TipoSolicitudPermiso)}
            options={[
              { value: 'permiso', label: 'Permiso' },
              { value: 'vacaciones', label: 'Vacaciones' },
              { value: 'falta_justificada', label: 'Falta justificada' },
              { value: 'incapacidad', label: 'Incapacidad' },
            ]}
            fullWidth
          />
          <Input label="Desde" type="date" value={formFechaInicio} onChange={(e) => setFormFechaInicio(e.target.value)} fullWidth />
          <Input label="Hasta" type="date" value={formFechaFin} onChange={(e) => setFormFechaFin(e.target.value)} fullWidth />
          <Textarea label="Motivo" value={formMotivo} onChange={(e) => setFormMotivo(e.target.value)} placeholder="Describe el motivo de tu solicitud..." rows={3} fullWidth />
        </div>
      </Modal>
    </OperacionLayout>
  );
}
