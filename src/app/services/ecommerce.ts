/**
 * E-commerce: carrito, pedidos, pagos, envíos, etc.
 * Rutas alineadas con el backend Nest (/api/...). Cuerpos en camelCase (Prisma/TS).
 */

import { apiClient } from './client';
import { getBackendBaseUrl } from './config';
import { normalizarUrlImagenExterna } from '../utils/normalizarUrlImagen';

const BASE = () => getBackendBaseUrl();

function num(v: unknown, fallback = 0): number {
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

function unwrapArray<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === 'object') {
    const o = res as Record<string, unknown>;
    const inner = o.data ?? o.items ?? o.carritoItems ?? o.pedidos ?? o.result;
    if (Array.isArray(inner)) return inner as T[];
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      const bag = inner as Record<string, unknown>;
      const nested = bag.data ?? bag.items ?? bag.results;
      if (Array.isArray(nested)) return nested as T[];
    }
  }
  return [];
}

function unwrapObject<T extends Record<string, unknown>>(res: unknown): T | null {
  if (!res || typeof res !== 'object') return null;
  const o = res as Record<string, unknown>;
  const inner = (o.data ?? o.pedido ?? o.item ?? o.envio ?? o.factura ?? o.pago ?? o.valoracion ?? o.devolucion ?? o.notificacion) as unknown;
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) return inner as T;
  if (o.id != null || o.pedidoId != null) return o as T;
  return null;
}

// --- Carrito ---

export interface CarritoItemApi {
  id: number;
  cantidad: number;
  precioReferencia?: number | null;
  activo?: boolean;
  productoId: number;
  presentacionId: number;
  creadoEn?: string;
  actualizadoEn?: string;
  /** Si el GET expande producto */
  producto?: {
    nombre?: string;
    imagen?: string;
    imagenes?: string[];
    marca?: string;
  };
  presentacion?: {
    tamanio?: string;
    precio?: number | string;
    imagen?: string;
    imagenes?: string[];
  };
}

function extraerUrlImagenCarrito(val: unknown): string | undefined {
  if (typeof val === 'string') {
    const n = normalizarUrlImagenExterna(val);
    return n || undefined;
  }
  if (val && typeof val === 'object') {
    const o = val as Record<string, unknown>;
    const raw = o.secure_url ?? o.url ?? o.src;
    if (typeof raw === 'string') {
      const n = normalizarUrlImagenExterna(raw);
      return n || undefined;
    }
  }
  return undefined;
}

function normalizarCarritoItem(raw: Record<string, unknown>): CarritoItemApi {
  const productoRaw =
    raw.producto && typeof raw.producto === 'object'
      ? (raw.producto as Record<string, unknown>)
      : undefined;
  const imagenesRaw = Array.isArray(productoRaw?.imagenes)
    ? (productoRaw?.imagenes as unknown[])
    : [];
  const imagenesNorm = imagenesRaw
    .map((item) => extraerUrlImagenCarrito(item))
    .filter((u): u is string => Boolean(u));
  const imagenSingle = extraerUrlImagenCarrito(productoRaw?.imagen);

  const presentacionRaw =
    raw.presentacion && typeof raw.presentacion === 'object'
      ? (raw.presentacion as Record<string, unknown>)
      : undefined;
  const presentacionImgsRaw = Array.isArray(presentacionRaw?.imagenes)
    ? (presentacionRaw?.imagenes as unknown[])
    : [];
  const presentacionImgsNorm = presentacionImgsRaw
    .map((item) => extraerUrlImagenCarrito(item))
    .filter((u): u is string => Boolean(u));
  const presentacionSingle = extraerUrlImagenCarrito(presentacionRaw?.imagen);

  return {
    id: num(raw.id),
    cantidad: num(raw.cantidad, 1),
    precioReferencia: raw.precioReferencia != null ? num(raw.precioReferencia) : raw.precio_referencia != null ? num(raw.precio_referencia) : null,
    activo: raw.activo !== false,
    productoId: num(raw.productoId ?? raw.producto_id),
    presentacionId: num(raw.presentacionId ?? raw.presentacion_id),
    creadoEn: str(raw.creadoEn ?? raw.creado_en),
    actualizadoEn: str(raw.actualizadoEn ?? raw.actualizado_en),
    producto: productoRaw
      ? {
          nombre: typeof productoRaw.nombre === 'string' ? productoRaw.nombre : undefined,
          marca: typeof productoRaw.marca === 'string' ? productoRaw.marca : undefined,
          imagenes: imagenesNorm.length ? imagenesNorm : imagenSingle ? [imagenSingle] : undefined,
          imagen: imagenSingle ?? imagenesNorm[0],
        }
      : undefined,
    presentacion: presentacionRaw
      ? {
          tamanio:
            typeof (presentacionRaw.tamanio ?? presentacionRaw.tamaño) === 'string'
              ? String(presentacionRaw.tamanio ?? presentacionRaw.tamaño)
              : undefined,
          precio:
            typeof presentacionRaw.precio === 'number' || typeof presentacionRaw.precio === 'string'
              ? (presentacionRaw.precio as number | string)
              : undefined,
          imagenes: presentacionImgsNorm.length
            ? presentacionImgsNorm
            : presentacionSingle
              ? [presentacionSingle]
              : undefined,
          imagen: presentacionSingle ?? presentacionImgsNorm[0],
        }
      : undefined,
  };
}

