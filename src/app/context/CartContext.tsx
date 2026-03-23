'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { getToken } from '../utils/security';
import {
  listarCarrito,
  crearCarritoItem,
  actualizarCarritoItem,
  eliminarCarritoItem,
  type CarritoItemApi,
} from '../services/ecommerce';

const CART_STORAGE_KEY = 'miru-cart';

export interface CartItem {
  /** `srv-{id}` servidor o `local-{productoId}-{presentacionId}` invitado */
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  imagen?: string;
  presentacion?: string;
  productoId: number;
  presentacionId: number;
  carritoItemId?: number;
}

export type AddCartItemInput = Omit<CartItem, 'id' | 'cantidad' | 'carritoItemId'> & {
  cantidad?: number;
};

interface CartContextType {
  items: CartItem[];
  totalItems: number;
  loading: boolean;
  isServerCart: boolean;
  addItem: (item: AddCartItemInput) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, cantidad: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

function parsePrecioPresentacion(p: CarritoItemApi['presentacion']): number {
  if (!p) return 0;
  const raw = p.precio;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') return parseFloat(String(raw).replace(/[^0-9.]/g, '')) || 0;
  return 0;
}

function apiItemToCartItem(row: CarritoItemApi): CartItem {
  const precio =
    row.precioReferencia != null && row.precioReferencia > 0
      ? row.precioReferencia
      : parsePrecioPresentacion(row.presentacion);
  const img = row.producto?.imagenes?.[0];
  return {
    id: `srv-${row.id}`,
    carritoItemId: row.id,
    productoId: row.productoId,
    presentacionId: row.presentacionId,
    nombre: row.producto?.nombre ?? 'Producto',
    precio,
    cantidad: row.cantidad,
    imagen: img,
    presentacion: row.presentacion?.tamanio ?? undefined,
  };
}

function localLineId(productoId: number, presentacionId: number) {
  return `local-${productoId}-${presentacionId}`;
}

function isCartItemRow(x: unknown): x is CartItem {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.nombre === 'string' &&
    typeof o.precio === 'number' &&
    typeof o.cantidad === 'number' &&
    typeof o.productoId === 'number' &&
    typeof o.presentacionId === 'number'
  );
}

function loadFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCartItemRow);
  } catch {
    return [];
  }
}

function saveToStorage(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const token = getToken();
    if (token) {
      setLoading(true);
      try {
        const localGuest = loadFromStorage().filter((i) => String(i.id).startsWith('local-'));
        let rows = await listarCarrito();
        if (localGuest.length > 0 && rows.length === 0) {
          for (const it of localGuest) {
            try {
              await crearCarritoItem({
                productoId: it.productoId,
                presentacionId: it.presentacionId,
                cantidad: it.cantidad,
                precioReferencia: it.precio,
              });
            } catch {
              /* línea inválida o duplicada en servidor */
            }
          }
          rows = await listarCarrito();
        }
        setItems(rows.map(apiItemToCartItem));
        saveToStorage([]);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    } else {
      setItems(loadFromStorage());
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshCart();
      setMounted(true);
    });
  }, [refreshCart]);

  /** Tras login y `router.push`, el token ya existe: volver a cargar / fusionar carrito. */
  useEffect(() => {
    void refreshCart();
  }, [pathname, refreshCart]);

  useEffect(() => {
    const onFocus = () => {
      if (getToken()) void refreshCart();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshCart]);

  useEffect(() => {
    if (!mounted) return;
    if (!getToken()) saveToStorage(items);
  }, [items, mounted]);

  const addItem = useCallback(
    async (item: AddCartItemInput) => {
      const cantidad = item.cantidad ?? 1;
      const token = getToken();

      if (token) {
        setLoading(true);
        try {
          await crearCarritoItem({
            productoId: item.productoId,
            presentacionId: item.presentacionId,
            cantidad,
            precioReferencia: item.precio,
          });
          const rows = await listarCarrito();
          setItems(rows.map(apiItemToCartItem));
        } finally {
          setLoading(false);
        }
        return;
      }

      setItems((prev) => {
        const lineId = localLineId(item.productoId, item.presentacionId);
        const existing = prev.find((i) => i.id === lineId);
        if (existing) {
          return prev.map((i) =>
            i.id === lineId ? { ...i, cantidad: i.cantidad + cantidad } : i
          );
        }
        return [
          ...prev,
          {
            id: lineId,
            nombre: item.nombre,
            precio: item.precio,
            cantidad,
            imagen: item.imagen,
            presentacion: item.presentacion,
            productoId: item.productoId,
            presentacionId: item.presentacionId,
          },
        ];
      });
    },
    []
  );

  const removeItem = useCallback(async (id: string) => {
    const token = getToken();
    if (token && id.startsWith('srv-')) {
      const cid = Number(id.replace(/^srv-/, ''));
      if (Number.isFinite(cid)) {
        setLoading(true);
        try {
          await eliminarCarritoItem(cid);
          const rows = await listarCarrito();
          setItems(rows.map(apiItemToCartItem));
        } finally {
          setLoading(false);
        }
        return;
      }
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback(async (id: string, cantidad: number) => {
    if (cantidad < 1) return;
    const token = getToken();
    if (token && id.startsWith('srv-')) {
      const cid = Number(id.replace(/^srv-/, ''));
      if (Number.isFinite(cid)) {
        setLoading(true);
        try {
          await actualizarCarritoItem(cid, { cantidad });
          const rows = await listarCarrito();
          setItems(rows.map(apiItemToCartItem));
        } finally {
          setLoading(false);
        }
        return;
      }
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, cantidad } : i))
    );
  }, []);

  const clearCart = useCallback(async () => {
    const token = getToken();
    if (token) {
      setLoading(true);
      try {
        const rows = await listarCarrito();
        await Promise.all(rows.map((r) => eliminarCarritoItem(r.id)));
        setItems([]);
      } finally {
        setLoading(false);
      }
      return;
    }
    setItems([]);
    saveToStorage([]);
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.cantidad, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        loading,
        isServerCart: Boolean(typeof window !== 'undefined' && getToken()),
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
