'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import ModuleLayout from '../../../../../../components/layouts/ModuleLayout';
import Button from '../../../../../../components/ui/Button';
import Card from '../../../../../../components/ui/Card';
import Badge from '../../../../../../components/ui/Badge';
import ServicioImagen from '../../../../../../components/servicios/ServicioImagen';
import PasosFlujo, { PASOS_RESERVA } from '../../../../../../components/cliente/PasosFlujo';
import { formatearPrecioMXN } from '../../../../../../utils/formatoPrecio';
import { CalendarDays, Check, Clock3, Info } from 'lucide-react';
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
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12" aria-busy="true" aria-label="Cargando servicio">
          <div className="mf-skeleton h-80 lg:h-[460px]" style={{ borderRadius: 'var(--mf-radio)' }} />
          <div className="space-y-4 pt-2">
            <div className="mf-skeleton h-4 w-1/4" />
            <div className="mf-skeleton h-10 w-3/4" />
            <div className="mf-skeleton h-28 w-full mt-6" style={{ borderRadius: 'var(--mf-radio)' }} />
          </div>
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
    <ModuleLayout migaActual={servicio.nombre}>
      <div className="max-w-6xl mx-auto">
        <PasosFlujo pasos={PASOS_RESERVA} actual={0} etiqueta="Pasos para reservar" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-10">
          <div className="lg:sticky lg:top-[calc(var(--mf-header-offset,136px)+1rem)] lg:self-start mf-entrada">
            <div
              className="w-full h-80 lg:h-[460px] flex items-center justify-center relative overflow-hidden"
              style={{ backgroundColor: 'var(--fondos-suaves)', borderRadius: 'var(--mf-radio)', boxShadow: 'var(--mf-sombra-1)' }}
            >
              <ServicioImagen
                src={servicio.imagen ?? servicio.imagenes?.[0]}
                alt={servicio.nombre}
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>

          <div className="mf-entrada" style={{ ['--i' as string]: 1 }}>
            {servicio.categoria && <Badge variant="info" size="sm">{servicio.categoria}</Badge>}
            <h1 className="mf-titulo-pagina mt-3" style={{ color: 'var(--menu-texto-principal)' }}>
              {servicio.nombre}
            </h1>
            {servicio.descripcion && (
              <p className="mt-3 text-lg max-w-[55ch]" style={{ color: 'var(--encabezados-alterno)' }}>
                {servicio.descripcion}
              </p>
            )}

            <Card className="mt-8 mb-6" padding="lg">
              <div className="space-y-5">
                <dl className="mf-cifras flex flex-wrap items-end gap-x-10 gap-y-4">
                  {servicio.precio && (
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--encabezados-alterno)' }}>
                        Precio
                      </dt>
                      <dd className="mt-1 text-4xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                        {formatearPrecioMXN(servicio.precio)}
                      </dd>
                    </div>
                  )}
                  {servicio.duracion && (
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--encabezados-alterno)' }}>
                        Duración
                      </dt>
                      <dd className="mt-1 flex items-center gap-1.5 text-xl font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                        <Clock3 size={18} aria-hidden style={{ color: 'var(--logo-branding)' }} />
                        {servicio.duracion}
                      </dd>
                    </div>
                  )}
                </dl>
                {servicio.requiereEvaluacion && (
                  <p className="flex items-start gap-2 text-sm" style={{ color: 'var(--menu-texto-principal)' }}>
                    <Info size={16} aria-hidden className="mt-0.5 shrink-0" style={{ color: 'var(--logo-branding)' }} />
                    Este servicio requiere una evaluación previa con el especialista antes de agendar.
                  </p>
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
                  className="inline-flex items-center justify-center gap-2"
                  onClick={() => {
                    const destino = `/cliente/servicios-citas/calendario?servicioId=${servicio.id}`;
                    if (!hasValidToken()) {
                      router.push(`/login?returnUrl=${encodeURIComponent(destino)}`);
                      return;
                    }
                    router.push(destino);
                  }}
                >
                  <CalendarDays size={18} aria-hidden />
                  {!enCliente ? 'Elegir fecha y hora' : haySesion ? 'Elegir fecha y hora' : 'Iniciar sesión y agendar'}
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {servicio.descripcionLarga && (
          <Card className="mb-6 mf-revelar" padding="lg">
            <h2
              className="text-elegant-title mb-4"
              style={{ color: 'var(--menu-texto-principal)', letterSpacing: '-0.02em' }}
            >
              Descripción
            </h2>
            {servicio.descripcionLarga && (
              <p
                className="text-base md:text-lg leading-relaxed max-w-[65ch]"
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
                      <Check size={18} aria-hidden className="mr-2 mt-0.5 shrink-0" style={{ color: 'var(--success)' }} />
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
                      <Info size={16} aria-hidden className="mr-2 mt-1 shrink-0" style={{ color: 'var(--warning-texto)' }} />
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













