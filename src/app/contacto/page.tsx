import Header from '../layouts/Header';
import Footer from '../layouts/Footer';
import { MapPin, Mail, Phone, Clock } from 'lucide-react';
import { metadataPublica } from '../utils/seo';
import { CIUDAD_SALON, DIRECCION_SALON, HORARIO_SALON, TELEFONO_SALON } from '../utils/contactoSalon';
import SuperficieCliente from '../components/cliente/SuperficieCliente';

function IconInstagram({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}
function IconFacebook({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export const metadata = metadataPublica({
  title: 'Contacto',
  description:
    'Contacta a Mirú Franco Beauty Salón en Huejutla de Reyes: dirección, teléfono, correo y horarios para agendar tu cita o resolver tus dudas.',
  path: '/contacto',
});

export default function ContactoPage() {
  const igUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL;
  const fbUrl = process.env.NEXT_PUBLIC_FACEBOOK_URL;

  return (
    <SuperficieCliente className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--fondo-general)' }}>
      <Header />
      <main className="flex-1" style={{ marginTop: 'var(--mf-header-offset, 104px)' }}>

        {/* Hero */}
        <section className="py-16 md:py-24 layout-gutter-x" style={{ backgroundColor: 'var(--mf-banda)' }}>
          <div className="container-max mf-entrada">
            <h1 className="text-elegant-hero hyphens-none mb-4" style={{ color: 'var(--texto-fondo-oscuro)', letterSpacing: '-0.02em' }}>
              Contacto
            </h1>
            <p className="max-w-xl text-base md:text-lg leading-relaxed" style={{ color: 'var(--texto-fondo-oscuro-80)' }}>
              Agenda una cita, resuelve tus dudas o simplemente escríbenos. Estaremos encantados de atenderte.
            </p>
          </div>
        </section>

        {/* Información */}
        <section className="section-padding" style={{ backgroundColor: 'var(--fondo-general)' }}>
          <div className="container-max">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">

              {/* Datos de contacto */}
              <div className="mf-revelar">
                <h2 className="text-elegant-title mb-8 hyphens-none" style={{ color: 'var(--encabezados-alterno)' }}>
                  Información de Contacto
                </h2>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: 'var(--fondos-suaves)' }}
                    >
                      <MapPin className="w-5 h-5" style={{ color: 'var(--logo-branding)' }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Dirección</p>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--texto-secundario)' }}>
                        {DIRECCION_SALON ?? `${CIUDAD_SALON}, México`}
                      </p>
                    </div>
                  </div>

                  {TELEFONO_SALON && (
                    <div className="flex items-start gap-4">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: 'var(--fondos-suaves)' }}
                      >
                        <Phone className="w-5 h-5" style={{ color: 'var(--logo-branding)' }} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Teléfono</p>
                        <a
                          href={TELEFONO_SALON.enlace}
                          className="text-sm hover:opacity-80 transition-opacity"
                          style={{ color: 'var(--menu-texto-principal)' }}
                        >
                          {TELEFONO_SALON.visible}
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: 'var(--fondos-suaves)' }}
                    >
                      <Mail className="w-5 h-5" style={{ color: 'var(--logo-branding)' }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Correo</p>
                      <a
                        href="mailto:contacto@mirufranco.com"
                        className="text-sm hover:opacity-80 transition-opacity"
                        style={{ color: 'var(--menu-texto-principal)' }}
                      >
                        contacto@mirufranco.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: 'var(--fondos-suaves)' }}
                    >
                      <Clock className="w-5 h-5" style={{ color: 'var(--logo-branding)' }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Horario</p>
                      <p className="text-sm" style={{ color: 'var(--texto-secundario)' }}>
                        {HORARIO_SALON.frases.map((frase) => (
                          <span key={frase} className="block">
                            {frase}
                          </span>
                        ))}
                      </p>
                    </div>
                  </div>

                  {(igUrl || fbUrl) && (
                    <div className="flex items-start gap-4">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: 'var(--fondos-suaves)' }}
                      >
                        <IconInstagram className="w-5 h-5" style={{ color: 'var(--logo-branding)' }} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Redes Sociales</p>
                        <div className="flex gap-4">
                          {igUrl && (
                            <a
                              href={igUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity"
                              style={{ color: 'var(--menu-texto-principal)' }}
                            >
                              <IconInstagram className="w-4 h-4" />
                              Instagram
                            </a>
                          )}
                          {fbUrl && (
                            <a
                              href={fbUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity"
                              style={{ color: 'var(--menu-texto-principal)' }}
                            >
                              <IconFacebook className="w-4 h-4" />
                              Facebook
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* CTA agendar */}
              <div className="flex flex-col justify-center">
                <div
                  className="mf-revelar rounded-[14px] p-8 sm:p-10"
                  style={{ backgroundColor: 'var(--tarjetas-paneles)', boxShadow: 'var(--mf-sombra-2)' }}
                >
                  <h2 className="text-elegant-title mb-4 hyphens-none" style={{ color: 'var(--encabezados-alterno)' }}>
                    Agenda en Línea
                  </h2>
                  <p className="text-base leading-relaxed mb-8" style={{ color: 'var(--encabezados-alterno)' }}>
                    Elige el servicio, la fecha y la hora que prefieras. Confirmación instantánea.
                  </p>
                  <a
                    href="/cliente/servicios-citas"
                    className="mf-btn inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full font-semibold text-sm uppercase tracking-wider bg-[var(--botones-principales)] hover:bg-[var(--hover)] w-full sm:w-auto"
                    style={{
                      color: 'var(--texto-fondo-oscuro)',
                      minHeight: '44px',
                    }}
                  >
                    Agendar Cita
                  </a>
                </div>
              </div>

            </div>
          </div>
        </section>

      </main>
      <Footer />
    </SuperficieCliente>
  );
}
