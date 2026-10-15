'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, MessageCircleQuestion, Pencil, Plus, RefreshCw, Tag, Trash2, Users, X } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Textarea from '../ui/Textarea';
import {
  actualizarPerfilPublico,
  actualizarPregunta,
  actualizarPromocion,
  crearPregunta,
  crearPromocion,
  eliminarPregunta,
  eliminarPromocion,
  listarEquipoAdmin,
  listarPreguntasAdmin,
  listarPromocionesAdmin,
  ordenarEquipo,
  ordenarPreguntas,
  ordenarPromociones,
  type PerfilEquipoAdmin,
  type PreguntaAdmin,
  type PromocionAdmin,
} from '../../services/contenido';
import { subirImagenSegura, vistaPreviaDe } from '../../utils/cloudinary';
import { mensajeDeError } from '../../utils/errorRed';
import { formatearFechaSoloDia, hoyEnMexico } from '../../utils/fechaSoloDia';
import { showConfirm, showToast } from '../../utils/toast';
import { moverFoto as moverEnLista } from '../galeria/logicaGaleria';
import {
  FORM_PREGUNTA_VACIO,
  FORM_PROMOCION_VACIO,
  MAX_BIO,
  cuerpoPerfil,
  cuerpoPregunta,
  cuerpoPromocion,
  estadoPromocion,
  formPromocionDesde,
  validarPerfil,
  validarPregunta,
  validarPromocion,
  type EstadoPromocion,
  type Errores,
  type FormPerfil,
  type FormPregunta,
  type FormPromocion,
} from './logicaContenido';

const ICONO = 'min-h-11 min-w-11 px-0';

/** Lista que se carga del backend con reintento, y sus acciones con orden optimista. */
function useLista<T extends { id: number }>(cargar: () => Promise<T[]>) {
  const [filas, setFilas] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    let vigente = true;
    cargar()
      .then((lista) => {
        if (!vigente) return;
        setFilas(lista);
        setError(null);
      })
      .catch((e) => {
        if (vigente) setError(mensajeDeError(e, 'No se pudo cargar. Intenta de nuevo.'));
      });
    return () => {
      vigente = false;
    };
  }, [cargar, intento]);
  const recargar = useCallback(() => {
    setFilas(null);
    setError(null);
    setIntento((n) => n + 1);
  }, []);
  return { filas, setFilas, error, recargar };
}

/** Reordena con subir y bajar: actualiza la vista al momento y revierte si el backend falla. */
async function reordenar<T extends { id: number }>(
  filas: T[],
  id: number,
  direccion: -1 | 1,
  setFilas: (f: T[]) => void,
  guardar: (ids: number[]) => Promise<void>,
) {
  const ids = moverEnLista(filas.map((f) => f.id), id, direccion);
  if (!ids) return;
  const porId = new Map(filas.map((f) => [f.id, f]));
  setFilas(ids.map((i) => porId.get(i)!));
  try {
    await guardar(ids);
  } catch (e) {
    setFilas(filas);
    showToast(mensajeDeError(e, 'No se pudo cambiar el orden.'), 'error', 6000);
  }
}

function EstadoCarga({ error, onReintentar, vacio, cargando }: { error: string | null; onReintentar: () => void; vacio?: ReactNode; cargando: boolean }) {
  if (error) {
    return (
      <Card variant="elevated" padding="lg">
        <p role="alert" className="mb-3 text-[var(--danger-texto)]">
          {error}
        </p>
        <Button variant="outline" onClick={onReintentar}>
          <RefreshCw size={16} aria-hidden />
          Reintentar
        </Button>
      </Card>
    );
  }
  if (cargando) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Cargando">
        {[0, 1, 2].map((i) => (
          <div key={i} className="mf-skeleton h-20" style={{ borderRadius: 12 }} />
        ))}
      </div>
    );
  }
  return <>{vacio}</>;
}

function Vacio({ icono: Icono, titulo, texto }: { icono: typeof Tag; titulo: string; texto: string }) {
  return (
    <Card variant="elevated" padding="lg" className="text-center">
      <Icono size={30} aria-hidden className="mx-auto mb-2 text-encabezados-alterno" />
      <p className="font-semibold text-menu-texto-principal">{titulo}</p>
      <p className="mt-1 text-sm text-encabezados-alterno">{texto}</p>
    </Card>
  );
}

