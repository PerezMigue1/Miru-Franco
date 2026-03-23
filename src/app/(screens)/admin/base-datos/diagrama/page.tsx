'use client';

import Link from 'next/link';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';

export default function BaseDatosDiagramaPage() {
  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wider opacity-80 mb-1">
            Módulo de base de datos · Diagrama ER
          </p>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Diagrama entidad–relación</h1>
          <p className="text-base opacity-80">
            Pantalla dedicada para generar, previsualizar y descargar el diagrama ER del esquema de la base de datos.
          </p>
        </header>

        <Card variant="elevated" padding="lg">
          <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
            Aquí se moverá la sección de diagrama ER (vista previa Mermaid/SVG/PNG, descarga y navegación hacia
            “Consultar datos”). Por ahora, sigue funcionando desde la pantalla principal de base de datos.
          </p>
          <Button asChild variant="outline">
            <Link href="/admin/base-datos">Volver a base de datos</Link>
          </Button>
        </Card>
      </div>
    </AdminLayout>
  );
}

