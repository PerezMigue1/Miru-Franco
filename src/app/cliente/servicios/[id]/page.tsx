'use client';

import { useParams, useRouter } from 'next/navigation';
import PublicLayout from '../../../components/layouts/PublicLayout';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import { colors } from '../../../utils/colors';
import { getCategoryColor } from '../../../utils/categoryColors';

export default function ServicioDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  // Datos de ejemplo
  const servicio = {
    id: parseInt(id),
    nombre: 'Corte de Cabello',
    precio: '$350',
    duracion: '45 min',
    categoria: 'Corte',
    descripcion: 'Estilos modernos y clásicos adaptados a tu personalidad. Nuestros estilistas profesionales te ayudarán a encontrar el look perfecto.',
    imagen: '✂️',
    incluye: [
      'Consulta de estilo personalizado',
      'Corte profesional',
      'Lavado y secado',
      'Peinado final',
      'Recomendaciones de cuidado'
    ],
    requiereEvaluacion: false,
    especialistas: ['Mildred Franco', 'Auxiliar'],
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
                <div className="text-9xl mb-6">{servicio.imagen}</div>
                <Badge variant={getCategoryColor(servicio.categoria)} size="lg">
                  {servicio.categoria}
                </Badge>
              </div>
            </Card>

            <div className="space-y-6">
              <div>
                <h1 className="text-hero mb-2" style={{ color: colors.menuTextoPrincipal }}>
                  {servicio.nombre}
                </h1>
                <div className="flex items-center gap-4 mb-6">
                  <p className="text-4xl font-bold" style={{ color: colors.menuTextoPrincipal }}>
                    {servicio.precio}
                  </p>
                  <p className="text-lg" style={{ color: colors.encabezadosAlterno }}>
                    {servicio.duracion}
                  </p>
                </div>
              </div>

              <Card>
                <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Descripción
                </h2>
                <p style={{ color: colors.encabezadosAlterno }}>
                  {servicio.descripcion}
                </p>
              </Card>

              <Card>
                <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  El Servicio Incluye
                </h2>
                <ul className="space-y-2">
                  {servicio.incluye.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span style={{ color: colors.success }}>✓</span>
                      <span style={{ color: colors.encabezadosAlterno }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card>
                <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Especialistas Disponibles
                </h2>
                <div className="space-y-2">
                  {servicio.especialistas.map((especialista, index) => (
                    <div key={index} className="p-3 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                      <p className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                        {especialista}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              {servicio.requiereEvaluacion && (
                <Card>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <p className="text-sm font-semibold mb-2" style={{ color: colors.menuTextoPrincipal }}>
                      ⚠️ Requiere Evaluación Previa
                    </p>
                    <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                      Este servicio requiere una evaluación previa del cabello antes de realizarse.
                    </p>
                  </div>
                </Card>
              )}

              <div className="flex gap-4">
                <Button 
                  size="lg" 
                  fullWidth
                  onClick={() => router.push(`/cliente/agendar-cita?servicio=${id}`)}
                >
                  Agendar Cita
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  fullWidth
                  onClick={() => router.push('/cliente/galeria')}
                >
                  Ver Galería
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

