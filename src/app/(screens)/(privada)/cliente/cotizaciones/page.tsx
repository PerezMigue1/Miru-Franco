'use client';

import { useState } from 'react';
import PublicLayout from '../../../../components/layouts/PublicLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Textarea from '../../../../components/ui/Textarea';
import Badge from '../../../../components/ui/Badge';
import { showAlert } from '../../../../utils/toast';

export default function CotizacionesPage() {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const paquetes = [
    { id: 1, nombre: 'Maquillaje Social', precio: '$800', descripcion: 'Maquillaje para eventos sociales generales' },
    { id: 2, nombre: 'Quince Años', precio: '$1,200', descripcion: 'Paquete completo para quinceañeras (maquillaje + peinado)' },
    { id: 3, nombre: 'Bodas', precio: '$1,500', descripcion: 'Paquete para novias (maquillaje + peinado)' },
  ];

  const cotizaciones = [
    { id: 1, evento: 'Boda', fecha: '2024-02-14', paquete: 'Bodas', estado: 'pendiente' },
    { id: 2, evento: 'Quince Años', fecha: '2024-03-20', paquete: 'Quince Años', estado: 'enviada' },
  ];

  return (
    <PublicLayout>
      <div className="layout-page py-12" style={{ marginTop: '136px' }}>
        <div className="w-full max-w-none">
          <div className="text-center mb-12">
            <h1 className="text-hero mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
              Cotizaciones para Eventos Especiales
            </h1>
            <p className="text-lead max-w-2xl mx-auto" style={{ color: 'var(--encabezados-alterno)' }}>
              Paquetes especiales de maquillaje y peinado para tus eventos más importantes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {paquetes.map((paquete) => (
              <Card key={paquete.id} variant="elevated">
                <h3 className="text-subtitle mb-2" style={{ color: 'var(--texto-fondo-oscuro)' }}>
                  {paquete.nombre}
                </h3>
                <p className="text-2xl font-bold mb-2" style={{ color: 'var(--texto-fondo-oscuro)' }}>
                  {paquete.precio}
                </p>
                <p className="text-sm mb-4" style={{ color: 'var(--texto-fondo-oscuro)' }}>
                  {paquete.descripcion}
                </p>
                <Button 
                  fullWidth 
                  size="sm"
                  onClick={() => setMostrarFormulario(true)}
                >
                  Solicitar Cotización
                </Button>
              </Card>
            ))}
          </div>

          <Card className="mb-6">
            <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
              Mis Cotizaciones
            </h2>
            <div className="space-y-4">
              {cotizaciones.map((cotizacion) => (
                <div
                  key={cotizacion.id}
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{ backgroundColor: 'var(--fondos-suaves)' }}
                >
                  <div>
                    <p className="font-semibold mb-1" style={{ color: 'var(--menu-texto-principal)' }}>
                      {cotizacion.evento} - {cotizacion.paquete}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                      Fecha del evento: {cotizacion.fecha}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={cotizacion.estado === 'enviada' ? 'success' : 'warning'}>
                      {cotizacion.estado === 'enviada' ? 'Enviada' : 'Pendiente'}
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        showAlert(`Detalles de cotización: ${cotizacion.evento} - ${cotizacion.paquete}\nFecha: ${cotizacion.fecha}\nEstado: ${cotizacion.estado}`);
                      }}
                    >
                      Ver Detalles
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {!mostrarFormulario ? (
            <Card>
              <div className="text-center">
                <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  Solicitar Nueva Cotización
                </h2>
                <p className="mb-6" style={{ color: 'var(--encabezados-alterno)' }}>
                  Completa el formulario y te enviaremos una cotización personalizada para tu evento
                </p>
                <Button onClick={() => setMostrarFormulario(true)}>
                  Solicitar Cotización
                </Button>
              </div>
            </Card>
          ) : (
            <Card>
              <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                Nueva Solicitud de Cotización
              </h2>
              <div className="space-y-4">
                <Select
                  label="Tipo de Evento"
                  options={[
                    { value: 'social', label: 'Maquillaje Social' },
                    { value: 'quince', label: 'Quince Años' },
                    { value: 'boda', label: 'Boda' },
                  ]}
                  fullWidth
                />
                <Input label="Fecha del Evento" type="date" fullWidth />
                <Input label="Cantidad de Personas" type="number" fullWidth />
                <Input label="Lugar del Evento" placeholder="Dirección o lugar" fullWidth />
                <Textarea label="Detalles Adicionales" placeholder="Hora del evento, estilo deseado, etc..." rows={4} fullWidth />
                <div className="flex gap-3">
                  <Button variant="outline" fullWidth onClick={() => setMostrarFormulario(false)}>
                    Cancelar
                  </Button>
                  <Button fullWidth onClick={() => setMostrarFormulario(false)}>
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

