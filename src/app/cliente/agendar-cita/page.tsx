'use client';

import { useState } from 'react';
import PublicLayout from '../../components/layouts/PublicLayout';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Textarea from '../../components/ui/Textarea';
import { colors } from '../../utils/colors';

export default function AgendarCitaPage() {
  const [paso, setPaso] = useState(1);
  const [metodoPago, setMetodoPago] = useState<string>('');
  const [pagarAhora, setPagarAhora] = useState<boolean | null>(null);

  const servicios = [
    { value: 'corte', label: 'Corte de Cabello - $350' },
    { value: 'alaciado', label: 'Alaciado - $800' },
    { value: 'nanoplastia', label: 'Nanoplastía - $1,200' },
    { value: 'depilacion', label: 'Depilación de Cejas - $150' },
    { value: 'coloracion', label: 'Coloración - $600' },
    { value: 'tratamiento', label: 'Tratamiento Capilar - $450' },
  ];

  const especialistas = [
    { value: 'mildred', label: 'Mildred Franco' },
    { value: 'auxiliar', label: 'Auxiliar' },
    { value: 'cualquiera', label: 'Cualquiera disponible' },
  ];

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12" style={{ marginTop: '136px' }}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-hero mb-4" style={{ color: colors.menuTextoPrincipal }}>
              Agendar Cita
            </h1>
            <p className="text-lead" style={{ color: colors.encabezadosAlterno }}>
              Selecciona el servicio y la fecha que mejor se adapte a tu horario
            </p>
          </div>

          {/* Indicador de pasos */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${paso >= 1 ? 'text-white' : ''}`}
                style={{ backgroundColor: paso >= 1 ? colors.botonesPrincipales : colors.fondosSuaves, color: paso >= 1 ? colors.textoFondoOscuro : colors.menuTextoPrincipal }}>
                1
              </div>
              <div className={`w-24 h-1`} style={{ backgroundColor: paso >= 2 ? colors.botonesPrincipales : colors.fondosSuaves }}></div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${paso >= 2 ? 'text-white' : ''}`}
                style={{ backgroundColor: paso >= 2 ? colors.botonesPrincipales : colors.fondosSuaves, color: paso >= 2 ? colors.textoFondoOscuro : colors.menuTextoPrincipal }}>
                2
              </div>
              <div className={`w-24 h-1`} style={{ backgroundColor: paso >= 3 ? colors.botonesPrincipales : colors.fondosSuaves }}></div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${paso >= 3 ? 'text-white' : ''}`}
                style={{ backgroundColor: paso >= 3 ? colors.botonesPrincipales : colors.fondosSuaves, color: paso >= 3 ? colors.textoFondoOscuro : colors.menuTextoPrincipal }}>
                3
              </div>
            </div>
          </div>

          <Card>
            {paso === 1 && (
              <div className="space-y-4">
                <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Selecciona el Servicio
                </h2>
                <Select label="Servicio" options={servicios} fullWidth />
                <Select label="Especialista Preferida (Opcional)" options={especialistas} fullWidth />
                <div className="flex gap-3 mt-6">
                  <Button variant="outline" fullWidth onClick={() => window.history.back()}>
                    Cancelar
                  </Button>
                  <Button fullWidth onClick={() => setPaso(2)}>
                    Continuar
                  </Button>
                </div>
              </div>
            )}

            {paso === 2 && (
              <div className="space-y-4">
                <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Selecciona Fecha y Hora
                </h2>
                <Input label="Fecha" type="date" fullWidth />
                <Input label="Hora" type="time" fullWidth />
                <div className="p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                  <p className="text-sm font-semibold mb-2" style={{ color: colors.menuTextoPrincipal }}>
                    Horarios Disponibles:
                  </p>
                  <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                    Lunes a Sábado: 9:30 AM - 7:00 PM
                  </p>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button variant="outline" fullWidth onClick={() => setPaso(1)}>
                    Atrás
                  </Button>
                  <Button fullWidth onClick={() => setPaso(3)}>
                    Continuar
                  </Button>
                </div>
              </div>
            )}

            {paso === 3 && (
              <div className="space-y-4">
                <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Información de Contacto y Pago
                </h2>
                <Input label="Nombre Completo" placeholder="Tu nombre completo" fullWidth />
                <Input label="Teléfono" placeholder="555-1234-5678" fullWidth />
                <Input label="Email (Opcional)" type="email" placeholder="tu@email.com" fullWidth />
                <Textarea label="Notas Adicionales (Opcional)" placeholder="Alguna preferencia o información importante..." rows={3} fullWidth />
                
                <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: colors.fondosSuaves }}>
                  <p className="text-sm font-semibold mb-2" style={{ color: colors.menuTextoPrincipal }}>
                    Anticipo Requerido:
                  </p>
                  <p className="text-2xl font-bold mb-1" style={{ color: colors.menuTextoPrincipal }}>
                    $150.00 MXN
                  </p>
                  <p className="text-sm mb-3" style={{ color: colors.encabezadosAlterno }}>
                    Para confirmar tu cita, se requiere un anticipo. Puedes pagarlo ahora o coordinarlo después.
                  </p>
                  <div className="flex gap-3">
                    <Button 
                      variant={pagarAhora === true ? 'primary' : 'outline'}
                      fullWidth
                      onClick={() => setPagarAhora(true)}
                    >
                      Pagar Ahora
                    </Button>
                    <Button 
                      variant={pagarAhora === false ? 'primary' : 'outline'}
                      fullWidth
                      onClick={() => {
                        setPagarAhora(false);
                        setMetodoPago('');
                      }}
                    >
                      Coordinar Después
                    </Button>
                  </div>
                </div>

                {pagarAhora === true && (
                  <>
                    <Select
                      label="Método de Pago"
                      options={[
                        { value: '', label: '-- Selecciona método de pago --' },
                        { value: 'tarjeta', label: '💳 Tarjeta de Crédito/Débito' },
                        { value: 'transferencia', label: '🏦 Transferencia Bancaria' },
                      ]}
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                      fullWidth
                    />

                    {metodoPago === 'tarjeta' && (
                      <div className="space-y-4 p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                        <h3 className="font-semibold mb-3" style={{ color: colors.menuTextoPrincipal }}>
                          Información de Tarjeta
                        </h3>
                        <Input 
                          label="Número de Tarjeta" 
                          placeholder="1234 5678 9012 3456" 
                          maxLength={19}
                          fullWidth 
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <Input 
                            label="Fecha de Vencimiento" 
                            placeholder="MM/AA" 
                            maxLength={5}
                            fullWidth 
                          />
                          <Input 
                            label="CVV" 
                            placeholder="123" 
                            type="password"
                            maxLength={4}
                            fullWidth 
                          />
                        </div>
                        <Input 
                          label="Nombre del Titular" 
                          placeholder="Como aparece en la tarjeta" 
                          fullWidth 
                        />
                        <div className="p-3 rounded-lg" style={{ backgroundColor: colors.tarjetasPaneles }}>
                          <p className="text-xs" style={{ color: colors.encabezadosAlterno }}>
                            🔒 Tu información está protegida. El pago se procesa de forma segura.
                          </p>
                        </div>
                      </div>
                    )}

                    {metodoPago === 'transferencia' && (
                      <div className="space-y-4 p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                        <h3 className="font-semibold mb-3" style={{ color: colors.menuTextoPrincipal }}>
                          Datos para Transferencia
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm mb-1" style={{ color: colors.encabezadosAlterno }}>Banco:</p>
                            <p className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                              BBVA Bancomer
                            </p>
                          </div>
                          <div>
                            <p className="text-sm mb-1" style={{ color: colors.encabezadosAlterno }}>CLABE:</p>
                            <p className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                              012 180 001234567890
                            </p>
                          </div>
                          <div>
                            <p className="text-sm mb-1" style={{ color: colors.encabezadosAlterno }}>Número de Cuenta:</p>
                            <p className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                              0123456789
                            </p>
                          </div>
                          <div>
                            <p className="text-sm mb-1" style={{ color: colors.encabezadosAlterno }}>Titular:</p>
                            <p className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                              Mildred Franco
                            </p>
                          </div>
                          <div>
                            <p className="text-sm mb-1" style={{ color: colors.encabezadosAlterno }}>Monto a Transferir:</p>
                            <p className="text-xl font-bold" style={{ color: colors.menuTextoPrincipal }}>
                              $150.00 MXN
                            </p>
                          </div>
                        </div>
                        <div className="p-3 rounded-lg mt-4" style={{ backgroundColor: colors.tarjetasPaneles }}>
                          <p className="text-xs mb-2 font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                            Instrucciones:
                          </p>
                          <ul className="text-xs space-y-1" style={{ color: colors.encabezadosAlterno }}>
                            <li>1. Realiza la transferencia por el monto exacto</li>
                            <li>2. Guarda el comprobante de transferencia</li>
                            <li>3. Sube el comprobante a continuación</li>
                          </ul>
                        </div>
                        <Input 
                          label="Número de Referencia/Comprobante" 
                          placeholder="Ingresa el número de referencia de tu transferencia" 
                          fullWidth 
                        />
                        <div>
                          <label className="block mb-2 text-sm font-medium" style={{ color: colors.menuTextoPrincipal }}>
                            Comprobante de Transferencia (Opcional)
                          </label>
                          <input 
                            type="file" 
                            accept="image/*,.pdf"
                            className="w-full px-4 py-2.5 rounded-lg border transition-all duration-300"
                            style={{
                              backgroundColor: colors.textoFondoOscuro,
                              borderColor: colors.fondosSuaves,
                              color: colors.menuTextoPrincipal,
                            }}
                          />
                          <p className="mt-1 text-xs" style={{ color: colors.encabezadosAlterno }}>
                            Formatos aceptados: JPG, PNG, PDF (máx. 5MB)
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="flex gap-3 mt-6">
                  <Button variant="outline" fullWidth onClick={() => setPaso(2)}>
                    Atrás
                  </Button>
                  <Button 
                    fullWidth 
                    disabled={pagarAhora === null || (pagarAhora === true && !metodoPago)}
                    onClick={() => {
                      if (pagarAhora === true && !metodoPago) {
                        alert('Por favor selecciona un método de pago');
                        return;
                      }
                      if (pagarAhora === true) {
                        alert(`Cita agendada exitosamente!\n\nMétodo de pago: ${metodoPago === 'tarjeta' ? 'Tarjeta' : 'Transferencia'}\nAnticipo: $150.00 MXN\n\nTe enviaremos una confirmación por correo.`);
                      } else {
                        alert('Cita agendada exitosamente!\n\nTe contactaremos para coordinar el pago del anticipo.\n\nTe enviaremos una confirmación por correo.');
                      }
                      // En producción, aquí se procesaría el pago y se guardaría la cita
                    }}
                  >
                    Confirmar Cita
                  </Button>
                </div>
              </div>
            )}

          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}

