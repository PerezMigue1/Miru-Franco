'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '../../components/layouts/AdminLayout';
import Card from '../../components/ui/Card';
import { getProductosParaDashboard } from '../../services/productos';

function precioANumero(precio: string | undefined): number {
  if (!precio) return 0;
  const s = String(precio).replace(/[^0-9.,]/g, '').replace(',', '.');
  return parseFloat(s) || 0;
}

const GRUPOS_ACCESOS: { titulo: string; items: { label: string; href: string; icon: string; description?: string }[] }[] = [
  {
    titulo: 'Ventas e inventario',
    items: [
      { label: 'Inventario', href: '/admin/inventario', icon: '📦', description: 'Productos y stock' },
      { label: 'Venta local', href: '/admin/venta-local', icon: '🏪', description: 'Punto de venta' },
      { label: 'Venta online', href: '/admin/venta-online', icon: '🛒', description: 'Pedidos tienda' },
      { label: 'Servicios', href: '/admin/servicios', icon: '💇‍♀️', description: 'Catálogo de servicios' },
    ],
  },
  {
    titulo: 'Clientes y agenda',
    items: [
      { label: 'Clientes CRM', href: '/admin/clientes-crm', icon: '👥', description: 'Gestión de clientes' },
      { label: 'Gestión de citas', href: '/admin/gestion-citas', icon: '📅', description: 'Agenda y citas (vista admin)' },
    ],
  },
  {
    titulo: 'Compras y logística',
    items: [
      { label: 'Compras a proveedores', href: '/admin/compras-proveedores', icon: '🛒', description: 'Órdenes de compra' },
      { label: 'Control de caducidad', href: '/admin/control-caducidad', icon: '📆', description: 'Productos por vencer' },
      { label: 'Entregas y envíos', href: '/admin/entregas-envios', icon: '📦', description: 'Envíos y entregas' },
    ],
  },
  {
    titulo: 'Atención al cliente',
    items: [
      { label: 'Devoluciones y cambios', href: '/admin/devoluciones-cambios', icon: '↩️', description: 'Devoluciones' },
      { label: 'Quejas y garantías', href: '/admin/quejas-garantias', icon: '🛡️', description: 'Garantías y quejas' },
      { label: 'Cotizaciones y eventos', href: '/admin/cotizaciones-eventos', icon: '📝', description: 'Cotizaciones' },
    ],
  },
  {
    titulo: 'Finanzas y reportes',
    items: [
      { label: 'Reportes', href: '/admin/reportes', icon: '📊', description: 'Estadísticas' },
      { label: 'Facturación', href: '/admin/facturacion', icon: '🧾', description: 'Facturas' },
      { label: 'Pagos', href: '/admin/pagos', icon: '💳', description: 'Cobros y pagos' },
    ],
  },
  {
    titulo: 'Marketing y personal',
    items: [
      { label: 'Marketing', href: '/admin/marketing', icon: '📢', description: 'Promociones y campañas' },
      { label: 'Gestión de personal', href: '/admin/gestion-personal', icon: '👤', description: 'Empleados y horarios' },
    ],
  },
  {
    titulo: 'Configuración',
    items: [
      { label: 'Usuarios y roles', href: '/admin/usuarios-roles', icon: '🔐', description: 'Permisos' },
      { label: 'Proveedores', href: '/admin/proveedores', icon: '🚚', description: 'Proveedores' },
      { label: 'Notificaciones', href: '/admin/notificaciones', icon: '🔔', description: 'Avisos' },
      { label: 'Base de datos', href: '/admin/base-datos', icon: '🗄️', description: 'Importar, exportar y gestionar datos' },
    ],
  },
];

