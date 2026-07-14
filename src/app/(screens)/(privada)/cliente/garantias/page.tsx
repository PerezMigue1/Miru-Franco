'use client';

import { useState } from 'react';
import ModuleLayout from '../../../../components/layouts/ModuleLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Textarea from '../../../../components/ui/Textarea';
import Badge from '../../../../components/ui/Badge';
import Table, { TableRow, TableCell } from '../../../../components/ui/Table';

export default function GarantiasClientePage() {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const casos = [
    { id: 1, tipo: 'Garantía', servicio: 'Alaciado', fecha: '2024-01-10', estado: 'en_revision', descripcion: 'El resultado no fue el esperado' },
    { id: 2, tipo: 'Sugerencia', servicio: 'Atención', fecha: '2024-01-12', estado: 'resuelto', descripcion: 'Sugerencia sobre horarios' },
  ];

  return (
    <ModuleLayout>
      <div className="max-w-4xl mx-auto py-4">
          <div className="text-center mb-8">
            <h1 className="text-hero mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
              Garantías y Soporte
            </h1>
            <p className="text-lead" style={{ color: 'var(--encabezados-alterno)' }}>
              Todos nuestros servicios tienen garantía de satisfacción. Estamos aquí para ayudarte.
            </p>
          </div>

          <Card className="mb-6">
            <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
              Mis Casos
            </h2>
            <Table headers={['Tipo', 'Servicio', 'Fecha', 'Estado', 'Descripción']}>
              {casos.map((caso) => (
                <TableRow key={caso.id}>
                  <TableCell>
                    <Badge variant={caso.tipo === 'Garantía' ? 'warning' : 'info'}>
                      {caso.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>{caso.servicio}</TableCell>
                  <TableCell>{caso.fecha}</TableCell>
                  <TableCell>
                    <Badge variant={caso.estado === 'resuelto' ? 'success' : 'warning'}>
                      {caso.estado === 'resuelto' ? 'Resuelto' : 'En Revisión'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{caso.descripcion}</TableCell>
                </TableRow>
              ))}
            </Table>
          </Card>

          {!mostrarFormulario ? (
            <Card>
              <div className="text-center">
                <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  ¿Necesitas Ayuda?
                </h2>
                <p className="mb-6" style={{ color: 'var(--encabezados-alterno)' }}>
                  Si tienes alguna queja, sugerencia o necesitas activar una garantía, 
                  por favor completa el siguiente formulario.
                </p>
                <Button onClick={() => setMostrarFormulario(true)}>
                  Crear Nuevo Caso
                </Button>
              </div>
            </Card>
          ) : (
            <Card>
              <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                Nuevo Caso
              </h2>
              <div className="space-y-4">
                <Select
                  label="Tipo"
                  options={[
                    { value: 'garantia', label: 'Garantía' },
                    { value: 'queja', label: 'Queja' },
                    { value: 'sugerencia', label: 'Sugerencia' },
                  ]}
                  fullWidth
                />
                <Input label="Servicio Relacionado" placeholder="Tipo de servicio" fullWidth />
                <Input label="Fecha del Servicio" type="date" fullWidth />
                <Textarea label="Descripción" placeholder="Describe tu caso..." rows={5} fullWidth />
                <div className="flex gap-3">
                  <Button variant="outline" fullWidth onClick={() => setMostrarFormulario(false)}>
                    Cancelar
                  </Button>
                  <Button fullWidth onClick={() => setMostrarFormulario(false)}>
                    Enviar
                  </Button>
                </div>
              </div>
            </Card>
          )}
      </div>
    </ModuleLayout>
  );
}

