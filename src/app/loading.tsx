import Image from 'next/image';

/**
 * Pantalla de carga de todo el sitio (convención `loading.tsx` de Next.js App Router):
 * envuelve automáticamente cada segmento de ruta en un Suspense, así que aparece sola
 * mientras navega o mientras un server component espera sus datos — sin tener que
 * agregarla a mano en cada página. Diseño aprobado como artifact aparte antes de integrarla.
 */
export default function Loading() {
  return (
    <div className="loading-screen">
      <div className="loading-screen__stage">
        <div className="loading-screen__mark">
          <div className="loading-screen__glow" />
          <div className="loading-screen__ripple" />
          <div className="loading-screen__ripple" />
          <div className="loading-screen__ripple" />
          <div className="loading-screen__logo">
            <Image src="/logo-miru.jpg" alt="Mirú Franco" fill sizes="148px" priority />
          </div>
        </div>
        <div className="loading-screen__word">
          <div className="loading-screen__status">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
            <span>Preparando tu experiencia</span>
          </div>
        </div>
      </div>
    </div>
  );
}
