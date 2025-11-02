'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-auto" style={{ backgroundColor: '#161616' }}>
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Columna 1: Información */}
          <div className="md:col-span-1">
            <h3 className="text-2xl font-bold mb-4" style={{ color: '#F2F1ED' }}>
              <span style={{ color: '#710014' }}>Miru</span> Franco
            </h3>
            <p className="text-sm mb-4" style={{ color: 'rgba(242,241,237,0.7)' }}>
              Tu tienda de confianza para productos capilares de calidad. Transformamos tu belleza con dedicación y profesionalismo.
            </p>
            {/* Redes Sociales */}
            <div className="flex space-x-4">
              <a href="#" className="p-2 rounded-full hover:opacity-80 transition-opacity" style={{ backgroundColor: 'rgba(242,241,237,0.1)', color: '#243B5A' }}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="#" className="p-2 rounded-full hover:opacity-80 transition-opacity" style={{ backgroundColor: 'rgba(242,241,237,0.1)', color: '#243B5A' }}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href="#" className="p-2 rounded-full hover:opacity-80 transition-opacity" style={{ backgroundColor: 'rgba(242,241,237,0.1)', color: '#243B5A' }}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Columna 2: Enlaces rápidos */}
          <div>
            <h4 className="text-lg font-semibold mb-4" style={{ color: '#F2F1ED' }}>
              Enlaces Rápidos
            </h4>
            <ul className="space-y-3">
              {['Inicio', 'Productos', 'Servicios', 'Sobre Nosotros', 'Contacto'].map((item) => (
                <li key={item}>
                  <Link 
                    href={`/${item.toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-sm hover:opacity-80 transition-opacity flex items-center gap-2 group"
                    style={{ color: '#243B5A' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#A64B63'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#243B5A'}
                  >
                    <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Columna 3: Servicios */}
          <div>
            <h4 className="text-lg font-semibold mb-4" style={{ color: '#F2F1ED' }}>
              Servicios
            </h4>
            <ul className="space-y-3 text-sm" style={{ color: 'rgba(242,241,237,0.7)' }}>
              <li>Cortes de Cabello</li>
              <li>Tratamientos Capilares</li>
              <li>Coloración Profesional</li>
              <li>Peinados Especiales</li>
              <li>Productos Personalizados</li>
            </ul>
          </div>

          {/* Columna 4: Contacto */}
          <div>
            <h4 className="text-lg font-semibold mb-4" style={{ color: '#F2F1ED' }}>
              Contacto
            </h4>
            <ul className="space-y-3 text-sm" style={{ color: 'rgba(242,241,237,0.7)' }}>
              <li className="flex items-start gap-2">
                <span>📍</span>
                <span>Tu dirección aquí, Ciudad, País</span>
              </li>
              <li className="flex items-center gap-2">
                <span>📧</span>
                <a href="mailto:contacto@mirufranco.com" className="hover:opacity-80 transition-opacity" style={{ color: '#243B5A' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#A64B63'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#243B5A'}
                >
                  contacto@mirufranco.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <span>📞</span>
                <a href="tel:+521234567890" className="hover:opacity-80 transition-opacity" style={{ color: '#243B5A' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#A64B63'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#243B5A'}
                >
                  +52 123 456 7890
                </a>
              </li>
              <li className="flex items-center gap-2">
                <span>🕒</span>
                <span>Lun - Sáb: 9:00 AM - 8:00 PM</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t pt-6" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-center" style={{ color: 'rgba(242,241,237,0.7)' }}>
              © {new Date().getFullYear()} Miru Franco. Todos los derechos reservados.
            </p>
            <div className="flex gap-6 text-sm">
              <Link href="/politica-privacidad" className="hover:opacity-80 transition-opacity" style={{ color: '#243B5A' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#A64B63'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#243B5A'}
              >
                Política de Privacidad
              </Link>
              <Link href="/terminos" className="hover:opacity-80 transition-opacity" style={{ color: '#243B5A' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#A64B63'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#243B5A'}
              >
                Términos y Condiciones
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

