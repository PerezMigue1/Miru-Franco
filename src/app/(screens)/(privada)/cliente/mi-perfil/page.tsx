'use client';

import { useRouter } from 'next/navigation';
import PublicLayout from '../../../../components/layouts/PublicLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Table, { TableRow, TableCell } from '../../../../components/ui/Table';
import Badge from '../../../../components/ui/Badge';
import { colors } from '../../../../utils/colors';

export default function MiPerfilPage() {
  const router = useRouter();
  
  const citas = [
    { id: 1, servicio: 'Corte', fecha: '2024-01-20', hora: '10:00', estado: 'confirmada' },
    { id: 2, servicio: 'Alaciado', fecha: '2024-01-25', hora: '14:00', estado: 'pendiente' },
  ];

  const servicios = [
    { id: 1, servicio: 'Corte', fecha: '2024-01-10', especialista: 'Mildred', precio: '$350' },
    { id: 2, servicio: 'Nanoplastía', fecha: '2023-12-15', especialista: 'Mildred', precio: '$1,200' },
  ];

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12" style={{ marginTop: '136px' }}>
        <div className="max-w-6xl mx-auto">
          <h1 className="text-hero mb-8" style={{ color: colors.menuTextoPrincipal }}>
            Mi Perfil
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Información Personal
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Nombre Completo" defaultValue="María González" fullWidth />
                  <Input label="Teléfono" defaultValue="555-1234-5678" fullWidth />
                  <Input label="Email" type="email" defaultValue="maria@ejemplo.com" fullWidth />
                  <Input label="Dirección" placeholder="Calle, número, colonia" fullWidth />
                  <div className="md:col-span-2">
                    <Button>Guardar Cambios</Button>
                  </div>
                </div>
              </Card>

              <Card>
                <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Mis Citas
                </h2>
                <Table headers={['Servicio', 'Fecha', 'Hora', 'Estado']}>
                  {citas.map((cita) => (
                    <TableRow 
                      key={cita.id}
                      className="cursor-pointer hover:opacity-80"
                      onClick={() => router.push(`/cliente/agendar-cita?cita=${cita.id}`)}
                    >
                      <TableCell>{cita.servicio}</TableCell>
                      <TableCell>{cita.fecha}</TableCell>
                      <TableCell>{cita.hora}</TableCell>
                      <TableCell>
                        <Badge variant={cita.estado === 'confirmada' ? 'success' : 'warning'}>
                          {cita.estado}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </Table>
                <div className="mt-4">
                  <Button variant="outline" onClick={() => router.push('/cliente/agendar-cita')}>
                    Ver Todas las Citas
                  </Button>
                </div>
              </Card>

              <Card>
                <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Historial de Servicios
                </h2>
                <Table headers={['Servicio', 'Fecha', 'Especialista', 'Precio']}>
                  {servicios.map((servicio) => (
                    <TableRow key={servicio.id}>
                      <TableCell>{servicio.servicio}</TableCell>
                      <TableCell>{servicio.fecha}</TableCell>
                      <TableCell>{servicio.especialista}</TableCell>
                      <TableCell className="font-semibold">{servicio.precio}</TableCell>
                    </TableRow>
                  ))}
                </Table>
              </Card>
            </div>

            <div>
              <Card>
                <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Acciones Rápidas
                </h2>
                <div className="space-y-3">
                  <Button fullWidth onClick={() => router.push('/cliente/agendar-cita')}>
                    Agendar Nueva Cita
                  </Button>
                  <Button fullWidth variant="outline" onClick={() => router.push('/cliente/tienda-online')}>
                    Ver Productos
                  </Button>
                  <Button fullWidth variant="outline" onClick={() => router.push('/cliente/garantias')}>
                    Contactar Soporte
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

