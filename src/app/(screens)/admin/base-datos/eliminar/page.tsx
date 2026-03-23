'use client';

import Link from 'next/link';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';

export default function BaseDatosEliminarPage() {
  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wider opacity-80 mb-1">
            Módulo de base de datos · Eliminar
          </p>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Eliminar / desactivar datos</h1>
          <p className="text-base opacity-80">
            Pantalla pensada como hub para enlaces a inventario, usuarios, servicios, etc. donde se manejan bajas o
            desactivaciones.
          </p>
        </header>

        <Card variant="elevated" padding="lg">
          <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
            Igual que en la pantalla principal, este módulo está oculto a nivel de navegación. Esta ruta deja la
            estructura lista para cuando quieras activarlo.
          </p>
          <Button asChild variant="outline">
            <Link href="/admin/base-datos">Volver a base de datos</Link>
          </Button>
        </Card>
      </div>
    </AdminLayout>
  );
}

