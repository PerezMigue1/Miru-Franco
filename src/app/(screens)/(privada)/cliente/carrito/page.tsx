'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PublicLayout from '../../../../components/layouts/PublicLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Badge from '../../../../components/ui/Badge';
import { colors } from '../../../../utils/colors';

interface CartItem {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  imagen?: string;
  stock: boolean;
  seleccionado: boolean;
}

export default function CarritoPage() {
  const router = useRouter();
  const [paso, setPaso] = useState(1);
  const [items, setItems] = useState<CartItem[]>([
    { id: 1, nombre: 'Shampoo Avina', precio: 350, cantidad: 2, imagen: '🧴', stock: true, seleccionado: true },
    { id: 2, nombre: 'Acondicionador Tech Italy', precio: 380, cantidad: 1, imagen: '💧', stock: true, seleccionado: true },
    { id: 3, nombre: 'Mascarilla Alfaparf', precio: 450, cantidad: 1, imagen: '✨', stock: true, seleccionado: false },
  ]);
  const [direccion, setDireccion] = useState('');
  const [zona, setZona] = useState('');
  const [metodoEntrega, setMetodoEntrega] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [metodoPago, setMetodoPago] = useState('');
  const [datosPago, setDatosPago] = useState<any>({});

  // Cargar carrito desde localStorage al montar
  useEffect(() => {
    const carritoGuardado = localStorage.getItem('carrito');
    if (carritoGuardado) {
      try {
        const itemsGuardados = JSON.parse(carritoGuardado);
        if (itemsGuardados.length > 0) {
          const itemsConSeleccion = itemsGuardados.map((item: any) => ({
            ...item,
            seleccionado: item.seleccionado !== undefined ? item.seleccionado : true
          }));
          setItems(itemsConSeleccion);
        }
      } catch (error) {
        console.error('Error al cargar el carrito:', error);
      }
    }
  }, []);

  // Guardar carrito en localStorage cuando cambie
  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem('carrito', JSON.stringify(items));
    } else {
      localStorage.removeItem('carrito');
    }
  }, [items]);

  const toggleSeleccion = (id: number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, seleccionado: !item.seleccionado } : item
    ));
  };

  const seleccionarTodos = () => {
    const todosSeleccionados = itemsSeleccionados.length === items.length;
    setItems(items.map(item => ({ ...item, seleccionado: !todosSeleccionados })));
  };

  const actualizarCantidad = (id: number, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) {
      eliminarItem(id);
      return;
    }
    setItems(items.map(item => 
      item.id === id ? { ...item, cantidad: nuevaCantidad } : item
    ));
  };

  const eliminarItem = (id: number) => {
    if (confirm('¿Estás seguro de eliminar este producto del carrito?')) {
      const nuevosItems = items.filter(item => item.id !== id);
      setItems(nuevosItems);
      if (nuevosItems.length === 0) {
        localStorage.removeItem('carrito');
      }
    }
  };

  const vaciarCarrito = () => {
    if (confirm('¿Estás seguro de vaciar todo el carrito?')) {
      setItems([]);
      localStorage.removeItem('carrito');
    }
  };

  const itemsSeleccionados = items.filter(item => item.seleccionado);
  const zonasGratuitas = ['gratuita1', 'gratuita2', 'gratuita3', 'gratuita4'];
  const costoEnvio = zonasGratuitas.includes(zona) ? 0 : 50;
  
  const subtotal = itemsSeleccionados.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  const envio = costoEnvio;
  const total = subtotal + envio;

  // Componente de Resumen
  const ResumenCompra = () => (
    <Card>
      <h3 className="text-lg font-semibold mb-4" style={{ color: colors.menuTextoPrincipal }}>
        Resumen de Compra
      </h3>
      <div className="space-y-3 mb-4">
        <div className="flex justify-between text-sm">
          <span style={{ color: colors.encabezadosAlterno }}>Productos ({itemsSeleccionados.length}):</span>
          <span className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
            ${subtotal.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: colors.encabezadosAlterno }}>Envío:</span>
          <span className="font-semibold" style={{ color: envio === 0 ? colors.success : colors.menuTextoPrincipal }}>
            {envio === 0 ? 'Gratis' : `$${envio.toLocaleString()}`}
          </span>
        </div>
        <div className="border-t pt-3 flex justify-between" style={{ borderColor: colors.fondosSuaves }}>
          <span className="font-bold text-lg" style={{ color: colors.menuTextoPrincipal }}>Total:</span>
          <span className="font-bold text-lg" style={{ color: colors.menuTextoPrincipal }}>
            ${total.toLocaleString()}
          </span>
        </div>
      </div>
    </Card>
  );

  if (items.length === 0) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-12" style={{ marginTop: '136px' }}>
          <div className="max-w-4xl mx-auto">
            <Card>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🛒</div>
                <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Tu carrito está vacío
                </h2>
                <p className="mb-6" style={{ color: colors.encabezadosAlterno }}>
                  Agrega productos para comenzar tu compra
                </p>
                <Button onClick={() => router.push('/cliente/tienda-online')}>
                  Ver Productos
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12" style={{ marginTop: '136px' }}>
        <div className="max-w-6xl mx-auto">
          <h1 className="text-hero mb-8" style={{ color: colors.menuTextoPrincipal }}>
            Carrito de Compras
          </h1>

          {/* Indicador de pasos */}
          <div className="flex items-center justify-center mb-8 overflow-x-auto">
            <div className="flex items-center min-w-max">
              {[1, 2, 3, 4, 5].map((num) => (
                <div key={num} className="flex items-center">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      paso >= num ? 'text-white' : ''
                    }`}
                    style={{ 
                      backgroundColor: paso >= num ? colors.botonesPrincipales : colors.fondosSuaves, 
                      color: paso >= num ? colors.textoFondoOscuro : colors.menuTextoPrincipal 
                    }}
                  >
                    {num}
                  </div>
                  {num < 5 && (
                    <div 
                      className={`w-16 h-1 mx-1`} 
                      style={{ backgroundColor: paso > num ? colors.botonesPrincipales : colors.fondosSuaves }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna principal */}
            <div className="lg:col-span-2">
              {/* Paso 1: Selección de productos */}
              {paso === 1 && (
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={itemsSeleccionados.length === items.length && items.length > 0}
                        onChange={seleccionarTodos}
                        className="w-5 h-5"
                      />
                      <h2 className="text-page-title" style={{ color: colors.menuTextoPrincipal }}>
                        Selecciona los productos ({itemsSeleccionados.length} de {items.length})
                      </h2>
                    </div>
                    <Button size="sm" variant="outline" onClick={vaciarCarrito}>
                      Vaciar Carrito
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-4 rounded-lg"
                        style={{ backgroundColor: colors.fondosSuaves }}
                      >
                        <input
                          type="checkbox"
                          checked={item.seleccionado}
                          onChange={() => toggleSeleccion(item.id)}
                          className="w-5 h-5"
                        />
                        <div className="text-4xl">{item.imagen || '📦'}</div>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1" style={{ color: colors.menuTextoPrincipal }}>
                            {item.nombre}
                          </h3>
                          <p className="text-sm mb-2" style={{ color: colors.encabezadosAlterno }}>
                            ${item.precio.toLocaleString()} c/u
                          </p>
                          <div className="flex items-center gap-3">
                            <span className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                              Cantidad:
                            </span>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                                disabled={item.cantidad <= 1}
                                style={{ minWidth: '32px', padding: '4px 8px' }}
                              >
                                -
                              </Button>
                              <span 
                                className="font-semibold min-w-[30px] text-center"
                                style={{ color: colors.menuTextoPrincipal }}
                              >
                                {item.cantidad}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                                disabled={!item.stock}
                                style={{ minWidth: '32px', padding: '4px 8px' }}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg mb-2" style={{ color: colors.menuTextoPrincipal }}>
                            ${(item.precio * item.cantidad).toLocaleString()}
                          </p>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => eliminarItem(item.id)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3 mt-6">
                    <Button 
                      variant="outline" 
                      fullWidth
                      onClick={() => router.push('/cliente/tienda-online')}
                    >
                      ← Continuar Comprando
                    </Button>
                    <Button 
                      fullWidth
                      disabled={itemsSeleccionados.length === 0}
                      onClick={() => {
                        if (itemsSeleccionados.length === 0) {
                          alert('Selecciona al menos un producto para continuar');
                          return;
                        }
                        setPaso(2);
                      }}
                    >
                      Continuar con {itemsSeleccionados.length} producto(s)
                    </Button>
                  </div>
                </Card>
              )}

              {/* Paso 2: Forma de entrega */}
              {paso === 2 && (
                <Card>
                  <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                    ¿Cómo quieres recibir tu compra?
                  </h2>
                  <div className="space-y-4">
                    <Input 
                      label="Dirección de Entrega" 
                      placeholder="Calle, número, colonia, ciudad" 
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      fullWidth 
                    />
                    <Select
                      label="Zona de Entrega"
                      options={[
                        { value: '', label: '-- Selecciona una zona --' },
                        { value: 'gratuita1', label: 'Colonia Juárez (Envío Gratis)' },
                        { value: 'gratuita2', label: 'Centro (Envío Gratis)' },
                        { value: 'gratuita3', label: 'Centro Reloj (Envío Gratis)' },
                        { value: 'gratuita4', label: 'Mercado (Envío Gratis)' },
                        { value: 'pago', label: 'Otra zona (+$50.00)' },
                      ]}
                      value={zona}
                      onChange={(e) => setZona(e.target.value)}
                      fullWidth
                    />
                    <Select
                      label="Método de Entrega"
                      options={[
                        { value: '', label: '-- Selecciona método de entrega --' },
                        { value: 'domicilio', label: '🚚 Entrega a Domicilio' },
                        { value: 'sucursal', label: '🏪 Recoger en Sucursal' },
                      ]}
                      value={metodoEntrega}
                      onChange={(e) => setMetodoEntrega(e.target.value)}
                      fullWidth
                    />
                  </div>
                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" fullWidth onClick={() => setPaso(1)}>
                      ← Atrás
                    </Button>
                    <Button 
                      fullWidth
                      disabled={!direccion.trim() || !zona || !metodoEntrega}
                      onClick={() => {
                        if (!direccion.trim() || !zona || !metodoEntrega) {
                          alert('Por favor completa todos los campos de entrega');
                          return;
                        }
                        setPaso(3);
                      }}
                    >
                      Continuar
                    </Button>
                  </div>
                </Card>
              )}

              {/* Paso 3: Cuándo quieres que llegue */}
              {paso === 3 && (
                <Card>
                  <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                    ¿Cuándo quieres recibir tu compra?
                  </h2>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div
                        className="p-4 rounded-lg cursor-pointer border-2 transition-all"
                        style={{
                          backgroundColor: fechaEntrega === 'lo-antes-posible' ? colors.fondosSuaves : 'transparent',
                          borderColor: fechaEntrega === 'lo-antes-posible' ? colors.botonesPrincipales : colors.fondosSuaves
                        }}
                        onClick={() => setFechaEntrega('lo-antes-posible')}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="fechaEntrega"
                            checked={fechaEntrega === 'lo-antes-posible'}
                            onChange={() => setFechaEntrega('lo-antes-posible')}
                            className="w-5 h-5"
                          />
                          <div className="flex-1">
                            <p className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                              Lo antes posible
                            </p>
                            <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                              Coordinaremos la entrega en las próximas 24-48 horas
                            </p>
                          </div>
                        </div>
                      </div>

                      <div
                        className="p-4 rounded-lg cursor-pointer border-2 transition-all"
                        style={{
                          backgroundColor: fechaEntrega === 'mañana' ? colors.fondosSuaves : 'transparent',
                          borderColor: fechaEntrega === 'mañana' ? colors.botonesPrincipales : colors.fondosSuaves
                        }}
                        onClick={() => setFechaEntrega('mañana')}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="fechaEntrega"
                            checked={fechaEntrega === 'mañana'}
                            onChange={() => setFechaEntrega('mañana')}
                            className="w-5 h-5"
                          />
                          <div className="flex-1">
                            <p className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                              Mañana
                            </p>
                            <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                              Entrega el día siguiente
                            </p>
                          </div>
                        </div>
                      </div>

                      <div
                        className="p-4 rounded-lg cursor-pointer border-2 transition-all"
                        style={{
                          backgroundColor: fechaEntrega === 'esta-semana' ? colors.fondosSuaves : 'transparent',
                          borderColor: fechaEntrega === 'esta-semana' ? colors.botonesPrincipales : colors.fondosSuaves
                        }}
                        onClick={() => setFechaEntrega('esta-semana')}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="fechaEntrega"
                            checked={fechaEntrega === 'esta-semana'}
                            onChange={() => setFechaEntrega('esta-semana')}
                            className="w-5 h-5"
                          />
                          <div className="flex-1">
                            <p className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                              Esta semana
                            </p>
                            <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                              Entrega dentro de los próximos 7 días
                            </p>
                          </div>
                        </div>
                      </div>

                      <div
                        className="p-4 rounded-lg cursor-pointer border-2 transition-all"
                        style={{
                          backgroundColor: fechaEntrega === 'fecha-personalizada' ? colors.fondosSuaves : 'transparent',
                          borderColor: fechaEntrega === 'fecha-personalizada' ? colors.botonesPrincipales : colors.fondosSuaves
                        }}
                        onClick={() => setFechaEntrega('fecha-personalizada')}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="fechaEntrega"
                            checked={fechaEntrega === 'fecha-personalizada'}
                            onChange={() => setFechaEntrega('fecha-personalizada')}
                            className="w-5 h-5"
                          />
                          <div className="flex-1">
                            <p className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                              Elegir fecha específica
                            </p>
                            <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                              Selecciona una fecha y horario personalizado
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {fechaEntrega === 'fecha-personalizada' && (
                      <div className="p-4 rounded-lg space-y-4" style={{ backgroundColor: colors.fondosSuaves }}>
                        <Input 
                          label="Fecha de Entrega" 
                          type="date"
                          value={datosPago.fechaEspecifica || ''}
                          onChange={(e) => setDatosPago({ ...datosPago, fechaEspecifica: e.target.value })}
                          fullWidth 
                        />
                        <div>
                          <p className="text-sm mb-2 font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                            Horarios Disponibles:
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {['9:00 AM - 12:00 PM', '12:00 PM - 3:00 PM', '3:00 PM - 6:00 PM', '6:00 PM - 8:00 PM'].map((horario) => (
                              <Button
                                key={horario}
                                variant="outline"
                                size="sm"
                                onClick={() => setDatosPago({ ...datosPago, horario })}
                                style={{
                                  backgroundColor: datosPago.horario === horario ? colors.botonesPrincipales : 'transparent',
                                  color: datosPago.horario === horario ? colors.textoFondoOscuro : colors.menuTextoPrincipal
                                }}
                              >
                                {horario}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-3 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                      <p className="text-xs" style={{ color: colors.encabezadosAlterno }}>
                        💡 Esta opción es opcional. Si no seleccionas ninguna opción, coordinaremos la entrega contigo.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" fullWidth onClick={() => setPaso(2)}>
                      ← Atrás
                    </Button>
                    <Button 
                      fullWidth
                      onClick={() => setPaso(4)}
                    >
                      Continuar
                    </Button>
                  </div>
                </Card>
              )}

              {/* Paso 4: Opciones de pago */}
              {paso === 4 && (
                <Card>
                  <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                    ¿Cómo quieres pagar?
                  </h2>
                  <div className="space-y-4">
                    <Select
                      label="Método de Pago"
                      options={[
                        { value: '', label: '-- Selecciona método de pago --' },
                        { value: 'transferencia', label: '💳 Transferencia Bancaria' },
                        { value: 'efectivo', label: '💵 Efectivo al Recibir' },
                        { value: 'tarjeta', label: '💳 Tarjeta de Crédito/Débito' },
                      ]}
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                      fullWidth
                    />

                    {metodoPago === 'transferencia' && (
                      <div className="p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                        <h3 className="font-semibold mb-3" style={{ color: colors.menuTextoPrincipal }}>
                          Datos para Transferencia
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span style={{ color: colors.encabezadosAlterno }}>Banco: </span>
                            <span className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>BBVA Bancomer</span>
                          </div>
                          <div>
                            <span style={{ color: colors.encabezadosAlterno }}>CLABE: </span>
                            <span className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>012 180 001234567890</span>
                          </div>
                          <div>
                            <span style={{ color: colors.encabezadosAlterno }}>Cuenta: </span>
                            <span className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>0123456789</span>
                          </div>
                          <div>
                            <span style={{ color: colors.encabezadosAlterno }}>Titular: </span>
                            <span className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>Mildred Franco</span>
                          </div>
                        </div>
                        <Input 
                          label="Número de Referencia" 
                          placeholder="Ingresa el número de referencia de tu transferencia" 
                          fullWidth 
                          className="mt-4"
                        />
                      </div>
                    )}

                    {metodoPago === 'tarjeta' && (
                      <div className="p-4 rounded-lg space-y-4" style={{ backgroundColor: colors.fondosSuaves }}>
                        <h3 className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                          Información de Tarjeta
                        </h3>
                        <Input label="Número de Tarjeta" placeholder="1234 5678 9012 3456" maxLength={19} fullWidth />
                        <div className="grid grid-cols-2 gap-4">
                          <Input label="Vencimiento" placeholder="MM/AA" maxLength={5} fullWidth />
                          <Input label="CVV" placeholder="123" type="password" maxLength={4} fullWidth />
                        </div>
                        <Input label="Nombre del Titular" placeholder="Como aparece en la tarjeta" fullWidth />
                      </div>
                    )}

                    {metodoPago === 'efectivo' && (
                      <div className="p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                        <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                          💵 Pagarás en efectivo cuando recibas tu pedido. El mensajero traerá cambio.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" fullWidth onClick={() => setPaso(3)}>
                      ← Atrás
                    </Button>
                    <Button 
                      fullWidth
                      disabled={!metodoPago}
                      onClick={() => {
                        if (!metodoPago) {
                          alert('Por favor selecciona un método de pago');
                          return;
                        }
                        setPaso(5);
                      }}
                    >
                      Continuar
                    </Button>
                  </div>
                </Card>
              )}

              {/* Paso 5: Confirmación */}
              {paso === 5 && (
                <Card>
                  <div className="text-center">
                    <div className="text-6xl mb-4">✅</div>
                    <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                      ¡Pedido Confirmado!
                    </h2>
                    <div className="space-y-4 mb-6 text-left max-w-md mx-auto">
                      <div className="p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                        <h3 className="font-semibold mb-3" style={{ color: colors.menuTextoPrincipal }}>
                          Resumen del Pedido
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span style={{ color: colors.encabezadosAlterno }}>Productos: </span>
                            <span className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                              {itemsSeleccionados.length} artículo(s)
                            </span>
                          </div>
                          <div>
                            <span style={{ color: colors.encabezadosAlterno }}>Dirección: </span>
                            <span className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>{direccion}</span>
                          </div>
                          <div>
                            <span style={{ color: colors.encabezadosAlterno }}>Método de entrega: </span>
                            <span className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                              {metodoEntrega === 'domicilio' ? 'Entrega a Domicilio' : 'Recoger en Sucursal'}
                            </span>
                          </div>
                          {fechaEntrega && (
                            <div>
                              <span style={{ color: colors.encabezadosAlterno }}>Fecha de entrega: </span>
                              <span className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>{fechaEntrega}</span>
                            </div>
                          )}
                          <div>
                            <span style={{ color: colors.encabezadosAlterno }}>Método de pago: </span>
                            <span className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                              {metodoPago === 'transferencia' ? 'Transferencia Bancaria' : 
                               metodoPago === 'tarjeta' ? 'Tarjeta' : 'Efectivo al Recibir'}
                            </span>
                          </div>
                          <div className="border-t pt-2 mt-2" style={{ borderColor: colors.fondosSuaves }}>
                            <div className="flex justify-between">
                              <span style={{ color: colors.encabezadosAlterno }}>Total: </span>
                              <span className="text-xl font-bold" style={{ color: colors.menuTextoPrincipal }}>
                                ${total.toLocaleString()} MXN
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="mb-6" style={{ color: colors.encabezadosAlterno }}>
                      {metodoPago === 'transferencia' 
                        ? 'Te enviaremos los datos bancarios por correo. Una vez confirmado el pago, procesaremos tu pedido.'
                        : metodoPago === 'tarjeta'
                        ? 'Tu pago está siendo procesado. Te notificaremos cuando se confirme.'
                        : 'Te contactaremos para coordinar la entrega y el pago.'}
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setItems([]);
                          setDireccion('');
                          setZona('');
                          setMetodoEntrega('');
                          setFechaEntrega('');
                          setMetodoPago('');
                          setDatosPago({});
                          setPaso(1);
                          localStorage.removeItem('carrito');
                          router.push('/cliente/tienda-online');
                        }}
                      >
                        Seguir Comprando
                      </Button>
                      <Button 
                        onClick={() => {
                          router.push('/cliente/tienda-online/rastreo-pedidos');
                        }}
                      >
                        Ver Mis Pedidos
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Columna lateral - Resumen */}
            <div className="lg:col-span-1">
              {paso < 5 && <ResumenCompra />}
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
