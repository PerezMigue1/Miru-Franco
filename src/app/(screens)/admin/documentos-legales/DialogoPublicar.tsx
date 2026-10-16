'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Textarea from '../../../components/ui/Textarea';
import {
  publicarVersionDocumentoLegal,
  type DocumentoAdmin,
  type ResultadoPublicacion,
} from '../../../services/documentosLegales';
import { mensajeDeError } from '../../../utils/errorRed';
import { hoyEnMexico } from '../../../utils/fechaSoloDia';
import { MAX_MOTIVO, siguienteVersion, validarPublicacion, type CamposPublicacion } from './editorDocumentos';

const COLOR_TEXTO = 'var(--menu-texto-principal)';
const COLOR_SUAVE = 'var(--encabezados-alterno)';

/** Documentos cuya nueva versión se pide aceptar al entrar (re-aceptación de las cuentas con sesión). */
const CON_REACEPTACION = new Set(['terminos', 'aviso-privacidad']);

interface Props {
  doc: DocumentoAdmin;
  plantilla: string;
  /** La versión más alta ya publicada (vigente o programada) y la vigencia de la última. */
  versionMayor: string | null;
  ultimaVigencia: string | null;
  onCerrar: () => void;
  onPublicado: (r: ResultadoPublicacion) => void;
}

/**
 * "Publicar nueva versión": pide número de versión, fecha de vigencia y motivo, y si se pide volver a aceptar
 * (marcado por omisión: cambio importante). El backend calcula el hash, inserta la versión y deja las anteriores solo
 * para consulta.
 */
export default function DialogoPublicar({ doc, plantilla, versionMayor, ultimaVigencia, onCerrar, onPublicado }: Props) {
  const hoy = hoyEnMexico();
  const [campos, setCampos] = useState<CamposPublicacion>({ version: siguienteVersion(versionMayor), vigenteDesde: hoy, motivo: '' });
  const [requiereAceptacion, setRequiereAceptacion] = useState(true);
  const [errores, setErrores] = useState<Partial<Record<keyof CamposPublicacion, string>>>({});
  const [errorServidor, setErrorServidor] = useState('');
  const [publicando, setPublicando] = useState(false);

  const cambiar = (campo: keyof CamposPublicacion, valor: string) => {
    setCampos((c) => ({ ...c, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  };

  const publicar = async () => {
    const encontrados = validarPublicacion(campos, { versionMayor, ultimaVigencia, hoy });
    setErrores(encontrados);
    if (Object.values(encontrados).some(Boolean)) return;
    setPublicando(true);
    setErrorServidor('');
    try {
      const r = await publicarVersionDocumentoLegal(doc.slug, {
        plantilla,
        version: campos.version.trim(),
        vigenteDesde: campos.vigenteDesde,
        motivo: campos.motivo.trim(),
        requiereAceptacion,
      });
      onPublicado(r);
    } catch (e) {
      setErrorServidor(mensajeDeError(e, 'No se pudo publicar la versión. Revisa los datos e intenta de nuevo.'));
    } finally {
      setPublicando(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={publicando ? () => undefined : onCerrar}
      title={`Publicar nueva versión de ${doc.titulo}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onCerrar} disabled={publicando}>
            Cancelar
          </Button>
          <Button onClick={publicar} disabled={publicando}>
            <Send size={16} aria-hidden />
            {publicando ? 'Publicando…' : `Publicar la versión ${campos.version.trim() || ''}`.trim()}
          </Button>
        </>
      }
    >
      <div className="space-y-5" style={{ color: 'var(--texto-cuerpo)' }}>
        <p className="text-sm">
          La versión publicada ya no se puede editar: queda en el historial con su texto, su fecha y su motivo. Las
          variables de reglas se guardan con el valor que tienen hoy.
          {doc.incluye ? ` ${doc.incluye}` : ''}
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Número de versión"
            value={campos.version}
            onChange={(e) => cambiar('version', e.target.value)}
            error={errores.version}
            helperText={versionMayor ? `La última publicada es la ${versionMayor}. Usa X.Y, mayor que esa.` : 'Usa la forma X.Y.'}
            inputMode="decimal"
            autoComplete="off"
            required
          />
          <Input
            label="Vigente desde"
            type="date"
            min={ultimaVigencia && ultimaVigencia > hoy ? ultimaVigencia : hoy}
            value={campos.vigenteDesde}
            onChange={(e) => cambiar('vigenteDesde', e.target.value)}
            error={errores.vigenteDesde}
            helperText="Hoy o una fecha futura. Hasta ese día sigue vigente la versión actual."
            required
          />
        </div>

        <Textarea
          label="Motivo del cambio"
          value={campos.motivo}
          onChange={(e) => cambiar('motivo', e.target.value)}
          error={errores.motivo}
          helperText="Qué cambió y por qué. Queda en el historial."
          rows={3}
          maxLength={MAX_MOTIVO}
          required
        />

        <div className="rounded-[10px] border px-4 py-3" style={{ borderColor: 'var(--mf-linea-fuerte)' }}>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold" style={{ color: COLOR_TEXTO }}>
            <input
              type="checkbox"
              checked={requiereAceptacion}
              onChange={(e) => setRequiereAceptacion(e.target.checked)}
              aria-describedby="publicar-reaceptacion-ayuda"
              className="h-5 w-5 shrink-0"
            />
            Pedir que se vuelva a aceptar
          </label>
          <p id="publicar-reaceptacion-ayuda" className="mt-1 text-sm" style={{ color: COLOR_SUAVE }}>
            {requiereAceptacion
              ? 'Cambio importante (nuevas obligaciones, datos, plazos o costos). '
              : 'Corrección menor (una errata o una aclaración que no cambia lo que se aceptó): quien aceptó la versión anterior no tendrá que volver a aceptar. '}
            {CON_REACEPTACION.has(doc.slug)
              ? 'Las clientas con sesión verán un aviso para aceptar la nueva versión antes de seguir.'
              : 'Este documento se acepta en cada compra, cita o en el aviso de cookies.'}
          </p>
        </div>

        {errorServidor && (
          <p role="alert" className="text-sm font-semibold" style={{ color: 'var(--danger-texto)' }}>
            {errorServidor}
          </p>
        )}
      </div>
    </Modal>
  );
}
