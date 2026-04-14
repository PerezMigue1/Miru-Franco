'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * El detalle por producto se integró en Predicción de inventario (misma pantalla, sección ventas).
 */
export default function InventarioProductoAnalisisRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id != null ? String(params.id) : '';

  useEffect(() => {
    if (!id) return;
    router.replace(`/admin/inventario/prediccion?producto=${encodeURIComponent(id)}&ventas=1`);
  }, [id, router]);

  return (
    <div className="p-8 text-center text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
      Redirigiendo a predicción de inventario (producto seleccionado)…
    </div>
  );
}
