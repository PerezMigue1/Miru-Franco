'use client';

import { useRouter } from 'next/navigation';
import PublicLayout from '../../components/layouts/PublicLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { colors } from '../../utils/colors';
import { getCategoryColor } from '../../utils/categoryColors';

export default function ServiciosClientePage() {
  const router = useRouter();
  
  const servicios = [
    { id: 1, nombre: 'Corte de Cabello', precio: '$350', duracion: '45 min', descripcion: 'Estilos modernos y clásicos adaptados a tu personalidad', categoria: 'Corte', imagen: '✂️' },
    { id: 2, nombre: 'Alaciado', precio: '$800', duracion: '3 horas', descripcion: 'Alaciado profesional para cabello liso y sedoso', categoria: 'Químico', imagen: '✨' },
    { id: 3, nombre: 'Nanoplastía', precio: '$1,200', duracion: '4 horas', descripcion: 'Tratamiento de nanoplastía para cabello saludable y brillante', categoria: 'Químico', imagen: '💫' },
    { id: 4, nombre: 'Depilación de Cejas', precio: '$150', duracion: '30 min', descripcion: 'Diseño y depilación profesional de cejas', categoria: 'Depilación', imagen: '👁️' },
    { id: 5, nombre: 'Coloración', precio: '$600', duracion: '2 horas', descripcion: 'Técnicas profesionales de color para tu cabello', categoria: 'Color', imagen: '🎨' },
    { id: 6, nombre: 'Tratamiento Capilar', precio: '$450', duracion: '1 hora', descripcion: 'Rejuvenecimiento y reparación profunda', categoria: 'Tratamiento', imagen: '💆‍♀️' },
  ];

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12" style={{ marginTop: '136px' }}>
        <div className="text-center mb-12">
          <h1 className="text-hero mb-4" style={{ color: colors.menuTextoPrincipal }}>
            Nuestros Servicios
          </h1>
          <p className="text-lead max-w-2xl mx-auto" style={{ color: colors.encabezadosAlterno }}>
            Descubre nuestra amplia gama de servicios profesionales para el cuidado y embellecimiento de tu cabello
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servicios.map((servicio) => (
            <Card 
              key={servicio.id} 
              variant="elevated"
              className="cursor-pointer transition-transform hover:scale-105"
              onClick={() => router.push(`/cliente/servicios/${servicio.id}`)}
            >
              <div className="text-center mb-4">
                <div className="text-6xl mb-4">{servicio.imagen}</div>
                <h3 className="text-subtitle mb-2" style={{ color: colors.textoFondoOscuro }}>
                  {servicio.nombre}
                </h3>
                <Badge variant={getCategoryColor(servicio.categoria)}>
                  {servicio.categoria}
                </Badge>
              </div>
              <p className="text-sm mb-4 text-center" style={{ color: colors.textoFondoOscuro }}>
                {servicio.descripcion}
              </p>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-2xl font-bold" style={{ color: colors.textoFondoOscuro }}>
                    {servicio.precio}
                  </p>
                  <p className="text-sm" style={{ color: colors.textoFondoOscuro }}>
                    {servicio.duracion}
                  </p>
                </div>
              </div>
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Button 
                  fullWidth 
                  variant="outline"
                  onClick={() => router.push(`/cliente/servicios/${servicio.id}`)}
                >
                  Ver Detalles
                </Button>
                <Button 
                  fullWidth
                  onClick={() => router.push(`/cliente/agendar-cita?servicio=${servicio.id}`)}
                >
                  Agendar Cita
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}

