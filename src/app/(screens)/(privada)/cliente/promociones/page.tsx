import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Tag } from 'lucide-react';
import ModuleLayout from '../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../components/ui/PageHeader';
import Card from '../../../../components/ui/Card';
import Badge from '../../../../components/ui/Badge';
import Button from '../../../../components/ui/Button';
import { listarPromocionesActivas, type PromocionPublica } from '../../../../services/contenido';
import { formatearFechaSoloDia } from '../../../../utils/fechaSoloDia';

const FORMATO_DIA: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

/** "Válida hasta el 31 de octubre de 2026", "Desde el 1 de noviembre de 2026" o null si no tiene fechas. */
function textoVigencia(p: Pick<PromocionPublica, 'vigenteDesde' | 'vigenteHasta'>): string | null {
  const hasta = formatearFechaSoloDia(p.vigenteHasta, FORMATO_DIA);
  if (hasta) return `Válida hasta el ${hasta}`;
  const desde = formatearFechaSoloDia(p.vigenteDesde, FORMATO_DIA);
  return desde ? `Desde el ${desde}` : null;
}

/**
 * Promociones activas y vigentes hoy (Admin > Contenido > Promociones). Componente de servidor con revalidación de un
 * minuto: lo que publica el admin aparece sin deploy. Sin promociones, un estado vacío honesto; nunca datos simulados.
 */
export default async function PromocionesPage() {
  const { data: promociones, error } = await listarPromocionesActivas();

  return (
    <ModuleLayout>
      <div className="w-full max-w-none py-4">
        <PageHeader title="Promociones" subtitle="Las promociones vigentes del salón y la tienda." />

        {promociones.length === 0 ? (
          <Card variant="elevated" padding="lg" className="max-w-xl">
            <div className="flex items-start gap-3">
              <Tag size={22} aria-hidden className="mt-0.5 shrink-0" style={{ color: 'var(--logo-branding)' }} />
              <div>
                <p className="text-subtitle" style={{ color: 'var(--menu-texto-principal)' }}>
                  {error ? 'No pudimos cargar las promociones' : 'Por ahora no hay promociones activas'}
                </p>
                <p className="mt-1 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                  {error
                    ? 'Intenta de nuevo en unos minutos.'
                    : 'Cuando el salón publique una promoción la verás aquí. Mientras tanto, puedes conocer los servicios y reservar tu cita.'}
                </p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/cliente/servicios-citas">Ver servicios</Link>
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3" aria-label="Promociones vigentes">
            {promociones.map((p) => {
              const vigencia = textoVigencia(p);
              return (
                <li key={p.id} className="min-w-0">
                  <Card variant="elevated" padding="md" className="flex h-full flex-col overflow-hidden">
                    {p.imagenUrl && (
                      <div className="relative -mx-6 -mt-6 mb-5 aspect-[16/9]" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                        <Image src={p.imagenUrl} alt="" fill sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-cover" />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col">
                      {p.destacada && (
                        <div className="mb-3">
                          <Badge variant="info">Destacada</Badge>
                        </div>
                      )}
                      <h2 className="text-subtitle mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                        {p.titulo}
                      </h2>
                      <p className="mb-4 whitespace-pre-line text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                        {p.descripcion}
                      </p>
                      {vigencia && (
                        <p className="mb-4 text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                          {vigencia}
                        </p>
                      )}
                      {p.enlace && (
                        <div className="mt-auto">
                          <Button asChild variant="primary" fullWidth>
                            <Link href={p.enlace}>
                              Aprovechar promoción
                              <ArrowRight size={16} aria-hidden />
                            </Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ModuleLayout>
  );
}
