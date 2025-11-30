'use client';

import ModuleLayout from '../../components/layouts/ModuleLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Table, { TableRow, TableCell } from '../../components/ui/Table';
import { colors } from '../../utils/colors';

export default function PerfilEmpleadoPage() {
  const serviciosHoy = [
    { id: 1, cliente: 'María González', servicio: 'Corte', hora: '10:00', estado: 'completado' },
    { id: 2, cliente: 'Ana López', servicio: 'Alaciado', hora: '14:00', estado: 'en_proceso' },
  ];

  return (
    <ModuleLayout>
      <div className="container mx-auto px-4 py-12" style={{ marginTop: '136px' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-hero mb-2" style={{ color: colors.menuTextoPrincipal }}>
                Mi Perfil - Empleado
              </h1>
              <Badge variant="default" size="lg">Empleado</Badge>
            </div>
            <Button variant="outline">Editar Perfil</Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Información Personal
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Nombre Completo" defaultValue="Auxiliar" fullWidth />
                  <Input label="Email" type="email" defaultValue="auxiliar@mirufranco.com" fullWidth />
                  <Input label="Teléfono" defaultValue="555-5678-9012" fullWidth />
                  <Input label="Cargo" defaultValue="Asistente" fullWidth />
                </div>
                <div className="mt-4">
                  <Button>Guardar Cambios</Button>
                </div>
              </Card>

              <Card>
                <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Servicios de Hoy
                </h2>
                <Table headers={['Cliente', 'Servicio', 'Hora', 'Estado']}>
                  {serviciosHoy.map((servicio) => (
                    <TableRow key={servicio.id}>
                      <TableCell>{servicio.cliente}</TableCell>
                      <TableCell>{servicio.servicio}</TableCell>
                      <TableCell>{servicio.hora}</TableCell>
                      <TableCell>
                        <Badge variant={servicio.estado === 'completado' ? 'success' : 'warning'}>
                          {servicio.estado === 'completado' ? 'Completado' : 'En Proceso'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </Table>
              </Card>

              <Card>
                <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Estadísticas del Mes
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <p className="text-2xl font-bold mb-1" style={{ color: colors.menuTextoPrincipal }}>18</p>
                    <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>Servicios Realizados</p>
                  </div>
                  <div className="text-center p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <p className="text-2xl font-bold mb-1" style={{ color: colors.menuTextoPrincipal }}>$1,800</p>
                    <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>Comisiones</p>
                  </div>
                  <div className="text-center p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <p className="text-2xl font-bold mb-1" style={{ color: colors.menuTextoPrincipal }}>5</p>
                    <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>Horas Extras</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <div className="text-center mb-4">
                  <div className="w-32 h-32 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: colors.fondosSuaves }}>
                    <svg className="w-16 h-16" style={{ color: colors.menuTextoPrincipal }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-subtitle mb-1" style={{ color: colors.menuTextoPrincipal }}>
                    Auxiliar
                  </h3>
                  <p className="text-sm mb-4" style={{ color: colors.encabezadosAlterno }}>
                    Asistente
                  </p>
                </div>
              </Card>

              <Card>
                <h3 className="text-subtitle mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Mis Funciones
                </h3>
                <div className="space-y-2">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <p className="text-sm font-semibold" style={{ color: colors.menuTextoPrincipal }}>✓ Registrar Ventas</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <p className="text-sm font-semibold" style={{ color: colors.menuTextoPrincipal }}>✓ Gestionar Entregas</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <p className="text-sm font-semibold" style={{ color: colors.menuTextoPrincipal }}>✓ Consultar Inventario</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <p className="text-sm font-semibold" style={{ color: colors.menuTextoPrincipal }}>✓ Crear Citas</p>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="text-subtitle mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Horario
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between p-3 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <span className="text-sm" style={{ color: colors.encabezadosAlterno }}>Lunes - Sábado</span>
                    <span className="text-sm font-semibold" style={{ color: colors.menuTextoPrincipal }}>9:30 AM - 7:00 PM</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <span className="text-sm" style={{ color: colors.encabezadosAlterno }}>Domingo</span>
                    <span className="text-sm font-semibold" style={{ color: colors.menuTextoPrincipal }}>Cerrado</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}

