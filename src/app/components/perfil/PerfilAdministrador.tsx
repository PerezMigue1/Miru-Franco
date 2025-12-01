'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import { colors } from '../../utils/colors';
import { clearAuthData } from '../../utils/security';

export default function PerfilAdministrador() {
  const router = useRouter();
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);

  const handleLogoutAllSessions = async () => {
    setLogoutAllLoading(true);
    try {
      const { api } = await import('../../services');
      const result = await api.logoutAll();

      clearAuthData();

      if (typeof window !== 'undefined') {
        alert(result.message || 'Todas tus sesiones han sido cerradas correctamente');
      }

      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar todas las sesiones (perfil admin):', error);
      clearAuthData();
      if (typeof window !== 'undefined') {
        alert('Se cerró la sesión en este dispositivo, pero hubo un error al cerrar todas las sesiones.');
      }
      router.push('/login');
    } finally {
      setLogoutAllLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-hero mb-2" style={{ color: colors.menuTextoPrincipal }}>
            Perfil de Administrador
          </h1>
          <Badge variant="info" size="lg">
            Administrador
          </Badge>
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
              <Input label="Nombre Completo" defaultValue="Mildred Franco" fullWidth />
              <Input label="Email" type="email" defaultValue="mildred@mirufranco.com" fullWidth />
              <Input label="Teléfono" defaultValue="555-1234-5678" fullWidth />
              <Input label="Cargo" defaultValue="Propietaria/Administradora" fullWidth />
            </div>
            <div className="mt-4">
              <Button>Guardar Cambios</Button>
            </div>
          </Card>

          <Card>
            <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
              Permisos y Accesos
            </h2>
            <div className="space-y-3">
              <div className="p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                <p className="font-semibold mb-2" style={{ color: colors.menuTextoPrincipal }}>
                  Acceso Completo al Sistema
                </p>
                <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                  Como administrador, tienes acceso completo a todos los módulos y funcionalidades del sistema.
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  'Inventario',
                  'Usuarios',
                  'Reportes',
                  'Ventas',
                  'Citas',
                  'Facturación',
                  'Personal',
                  'Proveedores',
                  'Marketing',
                ].map((modulo) => (
                  <div
                    key={modulo}
                    className="p-3 rounded-lg text-center"
                    style={{ backgroundColor: colors.fondosSuaves }}
                  >
                    <Badge variant="success" size="sm">
                      {modulo}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
              Estadísticas del Mes
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                <p className="text-2xl font-bold mb-1" style={{ color: colors.menuTextoPrincipal }}>
                  $45,000
                </p>
                <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                  Ventas
                </p>
              </div>
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                <p className="text-2xl font-bold mb-1" style={{ color: colors.menuTextoPrincipal }}>
                  120
                </p>
                <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                  Servicios
                </p>
              </div>
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                <p className="text-2xl font-bold mb-1" style={{ color: colors.menuTextoPrincipal }}>
                  25
                </p>
                <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                  Clientes Nuevos
                </p>
              </div>
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                <p className="text-2xl font-bold mb-1" style={{ color: colors.menuTextoPrincipal }}>
                  85
                </p>
                <p className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                  Productos Vendidos
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="text-center mb-4">
              <div
                className="w-32 h-32 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: colors.fondosSuaves }}
              >
                <svg
                  className="w-16 h-16"
                  style={{ color: colors.menuTextoPrincipal }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h3 className="text-subtitle mb-1" style={{ color: colors.menuTextoPrincipal }}>
                Mildred Franco
              </h3>
              <p className="text-sm mb-4" style={{ color: colors.encabezadosAlterno }}>
                Propietaria
              </p>
              <Button size="sm" variant="outline" fullWidth>
                Cambiar Foto
              </Button>
            </div>
          </Card>

          <Card>
            <h3 className="text-subtitle mb-4" style={{ color: colors.menuTextoPrincipal }}>
              Accesos Rápidos
            </h3>
            <div className="space-y-2">
              <Button variant="outline" fullWidth>
                Gestionar Usuarios
              </Button>
              <Button variant="outline" fullWidth>
                Ver Reportes
              </Button>
              <Button variant="outline" fullWidth>
                Configuración del Sistema
              </Button>
              <Button variant="outline" fullWidth>
                Backup y Respaldo
              </Button>
            </div>
          </Card>

          <Card>
            <h3 className="text-subtitle mb-4" style={{ color: colors.menuTextoPrincipal }}>
              Seguridad
            </h3>
            <div className="space-y-3">
              <Input label="Contraseña Actual" type="password" fullWidth />
              <Input label="Nueva Contraseña" type="password" fullWidth />
              <Input label="Confirmar Contraseña" type="password" fullWidth />
              <Button fullWidth>Cambiar Contraseña</Button>
              <Button
                fullWidth
                variant="danger"
                disabled={logoutAllLoading}
                onClick={handleLogoutAllSessions}
              >
                {logoutAllLoading ? 'Cerrando todas las sesiones...' : 'Cerrar todas las sesiones'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}


