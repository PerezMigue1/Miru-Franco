'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PublicLayout from '../../components/layouts/PublicLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import { colors } from '../../utils/colors';
import { getCategoryColor } from '../../utils/categoryColors';

export default function ProductosClientePage() {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState('');

  const productos = [
    { id: 1, nombre: 'Shampoo Avina', precio: '$350', categoria: 'Cuidado', descripcion: 'Limpieza profunda y cuidado intensivo', stock: true, imagen: '🧴' },
    { id: 2, nombre: 'Acondicionador Tech Italy', precio: '$380', categoria: 'Cuidado', descripcion: 'Suavidad y brillo para tu cabello', stock: true, imagen: '💧' },
    { id: 3, nombre: 'Mascarilla Alfaparf', precio: '$450', categoria: 'Tratamiento', descripcion: 'Tratamiento reparador y nutritivo', stock: true, imagen: '✨' },
    { id: 4, nombre: 'Aceites Naturales Floractiv', precio: '$280', categoria: 'Tratamiento', descripcion: 'Hidratación y crecimiento saludable', stock: true, imagen: '🌿' },
    { id: 5, nombre: 'Serum Reparador', precio: '$320', categoria: 'Tratamiento', descripcion: 'Reparación intensiva para cabello dañado', stock: false, imagen: '💫' },
    { id: 6, nombre: 'Spray Protector Térmico', precio: '$250', categoria: 'Cuidado', descripcion: 'Protección contra el calor de planchas y secadores', stock: true, imagen: '🔥' },
  ];

  const productosFiltrados = productos.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.categoria.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12" style={{ marginTop: '136px' }}>
        <div className="text-center mb-12">
          <h1 className="text-hero mb-4" style={{ color: colors.menuTextoPrincipal }}>
            Catálogo de Productos
          </h1>
          <p className="text-lead max-w-2xl mx-auto mb-6" style={{ color: colors.encabezadosAlterno }}>
            Productos profesionales de las mejores marcas para el cuidado de tu cabello
          </p>
          <div className="max-w-md mx-auto">
            <Input
              placeholder="Buscar productos..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              fullWidth
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {productosFiltrados.map((producto) => (
            <Card 
              key={producto.id} 
              variant="elevated"
              className="cursor-pointer transition-transform hover:scale-105"
              onClick={() => router.push(`/cliente/productos/${producto.id}`)}
            >
              <div className="text-center mb-4">
                <div className="text-6xl mb-4">{producto.imagen}</div>
                <h3 className="text-subtitle mb-2" style={{ color: colors.textoFondoOscuro }}>
                  {producto.nombre}
                </h3>
                <Badge variant={getCategoryColor(producto.categoria)} size="sm">
                  {producto.categoria}
                </Badge>
              </div>
              <p className="text-sm mb-4 text-center" style={{ color: colors.textoFondoOscuro }}>
                {producto.descripcion}
              </p>
              <div className="flex items-center justify-between mb-4">
                <p className="text-2xl font-bold" style={{ color: colors.textoFondoOscuro }}>
                  {producto.precio}
                </p>
                {!producto.stock && (
                  <Badge variant="warning" size="sm">Agotado</Badge>
                )}
              </div>
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Button 
                  fullWidth 
                  variant="outline"
                  onClick={() => router.push(`/cliente/productos/${producto.id}`)}
                >
                  Ver Detalles
                </Button>
                <Button 
                  fullWidth 
                  disabled={!producto.stock}
                  onClick={() => {
                    if (producto.stock) {
                      // En producción, esto agregaría al carrito
                      alert(`Producto "${producto.nombre}" agregado al carrito`);
                      router.push('/cliente/carrito');
                    }
                  }}
                >
                  {producto.stock ? 'Agregar al Carrito' : 'No Disponible'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}

