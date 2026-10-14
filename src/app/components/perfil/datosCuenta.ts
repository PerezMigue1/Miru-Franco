/** Fila de "Datos de tu cuenta" en el perfil (UserProfile). */
export interface FilaDatosCuenta {
  etiqueta: string;
  valor: string;
  /** Insignia "Validado": solo si el dato existe y el backend lo tiene verificado. */
  validado: boolean;
  /** Qué abre "Modificar"; null = el dato no se puede cambiar (sin botón). */
  modificar: 'correo' | 'telefono' | null;
  romper?: boolean;
}

/**
 * Filas de "Datos de tu cuenta". El único dato verificado es el correo (`confirmado` de GET /auth/me);
 * el teléfono no pasa por ninguna verificación y el ID de cuenta no se edita.
 */
export function filasDatosCuenta(u: {
  id?: string;
  email?: string;
  telefono?: string | null;
  confirmado?: boolean;
}): FilaDatosCuenta[] {
  const email = u.email?.trim() ?? '';
  const telefono = u.telefono?.trim() ?? '';
  return [
    { etiqueta: 'E-mail', valor: email || '—', validado: !!email && u.confirmado === true, modificar: 'correo', romper: true },
    { etiqueta: 'Teléfono', valor: telefono || '—', validado: false, modificar: 'telefono' },
    { etiqueta: 'ID de cuenta', valor: u.id || '—', validado: false, modificar: null, romper: true },
  ];
}
