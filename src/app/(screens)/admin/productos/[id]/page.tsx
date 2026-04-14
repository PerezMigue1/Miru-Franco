'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import { getCategoryColor, getDescuentoColor } from '../../../../utils/categoryColors';
import {
  getProductos,
  getProductoPorId,
  updateProducto,
  deleteProducto,
  serializarPresentacionesProducto,
  type Producto,
  type ProductoPayload,
} from '../../../../services/productos';
import Modal from '../../../../components/ui/Modal';
import { EditorImagenesPresentacionCloudinary } from '../../../../components/admin/EditorImagenesPresentacionCloudinary';
import { normalizarUrlImagenExterna } from '../../../../utils/normalizarUrlImagen';
import { MIRU_CATALOG_STOCK_CHANGED } from '../../../../utils/catalogStockSync';
import { AlertTriangle, Check, X } from 'lucide-react';

function calcularPrecioDesdeDescuento(precioOriginal: number, descuento: number): string {
  if (!precioOriginal || !descuento) return `$${precioOriginal || 0}`;
  const final = Math.round(precioOriginal * (1 - descuento / 100));
  return `$${final}`;
}

function parseNumero(str: string | undefined): number {
  if (!str) return 0;
  return parseFloat(str.replace(/[^0-9.]/g, '')) || 0;
}

function limpiarTexto(value: string | undefined): string {
  return String(value ?? '').replace(/\u0000/g, '');
}

type FilaPresentacion = {
  presentacionId?: number;
  tamanio: string;
  precioOriginal: string;
  precio: string;
  stock: string;
  disponible: boolean;
  fechaCaducidad: string;
  /** URLs Cloudinary (solo vía subida en admin). */
  imagenes: string[];
};

/** Forma estable para comparar y para armar el payload de cada presentación. */
function presentacionNormalizada(pr: FilaPresentacion) {
  const stockNum = parseInt(pr.stock || '0', 10);
  const disp = pr.disponible && stockNum > 0;
  const fc = pr.fechaCaducidad?.trim();
  const precioStr = String(pr.precio ?? '').replace(/[^0-9.]/g, '') || '0';
  const precioOrigStr = String(pr.precioOriginal ?? '').replace(/[^0-9.]/g, '') || '0';
  return {
    id: pr.presentacionId,
    tamanio: limpiarTexto(pr.tamanio),
    precio: precioStr,
    precioOriginal: precioOrigStr || undefined,
    stock: pr.disponible ? stockNum : 0,
    disponible: disp,
    fechaCaducidad: fc || undefined,
    imagenes: pr.imagenes.map((u) => limpiarTexto(u).trim()).filter(Boolean),
  };
}

