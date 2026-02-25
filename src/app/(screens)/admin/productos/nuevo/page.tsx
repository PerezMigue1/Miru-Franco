'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import { colors } from '../../../../utils/colors';
import { createProducto, type ProductoPayload } from '../../../../services/productos';

export default function NuevoProductoAdminPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('');
  const [marca, setMarca] = useState('');
  const [disponible, setDisponible] = useState(true);
  const [imagenesText, setImagenesText] = useState('');

  const handleCrear = async () => {
    if (!nombre.trim() || !descripcion.trim() || !categoria.trim()) {
      setError('Nombre, descripción y categoría son obligatorios.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: ProductoPayload = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        categoria: categoria.trim(),
        marca: marca.trim() || undefined,
        imagenes: imagenesText
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
      };
      const creado = await createProducto(payload);
      router.push(`/admin/productos/${creado.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el producto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: colors.menuTextoPrincipal }}>
          Nuevo producto
        </h1>
        <p className="text-sm mb-6" style={{ color: colors.encabezadosAlterno }}>
          Completa los datos del producto. Los campos con * son obligatorios.
        </p>

        {error && (
          <Card className="mb-6 border-l-4" padding="md" style={{ borderLeftColor: colors.danger }}>
            <p className="text-sm font-medium" style={{ color: colors.danger }}>{error}</p>
          </Card>
        )}

        <Card padding="lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Input
              label="Nombre *"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Shampoo hidratante"
              fullWidth
            />
            <Input
              label="Categoría *"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Ej: Cuidado capilar"
              fullWidth
            />
            <Input
              label="Marca"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              placeholder="Opcional"
              fullWidth
            />
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={disponible}
                  onChange={(e) => setDisponible(e.target.checked)}
                  className="rounded"
                />
                <span style={{ color: colors.menuTextoPrincipal }}>Disponible en tienda</span>
              </label>
            </div>
          </div>
          <div className="mb-6">
            <Input
              label="Descripción corta *"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Breve descripción del producto"
              fullWidth
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1" style={{ color: colors.encabezadosAlterno }}>
              Imágenes (una URL por línea)
            </label>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm"
              rows={3}
              value={imagenesText}
              onChange={(e) => setImagenesText(e.target.value)}
              placeholder="https://..."
              style={{
                borderColor: colors.tarjetasPaneles,
                backgroundColor: colors.fondosSuaves,
                color: colors.menuTextoPrincipal,
              }}
            />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleCrear} disabled={saving}>
              {saving ? 'Creando...' : 'Crear producto'}
            </Button>
            <Button variant="outline" onClick={() => router.push('/admin/inventario')} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
