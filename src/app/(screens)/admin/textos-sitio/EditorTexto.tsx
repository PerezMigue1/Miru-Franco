'use client';

import { useId, useState, type CSSProperties } from 'react';
import { Plus, RotateCcw } from 'lucide-react';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { guardarTextoSitio, restaurarTextoSitio, type TextoAdmin } from '../../../services/textosSitio';
import { mensajeDeError } from '../../../utils/errorRed';
import { showToast } from '../../../utils/toast';
import { COLOR_SUAVE, COLOR_TEXTO, ErroresGenerales, MensajeError, VistaPrevia } from '../configuracion-sitio/piezas';
import { mensajesDelServidor } from '../configuracion-sitio/validacionConfiguracion';
import HistorialTexto from './HistorialTexto';
import { agregarVariable, errorTexto, UNA_LINEA, vistaPreviaTexto } from './textosSitioAdmin';

interface Props {
  texto: TextoAdmin;
  nombreSalon?: string;
  /** Después de guardar o restaurar: el valor que quedó. */
  onGuardado: (valor: string) => void;
}

/**
 * Editor de un texto: campo con contador, variables permitidas (se agregan con un toque), vista previa con las reglas
 * de hoy y ejemplos, error junto al campo, "Guardar", "Restaurar texto original" con confirmación e historial.
 */
