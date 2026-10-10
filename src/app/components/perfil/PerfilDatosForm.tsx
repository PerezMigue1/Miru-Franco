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
import { errorConsentimientoAlergias } from '../../utils/consentimientoDatosSensibles';
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
  const [perfil, setPerfil] = useState<PerfilUsuarioCompleto | null>(null);
  // Cada reintento vuelve a disparar la carga del perfil.
  const [intentoCarga, setIntentoCarga] = useState(0);
  // Último valor del teléfono, para distinguir lo pegado de lo escrito tecla por tecla.
  const telefonoAnteriorRef = useRef('');

  const {
    register,
    handleSubmit,
    reset,
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
    await patchMiPerfil(cuerpo);
    setSaveOk('Cambios guardados.');
    const p = await getMiPerfil();
    setPerfil(p);
    if (typeof window !== 'undefined' && p) mergePerfilEnLocalStorage(p);
    onSaved?.(p);
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
          disabled={disabled}
          {...register('fechaNacimiento')}
        />

        <div className="md:col-span-2 border-t pt-6 mt-2" style={{ borderColor: 'var(--borde-visible)' }}>
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-px" style={{ backgroundColor: 'var(--logo-branding)' }} />
            <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: 'var(--logo-branding)' }}>Perfil capilar</p>
          </div>
        </div>
        <Select label="Tipo de cabello" fullWidth options={TIPO_CABELLO_OPTIONS} disabled={disabled} {...register('tipoCabello')} />
        <Input label="Color natural" fullWidth disabled={disabled} {...register('colorNatural')} />
        <Input label="Color actual" fullWidth disabled={disabled} {...register('colorActual')} />
        <Input label="Productos que usas" fullWidth disabled={disabled} {...register('productosUsados')} />
        <div className="md:col-span-2">
          <Input label="Alergias" fullWidth disabled={disabled} {...register('alergias')} />
          <CasillaDatosSalud
            className="mt-2"
            disabled={disabled}
            error={errors.consienteDatosSensibles?.message}
            {...register('consienteDatosSensibles', {
              validate: (v, all) => errorConsentimientoAlergias(all.alergias, v) ?? true,
            })}
          />
        </div>

        <div className="md:col-span-2 flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer text-[var(--menu-texto-principal)]">
            <input type="checkbox" disabled={disabled} {...register('recibePromociones')} />
            Deseo recibir promociones
          </label>
        </div>

        <div className="md:col-span-2">
          <Button type="submit" disabled={disabled}>
            {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>
  );
}
