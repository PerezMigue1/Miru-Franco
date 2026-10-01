'use client';

import { useRouter } from 'next/navigation';
import ModuleLayout from '../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../components/ui/PageHeader';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import Table, { TableRow, TableCell } from '../../../../components/ui/Table';

export default function SeguimientosClientePage() {
  const router = useRouter();
  
  const seguimientos = [
    { id: 1, servicio: 'Alaciado', fecha: '2024-01-10', estado: 'satisfactoria', mensaje: 'Seguimiento realizado: Cliente satisfecha con el resultado' },
    { id: 2, servicio: 'Nanoplastía', fecha: '2024-01-08', estado: 'en_seguimiento', mensaje: 'Seguimiento en curso: ¿Cómo va el proceso?' },
  ];

  return (
    <ModuleLayout>
      <div className="max-w-4xl mx-auto py-4">
          <PageHeader title="Seguimientos Post-Servicio" subtitle="Aquí puedes ver el seguimiento que realizamos después de tus servicios" />

          <Card>
            <Table headers={['Servicio', 'Fecha', 'Estado', 'Mensaje']}>
              {seguimientos.map((seguimiento) => (
                <TableRow key={seguimiento.id}>
                  <TableCell className="font-semibold">{seguimiento.servicio}</TableCell>
                  <TableCell>{seguimiento.fecha}</TableCell>
                  <TableCell>
                    <Badge variant={seguimiento.estado === 'satisfactoria' ? 'success' : 'info'}>
                      {seguimiento.estado === 'satisfactoria' ? 'Completado' : 'En Seguimiento'}
                    </Badge>
                  </TableCell>
                  <TableCell>{seguimiento.mensaje}</TableCell>
                </TableRow>
              ))}
            </Table>
          </Card>

          <Card className="mt-6">
            <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
              ¿Necesitas Ayuda?
            </h2>
            <p className="mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
              Si tienes alguna duda sobre tu servicio o necesitas asistencia, no dudes en contactarnos.
              Estamos aquí para ayudarte y garantizar tu satisfacción completa.
            </p>
            <Button onClick={() => router.push('/cliente/garantias')}>
              Contactar Soporte
            </Button>
          </Card>
      </div>
    </ModuleLayout>
  );
}