export async function listarCarrito(): Promise<CarritoItemApi[]> {
  const res = await apiClient.get<unknown>('/api/carrito', BASE());
  return unwrapArray<Record<string, unknown>>(res).map((r) => normalizarCarritoItem(r));
}

export async function obtenerCarritoItem(id: number): Promise<CarritoItemApi | null> {
  const res = await apiClient.get<unknown>(`/api/carrito/${id}`, BASE());
  const o = unwrapObject<Record<string, unknown>>(res);
  return o ? normalizarCarritoItem(o) : null;
}

export interface CrearCarritoItemPayload {
  productoId: number;
  presentacionId: number;
  cantidad: number;
  precioReferencia?: number;
}

export async function crearCarritoItem(payload: CrearCarritoItemPayload): Promise<CarritoItemApi> {
  const res = await apiClient.post<unknown>('/api/carrito', payload, BASE());
  const o = unwrapObject<Record<string, unknown>>(res) ?? (res as Record<string, unknown>);
  if (o && typeof o === 'object' && o.id != null) return normalizarCarritoItem(o);
  throw new Error('No se pudo crear el ítem del carrito');
}

export async function actualizarCarritoItem(
  id: number,
  payload: Partial<{ cantidad: number; activo: boolean; precioReferencia: number }>
): Promise<CarritoItemApi> {
  const res = await apiClient.put<unknown>(`/api/carrito/${id}`, payload, BASE());
  const o = unwrapObject<Record<string, unknown>>(res) ?? (res as Record<string, unknown>);
  if (o && typeof o === 'object' && o.id != null) return normalizarCarritoItem(o);
  throw new Error('No se pudo actualizar el ítem del carrito');
}

export async function eliminarCarritoItem(id: number): Promise<void> {
  await apiClient.delete<void>(`/api/carrito/${id}`, BASE());
}

// --- Pedidos ---

export type EstadoPedidoUi =
  | 'borrador'
  | 'pendiente_pago'
  | 'pagado'
  | 'preparando'
  | 'enviado'
  | 'entregado'
  | 'cancelado';

export interface PedidoApi {
  id: number;
  estado: EstadoPedidoUi;
  subtotal: number;
  costoEnvio: number;
  impuestos: number;
  descuento: number;
  total: number;
  moneda: string;
  direccionTextoCompleta?: string | null;
  notasCliente?: string | null;
  metodoPago?: string | null;
  referenciaPago?: string | null;
  pagadoEn?: string | null;
  creadoEn?: string;
  actualizadoEn?: string;
  usuarioId?: string;
  /** Nombre/email del cliente si el backend los incluyó (`Pedido.usuario`). GET /api/usuarios es admin-only, así que operación depende de esto para mostrar a quién pertenece el pedido. */
  usuarioNombre?: string | null;
  usuarioEmail?: string | null;
  direccionEnvioId?: string | null;
}

function normalizarPedido(raw: Record<string, unknown>): PedidoApi {
  const usuarioObj = (raw.usuario && typeof raw.usuario === 'object' ? raw.usuario : null) as Record<string, unknown> | null;
  return {
    id: num(raw.id),
    estado: (str(raw.estado) || 'borrador') as EstadoPedidoUi,
    subtotal: num(raw.subtotal),
    costoEnvio: num(raw.costoEnvio ?? raw.costo_envio),
    impuestos: num(raw.impuestos),
    descuento: num(raw.descuento),
    total: num(raw.total),
    moneda: str(raw.moneda) || 'MXN',
    direccionTextoCompleta: raw.direccionTextoCompleta != null ? str(raw.direccionTextoCompleta) : raw.direccion_texto_completa != null ? str(raw.direccion_texto_completa) : null,
    notasCliente: raw.notasCliente != null ? str(raw.notasCliente) : raw.notas_cliente != null ? str(raw.notas_cliente) : null,
    metodoPago: raw.metodoPago != null ? str(raw.metodoPago) : raw.metodo_pago != null ? str(raw.metodo_pago) : null,
    referenciaPago: raw.referenciaPago != null ? str(raw.referenciaPago) : raw.referencia_pago != null ? str(raw.referencia_pago) : null,
    pagadoEn: raw.pagadoEn != null ? str(raw.pagadoEn) : raw.pagado_en != null ? str(raw.pagado_en) : null,
    creadoEn: str(raw.creadoEn ?? raw.creado_en),
    actualizadoEn: str(raw.actualizadoEn ?? raw.actualizado_en),
    usuarioId: str(raw.usuarioId ?? raw.usuario_id),
    usuarioNombre: usuarioObj?.nombre != null ? str(usuarioObj.nombre) : null,
    usuarioEmail: usuarioObj?.email != null ? str(usuarioObj.email) : null,
    direccionEnvioId: raw.direccionEnvioId != null ? str(raw.direccionEnvioId) : raw.direccion_envio_id != null ? str(raw.direccion_envio_id) : null,
  };
}

