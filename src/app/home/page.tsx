'use client';

import Header from '../layouts/Header';
import Carousel from '../components/ui/Carousel';
import Footer from '../layouts/Footer';

export default function Home() {
  const productos = [
    { nombre: 'Shampoo Premium', descripcion: 'Limpieza profunda y cuidado intensivo', icono: '🧴' },
    { nombre: 'Acondicionador', descripcion: 'Suavidad y brillo para tu cabello', icono: '💧' },
    { nombre: 'Mascarilla Capilar', descripcion: 'Tratamiento reparador y nutritivo', icono: '✨' },
    { nombre: 'Aceites Naturales', descripcion: 'Hidratación y crecimiento saludable', icono: '🌿' },
  ];

  const servicios = [
    { nombre: 'Corte de Cabello', descripcion: 'Estilos modernos y clásicos', icono: '✂️' },
    { nombre: 'Coloración', descripcion: 'Técnicas profesionales de color', icono: '🎨' },
    { nombre: 'Tratamientos', descripcion: 'Rejuvenecimiento y reparación', icono: '💆‍♀️' },
    { nombre: 'Peinados', descripcion: 'Para ocasiones especiales', icono: '💇‍♀️' },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#d0b29c' }}>
      <Header />
      
      <main className="flex-1">
        {/* Carrusel */}
        <Carousel />

        {/* Sección 1: Productos */}
        <section className="py-20" style={{ backgroundColor: '#d0b29c' }}>
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-hero mb-4" style={{ color: '#161616' }}>
                Nuestros Productos
              </h2>
              <p className="text-lead" style={{ color: '#161616' }}>
                Descubre nuestra amplia gama de productos capilares de alta calidad.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {productos.map((producto, index) => (
                <div
                  key={index}
                  className="rounded-lg shadow-lg p-6 border hover:scale-105 transition-transform duration-300 cursor-pointer"
                  style={{ backgroundColor: '#B38E6F', borderColor: 'rgba(255,255,255,0.1)' }}
                >
                  <div className="text-5xl mb-4 text-center">{producto.icono}</div>
                  <h3 className="text-subtitle mb-2 text-center" style={{ color: '#F2F1ED' }}>
                    {producto.nombre}
                  </h3>
                  <p className="text-sm text-center" style={{ color: 'rgba(242,241,237,0.7)' }}>
                    {producto.descripcion}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sección 2: Servicios */}
        <section className="py-20" style={{ backgroundColor: '#2A2A2A' }}>
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-hero-light mb-4" style={{ color: '#F2F1ED' }}>
                Nuestros Servicios
              </h2>
              <p className="text-lead" style={{ color: '#F2F1ED' }}>
                Ofrecemos servicios profesionales para el cuidado de tu cabello.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {servicios.map((servicio, index) => (
                <div
                  key={index}
                  className="rounded-lg shadow-lg p-6 border hover:scale-105 transition-transform duration-300 cursor-pointer"
                  style={{ backgroundColor: 'rgba(242,241,237,0.1)', borderColor: 'rgba(255,255,255,0.2)' }}
                >
                  <div className="text-5xl mb-4 text-center">{servicio.icono}</div>
                  <h3 className="text-subtitle mb-2 text-center" style={{ color: '#F2F1ED' }}>
                  {servicio.nombre}
                  </h3>
                  <p className="text-sm text-center" style={{ color: 'rgba(242,241,237,0.7)' }}>
                    {servicio.descripcion}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sección 3: Sobre Nosotros */}
        <section className="py-20" style={{ backgroundColor: '#C8A48A' }}>
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="rounded-lg shadow-lg p-8 border text-center" style={{ backgroundColor: '#B38E6F', borderColor: 'rgba(255,255,255,0.1)' }}>
                <h2 className="text-elegant-title mb-4" style={{ color: '#F2F1ED' }}>
                  Sobre Nosotros
                </h2>
                <p className="text-lead mb-6" style={{ color: '#F2F1ED' }}>
                  En Miru Franco, nos dedicamos a realzar tu belleza natural con productos y servicios de la más alta calidad. 
                  Nuestro equipo de profesionales está comprometido a brindarte una experiencia excepcional.
                </p>
                <p className="text-elegant-quote mb-8" style={{ color: 'rgba(242,241,237,0.9)' }}>
                  Con años de experiencia en el cuidado capilar, combinamos técnicas tradicionales con innovaciones modernas 
                  para ofrecerte resultados que superen tus expectativas.
                </p>
                <button
                  className="px-8 py-3 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#710014', color: '#F2F1ED' }}
                >
                  Conoce Más
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Sección 4: CTA */}
        <section className="py-20" style={{ backgroundColor: '#2A2A2A' }}>
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center rounded-lg shadow-lg p-8 border" style={{ backgroundColor: 'rgba(242,241,237,0.1)', borderColor: 'rgba(255,255,255,0.2)' }}>
              <h2 className="text-hero-light mb-4" style={{ color: '#F2F1ED' }}>
                ¿Listo para Transformar tu Look?
              </h2>
              <p className="text-lead mb-8" style={{ color: 'rgba(242,241,237,0.8)' }}>
                Agenda una cita con nosotros y descubre la diferencia que hace la calidad profesional.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  className="px-8 py-3 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#710014', color: '#F2F1ED' }}
                >
                  Agendar Cita
                </button>
                <button
                  className="px-8 py-3 rounded-lg font-semibold text-lg hover:opacity-80 transition-opacity border"
                  style={{ borderColor: 'rgba(242,241,237,0.3)', color: '#F2F1ED' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#A64B63'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Ver Catálogo
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
