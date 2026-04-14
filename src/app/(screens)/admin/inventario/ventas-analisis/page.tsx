'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * La pantalla de análisis de ventas vive ahora en Predicción de inventario.
 * Esta ruta se mantiene por enlaces antiguos y redirige al mismo módulo.
 */
export default function InventarioVentasAnalisisRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/inventario/prediccion#seccion-modulo-prediccion');
  }, [router]);

  return (
    <div className="p-8 text-center text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
      Redirigiendo a predicción de inventario (sección ventas tienda)…
    </div>
  );
}
