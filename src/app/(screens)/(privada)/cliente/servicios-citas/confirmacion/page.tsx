'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ModuleLayout from '../../../../../components/layouts/ModuleLayout';
import Button from '../../../../../components/ui/Button';
import Card from '../../../../../components/ui/Card';
import Badge from '../../../../../components/ui/Badge';
import { colors } from '../../../../../utils/colors';
import { getServicioPorId } from '../../../../../services/servicios';
import type { Servicio } from '../../../../../services/servicios';

function ConfirmacionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const servicioId = searchParams.get('servicioId');
  const fecha = searchParams.get('fecha');
  const hora = searchParams.get('hora');
  const especialistaNombre = searchParams.get('especialista');

  const [servicio, setServicio] = useState<Servicio | null>(null);

  useEffect(() => {
    if (!servicioId) return;
    getServicioPorId(servicioId).then(setServicio);
  }, [servicioId]);

  const cita = {
    id: 'CITA-2024-001',
    servicio: servicio?.nombre ?? 'Servicio',
    fecha: fecha ? new Date(fecha).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) : 'No especificada',
    hora: hora || 'No especificada',
    duracion: servicio?.duracion ?? '—',
    precio: servicio?.precio ?? '—',
    especialista: especialistaNombre || 'No especificado',
    estado: 'confirmada',
  };

  return (
    <ModuleLayout>
      <div className="max-w-3xl mx-auto">
        <Card className="text-center">
          <div className="mb-6">
            <div
              className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: colors.success }}
            >
              <span className="text-4xl" style={{ color: colors.textoFondoOscuro }}>
                ✓
              </span>
            </div>
            <h1
              className="text-hero mb-2"
              style={{ color: colors.menuTextoPrincipal }}
            >
              ¡Cita Confirmada!
            </h1>
            <p
              className="text-lead"
              style={{ color: colors.encabezadosAlterno }}
            >
              Tu cita ha sido agendada exitosamente
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 mb-6" style={{ backgroundColor: colors.fondosSuaves }}>
            <div className="space-y-4 text-left">
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: colors.encabezadosAlterno }}>
                  Número de Cita:
                </span>
                <span style={{ color: colors.menuTextoPrincipal }}>{cita.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: colors.encabezadosAlterno }}>
                  Servicio:
                </span>
                <span style={{ color: colors.menuTextoPrincipal }}>{cita.servicio}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: colors.encabezadosAlterno }}>
                  Fecha:
                </span>
                <span style={{ color: colors.menuTextoPrincipal }}>{cita.fecha}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: colors.encabezadosAlterno }}>
                  Hora:
                </span>
                <span style={{ color: colors.menuTextoPrincipal }}>{cita.hora}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: colors.encabezadosAlterno }}>
                  Duración:
                </span>
                <span style={{ color: colors.menuTextoPrincipal }}>{cita.duracion}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: colors.encabezadosAlterno }}>
                  Especialista:
                </span>
                <span style={{ color: colors.menuTextoPrincipal }}>{cita.especialista}</span>
              </div>
              <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: colors.tarjetasPaneles }}>
                <span className="font-semibold" style={{ color: colors.encabezadosAlterno }}>
                  Total:
                </span>
                <span
                  className="text-2xl font-bold"
                  style={{ color: colors.menuTextoPrincipal }}
                >
                  {cita.precio}
                </span>
              </div>
              <div className="flex justify-center pt-4">
                <Badge variant="success" size="lg">Confirmada</Badge>
              </div>
            </div>
          </div>

          {servicio?.productosAsociados && servicio.productosAsociados.length > 0 && (
            <div className="bg-white rounded-lg p-6 mb-6" style={{ backgroundColor: colors.fondosSuaves }}>
              <h3
                className="text-subtitle mb-3"
                style={{ color: colors.menuTextoPrincipal }}
              >
                Productos que se utilizarán en tu cita
              </h3>
              <ul className="space-y-2">
                {servicio.productosAsociados.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                        {p.productoNombre ?? 'Producto'}
                      </p>
                      <p className="text-xs" style={{ color: colors.encabezadosAlterno }}>
                        {p.productoMarca ?? p.productoCategoria ?? ''}
                      </p>
                    </div>
                    {typeof p.cantidadEstimada === 'number' && p.cantidadEstimada > 0 && (
                      <Badge variant="default">
                        {p.cantidadEstimada} u.
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-4">
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: colors.fondosSuaves }}
            >
              <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                <strong>Importante:</strong> Recibirás un correo electrónico de confirmación con todos los detalles de tu cita. 
                Te recordaremos 24 horas antes de tu cita.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                fullWidth
                onClick={() => router.push('/cliente/servicios-citas/mis-citas')}
              >
                Ver Mis Citas
              </Button>
              <Button
                variant="outline"
                fullWidth
                onClick={() => router.push('/cliente/servicios-citas')}
              >
                Agendar Otra Cita
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </ModuleLayout>
  );
}

export default function ConfirmacionCitaPage() {
  return (
    <Suspense fallback={
      <ModuleLayout>
        <div className="max-w-3xl mx-auto flex items-center justify-center min-h-[200px]">
          <p style={{ color: colors.encabezadosAlterno }}>Cargando...</p>
        </div>
      </ModuleLayout>
    }>
      <ConfirmacionContent />
    </Suspense>
  );
}









