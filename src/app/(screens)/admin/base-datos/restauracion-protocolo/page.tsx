'use client';

import Link from 'next/link';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import Card from '../../../../components/ui/Card';
import { CheckCircle2, ClipboardList, DatabaseBackup, SearchCheck, Siren, Wrench } from 'lucide-react';

const PASOS_PROTOCOLO = [
  {
    titulo: '1) Evento que dispara la restauración (incidente)',
    icon: Siren,
    puntos: [
      'Pérdida de datos por error humano (delete/update masivo no intencional).',
      'Corrupción de datos o inconsistencias críticas detectadas por monitoreo.',
      'Falla grave de despliegue/migración que compromete integridad de la base.',
      'Caída de servicio con evidencia de que la recuperación normal no restablece datos correctos.',
    ],
  },
  {
    titulo: '2) Preparación del entorno destino',
    icon: Wrench,
    puntos: [
      'Aislar el incidente: pausar escrituras del sistema o activar modo mantenimiento.',
      'Definir objetivo de restauración: qué base, qué esquema y a qué punto en el tiempo.',
      'Crear/validar entorno destino (branch o base temporal) para restauración segura.',
      'Verificar credenciales, conectividad, versión de motor y espacio disponible.',
      'Tomar snapshot/backup actual antes de restaurar para rollback si fuera necesario.',
    ],
  },
  {
    titulo: '3) Restauración (herramienta/comando)',
    icon: DatabaseBackup,
    puntos: [
      'Usar el respaldo oficial más reciente válido (dump SQL/JSON/CSV según política).',
      'Ejecutar restauración en entorno destino con comandos controlados.',
      'Comando base de referencia: pg_restore -d "<DATABASE_URL>" --clean --if-exists "<archivo.dump>".',
      'Si se requiere preservar objetos actuales, omitir --clean y restaurar por esquema/tabla.',
      'Registrar fecha, archivo usado, operador responsable y resultado de ejecución.',
    ],
  },
  {
    titulo: '4) Validación posterior',
    icon: SearchCheck,
    puntos: [
      'Comparar conteos de tablas críticas contra baseline esperado.',
      'Validar integridad referencial y ejecución de consultas clave de negocio.',
      'Probar flujos funcionales: login, operaciones críticas y pantallas principales.',
      'Revisar errores de aplicación/API y métricas de desempeño tras restaurar.',
      'Confirmar que no existan bloqueos o sesiones anómalas en la base restaurada.',
    ],
  },
  {
    titulo: '5) Criterio de cierre (restauración exitosa)',
    icon: CheckCircle2,
    puntos: [
      'Datos críticos disponibles y consistentes con el punto de recuperación definido.',
      'Aplicación operativa sin errores críticos en logs ni en endpoints principales.',
      'Usuarios clave validan procesos esenciales sin incidencias.',
      'Incidente documentado y cerrado con evidencias de restauración y validación.',
    ],
  },
];

export default function ProtocoloRestauracionPage() {
  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-6">
        <header
          className="rounded-2xl px-6 py-6"
          style={{
            background: 'linear-gradient(135deg, var(--header-footer) 0%, var(--menu-texto-principal) 100%)',
            color: 'var(--texto-fondo-oscuro)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}
        >
          <div className="flex items-center gap-3">
            <ClipboardList size={22} />
            <h1 className="text-2xl md:text-3xl font-bold">Protocolo de restauración</h1>
          </div>
          <p className="text-sm mt-2 opacity-90">
            Guía operativa obligatoria para recuperación controlada de base de datos ante incidentes.
          </p>
        </header>

        {PASOS_PROTOCOLO.map((paso) => {
          const Icono = paso.icon;
          return (
            <Card key={paso.titulo} variant="elevated" padding="lg">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--menu-texto-principal)' }}>
                <Icono size={18} />
                {paso.titulo}
              </h2>
              <ul className="space-y-2 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                {paso.puntos.map((punto) => (
                  <li key={punto}>- {punto}</li>
                ))}
              </ul>
            </Card>
          );
        })}

        <Card variant="elevated" padding="md">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/base-datos/backup"
              className="px-3 py-2 rounded-lg text-sm no-underline border"
              style={{ color: 'var(--menu-texto-principal)', borderColor: 'var(--encabezados-alterno)' }}
            >
              Ir a Backup
            </Link>
            <Link
              href="/admin/base-datos/operaciones/importar"
              className="px-3 py-2 rounded-lg text-sm no-underline border"
              style={{ color: 'var(--menu-texto-principal)', borderColor: 'var(--encabezados-alterno)' }}
            >
              Ir a Restauración (importar)
            </Link>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
