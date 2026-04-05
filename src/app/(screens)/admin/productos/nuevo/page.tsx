'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import {
  createProducto,
  getProductos,
  serializarPresentacionesProducto,
  type ProductoPayload,
} from '../../../../services/productos';
import { EditorImagenesPresentacionCloudinary } from '../../../../components/admin/EditorImagenesPresentacionCloudinary';

const AGREGAR_CAT = '__agregar_cat__';
const AGREGAR_MARCA = '__agregar_marca__';

export default function NuevoProductoAdminPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('');
  const [marca, setMarca] = useState('');
  const [disponible, setDisponible] = useState(true);
  const [imagenesPresentacion, setImagenesPresentacion] = useState<string[]>([]);
  const [categoriasCatalogo, setCategoriasCatalogo] = useState<string[]>([]);
  const [marcasCatalogo, setMarcasCatalogo] = useState<string[]>([]);
  const [showAgregarCategoria, setShowAgregarCategoria] = useState(false);
  const [showAgregarMarca, setShowAgregarMarca] = useState(false);
  const [nuevaCategoriaVal, setNuevaCategoriaVal] = useState('');
  const [nuevaMarcaVal, setNuevaMarcaVal] = useState('');
  const [categoriasEliminadas, setCategoriasEliminadas] = useState<string[]>([]);
  const [marcasEliminadas, setMarcasEliminadas] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    getProductos()
      .then((list) => {
        if (cancelled) return;
        setCategoriasCatalogo(Array.from(new Set(list.map((p) => p.categoria).filter((c): c is string => Boolean(c)))));
        setMarcasCatalogo(Array.from(new Set(list.map((p) => p.marca).filter((m): m is string => Boolean(m)))));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const opcionesCategoria = useMemo(() => {
    const base = categoriasCatalogo
      .slice()
      .filter((c) => !categoriasEliminadas.includes(c))
      .sort((a, b) => a.localeCompare(b))
      .map((c) => ({ value: c, label: c }));
    const actual = categoria?.trim();
    if (actual && !base.some((o) => o.value === actual) && !categoriasEliminadas.includes(actual)) base.unshift({ value: actual, label: actual });
    return [
      { value: '', label: 'Elige una opción' },
      ...(base.length ? base : actual ? [{ value: actual, label: actual }] : []),
      { value: AGREGAR_CAT, label: '➕ Agregar otra categoría' },
    ];
  }, [categoriasCatalogo, categoria, categoriasEliminadas]);

  const opcionesMarca = useMemo(() => {
    const base = marcasCatalogo
      .slice()
      .filter((m) => !marcasEliminadas.includes(m))
      .sort((a, b) => a.localeCompare(b))
      .map((m) => ({ value: m, label: m }));
    const actual = marca?.trim();
    if (actual && !base.some((o) => o.value === actual) && !marcasEliminadas.includes(actual)) base.unshift({ value: actual, label: actual });
    return [
      { value: '', label: 'Elige una opción' },
      { value: '__sin_marca__', label: 'Sin marca' },
      ...(base.length ? base : actual ? [{ value: actual, label: actual }] : []),
      { value: AGREGAR_MARCA, label: '➕ Agregar otra marca' },
    ];
  }, [marcasCatalogo, marca, marcasEliminadas]);

  const confirmarNuevaCategoria = () => {
    const v = nuevaCategoriaVal.trim();
    if (v) {
      setCategoriasCatalogo((prev) => (prev.includes(v) ? prev : [...prev, v].sort((a, b) => a.localeCompare(b))));
      setCategoria(v);
    }
    setShowAgregarCategoria(false);
    setNuevaCategoriaVal('');
  };

  const confirmarNuevaMarca = () => {
    const v = nuevaMarcaVal.trim();
    if (v) {
      setMarcasCatalogo((prev) => (prev.includes(v) ? prev : [...prev, v].sort((a, b) => a.localeCompare(b))));
      setMarca(v);
    }
    setShowAgregarMarca(false);
    setNuevaMarcaVal('');
  };

  const eliminarCategoriaActual = () => {
    if (categoria?.trim()) {
      setCategoriasEliminadas((prev) => (prev.includes(categoria.trim()) ? prev : [...prev, categoria.trim()]));
      setCategoria('');
    }
  };

  const eliminarMarcaActual = () => {
    if (marca?.trim()) {
      setMarcasEliminadas((prev) => (prev.includes(marca.trim()) ? prev : [...prev, marca.trim()]));
      setMarca('');
    }
  };

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
        presentaciones: serializarPresentacionesProducto([
          {
            tamanio: 'Único',
            precio: '0',
            precioOriginal: '0',
            stock: 0,
            disponible,
            imagenes: imagenesPresentacion,
          },
        ]),
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
        <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
          Nuevo producto
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--encabezados-alterno)' }}>
          Completa los datos del producto. Los campos con * son obligatorios.
        </p>

        {error && (
          <Card className="mb-6 border-l-4" padding="md" style={{ borderLeftColor: 'var(--danger)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>{error}</p>
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
            <div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Select
                    label="Categoría *"
                    options={opcionesCategoria}
                    value={showAgregarCategoria ? AGREGAR_CAT : categoria}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === AGREGAR_CAT) setShowAgregarCategoria(true);
                      else setCategoria(v);
                    }}
                    fullWidth
                  />
                </div>
                {categoria?.trim() && (
                  <Button type="button" size="sm" variant="outline" onClick={eliminarCategoriaActual} title="Eliminar esta categoría del listado">
                    Eliminar
                  </Button>
                )}
              </div>
              {showAgregarCategoria && (
                <div className="mt-2 flex gap-2 items-center">
                  <Input
                    placeholder="Nueva categoría"
                    value={nuevaCategoriaVal}
                    onChange={(e) => setNuevaCategoriaVal(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmarNuevaCategoria()}
                    fullWidth
                    className="flex-1"
                  />
                  <Button size="sm" onClick={confirmarNuevaCategoria}>Agregar</Button>
                  <Button size="sm" variant="outline" onClick={() => { setShowAgregarCategoria(false); setNuevaCategoriaVal(''); }}>Cancelar</Button>
                </div>
              )}
            </div>
            <div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Select
                    label="Marca"
                    options={opcionesMarca}
                    value={showAgregarMarca ? AGREGAR_MARCA : (marca || '__sin_marca__')}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === AGREGAR_MARCA) setShowAgregarMarca(true);
                      else setMarca(v === '__sin_marca__' ? '' : v);
                    }}
                    fullWidth
                  />
                </div>
                {marca?.trim() && (
                  <Button type="button" size="sm" variant="outline" onClick={eliminarMarcaActual} title="Eliminar esta marca del listado">
                    Eliminar
                  </Button>
                )}
              </div>
              {showAgregarMarca && (
                <div className="mt-2 flex gap-2 items-center">
                  <Input
                    placeholder="Nueva marca"
                    value={nuevaMarcaVal}
                    onChange={(e) => setNuevaMarcaVal(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmarNuevaMarca()}
                    fullWidth
                    className="flex-1"
                  />
                  <Button size="sm" onClick={confirmarNuevaMarca}>Agregar</Button>
                  <Button size="sm" variant="outline" onClick={() => { setShowAgregarMarca(false); setNuevaMarcaVal(''); }}>Cancelar</Button>
                </div>
              )}
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={disponible}
                  onChange={(e) => setDisponible(e.target.checked)}
                  className="rounded"
                />
                <span style={{ color: 'var(--menu-texto-principal)' }}>Disponible en tienda</span>
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
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
              Imágenes de la presentación inicial (Cloudinary → producto_presentaciones)
            </label>
            <EditorImagenesPresentacionCloudinary
              urls={imagenesPresentacion}
              onChange={setImagenesPresentacion}
              disabled={saving}
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
