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
          <h1 className="mf-titulo-pagina mb-2" style={{ color: 'var(--menu-texto-principal)' }}>Insertar datos</h1>
          <p className="text-base" style={{ color: 'var(--encabezados-alterno)' }}>
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

