'use client';

import Link from 'next/link';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';

export default function BaseDatosExportarPage() {
  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wider opacity-80 mb-1">
            Módulo de base de datos · Exportar
          </p>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Exportar datos</h1>
          <p className="text-base opacity-80">
            Pantalla dedicada para exportar datos por conexión directa a la base de datos y por backend.
          </p>
        </header>

        <Card variant="elevated" padding="lg">
          <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
            Esta página está preparada para alojar la sección de exportación completa
            (conexión directa, export con opciones, historial, etc.). De momento, la
            funcionalidad sigue disponible en la pantalla principal de base de datos.
          </p>
          <Button asChild variant="outline">
            <Link href="/admin/base-datos">Volver a base de datos</Link>
          </Button>
        </Card>
      </div>
    </AdminLayout>
  );
}

