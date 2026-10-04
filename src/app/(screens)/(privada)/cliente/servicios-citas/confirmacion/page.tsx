'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ModuleLayout from '../../../../../components/layouts/ModuleLayout';
import Button from '../../../../../components/ui/Button';
import Card from '../../../../../components/ui/Card';
import Badge from '../../../../../components/ui/Badge';
import { getServicioPorId } from '../../../../../services/servicios';
import type { Servicio } from '../../../../../services/servicios';
import { obtenerCita, type CitaApi } from '../../../../../services/citas';
import PasosFlujo, { PASOS_RESERVA } from '../../../../../components/cliente/PasosFlujo';
import SelloConfirmacion from '../../../../../components/cliente/SelloConfirmacion';
import { formatearPrecioMXN } from '../../../../../utils/formatoPrecio';
import EncabezadoAnticipo from '../../../../../components/cliente/EncabezadoAnticipo';
import { etiquetaEstadoCita, varianteEstadoCita } from '../../../../../utils/estados';

/** Parámetros con los que Mercado Pago regresa: solo indican que vale la pena esperar, nunca el estado. */
const PARAMS_REGRESO_MP = ['payment_id', 'collection_id', 'collection_status', 'status', 'preference_id'];

const TZ_MEXICO = 'America/Mexico_City';

function ConfirmacionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const citaId = searchParams.get('citaId');
  const volvioDeMercadoPago = PARAMS_REGRESO_MP.some((k) => searchParams.has(k));

  const [cita, setCita] = useState<CitaApi | null>(null);
  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!citaId || !Number.isFinite(Number(citaId))) {
      queueMicrotask(() => {
        setError('No se encontró la cita.');
        setCargando(false);
      });
      return;
    }
    obtenerCita(Number(citaId), { propios: true })
      .then((c) => {
        if (!c) {
          setError('No se encontró la cita.');
          return;
        }
        setCita(c);
        return getServicioPorId(String(c.servicioId)).then(setServicio);
      })
      .catch(() => setError('No se pudo cargar la cita.'))
      .finally(() => setCargando(false));
  }, [citaId]);

  if (cargando) {
    return (
      <ModuleLayout>
        <div className="max-w-2xl mx-auto space-y-4 py-8" aria-busy="true" aria-label="Cargando cita">
          <div className="mf-skeleton h-20 w-20 rounded-full mx-auto" style={{ borderRadius: 999 }} />
          <div className="mf-skeleton h-8 w-1/2 mx-auto" />
          <div className="mf-skeleton h-56 w-full" style={{ borderRadius: 'var(--mf-radio)' }} />
        </div>
      </ModuleLayout>
    );
  }

  if (error || !cita) {
    return (
      <ModuleLayout>
        <div className="max-w-3xl mx-auto">
          <Card className="text-center">
            <p style={{ color: 'var(--danger-texto)' }}>{error ?? 'No se encontró la cita.'}</p>
            <Button className="mt-4" onClick={() => router.push('/cliente/servicios-citas/mis-citas')}>
              Ver Mis Citas
            </Button>
          </Card>
        </div>
      </ModuleLayout>
    );
  }

  const fecha = new Date(cita.fechaHoraInicio).toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: TZ_MEXICO,
  });
  const hora = new Date(cita.fechaHoraInicio).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ_MEXICO,
  });
  const conAnticipo = (cita.anticipoRequerido ?? 0) > 0;

  return (
    <ModuleLayout>
      <div className="max-w-2xl mx-auto">
        <PasosFlujo pasos={PASOS_RESERVA} actual={PASOS_RESERVA.length} etiqueta="Pasos para reservar" />
        <Card className="text-center mf-entrada" padding="lg">
          {conAnticipo ? (
            <EncabezadoAnticipo cita={cita} volvioDeMercadoPago={volvioDeMercadoPago} />
          ) : (
          <div className="mb-8">
            <div className="mb-5 flex justify-center">
              <SelloConfirmacion />
            </div>
            <h1 className="mf-titulo-pagina mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
              ¡Cita Confirmada!
            </h1>
            <p className="text-lg" style={{ color: 'var(--encabezados-alterno)' }}>
              Tu cita ha sido agendada exitosamente
            </p>
          </div>
          )}

          <div className="rounded-[12px] p-6 mb-6" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
            <div className="space-y-4 text-left">
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: 'var(--encabezados-alterno)' }}>
                  Número de Cita:
                </span>
                <span className="mf-cifras" style={{ color: 'var(--menu-texto-principal)' }}>#{cita.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: 'var(--encabezados-alterno)' }}>
                  Servicio:
                </span>
                <span style={{ color: 'var(--menu-texto-principal)' }}>{cita.servicioNombre ?? servicio?.nombre ?? 'Servicio'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: 'var(--encabezados-alterno)' }}>
                  Fecha:
                </span>
                <span className="text-right first-letter:uppercase" style={{ color: 'var(--menu-texto-principal)' }}>{fecha}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: 'var(--encabezados-alterno)' }}>
                  Hora:
                </span>
                <span className="mf-cifras" style={{ color: 'var(--menu-texto-principal)' }}>{hora}</span>
              </div>
              {servicio?.duracion && (
                <div className="flex items-center justify-between">
                  <span className="font-semibold" style={{ color: 'var(--encabezados-alterno)' }}>
                    Duración:
                  </span>
                  <span style={{ color: 'var(--menu-texto-principal)' }}>{servicio.duracion}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: 'var(--encabezados-alterno)' }}>
                  Especialista:
                </span>
                <span style={{ color: 'var(--menu-texto-principal)' }}>{cita.especialistaNombre ?? 'No especificado'}</span>
              </div>
              <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--tarjetas-paneles)' }}>
                <span className="font-semibold" style={{ color: 'var(--encabezados-alterno)' }}>
                  Total:
                </span>
                <span
                  className="mf-cifras text-2xl font-bold"
                  style={{ color: 'var(--menu-texto-principal)' }}
                >
                  {servicio?.precio ? formatearPrecioMXN(servicio.precio) : '—'}
                </span>
              </div>
              {conAnticipo && (
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-encabezados-alterno">Anticipo:</span>
                  <span className="mf-cifras font-semibold text-menu-texto-principal">{formatearPrecioMXN(cita.anticipoRequerido ?? 0)}</span>
                </div>
              )}
              <div className="flex justify-center pt-4">
                <Badge variant={varianteEstadoCita(cita.estado)} size="lg">{etiquetaEstadoCita(cita.estado)}</Badge>
              </div>
            </div>
          </div>

          {servicio?.productosAsociados && servicio.productosAsociados.length > 0 && (
            <div className="rounded-[12px] p-6 mb-6 text-left" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
              <h3
                className="text-subtitle mb-3"
                style={{ color: 'var(--menu-texto-principal)' }}
              >
                Productos que se utilizarán en tu cita
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
            </div>
          )}

          <div className="space-y-4">
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: 'var(--fondos-suaves)' }}
            >
              <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
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
        <div className="max-w-2xl mx-auto space-y-4 py-8" aria-busy="true" aria-label="Cargando cita">
          <div className="mf-skeleton h-20 w-20 rounded-full mx-auto" style={{ borderRadius: 999 }} />
          <div className="mf-skeleton h-8 w-1/2 mx-auto" />
          <div className="mf-skeleton h-56 w-full" style={{ borderRadius: 'var(--mf-radio)' }} />
        </div>
      </ModuleLayout>
    }>
      <ConfirmacionContent />
    </Suspense>
  );
}
