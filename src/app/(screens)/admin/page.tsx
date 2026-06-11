'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '../../components/layouts/AdminLayout';
import Card from '../../components/ui/Card';
import { getProductosParaDashboard } from '../../services/productos';
import {
  AlertTriangle,
  BadgeDollarSign,
  Package,
  CircleX,
} from 'lucide-react';

function precioANumero(precio: string | undefined): number {
  if (!precio) return 0;
  const s = String(precio).replace(/[^0-9.,]/g, '').replace(',', '.');
  return parseFloat(s) || 0;
}

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
      <div className="w-full max-w-none">

        {/* Header con identidad de admin */}
        <header
          className="rounded-2xl mb-8 px-6 py-8"
          style={{
            background: 'linear-gradient(135deg, var(--header-footer) 0%, var(--menu-texto-principal) 100%)',
            color: 'var(--texto-fondo-oscuro)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            animation: 'fadeUp 400ms ease-out both',
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
            <Card className="transition-all duration-200 hover:shadow-lg" variant="elevated" padding="lg" style={{ animation: 'fadeUp 400ms ease-out 80ms both' }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                  <Package size={22} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Total productos</p>
                  {loading ? (
                    <div className="h-9 w-16 rounded bg-current opacity-20 animate-pulse mt-1" />
                  ) : (
                    <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{totalProductos}</p>
                  )}
                </div>
              </div>
            </Card>
            <Card className="transition-all duration-200 hover:shadow-lg" variant="elevated" padding="lg" style={{ animation: 'fadeUp 400ms ease-out 160ms both' }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(217, 142, 4, 0.2)' }}>
                  <AlertTriangle size={22} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Stock bajo (≤5)</p>
                  {loading ? (
                    <div className="h-9 w-12 rounded bg-current opacity-20 animate-pulse mt-1" />
                  ) : (
                    <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--warning)' }}>{stockBajo}</p>
                  )}
                </div>
              </div>
            </Card>
            <Card className="transition-all duration-200 hover:shadow-lg" variant="elevated" padding="lg" style={{ animation: 'fadeUp 400ms ease-out 240ms both' }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(89, 12, 12, 0.15)' }}>
                  <CircleX size={22} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Sin stock</p>
                  {loading ? (
                    <div className="h-9 w-12 rounded bg-current opacity-20 animate-pulse mt-1" />
                  ) : (
                    <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--danger)' }}>{sinStock}</p>
                  )}
                </div>
              </div>
            </Card>
            <Card className="transition-all duration-200 hover:shadow-lg" variant="elevated" padding="lg" style={{ animation: 'fadeUp 400ms ease-out 320ms both' }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(110, 125, 87, 0.25)' }}>
                  <BadgeDollarSign size={22} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Valor inventario</p>
                  {loading ? (
                    <div className="h-9 w-24 rounded bg-current opacity-20 animate-pulse mt-1" />
                  ) : (
                    <p className="text-xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>${valorInventario.toLocaleString('es-MX')}</p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </section>

      </div>
    </AdminLayout>
  );
}
