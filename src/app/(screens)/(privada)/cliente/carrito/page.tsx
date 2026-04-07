'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ModuleLayout from '../../../../components/layouts/ModuleLayout';

export default function CarritoLegacyRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/cliente/tienda-online/carrito');
  }, [router]);

  return (
    <ModuleLayout>
      <div className="w-full max-w-none py-12 text-center">
        <p className="text-lead" style={{ color: 'var(--encabezados-alterno)' }}>
          Redirigiendo al carrito de tienda online…
        </p>
      </div>
    </ModuleLayout>
  );
}
