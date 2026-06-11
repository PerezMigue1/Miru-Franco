'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ModuleLayout from '../../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../../components/ui/PageHeader';
import Button from '../../../../../components/ui/Button';
import Card from '../../../../../components/ui/Card';
import Input from '../../../../../components/ui/Input';
import Select from '../../../../../components/ui/Select';
import Textarea from '../../../../../components/ui/Textarea';
import { getServicioPorId } from '../../../../../services/servicios';
import type { Servicio } from '../../../../../services/servicios';

function CrearCitaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const servicioId = searchParams.get('servicioId');
  const fecha = searchParams.get('fecha');
  const hora = searchParams.get('hora');

  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    especialista: '',
    notas: '',
  });
  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [loadingServicio, setLoadingServicio] = useState(!!servicioId);

  useEffect(() => {
    if (!servicioId) {
      queueMicrotask(() => setLoadingServicio(false));
      return;
    }
    getServicioPorId(servicioId).then((s) => {
      setServicio(s);
      setLoadingServicio(false);
    });
  }, [servicioId]);

  const especialistasBase = [
    { value: 'mildred', label: 'Mildred' },
    { value: 'carmen', label: 'Carmen' },
    { value: 'laura', label: 'Laura' },
  ];

  const especialistas = servicio?.especialistas?.length
    ? [
        ...servicio.especialistas.map((e) => ({
          value: e.usuarioId,
          label: e.nombre || e.usuarioId,
        })),
        { value: 'cualquiera', label: 'Cualquiera disponible' },
      ]
    : [
        ...especialistasBase,
        { value: 'cualquiera', label: 'Cualquiera disponible' },
      ];

  const manejarCambio = (campo: string, valor: string) => {
    setFormData((prev) => ({ ...prev, [campo]: valor }));
  };

  const manejarEnviar = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí iría la lógica para crear la cita en el backend
    const especialistaOption = especialistas.find(
      (opt) => opt.value === formData.especialista
    );
    const especialistaNombre = especialistaOption?.label ?? '';
    router.push(
      `/cliente/servicios-citas/confirmacion?servicioId=${servicioId}&fecha=${fecha}&hora=${hora}&especialista=${encodeURIComponent(
        especialistaNombre
      )}`
    );
  };

  return (
    <ModuleLayout>
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Crear Cita"
          subtitle="Completa la información para confirmar tu cita"
        />

        <form onSubmit={manejarEnviar}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card style={{ animation: 'fadeUp 350ms ease-out both' }}>
                <h2
                  className="text-page-title mb-6"
                  style={{ color: 'var(--menu-texto-principal)' }}
                >
                  Información de Contacto
                </h2>
                <div className="space-y-4">
                  <Input
                    label="Nombre Completo"
                    value={formData.nombre}
                    onChange={(e) => manejarCambio('nombre', e.target.value)}
                    fullWidth
                  />
                  <Input
                    label="Teléfono"
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => manejarCambio('telefono', e.target.value)}
                    fullWidth
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => manejarCambio('email', e.target.value)}
                    fullWidth
                  />
                </div>
              </Card>

              <Card style={{ animation: 'fadeUp 350ms ease-out 80ms both' }}>
                <h2
                  className="text-page-title mb-6"
                  style={{ color: 'var(--menu-texto-principal)' }}
                >
                  Detalles de la Cita
                </h2>
                <div className="space-y-4">
                  <Select
                    label="Especialista Preferido"
                    options={especialistas}
                    value={formData.especialista}
                    onChange={(e) => manejarCambio('especialista', e.target.value)}
                    fullWidth
                  />
                  <Textarea
                    label="Notas Adicionales (Opcional)"
                    value={formData.notas}
                    onChange={(e) => manejarCambio('notas', e.target.value)}
                    rows={4}
                    fullWidth
                    placeholder="Indica cualquier preferencia, alergia o información relevante..."
                  />
                </div>
              </Card>
            </div>

            <div>
              <Card style={{ animation: 'fadeUp 350ms ease-out 160ms both' }}>
                <h3
                  className="text-subtitle mb-4"
                  style={{ color: 'var(--menu-texto-principal)' }}
                >
                  Resumen de la Cita
                </h3>
                {loadingServicio ? (
                  <p style={{ color: 'var(--encabezados-alterno)' }}>Cargando servicio...</p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                        Servicio
                      </p>
                      <p style={{ color: 'var(--menu-texto-principal)' }}>{servicio?.nombre ?? 'No seleccionado'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                        Fecha
                      </p>
                      <p style={{ color: 'var(--menu-texto-principal)' }}>
                        {fecha ? new Date(fecha).toLocaleDateString('es-ES', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        }) : 'No seleccionada'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                        Hora
                      </p>
                      <p style={{ color: 'var(--menu-texto-principal)' }}>{hora || 'No seleccionada'}</p>
                    </div>
                    {servicio?.duracion && (
                      <div>
                        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                          Duración
                        </p>
                        <p style={{ color: 'var(--menu-texto-principal)' }}>{servicio.duracion}</p>
                      </div>
                    )}
                    <div className="pt-4 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                        Total
                      </p>
                      <p
                        className="text-2xl font-bold"
                        style={{ color: 'var(--menu-texto-principal)' }}
                      >
                        {servicio?.precio ?? '—'}
                      </p>
                    </div>
                    <Button
                      type="submit"
                      fullWidth
                      size="lg"
                      className="mt-4"
                    >
                      Confirmar Cita
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </form>
      </div>
    </ModuleLayout>
  );
}

export default function CrearCitaPage() {
  return (
    <Suspense fallback={
      <ModuleLayout>
        <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[200px]">
          <p style={{ color: 'var(--encabezados-alterno)' }}>Cargando...</p>
        </div>
      </ModuleLayout>
    }>
      <CrearCitaContent />
    </Suspense>
  );
}
