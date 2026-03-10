'use client';

import OperacionLayout from '../../../../components/layouts/OperacionLayout';
import PageHeader from '../../../../components/ui/PageHeader';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../../components/ui/Table';
import Badge from '../../../../components/ui/Badge';
import Input from '../../../../components/ui/Input';

export default function AtencionSinCitaPage() {
  const turnos = [
    { id: 1, cliente: 'María González', llegada: '10:15', servicio: 'Corte', estado: 'esperando', posicion: 1 },
    { id: 2, cliente: 'Ana López', llegada: '10:30', servicio: 'Peinado', estado: 'esperando', posicion: 2 },
    { id: 3, cliente: 'Carmen Ruiz', llegada: '09:45', servicio: 'Corte', estado: 'en_atencion', posicion: 0 },
  ];

  return (
    <OperacionLayout>
      <PageHeader
        title="Atención de Clientes sin Cita"
        subtitle="Gestiona clientes que llegan sin cita previa por orden de turno"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>En Espera</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>2</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>En Atención</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>1</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Tiempo Promedio</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>25 min</p>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
          Lista de Turnos
        </h2>
        <Table headers={['Posición', 'Cliente', 'Hora de Llegada', 'Servicio', 'Estado', 'Tiempo de Espera', 'Acciones']}>
          {turnos.map((turno) => (
            <TableRow key={turno.id}>
              <TableCell>
                {turno.posicion > 0 ? (
                  <Badge variant="info">{turno.posicion}</Badge>
                ) : (
                  <Badge variant="success">En Atención</Badge>
                )}
              </TableCell>
              <TableCell className="font-semibold">{turno.cliente}</TableCell>
              <TableCell>{turno.llegada}</TableCell>
              <TableCell>{turno.servicio}</TableCell>
              <TableCell>
                <Badge variant={turno.estado === 'en_atencion' ? 'success' : 'warning'}>
                  {turno.estado === 'en_atencion' ? 'En Atención' : 'Esperando'}
                </Badge>
              </TableCell>
              <TableCell>
                {turno.estado === 'esperando' ? '15 min' : '-'}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {turno.estado === 'esperando' && (
                    <Button size="sm">Llamar</Button>
                  )}
                  {turno.estado === 'en_atencion' && (
                    <Button size="sm" variant="success">Finalizar</Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>

      <Card className="mt-6">
        <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
          Registrar Nuevo Turno
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Nombre del Cliente" placeholder="Nombre completo" fullWidth />
          <Input label="Teléfono (opcional)" placeholder="555-1234-5678" fullWidth />
          <Input label="Servicio Deseado" placeholder="Tipo de servicio" fullWidth />
          <Input label="Hora de Llegada" type="time" fullWidth />
          <div className="md:col-span-2">
            <Button fullWidth>Agregar a Lista de Espera</Button>
          </div>
        </div>
      </Card>
    </OperacionLayout>
  );
}
