'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import TarjetaKpi from '../../../components/ui/TarjetaKpi';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Textarea from '../../../components/ui/Textarea';
import {
  listarNotificaciones,
  crearNotificacion,
  actualizarNotificacion,
  eliminarNotificacion,
  type NotificacionApi,
} from '../../../services/ecommerce';
import { getUsuarios, type Usuario } from '../../../services/usuarios';
import { showAlert, showToast } from '../../../utils/toast';
import { Bell, BellOff, CheckCheck } from 'lucide-react';

export default function NotificacionesPage() {
  const [items, setItems] = useState<NotificacionApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tipo, setTipo] = useState('info');
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [formMetadata, setFormMetadata] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [todosUsuarios, setTodosUsuarios] = useState<Usuario[]>([]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listarNotificaciones();
      setItems(list.sort((a, b) => (b.creadoEn ?? '').localeCompare(a.creadoEn ?? '')));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
    getUsuarios().then(setTodosUsuarios).catch(() => {});
  }, [cargar]);

  const crear = async () => {
    if (!usuarioId.trim()) {
      void showAlert('Indica el ID de usuario destinatario (UUID del usuario en la BD).');
      return;
    }
    if (!titulo.trim() || !mensaje.trim()) {
      void showAlert('Título y mensaje son obligatorios.');
      return;
    }
    setEnviando(true);
    try {
      let metadataObj: Record<string, unknown> | undefined;
      if (formMetadata.trim()) {
        try { metadataObj = JSON.parse(formMetadata.trim()); } catch { metadataObj = undefined; }
      }
      await crearNotificacion({
        tipo,
        titulo: titulo.trim(),
        mensaje: mensaje.trim(),
        usuarioId: usuarioId.trim(),
        ...(metadataObj ? { metadata: metadataObj } : {}),
      } as Parameters<typeof crearNotificacion>[0]);
      showToast('Notificación creada', 'success');
      setTitulo('');
      setMensaje('');
      setUsuarioId('');
      setFormMetadata('');
      await cargar();
    } catch (e) {
      void showAlert(e instanceof Error ? e.message : 'No se pudo crear (¿permisos admin?)');
    } finally {
      setEnviando(false);
    }
  };

  const marcarLeida = async (n: NotificacionApi) => {
    try {
      await actualizarNotificacion(n.id, { leida: true });
      await cargar();
    } catch (e) {
      void showAlert(e instanceof Error ? e.message : 'Error');
    }
  };

  const borrar = async (n: NotificacionApi) => {
    try {
      await eliminarNotificacion(n.id);
      showToast('Eliminada', 'info');
      await cargar();
    } catch (e) {
      void showAlert(e instanceof Error ? e.message : 'Error');
    }
  };

  const noLeidas = items.filter((n) => !n.leida).length;
  const leidas = items.length - noLeidas;

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div>
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
            Notificaciones
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
            {items.length} notificación{items.length === 1 ? '' : 'es'} en el sistema
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <TarjetaKpi icono={Bell} etiqueta="Total" valor={items.length} />

          <TarjetaKpi
            icono={BellOff}
            etiqueta="No leídas"
            valor={noLeidas}
            tono={noLeidas > 0 ? 'aviso' : 'normal'}
            alerta={noLeidas > 0}
          />

          <TarjetaKpi icono={CheckCheck} etiqueta="Leídas" valor={leidas} />
        </div>

        {error && (
          <Card
            padding="md"
            role="alert"
            style={{ backgroundColor: 'color-mix(in srgb, var(--danger-texto) 10%, var(--tarjetas-paneles))', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--danger-texto) 35%, transparent)' }}
          >
            <p className="text-sm" style={{ color: 'var(--danger-texto)' }}>{error}</p>
          </Card>
        )}

        {/* Listado */}
        <Card variant="elevated" padding="lg">
        {loading ? (
          <p className="p-6 text-center" style={{ color: 'var(--encabezados-alterno)' }}>
            Cargando…
          </p>
        ) : (
          <Table headers={['Tipo', 'Usuario', 'Título', 'Estado', 'Fecha', 'Acciones']} headerSutil>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>
                  Sin notificaciones en la respuesta del servidor.
                </TableCell>
              </TableRow>
            ) : (
              items.map((n) => (
                <TableRow key={n.id}>
                  <TableCell rowPadding="lg">
                    <Badge variant="info" size="sm">
                      {n.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono max-w-[120px] truncate" rowPadding="lg">
                    <span title={n.usuarioId}>{n.usuarioId || '—'}</span>
                  </TableCell>
                  <TableCell className="max-w-xs" rowPadding="lg">
                    <span className="font-semibold block truncate" title={n.titulo}>
                      {n.titulo}
                    </span>
                    <span className="text-xs line-clamp-2" style={{ color: 'var(--encabezados-alterno)' }}>
                      {n.mensaje}
                    </span>
                  </TableCell>
                  <TableCell rowPadding="lg">
                    <Badge variant={n.leida ? 'success' : 'warning'} size="sm">
                      {n.leida ? 'Leída' : 'Nueva'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap" rowPadding="lg">
                    {n.creadoEn ? new Date(n.creadoEn).toLocaleString('es-MX') : '—'}
                  </TableCell>
                  <TableCell rowPadding="lg">
                    <div className="flex flex-wrap gap-1">
                      {!n.leida && (
                        <Button size="sm" variant="outline" onClick={() => void marcarLeida(n)}>
                          Leída
                        </Button>
                      )}
                      <Button size="sm" variant="danger" onClick={() => void borrar(n)}>
                        Eliminar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </Table>
        )}
        </Card>

        <Card variant="elevated" padding="lg">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
          Nueva notificación
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Destinatario *"
            value={usuarioId}
            onChange={(e) => setUsuarioId(e.target.value)}
            options={[
              { value: '', label: 'Seleccionar usuario...' },
              ...todosUsuarios.map((u) => ({ value: u.id, label: `${u.nombre} (${u.email})` })),
            ]}
            fullWidth
          />
          <Select
            label="Tipo *"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            options={[
              { value: 'info', label: 'Info' },
              { value: 'alerta', label: 'Alerta' },
              { value: 'promocion', label: 'Promoción' },
              { value: 'recordatorio', label: 'Recordatorio' },
              { value: 'sistema', label: 'Sistema' },
            ]}
            fullWidth
          />
          <div className="md:col-span-2">
            <Input label="Título *" value={titulo} onChange={(e) => setTitulo(e.target.value)} fullWidth />
          </div>
          <div className="md:col-span-2">
            <Textarea label="Mensaje *" value={mensaje} onChange={(e) => setMensaje(e.target.value)} rows={4} fullWidth />
          </div>
          <div className="md:col-span-2">
            <Textarea label="Metadata JSON (opcional)" value={formMetadata} onChange={(e) => setFormMetadata(e.target.value)} placeholder={'{"clave": "valor"}'} rows={2} fullWidth />
          </div>
          <div className="md:col-span-2">
            <Button fullWidth onClick={() => void crear()} disabled={enviando}>
              {enviando ? 'Enviando…' : 'Crear notificación'}
            </Button>
          </div>
        </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
