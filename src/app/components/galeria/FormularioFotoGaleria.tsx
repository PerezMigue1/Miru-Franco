'use client';

import { useEffect, useId, useState } from 'react';
import { Search, UserCheck, X } from 'lucide-react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import { buscarAutorizaciones, type AutorizacionFotos } from '../../services/galeria';
import { mensajeDeError } from '../../utils/errorRed';
import { fechaCortaEnMexico } from '../../utils/fechaSoloDia';
import { MAX_ALT, errorTextoAlternativo, explicacionPublicar, type FormularioFoto } from './logicaGaleria';

interface Props {
  valor: FormularioFoto;
  onCambiar: (valor: FormularioFoto) => void;
  servicios: { value: string; label: string }[];
  /** Foto anterior ya publicada y sin revisar: puede seguir publicada mientras no se revise. */
  yaPublicadaSinRevisar?: boolean;
  /** La imagen se subió a galeria/ilustrativas: no puede dejar de ser ilustrativa. */
  ilustrativaFija?: boolean;
  /** Mostrar el error del texto alternativo (después de intentar guardar). */
  mostrarErrores?: boolean;
  disabled?: boolean;
}

/**
 * Formulario de una foto de la galería: texto alternativo (obligatorio), servicio, orden, si aparece alguien
 * identificable (con el buscador de la autorización vigente de la clienta) y si se publica. Sin una de las dos
 * opciones la casilla de publicar queda deshabilitada y explica por qué.
 */
export default function FormularioFotoGaleria({ valor, onCambiar, servicios, yaPublicadaSinRevisar, ilustrativaFija, mostrarErrores, disabled }: Props) {
  const id = useId();
  const cambiar = (cambios: Partial<FormularioFoto>) => onCambiar({ ...valor, ...cambios });
  const errorAlt = mostrarErrores ? errorTextoAlternativo(valor.alt) : null;
  const motivo = explicacionPublicar(valor, { yaPublicadaSinRevisar });
  const idMotivo = `${id}-motivo`;

  return (
    <div className="space-y-4">
      <Textarea
        label="Texto alternativo (obligatorio)"
        value={valor.alt}
        onChange={(e) => cambiar({ alt: e.target.value })}
        maxLength={MAX_ALT}
        rows={2}
        required
        error={errorAlt ?? undefined}
        helperText={errorAlt ? undefined : `Describe qué se ve en la foto, para quien usa lector de pantalla. ${valor.alt.trim().length} de ${MAX_ALT}.`}
        disabled={disabled}
        fullWidth
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <Select
          label="Servicio"
          value={valor.servicioId}
          onChange={(e) => cambiar({ servicioId: e.target.value })}
          options={[{ value: '', label: 'Sin servicio' }, ...servicios]}
          disabled={disabled}
          fullWidth
        />
        <Input
          label="Orden"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={valor.orden}
          onChange={(e) => cambiar({ orden: e.target.value })}
          disabled={disabled}
          fullWidth
        />
      </div>

      <fieldset className="space-y-1" disabled={disabled}>
        <legend className="text-sm font-semibold text-menu-texto-principal">¿Aparece alguien en la foto?</legend>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-menu-texto-principal">
          <input
            type="radio"
            name={`${id}-personas`}
            className="h-5 w-5 shrink-0"
            checked={valor.personas === 'ninguna'}
            onChange={() => cambiar({ personas: 'ninguna', autorizacion: null })}
          />
          No aparece ninguna persona identificable
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-menu-texto-principal">
          <input
            type="radio"
            name={`${id}-personas`}
            className="h-5 w-5 shrink-0"
            checked={valor.personas === 'clienta'}
            onChange={() => cambiar({ personas: 'clienta' })}
          />
          Aparece una clienta identificable
        </label>
        {valor.personas === 'clienta' && (
          <BuscadorAutorizacion
            elegida={valor.autorizacion}
            onElegir={(autorizacion) => cambiar({ autorizacion })}
            disabled={disabled}
          />
        )}
      </fieldset>

      <label className="flex min-h-11 items-center gap-2 text-sm text-menu-texto-principal">
        <input
          type="checkbox"
          className="h-5 w-5 shrink-0"
          checked={valor.ilustrativa}
          onChange={(e) => cambiar({ ilustrativa: e.target.checked, visible: e.target.checked ? false : valor.visible })}
          disabled={disabled || ilustrativaFija}
        />
        Es una imagen ilustrativa (no es un trabajo real del salón)
      </label>

      <div>
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-menu-texto-principal">
          <input
            type="checkbox"
            className="h-5 w-5 shrink-0"
            checked={valor.visible && !motivo}
            onChange={(e) => cambiar({ visible: e.target.checked })}
            disabled={disabled || !!motivo}
            aria-describedby={motivo ? idMotivo : undefined}
          />
          Publicar en la galería del sitio
        </label>
        {motivo && (
          <p id={idMotivo} className="text-xs text-encabezados-alterno">
            {motivo}
          </p>
        )}
      </div>
    </div>
  );
}