export async function listarPedidos(): Promise<PedidoApi[]> {
  const res = await apiClient.get<unknown>('/api/pedidos', BASE());
  return unwrapArray<Record<string, unknown>>(res).map((r) => normalizarPedido(r));
}

export interface ListarPedidosPaginadoParams {
  page?: number;
  limit?: number;
  estado?: EstadoPedidoUi;
}

export interface PedidosPaginados {
  data: PedidoApi[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Igual que `listarPedidos()`, pero SIN descartar la metadata de paginación que el
 * backend ya manda (`count`/`page`/`totalPages`) — `listarPedidos()` la tira porque
 * `unwrapArray()` solo extrae `data`. Función nueva en vez de cambiar la firma de
 * `listarPedidos()` para no romper los ~11 call sites que ya la usan esperando un
 * array plano (ver auditoría de paginación — quedan fuera de esta tarea a propósito).
 */
export async function listarPedidosPaginado(
  params?: ListarPedidosPaginadoParams
): Promise<PedidosPaginados> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.estado) sp.set('estado', params.estado);
  const qs = sp.toString();
  const res = await apiClient.get<unknown>(`/api/pedidos${qs ? `?${qs}` : ''}`, BASE());
  const o = (res && typeof res === 'object' ? res : {}) as Record<string, unknown>;
  const arr = unwrapArray<Record<string, unknown>>(res);
  return {
    data: arr.map((r) => normalizarPedido(r)),
    count: num(o.count, arr.length),
    page: num(o.page, params?.page ?? 1),
    limit: num(o.limit, params?.limit ?? 20),
    totalPages: num(o.totalPages, 1),
  };
}

export async function obtenerPedido(id: number): Promise<PedidoApi | null> {
  const res = await apiClient.get<unknown>(`/api/pedidos/${id}`, BASE());
  const o = unwrapObject<Record<string, unknown>>(res);
  return o ? normalizarPedido(o) : null;
}

/**
 * Líneas del pedido en POST /api/pedidos (solo lo que expone el DTO; precio y nombres los resuelve el servidor).
 */
export interface CrearPedidoLineaPayload {
  cantidad: number;
  productoId: number;
  presentacionId: number;
}

/**
 * Cuerpo `CreatePedidoDto` (POST /api/pedidos): sin totales ni direccionTextoCompleta en create
 * (el servidor recalcula). `usuarioId` solo admin. Ver contrato backend-miru.
 */
export interface CrearPedidoPayload {
  estado?: EstadoPedidoUi;
  moneda?: string;
  notasCliente?: string;
  metodoPago?: string;
  referenciaPago?: string;
  /** Omitir o null si retiro en tienda */
  direccionEnvioId?: string | null;
  /** Solo admin */
  usuarioId?: string;
  items: CrearPedidoLineaPayload[];
}

export async function crearPedido(payload: CrearPedidoPayload): Promise<PedidoApi> {
  const res = await apiClient.post<unknown>('/api/pedidos', payload, BASE());
  const o = unwrapObject<Record<string, unknown>>(res) ?? (res as Record<string, unknown>);
  if (o && o.id != null) return normalizarPedido(o);
  throw new Error('No se pudo crear el pedido');
}

/** Actualización parcial (puede incluir totales u otros campos según exponga el PUT del backend). */
export type ActualizarPedidoPayload = Partial<{
  estado: EstadoPedidoUi;
  moneda: string;
  notasCliente: string;
  metodoPago: string;
  referenciaPago: string;
  direccionEnvioId: string | null;
  subtotal: number;
  costoEnvio: number;
  impuestos: number;
  descuento: number;
  total: number;
  direccionTextoCompleta: string;
}>;

export async function actualizarPedido(id: number, payload: ActualizarPedidoPayload): Promise<PedidoApi> {
  const res = await apiClient.put<unknown>(`/api/pedidos/${id}`, payload, BASE());
  const o = unwrapObject<Record<string, unknown>>(res) ?? (res as Record<string, unknown>);
  if (o && o.id != null) return normalizarPedido(o);
  throw new Error('No se pudo actualizar el pedido');
}

export async function eliminarPedido(id: number): Promise<void> {
  await apiClient.delete<void>(`/api/pedidos/${id}`, BASE());
}

// --- Ítems de pedido ---

export interface PedidoItemApi {
  id: number;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  nombreProducto?: string | null;
  tamanio?: string | null;
  pedidoId: number;
  productoId: number;
  presentacionId: number;
}

function normalizarPedidoItem(raw: Record<string, unknown>): PedidoItemApi {
  return {
    id: num(raw.id),
    cantidad: num(raw.cantidad, 1),
    precioUnitario: num(raw.precioUnitario ?? raw.precio_unitario),
    subtotal: num(raw.subtotal),
    nombreProducto: raw.nombreProducto != null ? str(raw.nombreProducto) : raw.nombre_producto != null ? str(raw.nombre_producto) : null,
    tamanio: raw.tamanio != null ? str(raw.tamanio) : raw.tamaño != null ? str(raw.tamaño) : null,
    pedidoId: num(raw.pedidoId ?? raw.pedido_id),
    productoId: num(raw.productoId ?? raw.producto_id),
    presentacionId: num(raw.presentacionId ?? raw.presentacion_id),
  };
}

