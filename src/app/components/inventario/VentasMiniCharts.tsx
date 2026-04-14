'use client';

interface Serie {
  etiqueta: string;
  valor: number;
}

function maxValor(series: Serie[]): number {
  const m = Math.max(...series.map((s) => s.valor), 0);
  return m <= 0 ? 1 : m;
}

export function SvgLineaVentas({
  series,
  height = 120,
  stroke = 'var(--menu-texto-principal)',
}: {
  series: Serie[];
  height?: number;
  stroke?: string;
}) {
  const w = 520;
  const pad = 28;
  if (series.length === 0) {
    return (
      <p className="text-sm py-6 text-center" style={{ color: 'var(--encabezados-alterno)' }}>
        Sin datos para graficar en este periodo.
      </p>
    );
  }
  const max = maxValor(series);
  const n = series.length;
  const step = n <= 1 ? 0 : (w - pad * 2) / (n - 1);
  const pts = series.map((s, i) => {
    const x = pad + i * step;
    const y = height - pad - (s.valor / max) * (height - pad * 2);
    return `${x},${y}`;
  });
  const d = `M ${pts.join(' L ')}`;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${height}`} className="overflow-visible" role="img" aria-label="Gráfica de línea de unidades vendidas">
      <title>Unidades por periodo</title>
      <line x1={pad} y1={height - pad} x2={w - pad} y2={height - pad} stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
      <path d={d} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {series.map((s, i) => {
        const x = pad + i * step;
        const y = height - pad - (s.valor / max) * (height - pad * 2);
        return <circle key={i} cx={x} cy={y} r={3} fill={stroke} />;
      })}
    </svg>
  );
}

export function SvgBarrasVentas({
  series,
  height = 120,
  fill = 'rgba(74, 123, 167, 0.75)',
}: {
  series: Serie[];
  height?: number;
  fill?: string;
}) {
  const w = 520;
  const pad = 24;
  if (series.length === 0) {
    return (
      <p className="text-sm py-6 text-center" style={{ color: 'var(--encabezados-alterno)' }}>
        Sin datos para graficar en este periodo.
      </p>
    );
  }
  const max = maxValor(series);
  const barW = Math.max(8, (w - pad * 2) / series.length - 4);
  const gap = 4;
  const totalBar = barW + gap;
  const startX = pad;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${height}`} role="img" aria-label="Gráfica de barras de unidades vendidas">
      <title>Unidades por periodo (barras)</title>
      <line x1={pad} y1={height - pad} x2={w - pad} y2={height - pad} stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
      {series.map((s, i) => {
        const h = ((height - pad * 2) * s.valor) / max;
        const x = startX + i * totalBar;
        const y = height - pad - h;
        return <rect key={i} x={x} y={y} width={barW} height={Math.max(h, 2)} rx={2} fill={fill} />;
      })}
    </svg>
  );
}
