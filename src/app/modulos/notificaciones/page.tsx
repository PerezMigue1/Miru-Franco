'use client';

import ModuleLayout from '../../components/layouts/ModuleLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { colors } from '../../utils/colors';

export default function NotificacionesPage() {
  const notificaciones = [
    { id: 1, tipo: 'Recordatorio', destinatario: 'María González', mensaje: 'Recordatorio: Tienes una cita mañana a las 10:00', canal: 'WhatsApp', estado: 'enviada', fecha: '2024-01-14 18:00' },
    { id: 2, tipo: 'Confirmación', destinatario: 'Ana López', mensaje: 'Tu pedido está listo para recoger', canal: 'WhatsApp', estado: 'enviada', fecha: '2024-01-15 11:00' },
    { id: 3, tipo: 'Seguimiento', destinatario: 'Carmen Ruiz', mensaje: 'Seguimiento post-servicio: ¿Cómo va el resultado?', canal: 'WhatsApp', estado: 'pendiente', fecha: '2024-01-16 10:00' },
  ];

  return (
    <ModuleLayout>
      <PageHeader
        title="Notificaciones"
        subtitle="Automatiza mensajes, recordatorios y avisos a clientes"
      />

      <Card>
        <Table headers={['Tipo', 'Destinatario', 'Mensaje', 'Canal', 'Estado', 'Fecha Programada', 'Acciones']}>
          {notificaciones.map((notificacion) => (
            <TableRow key={notificacion.id}>
              <TableCell>
                <Badge variant={notificacion.tipo === 'Recordatorio' ? 'info' : notificacion.tipo === 'Confirmación' ? 'success' : 'warning'}>
                  {notificacion.tipo}
                </Badge>
              </TableCell>
              <TableCell className="font-semibold">{notificacion.destinatario}</TableCell>
              <TableCell className="max-w-xs truncate">{notificacion.mensaje}</TableCell>
              <TableCell>
                <Badge variant="default">{notificacion.canal}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={notificacion.estado === 'enviada' ? 'success' : 'warning'}>
                  {notificacion.estado}
                </Badge>
              </TableCell>
              <TableCell>{notificacion.fecha}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Ver</Button>
                  {notificacion.estado === 'pendiente' && (
                    <Button size="sm">Enviar Ahora</Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>

      <Card className="mt-6">
        <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
          Nueva Notificación
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Tipo"
            options={[
              { value: 'recordatorio', label: 'Recordatorio de Cita' },
              { value: 'confirmacion', label: 'Confirmación' },
              { value: 'seguimiento', label: 'Seguimiento Post-Servicio' },
              { value: 'pedido', label: 'Estado de Pedido' },
            ]}
            fullWidth
          />
          <Input label="Destinatario" placeholder="Cliente o número de teléfono" fullWidth />
          <Select
            label="Canal"
            options={[
              { value: 'whatsapp', label: 'WhatsApp' },
              { value: 'email', label: 'Correo Electrónico' },
              { value: 'sms', label: 'SMS' },
            ]}
            fullWidth
          />
          <Input label="Fecha de Envío" type="datetime-local" fullWidth />
          <div className="md:col-span-2">
            <Textarea label="Mensaje" placeholder="Escribe el mensaje..." rows={4} fullWidth />
          </div>
          <div className="md:col-span-2">
            <Button fullWidth>Programar Notificación</Button>
          </div>
        </div>
      </Card>
    </ModuleLayout>
  );
}

