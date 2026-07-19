'use client';

import { useState, useEffect } from 'react';
import { obtenerCaducidades, registrarSalida, CaducidadApi } from '../../../services/inventarioMovimientos';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';
import Modal from '../../../components/ui/Modal';
import AdminLayout from '../../../components/layouts/AdminLayout';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import { CheckCircle2, Clock3, PackageX } from 'lucide-react';

interface ProductoCaducidad {
  id: number;
  nombre: string;
  fechaApertura: string;
  fechaCaducidad: string;
  estado: 'vigente' | 'proximo' | 'vencido';
  diasRestantes: number;
}

function mapearCaducidad(c: CaducidadApi, idx: number): ProductoCaducidad {
  let estado: 'vigente' | 'proximo' | 'vencido' = 'vigente';
  if (c.diasRestantes < 0) estado = 'vencido';
  else if (c.diasRestantes <= 30) estado = 'proximo';
  return {
    id: c.presentacionId || idx,
    nombre: [c.productoNombre, c.tamanio].filter(Boolean).join(' ') || '-',
    fechaApertura: '-',
    fechaCaducidad: c.fechaCaducidad ?? '-',
    estado,
    diasRestantes: c.diasRestantes,
  };
}

export default function ControlCaducidadPage() {
  const [productos, setProductos] = useState<ProductoCaducidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [caducidadesRaw, setCaducidadesRaw] = useState<CaducidadApi[]>([]);

  // Modal descartar
  const [isModalDescartarOpen, setIsModalDescartarOpen] = useState(false);
  const [productoDescartando, setProductoDescartando] = useState<ProductoCaducidad | null>(null);
  const [savingDescartar, setSavingDescartar] = useState(false);
  const [descartarError, setDescartarError] = useState<string | null>(null);
  const [formCantidadDescartar, setFormCantidadDescartar] = useState('1');
  const [formMotivoDescartar, setFormMotivoDescartar] = useState('Producto vencido');

  const cargar = () => {
    setLoading(true);
    setError(null);
    obtenerCaducidades(30)
      .then((data) => { setCaducidadesRaw(data); setProductos(data.map(mapearCaducidad)); })
      .catch(() => setError('Error al cargar productos'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const openDescartar = (producto: ProductoCaducidad) => {
    setProductoDescartando(producto);
    setFormCantidadDescartar('1');
    setFormMotivoDescartar('Producto vencido');
    setDescartarError(null);
    setIsModalDescartarOpen(true);
  };

  const handleDescartar = async () => {
    if (!productoDescartando) return;
    const raw = caducidadesRaw.find((c) => (c.presentacionId || 0) === productoDescartando.id);
    const presentacionId = raw?.presentacionId ?? productoDescartando.id;
    setSavingDescartar(true); setDescartarError(null);
    try {
      await registrarSalida({ presentacionId, cantidad: parseInt(formCantidadDescartar, 10) || 1, motivo: formMotivoDescartar.trim() || 'Producto vencido' });
      setIsModalDescartarOpen(false); setProductoDescartando(null); cargar();
    } catch (e) { setDescartarError(e instanceof Error ? e.message : 'Error al descartar'); }
    finally { setSavingDescartar(false); }
  };

  const estados = {
    vigente: { label: 'Vigente', variant: 'success' as const },
    proximo: { label: 'Próximo a Vencer', variant: 'warning' as const },
    vencido: { label: 'Vencido', variant: 'danger' as const },
  };

  const vigentes = productos.filter((p) => p.estado === 'vigente').length;
  const proximos = productos.filter((p) => p.estado === 'proximo').length;
  const vencidos = productos.filter((p) => p.estado === 'vencido').length;

  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-8">

        {/* Encabezado */}
        <div>
          <h1 className="text-elegant-title" style={{ color: 'var(--menu-texto-principal)' }}>
            Control de Caducidad
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
            {productos.length} producto{productos.length === 1 ? '' : 's'} monitoreados
          </p>
        </div>

        {error && (
          <div className="bg-red-600 border border-red-700 text-white px-4 py-3 rounded text-xs font-bold shadow-md">
            {error}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--fondos-suaves)' }}>
                <CheckCircle2 size={20} style={{ color: 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Vigentes</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--menu-texto-principal)' }}>{loading ? '…' : vigentes}</p>
              </div>
            </div>
          </Card>

          <Card
            variant="elevated"
            padding="lg"
            style={proximos > 0 ? { boxShadow: '0 0 0 1.5px var(--warning), 0 4px 12px rgba(0,0,0,0.15)' } : undefined}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: proximos > 0 ? 'rgba(217, 142, 4, 0.2)' : 'var(--fondos-suaves)' }}>
                <Clock3 size={20} style={{ color: proximos > 0 ? 'var(--warning)' : 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Próximos a vencer</p>
                <p className="text-3xl font-bold mt-0.5" style={{ color: proximos > 0 ? 'var(--warning-texto)' : 'var(--menu-texto-principal)' }}>{loading ? '…' : proximos}</p>
              </div>
            </div>
          </Card>

          <Card
            variant="elevated"
            padding="lg"
            style={vencidos > 0 ? { boxShadow: '0 0 0 1.5px var(--danger), 0 4px 12px rgba(0,0,0,0.15)' } : undefined}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: vencidos > 0 ? 'rgba(113, 0, 20, 0.15)' : 'var(--fondos-suaves)' }}>
                <PackageX size={22} style={{ color: vencidos > 0 ? 'var(--danger)' : 'var(--encabezados-alterno)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--encabezados-alterno)' }}>Vencidos</p>
                <p className="text-4xl font-bold mt-0.5" style={{ color: vencidos > 0 ? 'var(--danger-texto)' : 'var(--menu-texto-principal)' }}>{loading ? '…' : vencidos}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Listado */}
        <Card variant="elevated" padding="lg">
          {loading ? (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>Cargando productos…</p>
          ) : productos.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--encabezados-alterno)' }}>No hay productos en control de caducidad.</p>
          ) : (
          <Table headers={['Producto', 'Fecha de Apertura', 'Fecha de Caducidad', 'Días Restantes', 'Estado', 'Acciones']} headerSutil>
            {productos.map((producto) => (
              <TableRow key={producto.id}>
                <TableCell className="font-semibold" rowPadding="lg">{producto.nombre}</TableCell>
                <TableCell rowPadding="lg">{producto.fechaApertura}</TableCell>
                <TableCell rowPadding="lg">{producto.fechaCaducidad}</TableCell>
                <TableCell rowPadding="lg">
                  <span style={{ color: producto.diasRestantes < 0 ? 'var(--danger-texto)' : producto.diasRestantes < 30 ? 'var(--warning-texto)' : 'var(--success-texto)' }}>
                    {producto.diasRestantes > 0 ? `${producto.diasRestantes} días` : `Vencido hace ${Math.abs(producto.diasRestantes)} días`}
                  </span>
                </TableCell>
                <TableCell rowPadding="lg">
                  <Badge variant={estados[producto.estado as keyof typeof estados]?.variant || 'default'}>
                    {estados[producto.estado as keyof typeof estados]?.label || producto.estado}
                  </Badge>
                </TableCell>
                <TableCell rowPadding="lg">
                  {producto.estado === 'vencido' && (
                    <Button size="sm" variant="danger" onClick={() => openDescartar(producto)}>Descartar</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </Table>
          )}
        </Card>
      </div>
      {/* Modal: Confirmar Descartar */}
      <Modal
        isOpen={isModalDescartarOpen}
        onClose={() => { if (!savingDescartar) { setIsModalDescartarOpen(false); setProductoDescartando(null); } }}
        title="Descartar Producto"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setIsModalDescartarOpen(false); setProductoDescartando(null); }} disabled={savingDescartar}>Cancelar</Button>
            <Button variant="danger" onClick={handleDescartar} disabled={savingDescartar}>{savingDescartar ? 'Descartando...' : 'Descartar'}</Button>
          </>
        }
      >
        {descartarError && <p className="text-sm mb-3" style={{ color: 'var(--danger-texto)' }}>{descartarError}</p>}
        <p className="mb-4" style={{ color: 'var(--menu-texto-principal)' }}>
          Registrar salida de <strong>{productoDescartando?.nombre}</strong> por producto vencido.
        </p>
        <div className="space-y-3">
          <Input
            label="Cantidad a descartar"
            type="number"
            min={1}
            value={formCantidadDescartar}
            onChange={(e) => setFormCantidadDescartar(e.target.value)}
            fullWidth
          />
          <Textarea
            label="Motivo"
            value={formMotivoDescartar}
            onChange={(e) => setFormMotivoDescartar(e.target.value)}
            rows={2}
            fullWidth
          />
        </div>
      </Modal>
    </AdminLayout>
  );
}
