'use client';

import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';
import Select from '../../../components/ui/Select';
import { colors } from '../../../utils/colors';

export default function MarketingPage() {
  return (
    <AdminLayout>
      <PageHeader
        title="Marketing y Atracción de Clientes"
        subtitle="Gestiona contenido visual, promociones y estrategias de marketing"
        actions={
          <Button>+ Nueva Publicación</Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
            Programar Publicación
          </h2>
          <div className="space-y-4">
            <Select
              label="Red Social"
              options={[
                { value: 'facebook', label: 'Facebook' },
                { value: 'instagram', label: 'Instagram' },
                { value: 'ambas', label: 'Facebook e Instagram' },
              ]}
              fullWidth
            />
            <Input label="Fecha de Publicación" type="datetime-local" fullWidth />
            <Input label="Título" placeholder="Título de la publicación" fullWidth />
            <Textarea label="Descripción" placeholder="Texto de la publicación..." rows={4} fullWidth />
            <Input label="Imágenes/Videos" type="file" accept="image/*,video/*" multiple fullWidth />
            <Button fullWidth>Programar</Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
            Crear Promoción
          </h2>
          <div className="space-y-4">
            <Input label="Nombre de la Promoción" placeholder="Ej: Descuento de Verano" fullWidth />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Fecha de Inicio" type="date" fullWidth />
              <Input label="Fecha de Fin" type="date" fullWidth />
            </div>
            <Input label="Descuento (%)" type="number" placeholder="10" fullWidth />
            <Select
              label="Aplicable a"
              options={[
                { value: 'servicios', label: 'Servicios' },
                { value: 'productos', label: 'Productos' },
                { value: 'ambos', label: 'Servicios y Productos' },
              ]}
              fullWidth
            />
            <Textarea label="Descripción" placeholder="Detalles de la promoción..." rows={3} fullWidth />
            <Button fullWidth>Crear Promoción</Button>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
          Galería de Trabajos
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
            <div
              key={item}
              className="aspect-square rounded-lg flex items-center justify-center"
              style={{ backgroundColor: colors.fondosSuaves }}
            >
              <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                Imagen {item}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Button>+ Subir Más Trabajos</Button>
        </div>
      </Card>
    </AdminLayout>
  );
}