export default function ProductoDetalleAdminPage() {
  const params = useParams();
  const id = params.id as string;

  const [producto, setProducto] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [descripcionLarga, setDescripcionLarga] = useState('');
  const [categoria, setCategoria] = useState('');
  const [marca, setMarca] = useState('');
  const [descuentoStr, setDescuentoStr] = useState('0');
  const [disponible, setDisponible] = useState(true);
  const [nuevo, setNuevo] = useState(false);
  const [crueltyFree, setCrueltyFree] = useState(false);
  const [caracteristicasText, setCaracteristicasText] = useState('');
  const [ingredientes, setIngredientes] = useState('');
  const [modoUso, setModoUso] = useState('');
  const [resultado, setResultado] = useState('');
  const [categoriasCatalogo, setCategoriasCatalogo] = useState<string[]>([]);
  const [marcasCatalogo, setMarcasCatalogo] = useState<string[]>([]);
  const [showAgregarCategoria, setShowAgregarCategoria] = useState(false);
  const [showAgregarMarca, setShowAgregarMarca] = useState(false);
  const [nuevaCategoriaVal, setNuevaCategoriaVal] = useState('');
  const [nuevaMarcaVal, setNuevaMarcaVal] = useState('');
  const [categoriasEliminadas, setCategoriasEliminadas] = useState<string[]>([]);
  const [marcasEliminadas, setMarcasEliminadas] = useState<string[]>([]);
  const [presentaciones, setPresentaciones] = useState<FilaPresentacion[]>([]);
  const initialSnapshotRef = useRef<string>('');

  const buildSnapshot = (nextPresentaciones?: FilaPresentacion[]) =>
    JSON.stringify({
      nombre: limpiarTexto(nombre),
      descripcion: limpiarTexto(descripcion),
      descripcionLarga: limpiarTexto(descripcionLarga),
      categoria: limpiarTexto(categoria),
      marca: limpiarTexto(marca),
      descuentoStr: String(descuentoStr ?? ''),
      disponible: Boolean(disponible),
      nuevo: Boolean(nuevo),
      crueltyFree: Boolean(crueltyFree),
      caracteristicasText: limpiarTexto(caracteristicasText),
      ingredientes: limpiarTexto(ingredientes),
      modoUso: limpiarTexto(modoUso),
      resultado: limpiarTexto(resultado),
      presentaciones: (nextPresentaciones ?? presentaciones).map((pr) => ({
        presentacionId: pr.presentacionId,
        tamanio: limpiarTexto(pr.tamanio),
        precioOriginal: String(pr.precioOriginal ?? ''),
        precio: String(pr.precio ?? ''),
        stock: String(pr.stock ?? ''),
        disponible: Boolean(pr.disponible),
        fechaCaducidad: String(pr.fechaCaducidad ?? ''),
        imagenes: [...pr.imagenes],
      })),
    });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getProductoPorId(id)
      .then((p) => {
        if (!cancelled && p) {
          setProducto(p);
          setNombre(p.nombre);
          setDescripcion(p.descripcion ?? '');
          setDescripcionLarga(p.descripcionLarga ?? '');
          setCategoria(p.categoria ?? '');
          setMarca(p.marca ?? '');
          setNuevo(p.nuevo ?? false);
          setCrueltyFree(p.crueltyFree ?? false);
          setCaracteristicasText((p.caracteristicas ?? []).join('\n'));
          setIngredientes(p.ingredientes ?? '');
          setModoUso(p.modoUso ?? '');
          setResultado(p.resultado ?? '');
          setDescuentoStr(String(p.descuento ?? 0));
          setDisponible(p.stock);
          const mappedPresentaciones: FilaPresentacion[] = (p.presentaciones ?? []).map((pr) => {
              const base = parseNumero(pr.precioOriginal ?? pr.precio);
              const precioConDescuento = calcularPrecioDesdeDescuento(base, p.descuento ?? 0);
              const fc = pr.fechaCaducidad;
              let fechaCaducidad = '';
              if (fc && typeof fc === 'string') {
                const m = fc.match(/^(\d{4}-\d{2}-\d{2})/);
                fechaCaducidad = m ? m[1] : new Date(fc + 'T12:00:00').toISOString().slice(0, 10);
              }
              const urls = (pr.imagenes?.length
                ? pr.imagenes
                : pr.imagen
                  ? [pr.imagen]
                  : []
              )
                .map((u) => normalizarUrlImagenExterna(u))
                .filter(Boolean);
              return {
                presentacionId: pr.id,
                tamanio: pr.tamaño,
                precioOriginal: String(base || '0'),
                precio: String(parseNumero(precioConDescuento)),
                stock: String(pr.stock ?? 0),
                disponible: pr.disponible ?? true,
                fechaCaducidad,
                imagenes: urls,
              };
            });
          setPresentaciones(mappedPresentaciones);
          initialSnapshotRef.current = JSON.stringify({
            nombre: limpiarTexto(p.nombre),
            descripcion: limpiarTexto(p.descripcion ?? ''),
            descripcionLarga: limpiarTexto(p.descripcionLarga ?? ''),
            categoria: limpiarTexto(p.categoria ?? ''),
            marca: limpiarTexto(p.marca ?? ''),
            descuentoStr: String(p.descuento ?? 0),
            disponible: Boolean(p.stock),
            nuevo: Boolean(p.nuevo ?? false),
            crueltyFree: Boolean(p.crueltyFree ?? false),
            caracteristicasText: limpiarTexto((p.caracteristicas ?? []).join('\n')),
            ingredientes: limpiarTexto(p.ingredientes ?? ''),
            modoUso: limpiarTexto(p.modoUso ?? ''),
            resultado: limpiarTexto(p.resultado ?? ''),
            presentaciones: mappedPresentaciones.map((pr) => ({
              presentacionId: pr.presentacionId,
              tamanio: limpiarTexto(pr.tamanio),
              precioOriginal: String(pr.precioOriginal ?? ''),
              precio: String(pr.precio ?? ''),
              stock: String(pr.stock ?? ''),
              disponible: Boolean(pr.disponible),
              fechaCaducidad: String(pr.fechaCaducidad ?? ''),
              imagenes: [...pr.imagenes],
            })),
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al cargar el producto');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  /** Pedidos / estados pueden mover stock en servidor; sincronizar solo filas de inventario sin borrar el resto del formulario. */
  useEffect(() => {
    let seq = 0;
    const onStock = () => {
      const my = ++seq;
      getProductoPorId(id)
        .then((p) => {
          if (my !== seq || !p) return;
          setProducto((prev) => (prev ? { ...prev, stock: p.stock, presentaciones: p.presentaciones } : p));
          setDisponible(p.stock);
          setPresentaciones((prev) =>
            prev.map((row) => {
              const pr = (p.presentaciones ?? []).find(
                (x) => x.id === row.presentacionId || x.tamaño === row.tamanio
              );
              if (!pr) return row;
              return {
                ...row,
                stock: String(pr.stock ?? 0),
                disponible: pr.disponible ?? true,
              };
            })
          );
        })
        .catch(() => {
          /* mantener formulario actual */
        });
    };
    window.addEventListener(MIRU_CATALOG_STOCK_CHANGED, onStock);
    return () => {
      seq += 1;
      window.removeEventListener(MIRU_CATALOG_STOCK_CHANGED, onStock);
    };
  }, [id]);

  // Catálogo para selects (categorías y marcas): se carga una vez
  useEffect(() => {
    let cancelled = false;
    getProductos()
      .then((list) => {
        if (cancelled) return;
        const categorias = Array.from(new Set(list.map((p) => p.categoria).filter(Boolean)));
        const marcas = Array.from(new Set(list.map((p) => p.marca).filter(Boolean))) as string[];
        setCategoriasCatalogo(categorias);
        setMarcasCatalogo(marcas);
      })
      .catch(() => {
        // Si falla, se mantienen arrays vacíos; el select mostrará al menos el valor actual.
        setCategoriasCatalogo([]);
        setMarcasCatalogo([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const AGREGAR_CAT = '__agregar_cat__';
  const AGREGAR_MARCA = '__agregar_marca__';

  const opcionesCategoria = useMemo(() => {
    const base = categoriasCatalogo
      .slice()
      .filter((c) => !categoriasEliminadas.includes(c))
      .sort((a, b) => a.localeCompare(b))
      .map((c) => ({ value: c, label: c }));
    const actual = categoria?.trim();
    if (actual && !base.some((o) => o.value === actual) && !categoriasEliminadas.includes(actual)) {
      base.unshift({ value: actual, label: actual });
    }
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
    if (actual && !base.some((o) => o.value === actual) && !marcasEliminadas.includes(actual)) {
      base.unshift({ value: actual, label: actual });
    }
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

  // Cuando cambia el descuento global, recalcular precios de cada presentación
  useEffect(() => {
    const descuentoNum = parseFloat(descuentoStr) || 0;
    setPresentaciones((prev) =>
      prev.map((pr) => {
        const base = parseFloat(pr.precioOriginal) || 0;
        const nuevo = calcularPrecioDesdeDescuento(base, descuentoNum);
        return { ...pr, precio: String(parseNumero(nuevo)) };
      })
    );
  }, [descuentoStr]);

  const agregarPresentacion = () => {
    const descuentoNum = parseFloat(descuentoStr) || 0;
    const base = 0;
    const precioInicial = calcularPrecioDesdeDescuento(base, descuentoNum);
    setPresentaciones((prev) => [
      ...prev,
      {
        presentacionId: undefined,
        tamanio: '',
        precioOriginal: '0',
        precio: String(parseNumero(precioInicial)),
        stock: '0',
        disponible: true,
        fechaCaducidad: '',
        imagenes: [],
      },
    ]);
  };

  const eliminarPresentacion = (index: number) => {
    setPresentaciones((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGuardar = async () => {
    if (!producto) return;
    const currentSnapshot = buildSnapshot();
    if (initialSnapshotRef.current && initialSnapshotRef.current === currentSnapshot) {
      setError(null);
      setSuccessMessage('No hay cambios por guardar.');
      setTimeout(() => setSuccessMessage(null), 2500);
      return;
    }
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const descuentoNum = parseFloat(descuentoStr) || 0;
      const presentacionesNorm = presentaciones.map(presentacionNormalizada);
      // Cuerpo completo: muchos backends (Nest + ValidationPipe) fallan con PUT parcial
      // (solo presentaciones) y devuelven "revisa los campos del formulario".
      // No enviar `disponible` en la raíz: el DTO del API no lo incluye (sale de presentaciones).
      const payload: ProductoPayload = {
        nombre: limpiarTexto(nombre),
        descripcion: limpiarTexto(descripcion),
        descripcionLarga: limpiarTexto(descripcionLarga).trim() || undefined,
        categoria: limpiarTexto(categoria),
        marca: limpiarTexto(marca).trim() || undefined,
        descuento: descuentoNum,
        nuevo,
        crueltyFree,
        caracteristicas: caracteristicasText
          .split('\n')
          .map((l) => limpiarTexto(l).trim())
          .filter(Boolean),
        ingredientes: limpiarTexto(ingredientes).trim() || undefined,
        modoUso: limpiarTexto(modoUso).trim() || undefined,
        resultado: limpiarTexto(resultado).trim() || undefined,
        presentaciones: serializarPresentacionesProducto(presentacionesNorm),
      };

      const actualizado = await updateProducto(producto.id, payload);
      setProducto(actualizado);
      setSuccessMessage('Producto actualizado correctamente.');
      initialSnapshotRef.current = currentSnapshot;
    } catch (err) {
      const e = err as Error & { data?: unknown };
      let msg = e instanceof Error ? e.message : 'Error al guardar los cambios';
      if (/revisa los campos/i.test(msg) && e.data != null && typeof e.data === 'object') {
        try {
          const raw = JSON.stringify(e.data);
          if (raw && raw !== '{}' && raw.length < 4000) msg = `${msg}\n\n${raw}`;
        } catch {
          /* ignore */
        }
      }
      setError(msg);
    } finally {
      setSaving(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const handleEliminar = async () => {
    if (!producto) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteProducto(producto.id);
      window.location.href = '/admin/inventario';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el producto');
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="layout-page py-12" >
          <p className="text-lead" style={{ color: 'var(--encabezados-alterno)' }}>
            Cargando producto...
          </p>
        </div>
      </AdminLayout>
    );
  }

  if (error || !producto) {
    return (
      <AdminLayout>
        <div className="layout-page py-12" >
          <p className="text-lead mb-4" style={{ color: 'var(--danger)' }}>
            {error ?? 'Producto no encontrado'}
          </p>
        </div>
      </AdminLayout>
    );
  }

  const descuentoNum = parseFloat(descuentoStr) || 0;

  return (
    <AdminLayout>
      <div className="layout-page py-12" >
        <div className="w-full max-w-none">
          <div className="flex flex-wrap items-center justify-end gap-4 mb-6">
            <div className="flex items-center gap-3">
              {successMessage && (
                <span className="text-sm font-medium" style={{ color: 'var(--success)' }}>{successMessage}</span>
              )}
              <Button variant="primary" onClick={handleGuardar} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
              <Button variant="danger" onClick={() => setShowDeleteModal(true)} disabled={deleting}>
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <div className="mb-6">
                  <h1 className="text-hero mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                    {nombre}
                  </h1>
                  <Badge variant={getCategoryColor(producto.categoria)} size="lg">
                    {producto.categoria}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                    <p className="text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Stock total</p>
                    <p className="text-xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                      {presentaciones.reduce((s, pr) => s + (parseInt(pr.stock || '0', 10) || 0), 0)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                    <p className="text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Descuento</p>
                    <p className="text-xl font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                      {descuentoNum}%
                    </p>
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                    <p className="text-sm mb-1" style={{ color: 'var(--encabezados-alterno)' }}>Marca</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
                      {marca || 'Sin marca'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    fullWidth
                  />
                  <div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Select
                          label="Categoría"
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
                        <Button size="sm" onClick={confirmarNuevaCategoria}>
                          Agregar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setShowAgregarCategoria(false); setNuevaCategoriaVal(''); }}>
                          Cancelar
                        </Button>
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
                        <Button size="sm" onClick={confirmarNuevaMarca}>
                          Agregar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setShowAgregarMarca(false); setNuevaMarcaVal(''); }}>
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                  <Input
                    label="Descuento (%)"
                    type="number"
                    value={descuentoStr}
                    onChange={(e) => setDescuentoStr(e.target.value)}
                    fullWidth
                  />
                  <Input
                    label="Descripción corta"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    fullWidth
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                    Descripción larga
                  </label>
                  <textarea
                    className="w-full rounded-md border px-3 py-2 text-sm min-h-[100px]"
                    value={descripcionLarga}
                    onChange={(e) => setDescripcionLarga(e.target.value)}
                    placeholder="Descripción detallada del producto..."
                    style={{
                      borderColor: 'var(--tarjetas-paneles)',
                      backgroundColor: 'var(--fondos-suaves)',
                      color: 'var(--menu-texto-principal)',
                    }}
                  />
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-subtitle" style={{ color: 'var(--menu-texto-principal)' }}>
                    Presentaciones (tamaños, precios y stock)
                  </h3>
                  <Button size="sm" variant="outline" onClick={agregarPresentacion}>
                    + Agregar presentación
                  </Button>
                </div>
                {presentaciones.length === 0 ? (
                  <p className="text-sm py-4" style={{ color: 'var(--encabezados-alterno)' }}>
                    No hay presentaciones. Agrega tamaños o variantes (ej. 500ml, 1L) con su precio y stock.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {presentaciones.map((pr, index) => (
                      <div
                        key={index}
                        className="space-y-3 border-b pb-4 mb-4 last:mb-0 last:border-b-0"
                        style={{ borderColor: 'var(--fondos-suaves)' }}
                      >
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                        <div>
                          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                            Tamaño
                          </p>
                          <Input
                            value={pr.tamanio}
                            onChange={(e) => {
                              setPresentaciones((prev) =>
                                prev.map((p, i) => (i === index ? { ...p, tamanio: e.target.value } : p))
                              );
                            }}
                            placeholder="Ej: 500ml"
                            fullWidth
                          />
                        </div>
                        <div>
                          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                            Precio original
                          </p>
                          <Input
                            type="number"
                            value={pr.precioOriginal}
                            onChange={(e) => {
                              const value = e.target.value;
                              setPresentaciones((prev) =>
                                prev.map((p, i) => (i === index ? { ...p, precioOriginal: value } : p))
                              );
                            }}
                            fullWidth
                          />
                        </div>
                        <div>
                          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                            Precio con descuento
                          </p>
                          <Input
                            type="number"
                            value={pr.precio}
                            onChange={(e) => {
                              setPresentaciones((prev) =>
                                prev.map((p, i) => (i === index ? { ...p, precio: e.target.value } : p))
                              );
                            }}
                            fullWidth
                          />
                        </div>
                        <div>
                          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                            Stock
                          </p>
                          <Input
                            type="number"
                            value={pr.stock}
                            onChange={(e) => {
                              setPresentaciones((prev) =>
                                prev.map((p, i) => (i === index ? { ...p, stock: e.target.value } : p))
                              );
                            }}
                            fullWidth
                          />
                        </div>
                        <div>
                          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                            Fecha caducidad
                          </p>
                          <Input
                            type="date"
                            value={pr.fechaCaducidad}
                            onChange={(e) => {
                              setPresentaciones((prev) =>
                                prev.map((p, i) => (i === index ? { ...p, fechaCaducidad: e.target.value } : p))
                              );
                            }}
                            fullWidth
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <Button
                            size="sm"
                            variant={pr.disponible ? 'primary' : 'outline'}
                            onClick={() =>
                              setPresentaciones((prev) =>
                                prev.map((p, i) =>
                                  i === index
                                    ? { ...p, disponible: !p.disponible, stock: p.disponible ? '0' : p.stock }
                                    : p
                                )
                              )
                            }
                          >
                            {pr.disponible ? 'Sí' : 'No'}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => eliminarPresentacion(index)}
                            title="Quitar presentación"
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                          Imágenes (Cloudinary; se guardan en producto_presentaciones)
                        </label>
                        <EditorImagenesPresentacionCloudinary
                          urls={pr.imagenes}
                          onChange={(next) => {
                            setPresentaciones((prev) =>
                              prev.map((p, i) => (i === index ? { ...p, imagenes: next } : p))
                            );
                          }}
                          disabled={saving}
                        />
                      </div>
                    </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <h3 className="text-subtitle mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  Estado del Producto
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span style={{ color: 'var(--encabezados-alterno)' }}>Disponible:</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={disponible}
                        onChange={(e) => setDisponible(e.target.checked)}
                        className="rounded"
                      />
                      <span style={{ color: 'var(--menu-texto-principal)' }}>{disponible ? 'Sí' : 'No'}</span>
                    </label>
                  </div>
                  <div className="flex justify-between items-center">
                    <span style={{ color: 'var(--encabezados-alterno)' }}>Nuevo:</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={nuevo}
                        onChange={(e) => setNuevo(e.target.checked)}
                        className="rounded"
                      />
                      <span style={{ color: 'var(--menu-texto-principal)' }}>{nuevo ? 'Sí' : 'No'}</span>
                    </label>
                  </div>
                  <div className="flex justify-between items-center">
                    <span style={{ color: 'var(--encabezados-alterno)' }}>Cruelty free:</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={crueltyFree}
                        onChange={(e) => setCrueltyFree(e.target.checked)}
                        className="rounded"
                      />
                      <span style={{ color: 'var(--menu-texto-principal)' }}>{crueltyFree ? 'Sí' : 'No'}</span>
                    </label>
                  </div>
                  <div className="flex justify-between pt-2" style={{ borderTop: '1px solid var(--fondos-suaves)' }}>
                    <span style={{ color: 'var(--encabezados-alterno)' }}>Descuento:</span>
                    <Badge variant={getDescuentoColor(descuentoNum)}>
                      {descuentoNum > 0 ? `${descuentoNum}%` : 'Sin descuento'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--encabezados-alterno)' }}>Stock total:</span>
                    <span className="font-semibold" style={{ color: presentaciones.reduce((s, pr) => s + (parseInt(pr.stock || '0', 10) || 0), 0) <= 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {presentaciones.reduce((s, pr) => s + (parseInt(pr.stock || '0', 10) || 0), 0) > 0
                        ? <span className="inline-flex items-center gap-1"><Check size={14} /> OK</span>
                        : <span className="inline-flex items-center gap-1"><AlertTriangle size={14} /> Sin stock</span>}
                    </span>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="text-subtitle mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                  Características (una por línea)
                </h3>
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
                  value={caracteristicasText}
                  onChange={(e) => setCaracteristicasText(e.target.value)}
                  placeholder={'Ej: Sin parabenos\nVegano\n...'}
                  style={{
                    borderColor: 'var(--tarjetas-paneles)',
                    backgroundColor: 'var(--fondos-suaves)',
                    color: 'var(--menu-texto-principal)',
                  }}
                />
                <h3 className="text-subtitle mt-4 mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                  Ingredientes
                </h3>
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
                  value={ingredientes}
                  onChange={(e) => setIngredientes(e.target.value)}
                  placeholder="Lista o descripción de ingredientes..."
                  style={{
                    borderColor: 'var(--tarjetas-paneles)',
                    backgroundColor: 'var(--fondos-suaves)',
                    color: 'var(--menu-texto-principal)',
                  }}
                />
                <h3 className="text-subtitle mt-4 mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                  Modo de uso
                </h3>
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
                  value={modoUso}
                  onChange={(e) => setModoUso(e.target.value)}
                  placeholder="Instrucciones de uso del producto..."
                  style={{
                    borderColor: 'var(--tarjetas-paneles)',
                    backgroundColor: 'var(--fondos-suaves)',
                    color: 'var(--menu-texto-principal)',
                  }}
                />
                <h3 className="text-subtitle mt-4 mb-2" style={{ color: 'var(--menu-texto-principal)' }}>
                  Resultado
                </h3>
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
                  value={resultado}
                  onChange={(e) => setResultado(e.target.value)}
                  placeholder="Resultado o beneficios esperados..."
                  style={{
                    borderColor: 'var(--tarjetas-paneles)',
                    backgroundColor: 'var(--fondos-suaves)',
                    color: 'var(--menu-texto-principal)',
                  }}
                />
              </Card>

            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => !deleting && setShowDeleteModal(false)}
        title="Eliminar producto"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleEliminar} disabled={deleting}>
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </>
        }
      >
        <p style={{ color: 'var(--menu-texto-principal)' }}>
          ¿Estás seguro de que deseas eliminar el producto &quot;{producto?.nombre}&quot;? Esta acción puede deshabilitarlo en el catálogo.
        </p>
      </Modal>
    </AdminLayout>
  );
}

