'use client';

import { useState } from 'react';
import PublicLayout from '../../../../components/layouts/PublicLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Badge from '../../../../components/ui/Badge';
import Table, { TableRow, TableCell } from '../../../../components/ui/Table';
import { colors } from '../../../../utils/colors';

export default function FacturasPage() {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  
  const documentos = [
    { id: 1, numero: 'NOT-001', concepto: 'Servicio - Corte', monto: '$350', fecha: '2024-01-15', tipo: 'Nota de Remisión', estado: 'disponible' },
    { id: 2, numero: 'FAC-001', concepto: 'Producto - Shampoo', monto: '$380', fecha: '2024-01-14', tipo: 'Factura Electrónica', estado: 'enviada' },
    { id: 3, numero: 'NOT-002', concepto: 'Servicio - Nanoplastía', monto: '$1,200', fecha: '2024-01-13', tipo: 'Nota de Remisión', estado: 'disponible' },
  ];

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12" style={{ marginTop: '136px' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-hero mb-4" style={{ color: colors.menuTextoPrincipal }}>
              Mis Facturas y Notas de Remisión
            </h1>
            <p className="text-lead" style={{ color: colors.encabezadosAlterno }}>
              Descarga tus facturas electrónicas y notas de remisión
            </p>
          </div>

          <Card>
            <Table headers={['Número', 'Concepto', 'Monto', 'Fecha', 'Tipo', 'Estado', 'Acciones']}>
              {documentos.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-semibold">{doc.numero}</TableCell>
                  <TableCell>{doc.concepto}</TableCell>
                  <TableCell className="font-semibold">{doc.monto}</TableCell>
                  <TableCell>{doc.fecha}</TableCell>
                  <TableCell>
                    <Badge variant={doc.tipo === 'Factura Electrónica' ? 'info' : 'default'}>
                      {doc.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={doc.estado === 'enviada' || doc.estado === 'disponible' ? 'success' : 'warning'}>
                      {doc.estado === 'enviada' ? 'Enviada' : doc.estado === 'disponible' ? 'Disponible' : doc.estado}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        alert(`Descargando ${doc.tipo} ${doc.numero}...`);
                        // En producción, esto descargaría el archivo
                      }}
                    >
                      Descargar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          </Card>

          {!mostrarFormulario ? (
            <Card className="mt-6">
              <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                Solicitar Factura Electrónica
              </h2>
              <p className="mb-4" style={{ color: colors.encabezadosAlterno }}>
                Si necesitas una factura electrónica para alguna de tus compras o servicios, 
                puedes solicitarla aquí. Te la enviaremos por correo electrónico.
              </p>
              <Button onClick={() => setMostrarFormulario(true)}>
                Solicitar Factura
              </Button>
            </Card>
          ) : (
            <Card className="mt-6">
              <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                Nueva Solicitud de Factura
              </h2>
              <div className="space-y-4">
                <Input label="Número de Nota de Remisión o Compra" placeholder="Ej: NOT-001" fullWidth />
                <Input label="RFC" placeholder="Tu RFC" fullWidth />
                <Input label="Razón Social" placeholder="Nombre o razón social" fullWidth />
                <Input label="Email" type="email" placeholder="correo@ejemplo.com" fullWidth />
                <div className="flex gap-3">
                  <Button variant="outline" fullWidth onClick={() => setMostrarFormulario(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    fullWidth 
                    onClick={() => {
                      alert('Solicitud de factura enviada. Te contactaremos pronto.');
                      setMostrarFormulario(false);
                    }}
                  >
                    Enviar Solicitud
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

