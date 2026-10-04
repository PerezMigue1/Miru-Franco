'use client';

import { CheckCircle2, AlertTriangle } from 'lucide-react';
import Input from '../ui/Input';
import { fmtMoneda, type MontosMixtos } from '../../utils/cobroPos';

interface PagoMixtoCamposProps {
  montos: MontosMixtos;
  onChange: (montos: MontosMixtos) => void;
  total: number;
}

const METODOS = [
  { clave: 'efectivo', etiqueta: 'Efectivo' },
  { clave: 'tarjeta', etiqueta: 'Tarjeta' },
  { clave: 'transferencia', etiqueta: 'Transferencia' },
] as const;

/** Desglose de un pago mixto: la suma tiene que ser igual al total (lo exige el backend y el corte lo usa). */
export default function PagoMixtoCampos({ montos, onChange, total }: PagoMixtoCamposProps) {
  const suma = METODOS.reduce((acc, m) => acc + (Number(montos[m.clave]) || 0), 0);
  const diferencia = Math.round((total - suma) * 100) / 100;
  const cuadra = diferencia === 0;

  return (
    <fieldset className="space-y-3 rounded-lg border border-[var(--borde-visible)] p-3">
      <legend className="px-1 text-sm font-medium text-menu-texto-principal">Desglose del pago mixto</legend>
      {METODOS.map((m) => (
        <Input
          key={m.clave}
          label={`${m.etiqueta} ($)`}
          type="number"
          min={0}
          step={0.01}
          inputMode="decimal"
          value={montos[m.clave] ?? ''}
          onChange={(e) => onChange({ ...montos, [m.clave]: e.target.value })}
          placeholder="0.00"
          fullWidth
        />
      ))}
      <p aria-live="polite" className={`flex items-center gap-1.5 text-sm font-medium ${cuadra ? 'text-[var(--success-texto)]' : 'text-[var(--danger-texto)]'}`}>
        {cuadra ? <CheckCircle2 size={16} aria-hidden /> : <AlertTriangle size={16} aria-hidden />}
        {cuadra ? 'Cuadra con el total' : diferencia > 0 ? `Faltan ${fmtMoneda(diferencia)}` : `Sobran ${fmtMoneda(-diferencia)}`}
      </p>
    </fieldset>
  );
}
