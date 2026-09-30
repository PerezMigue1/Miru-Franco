import Link from 'next/link';
import { FileText } from 'lucide-react';
import ModuleLayout from '../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../components/ui/PageHeader';
import Card from '../../../../components/ui/Card';

/**
 * Mis cotizaciones (eventos especiales).
 *
 * PENDIENTE de backend: la tabla `cotizaciones` existe, pero no hay un endpoint para que la
 * clienta lea las suyas (GET /api/cotizaciones lista todas y exige `servicios:lectura`). Hasta que
 * exista, la pantalla muestra el estado vacío; antes mostraba paquetes, precios y cotizaciones
 * inventados en el código.
 */
export default function CotizacionesPage() {
  return (
    <ModuleLayout>
      <div className="w-full max-w-none py-4">
        <PageHeader
          title="Mis cotizaciones"
          subtitle="Paquetes de maquillaje y peinado para bodas, XV años y otros eventos especiales."
        />

        <Card className="max-w-2xl">
          <div className="flex flex-col items-center px-2 py-10 text-center">
            <span
              className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: 'var(--fondos-suaves)' }}
              aria-hidden
            >
              <FileText size={24} style={{ color: 'var(--menu-texto-principal)' }} />
            </span>
            <p className="text-xl font-bold" style={{ color: 'var(--menu-texto-principal)', fontFamily: 'var(--font-family-serif)' }}>
              Aún no tienes cotizaciones
            </p>
            <p className="mt-2 max-w-md text-sm leading-relaxed" style={{ color: 'var(--encabezados-alterno)' }}>
              Cuando el salón prepare una cotización para tu evento, aparecerá aquí con su fecha, el paquete y el
              monto. Para pedir una, escríbenos.
            </p>
            <Link
              href="/contacto"
              className="mt-6 inline-flex min-h-11 items-center rounded-[10px] px-5 text-sm font-semibold underline-offset-4 hover:underline"
              style={{ color: 'var(--menu-texto-principal)' }}
            >
              Contactar al salón
            </Link>
          </div>
        </Card>
      </div>
    </ModuleLayout>
  );
}
