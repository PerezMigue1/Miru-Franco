'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { RotateCw } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import PerfilFotoBlock from './PerfilFotoBlock';
import { getMiPerfil } from '../../services/auth';
import { mergePerfilEnLocalStorage, patchMiPerfil, type PerfilUsuarioCompleto } from '../../services/perfil';
import {
  MAX_CARACTERES_CAMPO_TELEFONO,
  esTelefonoMexicoValido,
  mensajeTelefonoInvalido,
  telefonoEnCampo,
  telefonoSinLada,
} from '../../utils/phone';
import CasillaDatosSalud from '../legal/CasillaDatosSalud';
import AvisoSimplificado from '../legal/AvisoSimplificado';
import { mensajeUsuarioDesdeErrorApi } from '../../utils/apiErrorMessage';
import { hoyEnMexico } from '../../utils/fechaSoloDia';
import { alergiasNuevas, errorConsentimientoCambio, mensajeSaludDelBackend } from '../../utils/consentimientoDatosSensibles';
import {
  VALORES_PERFIL_VACIOS,
  cuerpoGuardarPerfil,
  formularioPerfilHabilitado,
  valoresDesdePerfil,
  type ValoresPerfil,
} from '../../utils/perfilDatosForm';

const TIPO_CABELLO_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Sin especificar' },
  { value: 'liso', label: 'Liso' },
  { value: 'ondulado', label: 'Ondulado' },
  { value: 'rizado', label: 'Rizado' },
];


export interface PerfilDatosFormProps {
  onSaved?: (p: PerfilUsuarioCompleto) => void;
}

