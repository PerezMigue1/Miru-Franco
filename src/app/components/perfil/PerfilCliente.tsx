'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import Table, { TableRow, TableCell } from '../ui/Table';
import { colors } from '../../utils/colors';
import { clearAuthData } from '../../utils/security';

export default function PerfilCliente() {
  const router = useRouter();
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);

  const citas = [
    { id: 1, servicio: 'Corte', fecha: '2024-01-20', hora: '10:00', estado: 'confirmada' },
    { id: 2, servicio: 'Alaciado', fecha: '2024-01-25', hora: '14:00', estado: 'pendiente' },
  ];

  const servicios = [
    { id: 1, servicio: 'Corte', fecha: '2024-01-10', especialista: 'Mildred', precio: '$350' },
    { id: 2, servicio: 'Nanoplastía', fecha: '2023-12-15', especialista: 'Mildred', precio: '$1,200' },
  ];

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
      console.error('Error al cerrar todas las sesiones (perfil cliente):', error);
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
            Mi Perfil
          </h1>
          <Badge variant="default" size="lg">Cliente</Badge>
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
              <Input label="Nombre Completo" defaultValue="María González" fullWidth />
              <Input label="Teléfono" defaultValue="555-1234-5678" fullWidth />
              <Input label="Email" type="email" defaultValue="maria@ejemplo.com" fullWidth />
              <Input label="Dirección" placeholder="Calle, número, colonia" fullWidth />
            </div>
            <div className="mt-4">
              <Button>Guardar Cambios</Button>
            </div>
          </Card>

          <Card>
            <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
              Mis Citas
            </h2>
            <Table headers={['Servicio', 'Fecha', 'Hora', 'Estado']}>
              {citas.map((cita) => (
                <TableRow key={cita.id}>
                  <TableCell>{cita.servicio}</TableCell>
                  <TableCell>{cita.fecha}</TableCell>
                  <TableCell>{cita.hora}</TableCell>
                  <TableCell>
                    <Badge variant={cita.estado === 'confirmada' ? 'success' : 'warning'}>
                      {cita.estado}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          </Card>

          <Card>
            <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
              Historial de Servicios
            </h2>
            <Table headers={['Servicio', 'Fecha', 'Especialista', 'Precio']}>
              {servicios.map((servicio) => (
                <TableRow key={servicio.id}>
                  <TableCell>{servicio.servicio}</TableCell>
                  <TableCell>{servicio.fecha}</TableCell>
                  <TableCell>{servicio.especialista}</TableCell>
                  <TableCell className="font-semibold">{servicio.precio}</TableCell>
                </TableRow>
              ))}
            </Table>
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
                María González
              </h3>
              <p className="text-sm mb-4" style={{ color: colors.encabezadosAlterno }}>
                Cliente desde 2023
              </p>
              <Button size="sm" variant="outline" fullWidth>
                Cambiar Foto
              </Button>
            </div>
          </Card>

          <Card>
            <h3 className="text-subtitle mb-4" style={{ color: colors.menuTextoPrincipal }}>
              Acciones Rápidas
            </h3>
            <div className="space-y-2">
              <Button fullWidth>Agendar Nueva Cita</Button>
              <Button fullWidth variant="outline">
                Ver Productos
              </Button>
              <Button fullWidth variant="outline">
                Ver Promociones
              </Button>
              <Button fullWidth variant="outline">
                Contactar Soporte
              </Button>
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

          <Card>
            <h3 className="text-subtitle mb-4" style={{ color: colors.menuTextoPrincipal }}>
              Mis Estadísticas
            </h3>
            <div className="space-y-3">
              <div
                className="flex justify-between p-3 rounded-lg"
                style={{ backgroundColor: colors.fondosSuaves }}
              >
                <span className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                  Servicios Totales
                </span>
                <span className="text-sm font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                  8
                </span>
              </div>
              <div
                className="flex justify-between p-3 rounded-lg"
                style={{ backgroundColor: colors.fondosSuaves }}
              >
                <span className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                  Cliente desde
                </span>
                <span className="text-sm font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                  2023
                </span>
              </div>
              <div
                className="flex justify-between p-3 rounded-lg"
                style={{ backgroundColor: colors.fondosSuaves }}
              >
                <span className="text-sm" style={{ color: colors.encabezadosAlterno }}>
                  Estado
                </span>
                <Badge variant="success" size="sm">
                  Activo
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}


