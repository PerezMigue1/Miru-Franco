'use client';

import Link from 'next/link';
import { useState } from 'react';
import ModuleLayout from '../../../../components/layouts/ModuleLayout';
import PageHeader from '../../../../components/ui/PageHeader';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Input from '../../../../components/ui/Input';
import Badge from '../../../../components/ui/Badge';
import { useMetodosPagoUsuario } from '../../../../hooks/useMetodosPagoUsuario';
import {
  crearMetodoPagoUsuario,
  actualizarMetodoPagoUsuario,
  eliminarMetodoPagoUsuario,
  type MetodoPagoUsuario,
} from '../../../../services/metodosPagoUsuario';
import { showAlert } from '../../../../utils/toast';

function etiquetaTarjeta(m: MetodoPagoUsuario): string {
  const marca = m.marca ? m.marca.toUpperCase() : 'Tarjeta';
  const u4 = m.ultimos4 ? ` ·••• ${m.ultimos4}` : '';
  const banco = m.bancoNombre ? ` — ${m.bancoNombre}` : '';
  return `${marca}${u4}${banco}`;
}

export default function TarjetasGuardadasPage() {
  const { items, loading, error, refresh } = useMetodosPagoUsuario();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAlta, setShowAlta] = useState(false);
  const [savingAlta, setSavingAlta] = useState(false);
  const [formAlta, setFormAlta] = useState({
    proveedor: 'mercadopago',
    idExterno: '',
    ultimos4: '',
    marca: 'visa',
    bancoNombre: '',
    expMes: '5',
    expAnio: '2029',
    tipoTarjeta: 'credito' as 'credito' | 'debito',
    esPredeterminada: false,
  });

  const marcarPredeterminada = async (id: string) => {
    setBusyId(id);
    try {
      await actualizarMetodoPagoUsuario(id, { esPredeterminada: true });
      await refresh();
    } catch (e) {
      void showAlert(e instanceof Error ? e.message : 'No se pudo actualizar');
    } finally {
      setBusyId(null);
    }
  };

  const quitar = async (id: string) => {
    if (!window.confirm('¿Quitar esta tarjeta de tus métodos guardados?')) return;
    setBusyId(id);
    try {
      await eliminarMetodoPagoUsuario(id);
      await refresh();
    } catch (e) {
      void showAlert(e instanceof Error ? e.message : 'No se pudo eliminar');
    } finally {
      setBusyId(null);
    }
  };

  const guardarNueva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAlta.idExterno.trim() || !formAlta.ultimos4.trim()) {
      void showAlert('Completa al menos el ID externo (pasarela) y los últimos 4 dígitos.');
      return;
    }
    const mes = parseInt(formAlta.expMes, 10);
    const anio = parseInt(formAlta.expAnio, 10);
    if (!Number.isFinite(mes) || mes < 1 || mes > 12) {
      void showAlert('Mes de expiración inválido (1–12).');
      return;
    }
    if (!Number.isFinite(anio) || anio < 2000) {
      void showAlert('Año de expiración inválido.');
      return;
    }
    setSavingAlta(true);
    try {
      await crearMetodoPagoUsuario({
        proveedor: formAlta.proveedor.trim(),
        idExterno: formAlta.idExterno.trim(),
        ultimos4: formAlta.ultimos4.replace(/\D/g, '').slice(-4).padStart(4, '0'),
        marca: formAlta.marca.trim() || undefined,
        bancoNombre: formAlta.bancoNombre.trim() || undefined,
        expMes: mes,
        expAnio: anio,
        tipoTarjeta: formAlta.tipoTarjeta,
        esPredeterminada: formAlta.esPredeterminada,
      });
      setShowAlta(false);
      setFormAlta((f) => ({
        ...f,
        idExterno: '',
        ultimos4: '',
        esPredeterminada: false,
      }));
      await refresh();
      void showAlert('Método guardado correctamente.');
    } catch (err) {
      void showAlert(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSavingAlta(false);
    }
  };

  return (
    <ModuleLayout>
      <PageHeader
        title="Tarjetas y métodos de pago"
        subtitle="Métodos guardados tras tokenizar en la pasarela (Mercado Pago u otro). No guardamos número completo ni CVV."
      />

      <div className="mb-4">
        <Link
          href="/perfil"
          className="text-sm font-medium underline"
          style={{ color: 'var(--enlaces-textos-interactivos)' }}
        >
          ← Volver al perfil
        </Link>
      </div>

      {loading && (
        <p className="text-sm mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
          Cargando métodos…
        </p>
      )}
      {error && (
        <p className="text-sm mb-4 text-red-600 dark:text-red-400">{error}</p>
      )}

      <Card className="p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--menu-texto-principal)' }}>
            Tus métodos
          </h2>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowAlta((v) => !v)}>
            {showAlta ? 'Cerrar formulario' : '+ Registrar método (tras token en pasarela)'}
          </Button>
        </div>

        {showAlta && (
          <form
            onSubmit={guardarNueva}
            className="mb-8 p-4 rounded-lg space-y-3 border"
            style={{ borderColor: 'var(--fondos-suaves)' }}
          >
            <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
              Usa esto solo con datos que devuelva la pasarela después de tokenizar. No pegues el PAN completo.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Proveedor"
                value={formAlta.proveedor}
                onChange={(e) => setFormAlta((f) => ({ ...f, proveedor: e.target.value }))}
                fullWidth
              />
              <Input
                label="ID externo (pasarela)"
                value={formAlta.idExterno}
                onChange={(e) => setFormAlta((f) => ({ ...f, idExterno: e.target.value }))}
                fullWidth
                required
              />
              <Input
                label="Últimos 4 dígitos"
                value={formAlta.ultimos4}
                onChange={(e) => setFormAlta((f) => ({ ...f, ultimos4: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                fullWidth
                maxLength={4}
                required
              />
              <Input
                label="Marca (visa, mastercard…)"
                value={formAlta.marca}
                onChange={(e) => setFormAlta((f) => ({ ...f, marca: e.target.value }))}
                fullWidth
              />
              <Input
                label="Banco emisor"
                value={formAlta.bancoNombre}
                onChange={(e) => setFormAlta((f) => ({ ...f, bancoNombre: e.target.value }))}
                fullWidth
              />
              <Input
                label="Mes exp."
                type="number"
                min={1}
                max={12}
                value={formAlta.expMes}
                onChange={(e) => setFormAlta((f) => ({ ...f, expMes: e.target.value }))}
                fullWidth
              />
              <Input
                label="Año exp."
                type="number"
                min={2000}
                value={formAlta.expAnio}
                onChange={(e) => setFormAlta((f) => ({ ...f, expAnio: e.target.value }))}
                fullWidth
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--menu-texto-principal)' }}>
              <input
                type="checkbox"
                checked={formAlta.tipoTarjeta === 'debito'}
                onChange={(e) =>
                  setFormAlta((f) => ({ ...f, tipoTarjeta: e.target.checked ? 'debito' : 'credito' }))
                }
              />
              Es débito (si no, se asume crédito)
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--menu-texto-principal)' }}>
              <input
                type="checkbox"
                checked={formAlta.esPredeterminada}
                onChange={(e) => setFormAlta((f) => ({ ...f, esPredeterminada: e.target.checked }))}
              />
              Establecer como predeterminada
            </label>
            <Button type="submit" disabled={savingAlta}>
              {savingAlta ? 'Guardando…' : 'Guardar método'}
            </Button>
          </form>
        )}

        {!loading && items.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--encabezados-alterno)' }}>
            Aún no tienes métodos guardados. Tras pagar con la pasarela, el backend puede registrar el token; también
            puedes usar el formulario de arriba si ya tienes el `idExterno` de la pasarela.
          </p>
        )}

        <ul className="space-y-3">
          {items.map((m) => (
            <li
              key={m.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border"
              style={{ borderColor: 'var(--fondos-suaves)' }}
            >
              <div>
                <p className="font-medium" style={{ color: 'var(--menu-texto-principal)' }}>
                  {etiquetaTarjeta(m)}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
                  {m.proveedor} · exp. {m.expMes ?? '—'}/{m.expAnio ?? '—'} ·{' '}
                  {m.tipoTarjeta === 'debito' ? 'Débito' : 'Crédito'}
                </p>
                {m.etiqueta && (
                  <p className="text-xs mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
                    {m.etiqueta}
                  </p>
                )}
                {m.esPredeterminada && (
                  <Badge variant="success" size="sm" className="mt-2">
                    Predeterminada
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {!m.esPredeterminada && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busyId === m.id}
                    onClick={() => void marcarPredeterminada(m.id)}
                  >
                    Usar por defecto
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busyId === m.id}
                  onClick={() => void quitar(m.id)}
                >
                  Quitar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </ModuleLayout>
  );
}
