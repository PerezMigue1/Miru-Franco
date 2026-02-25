'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import Input from '../../../../components/ui/Input';
import Table, { TableRow, TableCell } from '../../../../components/ui/Table';
import { colors } from '../../../../utils/colors';
import { getCategoryColor } from '../../../../utils/categoryColors';
import {
  getProductoPorId,
  updateProducto,
  deleteProducto,
  type Producto,
  type ProductoPayload,
} from '../../../../services/productos';
import Modal from '../../../../components/ui/Modal';

function calcularPrecioDesdeDescuento(precioOriginal: number, descuento: number): string {
  if (!precioOriginal || !descuento) return `$${precioOriginal || 0}`;
  const final = Math.round(precioOriginal * (1 - descuento / 100));
  return `$${final}`;
}

function parseNumero(str: string | undefined): number {
  if (!str) return 0;
  return parseFloat(str.replace(/[^0-9.]/g, '')) || 0;
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
  const [imagenesText, setImagenesText] = useState('');
  const [imagenesEditadas, setImagenesEditadas] = useState(false);
  const [presentaciones, setPresentaciones] = useState<
    Array<{
      tamanio: string;
      precioOriginal: string;
      precio: string;
      stock: string;
      disponible: boolean;
    }>
  >([]);

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
          setImagenesText((p.imagenes ?? (p.imagen ? [p.imagen] : []))?.join('\n'));
          setImagenesEditadas(false);
          setPresentaciones(
            (p.presentaciones ?? []).map((pr) => {
              const base = parseNumero(pr.precioOriginal ?? pr.precio);
              const precioConDescuento = calcularPrecioDesdeDescuento(base, p.descuento ?? 0);
              return {
                tamanio: pr.tamaño,
                precioOriginal: String(base || '0'),
                precio: String(parseNumero(precioConDescuento)),
                stock: String(pr.stock ?? 0),
                disponible: pr.disponible ?? true,
              };
            })
          );
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
        tamanio: '',
        precioOriginal: '0',
        precio: String(parseNumero(precioInicial)),
        stock: '0',
        disponible: true,
      },
    ]);
  };

  const eliminarPresentacion = (index: number) => {
    setPresentaciones((prev) => prev.filter((_, i) => i !== index));
  };

  const movimientos = useMemo(
    () => [
      { id: 1, tipo: 'Venta', cantidad: -2, fecha: '2024-01-15', referencia: 'Ejemplo cliente' },
      { id: 2, tipo: 'Compra', cantidad: 20, fecha: '2024-01-10', referencia: 'Ejemplo proveedor' },
    ],
    []
  );

  const handleGuardar = async () => {
    if (!producto) return;
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const descuentoNum = parseFloat(descuentoStr) || 0;
      const payload: ProductoPayload = {
        nombre,
        descripcion,
        descripcionLarga: descripcionLarga.trim() || undefined,
        categoria,
        marca: marca.trim() || undefined,
        descuento: descuentoNum || 0,
        nuevo,
        crueltyFree,
        caracteristicas: caracteristicasText
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
        ingredientes: ingredientes.trim() || undefined,
        modoUso: modoUso.trim() || undefined,
        resultado: resultado.trim() || undefined,
        presentaciones:
          presentaciones.length > 0
            ? presentaciones.map((pr) => {
                const stockNum = parseInt(pr.stock || '0', 10);
                const disponible = pr.disponible && stockNum > 0;
                return {
                  tamanio: pr.tamanio,
                  precio: parseFloat(pr.precio) || 0,
                  precioOriginal: parseFloat(pr.precioOriginal) || 0,
                  stock: pr.disponible ? stockNum : 0,
                  disponible,
                };
              })
            : undefined,
        imagenes: imagenesEditadas
          ? imagenesText
              .split('\n')
              .map((l) => l.trim())
              .filter(Boolean)
          : undefined,
      };
      const actualizado = await updateProducto(producto.id, payload);
      setProducto(actualizado);
      setSuccessMessage('Producto actualizado correctamente.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar los cambios');
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
        <div className="container mx-auto px-4 py-12" >
          <p className="text-lead" style={{ color: colors.encabezadosAlterno }}>
            Cargando producto...
          </p>
        </div>
      </AdminLayout>
    );
  }

  if (error || !producto) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-12" >
          <p className="text-lead mb-4" style={{ color: colors.danger }}>
            {error ?? 'Producto no encontrado'}
          </p>
        </div>
      </AdminLayout>
    );
  }

  const descuentoNum = parseFloat(descuentoStr) || 0;

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-12" >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center justify-end gap-4 mb-6">
            <div className="flex items-center gap-3">
              {successMessage && (
                <span className="text-sm font-medium" style={{ color: colors.success }}>{successMessage}</span>
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
                  <h1 className="text-hero mb-2" style={{ color: colors.menuTextoPrincipal }}>
                    {nombre}
                  </h1>
                  <Badge variant={getCategoryColor(producto.categoria)} size="lg">
                    {producto.categoria}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <p className="text-sm mb-1" style={{ color: colors.encabezadosAlterno }}>Stock total</p>
                    <p className="text-xl font-bold" style={{ color: colors.menuTextoPrincipal }}>
                      {presentaciones.reduce((s, pr) => s + (parseInt(pr.stock || '0', 10) || 0), 0)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <p className="text-sm mb-1" style={{ color: colors.encabezadosAlterno }}>Descuento</p>
                    <p className="text-xl font-bold" style={{ color: colors.menuTextoPrincipal }}>
                      {descuentoNum}%
                    </p>
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: colors.fondosSuaves }}>
                    <p className="text-sm mb-1" style={{ color: colors.encabezadosAlterno }}>Marca</p>
                    <p className="text-sm font-semibold" style={{ color: colors.menuTextoPrincipal }}>
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
                  <Input
                    label="Categoría"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    fullWidth
                  />
                  <Input
                    label="Marca"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    fullWidth
                  />
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
                  <label className="block text-sm font-semibold mb-1" style={{ color: colors.encabezadosAlterno }}>
                    Descripción larga
                  </label>
                  <textarea
                    className="w-full rounded-md border px-3 py-2 text-sm min-h-[100px]"
                    value={descripcionLarga}
                    onChange={(e) => setDescripcionLarga(e.target.value)}
                    placeholder="Descripción detallada del producto..."
                    style={{
                      borderColor: colors.tarjetasPaneles,
                      backgroundColor: colors.fondosSuaves,
                      color: colors.menuTextoPrincipal,
                    }}
                  />
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-subtitle" style={{ color: colors.menuTextoPrincipal }}>
                    Presentaciones (tamaños, precios y stock)
                  </h3>
                  <Button size="sm" variant="outline" onClick={agregarPresentacion}>
                    + Agregar presentación
                  </Button>
                </div>
                {presentaciones.length === 0 ? (
                  <p className="text-sm py-4" style={{ color: colors.encabezadosAlterno }}>
                    No hay presentaciones. Agrega tamaños o variantes (ej. 500ml, 1L) con su precio y stock.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {presentaciones.map((pr, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end border-b pb-3 last:border-b-0"
                        style={{ borderColor: colors.fondosSuaves }}
                      >
                        <div>
                          <p className="text-xs font-semibold mb-1" style={{ color: colors.encabezadosAlterno }}>
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
                          <p className="text-xs font-semibold mb-1" style={{ color: colors.encabezadosAlterno }}>
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
                          <p className="text-xs font-semibold mb-1" style={{ color: colors.encabezadosAlterno }}>
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
                          <p className="text-xs font-semibold mb-1" style={{ color: colors.encabezadosAlterno }}>
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
                            ✕
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card>
                <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Movimientos recientes
                </h2>
                <Table headers={['Tipo', 'Cantidad', 'Fecha', 'Referencia']}>
                  {movimientos.map((movimiento) => (
                    <TableRow key={movimiento.id}>
                      <TableCell>
                        <Badge variant={movimiento.tipo === 'Venta' ? 'success' : 'info'}>
                          {movimiento.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className={movimiento.cantidad < 0 ? 'text-red-600' : 'text-green-600'}>
                        {movimiento.cantidad > 0 ? '+' : ''}{movimiento.cantidad}
                      </TableCell>
                      <TableCell>{movimiento.fecha}</TableCell>
                      <TableCell>{movimiento.referencia}</TableCell>
                    </TableRow>
                  ))}
                </Table>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <h3 className="text-subtitle mb-4" style={{ color: colors.menuTextoPrincipal }}>
                  Estado del Producto
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span style={{ color: colors.encabezadosAlterno }}>Disponible:</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={disponible}
                        onChange={(e) => setDisponible(e.target.checked)}
                        className="rounded"
                      />
                      <span style={{ color: colors.menuTextoPrincipal }}>{disponible ? 'Sí' : 'No'}</span>
                    </label>
                  </div>
                  <div className="flex justify-between items-center">
                    <span style={{ color: colors.encabezadosAlterno }}>Nuevo:</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={nuevo}
                        onChange={(e) => setNuevo(e.target.checked)}
                        className="rounded"
                      />
                      <span style={{ color: colors.menuTextoPrincipal }}>{nuevo ? 'Sí' : 'No'}</span>
                    </label>
                  </div>
                  <div className="flex justify-between items-center">
                    <span style={{ color: colors.encabezadosAlterno }}>Cruelty free:</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={crueltyFree}
                        onChange={(e) => setCrueltyFree(e.target.checked)}
                        className="rounded"
                      />
                      <span style={{ color: colors.menuTextoPrincipal }}>{crueltyFree ? 'Sí' : 'No'}</span>
                    </label>
                  </div>
                  <div className="flex justify-between pt-2" style={{ borderTop: `1px solid ${colors.fondosSuaves}` }}>
                    <span style={{ color: colors.encabezadosAlterno }}>Descuento:</span>
                    <Badge variant={descuentoNum > 0 ? 'warning' : 'info'}>
                      {descuentoNum > 0 ? `${descuentoNum}%` : 'Sin descuento'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: colors.encabezadosAlterno }}>Stock total:</span>
                    <span className="font-semibold" style={{ color: presentaciones.reduce((s, pr) => s + (parseInt(pr.stock || '0', 10) || 0), 0) <= 0 ? colors.danger : colors.success }}>
                      {presentaciones.reduce((s, pr) => s + (parseInt(pr.stock || '0', 10) || 0), 0) > 0 ? '✓ OK' : '⚠ Sin stock'}
                    </span>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="text-subtitle mb-2" style={{ color: colors.menuTextoPrincipal }}>
                  Características (una por línea)
                </h3>
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
                  value={caracteristicasText}
                  onChange={(e) => setCaracteristicasText(e.target.value)}
                  placeholder={'Ej: Sin parabenos\nVegano\n...'}
                  style={{
                    borderColor: colors.tarjetasPaneles,
                    backgroundColor: colors.fondosSuaves,
                    color: colors.menuTextoPrincipal,
                  }}
                />
                <h3 className="text-subtitle mt-4 mb-2" style={{ color: colors.menuTextoPrincipal }}>
                  Ingredientes
                </h3>
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
                  value={ingredientes}
                  onChange={(e) => setIngredientes(e.target.value)}
                  placeholder="Lista o descripción de ingredientes..."
                  style={{
                    borderColor: colors.tarjetasPaneles,
                    backgroundColor: colors.fondosSuaves,
                    color: colors.menuTextoPrincipal,
                  }}
                />
                <h3 className="text-subtitle mt-4 mb-2" style={{ color: colors.menuTextoPrincipal }}>
                  Modo de uso
                </h3>
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
                  value={modoUso}
                  onChange={(e) => setModoUso(e.target.value)}
                  placeholder="Instrucciones de uso del producto..."
                  style={{
                    borderColor: colors.tarjetasPaneles,
                    backgroundColor: colors.fondosSuaves,
                    color: colors.menuTextoPrincipal,
                  }}
                />
                <h3 className="text-subtitle mt-4 mb-2" style={{ color: colors.menuTextoPrincipal }}>
                  Resultado
                </h3>
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
                  value={resultado}
                  onChange={(e) => setResultado(e.target.value)}
                  placeholder="Resultado o beneficios esperados..."
                  style={{
                    borderColor: colors.tarjetasPaneles,
                    backgroundColor: colors.fondosSuaves,
                    color: colors.menuTextoPrincipal,
                  }}
                />
              </Card>

              <Card>
                <h3 className="text-subtitle mb-2" style={{ color: colors.menuTextoPrincipal }}>
                  Imágenes (una URL por línea)
                </h3>
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  rows={4}
                  value={imagenesText}
                  onChange={(e) => {
                    setImagenesText(e.target.value);
                    setImagenesEditadas(true);
                  }}
                  placeholder="https://..."
                  style={{
                    borderColor: colors.tarjetasPaneles,
                    backgroundColor: colors.fondosSuaves,
                    color: colors.menuTextoPrincipal,
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
        <p style={{ color: colors.menuTextoPrincipal }}>
          ¿Estás seguro de que deseas eliminar el producto &quot;{producto?.nombre}&quot;? Esta acción puede deshabilitarlo en el catálogo.
        </p>
      </Modal>
    </AdminLayout>
  );
}

