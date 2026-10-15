import ModuleLayout from '../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../components/ui/PageHeader';
import GaleriaFiltrable from '../../../../components/galeria/GaleriaFiltrable';
import GaleriaVacia from '../../../../components/galeria/GaleriaVacia';
import { aFotosGaleria, listarGaleriaPublica } from '../../../../services/galeria';

/**
 * Galería del salón: las fotos que el equipo publica en Operaciones > Galería (GET /api/galeria), solo las
 * visibles, no ilustrativas y autorizadas. Componente de servidor con revalidación de un minuto. Sin fotos, estado
 * vacío; nunca relleno.
 */
export default async function GaleriaPage() {
  const { data, error } = await listarGaleriaPublica();
  const fotos = aFotosGaleria(data);

  return (
    <ModuleLayout>
      <div className="w-full max-w-none py-4">
        <PageHeader
          title="Galería de Trabajos"
          subtitle={
            fotos.length === 0
              ? 'Aquí verás fotos de servicios hechos en Mirú Franco.'
              : 'Fotos de servicios hechos en Mirú Franco. Toca cualquiera para verla en grande.'
          }
        />

        {fotos.length === 0 ? (
          <>
            {error && (
              <p role="alert" className="mb-4 text-sm" style={{ color: 'var(--danger-texto)' }}>
                No pudimos cargar las fotos en este momento. Intenta de nuevo más tarde.
              </p>
            )}
            <GaleriaVacia />
          </>
        ) : (
          <GaleriaFiltrable fotos={fotos} />
        )}
      </div>
    </ModuleLayout>
  );
}
