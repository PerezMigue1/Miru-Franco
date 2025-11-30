'use client';

import { useParams } from 'next/navigation';
import ModuleLayout from '../../../components/layouts/ModuleLayout';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import { colors } from '../../../utils/colors';

export default function ClienteDetallePage() {
  const params = useParams();
  const id = params.id as string;
  
  const cliente = {
    id: parseInt(id),
    nombre: 'María González',
    telefono: '555-1234-5678',
    email: 'maria@ejemplo.com',
    direccion: 'Col. Juárez, Calle Principal #123',
    estado: 'frecuente',
    confiabilidad: 'alta',
    servicios: 8,
    ultimaVisita: '2024-01-15',
  };

  const servicios = [
    { id: 1, servicio: 'Corte', fecha: '2024-01-15', especialista: 'Mildred', precio: '$350', estado: 'completado' },
    { id: 2, servicio: 'Alaciado', fecha: '2023-12-20', especialista: 'Mildred', precio: '$800', estado: 'completado' },
    { id: 3, servicio: 'Nanoplastía', fecha: '2023-11-15', especialista: 'Mildred', precio: '$1,200', estado: 'completado' },
  ];

  const observaciones = [
    'Cliente satisfecha con todos los servicios',
    'Prefiere horarios matutinos',
    'Productos recomendados: Shampoo Avina, Acondicionador Tech Italy',
  ];

  return (
    <ModuleLayout>
      <div className="container mx-auto px-4 py-12" style={{ marginTop: '136px' }}>
        <div className="max-w-6xl mx-auto">
          <Button variant="outline" onClick={() => window.history.back()} className="mb-6">
            ← Volver
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-hero mb-2" style={{ color: colors.menuTextoPrincipal }}>
                      {cliente.nombre}
                    </h1>
                    <div className="flex gap-2">
                      <Badge variant={cliente.estado === 'frecuente' ? 'success' : 'default'}>
                        {cliente.estado}
                      </Badge>
                      <Badge variant={cliente.confiabilidad === 'alta' ? 'success' : 'warning'}>
                        {cliente.confiabilidad}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline">Editar</Button>
                    <Button>Nueva Cita</Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Nombre Completo" defaultValue={cliente.nombre} fullWidth />
                  <Input label="Teléfono" defaultValue={cliente.telefono} fullWidth />
                  <Input label="Email" type="email" defaultValue={cliente.email} fullWidth />
                  <Input label="Dirección" defaultValue={cliente.direccion} fullWidth />
                </div>
                <div className="mt-4">
                  <Button>Guardar Cambios</Button>
                </div>
              </Card>

              <Card>
                <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Historial de Servicios
                </h2>
                <Table headers={['Servicio', 'Fecha', 'Especialista', 'Precio', 'Estado']}>
                  {servicios.map((servicio) => (
                    <TableRow key={servicio.id}>
                      <TableCell>{servicio.servicio}</TableCell>
                      <TableCell>{servicio.fecha}</TableCell>
                      <TableCell>{servicio.especialista}</TableCell>
                      <TableCell className="font-semibold">{servicio.precio}</TableCell>
                      <TableCell>
                        <Badge variant="success">{servicio.estado}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </Table>
              </Card>

              <Card>
                <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Observaciones Importantes
                </h2>
                <div className="space-y-2">
                  {observaciones.map((obs, index) => (
                    <div key={index} className="p-3 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                      <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                        {obs}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Button variant="outline">Agregar Observación</Button>
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <h3 className="text-subtitle mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Resumen
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between p-3 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <span style={{ color: colors.encabezadosAlterno }}>Servicios Totales:</span>
                    <span className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                      {cliente.servicios}
                    </span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <span style={{ color: colors.encabezadosAlterno }}>Última Visita:</span>
                    <span className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                      {cliente.ultimaVisita}
                    </span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <span style={{ color: colors.encabezadosAlterno }}>Estado:</span>
                    <Badge variant={cliente.estado === 'frecuente' ? 'success' : 'default'}>
                      {cliente.estado}
                    </Badge>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="text-subtitle mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Acciones Rápidas
                </h3>
                <div className="space-y-2">
                  <Button fullWidth>Agendar Nueva Cita</Button>
                  <Button fullWidth variant="outline">Ver Facturas</Button>
                  <Button fullWidth variant="outline">Ver Seguimientos</Button>
                  <Button fullWidth variant="outline">Enviar Mensaje</Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}

