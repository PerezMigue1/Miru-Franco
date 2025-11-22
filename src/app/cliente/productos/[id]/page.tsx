'use client';

import { useParams, useRouter } from 'next/navigation';
import PublicLayout from '../../../components/layouts/PublicLayout';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import { colors } from '../../../utils/colors';
import { getCategoryColor } from '../../../utils/categoryColors';

export default function ProductoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  // Datos de ejemplo - en producción vendría de una API
  const producto = {
    id: parseInt(id),
    nombre: 'Shampoo Avina',
    precio: '$350',
    categoria: 'Cuidado',
    descripcion: 'Limpieza profunda y cuidado intensivo para todo tipo de cabello. Formulado con ingredientes naturales que nutren y protegen tu melena.',
    stock: true,
    imagen: '🧴',
    marca: 'Avina',
    beneficios: [
      'Limpieza profunda sin resecar',
      'Nutre el cabello desde la raíz',
      'Protege contra daños térmicos',
      'Ideal para uso diario'
    ],
    modoUso: 'Aplicar sobre cabello mojado, masajear suavemente y enjuagar. Repetir si es necesario.',
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12" style={{ marginTop: '136px' }}>
        <div className="max-w-6xl mx-auto">
          <Button variant="outline" onClick={() => window.history.back()} className="mb-6">
            ← Volver
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card variant="elevated">
              <div className="text-center">
                <div className="text-9xl mb-6">{producto.imagen}</div>
                <Badge variant={getCategoryColor(producto.categoria)} size="lg">
                  {producto.categoria}
                </Badge>
              </div>
            </Card>

            <div className="space-y-6">
              <div>
                <h1 className="text-hero mb-2" style={{ color: colors.menuTextoPrincipal }}>
                  {producto.nombre}
                </h1>
                <p className="text-lead mb-4" style={{ color: colors.encabezadosAlterno }}>
                  {producto.marca}
                </p>
                <p className="text-4xl font-bold mb-6" style={{ color: colors.menuTextoPrincipal }}>
                  {producto.precio}
                </p>
              </div>

              <Card>
                <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Descripción
                </h2>
                <p className="mb-4" style={{ color: colors.encabezadosAlterno }}>
                  {producto.descripcion}
                </p>
              </Card>

              <Card>
                <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Beneficios
                </h2>
                <ul className="space-y-2">
                  {producto.beneficios.map((beneficio, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span style={{ color: colors.success }}>✓</span>
                      <span style={{ color: colors.encabezadosAlterno }}>{beneficio}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card>
                <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Modo de Uso
                </h2>
                <p style={{ color: colors.encabezadosAlterno }}>
                  {producto.modoUso}
                </p>
              </Card>

              <div className="flex gap-4">
                <Button 
                  size="lg" 
                  fullWidth 
                  disabled={!producto.stock}
                  onClick={() => {
                    if (producto.stock) {
                      alert(`Producto "${producto.nombre}" agregado al carrito`);
                      router.push('/cliente/carrito');
                    }
                  }}
                >
                  {producto.stock ? 'Agregar al Carrito' : 'No Disponible'}
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  fullWidth
                  onClick={() => router.push('/cliente/agendar-cita')}
                >
                  Agendar Cita
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

