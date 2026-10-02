import Header from '../layouts/Header';
import Footer from '../layouts/Footer';
import Image from 'next/image';
import { metadataPublica } from '../utils/seo';
import SuperficieCliente from '../components/cliente/SuperficieCliente';

export const metadata = metadataPublica({
  title: 'Sobre nosotros',
  description:
    'Conoce la historia, los valores y el equipo detrás de Mirú Franco Beauty Salón, tu salón de belleza profesional en Huejutla de Reyes.',
  path: '/sobre-nosotros',
});

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
    <SuperficieCliente className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--fondo-general)' }}>
      <Header />
      <main className="flex-1" style={{ marginTop: 'var(--mf-header-offset, 104px)' }}>

        {/* Hero */}
        <section className="py-16 md:py-24 layout-gutter-x" style={{ backgroundColor: 'var(--mf-banda)' }}>
          <div className="container-max mf-entrada">
            <h1 className="text-elegant-hero hyphens-none" style={{ color: 'var(--texto-fondo-oscuro)', letterSpacing: '-0.02em' }}>
              Sobre Nosotros
            </h1>
            <div className="flex items-center gap-3 mt-5" aria-hidden>
              <span className="hero-flourish" />
              <span className="hero-ornament" />
            </div>
          </div>
        </section>

        {/* Historia */}
        <section className="section-padding" style={{ backgroundColor: 'var(--fondo-general)' }}>
          <div className="container-max grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="mf-revelar max-w-[62ch]">
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
            <div className="mf-revelar flex justify-center">
              {/* Arco: eco de la forma del monograma */}
              <div
                className="relative w-64 sm:w-80 aspect-[4/5] rounded-t-full overflow-hidden"
                style={{ backgroundColor: 'var(--mf-banda)', boxShadow: 'var(--mf-sombra-2)', outline: '1px solid rgba(159, 109, 31, 0.55)', outlineOffset: '10px' }}
              >
                <Image
                  src="/logo-miru.jpg"
                  alt="Mirú Franco"
                  fill
                  className="object-contain p-10"
                  sizes="(max-width: 640px) 256px, 320px"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-14 md:py-16 layout-gutter-x" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
          <div className="container-max">
            <div className="mf-revelar grid grid-cols-2 sm:grid-cols-4 gap-y-8">
              {STATS.map((stat, i) => (
                <div
                  key={stat.label}
                  className={`px-4 sm:px-8 ${i % 2 === 0 ? 'border-r' : ''} sm:border-r sm:last:border-r-0`}
                  style={{ borderColor: 'var(--mf-linea)' }}
                >
                  <p
                    className="mf-cifras text-4xl md:text-5xl font-bold mb-2"
                    style={{ color: 'var(--menu-texto-principal)', fontFamily: 'var(--font-family-serif)' }}
                  >
                    {stat.num}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Valores */}
        <section className="py-20 md:py-28 layout-gutter-x" style={{ backgroundColor: 'var(--mf-banda)' }}>
          <div className="container-max">
            <div className="mf-revelar mb-12">
              <h2 className="text-elegant-title hyphens-none" style={{ color: 'var(--texto-fondo-oscuro)', letterSpacing: '-0.02em' }}>
                Nuestros Valores
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-10">
              {VALORES.map((v) => (
                <div key={v.titulo} className="mf-revelar border-t pt-6" style={{ borderColor: 'rgba(159, 109, 31, 0.45)' }}>
                  <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--oro-sobre-carbon)', fontFamily: 'var(--font-family-serif)' }}>
                    {v.titulo}
                  </h3>
                  <p className="text-base leading-relaxed max-w-[52ch]" style={{ color: 'var(--texto-fondo-oscuro-80)' }}>
                    {v.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </SuperficieCliente>
  );
}
