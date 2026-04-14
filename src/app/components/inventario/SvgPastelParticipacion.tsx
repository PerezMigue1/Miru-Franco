'use client';

export interface PastelSegmento {
  etiqueta: string;
  valor: number;
  color: string;
}

function polar(cx: number, cy: number, r: number, angleRad: number): { x: number; y: number } {
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

/** Gráfica de pastel SVG sin dependencias. */
export function SvgPastelParticipacion({
  segmentos,
  size = 220,
}: {
  segmentos: PastelSegmento[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;
  const total = segmentos.reduce((s, x) => s + x.valor, 0);

  if (total <= 0 || segmentos.length === 0) {
    return (
      <p className="text-sm py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>
        Sin unidades vendidas en el periodo para dibujar participación.
      </p>
    );
  }

  let angle = -Math.PI / 2;
  const paths: { d: string; color: string; label: string; pct: number }[] = [];

  for (const seg of segmentos) {
    const sweep = (seg.valor / total) * Math.PI * 2;
    if (sweep <= 0) continue;
    const start = angle;
    const end = angle + sweep;
    const p0 = polar(cx, cy, r, start);
    const p1 = polar(cx, cy, r, end);
    const large = sweep > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y} Z`;
    paths.push({ d, color: seg.color, label: seg.etiqueta, pct: (seg.valor / total) * 100 });
    angle = end;
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Participación por producto">
        <title>Distribución de ventas en la subcategoría</title>
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill={p.color} stroke="var(--fondo-general)" strokeWidth={1} />
        ))}
      </svg>
      <ul className="text-sm space-y-2 flex-1 min-w-[200px]" style={{ color: 'var(--menu-texto-principal)' }}>
        {paths.map((p, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: p.color }} />
            <span className="truncate" title={p.label}>
              {p.label}
            </span>
            <span className="ml-auto font-medium">{p.pct.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
