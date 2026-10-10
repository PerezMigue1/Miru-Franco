'use client';

import Link from 'next/link';
import { ArrowRight, Clock, Mail, MapPin, Phone } from 'lucide-react';
import { CIUDAD_SALON, DIRECCION_SALON, HORARIO_SALON, TELEFONO_SALON } from '../utils/contactoSalon';
import { anioEnMexico } from '../utils/fechaSoloDia';

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
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
function IconTwitter({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
    </svg>
  );
}

const LINKS_RAPIDOS = [
  { label: 'Inicio', href: '/home' },
  { label: 'Tienda', href: '/cliente/tienda-online' },
  { label: 'Servicios', href: '/servicios' },
  { label: 'Sobre Nosotros', href: '/sobre-nosotros' },
  { label: 'Contacto', href: '/contacto' },
];

const SERVICIOS = [
  'Cortes y Estilo',
  'Coloración Profesional',
  'Tratamientos Capilares',
  'Alaciado',
  'Nanoplastía',
  'Peinados de Evento',
];

export default function Footer() {
  const igUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL;
  const fbUrl = process.env.NEXT_PUBLIC_FACEBOOK_URL;
  const twUrl = process.env.NEXT_PUBLIC_TWITTER_URL;

  return (
    <footer className="mt-auto" style={{ backgroundColor: 'var(--header-footer)' }}>
      <div className="layout-page py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">

          {/* Columna 1: Marca + redes */}
          <div className="sm:col-span-2 lg:col-span-1">
            {/* Mismo logotipo que el encabezado: "Mirú" en Playfair y "Franco" en Great Vibes */}
            <p className="mf-logotipo mb-1">
              Mirú <span className="mf-logotipo__franco">Franco</span>
            </p>
            <p className="mf-logotipo__salon mb-4">Beauty Salón</p>
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--texto-fondo-oscuro-70)' }}>
              Salón de belleza profesional dedicado a realzar tu belleza natural con productos y servicios de alta calidad.
            </p>
            <div className="flex gap-3">
              {igUrl && (
                <a
                  href={igUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="p-2 rounded-full hover:opacity-80 transition-opacity"
                  style={{ background: 'var(--marca-instagram)' }}
                >
                  <IconInstagram className="w-5 h-5 text-blanco" />
                </a>
              )}
              {fbUrl && (
                <a
                  href={fbUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="p-2 rounded-full hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: 'var(--marca-facebook)' }}
                >
                  <IconFacebook className="w-5 h-5 text-blanco" />
                </a>
              )}
              {twUrl && (
                <a
                  href={twUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Twitter / X"
                  className="p-2 rounded-full hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: 'var(--marca-twitter)' }}
                >
                  <IconTwitter className="w-5 h-5 text-blanco" />
                </a>
              )}
              {!igUrl && !fbUrl && !twUrl && (
                <p className="text-xs italic" style={{ color: 'var(--texto-fondo-oscuro-70)' }}>
                  {/* TODO: Agregar NEXT_PUBLIC_INSTAGRAM_URL, NEXT_PUBLIC_FACEBOOK_URL, NEXT_PUBLIC_TWITTER_URL al .env */}
                  Redes sociales próximamente.
                </p>
              )}
            </div>
          </div>

          {/* Columna 2: Enlaces rápidos */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-5" style={{ color: 'var(--oro-sobre-carbon)' }}>
              Enlaces
            </h2>
            <ul className="space-y-3">
              {LINKS_RAPIDOS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm flex items-center gap-2 group transition-colors duration-200 text-[color:var(--texto-fondo-oscuro-70)] hover:text-[color:var(--texto-fondo-oscuro)]"
                  >
                    <ArrowRight size={14} aria-hidden className="shrink-0 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" style={{ color: 'var(--logo-branding)' }} />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Columna 3: Servicios */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-5" style={{ color: 'var(--oro-sobre-carbon)' }}>
              Servicios
            </h2>
            <ul className="space-y-3">
              {SERVICIOS.map((s) => (
                <li key={s} className="text-sm" style={{ color: 'var(--texto-fondo-oscuro-70)' }}>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Columna 4: Contacto */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-5" style={{ color: 'var(--oro-sobre-carbon)' }}>
              Contacto
            </h2>
            <ul className="space-y-4 text-sm" style={{ color: 'var(--texto-fondo-oscuro-70)' }}>
              <li className="flex items-start gap-3">
                <MapPin size={16} aria-hidden className="mt-0.5 shrink-0" style={{ color: 'var(--logo-branding)' }} />
                <span>{DIRECCION_SALON ?? `${CIUDAD_SALON}, México`}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={16} aria-hidden className="shrink-0" style={{ color: 'var(--logo-branding)' }} />
                <a
                  href="mailto:contacto@mirufranco.com"
                  className="transition-colors duration-200 text-[color:var(--texto-fondo-oscuro-70)] hover:text-[color:var(--texto-fondo-oscuro)]"
                >
                  contacto@mirufranco.com
                </a>
              </li>
              {TELEFONO_SALON && (
                <li className="flex items-center gap-3">
                  <Phone size={16} aria-hidden className="shrink-0" style={{ color: 'var(--logo-branding)' }} />
                  <a
                    href={TELEFONO_SALON.enlace}
                    className="transition-colors duration-200 text-[color:var(--texto-fondo-oscuro-70)] hover:text-[color:var(--texto-fondo-oscuro)]"
                  >
                    {TELEFONO_SALON.visible}
                  </a>
                </li>
              )}
              <li className="flex items-start gap-3">
                <Clock size={16} aria-hidden className="mt-0.5 shrink-0" style={{ color: 'var(--logo-branding)' }} />
                <span>
                  {HORARIO_SALON.frases.map((frase) => (
                    <span key={frase} className="block">
                      {frase}
                    </span>
                  ))}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="border-t pt-8 flex flex-col sm:flex-row justify-between items-center gap-4" style={{ borderColor: 'var(--borde-sutil)' }}>
          <p className="text-sm text-center" style={{ color: 'var(--texto-fondo-oscuro-70)' }}>
            © {anioEnMexico()} Mirú Franco. Todos los derechos reservados.
          </p>
          <div className="flex gap-6 text-sm flex-wrap justify-center">
            <Link href="/terminos-y-condiciones" className="transition-colors duration-200 text-[color:var(--texto-fondo-oscuro-70)] hover:text-[color:var(--texto-fondo-oscuro)]">
              Términos y Condiciones
            </Link>
            <Link href="/aviso-de-privacidad" className="transition-colors duration-200 text-[color:var(--texto-fondo-oscuro-70)] hover:text-[color:var(--texto-fondo-oscuro)]">
              Aviso de Privacidad
            </Link>
          </div>
          <p className="text-xs" style={{ color: 'var(--texto-fondo-oscuro-70)' }}>
            Diseñado en Guadalajara
          </p>
        </div>
      </div>
    </footer>
  );
}
