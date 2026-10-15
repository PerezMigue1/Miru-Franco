'use client';

import Link from 'next/link';
import Badge from '../../../../../components/ui/Badge';
import AnticipoPortal from '../../../../../components/cliente/AnticipoPortal';
import { citaGestionablePorClienta } from '../../../../../components/cliente/citaGestionable';
import type { CitaApi } from '../../../../../services/citas';
import { etiquetaEstadoCita } from '../../../../../utils/estados';

type Props = {
  cita: CitaApi;
  ahora: Date;
  fecha: string;
  hora: string;
  variante: 'default' | 'success' | 'warning' | 'danger' | 'info';
};

const ACCION = 'inline-flex min-h-11 items-center justify-center rounded-[10px] border px-4 text-sm font-semibold';

/**
 * Cita en móvil (por debajo de 640 px): la tabla dejaba el estado y "Ver" fuera de vista. Aquí el estado va
 * bajo el nombre del servicio y las acciones miden 44 px.
 */
export default function TarjetaCitaMovil({ cita, ahora, fecha, hora, variante }: Props) {
  const base = `/cliente/servicios-citas`;
  return (
    <li className="rounded-[var(--mf-radio)] p-4" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
      <p className="font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>{cita.servicioNombre ?? 'Servicio'}</p>
      <div className="mt-1">
        <Badge variant={variante}>{etiquetaEstadoCita(cita.estado)}</Badge>
      </div>
      <p className="mf-cifras mt-2 text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
        {fecha} · {hora}
        {cita.especialistaNombre ? ` · ${cita.especialistaNombre}` : ''}
      </p>
      {(cita.anticipoRequerido ?? 0) > 0 && (
        <div className="mt-2">
          <AnticipoPortal cita={cita} ahora={ahora} />
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`${base}/mis-citas/${cita.id}`}
          className={ACCION}
          style={{ borderColor: 'var(--menu-texto-principal)', color: 'var(--menu-texto-principal)' }}
        >
          Ver
        </Link>
        {citaGestionablePorClienta(cita, ahora) && (
          <>
            <Link
              href={`${base}/reprogramar/${cita.id}`}
              className={ACCION}
              style={{ borderColor: 'var(--menu-texto-principal)', color: 'var(--menu-texto-principal)' }}
            >
              Reprogramar
            </Link>
            <Link
              href={`${base}/cancelar/${cita.id}`}
              className={ACCION}
              style={{ borderColor: 'var(--danger-texto)', color: 'var(--danger-texto)' }}
            >
              Cancelar
            </Link>
          </>
        )}
      </div>
    </li>
  );
}