export default function AdminDashboardPage() {
  const [productos, setProductos] = useState<Awaited<ReturnType<typeof getProductosParaDashboard>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getProductosParaDashboard()
      .then((data) => {
        if (!cancelled) setProductos(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalProductos = productos.length;
  const stockBajo = productos.filter((p) => { const t = p.stockCantidad ?? 0; return t > 0 && t <= 5; }).length;
  const sinStock = productos.filter((p) => (p.stockCantidad ?? 0) === 0).length;
  const valorInventario = productos.reduce(
    (acc, p) =>
      acc +
      (p.presentaciones ?? []).reduce(
        (s, pr) => s + precioANumero(pr.precio) * pr.stock,
        0
      ),
    0
  );

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header con identidad de admin */}
        <header
          className="rounded-2xl mb-8 px-6 py-8"
          style={{
            background: 'linear-gradient(135deg, var(--header-footer) 0%, var(--menu-texto-principal) 100%)',
            color: 'var(--texto-fondo-oscuro)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}
        >
          <p className="text-sm font-medium uppercase tracking-wider opacity-80 mb-1">Panel de administración</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Resumen del negocio</h1>
          <p className="text-base opacity-90 max-w-xl">
            Accede a inventario, ventas, clientes y reportes desde un solo lugar.
          </p>
        </header>

        {/* KPIs inventario */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
              Resumen de inventario
            </h2>
            <Link
              href="/admin/inventario"
              className="text-sm font-medium transition-opacity hover:opacity-80"
              style={{ color: 'var(--hover)' }}
            >
              Ver inventario completo →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="transition-all duration-200 hover:shadow-lg" variant="elevated" padding="lg">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                  style={{ backgroundColor: 'var(--fondos-suaves)' }}
                >
                  📦
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>
                    Total productos
                  </p>
                  {loading ? (
                    <div className="h-9 w-16 rounded bg-current opacity-20 animate-pulse mt-1" />
                  ) : (
                    <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>
                      {totalProductos}
                    </p>
                  )}
                </div>
              </div>
            </Card>
            <Card className="transition-all duration-200 hover:shadow-lg" variant="elevated" padding="lg">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                  style={{ backgroundColor: 'rgba(217, 142, 4, 0.2)' }}
                >
                  ⚠️
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>
                    Stock bajo (≤5)
                  </p>
                  {loading ? (
                    <div className="h-9 w-12 rounded bg-current opacity-20 animate-pulse mt-1" />
                  ) : (
                    <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--warning)' }}>
                      {stockBajo}
                    </p>
                  )}
                </div>
              </div>
            </Card>
            <Card className="transition-all duration-200 hover:shadow-lg" variant="elevated" padding="lg">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                  style={{ backgroundColor: 'rgba(89, 12, 12, 0.15)' }}
                >
                  🚫
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>
                    Sin stock
                  </p>
                  {loading ? (
                    <div className="h-9 w-12 rounded bg-current opacity-20 animate-pulse mt-1" />
                  ) : (
                    <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--danger)' }}>
                      {sinStock}
                    </p>
                  )}
                </div>
              </div>
            </Card>
            <Card className="transition-all duration-200 hover:shadow-lg" variant="elevated" padding="lg">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                  style={{ backgroundColor: 'rgba(110, 125, 87, 0.25)' }}
                >
                  💰
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>
                    Valor inventario
                  </p>
                  {loading ? (
                    <div className="h-9 w-24 rounded bg-current opacity-20 animate-pulse mt-1" />
                  ) : (
                    <p className="text-xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>
                      ${valorInventario.toLocaleString('es-MX')}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Accesos rápidos por grupo */}
        <section>
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--menu-texto-principal)' }}>
            Accesos rápidos
          </h2>
          <div className="space-y-8">
            {GRUPOS_ACCESOS.map((grupo) => (
              <div key={grupo.titulo}>
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--encabezados-alterno)' }}>
                  {grupo.titulo}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {grupo.items.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <Card
                        className="h-full transition-all duration-200 hover:shadow-md cursor-pointer group"
                        variant="elevated"
                        padding="md"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-2xl shrink-0 transition-transform group-hover:scale-110" aria-hidden>
                            {item.icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                              {item.label}
                            </p>
                            {item.description && (
                              <p className="text-xs mt-0.5" style={{ color: 'var(--encabezados-alterno)' }}>
                                {item.description}
                              </p>
                            )}
                          </div>
                          <span className="text-lg opacity-0 group-hover:opacity-100 transition-opacity shrink-0" style={{ color: 'var(--hover)' }}>
                            →
                          </span>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
