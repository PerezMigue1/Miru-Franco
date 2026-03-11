'use client';

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';

const CART_STORAGE_KEY = 'miru-cart';

export interface CartItem {
  id: string | number;
  nombre: string;
  precio: number;
  cantidad: number;
  imagen?: string;
  /** Presentación (ej. 250ml, 1000ml) para que mismo producto con distinta presentación sea otra línea */
  presentacion?: string;
}

interface CartContextType {
  items: CartItem[];
  totalItems: number;
  addItem: (item: Omit<CartItem, 'cantidad'> & { cantidad?: number }) => void;
  removeItem: (id: string | number) => void;
  updateQuantity: (id: string | number, cantidad: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

function loadFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setItems(loadFromStorage());
      setMounted(true);
    });
  }, []);

  useEffect(() => {
    if (mounted) saveToStorage(items);
  }, [items, mounted]);

  const addItem = useCallback((item: Omit<CartItem, 'cantidad'> & { cantidad?: number }) => {
    const cantidad = item.cantidad ?? 1;
    setItems((prev) => {
      const existing = prev.find((i) => String(i.id) === String(item.id));
      if (existing) {
        return prev.map((i) =>
          String(i.id) === String(item.id)
            ? { ...i, cantidad: i.cantidad + cantidad }
            : i
        );
      }
      return [...prev, { ...item, cantidad }];
    });
  }, []);

  const removeItem = useCallback((id: string | number) => {
    setItems((prev) => prev.filter((i) => String(i.id) !== String(id)));
  }, []);

  const updateQuantity = useCallback((id: string | number, cantidad: number) => {
    if (cantidad < 1) return;
    setItems((prev) =>
      prev.map((i) => (String(i.id) === String(id) ? { ...i, cantidad } : i))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.cantidad, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
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
