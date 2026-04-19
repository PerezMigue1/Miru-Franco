'use client';

import Link from 'next/link';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import Card from '../../../../components/ui/Card';
import { DatabaseBackup, FileUp, ListChecks, ShieldCheck } from 'lucide-react';

export default function RestauracionPage() {
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
            <DatabaseBackup size={22} />
            <h1 className="text-2xl md:text-3xl font-bold">Restauración de base de datos</h1>
          </div>
          <p className="text-sm mt-2 opacity-90">
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
