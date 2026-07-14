'use client';

import Link from 'next/link';
import OperacionLayout from '../../../components/layouts/OperacionLayout';
import Card from '../../../components/ui/Card';
import {
  Scissors,
  Receipt,
  CalendarDays,
  CalendarClock,
  ClipboardCheck,
  ImagePlus,
  type LucideIcon,
} from 'lucide-react';

const ACCESOS: { label: string; href: string; icon: LucideIcon; description: string }[] = [
  { label: 'Ejecución de servicios', href: '/operacion/ejecucion-servicios', icon: Scissors, description: 'Servicios en curso y registro' },
  { label: 'Cobro sin cita', href: '/operacion/cobro-sin-cita', icon: Receipt, description: 'Cobrar servicio en mostrador' },
  { label: 'Agenda / Calendario', href: '/operacion/agenda-calendario', icon: CalendarDays, description: 'Citas y disponibilidad' },
  { label: 'Gestión de citas', href: '/operacion/gestion-citas', icon: CalendarClock, description: 'Agendar y modificar citas' },
  { label: 'Seguimiento post-servicio', href: '/operacion/seguimiento-post-servicio', icon: ClipboardCheck, description: 'Seguimiento a clientas' },
  { label: 'Subir imágenes', href: '/operacion/subir-imagenes', icon: ImagePlus, description: 'Fotos para productos o servicios' },
];

export default function OperacionPage() {
  return (
    <OperacionLayout>
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
            Panel de operación
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
            Accede a ejecución de servicios, agenda, citas y seguimiento.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACCESOS.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <Card className="h-full transition-all duration-200 hover:shadow-md cursor-pointer group" variant="elevated" padding="md">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: 'var(--fondos-suaves)' }}
                    >
                      <Icon size={20} strokeWidth={1.75} style={{ color: 'var(--logo-branding)' }} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>{item.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--encabezados-alterno)' }}>{item.description}</p>
                    </div>
                    <span className="text-lg opacity-0 group-hover:opacity-100 transition-opacity shrink-0" style={{ color: 'var(--hover)' }}>→</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </OperacionLayout>
  );
}
