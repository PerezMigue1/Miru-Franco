'use client';

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Image as ImagenPlano, RoundedBox } from '@react-three/drei';
import { MathUtils, Vector3, type Group } from 'three';
import type { ProductoHero } from '../../utils/heroProductos';
import { useTheme } from '../../context/ThemeContext';

interface EscenaProps {
  productos: ProductoHero[];
  destacado: number;
  onDestacar: (indice: number) => void;
  onListo: () => void;
  onFallo: () => void;
}

/**
 * Posiciones en profundidad (x, y, z): la primera al frente y el resto escalonadas hacia el fondo,
 * alternando lados para que la vitrina respire. La cámara mira a (0, 0, -1).
 */
const POSICIONES: [number, number, number][] = [
  [0.1, 0, 0.8],
  [-1.7, 0.72, -0.6],
  [1.75, -0.46, -0.4],
  [-1.4, -1.3, -1.9],
  [1.5, 1.3, -2.3],
  [0.3, -1.85, -3.1],
  [-2.35, 1.65, -3.6],
];

const ANCHO = 1.08;
const ALTO = 1.44;

/** Escena WebGL del hero: productos reales como láminas enmarcadas flotando en profundidad. */
export default function HeroProductosEscena({ productos, destacado, onDestacar, onListo, onFallo }: EscenaProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const contenedor = useRef<HTMLDivElement>(null);
  const puntero = useRef({ x: 0, y: 0 });
  const scroll = useRef(0);
  const [visible, setVisible] = useState(true);
  const [sobreTarjeta, setSobreTarjeta] = useState(false);

  // Entradas: puntero fino (ratón), giroscopio (Android; iOS pide permiso y se omite) y scroll.
  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    const fino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    const alMover = (e: PointerEvent) => {
      puntero.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      puntero.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const alOrientar = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      puntero.current.x = MathUtils.clamp(e.gamma / 35, -1, 1);
      puntero.current.y = MathUtils.clamp((45 - e.beta) / 35, -1, 1);
    };
    const alDesplazar = () => {
      const r = el.getBoundingClientRect();
      scroll.current = MathUtils.clamp(-r.top / Math.max(1, r.height), 0, 1.2);
    };

    const pideePermiso =
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission === 'function';
    if (fino) window.addEventListener('pointermove', alMover, { passive: true });
    else if (!pideePermiso) window.addEventListener('deviceorientation', alOrientar, { passive: true });
    window.addEventListener('scroll', alDesplazar, { passive: true });
    alDesplazar();

    // No se dibuja nada mientras el hero está fuera de pantalla (ahorro de batería y CPU).
    const observador = new IntersectionObserver(([entrada]) => setVisible(!!entrada?.isIntersecting));
    observador.observe(el);

    return () => {
      window.removeEventListener('pointermove', alMover);
      window.removeEventListener('deviceorientation', alOrientar);
      window.removeEventListener('scroll', alDesplazar);
      observador.disconnect();
    };
  }, []);

  const papel = theme === 'dark' ? '#262626' : '#f6efe6';

  return (
    <div
      ref={contenedor}
      className="h-full w-full"
      style={{ cursor: sobreTarjeta ? 'pointer' : undefined, touchAction: 'pan-y' }}
    >
      <Canvas
        dpr={[1, 1.75]}
        frameloop={visible ? 'always' : 'never'}
        camera={{ position: [0, 0, 7], fov: 35 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', () => onFallo(), { once: true });
        }}
      >
        <ambientLight intensity={1.15} />
        <directionalLight position={[3, 4, 5]} intensity={1.1} />
        <Rig puntero={puntero} scroll={scroll} />
        <LimiteDeError onFallo={onFallo}>
          <Suspense fallback={null}>
            <Vitrina
              productos={productos}
              destacado={destacado}
              papel={papel}
              onEntrar={(i) => {
                setSobreTarjeta(true);
                onDestacar(i);
              }}
              onSalir={() => setSobreTarjeta(false)}
              onAbrir={(p) => router.push(`/cliente/tienda-online/productos/${p.id}`)}
            />
            <AvisoListo onListo={onListo} />
          </Suspense>
        </LimiteDeError>
      </Canvas>
    </div>
  );
}

