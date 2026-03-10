'use client';

import { useRouter } from 'next/navigation';
import PublicLayout from '../../../../components/layouts/PublicLayout';
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
    <PublicLayout>
      <div className="container mx-auto px-4 py-12" style={{ marginTop: '136px' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-hero mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
              Seguimientos Post-Servicio
            </h1>
            <p className="text-lead" style={{ color: 'var(--encabezados-alterno)' }}>
              Aquí puedes ver el seguimiento que realizamos después de tus servicios
            </p>
          </div>

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
      </div>
    </PublicLayout>
  );
}