/** Botones de orden de una fila (subir y bajar), con nombre accesible. */
function BotonesOrden({ nombre, primera, ultima, onMover, disabled }: { nombre: string; primera: boolean; ultima: boolean; onMover: (d: -1 | 1) => void; disabled?: boolean }) {
  return (
    <>
      <Button size="sm" variant="outline" className={ICONO} onClick={() => onMover(-1)} disabled={disabled || primera} aria-label={`Subir en el orden: ${nombre}`} title="Subir">
        <ArrowUp size={18} aria-hidden />
      </Button>
      <Button size="sm" variant="outline" className={ICONO} onClick={() => onMover(1)} disabled={disabled || ultima} aria-label={`Bajar en el orden: ${nombre}`} title="Bajar">
        <ArrowDown size={18} aria-hidden />
      </Button>
    </>
  );
}

/** Subida de una imagen a Cloudinary (firma de galería) con vista previa y "Quitar". */
/**
 * Foto con vista previa y botón "Subir foto": subida segura a su carpeta (promociones/ o equipo/), con el public_id que
 * genera el servidor. Se puede cambiar o quitar. No hay campo para pegar una URL: el backend la rechaza.
 */
function CampoImagen({ etiqueta, uso, valor, error, onCambiar, disabled }: { etiqueta: string; uso: 'promociones' | 'equipo'; valor: string; error?: string; onCambiar: (valor: string) => void; disabled?: boolean }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const subir = async (archivo: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) {
      setFallo('Elige una imagen JPG, PNG o WebP.');
      return;
    }
    setFallo(null);
    setSubiendo(true);
    try {
      onCambiar((await subirImagenSegura(archivo, uso)).publicId);
    } catch (e) {
      setFallo(mensajeDeError(e, 'No se pudo subir la imagen.'));
    } finally {
      setSubiendo(false);
    }
  };
  const mensaje = fallo ?? error;
  const vista = vistaPreviaDe(valor);
  return (
    <div className="space-y-2">
      <p className="mf-etiqueta">{etiqueta}</p>
      <div className="flex flex-wrap items-center gap-3">
        {vista ? (
          <div className="relative h-20 w-20 overflow-hidden rounded-[10px]" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
            <Image src={vista} alt="" fill sizes="80px" className="object-cover" />
          </div>
        ) : (
          <span className="grid h-20 w-20 place-items-center rounded-[10px] text-encabezados-alterno" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
            <ImagePlus size={24} aria-hidden />
          </span>
        )}
        <input
          ref={entrada}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            e.target.value = '';
            if (archivo) void subir(archivo);
          }}
        />
        <Button size="sm" variant="outline" className="min-h-11" onClick={() => entrada.current?.click()} disabled={disabled || subiendo}>
          {subiendo ? 'Subiendo…' : valor ? 'Cambiar foto' : 'Subir foto'}
        </Button>
        {valor && (
          <Button size="sm" variant="outline" className="min-h-11" onClick={() => onCambiar('')} disabled={disabled || subiendo}>
            <X size={16} aria-hidden />
            Quitar
          </Button>
        )}
      </div>
      <p className="text-xs text-encabezados-alterno">JPG, PNG o WebP de hasta 5 MB.</p>
      {mensaje && (
        <p role="alert" className="text-sm text-[var(--danger-texto)]">
          {mensaje}
        </p>
      )}
    </div>
  );
}

function Casilla({ etiqueta, marcada, onCambiar, disabled, ayuda }: { etiqueta: string; marcada: boolean; onCambiar: (v: boolean) => void; disabled?: boolean; ayuda?: string }) {
  return (
    <div>
      <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-menu-texto-principal">
        <input type="checkbox" className="h-5 w-5 shrink-0" checked={marcada} onChange={(e) => onCambiar(e.target.checked)} disabled={disabled} />
        {etiqueta}
      </label>
      {ayuda && <p className="text-xs text-encabezados-alterno">{ayuda}</p>}
    </div>
  );
}

