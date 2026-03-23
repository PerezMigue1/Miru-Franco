'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import ModuleLayout from '../../../../components/layouts/ModuleLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import {
  listarNotificaciones,
  actualizarNotificacion,
  eliminarNotificacion,
  type NotificacionApi,
} from '../../../../services/ecommerce';
import { hasValidToken } from '../../../../utils/security';
import { showAlert, showToast } from '../../../../utils/toast';
import { MIRU_USER_STORAGE_UPDATED } from '../../../../utils/userStorageSync';

export default function ClienteNotificacionesPage() {
  const [items, setItems] = useState<NotificacionApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!hasValidToken()) {
      setError('Inicia sesión para ver tus notificaciones.');
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await listarNotificaciones();
      setItems(list.sort((a, b) => (b.creadoEn ?? '').localeCompare(a.creadoEn ?? '')));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    const onRefresh = () => void cargar();
    window.addEventListener(MIRU_USER_STORAGE_UPDATED, onRefresh);
    window.addEventListener('focus', onRefresh);
    return () => {
      window.removeEventListener(MIRU_USER_STORAGE_UPDATED, onRefresh);
      window.removeEventListener('focus', onRefresh);
    };
  }, [cargar]);

  const marcarLeida = async (n: NotificacionApi) => {
    try {
      await actualizarNotificacion(n.id, { leida: true });
      showToast('Marcada como leída', 'success');
      await cargar();
      window.dispatchEvent(new CustomEvent('miru-notificaciones-updated'));
    } catch (e) {
      void showAlert(e instanceof Error ? e.message : 'Error al actualizar');
    }
  };

  const borrar = async (n: NotificacionApi) => {
    try {
      await eliminarNotificacion(n.id);
      showToast('Notificación eliminada', 'info');
      await cargar();
      window.dispatchEvent(new CustomEvent('miru-notificaciones-updated'));
    } catch (e) {
      void showAlert(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  const marcarTodas = async () => {
    try {
      await Promise.all(items.filter((x) => !x.leida).map((x) => actualizarNotificacion(x.id, { leida: true })));
      showToast('Todas marcadas como leídas', 'success');
      await cargar();
      window.dispatchEvent(new CustomEvent('miru-notificaciones-updated'));
    } catch (e) {
      void showAlert(e instanceof Error ? e.message : 'Error');
    }
  };

  return (
    <ModuleLayout>
      <div className="max-w-3xl mx-auto py-4">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-hero mb-1" style={{ color: 'var(--menu-texto-principal)' }}>
              Notificaciones
            </h1>
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
              Avisos del sistema sobre pedidos y tu cuenta
            </p>
          </div>
          {items.some((x) => !x.leida) && (
            <Button size="sm" variant="outline" onClick={() => void marcarTodas()}>
              Marcar todas leídas
            </Button>
          )}
        </div>

        {error && (
          <Card className="mb-4 p-4" style={{ borderColor: 'var(--danger)' }}>
            <p className="mb-2" style={{ color: 'var(--danger)' }}>{error}</p>
            {!hasValidToken() && (
              <Link href="/login" className="text-sm font-semibold underline" style={{ color: 'var(--botones-principales)' }}>
                Iniciar sesión
              </Link>
            )}
          </Card>
        )}

        {loading ? (
          <Card className="p-8 text-center">
            <p style={{ color: 'var(--encabezados-alterno)' }}>Cargando…</p>
          </Card>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center">
            <p style={{ color: 'var(--encabezados-alterno)' }}>No tienes notificaciones.</p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {items.map((n) => (
              <li key={n.id}>
                <Card
                  className={`p-4 ${!n.leida ? 'border-2' : ''}`}
                  style={!n.leida ? { borderColor: 'var(--botones-principales)' } : undefined}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="info" size="sm">
                        {n.tipo}
                      </Badge>
                      {!n.leida && (
                        <Badge variant="warning" size="sm">
                          Nueva
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                      {n.creadoEn ? new Date(n.creadoEn).toLocaleString('es-MX') : ''}
                    </span>
                  </div>
                  <h2 className="font-semibold mb-1" style={{ color: 'var(--menu-texto-principal)' }}>
                    {n.titulo}
                  </h2>
                  <p className="text-sm whitespace-pre-wrap mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
                    {n.mensaje}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {!n.leida && (
                      <Button size="sm" variant="outline" onClick={() => void marcarLeida(n)}>
                        Marcar leída
                      </Button>
                    )}
                    <Button size="sm" variant="danger" onClick={() => void borrar(n)}>
                      Eliminar
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ModuleLayout>
  );
}