export async function listarPedidoItems(pedidoId: number): Promise<PedidoItemApi[]> {
  const res = await apiClient.get<unknown>(`/api/pedidos/${pedidoId}/items`, BASE());
  return unwrapArray<Record<string, unknown>>(res).map((r) => normalizarPedidoItem(r));
}

/** Misma forma que cada línea en POST /api/pedidos (`PedidoItemLineDto`). */
export interface CrearPedidoItemPayload {
  productoId: number;
  presentacionId: number;
  cantidad: number;
}

export async function crearPedidoItem(pedidoId: number, payload: CrearPedidoItemPayload): Promise<PedidoItemApi> {
  const res = await apiClient.post<unknown>(`/api/pedidos/${pedidoId}/items`, payload, BASE());
  const o = unwrapObject<Record<string, unknown>>(res) ?? (res as Record<string, unknown>);
  if (o && o.id != null) return normalizarPedidoItem(o);
  throw new Error('No se pudo añadir el producto al pedido');
}

export async function actualizarPedidoItem(
  pedidoId: number,
  itemId: number,
  payload: Partial<CrearPedidoItemPayload>
): Promise<PedidoItemApi> {
  const res = await apiClient.put<unknown>(`/api/pedidos/${pedidoId}/items/${itemId}`, payload, BASE());
  const o = unwrapObject<Record<string, unknown>>(res) ?? (res as Record<string, unknown>);
  if (o && o.id != null) return normalizarPedidoItem(o);
  throw new Error('No se pudo actualizar el ítem del pedido');
}

export async function eliminarPedidoItem(pedidoId: number, itemId: number): Promise<void> {
  await apiClient.delete<void>(`/api/pedidos/${pedidoId}/items/${itemId}`, BASE());
}

// --- Pagos ---

export interface PagoApi {
  id: number;
  intentoNumero: number;
  monto: number;
  moneda: string;
  metodo: string;
  proveedor?: string | null;
  estado: string;
  referenciaExterna?: string | null;
  errorMensaje?: string | null;
  pagadoEn?: string | null;
  creadoEn?: string;
  pedidoId: number;
}

function normalizarPago(raw: Record<string, unknown>): PagoApi {
  return {
    id: num(raw.id),
    intentoNumero: num(raw.intentoNumero ?? raw.intento_numero, 1),
    monto: num(raw.monto),
    moneda: str(raw.moneda) || 'MXN',
    metodo: str(raw.metodo),
    proveedor: raw.proveedor != null ? str(raw.proveedor) : null,
    estado: str(raw.estado) || 'pendiente',
    referenciaExterna: raw.referenciaExterna != null ? str(raw.referenciaExterna) : raw.referencia_externa != null ? str(raw.referencia_externa) : null,
    errorMensaje: raw.errorMensaje != null ? str(raw.errorMensaje) : raw.error_mensaje != null ? str(raw.error_mensaje) : null,
    pagadoEn: raw.pagadoEn != null ? str(raw.pagadoEn) : raw.pagado_en != null ? str(raw.pagado_en) : null,
    creadoEn: raw.creadoEn != null ? str(raw.creadoEn) : raw.creado_en != null ? str(raw.creado_en) : undefined,
    pedidoId: num(raw.pedidoId ?? raw.pedido_id),
  };
}

export async function listarPagosPorPedido(pedidoId: number): Promise<PagoApi[]> {
  const res = await apiClient.get<unknown>(`/api/pagos/pedido/${pedidoId}`, BASE());
  return unwrapArray<Record<string, unknown>>(res).map((r) => normalizarPago(r));
}

export async function obtenerPago(id: number): Promise<PagoApi | null> {
  const res = await apiClient.get<unknown>(`/api/pagos/${id}`, BASE());
  const o = unwrapObject<Record<string, unknown>>(res);
  return o ? normalizarPago(o) : null;
}

export interface CrearPagoPayload {
  intentoNumero?: number;
  monto: number;
  moneda?: string;
  metodo: string;
  proveedor?: string;
  estado?: string;
  referenciaExterna?: string;
  errorMensaje?: string;
  pagadoEn?: string;
  payload?: Record<string, unknown>;
  pedidoId: number;
}

export async function crearPago(payload: CrearPagoPayload): Promise<PagoApi> {
  const res = await apiClient.post<unknown>('/api/pagos', payload, BASE());
  const o = unwrapObject<Record<string, unknown>>(res) ?? (res as Record<string, unknown>);
  if (o && o.id != null) return normalizarPago(o);
  throw new Error('No se pudo registrar el pago');
}

export type ActualizarPagoPayload = Partial<
  Pick<CrearPagoPayload, 'monto' | 'estado' | 'referenciaExterna' | 'errorMensaje' | 'pagadoEn' | 'payload'>
>;