export default function PerfilDatosForm({ onSaved }: PerfilDatosFormProps) {
  const [loadingPerfil, setLoadingPerfil] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuarioCompleto | null>(null);
  // Cada reintento vuelve a disparar la carga del perfil.
  const [intentoCarga, setIntentoCarga] = useState(0);
  // Último valor del teléfono, para distinguir lo pegado de lo escrito tecla por tecla.
  const telefonoAnteriorRef = useRef('');

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ValoresPerfil>({ defaultValues: VALORES_PERFIL_VACIOS });

  useEffect(() => {
    let cancelled = false;
    setLoadingPerfil(true);
    setLoadError(null);
    getMiPerfil()
      .then((p) => {
        if (cancelled) return;
        setPerfil(p);
        const valores = valoresDesdePerfil(p);
        telefonoAnteriorRef.current = valores.telefono;
        reset(valores);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'No se pudo cargar el perfil.');
      })
      .finally(() => {
        if (!cancelled) setLoadingPerfil(false);
      });
    return () => { cancelled = true; };
  }, [reset, intentoCarga]);

  const onSubmit = async (values: ValoresPerfil) => {
    // Sin perfil cargado no se guarda: los valores vacíos de inicio borrarían alergias, teléfono, etc.
    const cuerpo = cuerpoGuardarPerfil(perfil, values);
    if (!cuerpo) return;
    setSaveOk(null);
    setSaveError(null);
    try {
      await patchMiPerfil(cuerpo);
    } catch (e) {
      // 400 CONSENTIMIENTO_SALUD_REQUERIDO: el mensaje va junto a la casilla de datos de salud.
      const salud = mensajeSaludDelBackend(e);
      if (salud) {
        setError('consienteDatosSensibles', { type: 'server', message: salud });
        return;
      }
      setSaveError(mensajeUsuarioDesdeErrorApi(e));
      return;
    }
    setSaveOk('Cambios guardados.');
    try {
      const p = await getMiPerfil();
      setPerfil(p);
      if (typeof window !== 'undefined' && p) mergePerfilEnLocalStorage(p);
      onSaved?.(p);
    } catch {
      // Ya se guardó; la recarga del perfil puede esperar a la próxima visita.
    }
  };

  const disabled = !formularioPerfilHabilitado({ cargando: loadingPerfil, enviando: isSubmitting, perfil });

  return (
    <div className="rounded-lg border border-[var(--fondos-suaves)] bg-[var(--tarjetas-paneles)] p-6">
      <h3 className="text-elegant-title mb-6" style={{ color: 'var(--encabezados-alterno)', fontFamily: 'var(--font-family-serif)' }}>Información personal</h3>

      {loadingPerfil && <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>Cargando…</p>}
      {loadError && !loadingPerfil && (
        <div className="mb-4 flex flex-wrap items-center gap-3" role="alert">
          <p className="text-sm" style={{ color: 'var(--danger-texto)' }}>{loadError}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="inline-flex items-center gap-2"
            onClick={() => setIntentoCarga((n) => n + 1)}
          >
            <RotateCw size={16} aria-hidden />
            Reintentar
          </Button>
        </div>
      )}
      {saveOk && <p className="text-sm mb-4" style={{ color: 'var(--success-texto)' }} role="status">{saveOk}</p>}
      {saveError && (
        <p className="text-sm mb-4" style={{ color: 'var(--danger-texto)' }} role="alert">
          No se guardaron los cambios. {saveError}
        </p>
      )}

      <div className="mb-8">
        <PerfilFotoBlock
          variant="full"
          initialFotoUrl={perfil?.foto ?? null}
          displayName={watch('nombre')}
          disabled={disabled}
          onUpdated={(p) => { setPerfil(p); onSaved?.(p); }}
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Nombre completo"
          fullWidth
          disabled={disabled}
          error={errors.nombre?.message}
          {...register('nombre', { required: 'El nombre es obligatorio.' })}
        />
        <Input
          label="Teléfono (10 dígitos, México)"
          fullWidth
          inputMode="numeric"
          maxLength={MAX_CARACTERES_CAMPO_TELEFONO}
          placeholder="5512345678"
          disabled={disabled}
          error={errors.telefono?.message}
          {...register('telefono', {
            validate: (v) => !v.trim() || esTelefonoMexicoValido(v) || mensajeTelefonoInvalido(),
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
              const telefono = telefonoEnCampo(telefonoAnteriorRef.current, e.target.value);
              telefonoAnteriorRef.current = telefono;
              setValue('telefono', telefono);
            },
            onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
              const telefono = telefonoSinLada(e.target.value);
              telefonoAnteriorRef.current = telefono;
              setValue('telefono', telefono);
            },
          })}
        />
        <Input
          label="Correo electrónico"
          type="email"
          fullWidth
          value={perfil?.email || ''}
          disabled
          helperText="El correo no se puede cambiar desde aquí."
        />
        <Input
          label="Fecha de nacimiento"
          type="date"
          fullWidth
          max={hoyEnMexico()}
          disabled={disabled}
          {...register('fechaNacimiento')}
        />

        <div className="md:col-span-2 border-t pt-6 mt-2" style={{ borderColor: 'var(--borde-visible)' }}>
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-px" style={{ backgroundColor: 'var(--logo-branding)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>Perfil capilar</p>
          </div>
        </div>
        <Select label="Tipo de cabello" fullWidth options={TIPO_CABELLO_OPTIONS} disabled={disabled} {...register('tipoCabello')} />
        <Input label="Color natural" maxLength={255} fullWidth disabled={disabled} {...register('colorNatural')} />
        <Input label="Color actual" maxLength={255} fullWidth disabled={disabled} {...register('colorActual')} />
        <Input label="Productos que usas" maxLength={1000} fullWidth disabled={disabled} {...register('productosUsados')} />
        <div className="md:col-span-2">
          <Input label="Alergias" maxLength={1000} fullWidth disabled={disabled} {...register('alergias')} />
          {/* Solo si las alergias cambian a un texto nuevo: la misma casilla del registro (el backend la exige). */}
          {alergiasNuevas(perfil?.alergias, watch('alergias')) && (
            <CasillaDatosSalud
              className="mt-2"
              disabled={disabled}
              error={errors.consienteDatosSensibles?.message}
              {...register('consienteDatosSensibles', {
                validate: (v, all) => errorConsentimientoCambio(perfil?.alergias, all.alergias, v, 'clienta') ?? true,
              })}
            />
          )}
        </div>

        <div className="md:col-span-2 mf-consentimiento">
          <label>
            <input type="checkbox" disabled={disabled} {...register('recibePromociones')} />
            Deseo recibir promociones
          </label>
        </div>

        <div className="md:col-span-2 space-y-3">
          <Button type="submit" disabled={disabled}>
            {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
          </Button>
          <AvisoSimplificado finalidad="mantener tu perfil y cuidar tus servicios" />
        </div>
      </form>
    </div>
  );
}
