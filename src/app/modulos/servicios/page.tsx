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
import { getCategoryColor } from '../../utils/categoryColors';

export default function ServiciosPage() {
  const router = useRouter();
  
  const servicios = [
    { id: 1, nombre: 'Corte', precio: '$350', duracion: '45 min', categoria: 'Corte', requiereEvaluacion: false },
    { id: 2, nombre: 'Alaciado', precio: '$800', duracion: '3 horas', categoria: 'Químico', requiereEvaluacion: true },
    { id: 3, nombre: 'Nanoplastía', precio: '$1,200', duracion: '4 horas', categoria: 'Químico', requiereEvaluacion: true },
    { id: 4, nombre: 'Depilación de Cejas', precio: '$150', duracion: '30 min', categoria: 'Depilación', requiereEvaluacion: false },
  ];

  return (
    <ModuleLayout>
      <PageHeader
        title="Servicios"
        subtitle="Administra el catálogo completo de servicios ofrecidos"
        actions={
          <Button>+ Nuevo Servicio</Button>
        }
      />

      <Card>
        <Table headers={['Servicio', 'Precio', 'Duración', 'Categoría', 'Requiere Evaluación', 'Acciones']}>
          {servicios.map((servicio) => (
            <TableRow key={servicio.id}>
              <TableCell className="font-semibold">{servicio.nombre}</TableCell>
              <TableCell className="font-semibold">{servicio.precio}</TableCell>
              <TableCell>{servicio.duracion}</TableCell>
              <TableCell>
                <Badge variant={getCategoryColor(servicio.categoria)}>
                  {servicio.categoria}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={servicio.requiereEvaluacion ? 'warning' : 'success'}>
                  {servicio.requiereEvaluacion ? 'Sí' : 'No'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => router.push(`/modulos/servicios/${servicio.id}`)}
                  >
                    Ver Detalles
                  </Button>
                  <Button size="sm" variant="danger">Eliminar</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>

      <Card className="mt-6">
        <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
          Nuevo Servicio
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Nombre del Servicio" placeholder="Ej: Corte, Alaciado..." fullWidth />
          <Input label="Precio" placeholder="$0.00" fullWidth />
          <Input label="Duración Estimada" placeholder="Ej: 45 min, 2 horas" fullWidth />
          <Input label="Categoría" placeholder="Corte, Químico, Depilación..." fullWidth />
          <div className="md:col-span-2">
            <Button fullWidth>Registrar Servicio</Button>
          </div>
        </div>
      </Card>
    </ModuleLayout>
  );
}

