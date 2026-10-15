import type { TipoDocumentoFactura } from '../../../services/ecommerce';

/** No hay proveedor de timbrado (PAC): el CFDI se timbra por fuera y aquí solo se registra. */
export const AVISO_SIN_TIMBRADO =
  'El sistema no timbra facturas: timbra el CFDI en tu proveedor o en el portal del SAT y registra aquí su folio y archivo.';

/** Texto del botón de guardar del modal: la nota se genera aquí; el CFDI solo se registra. */
export function textoBotonGuardar(
  tipo: TipoDocumentoFactura,
  estado: { guardando: boolean; subiendoPdf: boolean },
): string {
  if (estado.subiendoPdf) return 'Subiendo PDF…';
  if (tipo === 'cfdi') return estado.guardando ? 'Registrando…' : 'Registrar CFDI timbrado';
  return estado.guardando ? 'Generando…' : 'Generar nota de venta';
}

export function tituloModalDocumento(tipo: TipoDocumentoFactura): string {
  return tipo === 'cfdi' ? 'Registrar CFDI timbrado' : 'Generar nota de venta';
}