// ================================================================ Promociones

const ESTADO_PROMOCION: Record<EstadoPromocion, { texto: string; variante: 'success' | 'default' | 'warning' | 'info' }> = {
  publicada: { texto: 'Se muestra hoy', variante: 'success' },
  programada: { texto: 'Programada', variante: 'info' },
  vencida: { texto: 'Vencida', variante: 'warning' },
  oculta: { texto: 'Oculta', variante: 'default' },
};

const FORMATO_DIA: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

export function SeccionPromociones() {
  const { filas, setFilas, error, recargar } = useLista<PromocionAdmin>(listarPromocionesAdmin);
  const [editando, setEditando] = useState<PromocionAdmin | 'nueva' | null>(null);
  const [form, setForm] = useState<FormPromocion>(FORM_PROMOCION_VACIO);
  const [errores, setErrores] = useState<Errores<keyof FormPromocion>>({});
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [ocupada, setOcupada] = useState<number | null>(null);
  const hoy = hoyEnMexico();

  const abrir = (p: PromocionAdmin | 'nueva') => {
    setEditando(p);
    setForm(p === 'nueva' ? FORM_PROMOCION_VACIO : formPromocionDesde(p));
    setErrores({});
    setErrorGuardar(null);
  };

  const guardar = async () => {
    const e = validarPromocion(form);
    setErrores(e);
    if (Object.keys(e).length > 0 || !editando) return;
    setGuardando(true);
    setErrorGuardar(null);
    try {
      if (editando === 'nueva') {
        const nueva = await crearPromocion({ ...cuerpoPromocion(form), orden: filas?.length ?? 0 });
        setFilas([...(filas ?? []), nueva]);
      } else {
        const p = await actualizarPromocion(editando.id, cuerpoPromocion(form));
        setFilas((filas ?? []).map((x) => (x.id === p.id ? p : x)));
      }
      setEditando(null);
      showToast('Promoción guardada.', 'success');
    } catch (err) {
      setErrorGuardar(mensajeDeError(err, 'No se pudo guardar la promoción.'));
    } finally {
      setGuardando(false);
    }
  };

  const alternar = async (p: PromocionAdmin) => {
    setOcupada(p.id);
    try {
      const actualizada = await actualizarPromocion(p.id, { activa: !p.activa });
      setFilas((filas ?? []).map((x) => (x.id === p.id ? actualizada : x)));
    } catch (e) {
      showToast(mensajeDeError(e, 'No se pudo cambiar.'), 'error', 6000);
    } finally {
      setOcupada(null);
    }
  };

  const eliminar = async (p: PromocionAdmin) => {
    const ok = await showConfirm(`La promoción "${p.titulo}" se borrará y dejará de verse en el sitio. No se puede deshacer.`, {
      title: 'Eliminar promoción',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });
    if (!ok) return;
    setOcupada(p.id);
    try {
      await eliminarPromocion(p.id);
      setFilas((filas ?? []).filter((x) => x.id !== p.id));
      showToast('Promoción eliminada.', 'success');
    } catch (e) {
      showToast(mensajeDeError(e, 'No se pudo eliminar.'), 'error', 6000);
    } finally {
      setOcupada(null);
    }
  };

  return (
    <section aria-labelledby="titulo-promociones" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="titulo-promociones" className="text-lg font-semibold text-menu-texto-principal">
            Promociones
          </h2>
          <p className="max-w-[65ch] text-sm text-encabezados-alterno">
            Se muestran en la página Promociones del sitio mientras estén activas y vigentes (días de México). Las destacadas aparecen como banner en el inicio.
          </p>
        </div>
        <Button onClick={() => abrir('nueva')}>
          <Plus size={18} aria-hidden />
          Nueva promoción
        </Button>
      </div>

      {!filas || filas.length === 0 ? (
        <EstadoCarga error={error} onReintentar={recargar} cargando={!filas} vacio={<Vacio icono={Tag} titulo="No hay promociones" texto='Crea la primera con "Nueva promoción".' />} />
      ) : (
        <ul className="space-y-3" aria-label="Promociones">
          {filas.map((p, i) => {
            const estado = ESTADO_PROMOCION[estadoPromocion(p, hoy)];
            const desde = formatearFechaSoloDia(p.vigenteDesde, FORMATO_DIA);
            const hasta = formatearFechaSoloDia(p.vigenteHasta, FORMATO_DIA);
            return (
              <li key={p.id}>
                <Card variant="elevated" padding="sm" className="flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-menu-texto-principal">{p.titulo}</p>
                      <Badge size="sm" variant={estado.variante}>
                        {estado.texto}
                      </Badge>
                      {p.destacada && (
                        <Badge size="sm" variant="info">
                          Destacada
                        </Badge>
                      )}
                    </div>
                    <p className="line-clamp-2 text-sm text-encabezados-alterno">{p.descripcion}</p>
                    <p className="mt-1 text-xs text-encabezados-alterno">
                      {desde || hasta ? `Vigencia: ${desde ?? 'desde ya'} a ${hasta ?? 'sin fecha de fin'}` : 'Sin fechas de vigencia'}
                      {p.enlace ? ` · Lleva a ${p.enlace}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button size="sm" variant="outline" className={ICONO} onClick={() => abrir(p)} disabled={ocupada === p.id} aria-label={`Editar: ${p.titulo}`} title="Editar">
                      <Pencil size={18} aria-hidden />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={ICONO}
                      onClick={() => alternar(p)}
                      disabled={ocupada === p.id}
                      aria-label={p.activa ? `Ocultar: ${p.titulo}` : `Activar: ${p.titulo}`}
                      title={p.activa ? 'Ocultar' : 'Activar'}
                    >
                      {p.activa ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                    </Button>
                    <BotonesOrden nombre={p.titulo} primera={i === 0} ultima={i === filas.length - 1} disabled={ocupada === p.id} onMover={(d) => reordenar(filas, p.id, d, setFilas, ordenarPromociones)} />
                    <Button size="sm" variant="outline-danger" className={ICONO} onClick={() => eliminar(p)} disabled={ocupada === p.id} aria-label={`Eliminar: ${p.titulo}`} title="Eliminar">
                      <Trash2 size={18} aria-hidden />
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        isOpen={editando !== null}
        onClose={() => setEditando(null)}
        title={editando === 'nueva' ? 'Nueva promoción' : 'Editar promoción'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditando(null)} disabled={guardando}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar promoción'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {errorGuardar && (
            <p role="alert" className="text-sm text-[var(--danger-texto)]">
              {errorGuardar}
            </p>
          )}
          <Input label="Título (obligatorio)" value={form.titulo} maxLength={120} onChange={(e) => setForm({ ...form, titulo: e.target.value })} error={errores.titulo} fullWidth />
          <Textarea
            label="Descripción (obligatoria)"
            value={form.descripcion}
            maxLength={1000}
            rows={4}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            error={errores.descripcion}
            fullWidth
          />
          <CampoImagen etiqueta="Imagen (opcional)" uso="promociones" valor={form.imagenUrl} error={errores.imagenUrl} onCambiar={(imagenUrl) => setForm({ ...form, imagenUrl })} disabled={guardando} />
          <Input
            label="Enlace (opcional)"
            value={form.enlace}
            maxLength={300}
            placeholder="/cliente/servicios-citas"
            onChange={(e) => setForm({ ...form, enlace: e.target.value })}
            error={errores.enlace}
            helperText="Una página del sitio, empezando con /. El botón de la promoción lleva ahí."
            fullWidth
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Vigente desde (opcional)" type="date" value={form.vigenteDesde} onChange={(e) => setForm({ ...form, vigenteDesde: e.target.value })} error={errores.vigenteDesde} fullWidth />
            <Input label="Vigente hasta (opcional)" type="date" value={form.vigenteHasta} onChange={(e) => setForm({ ...form, vigenteHasta: e.target.value })} error={errores.vigenteHasta} fullWidth />
          </div>
          <Casilla etiqueta="Activa (se muestra en el sitio dentro de su vigencia)" marcada={form.activa} onCambiar={(activa) => setForm({ ...form, activa })} disabled={guardando} />
          <Casilla etiqueta="Destacada (banner en el inicio)" marcada={form.destacada} onCambiar={(destacada) => setForm({ ...form, destacada })} disabled={guardando} />
        </div>
      </Modal>
    </section>
  );
}

// ================================================================ Preguntas frecuentes

export function SeccionPreguntas() {
  const { filas, setFilas, error, recargar } = useLista<PreguntaAdmin>(listarPreguntasAdmin);
  const [editando, setEditando] = useState<PreguntaAdmin | 'nueva' | null>(null);
  const [form, setForm] = useState<FormPregunta>(FORM_PREGUNTA_VACIO);
  const [errores, setErrores] = useState<Errores<keyof FormPregunta>>({});
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [ocupada, setOcupada] = useState<number | null>(null);

  const abrir = (p: PreguntaAdmin | 'nueva') => {
    setEditando(p);
    setForm(p === 'nueva' ? FORM_PREGUNTA_VACIO : { pregunta: p.pregunta, respuesta: p.respuesta, visible: p.visible });
    setErrores({});
    setErrorGuardar(null);
  };

  const guardar = async () => {
    const e = validarPregunta(form);
    setErrores(e);
    if (Object.keys(e).length > 0 || !editando) return;
    setGuardando(true);
    setErrorGuardar(null);
    try {
      if (editando === 'nueva') {
        const nueva = await crearPregunta({ ...cuerpoPregunta(form), orden: filas?.length ?? 0 });
        setFilas([...(filas ?? []), nueva]);
      } else {
        const p = await actualizarPregunta(editando.id, cuerpoPregunta(form));
        setFilas((filas ?? []).map((x) => (x.id === p.id ? p : x)));
      }
      setEditando(null);
      showToast('Pregunta guardada.', 'success');
    } catch (err) {
      setErrorGuardar(mensajeDeError(err, 'No se pudo guardar la pregunta.'));
    } finally {
      setGuardando(false);
    }
  };

  const alternar = async (p: PreguntaAdmin) => {
    setOcupada(p.id);
    try {
      const actualizada = await actualizarPregunta(p.id, { visible: !p.visible });
      setFilas((filas ?? []).map((x) => (x.id === p.id ? actualizada : x)));
    } catch (e) {
      showToast(mensajeDeError(e, 'No se pudo cambiar.'), 'error', 6000);
    } finally {
      setOcupada(null);
    }
  };

  const eliminar = async (p: PreguntaAdmin) => {
    const ok = await showConfirm(`La pregunta "${p.pregunta}" se borrará del sitio. No se puede deshacer.`, {
      title: 'Eliminar pregunta',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });
    if (!ok) return;
    setOcupada(p.id);
    try {
      await eliminarPregunta(p.id);
      setFilas((filas ?? []).filter((x) => x.id !== p.id));
      showToast('Pregunta eliminada.', 'success');
    } catch (e) {
      showToast(mensajeDeError(e, 'No se pudo eliminar.'), 'error', 6000);
    } finally {
      setOcupada(null);
    }
  };

  return (
    <section aria-labelledby="titulo-preguntas" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="titulo-preguntas" className="text-lg font-semibold text-menu-texto-principal">
            Preguntas frecuentes
          </h2>
          <p className="max-w-[65ch] text-sm text-encabezados-alterno">Las visibles se muestran en el sitio en este orden.</p>
        </div>
        <Button onClick={() => abrir('nueva')}>
          <Plus size={18} aria-hidden />
          Nueva pregunta
        </Button>
      </div>

      {!filas || filas.length === 0 ? (
        <EstadoCarga
          error={error}
          onReintentar={recargar}
          cargando={!filas}
          vacio={<Vacio icono={MessageCircleQuestion} titulo="No hay preguntas frecuentes" texto='Agrega la primera con "Nueva pregunta".' />}
        />
      ) : (
        <ul className="space-y-3" aria-label="Preguntas frecuentes">
          {filas.map((p, i) => (
            <li key={p.id}>
              <Card variant="elevated" padding="sm" className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-menu-texto-principal">{p.pregunta}</p>
                    <Badge size="sm" variant={p.visible ? 'success' : 'default'}>
                      {p.visible ? 'Visible' : 'Oculta'}
                    </Badge>
                  </div>
                  <p className="line-clamp-2 text-sm text-encabezados-alterno">{p.respuesta}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button size="sm" variant="outline" className={ICONO} onClick={() => abrir(p)} disabled={ocupada === p.id} aria-label={`Editar: ${p.pregunta}`} title="Editar">
                    <Pencil size={18} aria-hidden />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={ICONO}
                    onClick={() => alternar(p)}
                    disabled={ocupada === p.id}
                    aria-label={p.visible ? `Ocultar: ${p.pregunta}` : `Mostrar: ${p.pregunta}`}
                    title={p.visible ? 'Ocultar' : 'Mostrar'}
                  >
                    {p.visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                  </Button>
                  <BotonesOrden nombre={p.pregunta} primera={i === 0} ultima={i === filas.length - 1} disabled={ocupada === p.id} onMover={(d) => reordenar(filas, p.id, d, setFilas, ordenarPreguntas)} />
                  <Button size="sm" variant="outline-danger" className={ICONO} onClick={() => eliminar(p)} disabled={ocupada === p.id} aria-label={`Eliminar: ${p.pregunta}`} title="Eliminar">
                    <Trash2 size={18} aria-hidden />
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={editando !== null}
        onClose={() => setEditando(null)}
        title={editando === 'nueva' ? 'Nueva pregunta' : 'Editar pregunta'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditando(null)} disabled={guardando}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar pregunta'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {errorGuardar && (
            <p role="alert" className="text-sm text-[var(--danger-texto)]">
              {errorGuardar}
            </p>
          )}
          <Input label="Pregunta (obligatoria)" value={form.pregunta} maxLength={200} onChange={(e) => setForm({ ...form, pregunta: e.target.value })} error={errores.pregunta} fullWidth />
          <Textarea
            label="Respuesta (obligatoria)"
            value={form.respuesta}
            maxLength={2000}
            rows={5}
            onChange={(e) => setForm({ ...form, respuesta: e.target.value })}
            error={errores.respuesta}
            fullWidth
          />
          <Casilla etiqueta="Visible en el sitio" marcada={form.visible} onCambiar={(visible) => setForm({ ...form, visible })} disabled={guardando} />
        </div>
      </Modal>
    </section>
  );
}

// ================================================================ Equipo

export function SeccionEquipo() {
  const { filas, setFilas, error, recargar } = useLista<PerfilEquipoAdmin>(listarEquipoAdmin);
  const [editando, setEditando] = useState<PerfilEquipoAdmin | null>(null);
  const [form, setForm] = useState<FormPerfil>({ mostrarEnSitio: false, fotoPublica: '', bioPublica: '' });
  const [errores, setErrores] = useState<Errores<keyof FormPerfil>>({});
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [ocupada, setOcupada] = useState<number | null>(null);

  const abrir = (p: PerfilEquipoAdmin) => {
    setEditando(p);
    setForm({ mostrarEnSitio: p.mostrarEnSitio, fotoPublica: p.fotoPublica ?? '', bioPublica: p.bioPublica ?? '' });
    setErrores({});
    setErrorGuardar(null);
  };

  const reemplazar = (p: PerfilEquipoAdmin) => setFilas((filas ?? []).map((x) => (x.id === p.id ? p : x)));

  const guardar = async () => {
    const e = validarPerfil(form);
    setErrores(e);
    if (Object.keys(e).length > 0 || !editando) return;
    setGuardando(true);
    setErrorGuardar(null);
    try {
      reemplazar(await actualizarPerfilPublico(editando.id, cuerpoPerfil(form)));
      setEditando(null);
      showToast('Perfil del sitio guardado.', 'success');
    } catch (err) {
      setErrorGuardar(mensajeDeError(err, 'No se pudo guardar.'));
    } finally {
      setGuardando(false);
    }
  };

  const alternar = async (p: PerfilEquipoAdmin) => {
    setOcupada(p.id);
    try {
      reemplazar(await actualizarPerfilPublico(p.id, { mostrarEnSitio: !p.mostrarEnSitio }));
    } catch (e) {
      showToast(mensajeDeError(e, 'No se pudo cambiar.'), 'error', 6000);
    } finally {
      setOcupada(null);
    }
  };

  return (
    <section aria-labelledby="titulo-equipo" className="space-y-4">
      <div>
        <h2 id="titulo-equipo" className="text-lg font-semibold text-menu-texto-principal">
          Equipo
        </h2>
        <p className="max-w-[65ch] text-sm text-encabezados-alterno">
          Quién aparece en &quot;Nuestro equipo&quot; del sitio, con su foto y presentación. Solo se publican nombre, puesto, foto y presentación;
          nunca datos de contacto.
        </p>
      </div>

      {!filas || filas.length === 0 ? (
        <EstadoCarga error={error} onReintentar={recargar} cargando={!filas} vacio={<Vacio icono={Users} titulo="No hay perfiles de empleado activos" texto="Se dan de alta en Gestión de personal." />} />
      ) : (
        <ul className="space-y-3" aria-label="Equipo">
          {filas.map((p, i) => (
            <li key={p.id}>
              <Card variant="elevated" padding="sm" className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {p.fotoPublica ? (
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                      <Image src={p.fotoPublica} alt="" fill sizes="56px" className="object-cover" />
                    </div>
                  ) : (
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-encabezados-alterno" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                      <Users size={22} aria-hidden />
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-menu-texto-principal">{p.nombre}</p>
                      <Badge size="sm" variant={p.mostrarEnSitio && p.usuarioActivo ? 'success' : 'default'}>
                        {p.mostrarEnSitio ? (p.usuarioActivo ? 'En el sitio' : 'Cuenta inactiva: no se muestra') : 'No se muestra'}
                      </Badge>
                    </div>
                    <p className="text-sm text-encabezados-alterno">{p.puesto}</p>
                    {p.bioPublica && <p className="line-clamp-1 text-xs text-encabezados-alterno">{p.bioPublica}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button size="sm" variant="outline" className={ICONO} onClick={() => abrir(p)} disabled={ocupada === p.id} aria-label={`Editar perfil del sitio: ${p.nombre}`} title="Editar">
                    <Pencil size={18} aria-hidden />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={ICONO}
                    onClick={() => alternar(p)}
                    disabled={ocupada === p.id}
                    aria-label={p.mostrarEnSitio ? `Quitar del sitio: ${p.nombre}` : `Mostrar en el sitio: ${p.nombre}`}
                    title={p.mostrarEnSitio ? 'Quitar del sitio' : 'Mostrar en el sitio'}
                  >
                    {p.mostrarEnSitio ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                  </Button>
                  <BotonesOrden nombre={p.nombre} primera={i === 0} ultima={i === filas.length - 1} disabled={ocupada === p.id} onMover={(d) => reordenar(filas, p.id, d, setFilas, ordenarEquipo)} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={editando !== null}
        onClose={() => setEditando(null)}
        title={editando ? `Perfil del sitio: ${editando.nombre}` : ''}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditando(null)} disabled={guardando}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {errorGuardar && (
            <p role="alert" className="text-sm text-[var(--danger-texto)]">
              {errorGuardar}
            </p>
          )}
          <Casilla
            etiqueta="Mostrar en el sitio"
            marcada={form.mostrarEnSitio}
            onCambiar={(mostrarEnSitio) => setForm({ ...form, mostrarEnSitio })}
            disabled={guardando}
            ayuda="Se publican su nombre, su puesto, la foto y la presentación de abajo."
          />
          <CampoImagen etiqueta="Foto para el sitio (opcional)" uso="equipo" valor={form.fotoPublica} error={errores.fotoPublica} onCambiar={(fotoPublica) => setForm({ ...form, fotoPublica })} disabled={guardando} />
          <Textarea
            label="Presentación (opcional)"
            value={form.bioPublica}
            maxLength={MAX_BIO}
            rows={4}
            onChange={(e) => setForm({ ...form, bioPublica: e.target.value })}
            error={errores.bioPublica}
            helperText={errores.bioPublica ? undefined : `${form.bioPublica.trim().length} de ${MAX_BIO} caracteres.`}
            fullWidth
          />
        </div>
      </Modal>
    </section>
  );
}
