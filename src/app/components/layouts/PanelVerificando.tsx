import Image from 'next/image';

/** Pantalla breve mientras AdminLayout/OperacionLayout confirman sesión y rol. */
export default function PanelVerificando({ detalle }: { detalle: string }) {
  return (
    <div
      role="status"
      className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ backgroundColor: 'var(--fondo-general)' }}
    >
      <span className="relative h-14 w-14">
        <Image src="/logo-miru.jpg" alt="" fill sizes="56px" className="object-contain" priority />
      </span>
      <div>
        <p className="text-lg font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
          Verificando acceso…
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
          {detalle}
        </p>
      </div>
    </div>
  );
}
