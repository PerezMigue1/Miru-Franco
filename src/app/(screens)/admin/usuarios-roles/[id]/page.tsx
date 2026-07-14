'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Textarea from '../../../../components/ui/Textarea';
import FotoUsuarioUploader from '../../../../components/admin/FotoUsuarioUploader';
import { getUsuarioById, updateUsuario, getRoles, type RolCatalogoItem, type RolValor } from '../../../../services/usuarios';

const ROLES_PERMITIDOS = ['admin', 'estilista', 'empleado', 'becario'] as const;

const opcionesRolPermitidas = [
  { value: 'admin', label: 'Administrador' },
  { value: 'estilista', label: 'Estilista' },
  { value: 'empleado', label: 'Empleado' },
  { value: 'becario', label: 'Becado' },
];

function rolValorParaSelect(rol: string): string {
  const r = String(rol || '').toLowerCase().trim();
  if (r === 'becado') return 'becario';
  return r || 'empleado';
}

const gridForm = 'grid grid-cols-1 sm:grid-cols-2 gap-4';

export default function EditarUsuarioPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const [roles, setRoles] = useState<RolCatalogoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [rol, setRol] = useState('empleado');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [recibePromociones, setRecibePromociones] = useState(false);
  const [tipoCabello, setTipoCabello] = useState('');
  const [colorNatural, setColorNatural] = useState('');
  const [colorActual, setColorActual] = useState('');
  const [productosUsados, setProductosUsados] = useState('');
  const [alergias, setAlergias] = useState('');

  useEffect(() => {
    getRoles().then(setRoles).catch(() => setRoles([]));
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getUsuarioById(id)
      .then((u) => {
        setNombre(u.nombre ?? '');
        setEmail(u.email ?? '');
        setTelefono(u.telefono ?? '');
        setRol(rolValorParaSelect(u.rol));
        setFechaNacimiento(u.fechaNacimiento ? u.fechaNacimiento.slice(0, 10) : '');
        setFoto(u.foto?.trim() || null);
        setRecibePromociones(u.recibePromociones ?? false);
        setTipoCabello(u.tipoCabello ?? '');
        setColorNatural(u.colorNatural ?? '');
        setColorActual(u.colorActual ?? '');
        setProductosUsados(u.productosUsados ?? '');
        setAlergias(u.alergias ?? '');
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const rolesFiltrados = roles.filter((r) =>
    ROLES_PERMITIDOS.includes(r.valor as (typeof ROLES_PERMITIDOS)[number])
  );
  const opcionesRol =
    rolesFiltrados.length > 0
      ? rolesFiltrados.map((r) => ({ value: r.valor, label: r.nombre === 'Becario' ? 'Becado' : r.nombre }))
      : opcionesRolPermitidas;

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // email NO se envía: no es editable desde este formulario.
      await updateUsuario(id, {
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
        rol: rol as RolValor,
        fechaNacimiento: fechaNacimiento || null,
        foto: foto,
        recibePromociones,
        tipoCabello: tipoCabello || null,
        colorNatural: colorNatural.trim() || null,
        colorActual: colorActual.trim() || null,
        productosUsados: productosUsados.trim() || null,
        alergias: alergias.trim() || null,
      });
      router.push('/admin/usuarios-roles');
    } catch (err) {
      const e = err as Error & { validationErrors?: Record<string, string> };
      let msg = e instanceof Error ? e.message : 'Error al guardar los cambios';
      if (e.validationErrors && Object.keys(e.validationErrors).length > 0) {
        msg += '\n' + Object.entries(e.validationErrors).map(([k, v]) => `• ${k}: ${v}`).join('\n');
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="w-full max-w-none space-y-8">
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>Editar Usuario</h1>
          <Card variant="elevated" padding="lg">
            <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>Cargando usuario…</p>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  if (notFound) {
    return (
      <AdminLayout>
        <div className="w-full max-w-none space-y-8">
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>Editar Usuario</h1>
          <Card variant="elevated" padding="lg">
            <div className="text-center py-8">
              <p className="mb-4" style={{ color: 'var(--danger-texto)' }}>No se encontró el usuario solicitado.</p>
              <Button variant="outline" onClick={() => router.push('/admin/usuarios-roles')}>Volver a usuarios</Button>
            </div>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              {nombre || 'Editar Usuario'}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              Editar usuario
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/admin/usuarios-roles')} disabled={saving}>Cancelar</Button>
            <Button variant="primary" onClick={handleGuardar} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</Button>
          </div>
        </div>

        {error && (
          <Card className="border-l-4" padding="md" style={{ borderLeftColor: 'var(--danger)' }}>
            <p className="text-sm font-medium whitespace-pre-line" style={{ color: 'var(--danger-texto)' }}>{error}</p>
          </Card>
        )}

      <Card variant="elevated" padding="lg">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--menu-texto-principal)' }}>Datos básicos</h3>
            <div className={gridForm}>
              <Input label="Nombre completo *" value={nombre} onChange={(e) => setNombre(e.target.value)} fullWidth />
              <div>
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  disabled
                  readOnly
                  className="opacity-60 cursor-not-allowed"
                  fullWidth
                />
                <p className="text-xs mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
                  El email no se puede modificar.
                </p>
              </div>
              <Input label="Teléfono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} fullWidth />
              <Input label="Fecha de nacimiento" type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} fullWidth />
              <Select label="Rol" value={rol} onChange={(e) => setRol(e.target.value)} options={opcionesRol} fullWidth />
              <div className="sm:col-span-2">
                <FotoUsuarioUploader value={foto} onChange={setFoto} disabled={saving} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--menu-texto-principal)' }}>Perfil capilar</h3>
            <div className={gridForm}>
              <Select
                label="Tipo de cabello"
                value={tipoCabello}
                onChange={(e) => setTipoCabello(e.target.value)}
                options={[
                  { value: '', label: 'Sin especificar' },
                  { value: 'liso', label: 'Liso' },
                  { value: 'ondulado', label: 'Ondulado' },
                  { value: 'rizado', label: 'Rizado' },
                ]}
                fullWidth
              />
              <Input label="Color natural del cabello" value={colorNatural} onChange={(e) => setColorNatural(e.target.value)} fullWidth />
              <Input label="Color actual" value={colorActual} onChange={(e) => setColorActual(e.target.value)} fullWidth />
              <div className="md:col-span-2 sm:col-span-2">
                <Textarea label="Productos que usa actualmente" value={productosUsados} onChange={(e) => setProductosUsados(e.target.value)} rows={2} fullWidth />
              </div>
              <div className="md:col-span-2 sm:col-span-2">
                <Textarea label="Alergias conocidas" value={alergias} onChange={(e) => setAlergias(e.target.value)} rows={2} fullWidth />
              </div>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={recibePromociones} onChange={(e) => setRecibePromociones(e.target.checked)} className="rounded" />
              <span className="text-sm" style={{ color: 'var(--menu-texto-principal)' }}>Acepta recibir promociones</span>
            </label>
          </div>

        </div>
      </Card>
      </div>
    </AdminLayout>
  );
}
