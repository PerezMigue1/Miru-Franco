'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ModuleLayout from '../../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../../components/ui/PageHeader';
import Button from '../../../../../components/ui/Button';
import Card from '../../../../../components/ui/Card';
import Textarea from '../../../../../components/ui/Textarea';
import { getServicioPorId } from '../../../../../services/servicios';
import type { Servicio } from '../../../../../services/servicios';
import { getMiPerfil } from '../../../../../services/auth';
import { crearCita, crearPreferenciaAnticipo, obtenerEspecialistas, type EspecialistaApi } from '../../../../../services/citas';
import Link from 'next/link';
import { CalendarDays, CalendarCheck2, Clock3, UserRound, Wallet } from 'lucide-react';
import FormaPagoCita from '../../../../../components/cliente/FormaPagoCita';
import { useTextosSitio } from '../../../../../hooks/useTextosSitio';
import { opcionesAnticipo, opcionInicial, saldoEnSalon, textoBotonConfirmar, type OpcionAnticipo } from '../../../../../utils/formaPago';
import PasosFlujo, { PASOS_RESERVA } from '../../../../../components/cliente/PasosFlujo';
import { formatearPrecioMXN } from '../../../../../utils/formatoPrecio';
import AvisoSimplificado from '../../../../../components/legal/AvisoSimplificado';
import CasillaPoliticaAnticipos from '../../../../../components/cliente/CasillaPoliticaAnticipos';
import { MENSAJE_FALTA_ANTICIPOS } from '../../../../../components/cliente/consentimientoAnticipo';
import {
  anticipoDelServicio,
  crearCitaConConsentimientos,
  destinoTrasCrearCita,
  MENSAJE_SERVICIO_NO_CARGADO,
  servicioSinCargar,
  TEXTO_FOTOS_RESULTADO,
} from './consentimientosCita';

const ID_CASILLA_ANTICIPOS = 'casilla-politica-anticipos';

const TZ_MEXICO = 'America/Mexico_City';

function CrearCitaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const servicioId = searchParams.get('servicioId');
  const especialistaId = searchParams.get('especialistaId');
  const inicio = searchParams.get('inicio');
  const fin = searchParams.get('fin');

  const [notas, setNotas] = useState('');
  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [loadingServicio, setLoadingServicio] = useState(!!servicioId);
  const [especialista, setEspecialista] = useState<EspecialistaApi | null>(null);
  const [loadingEspecialista, setLoadingEspecialista] = useState(!!especialistaId);

  const [enviando, setEnviando] = useState<false | OpcionAnticipo>(false);
  /** Reglas de Admin > Configuración del sitio > Reglas: plazos y formas de pago activas. */
  const { t, textos, config } = useTextosSitio();
  const { reglas } = config;
  /** Forma de pago del anticipo elegida en "Forma de pago" (solo las opciones activas). */
  const [opcionElegida, setOpcionElegida] = useState<OpcionAnticipo | null>(null);
  const opcionPago: OpcionAnticipo = opcionElegida && opcionesAnticipo(reglas).includes(opcionElegida) ? opcionElegida : opcionInicial(reglas);
  const [error, setError] = useState<string | null>(null);
  /** Política de anticipos: obligatoria si el servicio pide anticipo. Fotos del resultado: opcional. Ambas sin marcar. */
  const [aceptaAnticipos, setAceptaAnticipos] = useState(false);
  const [errorAnticipos, setErrorAnticipos] = useState<string | null>(null);
  const [autorizaFotos, setAutorizaFotos] = useState(false);

  const datosIncompletos = !servicioId || !especialistaId || !inicio || !fin;
  /** Anticipo del servicio: aparta el horario las horas de la regla (citas.plazoAnticipoHoras) mientras se paga. */
  const anticipo = anticipoDelServicio(servicio);
  /** Con anticipo se pide y se registra la casilla de la Política de anticipos antes de crear la cita. */
  const requiereAnticipo = anticipo > 0;
  /** Sin el servicio no se sabe si pide anticipo: no se puede confirmar hasta reintentar. */
  const sinServicio = servicioSinCargar({ servicioId, servicio, cargando: loadingServicio });

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

  /** Botón "Reintentar" cuando el servicio no cargó. */
  const cargarServicio = () => {
    if (!servicioId) return;
    setError(null);
    setLoadingServicio(true);
    getServicioPorId(servicioId).then((s) => {
      setServicio(s);
      setLoadingServicio(false);
    });
  };

  useEffect(() => {
    if (!especialistaId) {
      queueMicrotask(() => setLoadingEspecialista(false));
      return;
    }
    obtenerEspecialistas()
      .then((lista) => setEspecialista(lista.find((e) => e.id === especialistaId) ?? null))
      .finally(() => setLoadingEspecialista(false));
  }, [especialistaId]);

  const manejarEnviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (datosIncompletos) {
      setError('Faltan datos de la cita. Vuelve a seleccionar especialista, fecha y hora.');
      return;
    }
    // El aviso con "Reintentar" ya está a la vista y los botones desactivados; esto evita cualquier otro envío.
    if (sinServicio) return;
    // Pagar en línea y apartar para pagar en el salón piden la misma casilla de la Política de anticipos.
    if (anticipo > 0 && !aceptaAnticipos) {
      setErrorAnticipos(MENSAJE_FALTA_ANTICIPOS);
      document.getElementById(ID_CASILLA_ANTICIPOS)?.focus();
      return;
    }
    // Con anticipo: la forma de pago elegida en "Forma de pago" (en línea o en el salón).
    const pagarEnSalon = opcionPago === 'salon';
    setEnviando(anticipo > 0 && !pagarEnSalon ? 'linea' : 'salon');
    setError(null);
    try {
      const perfil = await getMiPerfil();
      // Las casillas se registran antes de apartar el horario: si el registro falla, la cita no se crea.
      const cita = await crearCitaConConsentimientos(
        { requiereAnticipo, autorizaFotos },
        () =>
          crearCita({
            clienteId: perfil.id,
            especialistaId: especialistaId!,
            servicioId: Number(servicioId),
            fechaHoraInicio: inicio!,
            fechaHoraFin: fin!,
            notas: notas || undefined,
            // Con anticipo, el backend fija el plazo según dónde se paga (en el salón vence 15 min antes del inicio).
            ...(anticipo > 0 ? { pagoAnticipo: pagarEnSalon ? 'salon' as const : 'linea' as const } : {}),
          }, { propios: true }),
      );
      // Sin la casilla de anticipos registrada no se abre Mercado Pago: la confirmación la pide antes de pagar.
      const destino = destinoTrasCrearCita({
        anticipoRequerido: cita.anticipoRequerido,
        anticiposRegistrados: requiereAnticipo,
        pagarEnSalon,
      });
      if (destino === 'mercado_pago') {
        try {
          const { initPoint } = await crearPreferenciaAnticipo(cita.id);
          window.location.assign(initPoint);
          return;
        } catch {
          // La cita ya quedó apartada: en la confirmación puede volver a intentar el pago.
        }
      }
      router.push(`/cliente/servicios-citas/confirmacion?citaId=${cita.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cita. Intenta con otro horario.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ModuleLayout>
      <div className="max-w-5xl mx-auto">
        <PasosFlujo pasos={PASOS_RESERVA} actual={datosIncompletos ? 0 : 2} etiqueta="Pasos para reservar" />
        <PageHeader
          title="Crear Cita"
          subtitle={datosIncompletos ? 'Primero elige el servicio y el horario' : 'Revisa los detalles y confirma tu cita'}
        />

        {datosIncompletos ? (
          /* Sin servicio/especialista/horario la cita no se puede crear: en vez de un formulario con
             "No seleccionado" en rojo y el botón apagado, se explica qué falta y cómo seguir. */
          <Card className="mf-entrada max-w-xl text-center py-12 px-6">
            <CalendarDays size={36} strokeWidth={1.5} className="mx-auto mb-4" style={{ color: 'var(--logo-branding)' }} aria-hidden />
            <p className="text-lg font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
              {t('citas.crear.sinDatosTitulo')}
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
              {t('citas.crear.sinDatosTexto')}
            </p>
            <Link
              href="/cliente/servicios-citas"
              className="mf-btn mt-6 inline-flex items-center justify-center px-6 min-h-11 rounded-[10px] font-semibold bg-[var(--botones-principales)] hover:bg-[var(--hover)]"
              style={{ color: 'var(--texto-fondo-oscuro)' }}
            >
              Elegir servicio
            </Link>
          </Card>
        ) : (
        <form onSubmit={manejarEnviar} noValidate>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="mf-entrada" padding="lg">
                <h2
                  className="text-2xl font-bold mb-6"
                  style={{ color: 'var(--menu-texto-principal)', fontFamily: 'var(--font-family-serif)' }}
                >
                  Detalles de la Cita
                </h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                      Especialista
                    </p>
                    <p className="flex items-center gap-2 font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
                      <UserRound size={16} aria-hidden style={{ color: 'var(--logo-branding)' }} />
                      {loadingEspecialista ? <span className="mf-skeleton inline-block h-4 w-32" /> : especialista?.nombre ?? 'No seleccionado'}
                    </p>
                  </div>
                  <Textarea
                    label="Notas Adicionales (Opcional)"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    rows={4}
                    fullWidth
                    // Se queda en el código: protege los datos de salud (no pedirlos en texto libre), no lo cambia el panel.
                    placeholder="Indica tus preferencias para la cita. Si tienes alergias, regístralas en Mi perfil, en Información personal."
                  />
                  {/* Opcional y aparte de la Política de anticipos: solo se registra si la marca. */}
                  <div className="mf-consentimiento">
                    <label htmlFor="casilla-fotos-resultado">
                      <input
                        type="checkbox"
                        id="casilla-fotos-resultado"
                        checked={autorizaFotos}
                        onChange={(e) => setAutorizaFotos(e.target.checked)}
                      />
                      <span>{TEXTO_FOTOS_RESULTADO}</span>
                    </label>
                  </div>
                </div>
              </Card>
            </div>

            {/* En escritorio el resumen abarca las dos filas; la tarjeta de confirmar va bajo los detalles. */}
            <div className="lg:row-span-2 lg:sticky lg:top-[calc(var(--mf-header-offset,136px)+1rem)] lg:self-start">
              <Card className="mf-entrada" style={{ ['--i' as string]: 1 }} padding="lg">
                <h3
                  className="text-xl font-bold mb-5"
                  style={{ color: 'var(--menu-texto-principal)', fontFamily: 'var(--font-family-serif)' }}
                >
                  Resumen de la Cita
                </h3>
                {loadingServicio ? (
                  <div className="space-y-3" aria-busy="true" aria-label="Cargando servicio">
                    <div className="mf-skeleton h-4 w-2/3" />
                    <div className="mf-skeleton h-4 w-1/2" />
                    <div className="mf-skeleton h-4 w-1/3" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                        Servicio
                      </p>
                      <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>{servicio?.nombre ?? (sinServicio ? 'No se pudo cargar' : 'No seleccionado')}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                        Fecha
                      </p>
                      <p className="flex items-center gap-2 first-letter:uppercase" style={{ color: 'var(--menu-texto-principal)' }}>
                        <CalendarCheck2 size={16} aria-hidden className="shrink-0" style={{ color: 'var(--logo-branding)' }} />
                        {inicio ? new Date(inicio).toLocaleDateString('es-ES', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          timeZone: TZ_MEXICO,
                        }) : 'No seleccionada'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                        Hora
                      </p>
                      <p className="mf-cifras flex items-center gap-2" style={{ color: 'var(--menu-texto-principal)' }}>
                        <Clock3 size={16} aria-hidden className="shrink-0" style={{ color: 'var(--logo-branding)' }} />
                        {inicio ? new Date(inicio).toLocaleTimeString('es-MX', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: TZ_MEXICO,
                        }) : 'No seleccionada'}
                      </p>
                    </div>
                    {servicio?.duracion && (
                      <div>
                        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                          Duración
                        </p>
                        <p style={{ color: 'var(--menu-texto-principal)' }}>{servicio.duracion}</p>
                      </div>
                    )}
                    <div className="pt-4 border-t" style={{ borderColor: 'var(--mf-linea)' }}>
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                        Total
                      </p>
                      <p
                        className="mf-cifras text-3xl font-bold"
                        style={{ color: 'var(--menu-texto-principal)' }}
                      >
                        {servicio?.precio ? formatearPrecioMXN(servicio.precio) : '-'}
                      </p>
                    </div>
                    {anticipo > 0 && (
                      <div className="rounded-xl bg-fondos-suaves p-4">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="flex items-center gap-2 text-sm font-semibold text-menu-texto-principal">
                            <Wallet size={16} aria-hidden className="shrink-0 text-logo-branding" />
                            {t('citas.formaPago.anticipoEtiqueta')}
                          </p>
                          <p className="mf-cifras text-xl font-bold text-menu-texto-principal">{formatearPrecioMXN(anticipo)}</p>
                        </div>
                        <p className="mt-2 text-sm text-encabezados-alterno">
                          {saldoEnSalon(servicio?.precio, anticipo) !== null
                            ? t('citas.crear.anticipoDescuentoSaldo', { saldo: formatearPrecioMXN(saldoEnSalon(servicio?.precio, anticipo) ?? 0) })
                            : t('citas.crear.anticipoDescuento')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>

            {/* Casilla de anticipos y botones de pago bajo "Detalles de la Cita" (columna ancha), no al fondo
                de la columna angosta. En móvil quedan después del resumen. */}
            <section aria-labelledby="titulo-confirmar-cita" className="lg:col-span-2">
              <Card className="mf-entrada" style={{ ['--i' as string]: 2 }} padding="lg">
                <h2
                  id="titulo-confirmar-cita"
                  className="text-2xl font-bold mb-6"
                  style={{ color: 'var(--menu-texto-principal)', fontFamily: 'var(--font-family-serif)' }}
                >
                  {t('citas.crear.tituloConfirmar')}
                </h2>
                {loadingServicio ? (
                  <div className="space-y-3" aria-busy="true" aria-label="Cargando servicio">
                    <div className="mf-skeleton h-11 w-full" />
                    <div className="mf-skeleton h-4 w-2/3" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Siempre visible: con anticipo, sus opciones y la política; sin anticipo, cuánto y cómo se paga en el salón. */}
                    {!sinServicio && (
                      <FormaPagoCita
                        precio={servicio?.precio}
                        anticipo={anticipo}
                        reglas={reglas}
                        opcion={opcionPago}
                        onOpcion={setOpcionElegida}
                        deshabilitado={!!enviando}
                        casilla={
                          anticipo > 0 ? (
                            <CasillaPoliticaAnticipos
                              id={ID_CASILLA_ANTICIPOS}
                              checked={aceptaAnticipos}
                              onChange={(marcada) => {
                                setAceptaAnticipos(marcada);
                                if (marcada) setErrorAnticipos(null);
                              }}
                              error={errorAnticipos}
                            />
                          ) : undefined
                        }
                      />
                    )}
                    {sinServicio && (
                      <div className="space-y-3 rounded-xl bg-fondos-suaves p-4">
                        <p className="text-sm text-[var(--danger-texto)]" role="alert">
                          {MENSAJE_SERVICIO_NO_CARGADO}
                        </p>
                        <Button type="button" variant="outline" fullWidth onClick={cargarServicio}>
                          Reintentar
                        </Button>
                      </div>
                    )}
                    {error && (
                      <p className="text-sm text-[var(--danger-texto)]" role="alert">{error}</p>
                    )}
                    <Button
                      type="submit"
                      fullWidth
                      size="lg"
                      className="mt-4"
                      disabled={!!enviando || datosIncompletos || sinServicio}
                    >
                      <span className="mf-feedback-contenido w-full" data-cambiando={enviando ? 'true' : 'false'}>
                        {textoBotonConfirmar(anticipo, opcionPago, enviando, textos)}
                      </span>
                    </Button>
                    <AvisoSimplificado finalidad="agendar y dar seguimiento a tu cita" />
                  </div>
                )}
              </Card>
            </section>
          </div>
        </form>
        )}
      </div>
    </ModuleLayout>
  );
}

export default function CrearCitaPage() {
  return (
    <Suspense fallback={
      <ModuleLayout>
        <div className="max-w-4xl mx-auto space-y-4 py-4" aria-busy="true" aria-label="Cargando">
          <div className="mf-skeleton h-9 w-2/5" />
          <div className="mf-skeleton h-4 w-3/5" />
          <div className="mf-skeleton h-56 w-full" style={{ borderRadius: 'var(--mf-radio)' }} />
        </div>
      </ModuleLayout>
    }>
      <CrearCitaContent />
    </Suspense>
  );
}
