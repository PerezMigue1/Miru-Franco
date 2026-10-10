'use client';

import { HandCoins } from 'lucide-react';
import { desgloseEfectivoCorte, type CorteApi } from '../../services/pos';
import { fmtMoneda } from '../../utils/cobroPos';

/**
 * Resultado del corte recién registrado: la cuenta del efectivo (esperado = inicial + efectivo cobrado −
 * salidas) y las salidas de efectivo (reembolsos) que se descontaron, con su referencia.
 */
export default function ResumenCorteCaja({ corte }: { corte: CorteApi }) {
  const salidas = corte.salidas ?? [];
  return (
    <div className="space-y-4">
      <p className="text-sm text-encabezados-alterno">Efectivo esperado = inicial + efectivo cobrado − salidas</p>
      <dl className="space-y-1 text-sm">
        {desgloseEfectivoCorte(corte).map((f) => (
          <div key={f.etiqueta} className="flex justify-between gap-3">
            <dt className="text-encabezados-alterno">{f.etiqueta}</dt>
            <dd className="font-medium tabular-nums text-menu-texto-principal">{f.valor}</dd>
          </div>
        ))}
      </dl>
      <div>
        <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-menu-texto-principal">
          <HandCoins className="h-4 w-4" aria-hidden />
          Salidas de efectivo
        </p>
        {salidas.length === 0 ? (
          <p className="text-sm text-encabezados-alterno">Sin salidas en este corte.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {salidas.map((s) => (
              <li key={s.id} className="flex justify-between gap-3">
                <span className="min-w-0 text-encabezados-alterno">
                  {s.concepto}
                  {s.referencia && ` · ${s.referencia}`}
                  {s.motivo && <span className="block text-xs">{s.motivo}</span>}
                </span>
                <span className="shrink-0 font-medium tabular-nums text-menu-texto-principal">-{fmtMoneda(s.monto)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