export async function actualizarPagoParcial(id: number, payload: ActualizarPagoPayload): Promise<PagoApi> {
  const res = await apiClient.patch<unknown>(`/api/pagos/${id}`, payload, BASE());
  const o = unwrapObject<Record<string, unknown>>(res) ?? (res as Record<string, unknown>);
  if (o && o.id != null) return normalizarPago(o);
  throw new Error('No se pudo actualizar el pago');
}

// --- Historial estados pedido ---

export interface HistorialEstadoPedidoApi {
  id: number;
  estadoAnterior?: string | null;
  estadoNuevo: string;
  origen?: string | null;
  creadoEn?: string;
  pedidoId: number;
}

export async function listarHistorialPedido(pedidoId: number): Promise<HistorialEstadoPedidoApi[]> {
  const res = await apiClient.get<unknown>(`/api/historial-estados-pedido/pedido/${pedidoId}`, BASE());
  return unwrapArray<Record<string, unknown>>(res).map((r) => ({
    id: num(r.id),
    estadoAnterior: r.estadoAnterior != null ? str(r.estadoAnterior) : r.estado_anterior != null ? str(r.estado_anterior) : null,
    estadoNuevo: str(r.estadoNuevo ?? r.estado_nuevo),
    origen: r.origen != null ? str(r.origen) : null,
    creadoEn: str(r.creadoEn ?? r.creado_en),
    pedidoId: num(r.pedidoId ?? r.pedido_id),
  }));
}

// --- Envíos ---

export interface EnvioApi {
  id: number;
  empresaEnvio?: string | null;
  numeroGuia?: string | null;
  estadoEnvio: string;
  fechaEnvio?: string | null;
  fechaEntrega?: string | null;
  notas?: string | null;
  pedidoId: number;
}

function normalizarEnvio(raw: Record<string, unknown>): EnvioApi {
  return {
    id: num(raw.id),
    empresaEnvio: raw.empresaEnvio != null ? str(raw.empresaEnvio) : raw.empresa_envio != null ? str(raw.empresa_envio) : null,
    numeroGuia: raw.numeroGuia != null ? str(raw.numeroGuia) : raw.numero_guia != null ? str(raw.numero_guia) : null,
    estadoEnvio: str(raw.estadoEnvio ?? raw.estado_envio) || 'preparando',
    fechaEnvio: raw.fechaEnvio != null ? str(raw.fechaEnvio) : raw.fecha_envio != null ? str(raw.fecha_envio) : null,
    fechaEntrega: raw.fechaEntrega != null ? str(raw.fechaEntrega) : raw.fecha_entrega != null ? str(raw.fecha_entrega) : null,
    notas: raw.notas != null ? str(raw.notas) : null,
    pedidoId: num(raw.pedidoId ?? raw.pedido_id),
  };
}

export async function listarEnviosPorPedido(pedidoId: number): Promise<EnvioApi[]> {
  const res = await apiClient.get<unknown>(`/api/envios/pedido/${pedidoId}`, BASE());
  return unwrapArray<Record<string, unknown>>(res).map((r) => normalizarEnvio(r));
}

export async function obtenerEnvio(id: number): Promise<EnvioApi | null> {
  const res = await apiClient.get<unknown>(`/api/envios/${id}`, BASE());
  const o = unwrapObject<Record<string, unknown>>(res);
  return o ? normalizarEnvio(o) : null;
}

export interface CrearEnvioPayload {
  pedidoId: number;
  empresaEnvio?: string;
  numeroGuia?: string;
  estadoEnvio?: string;
  fechaEnvio?: string;
  fechaEntrega?: string;
  notas?: string;
}

export async function crearEnvio(payload: CrearEnvioPayload): Promise<EnvioApi> {
  const res = await apiClient.post<unknown>('/api/envios', payload, BASE());
  const o = unwrapObject<Record<string, unknown>>(res) ?? (res as Record<string, unknown>);
  if (o && o.id != null) return normalizarEnvio(o);
  throw new Error('No se pudo crear el envío');
}

export async function actualizarEnvio(id: number, payload: Partial<CrearEnvioPayload>): Promise<EnvioApi> {
  const res = await apiClient.put<unknown>(`/api/envios/${id}`, payload, BASE());
  const o = unwrapObject<Record<string, unknown>>(res) ?? (res as Record<string, unknown>);
  if (o && o.id != null) return normalizarEnvio(o);
  throw new Error('No se pudo actualizar el envío');
}

export async function eliminarEnvio(id: number): Promise<void> {
  await apiClient.delete<void>(`/api/envios/${id}`, BASE());
}

// --- Facturas ---

export type TipoDocumentoFactura = 'nota' | 'cfdi';

export interface FacturaApi {
  id: number;
  tipo: TipoDocumentoFactura;
  uuidFiscal?: string | null;
  folio?: string | null;
  serie?: string | null;
  rfc?: string | null;
  razonSocial?: string | null;
  xmlUrl?: string | null;
  pdfUrl?: string | null;
  estado?: string | null;
  clienteNombre?: string | null;
  concepto?: string | null;
  monto?: number | null;
  pedidoId?: number | null;
  creadoPorId?: string | null;
  creadoEn?: string;
}

