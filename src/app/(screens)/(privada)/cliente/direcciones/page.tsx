'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import PublicLayout from '../../../../components/layouts/PublicLayout';
import Breadcrumb from '../../../../components/ui/Breadcrumb';
import Card from '../../../../components/ui/Card';
import { getBreadcrumbsForPath } from '../../../../utils/breadcrumbs';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Textarea from '../../../../components/ui/Textarea';
import {
  listarDireccionesUsuario,
  crearDireccionUsuario,
  actualizarDireccionUsuario,
  eliminarDireccionUsuario,
  type DireccionUsuarioDTO,
  type TipoDomicilioValor,
} from '../../../../services/perfil';
import { esTelefonoMexicoValido, mensajeTelefonoInvalido, sanitizarEntradaTelefono10 } from '../../../../utils/phone';

const emptyForm = () => ({
  calle: '',
  codigoPostal: '',
  estado: '',
  municipioAlcaldia: '',
  localidad: '',
  coloniaBarrio: '',
  numeroInterior: '',
  indicaciones: '',
  tipoDomicilio: 'casa' as TipoDomicilioValor,
  contactoNombreApellido: '',
  contactoTelefono: '',
  esPrincipal: false,
});

function returnUrlSeguro(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/')) return null;
  if (raw.startsWith('//')) return null;
  return raw;
}

function DireccionesPageContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = returnUrlSeguro(searchParams.get('returnUrl'));
  const editIdDesdeUrl = searchParams.get('edit');
  const appliedEditRef = useRef(false);

  const [items, setItems] = useState<DireccionUsuarioDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [contactoTelError, setContactoTelError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await listarDireccionesUsuario();
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las direcciones');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    appliedEditRef.current = false;
  }, [editIdDesdeUrl]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setContactoTelError(null);
    setShowForm(true);
  };

  const openEdit = useCallback((d: DireccionUsuarioDTO) => {
    setEditingId(d.id);
    setForm({
      calle: d.calle,
      codigoPostal: d.codigoPostal,
      estado: d.estado,
      municipioAlcaldia: d.municipioAlcaldia,
      localidad: d.localidad,
      coloniaBarrio: d.coloniaBarrio,
      numeroInterior: d.numeroInterior || '',
      indicaciones: d.indicaciones || '',
      tipoDomicilio: d.tipoDomicilio,
      contactoNombreApellido: d.contactoNombreApellido,
      contactoTelefono: sanitizarEntradaTelefono10(d.contactoTelefono),
      esPrincipal: d.esPrincipal,
    });
    setContactoTelError(null);
    setShowForm(true);
  }, []);

  useEffect(() => {
    if (loading || items.length === 0 || !editIdDesdeUrl || appliedEditRef.current) return;
    const d = items.find((x) => x.id === editIdDesdeUrl);
    if (d) {
      appliedEditRef.current = true;
      openEdit(d);
    }
  }, [loading, items, editIdDesdeUrl, openEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactoTelError(null);
    if (!esTelefonoMexicoValido(form.contactoTelefono)) {
      setContactoTelError(mensajeTelefonoInvalido());
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        calle: form.calle.trim(),
        codigoPostal: form.codigoPostal.trim(),
        estado: form.estado.trim(),
        municipioAlcaldia: form.municipioAlcaldia.trim(),
        localidad: form.localidad.trim(),
        coloniaBarrio: form.coloniaBarrio.trim(),
        numeroInterior: form.numeroInterior.trim() || null,
        indicaciones: form.indicaciones.trim() || null,
        tipoDomicilio: form.tipoDomicilio,
        contactoNombreApellido: form.contactoNombreApellido.trim(),
        contactoTelefono: sanitizarEntradaTelefono10(form.contactoTelefono),
        esPrincipal: form.esPrincipal,
      };
      if (editingId) {
        await actualizarDireccionUsuario(editingId, payload);
      } else {
        await crearDireccionUsuario(payload);
      }
      setShowForm(false);
      await load();
      if (returnUrl) {
        router.push(returnUrl);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la dirección');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta dirección?')) return;
    setSaving(true);
    setError(null);
    try {
      await eliminarDireccionUsuario(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PublicLayout>
      <div className="layout-page py-12" style={{ marginTop: '136px' }}>
        <div className="max-w-4xl mx-auto">
          <Breadcrumb items={getBreadcrumbsForPath(pathname ?? '/cliente/direcciones')} />
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 mt-2">
            <h1 className="text-hero" style={{ color: 'var(--menu-texto-principal)' }}>
              Mis direcciones
            </h1>
            <Button type="button" onClick={openNew} disabled={saving}>
              Nueva dirección
            </Button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
              {error}
            </div>
          )}

          {loading ? (
            <p style={{ color: 'var(--encabezados-alterno)' }}>Cargando…</p>
          ) : items.length === 0 && !showForm ? (
            <Card>
              <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
                Aún no tienes direcciones guardadas.
              </p>
              <Button type="button" onClick={openNew}>
                Agregar dirección
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {items.map((d) => (
                <Card key={d.id}>
                  <div className="flex flex-wrap justify-between gap-4">
                    <div>
                      {d.esPrincipal && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--success)] text-white mb-2 inline-block">
                          Principal
                        </span>
                      )}
                      <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
                        {d.contactoNombreApellido}
                      </p>
                      <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
                        {d.calle}
                        {d.numeroInterior ? `, Int. ${d.numeroInterior}` : ''}, {d.coloniaBarrio},{' '}
                        {d.localidad}, {d.municipioAlcaldia}, {d.estado} CP {d.codigoPostal}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
                        Tel. contacto: {d.contactoTelefono} · {d.tipoDomicilio === 'trabajo' ? 'Trabajo' : 'Casa'}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button type="button" size="sm" variant="outline" onClick={() => openEdit(d)} disabled={saving}>
                        Editar
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => handleDelete(d.id)} disabled={saving}>
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {showForm && (
            <Card className="mt-8">
              <h2 className="text-page-title mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                {editingId ? 'Editar dirección' : 'Nueva dirección'}
              </h2>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Input
                    label="Calle y número (texto completo)"
                    fullWidth
                    value={form.calle}
                    onChange={(e) => setForm((f) => ({ ...f, calle: e.target.value }))}
                    required
                    disabled={saving}
                  />
                </div>
                <Input
                  label="Código postal"
                  fullWidth
                  value={form.codigoPostal}
                  onChange={(e) => setForm((f) => ({ ...f, codigoPostal: e.target.value }))}
                  required
                  disabled={saving}
                />
                <Input
                  label="Estado"
                  fullWidth
                  value={form.estado}
                  onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
                  required
                  disabled={saving}
                />
                <Input
                  label="Municipio / Alcaldía"
                  fullWidth
                  value={form.municipioAlcaldia}
                  onChange={(e) => setForm((f) => ({ ...f, municipioAlcaldia: e.target.value }))}
                  required
                  disabled={saving}
                />
                <Input
                  label="Localidad"
                  fullWidth
                  value={form.localidad}
                  onChange={(e) => setForm((f) => ({ ...f, localidad: e.target.value }))}
                  required
                  disabled={saving}
                />
                <Input
                  label="Colonia o barrio"
                  fullWidth
                  value={form.coloniaBarrio}
                  onChange={(e) => setForm((f) => ({ ...f, coloniaBarrio: e.target.value }))}
                  required
                  disabled={saving}
                />
                <Input
                  label="Número interior (opcional)"
                  fullWidth
                  value={form.numeroInterior}
                  onChange={(e) => setForm((f) => ({ ...f, numeroInterior: e.target.value }))}
                  disabled={saving}
                />
                <Select
                  label="Tipo de domicilio"
                  fullWidth
                  options={[
                    { value: 'casa', label: 'Casa' },
                    { value: 'trabajo', label: 'Trabajo' },
                  ]}
                  value={form.tipoDomicilio}
                  onChange={(e) => setForm((f) => ({ ...f, tipoDomicilio: e.target.value as TipoDomicilioValor }))}
                  disabled={saving}
                />
                <Input
                  label="Nombre y apellido de contacto"
                  fullWidth
                  value={form.contactoNombreApellido}
                  onChange={(e) => setForm((f) => ({ ...f, contactoNombreApellido: e.target.value }))}
                  required
                  disabled={saving}
                />
                <Input
                  label="Teléfono de contacto (10 dígitos)"
                  fullWidth
                  inputMode="numeric"
                  maxLength={10}
                  value={form.contactoTelefono}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contactoTelefono: sanitizarEntradaTelefono10(e.target.value) }))
                  }
                  required
                  disabled={saving}
                  error={contactoTelError || undefined}
                />
                <div className="md:col-span-2">
                  <Textarea
                    label="Indicaciones (opcional)"
                    fullWidth
                    rows={3}
                    value={form.indicaciones}
                    onChange={(e) => setForm((f) => ({ ...f, indicaciones: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--menu-texto-principal)' }}>
                    <input
                      type="checkbox"
                      checked={form.esPrincipal}
                      onChange={(e) => setForm((f) => ({ ...f, esPrincipal: e.target.checked }))}
                      disabled={saving}
                    />
                    Marcar como dirección principal
                  </label>
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Guardando…' : 'Guardar'}
                  </Button>
                  <Button type="button" variant="outline" disabled={saving} onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

export default function DireccionesPage() {
  return (
    <Suspense
      fallback={
        <PublicLayout>
          <div className="layout-page py-12" style={{ marginTop: '136px' }}>
            <p style={{ color: 'var(--encabezados-alterno)' }}>Cargando…</p>
          </div>
        </PublicLayout>
      }
    >
      <DireccionesPageContent />
    </Suspense>
  );
}
