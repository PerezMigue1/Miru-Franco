import Header from '../layouts/Header';
import Footer from '../layouts/Footer';
import Image from 'next/image';

export const metadata = {
  title: 'Sobre Nosotros — Mirú Franco Beauty Salón',
  description: 'Conoce la historia y el equipo detrás de Mirú Franco Beauty Salón.',
};

const STATS = [
  { num: '5+', label: 'Años de experiencia' },
  { num: '500+', label: 'Clientes satisfechos' },
  { num: '15+', label: 'Servicios disponibles' },
  { num: '100%', label: 'Satisfacción garantizada' },
];

const VALORES = [
  {
    titulo: 'Profesionalismo',
    desc: 'Cada servicio se ejecuta con técnica depurada y productos de primera calidad.',
  },
  {
    titulo: 'Calidez',
    desc: 'Te recibimos con atención personalizada desde el primer momento.',
  },
  {
    titulo: 'Innovación',
    desc: 'Combinamos técnicas tradicionales con las últimas tendencias del mundo capilar.',
  },
  {
    titulo: 'Confianza',
    desc: 'Construimos relaciones duraderas basadas en resultados reales y honestos.',
  },
];

export default function SobreNosotrosPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--fondo-general)' }}>
      <Header />
      <main className="flex-1" style={{ marginTop: '104px' }}>

        {/* Hero */}
        <section className="section-padding text-center" style={{ backgroundColor: '#2A2A2A' }}>
          <div className="container-max max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] mb-3" style={{ color: 'var(--iconografia)' }}>
              Nuestra historia
            </p>
            <h1 className="text-elegant-hero hyphens-none mb-6" style={{ color: 'var(--texto-fondo-oscuro)' }}>
              Sobre Nosotros
            </h1>
            <div className="flex items-center justify-center gap-3">
              <span className="h-px w-16 opacity-30" style={{ backgroundColor: 'var(--iconografia)' }} />
              <span className="w-1.5 h-1.5 rounded-full opacity-50" style={{ backgroundColor: 'var(--iconografia)' }} />
              <span className="h-px w-16 opacity-30" style={{ backgroundColor: 'var(--iconografia)' }} />
            </div>
          </div>
        </section>

        {/* Historia */}
        <section className="section-padding" style={{ backgroundColor: 'var(--fondo-general)' }}>
          <div className="container-max grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-elegant-title mb-6 hyphens-none" style={{ color: 'var(--encabezados-alterno)' }}>
                Pasión por la belleza natural
              </h2>
              <p className="text-base leading-relaxed mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
                En Mirú Franco, nos dedicamos a realzar tu belleza natural con productos y servicios de la más alta calidad. Nuestro equipo de profesionales está comprometido a brindarte una experiencia excepcional en cada visita.
              </p>
              <p className="text-base leading-relaxed mb-4" style={{ color: 'var(--encabezados-alterno)', opacity: 0.8 }}>
                Con años de experiencia en el cuidado capilar, combinamos técnicas tradicionales con innovaciones modernas para ofrecerte resultados que superen tus expectativas.
              </p>
              <p className="text-base leading-relaxed" style={{ color: 'var(--encabezados-alterno)', opacity: 0.75 }}>
                Cada cliente es único, y por eso diseñamos un plan de cuidado personalizado para adaptarnos a tus necesidades específicas, tu tipo de cabello y tus preferencias de estilo.
              </p>
            </div>
            <div className="flex justify-center">
              <div
                className="relative w-72 h-72 sm:w-96 sm:h-96 rounded-full overflow-hidden shadow-2xl"
                style={{ outline: '3px solid var(--logo-branding)', outlineOffset: '6px' }}
              >
                <Image
                  src="/logo-miru.jpg"
                  alt="Mirú Franco"
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 288px, 384px"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="section-padding" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
          <div className="container-max">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
              {STATS.map((stat) => (
                <div key={stat.label}>
                  <p
                    className="text-5xl font-bold mb-2"
                    style={{ color: 'var(--botones-principales)', fontFamily: 'var(--font-family-serif)' }}
                  >
                    {stat.num}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--encabezados-alterno)', opacity: 0.7 }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Valores */}
        <section className="section-padding" style={{ backgroundColor: '#2A2A2A' }}>
          <div className="container-max">
            <div className="text-center mb-12">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] mb-3" style={{ color: 'var(--iconografia)' }}>
                Lo que nos define
              </p>
              <h2 className="text-elegant-title hyphens-none" style={{ color: 'var(--texto-fondo-oscuro)' }}>
                Nuestros Valores
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {VALORES.map((v) => (
                <div
                  key={v.titulo}
                  className="rounded-2xl p-6 border"
                  style={{ borderColor: 'rgba(159,109,31,0.2)', backgroundColor: 'rgba(159,109,31,0.06)' }}
                >
                  <h3 className="font-semibold text-base mb-2" style={{ color: 'var(--logo-branding)' }}>
                    {v.titulo}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--texto-fondo-oscuro-70)' }}>
                    {v.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
