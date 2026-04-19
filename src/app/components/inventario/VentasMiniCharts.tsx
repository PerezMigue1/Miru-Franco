'use client';

interface Serie {
  etiqueta: string;
  valor: number;
}

function maxValor(series: Serie[]): number {
  const m = Math.max(...series.map((s) => s.valor), 0);
  return m <= 0 ? 1 : m;
}

function avgValor(series: Serie[]): number {
  if (series.length === 0) return 0;
  const total = series.reduce((acc, s) => acc + s.valor, 0);
  return total / series.length;
}

function formatNum(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  if (v % 1 !== 0) return v.toFixed(1);
  return String(v);
}

function labelsParaEjeX(series: Serie[]): number[] {
  if (series.length <= 6) return series.map((_, i) => i);
  const step = Math.ceil(series.length / 5);
  const out: number[] = [];
  for (let i = 0; i < series.length; i += step) out.push(i);
  if (out[out.length - 1] !== series.length - 1) out.push(series.length - 1);
  return out;
}

export function SvgLineaVentas({
  series,
  height = 160,
  stroke = 'var(--menu-texto-principal)',
}: {
  series: Serie[];
  height?: number;
  stroke?: string;
}) {
  const w = 620;
  const padTop = 18;
  const padLeft = 42;
  const padRight = 16;
  const padBottom = 34;
  if (series.length === 0) {
    return (
      <p className="text-sm py-6 text-center" style={{ color: 'var(--encabezados-alterno)' }}>
        Sin datos para graficar en este periodo.
      </p>
    );
  }
  const max = maxValor(series);
  const avg = avgValor(series);
  const n = series.length;
  const chartW = w - padLeft - padRight;
  const chartH = height - padTop - padBottom;
  const step = n <= 1 ? 0 : chartW / (n - 1);
  const toY = (valor: number) => padTop + (1 - valor / max) * chartH;
  const pts = series.map((s, i) => {
    const x = padLeft + i * step;
    const y = toY(s.valor);
    return `${x},${y}`;
  });
  const d = `M ${pts.join(' L ')}`;
  const areaD = `${d} L ${padLeft + (n - 1) * step},${height - padBottom} L ${padLeft},${height - padBottom} Z`;
  const xLabels = labelsParaEjeX(series);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => max * r);
  const avgY = toY(avg);

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${height}`} className="overflow-visible" role="img" aria-label="Gráfica de línea de unidades vendidas">
      <title>Unidades por periodo</title>
      {yTicks.map((t) => {
        const y = toY(t);
        return (
          <g key={`yt-${t}`}>
            <line x1={padLeft} y1={y} x2={w - padRight} y2={y} stroke="rgba(0,0,0,0.09)" strokeWidth={1} />
            <text x={padLeft - 8} y={y + 4} textAnchor="end" fontSize="10" fill="var(--encabezados-alterno)">
              {formatNum(t)}
            </text>
          </g>
        );
      })}
      <line x1={padLeft} y1={height - padBottom} x2={w - padRight} y2={height - padBottom} stroke="rgba(0,0,0,0.18)" strokeWidth={1} />
      <line x1={padLeft} y1={padTop} x2={padLeft} y2={height - padBottom} stroke="rgba(0,0,0,0.18)" strokeWidth={1} />
      <line x1={padLeft} y1={avgY} x2={w - padRight} y2={avgY} stroke="var(--warning)" strokeDasharray="4 4" strokeWidth={1.5} />
      <text x={w - padRight} y={avgY - 6} textAnchor="end" fontSize="10" fill="var(--warning)">
        Promedio: {formatNum(avg)}
      </text>
      <path d={areaD} fill="rgba(74, 123, 167, 0.10)" />
      <path d={d} fill="none" stroke={stroke} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
      {series.map((s, i) => {
        const x = padLeft + i * step;
        const y = toY(s.valor);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={3} fill={stroke} />
            <title>{`${s.etiqueta}: ${formatNum(s.valor)} u.`}</title>
          </g>
        );
      })}
      {xLabels.map((i) => {
        const x = padLeft + i * step;
        const lbl = series[i]?.etiqueta ?? '';
        return (
          <text key={`xl-${i}`} x={x} y={height - 10} textAnchor="middle" fontSize="10" fill="var(--encabezados-alterno)">
            {lbl}
          </text>
        );
      })}
    </svg>
  );
}

export function SvgBarrasVentas({
  series,
  height = 160,
  fill = 'rgba(74, 123, 167, 0.75)',
}: {
  series: Serie[];
  height?: number;
  fill?: string;
}) {
  const w = 620;
  const padTop = 18;
  const padLeft = 42;
  const padRight = 16;
  const padBottom = 34;
  if (series.length === 0) {
    return (
      <p className="text-sm py-6 text-center" style={{ color: 'var(--encabezados-alterno)' }}>
        Sin datos para graficar en este periodo.
      </p>
    );
  }
  const max = maxValor(series);
  const avg = avgValor(series);
  const chartW = w - padLeft - padRight;
  const chartH = height - padTop - padBottom;
  const slotW = chartW / series.length;
  const barW = Math.max(10, slotW - 6);
  const xLabels = labelsParaEjeX(series);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => max * r);
  const toY = (valor: number) => padTop + (1 - valor / max) * chartH;
  const avgY = toY(avg);

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${height}`} role="img" aria-label="Gráfica de barras de unidades vendidas">
      <title>Unidades por periodo (barras)</title>
      {yTicks.map((t) => {
        const y = toY(t);
        return (
          <g key={`ytb-${t}`}>
            <line x1={padLeft} y1={y} x2={w - padRight} y2={y} stroke="rgba(0,0,0,0.09)" strokeWidth={1} />
            <text x={padLeft - 8} y={y + 4} textAnchor="end" fontSize="10" fill="var(--encabezados-alterno)">
              {formatNum(t)}
            </text>
          </g>
        );
      })}
      <line x1={padLeft} y1={height - padBottom} x2={w - padRight} y2={height - padBottom} stroke="rgba(0,0,0,0.18)" strokeWidth={1} />
      <line x1={padLeft} y1={padTop} x2={padLeft} y2={height - padBottom} stroke="rgba(0,0,0,0.18)" strokeWidth={1} />
      <line x1={padLeft} y1={avgY} x2={w - padRight} y2={avgY} stroke="var(--warning)" strokeDasharray="4 4" strokeWidth={1.5} />
      <text x={w - padRight} y={avgY - 6} textAnchor="end" fontSize="10" fill="var(--warning)">
        Promedio: {formatNum(avg)}
      </text>
      {series.map((s, i) => {
        const h = (chartH * s.valor) / max;
        const x = padLeft + i * slotW + (slotW - barW) / 2;
        const y = height - padBottom - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={Math.max(h, 2)} rx={2} fill={fill} />
            <title>{`${s.etiqueta}: ${formatNum(s.valor)} u.`}</title>
          </g>
        );
      })}
      {xLabels.map((i) => {
        const x = padLeft + i * slotW + slotW / 2;
        const lbl = series[i]?.etiqueta ?? '';
        return (
          <text key={`xlb-${i}`} x={x} y={height - 10} textAnchor="middle" fontSize="10" fill="var(--encabezados-alterno)">
            {lbl}
          </text>
        );
      })}
    </svg>
  );
}
