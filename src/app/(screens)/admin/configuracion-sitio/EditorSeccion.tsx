'use client';

import { useId, useMemo, useState, type ReactNode } from 'react';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Modal from '../../../components/ui/Modal';
import { guardarSeccionConfiguracion, type SeccionConfiguracion } from '../../../services/configuracionSitio';
import { fechaHoraMexico } from '../../../components/privacidad/textosPrivacidad';
import { mensajeDeError } from '../../../utils/errorRed';
import { showToast } from '../../../utils/toast';
import { cambiosDeSeccion } from './cambiosConfiguracion';
import HistorialSeccion from './HistorialSeccion';
import { AvisoDocumentosLegales, COLOR_SUAVE, COLOR_TEXTO, ErroresGenerales, ResumenGuardado } from './piezas';
import { mensajesDelServidor, prepararValor, repartirErroresServidor, validarSeccion, type Errores } from './validacionConfiguracion';

export const MENSAJE_CORREGIR = 'Corrige los campos marcados antes de guardar.';

interface Props<T> {
  clave: SeccionConfiguracion;
  titulo: string;
  descripcion?: string;
  /** Último valor guardado (o el de hoy si nunca se guardó). */
  guardado: T;
  actualizado?: { actualizadoEn: string; actualizadoPor: string | null } | null;
  camposLegales?: Record<string, string[]>;
  onGuardado: (valor: T) => void;
  children: (p: { valor: T; cambiar: (valor: T) => void; errores: Errores }) => ReactNode;
  vistaPrevia?: (valor: T, errores: Errores) => ReactNode;
}

/**
 * Una sección de la configuración (una clave del API): formulario con validación en vivo, vista previa,
 * "Guardar" con diálogo que resume qué cambia, errores 400 del backend junto a sus campos, aviso de
 * documentos legales después de guardar y su historial.
 */
export default function EditorSeccion<T>({ clave, titulo, descripcion, guardado, actualizado, camposLegales, onGuardado, children, vistaPrevia }: Props<T>) {
  const idTitulo = useId();
  const [borrador, setBorrador] = useState<T>(guardado);
  const [servidor, setServidor] = useState<{ porCampo: Errores; generales: string[] }>({ porCampo: {}, generales: [] });
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [avisoLegal, setAvisoLegal] = useState(false);
  const [versionHistorial, setVersionHistorial] = useState(0);

  const erroresCliente = useMemo(() => validarSeccion(clave, borrador), [clave, borrador]);
  const errores = { ...erroresCliente, ...servidor.porCampo };
  const anterior = useMemo(() => prepararValor(clave, guardado), [clave, guardado]);
  const nuevo = useMemo(() => prepararValor(clave, borrador), [clave, borrador]);
  const cambios = useMemo(() => cambiosDeSeccion(clave, anterior, nuevo), [clave, anterior, nuevo]);
  const hayCambios = cambios.length > 0;
  const tocaLegal = (camposLegales?.[clave] ?? []).some(
    (c) => JSON.stringify((anterior as Record<string, unknown>)[c]) !== JSON.stringify((nuevo as Record<string, unknown>)[c]),
  );

  const cambiar = (valor: T) => {
    setBorrador(valor);
    if (servidor.generales.length || Object.keys(servidor.porCampo).length) setServidor({ porCampo: {}, generales: [] });
  };

  const pedirGuardar = () => {
    if (Object.keys(erroresCliente).length > 0) {
      setServidor({ porCampo: {}, generales: [MENSAJE_CORREGIR] });
      return;
    }
    setConfirmando(true);
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      const r = await guardarSeccionConfiguracion(clave, nuevo);
      setAvisoLegal(r?.afectaDocumentosLegales === true);
      setBorrador(nuevo as T);
      onGuardado(nuevo as T);
      setVersionHistorial((v) => v + 1);
      setServidor({ porCampo: {}, generales: [] });
      showToast(`${titulo}: cambios guardados. El sitio los muestra en menos de un minuto.`, 'success');
    } catch (e) {
      const mensajes = mensajesDelServidor(e);
      setServidor(mensajes ? repartirErroresServidor(clave, mensajes) : { porCampo: {}, generales: [mensajeDeError(e, 'No se pudo guardar. Intenta de nuevo.')] });
    } finally {
      setGuardando(false);
      setConfirmando(false);
    }
  };

  const generales = servidor.generales.length
    ? servidor.generales
    : Object.keys(servidor.porCampo).length
      ? ['El servidor rechazó algunos datos: revisa los campos marcados.']
      : [];

  return (
    <Card padding="lg">
      <section aria-labelledby={idTitulo} className="min-w-0 space-y-5">
        <header>
          <h3 id={idTitulo} className="text-lg font-semibold" style={{ color: COLOR_TEXTO }}>
            {titulo}
          </h3>
          {descripcion && (
            <p className="mt-1 max-w-[65ch] text-sm" style={{ color: COLOR_SUAVE }}>
              {descripcion}
            </p>
          )}
          {actualizado?.actualizadoEn && (
            <p className="mt-1 text-xs tabular-nums" style={{ color: COLOR_SUAVE }}>
              {`Última actualización: ${fechaHoraMexico(actualizado.actualizadoEn)}${actualizado.actualizadoPor ? ` por ${actualizado.actualizadoPor}` : ''}.`}
            </p>
          )}
        </header>

        {avisoLegal && <AvisoDocumentosLegales onCerrar={() => setAvisoLegal(false)} />}
        <ErroresGenerales mensajes={generales} />

        <div className={vistaPrevia ? 'grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]' : undefined}>
          <div className="min-w-0">{children({ valor: borrador, cambiar, errores })}</div>
          {vistaPrevia && <div className="min-w-0 xl:sticky xl:top-20 xl:self-start">{vistaPrevia(borrador, errores)}</div>}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-end" style={{ borderColor: 'var(--mf-linea-fuerte)' }}>
          <p className="text-sm sm:mr-auto" style={{ color: COLOR_SUAVE }} aria-live="polite">
            {hayCambios ? `${cambios.length} ${cambios.length === 1 ? 'cambio' : 'cambios'} sin guardar.` : 'Sin cambios por guardar.'}
          </p>
          <Button variant="outline" onClick={() => cambiar(guardado)} disabled={!hayCambios || guardando}>
            Descartar cambios
          </Button>
          <Button onClick={pedirGuardar} disabled={!hayCambios || guardando}>
            Guardar
          </Button>
        </div>

        <HistorialSeccion clave={clave} version={versionHistorial} />
      </section>

      <Modal
        isOpen={confirmando}
        onClose={() => !guardando && setConfirmando(false)}
        title={`Guardar ${titulo.toLowerCase()}`}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmando(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </>
        }
      >
        <ResumenGuardado cambios={cambios} tocaLegal={tocaLegal} />
      </Modal>
    </Card>
  );
}
