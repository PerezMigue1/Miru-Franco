'use client';

import { useRouter } from 'next/navigation';
import PublicLayout from '../../components/layouts/PublicLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { colors } from '../../utils/colors';

export default function PromocionesPage() {
  const router = useRouter();
  
  const promociones = [
    { id: 1, titulo: 'Descuento de Verano', descripcion: '20% de descuento en todos los servicios', fechaFin: '2024-02-29', activa: true },
    { id: 2, titulo: 'Paquete Completo', descripcion: 'Corte + Tratamiento por solo $600', fechaFin: '2024-01-31', activa: true },
    { id: 3, titulo: 'Productos con Descuento', descripcion: '15% de descuento en productos seleccionados', fechaFin: '2024-02-15', activa: true },
  ];

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12" style={{ marginTop: '136px' }}>
        <div className="text-center mb-12">
          <h1 className="text-hero mb-4" style={{ color: colors.menuTextoPrincipal }}>
            Promociones Especiales
          </h1>
          <p className="text-lead max-w-2xl mx-auto" style={{ color: colors.encabezadosAlterno }}>
            Aprovecha nuestras promociones y ofertas especiales
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {promociones.map((promocion) => (
            <Card key={promocion.id} variant="elevated">
              {promocion.activa && (
                <div className="mb-4">
                  <Badge variant="success">Activa</Badge>
                </div>
              )}
              <h3 className="text-subtitle mb-2" style={{ color: colors.textoFondoOscuro }}>
                {promocion.titulo}
              </h3>
              <p className="text-sm mb-4" style={{ color: colors.textoFondoOscuro }}>
                {promocion.descripcion}
              </p>
              <p className="text-xs mb-4" style={{ color: colors.encabezadosAlterno }}>
                Válida hasta: {promocion.fechaFin}
              </p>
              <Button 
                fullWidth
                onClick={() => {
                  alert(`Promoción: ${promocion.titulo}\n${promocion.descripcion}\nVálida hasta: ${promocion.fechaFin}`);
                }}
              >
                Ver Detalles
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}

