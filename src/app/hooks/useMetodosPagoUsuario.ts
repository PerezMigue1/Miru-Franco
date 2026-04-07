'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  listarMetodosPagoUsuario,
  type MetodoPagoUsuario,
} from '../services/metodosPagoUsuario';

export function useMetodosPagoUsuario(opciones?: { usuarioId?: string }) {
  const [items, setItems] = useState<MetodoPagoUsuario[]>([]);
  const [count, setCount] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const usuarioId = opciones?.usuarioId;

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { items: list, count: c } = await listarMetodosPagoUsuario(
        usuarioId ? { usuarioId } : undefined
      );
      setItems(list);
      setCount(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los métodos de pago');
      setItems([]);
      setCount(undefined);
    } finally {
      setLoading(false);
    }
  }, [usuarioId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, count, loading, error, refresh };
}
