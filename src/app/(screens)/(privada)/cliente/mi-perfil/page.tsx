'use client';

import { useRouter } from 'next/navigation';
import PublicLayout from '../../../../components/layouts/PublicLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
export default function MiPerfilPage() {
  const router = useRouter();
  
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12" style={{ marginTop: '136px' }}>
        <div className="max-w-6xl mx-auto">
          <h1 className="text-hero mb-8" style={{ color: 'var(--menu-texto-principal)' }}>
            Mi Perfil
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  Información Personal
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Nombre Completo" fullWidth />
                  <Input label="Teléfono" fullWidth />
                  <Input label="Email" type="email" fullWidth />
                  <Input label="Dirección" placeholder="Calle, número, colonia" fullWidth />
                  <div className="md:col-span-2">
                    <Button>Guardar Cambios</Button>
                  </div>
                </div>
              </Card>

              <Card>
                <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  Mis Citas
                </h2>
                <p className="text-sm py-4" style={{ color: 'var(--encabezados-alterno)' }}>No hay citas registradas</p>
                <div className="mt-4">
                  <Button variant="outline" onClick={() => router.push('/cliente/servicios-citas/crear-cita')}>
                    Agendar cita
                  </Button>
                </div>
              </Card>

              <Card>
                <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  Historial de Servicios
                </h2>
                <p className="text-sm py-4" style={{ color: 'var(--encabezados-alterno)' }}>No hay historial de servicios</p>
              </Card>
            </div>

            <div>
              <Card>
                <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  Acciones Rápidas
                </h2>
                <div className="space-y-3">
                  <Button fullWidth onClick={() => router.push('/cliente/agendar-cita')}>
                    Agendar Nueva Cita
                  </Button>
                  <Button fullWidth variant="outline" onClick={() => router.push('/cliente/tienda-online')}>
                    Ver Productos
                  </Button>
                  <Button fullWidth variant="outline" onClick={() => router.push('/cliente/garantias')}>
                    Contactar Soporte
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

