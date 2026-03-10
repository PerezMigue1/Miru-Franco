'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import ModuleLayout from '../../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../../components/ui/PageHeader';
import Button from '../../../../../components/ui/Button';
import Card from '../../../../../components/ui/Card';
import Input from '../../../../../components/ui/Input';
import Select from '../../../../../components/ui/Select';
import { useCart } from '../../../../../context/CartContext';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart } = useCart();
  const [paso, setPaso] = useState(1);

  const subtotal = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  const envio = items.length > 0 ? 50 : 0;
  const total = subtotal + envio;

  useEffect(() => {
    if (items.length === 0 && paso > 0) {
      router.replace('/cliente/tienda-online/carrito');
    }
  }, [items.length, paso, router]);

  const [datosPersonales, setDatosPersonales] = useState({
    nombre: '',
    apellidos: '',
    email: '',
    telefono: '',
  });

  const [direccionEnvio, setDireccionEnvio] = useState({
    calle: '',
    numero: '',
    colonia: '',
    ciudad: '',
    estado: '',
    codigoPostal: '',
    referencias: '',
  });

  const [metodoPago, setMetodoPago] = useState({
    tipo: '',
    numeroTarjeta: '',
    nombreTitular: '',
    fechaVencimiento: '',
    cvv: '',
  });

  const estados = [
    { value: 'cdmx', label: 'Ciudad de México' },
    { value: 'jalisco', label: 'Jalisco' },
    { value: 'nuevo-leon', label: 'Nuevo León' },
    { value: 'puebla', label: 'Puebla' },
    { value: 'yucatan', label: 'Yucatán' },
  ];

  const metodosPago = [
    { value: 'tarjeta', label: 'Tarjeta de Crédito/Débito' },
    { value: 'paypal', label: 'PayPal' },
    { value: 'transferencia', label: 'Transferencia Bancaria' },
  ];

  const manejarSiguiente = () => {
    if (paso < 3) {
      setPaso(paso + 1);
    } else {
      clearCart();
      router.push('/cliente/tienda-online/confirmacion');
    }
  };

  const manejarAnterior = () => {
    if (paso > 1) {
      setPaso(paso - 1);
    }
  };

  return (
    <ModuleLayout>
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="Checkout"
          subtitle="Completa tu información para finalizar la compra"
        />

        <div className="mb-6">
          <div className="flex items-center justify-center gap-4">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    paso >= num ? 'ring-2 ring-offset-2' : ''
                  }`}
                  style={{
                    backgroundColor: paso >= num ? 'var(--botones-principales)' : 'var(--fondos-suaves)',
                    color: paso >= num ? 'var(--texto-fondo-oscuro)' : 'var(--menu-texto-principal)',
                  }}
                >
                  {num}
                </div>
                {num < 3 && (
                  <div
                    className={`w-16 h-1 ${paso > num ? '' : 'opacity-50'}`}
                    style={{ backgroundColor: paso > num ? 'var(--botones-principales)' : 'var(--fondos-suaves)' }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-16 mt-2">
            <span className="text-sm" style={{ color: paso >= 1 ? 'var(--menu-texto-principal)' : 'var(--encabezados-alterno)' }}>
              Datos Personales
            </span>
            <span className="text-sm" style={{ color: paso >= 2 ? 'var(--menu-texto-principal)' : 'var(--encabezados-alterno)' }}>
              Envío
            </span>
            <span className="text-sm" style={{ color: paso >= 3 ? 'var(--menu-texto-principal)' : 'var(--encabezados-alterno)' }}>
              Pago
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {paso === 1 && (
              <Card>
                <h2
                  className="text-page-title mb-6"
                  style={{ color: 'var(--menu-texto-principal)' }}
                >
                  Datos Personales
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Nombre"
                      value={datosPersonales.nombre}
                      onChange={(e) => setDatosPersonales({ ...datosPersonales, nombre: e.target.value })}
                      fullWidth
                    />
                    <Input
                      label="Apellidos"
                      value={datosPersonales.apellidos}
                      onChange={(e) => setDatosPersonales({ ...datosPersonales, apellidos: e.target.value })}
                      fullWidth
                    />
                  </div>
                  <Input
                    label="Email"
                    type="email"
                    value={datosPersonales.email}
                    onChange={(e) => setDatosPersonales({ ...datosPersonales, email: e.target.value })}
                    fullWidth
                  />
                  <Input
                    label="Teléfono"
                    type="tel"
                    value={datosPersonales.telefono}
                    onChange={(e) => setDatosPersonales({ ...datosPersonales, telefono: e.target.value })}
                    fullWidth
                  />
                </div>
              </Card>
            )}

            {paso === 2 && (
              <Card>
                <h2
                  className="text-page-title mb-6"
                  style={{ color: 'var(--menu-texto-principal)' }}
                >
                  Dirección de Envío
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="Calle"
                      value={direccionEnvio.calle}
                      onChange={(e) => setDireccionEnvio({ ...direccionEnvio, calle: e.target.value })}
                      fullWidth
                    />
                    <Input
                      label="Número"
                      value={direccionEnvio.numero}
                      onChange={(e) => setDireccionEnvio({ ...direccionEnvio, numero: e.target.value })}
                      fullWidth
                    />
                    <Input
                      label="Colonia"
                      value={direccionEnvio.colonia}
                      onChange={(e) => setDireccionEnvio({ ...direccionEnvio, colonia: e.target.value })}
                      fullWidth
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Ciudad"
                      value={direccionEnvio.ciudad}
                      onChange={(e) => setDireccionEnvio({ ...direccionEnvio, ciudad: e.target.value })}
                      fullWidth
                    />
                    <Select
                      label="Estado"
                      options={estados}
                      value={direccionEnvio.estado}
                      onChange={(e) => setDireccionEnvio({ ...direccionEnvio, estado: e.target.value })}
                      fullWidth
                    />
                  </div>
                  <Input
                    label="Código Postal"
                    value={direccionEnvio.codigoPostal}
                    onChange={(e) => setDireccionEnvio({ ...direccionEnvio, codigoPostal: e.target.value })}
                    fullWidth
                  />
                  <Input
                    label="Referencias (Opcional)"
                    value={direccionEnvio.referencias}
                    onChange={(e) => setDireccionEnvio({ ...direccionEnvio, referencias: e.target.value })}
                    fullWidth
                    placeholder="Indicaciones adicionales para la entrega"
                  />
                </div>
              </Card>
            )}

            {paso === 3 && (
              <Card>
                <h2
                  className="text-page-title mb-6"
                  style={{ color: 'var(--menu-texto-principal)' }}
                >
                  Método de Pago
                </h2>
                <div className="space-y-4">
                  <Select
                    label="Método de Pago"
                    options={metodosPago}
                    value={metodoPago.tipo}
                    onChange={(e) => setMetodoPago({ ...metodoPago, tipo: e.target.value })}
                    fullWidth
                  />
                  {metodoPago.tipo === 'tarjeta' && (
                    <>
                      <Input
                        label="Número de Tarjeta"
                        value={metodoPago.numeroTarjeta}
                        onChange={(e) => setMetodoPago({ ...metodoPago, numeroTarjeta: e.target.value })}
                        fullWidth
                        placeholder="1234 5678 9012 3456"
                      />
                      <Input
                        label="Nombre del Titular"
                        value={metodoPago.nombreTitular}
                        onChange={(e) => setMetodoPago({ ...metodoPago, nombreTitular: e.target.value })}
                        fullWidth
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Fecha de Vencimiento"
                          value={metodoPago.fechaVencimiento}
                          onChange={(e) => setMetodoPago({ ...metodoPago, fechaVencimiento: e.target.value })}
                          fullWidth
                          placeholder="MM/AA"
                        />
                        <Input
                          label="CVV"
                          type="password"
                          value={metodoPago.cvv}
                          onChange={(e) => setMetodoPago({ ...metodoPago, cvv: e.target.value })}
                          fullWidth
                          placeholder="123"
                        />
                      </div>
                    </>
                  )}
                </div>
              </Card>
            )}

            <div className="flex gap-4 mt-6">
              {paso > 1 && (
                <Button
                  variant="outline"
                  fullWidth
                  onClick={manejarAnterior}
                >
                  Anterior
                </Button>
              )}
              <Button
                fullWidth
                onClick={manejarSiguiente}
              >
                {paso === 3 ? 'Confirmar Compra' : 'Siguiente'}
              </Button>
            </div>
          </div>

          <div>
            <Card>
              <h3
                className="text-subtitle mb-4"
                style={{ color: 'var(--menu-texto-principal)' }}
              >
                Resumen del Pedido
              </h3>
              {items.length > 0 && (
                <div className="mb-4 max-h-40 overflow-y-auto space-y-2" style={{ borderBottom: '1px solid var(--fondos-suaves)' }}>
                  {items.map((item) => (
                    <div key={String(item.id)} className="flex justify-between text-sm">
                      <span style={{ color: 'var(--menu-texto-principal)' }}>
                        {item.nombre}
                        {item.presentacion && (
                          <span style={{ color: 'var(--encabezados-alterno)' }}> — {item.presentacion}</span>
                        )}
                        <span style={{ color: 'var(--encabezados-alterno)' }}> × {item.cantidad}</span>
                      </span>
                      <span style={{ color: 'var(--menu-texto-principal)' }}>
                        ${(item.precio * item.cantidad).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--encabezados-alterno)' }}>Subtotal:</span>
                  <span style={{ color: 'var(--menu-texto-principal)' }}>${subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--encabezados-alterno)' }}>Envío:</span>
                  <span style={{ color: 'var(--menu-texto-principal)' }}>${envio.toLocaleString()}</span>
                </div>
                <div className="pt-3 border-t" style={{ borderColor: 'var(--fondos-suaves)' }}>
                  <div className="flex justify-between">
                    <span className="font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                      Total:
                    </span>
                    <span
                      className="text-2xl font-bold"
                      style={{ color: 'var(--menu-texto-principal)' }}
                    >
                      ${total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}










