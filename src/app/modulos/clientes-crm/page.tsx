'use client';

import { useRouter } from 'next/navigation';
import ModuleLayout from '../../components/layouts/ModuleLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import { colors } from '../../utils/colors';

export default function ClientesCRMPage() {
  const router = useRouter();
  
  const clientes = [
    { id: 1, nombre: 'María González', telefono: '555-1234', servicios: 8, ultimaVisita: '2024-01-15', estado: 'frecuente', confiabilidad: 'alta' },
    { id: 2, nombre: 'Ana López', telefono: '555-5678', servicios: 3, ultimaVisita: '2024-01-14', estado: 'regular', confiabilidad: 'media' },
    { id: 3, nombre: 'Carmen Ruiz', telefono: '555-9012', servicios: 12, ultimaVisita: '2024-01-13', estado: 'frecuente', confiabilidad: 'alta' },
    { id: 4, nombre: 'Laura Martínez', telefono: '555-3456', servicios: 1, ultimaVisita: '2023-12-20', estado: 'nuevo', confiabilidad: 'baja' },
  ];

  return (
    <ModuleLayout>
      <PageHeader
        title="Clientes (CRM)"
        subtitle="Gestiona la información completa de las clientas y su historial"
        actions={
          <Button>+ Nuevo Cliente</Button>
        }
      />

      <div className="mb-6">
        <Input placeholder="Buscar cliente por nombre, teléfono..." className="w-full" />
      </div>

      <Card>
        <Table headers={['Cliente', 'Teléfono', 'Servicios', 'Última Visita', 'Estado', 'Confiabilidad', 'Acciones']}>
          {clientes.map((cliente) => (
            <TableRow key={cliente.id}>
              <TableCell className="font-semibold">{cliente.nombre}</TableCell>
              <TableCell>{cliente.telefono}</TableCell>
              <TableCell>{cliente.servicios}</TableCell>
              <TableCell>{cliente.ultimaVisita}</TableCell>
              <TableCell>
                <Badge variant={cliente.estado === 'frecuente' ? 'success' : cliente.estado === 'regular' ? 'info' : 'default'}>
                  {cliente.estado}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={cliente.confiabilidad === 'alta' ? 'success' : cliente.confiabilidad === 'media' ? 'warning' : 'danger'}>
                  {cliente.confiabilidad}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => router.push(`/modulos/clientes-crm/${cliente.id}`)}
                  >
                    Ver Perfil
                  </Button>
                  <Button size="sm">Editar</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>

      <Card className="mt-6">
        <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
          Estadísticas de Clientes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
            <p className="text-2xl font-bold mb-1" style={{ color: colors.menuTextoPrincipal }}>150</p>
            <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>Total Clientes</p>
          </div>
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
            <p className="text-2xl font-bold mb-1" style={{ color: colors.menuTextoPrincipal }}>45</p>
            <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>Clientes Frecuentes</p>
          </div>
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
            <p className="text-2xl font-bold mb-1" style={{ color: colors.menuTextoPrincipal }}>12</p>
            <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>Clientes Nuevos (Mes)</p>
          </div>
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
            <p className="text-2xl font-bold mb-1" style={{ color: colors.menuTextoPrincipal }}>3</p>
            <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>Clientes Fichados</p>
          </div>
        </div>
      </Card>
    </ModuleLayout>
  );
}