/** Busca por nombre la autorización vigente de fotos del resultado (sin correo ni teléfono). */
function BuscadorAutorizacion({
  elegida,
  onElegir,
  disabled,
}: {
  elegida: AutorizacionFotos | null;
  onElegir: (a: AutorizacionFotos | null) => void;
  disabled?: boolean;
}) {
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState<AutorizacionFotos[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    const q = texto.trim();
    if (q.length < 2) return;
    let vigente = true;
    const espera = setTimeout(() => {
      setBuscando(true);
      buscarAutorizaciones(q)
        .then((lista) => {
          if (!vigente) return;
          setResultados(lista);
          setError(null);
        })
        .catch((e) => {
          if (vigente) setError(mensajeDeError(e, 'No se pudo buscar. Intenta de nuevo.'));
        })
        .finally(() => {
          if (vigente) setBuscando(false);
        });
    }, 300);
    return () => {
      vigente = false;
      clearTimeout(espera);
    };
  }, [texto]);

  // Con menos de 2 letras no se busca ni se muestran resultados anteriores.
  const lista = texto.trim().length >= 2 ? resultados : null;

  if (elegida) {
    return (
      <div className="ml-7 flex flex-wrap items-center gap-2 rounded-[10px] px-3 py-2" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
        <UserCheck size={18} aria-hidden className="shrink-0 text-menu-texto-principal" />
        <span className="min-w-0 flex-1 text-sm text-menu-texto-principal">
          Autorización de <strong>{elegida.nombre}</strong>
          {elegida.fecha ? ` (otorgada el ${fechaCortaEnMexico(elegida.fecha) ?? ''})` : ''}
        </span>
        <Button size="sm" variant="outline" onClick={() => onElegir(null)} disabled={disabled}>
          <X size={16} aria-hidden />
          Cambiar
        </Button>
      </div>
    );
  }

  return (
    <div className="ml-7 space-y-2">
      <Input
        label="Buscar la autorización de la clienta"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Nombre de la clienta"
        maxLength={100}
        icon={<Search size={16} aria-hidden />}
        helperText="Solo aparecen clientas que autorizaron publicar fotos de su resultado y no lo han revocado."
        disabled={disabled}
        fullWidth
      />
      <div aria-live="polite" className="text-sm">
        {buscando && <p className="text-encabezados-alterno">Buscando…</p>}
        {error && (
          <p role="alert" className="text-[var(--danger-texto)]">
            {error}
          </p>
        )}
        {!buscando && lista && lista.length === 0 && (
          <p className="text-encabezados-alterno">Ninguna clienta con ese nombre tiene una autorización vigente. Sin ella, la foto no se puede publicar.</p>
        )}
      </div>
      {lista && lista.length > 0 && (
        <ul className="space-y-1" aria-label="Autorizaciones vigentes">
          {lista.map((r) => (
            <li key={r.consentimientoId}>
              <Button variant="outline" fullWidth className="justify-start text-left" onClick={() => onElegir(r)} disabled={disabled}>
                <span className="min-w-0 truncate">{r.nombre}</span>
                <span className="ml-auto shrink-0 text-xs font-normal">{fechaCortaEnMexico(r.fecha) ?? ''}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
