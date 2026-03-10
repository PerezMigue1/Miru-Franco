'use client';

import Link from 'next/link';
import OperacionLayout from '../../../components/layouts/OperacionLayout';
import Card from '../../../components/ui/Card';

const ACCESOS: { label: string; href: string; icon: string; description: string }[] = [
  { label: 'Ejecución de servicios', href: '/operacion/ejecucion-servicios', icon: '✂️', description: 'Servicios en curso y registro' },
  { label: 'Atención sin cita', href: '/operacion/atencion-sin-cita', icon: '⏱️', description: 'Lista de espera y turnos' },
  { label: 'Agenda / Calendario', href: '/operacion/agenda-calendario', icon: '🗓️', description: 'Citas y disponibilidad' },
  { label: 'Gestión de citas', href: '/operacion/gestion-citas', icon: '📅', description: 'Agendar y modificar citas' },
  { label: 'Seguimiento post-servicio', href: '/operacion/seguimiento-post-servicio', icon: '📋', description: 'Seguimiento a clientas' },
  { label: 'Subir imágenes', href: '/operacion/subir-imagenes', icon: '🖼️', description: 'Fotos para productos o servicios' },
];

export default function OperacionPage() {
  return (
    <OperacionLayout>
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
            Operación
          </p>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
            Panel de operación
          </h1>
          <p className="text-base" style={{ color: 'var(--encabezados-alterno)' }}>
            Accede a ejecución de servicios, agenda, citas y seguimiento.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACCESOS.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="h-full transition-all duration-200 hover:shadow-md cursor-pointer group" variant="elevated" padding="md">
                <div className="flex items-center gap-4">
                  <span className="text-2xl shrink-0" aria-hidden>{item.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>{item.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--encabezados-alterno)' }}>{item.description}</p>
                  </div>
                  <span className="text-lg opacity-0 group-hover:opacity-100 transition-opacity shrink-0" style={{ color: 'var(--hover)' }}>→</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </OperacionLayout>
  );
}
