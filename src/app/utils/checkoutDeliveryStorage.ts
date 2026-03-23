/** Clave sessionStorage: dirección elegida para el pedido en curso (id de `direcciones_usuario`). */
export const CHECKOUT_DIRECCION_ID_KEY = 'miru_checkout_direccion_entrega_id';

export function readCheckoutDireccionId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(CHECKOUT_DIRECCION_ID_KEY);
  } catch {
    return null;
  }
}

export function writeCheckoutDireccionId(id: string): void {
  try {
    sessionStorage.setItem(CHECKOUT_DIRECCION_ID_KEY, id);
  } catch {
    /* ignore */
  }
}

export function clearCheckoutDireccionId(): void {
  try {
    sessionStorage.removeItem(CHECKOUT_DIRECCION_ID_KEY);
  } catch {
    /* ignore */
  }
}
