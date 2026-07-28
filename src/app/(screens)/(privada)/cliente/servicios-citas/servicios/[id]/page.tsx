'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import ModuleLayout from '../../../../../../components/layouts/ModuleLayout';
import Button from '../../../../../../components/ui/Button';
import Card from '../../../../../../components/ui/Card';
import Badge from '../../../../../../components/ui/Badge';
import { getServicioPorId } from '../../../../../../services/servicios';
import type { Servicio } from '../../../../../../services/servicios';
import { hasValidToken } from '../../../../../../utils/security';

export default function DetalleServicioPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  /** false en servidor y en el primer paint hidratado; true después → mismo HTML que SSR y sin mismatch. */
  const enCliente = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const haySesion = enCliente && hasValidToken();

  useEffect(() => {
    if (!id) {
      queueMicrotask(() => {
        setNotFound(true);
        setLoading(false);
      });
      return;
    }
    getServicioPorId(id).then((s) => {
      setServicio(s);
      setNotFound(!s);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <ModuleLayout>
        <div className="max-w-5xl mx-auto flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current" style={{ color: 'var(--menu-texto-principal)' }} />
        </div>
      </ModuleLayout>
    );
  }

  if (notFound || !servicio) {
    return (
      <ModuleLayout>
        <div className="max-w-5xl mx-auto text-center py-16">
          <p className="mb-4" style={{ color: 'var(--encabezados-alterno)' }}>Servicio no encontrado.</p>
          <Button variant="outline" onClick={() => router.push('/cliente/servicios-citas')}>
            Volver a servicios
          </Button>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout>
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div>
            <div
              className="w-full h-96 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden"
              style={{ backgroundColor: 'var(--fondos-suaves)' }}
            >
              {(() => {
                const imgSrc = servicio.imagen ?? servicio.imagenes?.[0];
                const isValidSrc = typeof imgSrc === 'string' && (imgSrc.startsWith('http') || imgSrc.startsWith('/'));
                return isValidSrc ? (
                  <Image
                    src={imgSrc}
                    alt={servicio.nombre}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                ) : (
                  <span style={{ color: 'var(--menu-texto-principal)' }}>Imagen del Servicio</span>
                );
              })()}
            </div>
          </div>

          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1
                  className="text-hero mb-2"
                  style={{ color: 'var(--menu-texto-principal)' }}
                >
                  {servicio.nombre}
                </h1>
                {servicio.categoria && <Badge variant="info" size="lg">{servicio.categoria}</Badge>}
              </div>
            </div>

            <Card className="mb-6">
              <div className="space-y-4">
                {servicio.precio && (
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Precio
                    </p>
                    <p
                      className="text-3xl font-bold"
                      style={{ color: 'var(--menu-texto-principal)' }}
                    >
                      {servicio.precio}
                    </p>
                  </div>
                )}
                {servicio.duracion && (
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Duración
                    </p>
                    <p
                      className="text-xl"
                      style={{ color: 'var(--menu-texto-principal)' }}
                    >
                      {servicio.duracion}
                    </p>
                  </div>
                )}
                {servicio.requiereEvaluacion && (
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Evaluación previa
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: 'var(--menu-texto-principal)' }}
                    >
                      Este servicio requiere una evaluación previa con el especialista antes de agendar.
                    </p>
                  </div>
                )}
                {enCliente && !haySesion && (
                  <p
                    className="text-sm p-3 rounded-lg"
                    style={{ backgroundColor: 'var(--fondos-suaves)', color: 'var(--encabezados-alterno)' }}
                  >
                    Para <strong>agendar esta cita</strong> necesitas <strong>iniciar sesión</strong>.
                  </p>
                )}
                <Button
                  fullWidth
                  size="lg"
                  onClick={() => {
                    const destino = `/cliente/servicios-citas/calendario?servicioId=${servicio.id}`;
                    if (!hasValidToken()) {
                      router.push(`/login?returnUrl=${encodeURIComponent(destino)}`);
                      return;
                    }
                    router.push(destino);
                  }}
                >
                  {!enCliente ? 'Agendar Cita' : haySesion ? 'Agendar Cita' : 'Iniciar sesión y agendar'}
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {(servicio.descripcion || servicio.descripcionLarga) && (
          <Card className="mb-6">
            <h2
              className="text-page-title mb-4"
              style={{ color: 'var(--menu-texto-principal)' }}
            >
              Descripción
            </h2>
            {servicio.descripcion && (
              <p
                className="text-lead mb-4"
                style={{ color: 'var(--encabezados-alterno)' }}
              >
                {servicio.descripcion}
              </p>
            )}
            {servicio.descripcionLarga && (
              <p
                className="text-lead"
                style={{ color: 'var(--encabezados-alterno)' }}
              >
                {servicio.descripcionLarga}
              </p>
            )}
          </Card>
        )}

        {(servicio.incluye?.length || servicio.recomendaciones?.length) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {servicio.incluye && servicio.incluye.length > 0 && (
              <Card>
                <h3
                  className="text-subtitle mb-4"
                  style={{ color: 'var(--menu-texto-principal)' }}
                >
                  Este servicio incluye
                </h3>
                <ul className="space-y-2">
                  {servicio.incluye.map((item, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2" style={{ color: 'var(--success)' }}>✓</span>
                      <span style={{ color: 'var(--encabezados-alterno)' }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {servicio.recomendaciones && servicio.recomendaciones.length > 0 && (
              <Card>
                <h3
                  className="text-subtitle mb-4"
                  style={{ color: 'var(--menu-texto-principal)' }}
                >
                  Recomendaciones
                </h3>
                <ul className="space-y-2">
                  {servicio.recomendaciones.map((item, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2" style={{ color: 'var(--warning)' }}>ℹ</span>
                      <span style={{ color: 'var(--encabezados-alterno)' }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        ) : null}

        {(servicio.especialistas?.length || servicio.productosAsociados?.length) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {servicio.especialistas && servicio.especialistas.length > 0 && (
              <Card>
                <h3
                  className="text-subtitle mb-4"
                  style={{ color: 'var(--menu-texto-principal)' }}
                >
                  ¿Quién puede atenderte?
                </h3>
                <ul className="space-y-3">
                  {servicio.especialistas.map((esp) => (
                    <li key={esp.id} className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
                        style={{ backgroundColor: 'var(--fondos-suaves)', color: 'var(--menu-texto-principal)' }}
                      >
                        {esp.nombre
                          ? esp.nombre
                              .split(' ')
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((p) => p[0]?.toUpperCase())
                              .join('')
                          : 'E'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                          {esp.nombre ?? 'Especialista'}
                        </p>
                        {esp.rol && (
                          <p className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                            {esp.rol}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {servicio.productosAsociados && servicio.productosAsociados.length > 0 && (
              <Card>
                <h3
                  className="text-subtitle mb-4"
                  style={{ color: 'var(--menu-texto-principal)' }}
                >
                  Productos que se utilizan
                </h3>
                <ul className="space-y-2">
                  {servicio.productosAsociados.map((p) => (
                    <li key={p.id} className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                          {p.productoNombre ?? 'Producto'}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
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
              </Card>
            )}
          </div>
        ) : null}
      </div>
    </ModuleLayout>
  );
}













