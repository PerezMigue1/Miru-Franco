'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import PerfilFotoBlock from './PerfilFotoBlock';
import { getMiPerfil } from '../../services/auth';
import {
  mergePerfilEnLocalStorage,
  patchMiPerfil,
  type PerfilUsuarioCompleto,
  type TipoCabelloValor,
} from '../../services/perfil';
import { sanitizarEntradaTelefono10, esTelefonoMexicoValido, mensajeTelefonoInvalido } from '../../utils/phone';

const TIPO_CABELLO_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Sin especificar' },
  { value: 'liso', label: 'Liso' },
  { value: 'ondulado', label: 'Ondulado' },
  { value: 'rizado', label: 'Rizado' },
];

interface FormValues {
  nombre: string;
  telefono: string;
  fechaNacimiento: string;
  tipoCabello: string;
  colorNatural: string;
  colorActual: string;
  productosUsados: string;
  alergias: string;
  aceptaAvisoPrivacidad: boolean;
  recibePromociones: boolean;
}

export interface PerfilDatosFormProps {
  onSaved?: (p: PerfilUsuarioCompleto) => void;
}

export default function PerfilDatosForm({ onSaved }: PerfilDatosFormProps) {
  const [loadingPerfil, setLoadingPerfil] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuarioCompleto | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      nombre: '', telefono: '', fechaNacimiento: '', tipoCabello: '',
      colorNatural: '', colorActual: '', productosUsados: '', alergias: '',
      aceptaAvisoPrivacidad: false, recibePromociones: false,
    },
  });

  useEffect(() => {
    let cancelled = false;
    setLoadingPerfil(true);
    setLoadError(null);
    getMiPerfil()
      .then((p) => {
        if (cancelled) return;
        setPerfil(p);
        reset({
          nombre: p.nombre || '',
          telefono: sanitizarEntradaTelefono10(p.telefono || ''),
          fechaNacimiento: p.fechaNacimiento?.slice(0, 10) || '',
          tipoCabello: p.tipoCabello || '',
          colorNatural: p.colorNatural || '',
          colorActual: p.colorActual || '',
          productosUsados: p.productosUsados || '',
          alergias: p.alergias || '',
          aceptaAvisoPrivacidad: p.aceptaAvisoPrivacidad === true,
          recibePromociones: p.recibePromociones === true,
        });
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'No se pudo cargar el perfil.');
      })
      .finally(() => {
        if (!cancelled) setLoadingPerfil(false);
      });
    return () => { cancelled = true; };
  }, [reset]);

  const onSubmit = async (values: FormValues) => {
    setSaveOk(null);
    const tc = values.tipoCabello as TipoCabelloValor | '';
    await patchMiPerfil({
      nombre: values.nombre.trim() || (perfil?.nombre ?? ''),
      telefono: values.telefono.trim() ? sanitizarEntradaTelefono10(values.telefono) : null,
      fechaNacimiento: values.fechaNacimiento.trim() || null,
      tipoCabello: tc === '' ? null : tc,
      colorNatural: values.colorNatural.trim() || null,
      colorActual: values.colorActual.trim() || null,
      productosUsados: values.productosUsados.trim() || null,
      alergias: values.alergias.trim() || null,
      aceptaAvisoPrivacidad: values.aceptaAvisoPrivacidad,
      recibePromociones: values.recibePromociones,
    });
    setSaveOk('Cambios guardados.');
    const p = await getMiPerfil();
    setPerfil(p);
    if (typeof window !== 'undefined' && p) mergePerfilEnLocalStorage(p);
    onSaved?.(p);
  };

  const disabled = loadingPerfil || isSubmitting;

  return (
    <div className="rounded-lg border border-[var(--fondos-suaves)] bg-[var(--tarjetas-paneles)] p-6">
      <h3 className="text-elegant-title mb-6" style={{ color: 'var(--encabezados-alterno)', fontFamily: 'var(--font-family-serif)' }}>Información personal</h3>

      {loadingPerfil && <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>Cargando…</p>}
      {loadError && !loadingPerfil && <p className="text-sm mb-4" style={{ color: 'var(--danger)' }}>{loadError}</p>}
      {saveOk && <p className="text-sm mb-4" style={{ color: 'var(--success)' }} role="status">{saveOk}</p>}

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
          maxLength={10}
          placeholder="5512345678"
          disabled={disabled}
          error={errors.telefono?.message}
          {...register('telefono', {
            validate: (v) => !v.trim() || esTelefonoMexicoValido(v) || mensajeTelefonoInvalido(),
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              setValue('telefono', sanitizarEntradaTelefono10(e.target.value)),
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
        </div>

        <div className="md:col-span-2 flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer text-[var(--menu-texto-principal)]">
            <input type="checkbox" disabled={disabled} {...register('aceptaAvisoPrivacidad')} />
            Acepto el aviso de privacidad
          </label>
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