function normalizarFactura(r: Record<string, unknown>): FacturaApi {
  const tipoRaw = str(r.tipo).toLowerCase();
  return {
    id: num(r.id),
    tipo: tipoRaw === 'nota' ? 'nota' : 'cfdi',
    uuidFiscal: str(r.uuidFiscal ?? r.uuid_fiscal) || null,
    folio: r.folio != null ? str(r.folio) : null,
    serie: r.serie != null ? str(r.serie) : null,
    rfc: r.rfc != null ? str(r.rfc) : null,
    razonSocial: str(r.razonSocial ?? r.razon_social) || null,
    xmlUrl: str(r.xmlUrl ?? r.xml_url) || null,
    pdfUrl: str(r.pdfUrl ?? r.pdf_url) || null,
    estado: r.estado != null ? str(r.estado) : null,
    clienteNombre: str(r.clienteNombre ?? r.cliente_nombre) || null,
    concepto: r.concepto != null ? str(r.concepto) : null,
    monto: r.monto != null ? num(r.monto) : null,
    pedidoId: (r.pedidoId ?? r.pedido_id) != null ? num(r.pedidoId ?? r.pedido_id) : null,
    creadoPorId: str(r.creadoPorId ?? r.creado_por_id) || null,
    creadoEn: str(r.creadoEn ?? r.creado_en),
  };
}

/** Todas las facturas/notas (con o sin pedido) — para el panel de administración. */
export async function listarFacturas(): Promise<FacturaApi[]> {
  const res = await apiClient.get<unknown>('/api/facturas', BASE());
  return unwrapArray<Record<string, unknown>>(res).map((r) => normalizarFactura(r));
}

export async function listarFacturasPorPedido(pedidoId: number): Promise<FacturaApi[]> {
  const res = await apiClient.get<unknown>(`/api/facturas/pedido/${pedidoId}`, BASE());
  return unwrapArray<Record<string, unknown>>(res).map((r) => normalizarFactura(r));
}

export async function obtenerFactura(id: number): Promise<FacturaApi | null> {
  const res = await apiClient.get<unknown>(`/api/facturas/${id}`, BASE());
  const o = unwrapObject<Record<string, unknown>>(res);
  return o ? normalizarFactura(o) : null;
}

export interface CrearFacturaPayload {
  tipo: TipoDocumentoFactura;
  pedidoId?: number;
  // nota
  clienteNombre?: string;
  concepto?: string;
  monto?: number;
  // cfdi
  uuidFiscal?: string;
  folio?: string;
  serie?: string;
  rfc?: string;
  razonSocial?: string;
  xmlUrl?: string;
  pdfUrl?: string;
  estado?: string;
}

export async function crearFactura(payload: CrearFacturaPayload): Promise<FacturaApi> {
  const res = await apiClient.post<unknown>('/api/facturas', payload, BASE());
  const o = unwrapObject<Record<string, unknown>>(res) ?? (res as Record<string, unknown>);
  if (o && o.id != null) return normalizarFactura(o);
  throw new Error('No se pudo crear la factura');
}

export async function actualizarFactura(id: number, payload: Partial<CrearFacturaPayload>): Promise<FacturaApi> {
  const res = await apiClient.put<unknown>(`/api/facturas/${id}`, payload, BASE());
  const o = unwrapObject<Record<string, unknown>>(res) ?? (res as Record<string, unknown>);
  if (o && o.id != null) return normalizarFactura(o);
  throw new Error('No se pudo actualizar la factura');
}

export async function eliminarFactura(id: number): Promise<void> {
  await apiClient.delete<void>(`/api/facturas/${id}`, BASE());
}

/** Todas las facturas ligadas a los pedidos del usuario autenticado. */
export async function listarFacturasDelCliente(): Promise<FacturaApi[]> {
  const pedidos = await listarPedidos();
  const todas: FacturaApi[] = [];
  for (const p of pedidos) {
    const facs = await listarFacturasPorPedido(p.id);
    todas.push(...facs);
  }
  return todas;
}

// --- Valoraciones ---

export interface ValoracionApi {
  id: number;
  puntuacion: number;
  comentario?: string | null;
  creadoEn?: string;
  usuarioId?: string;
  productoId: number;
  pedidoId: number;
}

function normalizarValoracion(r: Record<string, unknown>): ValoracionApi {
  return {
    id: num(r.id),
    puntuacion: num(r.puntuacion, 0),
    comentario: r.comentario != null ? str(r.comentario) : null,
    creadoEn: str(r.creadoEn ?? r.creado_en),
    usuarioId: str(r.usuarioId ?? r.usuario_id),
    productoId: num(r.productoId ?? r.producto_id),
    pedidoId: num(r.pedidoId ?? r.pedido_id),
  };
}

export async function listarValoracionesProducto(productoId: number): Promise<ValoracionApi[]> {
  const res = await apiClient.get<unknown>(`/api/valoraciones/producto/${productoId}`, {
    customBase: BASE(),
    skipAuth: true,
  });
  return unwrapArray<Record<string, unknown>>(res).map((r) => normalizarValoracion(r));
}

