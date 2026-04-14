'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../../components/layouts/AdminLayout';

/** Ruta histórica: todo el análisis vive en `/admin/inventario/prediccion` (pestaña Categorías y rotación). */
export default function InventarioInteligenteRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/inventario/prediccion#prediccion-categorias');
  }, [router]);
  return (
    <AdminLayout>
      <div className="p-6 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
        Redirigiendo a predicción de inventario…
      </div>
    </AdminLayout>
  );
}
