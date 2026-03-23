'use client';

import Link from 'next/link';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';

export default function BaseDatosConsultarPage() {
  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wider opacity-80 mb-1">
            Módulo de base de datos · Consultar datos
          </p>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Consultar datos</h1>
          <p className="text-base opacity-80">
            Pantalla dedicada para consultar inventario, usuarios, servicios y clientes (filas expandibles).
          </p>
        </header>

        <Card variant="elevated" padding="lg">
          <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
            Aquí se trasladará la sección de “Consultar datos” con sus módulos expandibles. De momento, continúa
            disponible en la vista principal de base de datos.
          </p>
          <Button asChild variant="outline">
            <Link href="/admin/base-datos">Volver a base de datos</Link>
          </Button>
        </Card>
      </div>
    </AdminLayout>
  );
}