export async function obtenerValoracion(id: number): Promise<ValoracionApi | null> {
  const res = await apiClient.get<unknown>(`/api/valoraciones/${id}`, BASE());
  const o = unwrapObject<Record<string, unknown>>(res);
  return o ? normalizarValoracion(o) : null;
}

export interface CrearValoracionPayload {
  puntuacion: number;
  comentario?: string;
  productoId: number;
  pedidoId: number;
}

export async function crearValoracion(payload: CrearValoracionPayload): Promise<ValoracionApi> {
  const res = await apiClient.post<unknown>('/api/valoraciones', payload, BASE());
  const o = unwrapObject<Record<string, unknown>>(res) ?? (res as Record<string, unknown>);
  if (o && o.id != null) return normalizarValoracion(o);
  throw new Error('No se pudo crear la valoración');
}

export async function actualizarValoracion(
  id: number,
  payload: Partial<Pick<CrearValoracionPayload, 'puntuacion' | 'comentario'>>
): Promise<ValoracionApi> {
  const res = await apiClient.put<unknown>(`/api/valoraciones/${id}`, payload, BASE());
  const o = unwrapObject<Record<string, unknown>>(res) ?? (res as Record<string, unknown>);
  if (o && o.id != null) return normalizarValoracion(o);
  throw new Error('No se pudo actualizar la valoración');
}

export async function eliminarValoracion(id: number): Promise<void> {
  await apiClient.delete<void>(`/api/valoraciones/${id}`, BASE());
}

/** Etiquetas para UI (pedidos / mis compras). */
export function etiquetaEstadoPedido(estado: string): string {
  const m: Record<string, string> = {
    borrador: 'Borrador',
    pendiente_pago: 'Pendiente de pago',
    pagado: 'Pagado',
    preparando: 'Preparando',
    enviado: 'Enviado',
    entregado: 'Entregado',
    cancelado: 'Cancelado',
  };
  return m[estado] ?? estado.replace(/_/g, ' ');
}

export type BadgeVariant = 'default' | 'warning' | 'info' | 'success' | 'danger';

export function varianteBadgeEstadoPedido(estado: string): BadgeVariant {
  switch (estado) {
    case 'pendiente_pago':
    case 'borrador':
      return 'warning';
    case 'pagado':
    case 'preparando':
      return 'info';
    case 'enviado':
      return 'info';
    case 'entregado':
      return 'success';
    case 'cancelado':
      return 'danger';
    default:
      return 'default';
  }
}

/** Estados de pago según backend (`EstadoPago`). */
export function etiquetaEstadoPago(estado: string): string {
  const m: Record<string, string> = {
    pendiente: 'Pago pendiente',
    aprobado: 'Pago aprobado',
    rechazado: 'Pago rechazado',
    cancelado: 'Pago cancelado',
    reembolsado: 'Reembolsado',
  };
  return m[estado] ?? estado.replace(/_/g, ' ');
}

export function varianteBadgeEstadoPago(estado: string): BadgeVariant {
  switch (estado) {
    case 'aprobado':
      return 'success';
    case 'pendiente':
      return 'warning';
    case 'rechazado':
    case 'cancelado':
      return 'danger';
    case 'reembolsado':
      return 'info';
    default:
      return 'default';
  }
}

export async function listarValoracionesPedido(pedidoId: number): Promise<ValoracionApi[]> {
  const res = await apiClient.get<unknown>(`/api/valoraciones/pedido/${pedidoId}`, BASE());
  return unwrapArray<Record<string, unknown>>(res).map((r) => normalizarValoracion(r));
}

/** Pedidos del usuario que incluyen el producto (para elegir `pedido_id` al valorar). */
export async function listarPedidosQueIncluyenProducto(productoId: number): Promise<PedidoApi[]> {
  const pedidos = await listarPedidos();
  const elegibles: PedidoApi[] = [];
  for (const p of pedidos) {
    if (p.estado === 'cancelado' || p.estado === 'borrador') continue;
    try {
      const items = await listarPedidoItems(p.id);
      if (items.some((i) => i.productoId === productoId)) elegibles.push(p);
    } catch {
      /* ignorar */
    }
  }
  return elegibles;
}

// --- Devoluciones ---

export interface DevolucionApi {
  id: number;
  motivo?: string | null;
  estado: string;
  monto?: number | null;
  creadoEn?: string;
  actualizadoEn?: string;
  pedidoId: number;
  pedidoItemId?: number | null;
  pagoId?: number | null;
}

function normalizarDevolucion(r: Record<string, unknown>): DevolucionApi {
  return {
    id: num(r.id),
    motivo: r.motivo != null ? str(r.motivo) : null,
    estado: str(r.estado) || 'pendiente',
    monto: r.monto != null ? num(r.monto) : null,
    creadoEn: str(r.creadoEn ?? r.creado_en),
    actualizadoEn: str(r.actualizadoEn ?? r.actualizado_en),
    pedidoId: num(r.pedidoId ?? r.pedido_id),
    pedidoItemId:
      r.pedidoItemId != null ? num(r.pedidoItemId) : r.pedido_item_id != null ? num(r.pedido_item_id) : null,
    pagoId: r.pagoId != null ? num(r.pagoId) : r.pago_id != null ? num(r.pago_id) : null,
  };
}

