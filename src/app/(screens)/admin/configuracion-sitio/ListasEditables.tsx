'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import { mover, quitar } from './cambiosConfiguracion';
import { BotonIcono, CampoConfig, COLOR_SUAVE, MensajeError } from './piezas';
import type { Errores } from './validacionConfiguracion';

/** Subir, bajar y quitar el elemento i de una lista (botones de 44 px con aria-label). */
function ControlesOrden({ nombre, i, total, min, onMover, onQuitar }: { nombre: string; i: number; total: number; min: number; onMover: (d: -1 | 1) => void; onQuitar: () => void }) {
  return (
    <div className="flex shrink-0 gap-2">
      <BotonIcono etiqueta={`Subir ${nombre} ${i + 1}`} onClick={() => onMover(-1)} disabled={i === 0}>
        <ArrowUp size={18} aria-hidden />
      </BotonIcono>
      <BotonIcono etiqueta={`Bajar ${nombre} ${i + 1}`} onClick={() => onMover(1)} disabled={i === total - 1}>
        <ArrowDown size={18} aria-hidden />
      </BotonIcono>
      <BotonIcono etiqueta={`Quitar ${nombre} ${i + 1}`} onClick={onQuitar} disabled={total <= min}>
        <Trash2 size={18} aria-hidden />
      </BotonIcono>
    </div>
  );
}

interface ListaParrafosProps {
  id: string;
  titulo: string;
  parrafos: string[];
  /** Llave de los errores ('parrafos' o 'sobreNosotrosParrafos'). */
  llave: string;
  errores: Errores;
  min: number;
  max: number;
  maxLargo: number;
  onCambiar: (parrafos: string[]) => void;
}

export function ListaParrafos({ id, titulo, parrafos, llave, errores, min, max, maxLargo, onCambiar }: ListaParrafosProps) {
  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="mf-etiqueta">{titulo}</legend>
      <p className="text-sm" style={{ color: COLOR_SUAVE }}>
        {`De ${min} a ${max} párrafos, cada uno de hasta ${maxLargo} caracteres.`}
      </p>
      {errores[llave] && <MensajeError>{errores[llave]}</MensajeError>}
      <ol className="space-y-4">
        {parrafos.map((p, i) => (
          <li key={i} className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="min-w-0 grow">
              <CampoConfig
                id={`${id}-${i}`}
                etiqueta={`Párrafo ${i + 1}`}
                def={{ titulo: `Párrafo ${i + 1}`, etiqueta: `párrafo ${i + 1}`, max: maxLargo, obligatorio: true, largo: true }}
                valor={p}
                onCambiar={(v) => onCambiar(parrafos.map((x, k) => (k === i ? v : x)))}
                error={errores[`${llave}.${i}`]}
              />
            </div>
            <div className="sm:pt-7">
              <ControlesOrden nombre="párrafo" i={i} total={parrafos.length} min={min} onMover={(d) => onCambiar(mover(parrafos, i, d))} onQuitar={() => onCambiar(quitar(parrafos, i))} />
            </div>
          </li>
        ))}
      </ol>
      <Button variant="outline" onClick={() => onCambiar([...parrafos, ''])} disabled={parrafos.length >= max}>
        <Plus size={16} aria-hidden />
        Agregar párrafo
      </Button>
    </fieldset>
  );
}

type Valor = { titulo: string; descripcion: string };

interface ListaValoresProps {
  valores: Valor[];
  errores: Errores;
  max: number;
  maxTitulo: number;
  maxDescripcion: number;
  onCambiar: (valores: Valor[]) => void;
}

export function ListaValores({ valores, errores, max, maxTitulo, maxDescripcion, onCambiar }: ListaValoresProps) {
  const cambiar = (i: number, cambio: Partial<Valor>) => onCambiar(valores.map((v, k) => (k === i ? { ...v, ...cambio } : v)));
  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="mf-etiqueta">Valores del salón</legend>
      <p className="text-sm" style={{ color: COLOR_SUAVE }}>
        {`Hasta ${max} valores. Si no pones ninguno, la sección no se muestra.`}
      </p>
      {errores.valores && <MensajeError>{errores.valores}</MensajeError>}
      <ol className="space-y-4">
        {valores.map((v, i) => (
          <li key={i} className="rounded-[10px] border p-3" style={{ borderColor: 'var(--mf-linea-fuerte)' }}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                {`Valor ${i + 1}`}
              </p>
              <ControlesOrden nombre="valor" i={i} total={valores.length} min={0} onMover={(d) => onCambiar(mover(valores, i, d))} onQuitar={() => onCambiar(quitar(valores, i))} />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <CampoConfig
                id={`valor-${i}-titulo`}
                def={{ titulo: 'Título', etiqueta: `título del valor ${i + 1}`, max: maxTitulo, obligatorio: true }}
                valor={v.titulo}
                onCambiar={(t) => cambiar(i, { titulo: t })}
                error={errores[`valores.${i}.titulo`]}
              />
              <CampoConfig
                id={`valor-${i}-descripcion`}
                def={{ titulo: 'Descripción', etiqueta: `descripción del valor ${i + 1}`, articulo: 'la', max: maxDescripcion, obligatorio: true, largo: true }}
                valor={v.descripcion}
                onCambiar={(d) => cambiar(i, { descripcion: d })}
                error={errores[`valores.${i}.descripcion`]}
              />
            </div>
          </li>
        ))}
      </ol>
      <Button variant="outline" onClick={() => onCambiar([...valores, { titulo: '', descripcion: '' }])} disabled={valores.length >= max}>
        <Plus size={16} aria-hidden />
        Agregar valor
      </Button>
    </fieldset>
  );
}
