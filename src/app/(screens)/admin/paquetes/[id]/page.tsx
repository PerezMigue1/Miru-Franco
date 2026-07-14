'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPaqueteById, updatePaquete, camposPaqueteApi } from '../../../../services/paquetes'; 
import AdminLayout from '../../../../components/layouts/AdminLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Textarea from '../../../../components/ui/Textarea';

export default function DetallePaquetePage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    tipo_evento: '',
    precio_especial: '',
    descripcion: '',
    servicios_vinculados: [] as string[]
  });

  useEffect(() => {
    if (id) {
      getPaqueteById(id as string)
        .then((p) => {
          const c = camposPaqueteApi(p as Record<string, unknown>);
          setForm({
            tipo_evento: c.tipoEvento,
            precio_especial: c.precioEspecial,
            descripcion: c.descripcion,
            servicios_vinculados: c.serviciosVinculados,
          });
        })
        .catch(() => console.error("Error al cargar"))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleGuardar = async () => {
    setSaving(true);
    try {
      const precioNum = parseFloat(String(form.precio_especial).replace(/[^0-9.]/g, ''));
      if (!Number.isFinite(precioNum) || precioNum < 0) {
        alert('Precio no válido');
        return;
      }
      await updatePaquete(id as string, {
        tipoEvento: form.tipo_evento.trim(),
        descripcion: form.descripcion.trim(),
        precioEspecial: precioNum,
        serviciosVinculados: form.servicios_vinculados.map((x) => String(x).trim()).filter(Boolean),
      });
      alert("¡Paquete actualizado!");
      router.push('/admin/paquetes');
    } catch {
      alert("Error al actualizar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="w-full max-w-none space-y-8">
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>Editar Paquete</h1>
          <Card variant="elevated" padding="lg">
            <p className="text-center py-8" style={{ color: 'var(--encabezados-alterno)' }}>Cargando paquete…</p>
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
              {form.tipo_evento || 'Editar Paquete'}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              Editar paquete
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/admin/paquetes')} disabled={saving}>Cancelar</Button>
            <Button variant="primary" onClick={handleGuardar} disabled={saving}>
              {saving ? 'Guardando...' : 'Actualizar Paquete'}
            </Button>
          </div>
        </div>

        <Card variant="elevated" padding="lg">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Evento"
                value={form.tipo_evento}
                onChange={(e) => setForm({...form, tipo_evento: e.target.value})}
                fullWidth
              />
              <Input
                label="Precio Especial ($)"
                type="number"
                value={form.precio_especial}
                onChange={(e) => setForm({...form, precio_especial: e.target.value})}
                fullWidth
              />
            </div>

            <Textarea
              label="Descripción"
              value={form.descripcion}
              onChange={(e) => setForm({...form, descripcion: e.target.value})}
              fullWidth
              rows={3}
            />

            {/* Sección de Servicios */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
              <h3 className="text-sm font-semibold mb-3 uppercase" style={{ color: 'var(--encabezados-alterno)' }}>Servicios Incluidos</h3>
              <div className="flex flex-wrap gap-2">
                {form.servicios_vinculados.map((srv, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: 'var(--tarjetas-paneles)',
                      color: 'var(--danger-texto)',
                      border: '1px solid var(--danger)',
                    }}
                  >
                    {srv}
                  </span>
                ))}
                {form.servicios_vinculados.length === 0 && (
                  <span className="text-sm italic" style={{ color: 'var(--encabezados-alterno)' }}>Sin servicios vinculados</span>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}