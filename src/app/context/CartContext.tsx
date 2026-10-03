'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  startTransition,
  ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { hasSession } from '../utils/security';
import { MIRU_USER_STORAGE_UPDATED } from '../utils/userStorageSync';
import {
  listarCarrito,
  crearCarritoItem,
  actualizarCarritoItem,
  eliminarCarritoItem,
  type CarritoItemApi,
} from '../services/ecommerce';
import { imagenProductoMostrable } from '../utils/normalizarUrlImagen';

const CART_STORAGE_KEY = 'miru-cart';

/** Con sesión, el carrito del servidor se vuelve a pedir como mucho cada 60 s (al navegar o al volver a la pestaña). */
const RECARGA_MINIMA_MS = 60_000;

/** /admin y /operacion no usan el carrito: ahí no se pide al servidor ni se toca el del invitado. */
function esPanelInterno(ruta: string): boolean {
  return /^\/(admin|operacion)(\/|$)/.test(ruta);
}

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
  /** true tras la primera carga (servidor o localStorage): antes, "vacío" no significa vacío. */
  listo: boolean;
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
  const rowAny = row as CarritoItemApi & { imagen?: unknown; imagenUrl?: unknown; producto?: CarritoItemApi['producto'] & { imagen?: unknown } };
  const rowWithPresentacion = rowAny as CarritoItemApi & {
    presentacion?: CarritoItemApi['presentacion'] & { imagen?: unknown; imagenes?: unknown };
  };
  // Primera imagen mostrable entre las candidatas (las que no son de Cloudinary se descartan)
  const candidatas: unknown[] = [
    ...(row.producto?.imagenes ?? []),
    rowAny.producto?.imagen,
    ...(Array.isArray(rowWithPresentacion.presentacion?.imagenes) ? rowWithPresentacion.presentacion.imagenes : []),
    rowWithPresentacion.presentacion?.imagen,
    rowAny.imagen,
    rowAny.imagenUrl,
  ];
  const img = candidatas.map(imagenProductoMostrable).find((u): u is string => !!u);
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
    return parsed.filter(isCartItemRow).map((item) => ({
      ...item,
      imagen: imagenProductoMostrable(item.imagen) ?? undefined,
    }));
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
  const [listo, setListo] = useState(false);
  /** Si ya se cargó el carrito (servidor o localStorage), con qué estado de sesión y cuándo. */
  const cargadoRef = useRef(false);
  const sesionCargadaRef = useRef<boolean | null>(null);
  const ultimaCargaRef = useRef(0);

  // Las actualizaciones de la carga van en transición: corren al montar, mientras el Suspense de la
  // página (loading.tsx) puede seguir sin hidratar. Una actualización urgente de este contexto (Header
  // lo consume) obligaría a React a descartar el HTML del servidor y pintarlo de nuevo en el cliente;
  // una transición espera a que el boundary hidrate.
  const refreshCart = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const conSesion = hasSession();
    sesionCargadaRef.current = conSesion;
    ultimaCargaRef.current = Date.now();
    cargadoRef.current = true;
    if (conSesion) {
      startTransition(() => setLoading(true));
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
        startTransition(() => {
          setItems(rows.map(apiItemToCartItem));
          setListo(true);
        });
        saveToStorage([]);
      } catch {
        startTransition(() => {
          setItems([]);
          setListo(true);
        });
      } finally {
        startTransition(() => setLoading(false));
      }
    } else {
      startTransition(() => {
        setItems(loadFromStorage());
        setListo(true);
      });
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => startTransition(() => setMounted(true)));
  }, []);

  /**
   * Se pide al cargar y cuando cambia la sesión (login, logout: tras el login se fusiona el carrito
   * de invitado). Fuera de eso, con sesión, como mucho cada 60 s. Antes se pedía en cada navegación
   * y cada vez que la ventana recuperaba el foco, también en /admin y /operacion.
   */
  const recargarSiHaceFalta = useCallback(() => {
    if (esPanelInterno(window.location.pathname)) return;
    const conSesion = hasSession();
    const cambioLaSesion = sesionCargadaRef.current !== conSesion;
    const vencido = conSesion && Date.now() - ultimaCargaRef.current > RECARGA_MINIMA_MS;
    if (cambioLaSesion || vencido) void refreshCart();
  }, [refreshCart]);

  useEffect(() => {
    recargarSiHaceFalta();
  }, [pathname, recargarSiHaceFalta]);

  useEffect(() => {
    const alVolverALaPestana = () => {
      if (document.visibilityState === 'visible') recargarSiHaceFalta();
    };
    document.addEventListener('visibilitychange', alVolverALaPestana);
    window.addEventListener(MIRU_USER_STORAGE_UPDATED, recargarSiHaceFalta);
    return () => {
      document.removeEventListener('visibilitychange', alVolverALaPestana);
      window.removeEventListener(MIRU_USER_STORAGE_UPDATED, recargarSiHaceFalta);
    };
  }, [recargarSiHaceFalta]);

  useEffect(() => {
    // Sin haber cargado el carrito (p. ej. en /admin) no se guarda: se borraría el del invitado.
    if (!mounted || !cargadoRef.current) return;
    if (!hasSession()) saveToStorage(items);
  }, [items, mounted]);

  const addItem = useCallback(
    async (item: AddCartItemInput) => {
      const cantidad = item.cantidad ?? 1;
      const conSesion = hasSession();

      if (conSesion) {
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
    const conSesion = hasSession();
    if (conSesion && id.startsWith('srv-')) {
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
    const conSesion = hasSession();
    if (conSesion && id.startsWith('srv-')) {
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
    const conSesion = hasSession();
    if (conSesion) {
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
        listo,
        isServerCart: Boolean(typeof window !== 'undefined' && hasSession()),
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
