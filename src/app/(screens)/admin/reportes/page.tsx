'use client';

import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import { BarChart3, Scissors, UserPlus, ShoppingBag } from 'lucide-react';

export default function ReportesPage() {
  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div>
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
            Reportes
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
            Genera reportes automáticos y personalizados sobre las operaciones del negocio
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <BarChart3 size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Ventas del Mes</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--oro-texto)' }}>$45,000</p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <Scissors size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Servicios del Mes</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>120</p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <UserPlus size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Clientes Nuevos</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>25</p>
              </div>
            </div>
          </Card>
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <ShoppingBag size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Productos Vendidos</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>85</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Generar Reporte
          </h2>
          <div className="space-y-4">
            <Select
              label="Tipo de Reporte"
              options={[
                { value: 'ventas', label: 'Reporte de Ventas' },
                { value: 'servicios', label: 'Reporte de Servicios' },
                { value: 'inventario', label: 'Reporte de Inventario' },
                { value: 'clientes', label: 'Reporte de Clientes' },
                { value: 'personal', label: 'Reporte de Personal' },
                { value: 'facturacion', label: 'Reporte de Facturación' },
                { value: 'mermas', label: 'Mermas y Caducidades' },
              ]}
              fullWidth
            />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Fecha Inicio" type="date" fullWidth />
              <Input label="Fecha Fin" type="date" fullWidth />
            </div>
            <Select
              label="Formato"
              options={[
                { value: 'pdf', label: 'PDF' },
                { value: 'excel', label: 'Excel' },
                { value: 'csv', label: 'CSV' },
              ]}
              fullWidth
            />
            <Button fullWidth>Generar Reporte</Button>
          </div>
        </Card>

        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Reportes Recientes
          </h2>
          <div className="space-y-3">
            {[
              { nombre: 'Ventas Enero 2024', fecha: '2024-01-15', tipo: 'PDF' },
              { nombre: 'Servicios Semana 2', fecha: '2024-01-14', tipo: 'Excel' },
              { nombre: 'Inventario Actual', fecha: '2024-01-13', tipo: 'PDF' },
            ].map((reporte, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: 'var(--fondos-suaves)' }}
              >
                <div>
                  <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                    {reporte.nombre}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                    {reporte.fecha} • {reporte.tipo}
                  </p>
                </div>
                <Button size="sm" variant="outline">Descargar</Button>
              </div>
            ))}
          </div>
        </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

