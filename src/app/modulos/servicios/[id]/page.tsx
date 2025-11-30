'use client';

import { useParams } from 'next/navigation';
import ModuleLayout from '../../../components/layouts/ModuleLayout';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import { colors } from '../../../utils/colors';
import { getCategoryColor } from '../../../utils/categoryColors';

export default function ServicioDetalleAdminPage() {
  const params = useParams();
  const id = params.id as string;
  
  const servicio = {
    id: parseInt(id),
    nombre: 'Corte',
    precio: '$350',
    duracion: '45 min',
    categoria: 'Corte',
    requiereEvaluacion: false,
    descripcion: 'Corte profesional adaptado a tu estilo',
    productosNecesarios: ['Shampoo', 'Acondicionador'],
    especialistas: ['Mildred Franco', 'Auxiliar'],
  };

  const citas = [
    { id: 1, cliente: 'María González', fecha: '2024-01-20', hora: '10:00', estado: 'confirmada' },
    { id: 2, cliente: 'Ana López', fecha: '2024-01-21', hora: '14:00', estado: 'pendiente' },
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
                      {servicio.nombre}
                    </h1>
                    <Badge variant={getCategoryColor(servicio.categoria)} size="lg">
                      {servicio.categoria}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline">Editar</Button>
                    <Button variant="danger">Eliminar</Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <Input label="Nombre del Servicio" defaultValue={servicio.nombre} fullWidth />
                  <Input label="Precio" defaultValue={servicio.precio} fullWidth />
                  <Input label="Duración" defaultValue={servicio.duracion} fullWidth />
                  <Input label="Categoría" defaultValue={servicio.categoria} fullWidth />
                  <div className="md:col-span-2">
                    <Textarea label="Descripción" defaultValue={servicio.descripcion} rows={3} fullWidth />
                  </div>
                </div>
              </Card>

              <Card>
                <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Productos Necesarios
                </h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  {servicio.productosNecesarios.map((producto, index) => (
                    <Badge key={index} variant="default">{producto}</Badge>
                  ))}
                </div>
                <Button variant="outline">Agregar Producto</Button>
              </Card>

              <Card>
                <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Citas Programadas
                </h2>
                <Table headers={['Cliente', 'Fecha', 'Hora', 'Estado']}>
                  {citas.map((cita) => (
                    <TableRow key={cita.id}>
                      <TableCell>{cita.cliente}</TableCell>
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
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <h3 className="text-subtitle mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Información del Servicio
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span style={{ color: colors.encabezadosAlterno }}>Precio:</span>
                    <span className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                      {servicio.precio}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: colors.encabezadosAlterno }}>Duración:</span>
                    <span className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                      {servicio.duracion}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: colors.encabezadosAlterno }}>Requiere Evaluación:</span>
                    <Badge variant={servicio.requiereEvaluacion ? 'warning' : 'success'}>
                      {servicio.requiereEvaluacion ? 'Sí' : 'No'}
                    </Badge>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="text-subtitle mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Especialistas
                </h3>
                <div className="space-y-2">
                  {servicio.especialistas.map((especialista, index) => (
                    <div key={index} className="p-3 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                      <p className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                        {especialista}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h3 className="text-subtitle mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Estadísticas
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between p-3 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <span style={{ color: colors.encabezadosAlterno }}>Citas del Mes:</span>
                    <span className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>12</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <span style={{ color: colors.encabezadosAlterno }}>Ingresos del Mes:</span>
                    <span className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>$4,200</span>
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

