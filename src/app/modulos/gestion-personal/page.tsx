'use client';

import ModuleLayout from '../../components/layouts/ModuleLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import { colors } from '../../utils/colors';

export default function GestionPersonalPage() {
  const empleados = [
    { id: 1, nombre: 'Mildred Franco', rol: 'Administrador', horario: '9:30 AM - 7:00 PM', servicios: 25, comisiones: '$2,500' },
    { id: 2, nombre: 'Auxiliar', rol: 'Empleado', horario: '9:30 AM - 7:00 PM', servicios: 18, comisiones: '$1,800' },
  ];

  return (
    <ModuleLayout>
      <PageHeader
        title="Gestión de Personal"
        subtitle="Administra el personal, horarios, comisiones y permisos"
        actions={
          <Button>+ Agregar Empleado</Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: colors.encabezadosAlterno }}>Total Empleados</p>
            <p className="text-3xl font-bold" style={{ color: colors.menuTextoPrincipal }}>2</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: colors.encabezadosAlterno }}>Servicios del Mes</p>
            <p className="text-3xl font-bold" style={{ color: colors.menuTextoPrincipal }}>43</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: colors.encabezadosAlterno }}>Comisiones del Mes</p>
            <p className="text-3xl font-bold" style={{ color: colors.menuTextoPrincipal }}>$4,300</p>
          </div>
        </Card>
      </div>

      <Card>
        <Table headers={['Nombre', 'Rol', 'Horario', 'Servicios del Mes', 'Comisiones', 'Acciones']}>
          {empleados.map((empleado) => (
            <TableRow key={empleado.id}>
              <TableCell className="font-semibold">{empleado.nombre}</TableCell>
              <TableCell>
                <Badge variant={empleado.rol === 'Administrador' ? 'info' : 'default'}>
                  {empleado.rol}
                </Badge>
              </TableCell>
              <TableCell>{empleado.horario}</TableCell>
              <TableCell>{empleado.servicios}</TableCell>
              <TableCell className="font-semibold">{empleado.comisiones}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Ver Detalles</Button>
                  <Button size="sm">Editar</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
            Solicitudes de Permisos
          </h2>
          <div className="space-y-3">
            <div className="p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
              <p className="font-semibold mb-1" style={{ color: colors.menuTextoPrincipal }}>
                Auxiliar - 2024-01-20
              </p>
              <p className="text-sm mb-2" style={{ color: colors.encabezadosAlterno }}>
                Permiso personal
              </p>
              <div className="flex gap-2">
                <Button size="sm">Aprobar</Button>
                <Button size="sm" variant="outline">Rechazar</Button>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
            Horas Extras del Mes
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
              <div>
                <p className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>Auxiliar</p>
                <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>5 horas extras</p>
              </div>
              <p className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>$500</p>
            </div>
          </div>
        </Card>
      </div>
    </ModuleLayout>
  );
}

