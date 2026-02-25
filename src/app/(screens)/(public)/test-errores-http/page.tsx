'use client';

import { useState } from 'react';
import { apiClient } from '../../../services/client';
import { getBackendBaseUrl } from '../../../services/config';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import { colors } from '../../../utils/colors';

/**
 * Página para probar que el frontend reacciona correctamente a 400, 403 y 500 del backend.
 *
 * Requisito: el backend debe exponer rutas de prueba que devuelvan esos códigos, por ejemplo:
 *   GET /api/test/errores/400  → status 400
 *   GET /api/test/errores/403  → status 403
 *   GET /api/test/errores/500  → status 500
 *
 * Si no existen, verás error de red o 404; cuando las implementes, al pulsar cada botón
 * deberías ser redirigido a /400, /403 o /500 según corresponda.
 */
export default function TestErroresHttpPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string>('');

  const BASE = getBackendBaseUrl();

  const probar = async (codigo: 400 | 403 | 500) => {
    setMensaje('');
    setLoading(String(codigo));
    try {
      await apiClient.get<unknown>(`/api/test/errores/${codigo}`, BASE);
      setMensaje(`Inesperado: el backend respondió OK en lugar de ${codigo}.`);
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === codigo) {
        setMensaje(
          `Backend devolvió ${codigo} correctamente. Si no fuiste redirigido a /${codigo}, el cliente no está redirigiendo (403 y 500 sí redirigen).`
        );
      } else {
        setMensaje(`Error: ${err.message}. ¿El backend tiene la ruta GET /api/test/errores/${codigo}?`);
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div
      className="min-h-screen p-6 flex flex-col items-center justify-center"
      style={{ backgroundColor: colors.fondoGeneral }}
    >
      <Card className="max-w-md w-full p-6">
        <h1 className="text-xl font-semibold mb-2" style={{ color: colors.menuTextoPrincipal }}>
          Probar errores HTTP (400, 403, 500)
        </h1>
        <p className="text-sm mb-6" style={{ color: colors.encabezadosAlterno }}>
          El backend debe tener rutas de prueba que devuelvan cada código. Al pulsar cada botón se llama a{' '}
          <code className="text-xs bg-black/10 px-1 rounded">/api/test/errores/XXX</code>.
        </p>

        <div className="space-y-3">
          <Button
            fullWidth
            variant="outline"
            onClick={() => probar(400)}
            disabled={loading !== null}
          >
            {loading === '400' ? 'Llamando...' : 'Probar 400 (Bad Request)'}
          </Button>
          <Button
            fullWidth
            variant="outline"
            onClick={() => probar(403)}
            disabled={loading !== null}
          >
            {loading === '403' ? 'Llamando...' : 'Probar 403 (Forbidden)'}
          </Button>
          <Button
            fullWidth
            variant="outline"
            onClick={() => probar(500)}
            disabled={loading !== null}
          >
            {loading === '500' ? 'Llamando...' : 'Probar 500 (Server Error)'}
          </Button>
        </div>

        {mensaje && (
          <p className="mt-4 text-sm p-3 rounded" style={{ backgroundColor: colors.fondosSuaves, color: colors.menuTextoPrincipal }}>
            {mensaje}
          </p>
        )}

        <p className="mt-6 text-xs" style={{ color: colors.encabezadosAlterno }}>
          Esperado: 403 y 500 te redirigen a /403 y /500. 400 lanza error (no redirige por defecto para poder mostrar validaciones en formularios).
        </p>
      </Card>
    </div>
  );
}
