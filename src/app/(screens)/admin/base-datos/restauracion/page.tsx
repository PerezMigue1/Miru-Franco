'use client';

import Link from 'next/link';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import Card from '../../../../components/ui/Card';
import { DatabaseBackup, FileUp, ListChecks, ShieldCheck } from 'lucide-react';

export default function RestauracionPage() {
  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-6">
        <header>
          <div className="flex items-center gap-3">
            <DatabaseBackup size={26} aria-hidden style={{ color: 'var(--oro-texto)' }} />
            <h1 className="mf-titulo-pagina" style={{ color: 'var(--menu-texto-principal)' }}>Restauración de base de datos</h1>
          </div>
          <p className="text-sm mt-2" style={{ color: 'var(--encabezados-alterno)' }}>
            Vista independiente para recuperar datos desde respaldos y gestionar recuperación ante incidentes.
          </p>
        </header>

        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--menu-texto-principal)' }}>
            <ShieldCheck size={18} /> Cuándo usar restauración
          </h2>
          <ul className="space-y-2 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            <li>- Pérdida o corrupción de datos por incidente.</li>
            <li>- Error de despliegue/migración que dejó datos inconsistentes.</li>
            <li>- Necesidad de volver a un estado previo válido de la base.</li>
          </ul>
        </Card>

        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--menu-texto-principal)' }}>
            <ListChecks size={18} /> Flujo recomendado
          </h2>
          <ul className="space-y-2 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            <li>- 1) Revisar protocolo formal de restauración.</li>
            <li>- 2) Elegir respaldo fuente y entorno destino.</li>
            <li>- 3) Ejecutar restauración y validar integridad.</li>
            <li>- 4) Reabrir operación cuando cumpla criterio de éxito.</li>
          </ul>
        </Card>

        <Card variant="elevated" padding="md">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/base-datos/restauracion-protocolo"
              className="px-3 py-2 rounded-lg text-sm no-underline border inline-flex items-center gap-2"
              style={{ color: 'var(--menu-texto-principal)', borderColor: 'var(--encabezados-alterno)' }}
            >
              <ListChecks size={16} /> Ver protocolo completo
            </Link>
            <Link
              href="/admin/base-datos/operaciones/importar"
              className="px-3 py-2 rounded-lg text-sm no-underline border inline-flex items-center gap-2"
              style={{ color: 'var(--menu-texto-principal)', borderColor: 'var(--encabezados-alterno)' }}
            >
              <FileUp size={16} /> Ir a Importación (carga de archivos)
            </Link>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
