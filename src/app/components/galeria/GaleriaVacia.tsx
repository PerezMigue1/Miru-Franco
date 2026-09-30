import Image from 'next/image';
import Link from 'next/link';

/**
 * Estado vacío de la galería: se muestra mientras el salón no tiene fotos de servicios.
 * Nunca imágenes de relleno: la galería solo muestra trabajo real.
 */
export default function GaleriaVacia({ sobreOscuro = false }: { sobreOscuro?: boolean }) {
  const texto = sobreOscuro ? 'var(--texto-fondo-oscuro)' : 'var(--menu-texto-principal)';
  const secundario = sobreOscuro ? 'var(--texto-fondo-oscuro-70)' : 'var(--encabezados-alterno)';
  return (
    <div className="mf-galeria-vacia">
      <span className="mf-galeria-vacia__marca" aria-hidden>
        <Image src="/logo-miru.jpg" alt="" fill sizes="96px" className="object-contain" />
      </span>
      <p className="text-xl font-bold" style={{ color: texto, fontFamily: 'var(--font-family-serif)' }}>
        Pronto verás aquí nuestro trabajo
      </p>
      <p className="mt-2 max-w-md text-sm leading-relaxed" style={{ color: secundario }}>
        Estamos reuniendo las fotos de nuestros cortes, color y tratamientos. Mientras tanto, puedes conocer
        los servicios y reservar tu cita.
      </p>
      <Link
        href="/cliente/servicios-citas"
        className="mt-6 inline-flex min-h-11 items-center rounded-[10px] px-5 text-sm font-semibold underline-offset-4 hover:underline"
        style={{ color: texto }}
      >
        Ver servicios
      </Link>
    </div>
  );
}
