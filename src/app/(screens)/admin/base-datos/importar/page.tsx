'use client';

import Link from 'next/link';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';

export default function BaseDatosImportarPage() {
  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wider opacity-80 mb-1">
            Módulo de base de datos · Importar
          </p>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Importar datos</h1>
          <p className="text-base opacity-80">
            Pantalla preparada para la importación desde CSV/JSON. Actualmente la funcionalidad está desactivada en la
            interfaz principal.
          </p>
        </header>

        <Card variant="elevated" padding="lg">
          <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
            La sección de importar datos está oculta en la página principal de base de datos. Esta ruta deja preparada
            una pantalla independiente para cuando decidas reactivarla.
          </p>
          <Button asChild variant="outline">
            <Link href="/admin/base-datos">Volver a base de datos</Link>
          </Button>
        </Card>
      </div>
    </AdminLayout>
  );
}

