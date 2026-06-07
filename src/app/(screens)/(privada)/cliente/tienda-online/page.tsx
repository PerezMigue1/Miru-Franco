import { getProductosSinRedirigir } from '../../../../services/productos';
import ModuleLayout from '../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../components/ui/PageHeader';
import CatalogoProductosClient from './CatalogoProductosClient';

export default async function CatalogoProductosPage() {
  const { data: productos } = await getProductosSinRedirigir();

  return (
    <ModuleLayout>
      <PageHeader
        title="Tienda en Línea"
        subtitle="Explora nuestro catálogo de productos profesionales"
      />
      <CatalogoProductosClient initialProductos={productos} />
    </ModuleLayout>
  );
}
