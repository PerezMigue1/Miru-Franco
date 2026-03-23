'use client';

import Link from 'next/link';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';

export default function BaseDatosInsertarPage() {
  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wider opacity-80 mb-1">
            Módulo de base de datos · Insertar
          </p>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Insertar datos</h1>
          <p className="text-base opacity-80">
            Pantalla pensada como hub de accesos rápidos para crear productos, usuarios, servicios y clientes.
          </p>
        </header>

        <Card variant="elevated" padding="lg">
          <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
            En la vista principal esta sección está oculta. Aquí puedes centralizar enlaces a las pantallas de alta
            (productos, usuarios, servicios, clientes) cuando quieras activar este módulo.
          </p>
          <Button asChild variant="outline">
            <Link href="/admin/base-datos">Volver a base de datos</Link>
          </Button>
        </Card>
      </div>
    </AdminLayout>
  );
}

