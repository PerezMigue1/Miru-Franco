'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Textarea from '../../../../components/ui/Textarea';
import {
  createProducto,
  getProductos,
  serializarPresentacionesProducto,
  type ProductoPayload,
} from '../../../../services/productos';
import { EditorImagenesPresentacionCloudinary } from '../../../../components/admin/EditorImagenesPresentacionCloudinary';
import { parseCategoriaSub } from '../../../../utils/inventarioInteligente';

const AGREGAR_CAT = '__agregar_cat__';
const AGREGAR_MARCA = '__agregar_marca__';

export default function NuevoProductoAdminPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [descripcionLarga, setDescripcionLarga] = useState('');
  const [categoria, setCategoria] = useState('');
  const [marca, setMarca] = useState('');
  const [descuento, setDescuento] = useState('0');
  const [nuevo, setNuevo] = useState(false);
  const [crueltyFree, setCrueltyFree] = useState(false);
  const [caracteristicas, setCaracteristicas] = useState('');
  const [ingredientes, setIngredientes] = useState('');
  const [modoUso, setModoUso] = useState('');
  const [resultado, setResultado] = useState('');
  const [disponible, setDisponible] = useState(true);
  const [imagenesPresentacion, setImagenesPresentacion] = useState<string[]>([]);
  // Presentación inicial
  const [presTamanio, setPresTamanio] = useState('Único');
  const [presPrecio, setPresPrecio] = useState('');
  const [presPrecioOrig, setPresPrecioOrig] = useState('');
  const [presStock, setPresStock] = useState('0');
  const [presFechaCaducidad, setPresFechaCaducidad] = useState('');
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
        const principals = new Set<string>();
        for (const p of list) {
          const { categoriaPrincipal } = parseCategoriaSub(String(p.categoria || ''));
          if (categoriaPrincipal && categoriaPrincipal !== 'Sin categoría') {
            principals.add(categoriaPrincipal);
          }
        }
        setCategoriasCatalogo([...principals].sort((a, b) => a.localeCompare(b)));
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
      { value: AGREGAR_CAT, label: '+ Agregar otra categoría' },
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
      { value: AGREGAR_MARCA, label: '+ Agregar otra marca' },
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
        descripcionLarga: descripcionLarga.trim() || undefined,
        categoria: categoria.trim(),
        marca: marca.trim() || undefined,
        descuento: parseFloat(descuento) || 0,
        nuevo,
        crueltyFree,
        caracteristicas: caracteristicas.trim() ? caracteristicas.split(',').map((s) => s.trim()).filter(Boolean) : [],
        ingredientes: ingredientes.trim() || undefined,
        modoUso: modoUso.trim() || undefined,
        resultado: resultado.trim() || undefined,
        presentaciones: serializarPresentacionesProducto([
          {
            tamanio: presTamanio.trim() || 'Único',
            precio: presPrecio || '0',
            precioOriginal: presPrecioOrig || undefined,
            stock: parseInt(presStock, 10) || 0,
            disponible,
            fechaCaducidad: presFechaCaducidad || undefined,
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
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              Nuevo Producto
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              Completa los datos del producto. Los campos con * son obligatorios.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/admin/inventario')} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleCrear} disabled={saving}>
              {saving ? 'Creando...' : 'Crear producto'}
            </Button>
          </div>
        </div>

        {error && (
          <Card className="border-l-4" padding="md" style={{ borderLeftColor: 'var(--danger)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--danger-texto)' }}>{error}</p>
          </Card>
        )}

        <Card variant="elevated" padding="lg">
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
                      else {
                        setCategoria(v);
                      }
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
            <Textarea
              label="Descripción larga"
              value={descripcionLarga}
              onChange={(e) => setDescripcionLarga(e.target.value)}
              placeholder="Descripción detallada del producto..."
              rows={4}
              fullWidth
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Input
              label="Descuento (%)"
              type="number"
              value={descuento}
              onChange={(e) => setDescuento(e.target.value)}
              placeholder="0"
              fullWidth
            />
            <Input
              label="Características (separadas por coma)"
              value={caracteristicas}
              onChange={(e) => setCaracteristicas(e.target.value)}
              placeholder="Hidratante, Sin sulfatos, Para cabello seco..."
              fullWidth
            />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={nuevo} onChange={(e) => setNuevo(e.target.checked)} className="rounded" />
                <span style={{ color: 'var(--menu-texto-principal)' }}>Marcar como nuevo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={crueltyFree} onChange={(e) => setCrueltyFree(e.target.checked)} className="rounded" />
                <span style={{ color: 'var(--menu-texto-principal)' }}>Cruelty Free</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Textarea label="Ingredientes" value={ingredientes} onChange={(e) => setIngredientes(e.target.value)} placeholder="Lista de ingredientes..." rows={3} fullWidth />
            <Textarea label="Modo de uso" value={modoUso} onChange={(e) => setModoUso(e.target.value)} placeholder="Cómo aplicar el producto..." rows={3} fullWidth />
            <div className="md:col-span-2">
              <Textarea label="Resultado esperado" value={resultado} onChange={(e) => setResultado(e.target.value)} placeholder="Resultado tras el uso del producto..." rows={2} fullWidth />
            </div>
          </div>
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--menu-texto-principal)' }}>
              Presentación inicial
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Tamaño / presentación *" value={presTamanio} onChange={(e) => setPresTamanio(e.target.value)} placeholder="Ej. 500ml, 1L..." fullWidth />
              <Input label="Precio *" type="number" step={0.01} min={0} value={presPrecio} onChange={(e) => setPresPrecio(e.target.value)} placeholder="0.00" fullWidth />
              <Input label="Precio original (tachado)" type="number" step={0.01} min={0} value={presPrecioOrig} onChange={(e) => setPresPrecioOrig(e.target.value)} placeholder="0.00" fullWidth />
              <Input label="Stock inicial" type="number" step={1} min={0} value={presStock} onChange={(e) => setPresStock(e.target.value)} placeholder="0" fullWidth />
              <Input label="Fecha de caducidad" type="date" value={presFechaCaducidad} onChange={(e) => setPresFechaCaducidad(e.target.value)} fullWidth />
            </div>
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
        </Card>
      </div>
    </AdminLayout>
  );
}
