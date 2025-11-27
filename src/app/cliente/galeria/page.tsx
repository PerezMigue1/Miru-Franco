'use client';

import { useState } from 'react';
import PublicLayout from '../../components/layouts/PublicLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { colors } from '../../utils/colors';
import { getCategoryColor } from '../../utils/categoryColors';

export default function GaleriaPage() {
  const [trabajoSeleccionado, setTrabajoSeleccionado] = useState<number | null>(null);
  
  const trabajos = [
    { id: 1, categoria: 'Corte', descripcion: 'Corte moderno y elegante' },
    { id: 2, categoria: 'Coloración', descripcion: 'Coloración profesional' },
    { id: 3, categoria: 'Alaciado', descripcion: 'Alaciado perfecto' },
    { id: 4, categoria: 'Nanoplastía', descripcion: 'Tratamiento de nanoplastía' },
    { id: 5, categoria: 'Peinado', descripcion: 'Peinado para evento especial' },
    { id: 6, categoria: 'Tratamiento', descripcion: 'Tratamiento reparador' },
    { id: 7, categoria: 'Corte', descripcion: 'Corte clásico' },
    { id: 8, categoria: 'Coloración', descripcion: 'Mechas profesionales' },
  ];

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12" style={{ marginTop: '136px' }}>
        <div className="text-center mb-12">
          <h1 className="text-hero mb-4" style={{ color: colors.menuTextoPrincipal }}>
            Galería de Trabajos
          </h1>
          <p className="text-lead max-w-2xl mx-auto" style={{ color: colors.encabezadosAlterno }}>
            Conoce algunos de nuestros trabajos realizados. Todos son trabajos reales de clientas satisfechas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {trabajos.map((trabajo) => (
            <Card 
              key={trabajo.id} 
              variant="elevated" 
              className="overflow-hidden cursor-pointer transition-transform hover:scale-105"
              onClick={() => setTrabajoSeleccionado(trabajo.id)}
            >
              <div
                className="aspect-square flex items-center justify-center"
                style={{ backgroundColor: colors.fondosSuaves }}
              >
                <p className="text-4xl">📸</p>
              </div>
              <div className="p-4">
                <div className="mb-2">
                  <Badge variant={getCategoryColor(trabajo.categoria)} size="sm">
                    {trabajo.categoria}
                  </Badge>
                </div>
                <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                  {trabajo.descripcion}
                </p>
              </div>
            </Card>
          ))}
        </div>

        {trabajoSeleccionado && (
          <Modal
            isOpen={true}
            onClose={() => setTrabajoSeleccionado(null)}
            title={trabajos.find(t => t.id === trabajoSeleccionado)?.categoria || 'Trabajo'}
          >
            <div className="text-center">
              <div
                className="aspect-square flex items-center justify-center mb-4 rounded-lg"
                style={{ backgroundColor: colors.fondosSuaves }}
              >
                <p className="text-9xl">📸</p>
              </div>
              <p className="text-lg mb-2" style={{ color: colors.menuTextoPrincipal }}>
                {trabajos.find(t => t.id === trabajoSeleccionado)?.categoria}
              </p>
              <p style={{ color: colors.encabezadosAlterno }}>
                {trabajos.find(t => t.id === trabajoSeleccionado)?.descripcion}
              </p>
            </div>
          </Modal>
        )}
      </div>
    </PublicLayout>
  );
}

