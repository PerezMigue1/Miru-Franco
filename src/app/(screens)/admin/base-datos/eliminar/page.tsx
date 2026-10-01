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
          <h1 className="mf-titulo-pagina mb-2" style={{ color: 'var(--menu-texto-principal)' }}>Eliminar / desactivar datos</h1>
          <p className="text-base" style={{ color: 'var(--encabezados-alterno)' }}>
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

