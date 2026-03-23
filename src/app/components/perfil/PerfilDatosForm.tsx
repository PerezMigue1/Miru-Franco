'use client';

import { useEffect, useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import PerfilFotoBlock from './PerfilFotoBlock';
import {
  getMiPerfil,
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

export interface PerfilDatosFormProps {
  /** Tras guardar correctamente (p. ej. refrescar cabecera / estado padre) */
  onSaved?: (p: PerfilUsuarioCompleto) => void;
}

export default function PerfilDatosForm({ onSaved }: PerfilDatosFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuarioCompleto | null>(null);

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [tipoCabello, setTipoCabello] = useState('');
  const [colorNatural, setColorNatural] = useState('');
  const [colorActual, setColorActual] = useState('');
  const [productosUsados, setProductosUsados] = useState('');
  const [alergias, setAlergias] = useState('');
  const [aceptaAvisoPrivacidad, setAceptaAvisoPrivacidad] = useState(false);
  const [recibePromociones, setRecibePromociones] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const p = await getMiPerfil();
        if (cancelled) return;
        setPerfil(p);
        setNombre(p.nombre || '');
        setTelefono(sanitizarEntradaTelefono10(p.telefono || ''));
        setFechaNacimiento(p.fechaNacimiento?.slice(0, 10) || '');
        setTipoCabello(p.tipoCabello || '');
        setColorNatural(p.colorNatural || '');
        setColorActual(p.colorActual || '');
        setProductosUsados(p.productosUsados || '');
        setAlergias(p.alergias || '');
        setAceptaAvisoPrivacidad(p.aceptaAvisoPrivacidad === true);
        setRecibePromociones(p.recibePromociones === true);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'No se pudo cargar el perfil.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(null);
    setPhoneError(null);

    if (telefono.trim() && !esTelefonoMexicoValido(telefono)) {
      setPhoneError(mensajeTelefonoInvalido());
      return;
    }

    setSaving(true);
    try {
      const tc = tipoCabello as TipoCabelloValor | '';
      await patchMiPerfil({
        nombre: nombre.trim(),
        telefono: telefono.trim() ? sanitizarEntradaTelefono10(telefono) : null,
        fechaNacimiento: fechaNacimiento.trim() || null,
        tipoCabello: tc === '' ? null : tc,
        colorNatural: colorNatural.trim() || null,
        colorActual: colorActual.trim() || null,
        productosUsados: productosUsados.trim() || null,
        alergias: alergias.trim() || null,
        aceptaAvisoPrivacidad,
        recibePromociones,
      });
      setOk('Cambios guardados.');
      const p = await getMiPerfil();
      setPerfil(p);
      if (typeof window !== 'undefined' && p) {
        mergePerfilEnLocalStorage(p);
      }
      onSaved?.(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-[var(--fondos-suaves)] bg-[var(--tarjetas-paneles)] p-6">
      <h3 className="text-lg font-semibold mb-6 text-[var(--menu-texto-principal)]">Información personal</h3>

      {loading && (
        <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
          Cargando…
        </p>
      )}
      {error && !loading && (
        <p className="text-sm mb-4 text-red-600 dark:text-red-400">{error}</p>
      )}
      {ok && (
        <p className="text-sm mb-4 text-green-700 dark:text-green-400" role="status">
          {ok}
        </p>
      )}

      <div className="mb-8">
        <PerfilFotoBlock
          variant="full"
          initialFotoUrl={perfil?.foto ?? null}
          displayName={nombre}
          disabled={loading || saving}
          onUpdated={(p) => {
            setPerfil(p);
            onSaved?.(p);
          }}
        />
      </div>

      <form onSubmit={handleGuardar} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Nombre completo"
          fullWidth
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          disabled={loading || saving}
        />
        <Input
          label="Teléfono (10 dígitos, México)"
          fullWidth
          inputMode="numeric"
          maxLength={10}
          value={telefono}
          onChange={(e) => setTelefono(sanitizarEntradaTelefono10(e.target.value))}
          placeholder="5512345678"
          disabled={loading || saving}
          error={phoneError || undefined}
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
          value={fechaNacimiento}
          onChange={(e) => setFechaNacimiento(e.target.value)}
          disabled={loading || saving}
        />

        <div className="md:col-span-2 border-t border-[var(--fondos-suaves)] pt-4 mt-2">
          <h4 className="text-sm font-semibold mb-3 text-[var(--menu-texto-principal)]">Perfil capilar</h4>
        </div>
        <Select
          label="Tipo de cabello"
          fullWidth
          options={TIPO_CABELLO_OPTIONS}
          value={tipoCabello}
          onChange={(e) => setTipoCabello(e.target.value)}
          disabled={loading || saving}
        />
        <Input
          label="Color natural"
          fullWidth
          value={colorNatural}
          onChange={(e) => setColorNatural(e.target.value)}
          disabled={loading || saving}
        />
        <Input
          label="Color actual"
          fullWidth
          value={colorActual}
          onChange={(e) => setColorActual(e.target.value)}
          disabled={loading || saving}
        />
        <Input
          label="Productos que usas"
          fullWidth
          value={productosUsados}
          onChange={(e) => setProductosUsados(e.target.value)}
          disabled={loading || saving}
        />
        <div className="md:col-span-2">
          <Input
            label="Alergias"
            fullWidth
            value={alergias}
            onChange={(e) => setAlergias(e.target.value)}
            disabled={loading || saving}
          />
        </div>

        <div className="md:col-span-2 flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer text-[var(--menu-texto-principal)]">
            <input
              type="checkbox"
              checked={aceptaAvisoPrivacidad}
              onChange={(e) => setAceptaAvisoPrivacidad(e.target.checked)}
              disabled={loading || saving}
            />
            Acepto el aviso de privacidad
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer text-[var(--menu-texto-principal)]">
            <input
              type="checkbox"
              checked={recibePromociones}
              onChange={(e) => setRecibePromociones(e.target.checked)}
              disabled={loading || saving}
            />
            Deseo recibir promociones
          </label>
        </div>

        <div className="md:col-span-2">
          <Button type="submit" disabled={loading || saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>
  );
}
