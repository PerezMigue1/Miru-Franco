/**
 * Endpoints públicos de pagos (sin Bearer): BIN / MSI.
 * GET `${getRestApiBaseUrl()}/payments/bin-lookup?bin=...`
 * GET `${getRestApiBaseUrl()}/payments/msi-indicio?bancoEmisor=...`
 */

import { apiClient } from './client';
import { getRestApiBaseUrl } from './config';

const base = () => getRestApiBaseUrl();

function unwrapData(res: unknown): Record<string, unknown> | null {
  if (!res || typeof res !== 'object') return null;
  const o = res as Record<string, unknown>;
  const d = o.data;
  if (d && typeof d === 'object' && !Array.isArray(d)) return d as Record<string, unknown>;
  return o;
}

function strBin(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v).trim();
  return '';
}

const CLAVES_BANCO_EMISOR = [
  'bancoEmisor',
  'bancoNombre',
  'banco_emisor',
  'banco_nombre',
  'nombreBanco',
  'nombre_banco',
  'bank',
  'bankName',
  'bank_name',
  'issuingBank',
  'issuing_bank',
  'issuerBank',
  'issuer_bank',
  'issuer',
  'issuerName',
  'issuer_name',
  'emisor',
  'institucion',
  'institución',
  'financialInstitution',
  'issuingOrganization',
  'issuing_organization',
  'institution',
  'institucion',
] as const;

const CLAVES_NIDO_BIN = ['bin', 'card', 'result', 'payload', 'details', 'metadata', 'lookup'] as const;

/**
 * Lee banco emisor de respuestas BIN con formas variables (plano, snake_case u objeto anidado).
 */
export function bancoEmisorDesdeBinInfo(info: Record<string, unknown>, profundidad = 0): string {
  if (profundidad > 4) return '';

  for (const k of CLAVES_BANCO_EMISOR) {
    const raw = info[k];
    if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
      const sub = raw as Record<string, unknown>;
      const anidado = strBin(sub.name ?? sub.nombre ?? sub.label ?? sub.title);
      if (anidado) return anidado;
    } else {
      const v = strBin(raw);
      if (v) return v;
    }
  }

  for (const nk of CLAVES_NIDO_BIN) {
    const sub = info[nk];
    if (sub && typeof sub === 'object' && !Array.isArray(sub)) {
      const s = bancoEmisorDesdeBinInfo(sub as Record<string, unknown>, profundidad + 1);
      if (s) return s;
    }
  }

  return '';
}

const CLAVES_TIPO_CREDITO_DEBITO = [
  'tipoProducto',
  'tipo_producto',
  'cardCategory',
  'card_category',
  'category',
  'binCategory',
  'accountType',
  'account_type',
  'accountFundType',
  'funding',
  'fundType',
  'cardFunding',
  'card_funding',
  'tipoTarjeta',
  'tipo_tarjeta',
  'cardType',
  'card_type',
] as const;

function inferCreditoDebitoDesdeTexto(v: unknown): 'credito' | 'debito' | null {
  const s = strBin(v).toLowerCase();
  if (!s) return null;
  if (
    s === 'visa' ||
    s === 'mastercard' ||
    s === 'amex' ||
    s === 'american express' ||
    s === 'discover' ||
    s === 'diners'
  ) {
    return null;
  }
  if (/\bdebit|débito|electron|prepaid|prepago\b/.test(s)) return 'debito';
  if (/\bcredit|crédito|credito\b/.test(s)) return 'credito';
  return null;
}

/**
 * Indica si el BIN corresponde a producto de crédito o débito (cuando la API lo expone).
 * No adivina por marca sola; si no hay señal clara, devuelve null.
 */
export function tipoTarjetaDesdeBinInfo(
  info: Record<string, unknown>,
  profundidad = 0
): 'credito' | 'debito' | null {
  if (profundidad > 4) return null;

  const isDebit = info.isDebit ?? info.is_debit ?? info.debitCard ?? info.debit_card;
  if (isDebit === true) return 'debito';
  const isCredit = info.isCredit ?? info.is_credit ?? info.creditCard ?? info.credit_card;
  if (isCredit === true) return 'credito';

  for (const k of CLAVES_TIPO_CREDITO_DEBITO) {
    const t = inferCreditoDebitoDesdeTexto(info[k]);
    if (t) return t;
  }

  const producto = strBin(
    info.product ?? info.producto ?? info.cardProduct ?? info.card_product ?? ''
  ).toLowerCase();
  if (producto.includes('debit') || producto.includes('débito') || producto.includes('electron')) {
    return 'debito';
  }
  if (
    producto.includes('credit') ||
    producto.includes('crédito') ||
    producto.includes('credito')
  ) {
    return 'credito';
  }

  for (const nk of CLAVES_NIDO_BIN) {
    const sub = info[nk];
    if (sub && typeof sub === 'object' && !Array.isArray(sub)) {
      const t = tipoTarjetaDesdeBinInfo(sub as Record<string, unknown>, profundidad + 1);
      if (t) return t;
    }
  }

  return null;
}

const CLAVES_MARCA = [
  'marca',
  'brand',
  'scheme',
  'tipoTarjeta',
  'tipo_tarjeta',
  'cardBrand',
  'card_brand',
  'product',
  'producto',
  'cardProduct',
] as const;

/** Marca / producto del BIN (Visa Classic, etc.) */
export function marcaDesdeBinInfo(info: Record<string, unknown>, profundidad = 0): string {
  if (profundidad > 4) return '';

  for (const k of CLAVES_MARCA) {
    const v = strBin(info[k]);
    if (v) return v;
  }

  for (const nk of CLAVES_NIDO_BIN) {
    const sub = info[nk];
    if (sub && typeof sub === 'object' && !Array.isArray(sub)) {
      const s = marcaDesdeBinInfo(sub as Record<string, unknown>, profundidad + 1);
      if (s) return s;
    }
  }

  return '';
}

/**
 * Normaliza la respuesta del BIN: muchas APIs envían `marca` dentro de `data` pero
 * `bancoEmisor` / `issuer` en el nivel raíz. `unwrapData` solo devolvía `data` y se perdía el banco.
 */
function normalizarPayloadBinLookup(res: unknown): Record<string, unknown> | null {
  if (!res || typeof res !== 'object' || Array.isArray(res)) return null;
  const o = res as Record<string, unknown>;
  const d = o.data;
  if (d && typeof d === 'object' && !Array.isArray(d)) {
    return { ...(d as Record<string, unknown>), ...o };
  }
  return { ...o };
}

/** Solo dígitos; el backend suele esperar al menos 6 (BIN). */
export async function paymentsBinLookup(bin: string): Promise<Record<string, unknown> | null> {
  const digits = bin.replace(/\D/g, '').slice(0, 19);
  if (digits.length < 6) return null;
  const res = await apiClient.get<unknown>(
    `/payments/bin-lookup?bin=${encodeURIComponent(digits)}`,
    { customBase: base(), skipAuth: true, skip500Redirect: true }
  );
  return normalizarPayloadBinLookup(res);
}

export async function paymentsMsiIndicio(bancoEmisor: string): Promise<Record<string, unknown> | null> {
  const b = bancoEmisor.trim();
  if (!b) return null;
  const res = await apiClient.get<unknown>(
    `/payments/msi-indicio?bancoEmisor=${encodeURIComponent(b)}`,
    { customBase: base(), skipAuth: true, skip500Redirect: true }
  );
  return unwrapData(res);
}