export async function listarDevolucionesPedido(pedidoId: number): Promise<DevolucionApi[]> {
  const res = await apiClient.get<unknown>(`/api/devoluciones/pedido/${pedidoId}`, BASE());
  return unwrapArray<Record<string, unknown>>(res).map((r) => normalizarDevolucion(r));
}

export async function obtenerDevolucion(id: number): Promise<DevolucionApi | null> {
  const res = await apiClient.get<unknown>(`/api/devoluciones/${id}`, BASE());
  const o = unwrapObject<Record<string, unknown>>(res);
  return o ? normalizarDevolucion(o) : null;
}

export interface CrearDevolucionPayload {
  pedidoId: number;
  motivo?: string;
  estado?: string;
  monto?: number;
  pedidoItemId?: number;
  pagoId?: number;
}

export async function crearDevolucion(payload: CrearDevolucionPayload): Promise<DevolucionApi> {
  const res = await apiClient.post<unknown>('/api/devoluciones', payload, BASE());
  const o = unwrapObject<Record<string, unknown>>(res) ?? (res as Record<string, unknown>);
  if (o && o.id != null) return normalizarDevolucion(o);
  throw new Error('No se pudo crear la devolución');
}

export async function actualizarDevolucion(
  id: number,
  payload: Partial<CrearDevolucionPayload>
): Promise<DevolucionApi> {
  const res = await apiClient.put<unknown>(`/api/devoluciones/${id}`, payload, BASE());
  const o = unwrapObject<Record<string, unknown>>(res) ?? (res as Record<string, unknown>);
  if (o && o.id != null) return normalizarDevolucion(o);
  throw new Error('No se pudo actualizar la devolución');
}

export async function eliminarDevolucion(id: number): Promise<void> {
  await apiClient.delete<void>(`/api/devoluciones/${id}`, BASE());
}

export async function listarDevolucionesDelCliente(): Promise<DevolucionApi[]> {
  const pedidos = await listarPedidos();
  const todas: DevolucionApi[] = [];
  for (const p of pedidos) {
    const list = await listarDevolucionesPedido(p.id);
    todas.push(...list);
  }
  return todas;
}

// --- Notificaciones ---

export interface NotificacionApi {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  /** Json libre por tipo de notificación — ej. para tipo 'venta': { ventaId, folio, total }. */
  metadata?: Record<string, unknown> | null;
  creadoEn?: string;
  usuarioId?: string;
}

function normalizarNotificacion(r: Record<string, unknown>): NotificacionApi {
  const metadata = r.metadata;
  return {
    id: str(r.id),
    tipo: str(r.tipo),
    titulo: str(r.titulo),
    mensaje: str(r.mensaje),
    leida: Boolean(r.leida),
    metadata: metadata && typeof metadata === 'object' ? (metadata as Record<string, unknown>) : null,
    creadoEn: str(r.creadoEn ?? r.creado_en),
    usuarioId: str(r.usuarioId ?? r.usuario_id),
  };
}

export async function listarNotificaciones(): Promise<NotificacionApi[]> {
  const res = await apiClient.get<unknown>('/api/notificaciones', BASE());
  return unwrapArray<Record<string, unknown>>(res).map((r) => normalizarNotificacion(r));
}

export async function obtenerNotificacion(id: string): Promise<NotificacionApi | null> {
  const res = await apiClient.get<unknown>(`/api/notificaciones/${encodeURIComponent(id)}`, BASE());
  const o = unwrapObject<Record<string, unknown>>(res);
  return o ? normalizarNotificacion(o) : null;
}

export interface CrearNotificacionPayload {
  tipo: string;
  titulo: string;
  mensaje: string;
  usuarioId: string;
  metadata?: Record<string, unknown>;
}

export async function crearNotificacion(payload: CrearNotificacionPayload): Promise<NotificacionApi> {
  const res = await apiClient.post<unknown>('/api/notificaciones', payload, BASE());
  const o = unwrapObject<Record<string, unknown>>(res) ?? (res as Record<string, unknown>);
  if (o && o.id != null) return normalizarNotificacion(o);
  throw new Error('No se pudo crear la notificación');
}

export async function actualizarNotificacion(
  id: string,
  payload: Partial<{ tipo: string; titulo: string; mensaje: string; leida: boolean }>
): Promise<NotificacionApi> {
  const res = await apiClient.put<unknown>(`/api/notificaciones/${encodeURIComponent(id)}`, payload, BASE());
  const o = unwrapObject<Record<string, unknown>>(res) ?? (res as Record<string, unknown>);
  if (o && o.id != null) return normalizarNotificacion(o);
  throw new Error('No se pudo actualizar la notificación');
}

export async function eliminarNotificacion(id: string): Promise<void> {
  await apiClient.delete<void>(`/api/notificaciones/${encodeURIComponent(id)}`, BASE());
}