export default function EditorTexto({ texto, nombreSalon, onGuardado }: Props) {
  const id = useId();
  const [valor, setValor] = useState(texto.valor);
  const [errorServidor, setErrorServidor] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [confirmarRestaurar, setConfirmarRestaurar] = useState(false);
  const [version, setVersion] = useState(0);

  const error = errorTexto(texto, valor);
  const largo = valor.trim().length;
  const hayCambios = valor.trim() !== texto.valor;
  const esOriginal = texto.valor === texto.porDefecto;
  const unaLinea = UNA_LINEA.has(texto.tipo);
  const reglas = texto.variables.filter((v) => v.origen === 'regla');
  const contexto = texto.variables.filter((v) => v.origen === 'contexto');
  const usadas = new Set([...valor.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map((m) => m[1]));

  const cambiar = (v: string) => {
    setValor(v);
    if (errorServidor.length) setErrorServidor([]);
  };

  const terminar = (nuevo: string, mensaje: string) => {
    setValor(nuevo);
    onGuardado(nuevo);
    setVersion((n) => n + 1);
    setErrorServidor([]);
    showToast(mensaje, 'success');
  };

  const guardar = async () => {
    if (error) return;
    setGuardando(true);
    try {
      const r = await guardarTextoSitio(texto.clave, valor.trim());
      terminar(typeof r?.valor === 'string' ? r.valor : valor.trim(), 'Texto guardado. El sitio lo muestra en menos de un minuto.');
    } catch (e) {
      setErrorServidor(mensajesDelServidor(e) ?? [mensajeDeError(e, 'No se pudo guardar el texto. Intenta de nuevo.')]);
    } finally {
      setGuardando(false);
    }
  };

  const restaurar = async () => {
    setGuardando(true);
    try {
      const r = await restaurarTextoSitio(texto.clave);
      terminar(typeof r?.valor === 'string' ? r.valor : texto.porDefecto, 'Se restauró el texto original.');
    } catch (e) {
      setErrorServidor([mensajeDeError(e, 'No se pudo restaurar el texto. Intenta de nuevo.')]);
    } finally {
      setGuardando(false);
      setConfirmarRestaurar(false);
    }
  };

  const chips = (titulo: string, lista: TextoAdmin['variables']) =>
    lista.length > 0 && (
      <div>
        <p className="mb-1.5 text-xs font-semibold" style={{ color: COLOR_SUAVE }}>
          {titulo}
        </p>
        <ul className="flex flex-wrap gap-2">
          {lista.map((v) => (
            <li key={v.nombre}>
              <button
                type="button"
                onClick={() => cambiar(agregarVariable(valor, v.nombre))}
                title={`${v.descripcion}. Ejemplo: ${v.ejemplo.trim() || 'sin valor'}`}
                aria-label={`Agregar la variable ${v.nombre}: ${v.descripcion}`}
                className="mf-btn mf-btn-color inline-flex min-h-11 items-center gap-1.5 rounded-[10px] px-3 text-sm"
                style={
                  {
                    '--btn-bg': usadas.has(v.nombre) ? 'var(--nav-activo-bg)' : 'transparent',
                    '--btn-texto': 'var(--menu-texto-principal)',
                    '--btn-borde': '1px solid var(--campo-borde)',
                    '--btn-bg-hover': 'var(--nav-hover-bg)',
                  } as CSSProperties
                }
              >
                <Plus size={14} aria-hidden />
                <span style={{ fontFamily: 'var(--font-family-mono)' }}>{`{${v.nombre}}`}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );

  const comunes = {
    id: `${id}-campo`,
    value: valor,
    onChange: (e: { target: { value: string } }) => cambiar(e.target.value),
    'aria-invalid': error ? true : undefined,
    'aria-describedby': `${id}-contador${error ? ` ${id}-error` : ''}`,
    className: 'mf-campo w-full px-4 py-2.5',
  };

  return (
    <div className="min-w-0 space-y-5">
      <ErroresGenerales mensajes={errorServidor} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="min-w-0 space-y-4">
          <div>
            <label htmlFor={`${id}-campo`} className="mf-etiqueta">
              Texto
            </label>
            {unaLinea ? (
              <input {...comunes} type="text" autoComplete="off" />
            ) : (
              <textarea {...comunes} rows={texto.tipo === 'correo-cuerpo' ? 6 : 3} className={`${comunes.className} resize-y`} />
            )}
            <div className="mt-1.5 flex items-start justify-between gap-3 text-sm">
              <p style={{ color: COLOR_SUAVE }}>
                {unaLinea ? 'Una sola línea.' : 'Deja una línea en blanco para separar párrafos.'} Escribe las variables entre llaves.
              </p>
              <p
                id={`${id}-contador`}
                className="ml-auto shrink-0 tabular-nums"
                style={{ color: largo > texto.max ? 'var(--danger-texto)' : COLOR_SUAVE, fontWeight: largo > texto.max ? 600 : undefined }}
              >
                {`${largo}/${texto.max}`}
                <span className="sr-only"> caracteres</span>
              </p>
            </div>
            {error && <MensajeError id={`${id}-error`}>{error}</MensajeError>}
          </div>
          {chips('Datos de este texto', contexto)}
          <details>
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold" style={{ color: COLOR_TEXTO }}>
              {`Reglas del negocio (${reglas.length})`}
            </summary>
            <div className="pt-2">{chips('Se llenan solas con Configuración del sitio > Reglas', reglas)}</div>
          </details>
        </div>
        <div className="min-w-0 space-y-3 xl:sticky xl:top-20 xl:self-start">
          <VistaPrevia titulo="Vista previa">
            <p className="whitespace-pre-line break-words text-sm">{vistaPreviaTexto(texto, valor, nombreSalon) || ' '}</p>
          </VistaPrevia>
          <p className="text-xs" style={{ color: COLOR_SUAVE }}>
            Las reglas se muestran con su valor de hoy y los datos de cada cita o pedido con un ejemplo.
          </p>
          {!esOriginal && (
            <div className="space-y-1 text-sm">
              <p className="font-semibold" style={{ color: COLOR_SUAVE }}>
                Texto original
              </p>
              <p className="whitespace-pre-line break-words" style={{ color: COLOR_TEXTO }}>
                {texto.porDefecto}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-end" style={{ borderColor: 'var(--mf-linea-fuerte)' }}>
        <p className="text-sm sm:mr-auto" style={{ color: COLOR_SUAVE }} aria-live="polite">
          {hayCambios ? 'Cambios sin guardar.' : esOriginal ? 'Es el texto original.' : 'Texto cambiado desde esta pantalla.'}
        </p>
        <Button variant="outline" onClick={() => setConfirmarRestaurar(true)} disabled={esOriginal || guardando}>
          <RotateCcw size={16} aria-hidden />
          Restaurar texto original
        </Button>
        <Button variant="outline" onClick={() => cambiar(texto.valor)} disabled={!hayCambios || guardando}>
          Descartar cambios
        </Button>
        <Button onClick={() => void guardar()} disabled={!hayCambios || Boolean(error) || guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>

      <HistorialTexto clave={texto.clave} version={version} />

      <Modal
        isOpen={confirmarRestaurar}
        onClose={() => !guardando && setConfirmarRestaurar(false)}
        title="Restaurar texto original"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmarRestaurar(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button onClick={() => void restaurar()} disabled={guardando}>
              {guardando ? 'Restaurando…' : 'Restaurar'}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm" style={{ color: 'var(--texto-cuerpo)' }}>
          <p>El texto vuelve a ser el original y el cambio queda en el historial.</p>
          <p className="rounded-[10px] px-3 py-2 whitespace-pre-line break-words" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
            {texto.porDefecto}
          </p>
          {texto.tipo !== 'texto' && (
            <p>
              <Badge variant="info" size="sm">
                Se usa en correos o avisos
              </Badge>
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