/** Cámara con amortiguación: sigue al puntero con retraso y avanza entre las láminas al hacer scroll. */
function Rig({ puntero, scroll }: { puntero: RefObject<{ x: number; y: number }>; scroll: RefObject<number> }) {
  const objetivo = useMemo(() => new Vector3(0, 0, -1), []);
  useFrame(({ camera }, dt) => {
    const p = scroll.current ?? 0;
    const { x, y } = puntero.current ?? { x: 0, y: 0 };
    camera.position.x = MathUtils.damp(camera.position.x, x * 0.85, 2.6, dt);
    camera.position.y = MathUtils.damp(camera.position.y, y * 0.5 - p * 0.9, 2.6, dt);
    camera.position.z = MathUtils.damp(camera.position.z, 7 - p * 3.3, 3.2, dt);
    camera.lookAt(objetivo);
  });
  return null;
}

function Vitrina({
  productos,
  destacado,
  papel,
  onEntrar,
  onSalir,
  onAbrir,
}: {
  productos: ProductoHero[];
  destacado: number;
  papel: string;
  onEntrar: (i: number) => void;
  onSalir: () => void;
  onAbrir: (p: ProductoHero) => void;
}) {
  const grupo = useRef<Group>(null);
  // Vaivén lento de toda la vitrina: la escena se siente viva aunque nadie la toque.
  useFrame(({ clock }) => {
    if (grupo.current) grupo.current.rotation.y = Math.sin(clock.elapsedTime * 0.18) * 0.07;
  });
  return (
    <group ref={grupo}>
      {productos.slice(0, POSICIONES.length).map((p, i) => (
        <Lamina
          key={p.id}
          producto={p}
          indice={i}
          posicion={POSICIONES[i]!}
          activa={i === destacado}
          papel={papel}
          onEntrar={onEntrar}
          onSalir={onSalir}
          onAbrir={onAbrir}
        />
      ))}
    </group>
  );
}

function Lamina({
  producto,
  indice,
  posicion,
  activa,
  papel,
  onEntrar,
  onSalir,
  onAbrir,
}: {
  producto: ProductoHero;
  indice: number;
  posicion: [number, number, number];
  activa: boolean;
  papel: string;
  onEntrar: (i: number) => void;
  onSalir: () => void;
  onAbrir: (p: ProductoHero) => void;
}) {
  const grupo = useRef<Group>(null);
  const escalaBase = indice === 0 ? 1.1 : 1;
  // La lámina destacada avanza y crece un poco (amortiguado: se puede interrumpir en cualquier punto).
  useFrame((_, dt) => {
    const g = grupo.current;
    if (!g) return;
    g.position.z = MathUtils.damp(g.position.z, posicion[2] + (activa ? 0.5 : 0), 7, dt);
    g.scale.setScalar(MathUtils.damp(g.scale.x, escalaBase * (activa ? 1.07 : 1), 7, dt));
  });

  return (
    <Float speed={0.9 + indice * 0.12} rotationIntensity={0.16} floatIntensity={0.32} floatingRange={[-0.05, 0.05]}>
      <group
        ref={grupo}
        position={posicion}
        rotation={[0, -posicion[0] * 0.14, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          onEntrar(indice);
        }}
        onPointerOut={onSalir}
        onClick={(e) => {
          e.stopPropagation();
          onAbrir(producto);
        }}
      >
        {/* Filete dorado y paspartú: la foto se lee como una pieza de vitrina */}
        <RoundedBox args={[ANCHO + 0.13, ALTO + 0.13, 0.03]} radius={0.085} smoothness={4} position={[0, 0, -0.05]}>
          <meshStandardMaterial color="#c49a52" roughness={0.45} metalness={0.15} />
        </RoundedBox>
        <RoundedBox args={[ANCHO + 0.09, ALTO + 0.09, 0.04]} radius={0.075} smoothness={4} position={[0, 0, -0.025]}>
          <meshStandardMaterial color={papel} roughness={0.9} />
        </RoundedBox>
        <ImagenPlano url={producto.imagen} scale={[ANCHO, ALTO]} radius={0.06} toneMapped={false} />
      </group>
    </Float>
  );
}

/** Se monta solo cuando todas las texturas cargaron (misma frontera de Suspense). */
function AvisoListo({ onListo }: { onListo: () => void }) {
  useEffect(() => {
    onListo();
  }, [onListo]);
  return null;
}

/** Si una textura falla (red, CORS, 404), se vuelve a la vitrina estática sin romper la home. */
class LimiteDeError extends Component<{ onFallo: () => void; children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch() {
    this.props.onFallo();
  }
  render() {
    return this.state.error ? null : this.props.children;
  }
}
