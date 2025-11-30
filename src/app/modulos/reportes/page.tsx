'use client';

import ModuleLayout from '../../components/layouts/ModuleLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import { colors } from '../../utils/colors';

export default function ReportesPage() {
  return (
    <ModuleLayout>
      <PageHeader
        title="Reportes"
        subtitle="Genera reportes automáticos y personalizados sobre las operaciones del negocio"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: colors.encabezadosAlterno }}>Ventas del Mes</p>
            <p className="text-3xl font-bold" style={{ color: colors.menuTextoPrincipal }}>$45,000</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: colors.encabezadosAlterno }}>Servicios del Mes</p>
            <p className="text-3xl font-bold" style={{ color: colors.menuTextoPrincipal }}>120</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: colors.encabezadosAlterno }}>Clientes Nuevos</p>
            <p className="text-3xl font-bold" style={{ color: colors.menuTextoPrincipal }}>25</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: colors.encabezadosAlterno }}>Productos Vendidos</p>
            <p className="text-3xl font-bold" style={{ color: colors.menuTextoPrincipal }}>85</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
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

        <Card>
          <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
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
                style={{ backgroundColor: colors.fondosSuaves }}
              >
                <div>
                  <p className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                    {reporte.nombre}
                  </p>
                  <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                    {reporte.fecha} • {reporte.tipo}
                  </p>
                </div>
                <Button size="sm" variant="outline">Descargar</Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </ModuleLayout>
  );
}

