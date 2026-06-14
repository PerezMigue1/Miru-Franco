'use client';

import { useState, useEffect } from 'react';
import { listarEmpleados, EmpleadoApi } from '../../../services/empleados';
import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';

interface EmpleadoFila {
  id: string;
  nombre: string;
  rol: string;
  horario: string;
  servicios: string;
  comisiones: string;
}

function mapearEmpleado(e: EmpleadoApi): EmpleadoFila {
  return {
    id: e.id || e.usuarioId,
    nombre: e.nombre ?? '-',
    rol: e.puesto ?? 'Empleado',
    horario: '-',
    servicios: '-',
    comisiones: e.comisionPorcentaje != null ? `${e.comisionPorcentaje}%` : '-',
  };
}

export default function GestionPersonalPage() {
  const [empleados, setEmpleados] = useState<EmpleadoFila[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listarEmpleados()
      .then(({ data }) => setEmpleados(data.map(mapearEmpleado)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
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
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Total Empleados</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : empleados.length}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Servicios del Mes</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>-</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Comisiones del Mes</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>-</p>
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
          <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Solicitudes de Permisos
          </h2>
          <div className="space-y-3">
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
              <p className="font-semibold mb-1" style={{ color: 'var(--menu-texto-principal)' }}>
                Auxiliar - 2024-01-20
              </p>
              <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>
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
          <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
            Horas Extras del Mes
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
              <div>
                <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>Auxiliar</p>
                <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>5 horas extras</p>
              </div>
              <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>$500</p>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
