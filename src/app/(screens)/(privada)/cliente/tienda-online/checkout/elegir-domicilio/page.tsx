'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import ModuleLayout from '../../../../../../components/layouts/ModuleLayout';
import Button from '../../../../../../components/ui/Button';
import { listarDireccionesUsuario, type DireccionUsuarioDTO } from '../../../../../../services/perfil';
import { hasValidToken } from '../../../../../../utils/security';
import { writeCheckoutDireccionId, readCheckoutDireccionId } from '../../../../../../utils/checkoutDeliveryStorage';
import {
  tituloCalleDireccion,
  lineaUbicacionDireccion,
} from '../../../../../../utils/formatDireccionUsuario';

const RETURN_CHECKOUT = '/cliente/tienda-online/checkout';
const RETURN_DIRECCIONES = `/cliente/direcciones?returnUrl=${encodeURIComponent(`/cliente/tienda-online/checkout/elegir-domicilio`)}`;

export default function ElegirDomicilioCheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<DireccionUsuarioDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seleccionId, setSeleccionId] = useState('');

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const list = await listarDireccionesUsuario();
      setItems(list);
      const stored = readCheckoutDireccionId();
      const principal = list.find((d) => d.esPrincipal);
      if (stored && list.some((d) => d.id === stored)) {
        setSeleccionId(stored);
      } else if (principal) {
        setSeleccionId(principal.id);
      } else if (list.length > 0) {
        setSeleccionId(list[0]!.id);
      } else {
        setSeleccionId('');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las direcciones');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasValidToken()) {
      router.replace(`/login?returnUrl=${encodeURIComponent('/cliente/tienda-online/checkout/elegir-domicilio')}`);
      return;
    }
    void load();
  }, [load, router]);

  const continuar = () => {
    if (!seleccionId) return;
    writeCheckoutDireccionId(seleccionId);
    router.push(RETURN_CHECKOUT);
  };

  return (
    <ModuleLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href={RETURN_CHECKOUT}
          className="text-sm font-medium underline mb-6 inline-block"
          style={{ color: 'var(--checkout-entrega-enlace)' }}
        >
          ← Volver al checkout
        </Link>

        <h1 className="text-page-title mb-6" style={{ color: 'var(--menu-texto-principal)' }}>
          Elige dónde recibir tu compra
        </h1>

        {error && (
          <p className="text-sm mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--fondos-suaves)', color: 'var(--danger)' }}>
            {error}
          </p>
        )}

        {loading ? (
          <p style={{ color: 'var(--encabezados-alterno)' }}>Cargando direcciones…</p>
        ) : items.length === 0 ? (
          <div className="p-6 rounded-xl border" style={{ borderColor: 'var(--fondos-suaves)' }}>
            <p className="mb-4" style={{ color: 'var(--encabezados-alterno)' }}>
              Aún no tienes domicilios guardados. Los datos se guardan en tu cuenta (tabla{' '}
              <code className="text-xs">direcciones_usuario</code>).
            </p>
            <Button asChild>
              <Link href={RETURN_DIRECCIONES}>Agregar nuevo domicilio</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((d) => {
              const selected = seleccionId === d.id;
              return (
                <label
                  key={d.id}
                  className="block cursor-pointer rounded-xl border-2 p-4 transition-colors"
                  style={{
                    borderColor: selected ? 'var(--checkout-entrega-borde-seleccion)' : 'var(--fondos-suaves)',
                    backgroundColor: selected ? 'var(--fondos-suaves)' : 'transparent',
                  }}
                >
                  <div className="flex gap-3">
                    <input
                      type="radio"
                      name="dirCheckout"
                      className="mt-1 shrink-0"
                      checked={selected}
                      onChange={() => setSeleccionId(d.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold" style={{ color: 'var(--menu-texto-principal)' }}>
                        {tituloCalleDireccion(d)}
                      </p>
                      <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
                        {lineaUbicacionDireccion(d)}
                      </p>
                      <p className="text-sm mt-1" style={{ color: 'var(--encabezados-alterno)' }}>
                        {d.contactoNombreApellido}
                      </p>
                      {selected && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm">
                          <Link
                            href={`/cliente/direcciones?returnUrl=${encodeURIComponent('/cliente/tienda-online/checkout/elegir-domicilio')}&edit=${encodeURIComponent(d.id)}`}
                            className="font-semibold underline"
                            style={{ color: 'var(--checkout-entrega-enlace)' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Editar dirección
                          </Link>
                          <Link
                            href={`/cliente/direcciones?returnUrl=${encodeURIComponent('/cliente/tienda-online/checkout/elegir-domicilio')}&edit=${encodeURIComponent(d.id)}`}
                            className="font-semibold underline"
                            style={{ color: 'var(--checkout-entrega-enlace)' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Añadir indicaciones
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="flex flex-wrap justify-end gap-3 mt-8">
            <Button variant="outline" asChild>
              <Link href={RETURN_DIRECCIONES}>Agregar nuevo domicilio</Link>
            </Button>
            <Button onClick={continuar} disabled={!seleccionId}>
              Continuar
            </Button>
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}
