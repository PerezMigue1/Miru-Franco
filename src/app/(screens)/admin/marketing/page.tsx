'use client';

import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';
import Select from '../../../components/ui/Select';

export default function MarketingPage() {
  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              Marketing y Atracción de Clientes
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              Gestiona contenido visual, promociones y estrategias de marketing
            </p>
          </div>
          <Button>+ Nueva Publicación</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
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

        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
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

        <Card variant="elevated" padding="lg">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
          Galería de Trabajos
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
            <div
              key={item}
              className="aspect-square rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--fondos-suaves)' }}
            >
              <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                Imagen {item}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Button>+ Subir Más Trabajos</Button>
        </div>
        </Card>
      </div>
    </AdminLayout>
  );
}

