'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import ModuleLayout from '../../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../../components/ui/PageHeader';
import Button from '../../../../../components/ui/Button';
import Card from '../../../../../components/ui/Card';
import Badge from '../../../../../components/ui/Badge';
import { colors } from '../../../../../utils/colors';

function CalendarioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const servicioId = searchParams.get('servicioId');

  const [mesActual, setMesActual] = useState(new Date());
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(null);
  const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null);

  // Generar días del mes
  const obtenerDiasDelMes = () => {
    const year = mesActual.getFullYear();
    const month = mesActual.getMonth();
    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);
    const diasEnMes = ultimoDia.getDate();
    const diaInicioSemana = primerDia.getDay();

    const dias: (Date | null)[] = [];
    
    // Días vacíos al inicio
    for (let i = 0; i < diaInicioSemana; i++) {
      dias.push(null);
    }
    
    // Días del mes
    for (let dia = 1; dia <= diasEnMes; dia++) {
      dias.push(new Date(year, month, dia));
    }
    
    return dias;
  };

  const dias = obtenerDiasDelMes();
  const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const horasDisponibles = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30',
  ];

  const horasOcupadas = ['10:00', '11:30', '14:00', '16:30'];

  const cambiarMes = (direccion: number) => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + direccion, 1));
    setDiaSeleccionado(null);
    setHoraSeleccionada(null);
  };

  const manejarContinuar = () => {
    const fechaISO = diaSeleccionado ? diaSeleccionado.toISOString() : '';
    router.push(
      `/cliente/servicios-citas/crear-cita?servicioId=${servicioId || ''}&fecha=${fechaISO}&hora=${horaSeleccionada || ''}`
    );
  };

  return (
    <ModuleLayout>
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="Calendario de Disponibilidad"
          subtitle="Selecciona el día y hora para tu cita"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => cambiarMes(-1)}
                  className="px-4 py-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: colors.tarjetasPaneles,
                    color: colors.textoFondoOscuro,
                  }}
                >
                  ← Anterior
                </button>
                <h2
                  className="text-page-title"
                  style={{ color: colors.menuTextoPrincipal }}
                >
                  {nombresMeses[mesActual.getMonth()]} {mesActual.getFullYear()}
                </h2>
                <button
                  onClick={() => cambiarMes(1)}
                  className="px-4 py-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: colors.tarjetasPaneles,
                    color: colors.textoFondoOscuro,
                  }}
                >
                  Siguiente →
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-4">
                {nombresDias.map((dia) => (
                  <div
                    key={dia}
                    className="text-center font-semibold py-2"
                    style={{ color: colors.encabezadosAlterno }}
                  >
                    {dia}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {dias.map((dia, index) => {
                  if (!dia) {
                    return <div key={`empty-${index}`} className="h-12" />;
                  }

                  const seleccionado = diaSeleccionado?.toDateString() === dia.toDateString();
                  const esHoy = dia.toDateString() === new Date().toDateString();

                  return (
                    <button
                      key={dia.toISOString()}
                      onClick={() => setDiaSeleccionado(dia)}
                      className={`
                        h-12 rounded-lg transition-all cursor-pointer hover:scale-105
                        ${seleccionado ? 'ring-2 ring-offset-2' : ''}
                      `}
                      style={{
                        backgroundColor: seleccionado
                          ? colors.botonesPrincipales
                          : colors.tarjetasPaneles,
                        color: seleccionado
                          ? colors.textoFondoOscuro
                          : colors.menuTextoPrincipal,
                        border: esHoy ? `2px solid ${colors.warning}` : 'none',
                      }}
                    >
                      {dia.getDate()}
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          <div>
            <Card>
              <h3
                className="text-subtitle mb-4"
                style={{ color: colors.menuTextoPrincipal }}
              >
                Horarios Disponibles
              </h3>
              {diaSeleccionado ? (
                <>
                  <p className="text-sm mb-4" style={{ color: colors.encabezadosAlterno }}>
                    {diaSeleccionado.toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                    {horasDisponibles.map((hora) => {
                      const seleccionada = horaSeleccionada === hora;
                      const ocupada = horasOcupadas.includes(hora);

                      return (
                        <button
                          key={hora}
                          onClick={() => setHoraSeleccionada(hora)}
                          className={`
                            py-2 px-3 rounded-lg text-sm font-medium transition-all cursor-pointer hover:scale-105
                            ${seleccionada ? 'ring-2 ring-offset-2' : ''}
                          `}
                          style={{
                            backgroundColor: seleccionada
                              ? colors.botonesPrincipales
                              : ocupada
                              ? colors.fondosSuaves
                              : colors.tarjetasPaneles,
                            color: seleccionada
                              ? colors.textoFondoOscuro
                              : colors.menuTextoPrincipal,
                            opacity: ocupada ? 0.7 : 1,
                          }}
                        >
                          {hora}
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    fullWidth
                    className="mt-4"
                    onClick={manejarContinuar}
                  >
                    Continuar
                  </Button>
                </>
              ) : (
                <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                  Selecciona un día para ver los horarios disponibles
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}

export default function CalendarioDisponibilidadPage() {
  return (
    <Suspense fallback={
      <ModuleLayout>
        <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[200px]">
          <p style={{ color: colors.encabezadosAlterno }}>Cargando calendario...</p>
        </div>
      </ModuleLayout>
    }>
      <CalendarioContent />
    </Suspense>
  );
}
