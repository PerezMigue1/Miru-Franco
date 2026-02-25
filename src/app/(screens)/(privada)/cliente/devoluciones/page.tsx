'use client';

import { useState } from 'react';
import PublicLayout from '../../../../components/layouts/PublicLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Textarea from '../../../../components/ui/Textarea';
import Badge from '../../../../components/ui/Badge';
import Table, { TableRow, TableCell } from '../../../../components/ui/Table';
import { colors } from '../../../../utils/colors';

export default function DevolucionesPage() {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<string>('');

  // Información del cliente (en producción vendría de la sesión/autenticación)
  const clienteInfo = {
    id: 'CLI-001',
    nombre: 'María González',
    telefono: '555-1234-5678',
    email: 'maria@ejemplo.com',
  };

  // Productos comprados por el cliente (historial de compras)
  const productosComprados = [
    { 
      id: '1', 
      productoId: 1,
      nombre: 'Shampoo Avina', 
      pedido: 'PED-001', 
      fechaCompra: '2024-01-15', 
      precio: '$350',
      cantidad: 2,
      estado: 'entregado'
    },
    { 
      id: '2', 
      productoId: 2,
      nombre: 'Acondicionador Tech Italy', 
      pedido: 'PED-001', 
      fechaCompra: '2024-01-15', 
      precio: '$380',
      cantidad: 1,
      estado: 'entregado'
    },
    { 
      id: '3', 
      productoId: 3,
      nombre: 'Mascarilla Alfaparf', 
      pedido: 'PED-002', 
      fechaCompra: '2024-01-10', 
      precio: '$450',
      cantidad: 1,
      estado: 'entregado'
    },
  ];

  const productoActual = productosComprados.find(p => p.id === productoSeleccionado);

  const solicitudes = [
    { 
      id: 1, 
      producto: 'Shampoo Avina', 
      pedido: 'PED-001',
      cliente: clienteInfo.nombre,
      motivo: 'Producto incorrecto', 
      fecha: '2024-01-15', 
      estado: 'pendiente' 
    },
    { 
      id: 2, 
      producto: 'Acondicionador Tech Italy', 
      pedido: 'PED-001',
      cliente: clienteInfo.nombre,
      motivo: 'Equivocación', 
      fecha: '2024-01-14', 
      estado: 'procesado' 
    },
  ];

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12" style={{ marginTop: '136px' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-hero mb-4" style={{ color: colors.menuTextoPrincipal }}>
              Devoluciones y Cambios
            </h1>
            <p className="text-lead" style={{ color: colors.encabezadosAlterno }}>
              Solicita cambios de productos. Recuerda que solo se realizan cambios, no reembolsos en efectivo.
            </p>
          </div>

          {/* Información del Cliente */}
          <Card className="mb-6">
            <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
              Información del Cliente
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm mb-1" style={{ color: colors.encabezadosAlterno }}>Nombre:</p>
                <p className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                  {clienteInfo.nombre}
                </p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: colors.encabezadosAlterno }}>ID Cliente:</p>
                <p className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                  {clienteInfo.id}
                </p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: colors.encabezadosAlterno }}>Teléfono:</p>
                <p className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                  {clienteInfo.telefono}
                </p>
              </div>
            </div>
          </Card>

          <Card className="mb-6">
            <div className="p-4 rounded-lg mb-6" style={{ backgroundColor: colors.fondosSuaves }}>
              <h3 className="font-semibold mb-2" style={{ color: colors.menuTextoPrincipal }}>
                Política de Cambios:
              </h3>
              <ul className="text-sm space-y-1" style={{ color: colors.encabezadosAlterno }}>
                <li>• El producto debe estar sellado y sin abrir</li>
                <li>• El producto debe estar en las mismas condiciones en que fue entregado</li>
                <li>• Solo se aceptan cambios, no devoluciones de dinero</li>
                <li>• Puedes cambiar por otro producto de igual o diferente valor</li>
              </ul>
            </div>

            <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
              Mis Solicitudes de Cambio
            </h2>
            <Table headers={['Producto', 'Pedido', 'Cliente', 'Motivo', 'Fecha', 'Estado']}>
              {solicitudes.map((solicitud) => (
                <TableRow key={solicitud.id}>
                  <TableCell className="font-semibold">{solicitud.producto}</TableCell>
                  <TableCell>
                    <Badge variant="info" size="sm">{solicitud.pedido}</Badge>
                  </TableCell>
                  <TableCell>{solicitud.cliente}</TableCell>
                  <TableCell>{solicitud.motivo}</TableCell>
                  <TableCell>{solicitud.fecha}</TableCell>
                  <TableCell>
                    <Badge variant={solicitud.estado === 'procesado' ? 'success' : 'warning'}>
                      {solicitud.estado === 'procesado' ? 'Procesado' : 'Pendiente'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          </Card>

          {!mostrarFormulario ? (
            <Card>
              <div className="text-center">
                <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Solicitar Cambio de Producto
                </h2>
                <p className="mb-6" style={{ color: colors.encabezadosAlterno }}>
                  Si necesitas cambiar un producto, completa el siguiente formulario
                </p>
                <Button onClick={() => setMostrarFormulario(true)}>
                  Nueva Solicitud
                </Button>
              </div>
            </Card>
          ) : (
            <Card>
              <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                Nueva Solicitud de Cambio
              </h2>
              <div className="space-y-4">
                <Select
                  label="Selecciona el Producto a Cambiar"
                  options={[
                    { value: '', label: '-- Selecciona un producto --' },
                    ...productosComprados.map(p => ({
                      value: p.id,
                      label: `${p.nombre} - Pedido: ${p.pedido} (${p.fechaCompra})`
                    }))
                  ]}
                  value={productoSeleccionado}
                  onChange={(e) => setProductoSeleccionado(e.target.value)}
                  fullWidth
                />

                {productoActual && (
                  <Card className="p-4" style={{ backgroundColor: colors.fondosSuaves }}>
                    <h3 className="font-semibold mb-3" style={{ color: colors.menuTextoPrincipal }}>
                      Información del Producto Seleccionado:
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p style={{ color: colors.encabezadosAlterno }}>Producto:</p>
                        <p className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                          {productoActual.nombre}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: colors.encabezadosAlterno }}>Número de Pedido:</p>
                        <p className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                          {productoActual.pedido}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: colors.encabezadosAlterno }}>Fecha de Compra:</p>
                        <p className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                          {productoActual.fechaCompra}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: colors.encabezadosAlterno }}>Precio:</p>
                        <p className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                          {productoActual.precio}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: colors.encabezadosAlterno }}>Cantidad:</p>
                        <p className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                          {productoActual.cantidad}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: colors.encabezadosAlterno }}>Estado:</p>
                        <Badge variant="success" size="sm">{productoActual.estado}</Badge>
                      </div>
                    </div>
                  </Card>
                )}

                <Select
                  label="Motivo del Cambio"
                  options={[
                    { value: 'incorrecto', label: 'Producto Incorrecto' },
                    { value: 'equivocacion', label: 'Equivocación' },
                    { value: 'defectuoso', label: 'Producto Defectuoso' },
                    { value: 'talla', label: 'Talla/Modelo Incorrecto' },
                    { value: 'otro', label: 'Otro' },
                  ]}
                  fullWidth
                />
                <Input 
                  label="Producto de Reemplazo Deseado" 
                  placeholder="Nombre del producto que deseas recibir" 
                  fullWidth 
                />
                <Textarea 
                  label="Descripción Adicional" 
                  placeholder="Detalles adicionales sobre el cambio..." 
                  rows={3} 
                  fullWidth 
                />
                <div className="p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                  <p className="text-sm font-semibold mb-2" style={{ color: colors.menuTextoPrincipal }}>
                    Información que se enviará:
                  </p>
                  <ul className="text-sm space-y-1" style={{ color: colors.encabezadosAlterno }}>
                    <li>• Cliente: {clienteInfo.nombre} ({clienteInfo.id})</li>
                    {productoActual && (
                      <>
                        <li>• Producto: {productoActual.nombre}</li>
                        <li>• Pedido: {productoActual.pedido}</li>
                        <li>• Fecha de compra: {productoActual.fechaCompra}</li>
                      </>
                    )}
                  </ul>
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    fullWidth 
                    onClick={() => {
                      setMostrarFormulario(false);
                      setProductoSeleccionado('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    fullWidth 
                    disabled={!productoSeleccionado}
                    onClick={() => {
                      if (!productoSeleccionado) {
                        alert('Por favor selecciona un producto');
                        return;
                      }
                      alert(`Solicitud de cambio enviada para:\n\nCliente: ${clienteInfo.nombre}\nProducto: ${productoActual?.nombre}\nPedido: ${productoActual?.pedido}`);
                      setMostrarFormulario(false);
                      setProductoSeleccionado('');
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

