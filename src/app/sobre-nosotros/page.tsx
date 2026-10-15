import Header from '../layouts/Header';
import Footer from '../layouts/Footer';
import Image from 'next/image';
import { metadataPublica } from '../utils/seo';
import SuperficieCliente from '../components/cliente/SuperficieCliente';
import { getServicios } from '../services/servicios';
import { cifraServiciosDisponibles } from '../utils/serviciosDisponibles';
import { obtenerConfiguracionPublica } from '../services/configuracionSitio';
import { listarEquipoPublico } from '../services/contenido';

export const metadata = metadataPublica({
  title: 'Sobre nosotros',
  description:
    'Conoce tu salón de belleza en Huejutla de Reyes: quiénes somos, nuestros valores y cómo agendar tu cita.',
  path: '/sobre-nosotros',
});



export default async function SobreNosotrosPage() {
  // Solo cifras con respaldo: el conteo real del catálogo (si el API falla, se oculta). Años, número de
  // clientas y una "satisfacción garantizada" no tienen fuente ni política definida: no se anuncian.
  const [{ data: servicios, error }, config, { data: equipo }] = await Promise.all([getServicios(), obtenerConfiguracionPublica(), listarEquipoPublico()]);
  // Historia, imagen y valores: Configuración del sitio (contenido de "Sobre nosotros").
  const { titulo, parrafos, imagen, valores } = config.contenido.sobreNosotros;
  const cifraServicios = error ? null : cifraServiciosDisponibles(servicios);

  return (
    <SuperficieCliente className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--fondo-general)' }}>
      <Header />
      <main className="flex-1" style={{ marginTop: 'var(--mf-header-offset, 104px)' }}>

        {/* Hero */}
        <section className="py-16 md:py-24 layout-gutter-x" style={{ backgroundColor: 'var(--mf-banda)' }}>
          <div className="container-max mf-entrada">
            <h1 className="text-elegant-hero hyphens-none" style={{ color: 'var(--texto-fondo-oscuro)', letterSpacing: '-0.02em' }}>
              Sobre nosotros
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
                {titulo}
              </h2>
              {parrafos.map((parrafo, n) => (
                <p
                  key={n}
                  className={`text-base leading-relaxed ${n < parrafos.length - 1 ? 'mb-4' : ''}`}
                  style={{ color: n === 0 ? 'var(--encabezados-alterno)' : 'var(--texto-secundario)' }}
                >
                  {parrafo}
                </p>
              ))}
              {/* Cifra real del catálogo, dentro de la historia: sola en una banda completa se fundía en
                  oscuro con "Nuestros Valores" y el pie. Sin ella (API caído) no queda hueco. */}
              {cifraServicios && (
                <p className="mt-8 flex items-baseline gap-3 border-t pt-6" style={{ borderColor: 'var(--mf-linea-fuerte)' }}>
                  <span
                    className="mf-cifras text-4xl font-bold"
                    style={{ color: 'var(--menu-texto-principal)', fontFamily: 'var(--font-family-serif)' }}
                  >
                    {cifraServicios.num}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                    {cifraServicios.label}
                  </span>
                </p>
              )}
            </div>
            <div className="mf-revelar flex justify-center">
              {/* Arco: eco de la forma del monograma */}
              <div
                className="relative w-64 sm:w-80 aspect-[4/5] rounded-t-full overflow-hidden"
                style={{ backgroundColor: 'var(--mf-banda)', boxShadow: 'var(--mf-sombra-2)', outline: '1px solid var(--oro-55)', outlineOffset: '10px' }}
              >
                <Image
                  src={imagen || '/logo-miru.jpg'}
                  alt={imagen ? 'El salón' : config.salon.nombre}
                  fill
                  className={imagen ? 'object-cover' : 'object-contain p-10'}
                  sizes="(max-width: 640px) 256px, 320px"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Equipo: los perfiles que Admin > Contenido marca para mostrar (sin equipo publicado, no hay sección) */}
        {equipo.length > 0 && (
          <section className="section-padding" style={{ backgroundColor: 'var(--fondo-general)' }}>
            <div className="container-max">
              <h2 className="mf-revelar text-elegant-title mb-10 hyphens-none" style={{ color: 'var(--encabezados-alterno)' }}>
                Nuestro equipo
              </h2>
              <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {equipo.map((p) => (
                  <li key={p.nombre} className="mf-revelar">
                    <div className="relative mb-4 aspect-[4/5] w-full overflow-hidden rounded-[14px]" style={{ backgroundColor: 'var(--mf-banda)', boxShadow: 'var(--mf-sombra-1)' }}>
                      <Image src={p.foto || '/logo-miru.jpg'} alt={p.foto ? p.nombre : ''} fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw" className={p.foto ? 'object-cover' : 'object-contain p-10'} />
                    </div>
                    <h3 className="text-xl font-semibold" style={{ color: 'var(--menu-texto-principal)', fontFamily: 'var(--font-family-serif)' }}>
                      {p.nombre}
                    </h3>
                    <p className="text-sm font-semibold" style={{ color: 'var(--encabezados-alterno)' }}>
                      {p.puesto}
                    </p>
                    {p.bio && (
                      <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--texto-secundario)' }}>
                        {p.bio}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Valores */}
        <section className="py-20 md:py-28 layout-gutter-x" style={{ backgroundColor: 'var(--mf-banda)' }}>
          <div className="container-max">
            <div className="mf-revelar mb-12">
              <h2 className="text-elegant-title hyphens-none" style={{ color: 'var(--texto-fondo-oscuro)', letterSpacing: '-0.02em' }}>
                Nuestros Valores
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-10">
              {valores.map((v) => (
                <div key={v.titulo} className="mf-revelar border-t pt-6" style={{ borderColor: 'var(--oro-45)' }}>
                  <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--oro-sobre-carbon)', fontFamily: 'var(--font-family-serif)' }}>
                    {v.titulo}
                  </h3>
                  <p className="text-base leading-relaxed max-w-[52ch]" style={{ color: 'var(--texto-fondo-oscuro-80)' }}>
                    {v.descripcion}
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
