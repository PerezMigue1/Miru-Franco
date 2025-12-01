'use client';

import { useState, useEffect } from 'react';
import { colors } from '../../utils/colors';

export default function Carousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Imágenes - usar rutas locales
  const slides = [
    {
      image: '/images/carousel/slide1.jpg',
      title: 'Bienvenido a Miru Franco',
      subtitle: 'A solo minutos encuentras productos de calidad profesional. Descubre la magia del cuidado capilar con experiencias auténticas y personalizadas.',
    },
    {
      image: '/images/carousel/slide2.jpg',
      title: 'Productos Premium',
      subtitle: 'Líneas especializadas para cada tipo de cabello. Ingredientes naturales que nutren y protegen tu melena.',
    },
    {
      image: '/images/carousel/slide3.jpg',
      title: 'Servicios Profesionales',
      subtitle: 'Equipo experto dedicado a realzar tu belleza. Transformamos tu look con técnicas modernas y tradicionales.',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [slides.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ marginTop: '104px' }}>
      {/* Imágenes del carrusel */}
      <div className="relative w-full h-full">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="absolute inset-0 bg-black/60 z-10" />
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover"
            />
            
            {/* Contenido del slide */}
            {index === currentIndex && (
              <div className="absolute inset-0 z-20 flex items-center justify-center px-4">
                <div 
                  className="max-w-4xl w-full rounded-xl p-8 md:p-12 text-center transform transition-all duration-1000"
                  style={{ backgroundColor: '#710014' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#A64B63'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#710014'}
                >
                  <h2 className="text-elegant-display mb-4 uppercase" style={{ color: colors.fondosSuaves }}>
                    {slide.title}
                  </h2>
                  <p className="text-lead mb-4" style={{ color: '#F2F1ED' }}>
                    {slide.subtitle.split('.')[0]}
                  </p>
                  {slide.subtitle.includes('.') && slide.subtitle.split('.').length > 1 && (
                    <p className="text-base mb-8" style={{ color: '#F2F1ED' }}>
                      {slide.subtitle.split('.').slice(1).join('.')}
                    </p>
                  )}
                  <button
                    className="px-8 py-3 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#2A2A2A', color: '#F2F1ED' }}
                  >
                    Explorar {slide.title.split(' ')[0]}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Botones de navegación */}
      <button
        onClick={goToPrevious}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full hover:opacity-80 transition-all duration-300 shadow-lg"
        style={{ backgroundColor: 'rgba(242, 241, 237, 0.9)', color: '#161616' }}
        aria-label="Imagen anterior"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={goToNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full hover:opacity-80 transition-all duration-300 shadow-lg"
        style={{ backgroundColor: 'rgba(242, 241, 237, 0.9)', color: '#161616' }}
        aria-label="Siguiente imagen"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Indicadores */}
      <div       className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex space-x-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`transition-all duration-300 rounded-full ${
              index === currentIndex ? 'w-8 h-2' : 'w-2 h-2 opacity-50 hover:opacity-75'
            }`}
            style={{
              backgroundColor: index === currentIndex ? '#F2F1ED' : 'rgba(242, 241, 237, 0.5)',
            }}
            aria-label={`Ir a slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

