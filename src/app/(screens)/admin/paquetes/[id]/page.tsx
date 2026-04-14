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

  if (loading) return <AdminLayout><p className="p-10 text-white">Cargando...</p></AdminLayout>;

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto p-6">
        {/* Encabezado con Volver */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Detalles del Paquete</h1>
          <Button variant="outline" onClick={() => router.push('/admin/paquetes')}>
            ← Volver
          </Button>
        </div>

        {/* Recuadro Principal */}
        <Card className="bg-[#121212] border-gray-800 p-8 shadow-xl">
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
            <div className="p-4 bg-black/40 rounded-lg border border-gray-800">
              <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase">Servicios Incluidos</h3>
              <div className="flex flex-wrap gap-2">
                {form.servicios_vinculados.map((srv, i) => (
                  <span key={i} className="px-3 py-1 bg-red-900/30 text-red-400 border border-red-900/50 rounded-full text-xs font-medium">
                    {srv}
                  </span>
                ))}
                {form.servicios_vinculados.length === 0 && <span className="text-gray-600 text-sm italic">Sin servicios vinculados</span>}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleGuardar} disabled={saving} className="bg-red-700 hover:bg-red-800 text-white px-8">
                {saving ? 'Guardando...' : 'Actualizar Paquete'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}