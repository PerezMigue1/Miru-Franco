'use client';

import { useState, useEffect } from 'react';
import { obtenerCaducidades, registrarSalida, CaducidadApi } from '../../../services/inventarioMovimientos';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';
import Modal from '../../../components/ui/Modal';
import AdminLayout from '../../../components/layouts/AdminLayout';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';

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
    obtenerCaducidades(30)
      .then((data) => { setCaducidadesRaw(data); setProductos(data.map(mapearCaducidad)); })
      .catch(() => {})
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
      <PageHeader
        title="Control de Productos con Caducidad"
        subtitle="Monitorea productos abiertos y próximos a caducar"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Vigentes</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--success)' }}>{loading ? '…' : vigentes}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Próximos a Vencer</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--warning)' }}>{loading ? '…' : proximos}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--encabezados-alterno)' }}>Vencidos</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--danger)' }}>{loading ? '…' : vencidos}</p>
          </div>
        </Card>
      </div>

      <Card>
        <Table headers={['Producto', 'Fecha de Apertura', 'Fecha de Caducidad', 'Días Restantes', 'Estado', 'Acciones']}>
          {productos.map((producto) => (
            <TableRow key={producto.id}>
              <TableCell className="font-semibold">{producto.nombre}</TableCell>
              <TableCell>{producto.fechaApertura}</TableCell>
              <TableCell>{producto.fechaCaducidad}</TableCell>
              <TableCell>
                <span style={{ color: producto.diasRestantes < 0 ? 'var(--danger)' : producto.diasRestantes < 30 ? 'var(--warning)' : 'var(--success)' }}>
                  {producto.diasRestantes > 0 ? `${producto.diasRestantes} días` : `Vencido hace ${Math.abs(producto.diasRestantes)} días`}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={estados[producto.estado as keyof typeof estados]?.variant || 'default'}>
                  {estados[producto.estado as keyof typeof estados]?.label || producto.estado}
                </Badge>
              </TableCell>
              <TableCell>
                {producto.estado === 'vencido' && (
                  <Button size="sm" variant="danger" onClick={() => openDescartar(producto)}>Descartar</Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>
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
        {descartarError && <p className="text-sm mb-3" style={{ color: 'var(--danger)' }}>{descartarError}</p>}
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
