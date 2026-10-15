'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { AlertTriangle, ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Images, Pencil, RefreshCw, Trash2, Upload } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import ElegirTipoImagen from '../admin/ElegirTipoImagen';
import { errorTipoImagen } from '../admin/tipoImagenGaleria';
import FormularioFotoGaleria from './FormularioFotoGaleria';
import {
  FORMATOS_GALERIA_ACEPTADOS,
  actualizarFoto,
  crearFoto,
  pedirFirmaFotoGaleria,
  eliminarFoto,
  listarGaleriaPanel,
  reordenarGaleria,
  subirFotoConProgreso,
  validarArchivoGaleria,
  type FotoPanel,
} from '../../services/galeria';
import { getServicios } from '../../services/servicios';
import type { TipoImagenGaleria } from '../../utils/cloudinary';
import { enParaleloLimitado } from '../../utils/enParaleloLimitado';
import { mensajeDeError } from '../../utils/errorRed';
import { usePermisos } from '../../utils/permisos';
import { showConfirm, showToast } from '../../utils/toast';
import {
  FORMULARIO_VACIO,
  OPCIONES_ESTADO,
  cuerpoFoto,
  errorTextoAlternativo,
  estadoDeFoto,
  explicacionPublicar,
  filtrarFotos,
  formularioDesdeFoto,
  moverFoto,
  puedeGestionarGaleria,
  type EstadoFoto,
  type FiltroEstado,
  type FormularioFoto,
} from './logicaGaleria';

/** Una foto que se está subiendo o ya subida a Cloudinary y todavía sin registrar en la galería. */
interface Borrador {
  clave: string;
  nombre: string;
  progreso: number;
  estado: 'subiendo' | 'lista' | 'error' | 'guardando';
  /** Vista previa (la secure_url que devolvió Cloudinary); el registro manda solo el public_id. */
  url?: string;
  /** public_id que generó el backend al firmar esta subida. */
  publicId?: string;
  error?: string;
  form: FormularioFoto;
  mostrarErrores: boolean;
  ilustrativa: boolean;
}

const ETIQUETA_ESTADO: Record<EstadoFoto, { texto: string; variante: 'success' | 'default' | 'warning' | 'info' }> = {
  visible: { texto: 'Visible', variante: 'success' },
  oculta: { texto: 'Oculta', variante: 'default' },
  ilustrativa: { texto: 'Ilustrativa', variante: 'info' },
  sin_revisar: { texto: 'Sin revisar', variante: 'warning' },
};

const MENSAJE_CONFIRMAR_BORRADO =
  'La foto se borrará de la galería y también de Cloudinary, donde está guardada. No se puede deshacer.';

const esCarpetaIlustrativa = (url: string) => url.includes('/galeria/ilustrativas/');

/**
 * Operaciones > Galería: todas las fotos del salón con su revisión, filtros, subida (con progreso por foto), formulario
 * por foto, ocultar o mostrar, subir y bajar en el orden y eliminar (también de Cloudinary). Quien solo tiene
 * galeria:lectura (becaria) ve todo sin botones de gestión. `incrustado`: dentro de otra pantalla (Admin > Contenido),
 * con el título como h2.
 */
