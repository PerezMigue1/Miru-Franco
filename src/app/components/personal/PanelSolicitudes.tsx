'use client';

import { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import Textarea from '../ui/Textarea';
import {
  listarSolicitudesPermiso,
  resolverSolicitudPermiso,
  etiquetaTipoSolicitud,
  etiquetaEstadoSolicitud,
  varianteBadgeEstadoSolicitud,
  type SolicitudPermisoApi,
} from '../../services/solicitudesPermiso';
import { mensajeDeError } from '../../utils/errorRed';

/**
 * fechaInicio/fechaFin son fechas puras (sin hora) guardadas como medianoche UTC.
 * Formatear con componentes UTC evita el desfase de un día que da `toLocaleDateString`
 * con la hora local cuando el usuario está detrás de UTC.
 */
function fmtFechaSolo(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

/**
 * Aprobar/rechazar solicitudes de permiso del equipo. Autocontenido: hace su propio
 * fetch y maneja su propio estado — se usa igual en admin/gestion-personal y en
 * operacion/gestion-equipo, sin duplicar lógica entre las dos pantallas.
 */
export default function PanelSolicitudes() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPermisoApi[]>([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(true);
  const [resolverModal, setResolverModal] = useState<{ id: number; estado: 'aprobada' | 'rechazada' } | null>(null);
  const [comentarioResolucion, setComentarioResolucion] = useState('');
  const [resolviendo, setResolviendo] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [errorResolver, setErrorResolver] = useState<string | null>(null);

  const cargarSolicitudes = async () => {
    setLoadingSolicitudes(true);
    setErrorCarga(null);
    try {
      const data = await listarSolicitudesPermiso();
      setSolicitudes(data);
    } catch (e) {
      setSolicitudes([]);
      setErrorCarga(mensajeDeError(e, 'No se pudieron cargar las solicitudes.'));
    } finally {
      setLoadingSolicitudes(false);
    }
  };

  useEffect(() => { cargarSolicitudes(); }, []);

  const abrirResolver = (id: number, estado: 'aprobada' | 'rechazada') => {
    setResolverModal({ id, estado });
    setComentarioResolucion('');
    setErrorResolver(null);
  };

  const confirmarResolver = async () => {
    if (!resolverModal) return;
    setResolviendo(true);
    setErrorResolver(null);
    try {
      await resolverSolicitudPermiso(resolverModal.id, {
        estado: resolverModal.estado,
        comentarioResolucion: comentarioResolucion.trim() || undefined,
      });
      setResolverModal(null);
      await cargarSolicitudes();
    } catch (e) {
      // El modal se queda abierto para reintentar, con el motivo a la vista.
      setErrorResolver(mensajeDeError(e, 'No se pudo guardar la resolución. Intenta de nuevo.'));
    } finally {
      setResolviendo(false);
    }
  };

  return (
    <>
      <Card variant="elevated" padding="lg">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
          Solicitudes de permisos
        </h2>
        <div className="space-y-3 max-h-[420px] overflow-y-auto">
          {loadingSolicitudes ? (
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>Cargando solicitudes…</p>
          ) : errorCarga ? (
            <p role="alert" className="text-sm" style={{ color: 'var(--danger-texto)' }}>{errorCarga}</p>
          ) : solicitudes.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>No hay solicitudes registradas.</p>
          ) : (
            solicitudes.map((s) => (
              <div key={s.id} className="p-4 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                    {s.usuarioNombre || 'Empleado'}: {etiquetaTipoSolicitud(s.tipo)}
                  </p>
                  <Badge variant={varianteBadgeEstadoSolicitud(s.estado)}>{etiquetaEstadoSolicitud(s.estado)}</Badge>
                </div>
                <p className="text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                  {fmtFechaSolo(s.fechaInicio)} – {fmtFechaSolo(s.fechaFin)}
                </p>
                <p className="text-sm mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                  {s.motivo}
                </p>
                {s.estado !== 'pendiente' ? (
                  <p className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                    Resuelto por {s.resueltoPorNombre || 'Sin dato'}
                    {s.comentarioResolucion ? `: "${s.comentarioResolucion}"` : ''}
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => abrirResolver(s.id, 'aprobada')}>Aprobar</Button>
                    <Button size="sm" variant="outline" onClick={() => abrirResolver(s.id, 'rechazada')}>Rechazar</Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Modal: Resolver solicitud de permiso */}
      <Modal
        isOpen={resolverModal !== null}
        onClose={() => { if (!resolviendo) setResolverModal(null); }}
        title={resolverModal?.estado === 'aprobada' ? 'Aprobar solicitud' : 'Rechazar solicitud'}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setResolverModal(null)} disabled={resolviendo}>Cancelar</Button>
            <Button
              variant={resolverModal?.estado === 'rechazada' ? 'danger' : 'primary'}
              onClick={confirmarResolver}
              disabled={resolviendo}
            >
              {resolviendo ? 'Guardando...' : resolverModal?.estado === 'aprobada' ? 'Aprobar' : 'Rechazar'}
            </Button>
          </>
        }
      >
        {errorResolver && (
          <p role="alert" className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{errorResolver}</p>
        )}
        <Textarea
          label="Comentario (opcional)"
          value={comentarioResolucion}
          onChange={(e) => setComentarioResolucion(e.target.value)}
          placeholder="Motivo o nota para el empleado..."
          rows={3}
          fullWidth
        />
      </Modal>
    </>
  );
}
