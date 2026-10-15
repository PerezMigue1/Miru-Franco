'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Textarea from '../../../../components/ui/Textarea';
import { getCategoryColor, getDescuentoColor } from '../../../../utils/categoryColors';
import {
  getProductos,
  getProductoPorId,
  updateProducto,
  deleteProducto,
  reactivarProducto,
  serializarPresentacionesProducto,
  type Producto,
  type ProductoPayload,
} from '../../../../services/productos';
import Modal from '../../../../components/ui/Modal';
import { EditorImagenesPresentacionCloudinary } from '../../../../components/admin/EditorImagenesPresentacionCloudinary';
import { normalizarUrlImagenExterna } from '../../../../utils/normalizarUrlImagen';
import { MIRU_CATALOG_STOCK_CHANGED } from '../../../../utils/catalogStockSync';
import { parseCategoriaSub } from '../../../../utils/inventarioInteligente';
import { AlertTriangle, Check, X } from 'lucide-react';
import { preciosFilaDesdePresentacion, recalcularPreciosPorDescuento } from '../precioDescuento';
import { estadoProductoAdmin } from '../estadoProducto';
import { textoDesdeArregloPostgres } from '../textoProducto';

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
  /** Error al cargar el producto: reemplaza la pantalla. */
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  /** Error al guardar o eliminar: se muestra encima del formulario sin perder lo editado. */
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reactivando, setReactivando] = useState(false);

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
    setErrorCarga(null);
    getProductoPorId(id)
      .then((p) => {
        if (!cancelled && p) {
          const parsedCat = parseCategoriaSub(p.categoria ?? '');
          const catPrincipal =
            parsedCat.categoriaPrincipal === 'Sin categoría' ? '' : parsedCat.categoriaPrincipal;
          setProducto(p);
          setNombre(p.nombre);
          setDescripcion(p.descripcion ?? '');
          setDescripcionLarga(p.descripcionLarga ?? '');
          setCategoria(catPrincipal);
          setMarca(p.marca ?? '');
          setNuevo(p.nuevo ?? false);
          setCrueltyFree(p.crueltyFree ?? false);
          setCaracteristicasText((p.caracteristicas ?? []).join('\n'));
          // Algunos llegan como arreglo de Postgres ('{"…"}'): se muestran como texto, uno por línea.
          const ingredientesTexto = textoDesdeArregloPostgres(p.ingredientes);
          const modoUsoTexto = textoDesdeArregloPostgres(p.modoUso);
          const resultadoTexto = textoDesdeArregloPostgres(p.resultado);
          setIngredientes(ingredientesTexto);
          setModoUso(modoUsoTexto);
          setResultado(resultadoTexto);
          setDescuentoStr(String(p.descuento ?? 0));
          setDisponible(p.stock);
          const mappedPresentaciones: FilaPresentacion[] = (p.presentaciones ?? []).map((pr) => {
              // Precio guardado tal cual: no se recalcula desde `descuento` al cargar.
              const precios = preciosFilaDesdePresentacion(pr);
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
                precioOriginal: precios.precioOriginal,
                precio: precios.precio,
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
            categoria: limpiarTexto(catPrincipal),
            marca: limpiarTexto(p.marca ?? ''),
            descuentoStr: String(p.descuento ?? 0),
            disponible: Boolean(p.stock),
            nuevo: Boolean(p.nuevo ?? false),
            crueltyFree: Boolean(p.crueltyFree ?? false),
            caracteristicasText: limpiarTexto((p.caracteristicas ?? []).join('\n')),
            ingredientes: limpiarTexto(ingredientesTexto),
            modoUso: limpiarTexto(modoUsoTexto),
            resultado: limpiarTexto(resultadoTexto),
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
          setErrorCarga(err instanceof Error ? err.message : 'Error al cargar el producto');
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
        const principals = new Set<string>();
        for (const pr of list) {
          const { categoriaPrincipal } = parseCategoriaSub(String(pr.categoria || ''));
          if (categoriaPrincipal && categoriaPrincipal !== 'Sin categoría') {
            principals.add(categoriaPrincipal);
          }
        }
        const categorias = [...principals].sort((a, b) => a.localeCompare(b));
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

  // Solo cuando la persona edita el descuento se recalculan los precios de cada presentación
  // (al cargar se respeta el precio guardado).
  const cambiarDescuento = (valor: string) => {
    setDescuentoStr(valor);
    setPresentaciones((prev) => recalcularPreciosPorDescuento(prev, valor));
  };

  const agregarPresentacion = () => {
    setPresentaciones((prev) => [
      ...prev,
      {
        presentacionId: undefined,
        tamanio: '',
        precioOriginal: '0',
        precio: '0',
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
    if (!limpiarTexto(marca).trim()) {
      setSuccessMessage(null);
      setError('Elige una marca.');
      return;
    }
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
      const postCat = parseCategoriaSub(actualizado.categoria ?? '');
      setCategoria(postCat.categoriaPrincipal === 'Sin categoría' ? '' : postCat.categoriaPrincipal);
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

  // Borrado lógico: el producto queda inactivo (no se borra) y se puede reactivar aquí mismo.
  const handleDesactivar = async () => {
    if (!producto) return;
    setDeleting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await deleteProducto(producto.id);
      setProducto((prev) => (prev ? { ...prev, activo: false } : prev));
      setShowDeleteModal(false);
      setSuccessMessage('Producto desactivado.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo desactivar el producto');
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleReactivar = async () => {
    if (!producto) return;
    setReactivando(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const actualizado = await reactivarProducto(producto.id);
      setProducto((prev) => (prev ? { ...prev, activo: actualizado.activo } : prev));
      setSuccessMessage('Producto reactivado.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reactivar el producto');
    } finally {
      setReactivando(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="w-full max-w-none py-12">
          <p className="text-lead" style={{ color: 'var(--encabezados-alterno)' }}>
            Cargando producto...
          </p>
        </div>
      </AdminLayout>
    );
  }

  if (errorCarga || !producto) {
    return (
      <AdminLayout>
        <div className="w-full max-w-none py-12">
          <p className="text-lead mb-4" style={{ color: 'var(--danger-texto)' }}>
            {errorCarga ?? 'Producto no encontrado'}
          </p>
        </div>
      </AdminLayout>
    );
  }

  const descuentoNum = parseFloat(descuentoStr) || 0;
  const estadoAdmin = estadoProductoAdmin(producto.activo);

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
              {nombre || 'Producto'}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
              Editar producto
            </p>
          </div>
          {/* Un solo botón principal: Reactivar va de contorno y Desactivar de contorno con texto de peligro. */}
          <div className="flex flex-wrap items-center gap-3">
            {successMessage && (
              <span className="text-sm font-medium" role="status" style={{ color: 'var(--success-texto)' }}>{successMessage}</span>
            )}
            <Button variant="primary" onClick={handleGuardar} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
            {producto.activo === false ? (
              <Button variant="outline" onClick={handleReactivar} disabled={reactivando}>
                {reactivando ? 'Reactivando...' : estadoAdmin.accion}
              </Button>
            ) : (
              <Button variant="outline-danger" onClick={() => setShowDeleteModal(true)} disabled={deleting}>
                {deleting ? 'Desactivando...' : estadoAdmin.accion}
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Card padding="md" role="alert" style={{ backgroundColor: 'color-mix(in srgb, var(--danger) 10%, var(--badge-base))', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--danger-texto) 35%, transparent)' }}>
            <p className="text-sm font-medium whitespace-pre-line" style={{ color: 'var(--danger-texto)' }}>{error}</p>
          </Card>
        )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card variant="elevated" padding="lg">
                <div className="mb-6">
                  <Badge variant={getCategoryColor(limpiarTexto(categoria))} size="lg">
                    {limpiarTexto(categoria) || '—'}
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
                          value={showAgregarMarca ? AGREGAR_MARCA : marca}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === AGREGAR_MARCA) setShowAgregarMarca(true);
                            else setMarca(v);
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
                    min={0}
                    max={100}
                    value={descuentoStr}
                    onChange={(e) => cambiarDescuento(e.target.value)}
                    fullWidth
                  />
                  <Input
                    label="Descripción corta"
                    maxLength={1000}
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    fullWidth
                  />
                </div>
                <div className="mt-4">
                  <Textarea
                    label="Descripción larga"
                    value={descripcionLarga}
                    onChange={(e) => setDescripcionLarga(e.target.value)}
                    placeholder="Descripción detallada del producto..."
                    rows={4}
                    fullWidth
                  />
                </div>
              </Card>

              <Card variant="elevated" padding="lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
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
                      {/* Tres por fila desde 1024 px: en 6 columnas "Fecha caducidad" quedaba cortada a 1440. */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
                        <div>
                          <Input
                            label="Tamaño"
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
                          <Input
                            label="Precio original"
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
                          <Input
                            label="Precio con descuento"
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
                          <Input
                            label="Stock"
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
                          <Input
                            label="Fecha caducidad"
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
                        {/* Disponible con etiqueta visible y "Quitar" con texto (antes Sí/No sin etiqueta y una X con solo title). */}
                        <div className="flex flex-wrap items-end gap-2">
                          <div>
                            <span className="mf-etiqueta" id={`disponible-${index}`}>Disponible</span>
                            <Button
                              variant={pr.disponible ? 'primary' : 'outline'}
                              className="min-w-16"
                              id={`disponible-boton-${index}`}
                              // Nombre "Disponible Sí" o "Disponible No": incluye el texto visible del botón.
                              aria-labelledby={`disponible-${index} disponible-boton-${index}`}
                              aria-pressed={pr.disponible}
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
                          </div>
                          <Button variant="outline-danger" onClick={() => eliminarPresentacion(index)} aria-label={`Quitar presentación ${index + 1}`}>
                            <X size={16} aria-hidden />
                            Quitar
                          </Button>
                        </div>
                      </div>
                      <div>
                        <p className="block text-xs font-semibold mb-1" style={{ color: 'var(--encabezados-alterno)' }}>
                          Imágenes de esta presentación
                        </p>
                        <EditorImagenesPresentacionCloudinary
                          uso="productos"
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
              <Card variant="elevated" padding="lg">
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
                  Estado del Producto
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span style={{ color: 'var(--encabezados-alterno)' }}>Estado:</span>
                    <Badge variant={estadoAdmin.variante}>{estadoAdmin.estado}</Badge>
                  </div>
                  {producto.activo === false && (
                    <p className="text-xs" style={{ color: 'var(--encabezados-alterno)' }}>
                      No se muestra en la tienda ni en el punto de venta. Usa &quot;Reactivar&quot; para volver a venderlo.
                    </p>
                  )}
                  <div className="flex justify-between items-center">
                    <span style={{ color: 'var(--encabezados-alterno)' }}>Disponible:</span>
                    <label className="flex min-h-11 min-w-11 items-center gap-2 cursor-pointer px-1">
                      <input
                        type="checkbox"
                        checked={disponible}
                        onChange={(e) => {
                          const nuevoValor = e.target.checked;
                          setDisponible(nuevoValor);
                          // Este checkbox es la fuente de la verdad "Disponible" del producto en el
                          // panel; el backend deriva disponible de las presentaciones, así que hay
                          // que aplicar el cambio a TODAS para que se guarde de verdad.
                          setPresentaciones((prev) =>
                            prev.map((p) => ({ ...p, disponible: nuevoValor }))
                          );
                        }}
                        className="h-5 w-5 rounded"
                      />
                      <span style={{ color: 'var(--menu-texto-principal)' }}>{disponible ? 'Sí' : 'No'}</span>
                    </label>
                  </div>
                  <div className="flex justify-between items-center">
                    <span style={{ color: 'var(--encabezados-alterno)' }}>Nuevo:</span>
                    <label className="flex min-h-11 min-w-11 items-center gap-2 cursor-pointer px-1">
                      <input
                        type="checkbox"
                        checked={nuevo}
                        onChange={(e) => setNuevo(e.target.checked)}
                        className="h-5 w-5 rounded"
                      />
                      <span style={{ color: 'var(--menu-texto-principal)' }}>{nuevo ? 'Sí' : 'No'}</span>
                    </label>
                  </div>
                  <div className="flex justify-between items-center">
                    <span style={{ color: 'var(--encabezados-alterno)' }}>Cruelty free:</span>
                    <label className="flex min-h-11 min-w-11 items-center gap-2 cursor-pointer px-1">
                      <input
                        type="checkbox"
                        checked={crueltyFree}
                        onChange={(e) => setCrueltyFree(e.target.checked)}
                        className="h-5 w-5 rounded"
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
                    <span className="font-semibold" style={{ color: presentaciones.reduce((s, pr) => s + (parseInt(pr.stock || '0', 10) || 0), 0) <= 0 ? 'var(--danger-texto)' : 'var(--success-texto)' }}>
                      {presentaciones.reduce((s, pr) => s + (parseInt(pr.stock || '0', 10) || 0), 0) > 0
                        ? <span className="inline-flex items-center gap-1"><Check size={14} /> OK</span>
                        : <span className="inline-flex items-center gap-1"><AlertTriangle size={14} /> Sin stock</span>}
                    </span>
                  </div>
                </div>
              </Card>

              <Card variant="elevated" padding="lg">
                <div className="space-y-4">
                  <Textarea
                    label="Características (una por línea)"
                    value={caracteristicasText}
                    onChange={(e) => setCaracteristicasText(e.target.value)}
                    placeholder={'Ej: Sin parabenos\nVegano\n...'}
                    rows={3}
                    fullWidth
                  />
                  <Textarea
                    label="Ingredientes"
                    value={ingredientes}
                    onChange={(e) => setIngredientes(e.target.value)}
                    placeholder="Lista o descripción de ingredientes..."
                    rows={3}
                    fullWidth
                  />
                  <Textarea
                    label="Modo de uso"
                    value={modoUso}
                    onChange={(e) => setModoUso(e.target.value)}
                    placeholder="Instrucciones de uso del producto..."
                    rows={3}
                    fullWidth
                  />
                  <Textarea
                    label="Resultado"
                    value={resultado}
                    onChange={(e) => setResultado(e.target.value)}
                    placeholder="Resultado o beneficios esperados..."
                    rows={3}
                    fullWidth
                  />
                </div>
              </Card>

            </div>
          </div>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => !deleting && setShowDeleteModal(false)}
        title={estadoAdmin.confirmacion.titulo}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDesactivar} disabled={deleting}>
              {deleting ? 'Desactivando...' : 'Desactivar'}
            </Button>
          </>
        }
      >
        <p style={{ color: 'var(--menu-texto-principal)' }}>
          {estadoAdmin.confirmacion.mensaje(producto.nombre)}
        </p>
      </Modal>
    </AdminLayout>
  );
}