export default function PanelGaleria({ incrustado = false }: { incrustado?: boolean }) {
  const { permisos } = usePermisos();
  const gestiona = puedeGestionarGaleria(permisos);

  const [fotos, setFotos] = useState<FotoPanel[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [serviciosActivos, setServiciosActivos] = useState<{ value: string; label: string }[]>([]);
  const [filtro, setFiltro] = useState<{ servicioId: string; estado: FiltroEstado }>({ servicioId: '', estado: 'todas' });
  const [ocupada, setOcupada] = useState<number | null>(null);

  const [tipo, setTipo] = useState<TipoImagenGaleria | null>(null);
  const [errorTipo, setErrorTipo] = useState<string | null>(null);
  const [rechazados, setRechazados] = useState<string[]>([]);
  const [borradores, setBorradores] = useState<Borrador[]>([]);
  const entradaRef = useRef<HTMLInputElement>(null);

  const [editando, setEditando] = useState<FotoPanel | null>(null);
  const [formEdicion, setFormEdicion] = useState<FormularioFoto>(FORMULARIO_VACIO);
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [intentoEdicion, setIntentoEdicion] = useState(false);

  useEffect(() => {
    let vigente = true;
    listarGaleriaPanel()
      .then((lista) => {
        if (!vigente) return;
        setFotos(lista);
        setError(null);
      })
      .catch((e) => {
        if (vigente) setError(mensajeDeError(e, 'No se pudo cargar la galería. Intenta de nuevo.'));
      });
    return () => {
      vigente = false;
    };
  }, [intento]);

  useEffect(() => {
    getServicios().then(({ data }) => {
      setServiciosActivos(
        data
          .filter((s) => s.activo !== false)
          .map((s) => ({ value: String(s.id), label: s.nombre }))
          .sort((a, b) => a.label.localeCompare(b.label, 'es')),
      );
    });
  }, []);

  const recargar = useCallback(() => {
    setFotos(null);
    setIntento((n) => n + 1);
  }, []);

  /** Servicios para el filtro: los activos y los de las fotos (aunque el servicio ya no esté activo). */
  const opcionesFiltroServicio = useMemo(() => {
    const mapa = new Map(serviciosActivos.map((s) => [s.value, s.label]));
    for (const f of fotos ?? []) if (f.servicio && !mapa.has(String(f.servicio.id))) mapa.set(String(f.servicio.id), `${f.servicio.nombre} (inactivo)`);
    return [
      { value: '', label: 'Todos los servicios' },
      { value: 'ninguno', label: 'Sin servicio' },
      ...[...mapa.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'es')),
    ];
  }, [serviciosActivos, fotos]);

  const visibles = useMemo(() => filtrarFotos(fotos ?? [], filtro), [fotos, filtro]);
  const sinRevisar = useMemo(() => (fotos ?? []).filter((f) => !f.revisada).length, [fotos]);
  const siguienteOrden = useMemo(() => (fotos ?? []).reduce((max, f) => Math.max(max, f.orden + 1), 0), [fotos]);

  const reemplazar = (foto: FotoPanel) => setFotos((lista) => (lista ?? []).map((f) => (f.id === foto.id ? foto : f)));

  // ---------------------------------------------------------------- Subida

  const actualizarBorrador = (clave: string, cambios: Partial<Borrador>) =>
    setBorradores((lista) => lista.map((b) => (b.clave === clave ? { ...b, ...cambios } : b)));

  const elegirArchivos = async (archivos: File[]) => {
    const falta = errorTipoImagen(tipo);
    if (falta || !tipo) {
      setErrorTipo(falta);
      return;
    }
    const errores: string[] = [];
    const validos: File[] = [];
    for (const archivo of archivos) {
      const motivo = validarArchivoGaleria(archivo);
      if (motivo) errores.push(motivo);
      else validos.push(archivo);
    }
    setRechazados(errores);
    if (validos.length === 0) return;

    const ilustrativa = tipo === 'ilustrativa';
    // Cada lote se clasifica de nuevo: el siguiente no hereda "real" o "ilustrativa" sin elegirlo.
    setTipo(null);
    const base = Date.now();
    const nuevos: Borrador[] = validos.map((archivo, i) => ({
      clave: `${base}-${i}-${archivo.name}`,
      nombre: archivo.name,
      progreso: 0,
      estado: 'subiendo',
      form: { ...FORMULARIO_VACIO, ilustrativa, orden: String(siguienteOrden + borradores.length + i) },
      mostrarErrores: false,
      ilustrativa,
    }));
    setBorradores((lista) => [...lista, ...nuevos]);

    // Una firma por foto: el backend genera su public_id y solo acepta registrarla con esa firma.
    await enParaleloLimitado(
      validos.map((archivo, i) => async () => {
        const { clave } = nuevos[i];
        try {
          const firma = await pedirFirmaFotoGaleria(ilustrativa);
          const url = await subirFotoConProgreso(archivo, firma, (progreso) => actualizarBorrador(clave, { progreso }));
          actualizarBorrador(clave, { estado: 'lista', url, publicId: firma.params.public_id, progreso: 100 });
        } catch (e) {
          actualizarBorrador(clave, { estado: 'error', error: mensajeDeError(e, 'No se pudo subir la foto.') });
        }
      }),
      3,
    );
  };

  const guardarBorrador = async (b: Borrador) => {
    if (!b.publicId) return;
    if (errorTextoAlternativo(b.form.alt)) {
      actualizarBorrador(b.clave, { mostrarErrores: true });
      return;
    }
    actualizarBorrador(b.clave, { estado: 'guardando', error: undefined });
    try {
      const foto = await crearFoto({ publicId: b.publicId, ...cuerpoFoto(b.form), alt: b.form.alt.trim() });
      setFotos((lista) => [...(lista ?? []), foto].sort((x, y) => x.orden - y.orden || x.id - y.id));
      setBorradores((lista) => lista.filter((x) => x.clave !== b.clave));
      showToast(foto.visible ? 'Foto publicada en la galería.' : 'Foto guardada (oculta).', 'success');
    } catch (e) {
      actualizarBorrador(b.clave, { estado: 'lista', error: mensajeDeError(e, 'No se pudo guardar la foto.') });
    }
  };

  const descartarBorrador = async (b: Borrador) => {
    if (b.estado === 'lista') {
      const ok = await showConfirm('La foto ya se subió, pero no se registrará en la galería ni se mostrará en el sitio.', {
        title: 'Descartar foto',
        confirmText: 'Descartar',
        cancelText: 'Volver',
      });
      if (!ok) return;
    }
    setBorradores((lista) => lista.filter((x) => x.clave !== b.clave));
  };

  // ---------------------------------------------------------------- Acciones sobre fotos guardadas

  const abrirEdicion = (foto: FotoPanel, aviso?: string) => {
    setEditando(foto);
    setFormEdicion(formularioDesdeFoto(foto));
    setErrorEdicion(aviso ?? null);
    setIntentoEdicion(false);
  };

  const guardarEdicion = async () => {
    if (!editando) return;
    setIntentoEdicion(true);
    if (errorTextoAlternativo(formEdicion.alt)) return;
    setGuardandoEdicion(true);
    setErrorEdicion(null);
    try {
      const foto = await actualizarFoto(editando.id, cuerpoFoto(formEdicion));
      reemplazar(foto);
      setEditando(null);
      showToast('Cambios guardados.', 'success');
    } catch (e) {
      setErrorEdicion(mensajeDeError(e, 'No se pudieron guardar los cambios.'));
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const alternarVisible = async (foto: FotoPanel) => {
    if (!foto.visible) {
      const motivo = explicacionPublicar(formularioDesdeFoto(foto));
      if (motivo) {
        abrirEdicion(foto, motivo);
        return;
      }
    }
    setOcupada(foto.id);
    try {
      reemplazar(await actualizarFoto(foto.id, { visible: !foto.visible }));
      showToast(foto.visible ? 'La foto ya no se muestra en el sitio.' : 'La foto se muestra en el sitio.', 'success');
    } catch (e) {
      showToast(mensajeDeError(e, 'No se pudo cambiar.'), 'error', 6000);
    } finally {
      setOcupada(null);
    }
  };

  const mover = async (foto: FotoPanel, direccion: -1 | 1) => {
    if (!fotos) return;
    const nuevos = moverFoto(
      fotos.map((f) => f.id),
      foto.id,
      direccion,
      visibles.map((f) => f.id),
    );
    if (!nuevos) return;
    const anterior = fotos;
    const porId = new Map(fotos.map((f) => [f.id, f]));
    setFotos(nuevos.map((id, orden) => ({ ...porId.get(id)!, orden })));
    setOcupada(foto.id);
    try {
      await reordenarGaleria(nuevos);
    } catch (e) {
      setFotos(anterior);
      showToast(mensajeDeError(e, 'No se pudo cambiar el orden.'), 'error', 6000);
    } finally {
      setOcupada(null);
    }
  };

  const eliminar = async (foto: FotoPanel) => {
    const ok = await showConfirm(MENSAJE_CONFIRMAR_BORRADO, { title: 'Eliminar foto', confirmText: 'Eliminar', cancelText: 'Cancelar' });
    if (!ok) return;
    setOcupada(foto.id);
    try {
      await eliminarFoto(foto.id);
      setFotos((lista) => (lista ?? []).filter((f) => f.id !== foto.id));
      showToast('Foto eliminada de la galería y de Cloudinary.', 'success');
    } catch (e) {
      showToast(mensajeDeError(e, 'No se pudo eliminar la foto.'), 'error', 8000);
      recargar();
    } finally {
      setOcupada(null);
    }
  };

  const serviciosDeFormulario = (foto?: FotoPanel | null) => {
    const extra = foto?.servicio && !serviciosActivos.some((s) => s.value === String(foto.servicio!.id))
      ? [{ value: String(foto.servicio.id), label: `${foto.servicio.nombre} (inactivo)` }]
      : [];
    return [...serviciosActivos, ...extra];
  };

  // ---------------------------------------------------------------- Vista

  return (
    <div className="w-full max-w-none space-y-6">
      <div>
        {incrustado ? (
          <h2 className="text-lg font-semibold text-menu-texto-principal">Galería</h2>
        ) : (
          <h1 className="text-elegant-title text-menu-texto-principal">Galería</h1>
        )}
        <p className="mt-1 max-w-3xl text-sm text-encabezados-alterno">
          Las fotos que ve el público en la galería del sitio. Solo se publican fotos reales del salón y, si aparece una clienta,
          con su autorización vigente.
          {!gestiona && ' Puedes revisarlas; para subir, publicar u ordenar fotos pide ayuda a una estilista.'}
        </p>
      </div>

      {gestiona && (
        <Card variant="elevated" padding="lg" className="space-y-4">
          <h2 className="text-lg font-semibold text-menu-texto-principal">Subir fotos</h2>
          <ElegirTipoImagen
            valor={tipo}
            onCambiar={(t) => {
              setTipo(t);
              setErrorTipo(null);
            }}
            error={errorTipo}
          />
          <input
            ref={entradaRef}
            type="file"
            accept={FORMATOS_GALERIA_ACEPTADOS}
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const lista = Array.from(e.target.files ?? []);
              e.target.value = '';
              if (lista.length) void elegirArchivos(lista);
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => {
                const falta = errorTipoImagen(tipo);
                if (falta) {
                  setErrorTipo(falta);
                  return;
                }
                entradaRef.current?.click();
              }}
            >
              <Upload size={18} aria-hidden />
              Elegir fotos
            </Button>
            <p className="text-sm text-encabezados-alterno">JPG, PNG o WebP, hasta 5 MB cada una. Puedes elegir varias.</p>
          </div>
          {rechazados.length > 0 && (
            <div role="alert" className="rounded-[10px] px-3 py-2 text-sm" style={{ color: 'var(--danger-texto)', backgroundColor: 'var(--rojo-08)' }}>
              <p className="font-semibold">Estas fotos no se subieron:</p>
              <ul className="mt-1 list-disc pl-5">
                {rechazados.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {borradores.length > 0 && (
            <ul className="space-y-4" aria-label="Fotos por registrar">
              {borradores.map((b) => (
                <li key={b.clave}>
                  <TarjetaBorrador
                    borrador={b}
                    servicios={serviciosActivos}
                    onCambiar={(form) => actualizarBorrador(b.clave, { form })}
                    onGuardar={() => guardarBorrador(b)}
                    onDescartar={() => descartarBorrador(b)}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {sinRevisar > 0 && (
        <div className="flex flex-col gap-3 rounded-[12px] px-4 py-3 sm:flex-row sm:items-center sm:justify-between" style={{ backgroundColor: 'var(--fondos-suaves)', borderLeft: '4px solid var(--warning)' }}>
          <p className="flex items-start gap-2 text-sm text-menu-texto-principal">
            <AlertTriangle size={18} aria-hidden className="mt-0.5 shrink-0" style={{ color: 'var(--warning-texto)' }} />
            <span>
              {sinRevisar === 1 ? 'Hay 1 foto anterior sin revisar' : `Hay ${sinRevisar} fotos anteriores sin revisar`}: confirma si aparece
              alguna persona identificable antes de seguir publicándolas.
            </span>
          </p>
          {filtro.estado !== 'sin_revisar' && (
            <Button size="sm" variant="outline" onClick={() => setFiltro((f) => ({ ...f, estado: 'sin_revisar' }))}>
              Ver las sin revisar
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-3xl">
        <Select
          label="Servicio"
          value={filtro.servicioId}
          onChange={(e) => setFiltro((f) => ({ ...f, servicioId: e.target.value }))}
          options={opcionesFiltroServicio}
          fullWidth
        />
        <Select
          label="Estado"
          value={filtro.estado}
          onChange={(e) => setFiltro((f) => ({ ...f, estado: e.target.value as FiltroEstado }))}
          options={OPCIONES_ESTADO}
          fullWidth
        />
      </div>

      {error ? (
        <Card variant="elevated" padding="lg">
          <p role="alert" className="mb-3 text-[var(--danger-texto)]">
            {error}
          </p>
          <Button variant="outline" onClick={recargar}>
            <RefreshCw size={16} aria-hidden />
            Reintentar
          </Button>
        </Card>
      ) : fotos === null ? (
        <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" aria-busy="true" aria-label="Cargando galería">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="mf-skeleton aspect-[4/5]" style={{ borderRadius: 12 }} />
          ))}
        </ul>
      ) : visibles.length === 0 ? (
        <Card variant="elevated" padding="lg" className="text-center">
          <Images size={32} aria-hidden className="mx-auto mb-2 text-encabezados-alterno" />
          <p className="font-semibold text-menu-texto-principal">{fotos.length === 0 ? 'Todavía no hay fotos en la galería' : 'Ninguna foto coincide con los filtros'}</p>
          <p className="mt-1 text-sm text-encabezados-alterno">
            {fotos.length === 0 && gestiona ? 'Sube la primera con "Elegir fotos".' : 'Cambia el servicio o el estado para ver otras.'}
          </p>
        </Card>
      ) : (
        <>
          <p className="text-sm text-encabezados-alterno" aria-live="polite">
            {visibles.length === fotos.length ? `${fotos.length} foto${fotos.length === 1 ? '' : 's'}` : `${visibles.length} de ${fotos.length} fotos`}
          </p>
          <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" aria-label="Fotos de la galería">
            {visibles.map((foto, i) => (
              <li key={foto.id} className="min-w-0">
                <TarjetaFoto
                  foto={foto}
                  gestiona={gestiona}
                  ocupada={ocupada === foto.id}
                  primera={i === 0}
                  ultima={i === visibles.length - 1}
                  onEditar={() => abrirEdicion(foto)}
                  onAlternar={() => alternarVisible(foto)}
                  onMover={(d) => mover(foto, d)}
                  onEliminar={() => eliminar(foto)}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      <Modal
        isOpen={!!editando}
        onClose={() => setEditando(null)}
        title="Editar foto"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditando(null)} disabled={guardandoEdicion}>
              Cancelar
            </Button>
            <Button onClick={guardarEdicion} disabled={guardandoEdicion}>
              {guardandoEdicion ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </>
        }
      >
        {editando && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <div className="relative aspect-square w-full max-w-[10rem] overflow-hidden rounded-[10px]" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
              <Image src={editando.url} alt={editando.alt} fill sizes="160px" className="object-cover" />
            </div>
            <div className="min-w-0 space-y-3">
              {errorEdicion && (
                <p role="alert" className="text-sm text-[var(--danger-texto)]">
                  {errorEdicion}
                </p>
              )}
              <FormularioFotoGaleria
                valor={formEdicion}
                onCambiar={setFormEdicion}
                servicios={serviciosDeFormulario(editando)}
                yaPublicadaSinRevisar={editando.visible && !editando.revisada}
                ilustrativaFija={esCarpetaIlustrativa(editando.url)}
                mostrarErrores={intentoEdicion}
                disabled={guardandoEdicion}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function TarjetaBorrador({
  borrador: b,
  servicios,
  onCambiar,
  onGuardar,
  onDescartar,
}: {
  borrador: Borrador;
  servicios: { value: string; label: string }[];
  onCambiar: (form: FormularioFoto) => void;
  onGuardar: () => void;
  onDescartar: () => void;
}) {
  const subiendo = b.estado === 'subiendo';
  const guardando = b.estado === 'guardando';
  return (
    <div className="rounded-[12px] p-4" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[9rem_minmax(0,1fr)]">
        <div className="space-y-2">
          <div className="relative aspect-square w-full max-w-[9rem] overflow-hidden rounded-[10px]" style={{ backgroundColor: 'var(--fondo-general)' }}>
            {b.url ? (
              <Image src={b.url} alt="" fill sizes="144px" className="object-cover" />
            ) : (
              <span className="grid h-full place-items-center text-encabezados-alterno">
                <ImagePlus size={28} aria-hidden />
              </span>
            )}
          </div>
          <p className="truncate text-xs text-encabezados-alterno" title={b.nombre}>
            {b.nombre}
          </p>
          {b.ilustrativa && <Badge size="sm" variant="info">Ilustrativa</Badge>}
        </div>
        <div className="min-w-0 space-y-4">
          {(subiendo || b.estado === 'error') && (
            <div>
              <div className="mb-1 flex justify-between text-xs text-menu-texto-principal">
                <span>{b.estado === 'error' ? 'No se subió' : 'Subiendo…'}</span>
                <span className="mf-cifras">{b.progreso}%</span>
              </div>
              <div
                role="progressbar"
                aria-label={`Subida de ${b.nombre}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={b.progreso}
                className="h-2 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: 'var(--fondo-general)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${b.progreso}%`, backgroundColor: b.estado === 'error' ? 'var(--danger)' : 'var(--botones-principales)', transition: 'width 200ms var(--mf-ease-out)' }}
                />
              </div>
            </div>
          )}
          {b.error && (
            <p role="alert" className="text-sm text-[var(--danger-texto)]">
              {b.error}
            </p>
          )}
          {b.estado !== 'error' && (
            <FormularioFotoGaleria
              valor={b.form}
              onCambiar={onCambiar}
              servicios={servicios}
              ilustrativaFija={b.ilustrativa}
              mostrarErrores={b.mostrarErrores}
              disabled={guardando}
            />
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={onDescartar} disabled={guardando || subiendo}>
              Descartar
            </Button>
            {b.estado !== 'error' && (
              <Button onClick={onGuardar} disabled={subiendo || guardando || !b.publicId}>
                {guardando ? 'Guardando…' : subiendo ? 'Esperando la subida…' : 'Guardar foto'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TarjetaFoto({
  foto,
  gestiona,
  ocupada,
  primera,
  ultima,
  onEditar,
  onAlternar,
  onMover,
  onEliminar,
}: {
  foto: FotoPanel;
  gestiona: boolean;
  ocupada: boolean;
  primera: boolean;
  ultima: boolean;
  onEditar: () => void;
  onAlternar: () => void;
  onMover: (direccion: -1 | 1) => void;
  onEliminar: () => void;
}) {
  const principal = estadoDeFoto(foto);
  const estado = ETIQUETA_ESTADO[principal];
  const icono = 'min-h-11 min-w-11 px-0';
  return (
    <Card variant="elevated" padding="sm" className="flex h-full flex-col gap-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[10px]" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
        <Image src={foto.url} alt={foto.alt} fill sizes="(max-width: 480px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge size="sm" variant={estado.variante}>
          {estado.texto}
        </Badge>
        {(principal === 'sin_revisar' || principal === 'ilustrativa') && foto.visible && (
          <Badge size="sm" variant="success">
            Visible
          </Badge>
        )}
        {principal === 'sin_revisar' && foto.ilustrativa && (
          <Badge size="sm" variant="info">
            Ilustrativa
          </Badge>
        )}
        {foto.consentimiento && !foto.consentimiento.vigente && <Badge size="sm" variant="danger">Autorización revocada</Badge>}
      </div>
      <div className="min-w-0 flex-1 space-y-1 text-sm">
        <p className="line-clamp-2 font-semibold text-menu-texto-principal">{foto.alt}</p>
        <p className="text-encabezados-alterno">{foto.servicio ? foto.servicio.nombre : 'Sin servicio'}</p>
        <p className="text-xs text-encabezados-alterno">
          {foto.sinPersonasIdentificables === true
            ? 'No aparece ninguna persona identificable'
            : foto.consentimiento
              ? `Aparece ${foto.consentimiento.nombre}${foto.consentimiento.vigente ? ', con su autorización' : ''}`
              : foto.sinPersonasIdentificables === false
                ? 'Aparece una clienta, sin autorización'
                : 'Revisa si aparece alguna persona identificable'}
        </p>
        {foto.subidoPor && <p className="text-xs text-encabezados-alterno">Subió: {foto.subidoPor.nombre}</p>}
      </div>
      {gestiona && (
        <div className="flex flex-wrap items-center gap-1.5 border-t pt-3" style={{ borderColor: 'var(--mf-linea)' }}>
          <Button size="sm" variant="outline" className={icono} onClick={onEditar} disabled={ocupada} aria-label={`Editar foto: ${foto.alt}`} title="Editar">
            <Pencil size={18} aria-hidden />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={icono}
            onClick={onAlternar}
            disabled={ocupada}
            aria-label={foto.visible ? `Ocultar del sitio: ${foto.alt}` : `Mostrar en el sitio: ${foto.alt}`}
            title={foto.visible ? 'Ocultar' : 'Mostrar'}
          >
            {foto.visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </Button>
          <Button size="sm" variant="outline" className={icono} onClick={() => onMover(-1)} disabled={ocupada || primera} aria-label={`Subir en el orden: ${foto.alt}`} title="Subir">
            <ArrowUp size={18} aria-hidden />
          </Button>
          <Button size="sm" variant="outline" className={icono} onClick={() => onMover(1)} disabled={ocupada || ultima} aria-label={`Bajar en el orden: ${foto.alt}`} title="Bajar">
            <ArrowDown size={18} aria-hidden />
          </Button>
          <Button
            size="sm"
            variant="outline-danger"
            className={`${icono} ml-auto`}
            onClick={onEliminar}
            disabled={ocupada}
            aria-label={`Eliminar foto: ${foto.alt}`}
            title="Eliminar"
          >
            <Trash2 size={18} aria-hidden />
          </Button>
        </div>
      )}
    </Card>
  );
}
