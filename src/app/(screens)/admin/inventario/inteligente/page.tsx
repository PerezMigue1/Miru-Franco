'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../../components/layouts/AdminLayout';

/** Ruta histórica: redirige al módulo de predicción de inventario. */
export default function InventarioInteligenteRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/inventario/prediccion#seccion-modulo-prediccion');
  }, [router]);
  return (
    <AdminLayout>
      <div className="p-6 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
        Redirigiendo a predicción de inventario…
      </div>
    </AdminLayout>
  );
}
