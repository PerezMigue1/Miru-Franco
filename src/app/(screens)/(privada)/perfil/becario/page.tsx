'use client';

import ModuleLayout from '../../../../components/layouts/ModuleLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Badge from '../../../../components/ui/Badge';
import { colors } from '../../../../utils/colors';

export default function PerfilBecarioPage() {
  return (
    <ModuleLayout>
      <div className="container mx-auto px-4 py-12" style={{ marginTop: '136px' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-hero mb-2" style={{ color: colors.menuTextoPrincipal }}>
                Mi Perfil - Becario
              </h1>
              <Badge variant="default" size="lg">Becario</Badge>
            </div>
            <Button variant="outline">Editar Perfil</Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Información Personal
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Nombre Completo" defaultValue="Becario" fullWidth />
                  <Input label="Email" type="email" defaultValue="becario@ejemplo.com" fullWidth />
                  <Input label="Teléfono" defaultValue="555-0000-0000" fullWidth />
                  <Input label="Programa" defaultValue="Jóvenes Construyendo" fullWidth />
                </div>
                <div className="mt-4">
                  <Button>Guardar Cambios</Button>
                </div>
              </Card>

              <Card>
                <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Mis Funciones Disponibles
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <p className="font-semibold mb-2" style={{ color: colors.menuTextoPrincipal }}>
                      ✓ Ver Agenda del Día
                    </p>
                    <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                      Solo lectura - Consultar disponibilidad
                    </p>
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <p className="font-semibold mb-2" style={{ color: colors.menuTextoPrincipal }}>
                      ✓ Registrar Datos Preliminares
                    </p>
                    <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                      Apoyo en digitalización de datos
                    </p>
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <p className="font-semibold mb-2" style={{ color: colors.menuTextoPrincipal }}>
                      ✓ Consultar Productos Faltantes
                    </p>
                    <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                      Solo lectura - Ver lista de faltantes
                    </p>
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <p className="font-semibold mb-2" style={{ color: colors.menuTextoPrincipal }}>
                      ✓ Subir Fotografías
                    </p>
                    <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                      Para catálogos o documentación
                    </p>
                  </div>
                </div>
              </Card>

              <Card>
                <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Restricciones de Acceso
                </h2>
                <div className="p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                  <p className="text-sm mb-3" style={{ color: colors.encabezadosAlterno }}>
                    Como becario, tu acceso es limitado para tareas de apoyo operativo. No puedes:
                  </p>
                  <ul className="space-y-2 text-sm" style={{ color: colors.encabezadosAlterno }}>
                    <li>• Gestionar inventario</li>
                    <li>• Registrar ventas ni pagos</li>
                    <li>• Acceder a reportes</li>
                    <li>• Gestionar usuarios ni roles</li>
                    <li>• Gestionar servicios ni citas</li>
                    <li>• Acceder a datos sensibles de clientes</li>
                  </ul>
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <div className="text-center mb-4">
                  <div className="w-32 h-32 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: colors.fondosSuaves }}>
                    <svg className="w-16 h-16" style={{ color: colors.menuTextoPrincipal }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-subtitle mb-1" style={{ color: colors.menuTextoPrincipal }}>
                    Becario
                  </h3>
                  <p className="text-sm mb-4" style={{ color: colors.encabezadosAlterno }}>
                    Jóvenes Construyendo
                  </p>
                </div>
              </Card>

              <Card>
                <h3 className="text-subtitle mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Tareas del Día
                </h3>
                <div className="space-y-2">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <p className="text-sm font-semibold mb-1" style={{ color: colors.menuTextoPrincipal }}>
                      Revisar Agenda
                    </p>
                    <p className="text-xs" style={{ color: colors.encabezadosAlterno }}>
                      Ver citas programadas
                    </p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <p className="text-sm font-semibold mb-1" style={{ color: colors.menuTextoPrincipal }}>
                      Preparar Materiales
                    </p>
                    <p className="text-xs" style={{ color: colors.encabezadosAlterno }}>
                      Para servicios próximos
                    </p>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="text-subtitle mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Notificaciones
                </h3>
                <div className="space-y-2">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                      No hay notificaciones nuevas
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}

