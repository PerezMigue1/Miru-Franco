import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { COLOR_ORO, COLOR_TEXTO_CLARO, COLOR_VINO } from '../../utils/exportReportes';
import { diaEnMexico, formatearFechaSoloDia, hoyEnMexico } from '../../utils/fechaSoloDia';
import type { MisDatos } from '../../services/arco';
import {
  documentoYVersion,
  ETIQUETA_ESTADO_ARCO,
  ETIQUETA_TIPO_ARCO,
  etiquetaAccion,
  etiquetaConsentimiento,
  fechaHoraMexico,
} from './textosPrivacidad';
import { RESPONSABLE_DATOS } from './responsable';

/**
 * PDF legible de "mis datos" (derecho de acceso). Mismas secciones que el JSON de GET /arco/mis-datos, pero
 * sin datos de pago completos: de las referencias de pago solo la terminación, de las tarjetas lo que manda el
 * backend (marca, últimos 4 y vencimiento), y nunca identificadores de la pasarela (idExterno) ni de Google.
 */
export interface SeccionPdf {
  titulo: string;
  columnas: string[];
  filas: string[][];
}

type Registro = Record<string, unknown>;

const SIN_DATO = 'Sin dato';

function texto(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return SIN_DATO;
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (Array.isArray(valor)) return valor.length ? valor.map(texto).join(', ') : SIN_DATO;
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
}

/** "en_preparacion" a "En preparacion": estados y métodos del backend en texto legible. */
function legible(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return SIN_DATO;
  const t = String(valor).replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const DINERO = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

function dinero(valor: unknown): string {
  const n = Number(valor);
  return valor === null || valor === undefined || valor === '' || !Number.isFinite(n) ? SIN_DATO : DINERO.format(n);
}

/** Solo la terminación de una referencia de pago. */
function enmascarar(valor: unknown): string {
  const t = String(valor ?? '').replace(/[^A-Za-z0-9]/g, '');
  return t.length > 4 ? `terminación ${t.slice(-4)}` : 'registrada';
}

/** Marca de tiempo del backend en hora de México. */
function fechaDe(valor: unknown): string {
  return typeof valor === 'string' || valor instanceof Date ? fechaHoraMexico(valor) : SIN_DATO;
}

function lista(valor: unknown): Registro[] {
  return Array.isArray(valor) ? (valor.filter((v) => v && typeof v === 'object') as Registro[]) : [];
}

/** Registros de una sección conocida: una lista, o un solo registro si el backend lo manda como objeto. */
function registros(valor: unknown): Registro[] {
  return valor && typeof valor === 'object' && !Array.isArray(valor) ? [valor as Registro] : lista(valor);
}

function nombreDe(valor: unknown): string {
  return valor && typeof valor === 'object' ? texto((valor as Registro).nombre) : SIN_DATO;
}

/** Campos del perfil en el orden en que se leen; los que el backend agregue van al final con su nombre. */
const CAMPOS_PERFIL: [string, string, ((v: unknown) => string)?][] = [
  ['nombre', 'Nombre'],
  ['email', 'Correo'],
  ['telefono', 'Teléfono'],
  ['fechaNacimiento', 'Fecha de nacimiento', (v) => formatearFechaSoloDia(v as string, { day: '2-digit', month: '2-digit', year: 'numeric' }) ?? SIN_DATO],
  ['foto', 'Foto de perfil', (v) => (v ? 'Guardada' : 'Sin foto')],
  ['googleId', 'Cuenta de Google', (v) => (v ? 'Vinculada' : 'No vinculada')],
  ['rol', 'Rol', legible],
  ['aceptaAvisoPrivacidad', 'Aceptó el aviso de privacidad'],
  ['recibePromociones', 'Recibe promociones'],
  ['confirmado', 'Correo confirmado'],
  ['activo', 'Cuenta activa'],
  ['creadoEn', 'Cuenta creada', fechaDe],
  ['actualizadoEn', 'Última actualización', fechaDe],
  ['ultimaActividad', 'Última actividad', fechaDe],
  ['tipoCabello', 'Tipo de cabello'],
  ['colorNatural', 'Color natural'],
  ['colorActual', 'Color actual'],
  ['productosUsados', 'Productos que has usado'],
  ['alergias', 'Alergias'],
  ['tratamientosQuimicos', 'Tratamientos químicos'],
  ['tratamientos', 'Tratamientos'],
  ['id', 'Identificador de tu cuenta'],
];

/** Nunca van al PDF aunque el backend los mande (en las secciones sin lista blanca y en el perfil). */
const CAMPOS_OCULTOS = new Set(['idExterno', 'password', 'referenciaPago', 'referenciaExterna', 'payload']);

function filasPerfil(perfil: Registro): string[][] {
  const conocidos = new Set(CAMPOS_PERFIL.map(([k]) => k));
  const filas = CAMPOS_PERFIL.filter(([k]) => k in perfil).map(([k, etiqueta, formato]) => [
    etiqueta,
    (formato ?? texto)(perfil[k]),
  ]);
  for (const [k, v] of Object.entries(perfil)) {
    if (!conocidos.has(k) && !CAMPOS_OCULTOS.has(k)) filas.push([legible(k), texto(v)]);
  }
  return filas;
}

const SECCIONES: { clave: string; titulo: string; columnas: string[]; fila: (r: Registro) => string[] }[] = [
  {
    clave: 'direcciones',
    titulo: 'Direcciones',
    columnas: ['Dirección', 'Contacto', 'Tipo', 'Principal'],
    fila: (r) => [
      [
        r.calle,
        r.numeroInterior ? `int. ${r.numeroInterior}` : null,
        r.coloniaBarrio,
        r.localidad,
        r.municipioAlcaldia,
        r.estado,
        r.codigoPostal ? `C.P. ${r.codigoPostal}` : null,
        r.indicaciones ? `Indicaciones: ${r.indicaciones}` : null,
      ]
        .filter(Boolean)
        .join(', ') || SIN_DATO,
      [r.contactoNombreApellido, r.contactoTelefono].filter(Boolean).join(', ') || SIN_DATO,
      legible(r.tipoDomicilio),
      texto(r.esPrincipal ?? false),
    ],
  },
  {
    clave: 'pedidos',
    titulo: 'Pedidos',
    columnas: ['Pedido', 'Fecha', 'Estado', 'Artículos', 'Total', 'Pago'],
    fila: (r) => [
      `#${texto(r.id)}`,
      fechaHoraMexico(r.creadoEn as string),
      legible(r.estado),
      lista(r.items)
        .map((i) => `${texto(i.cantidad)} x ${i.nombreProducto ? String(i.nombreProducto) : 'Producto'}${i.tamanio ? ` (${String(i.tamanio)})` : ''}`)
        .join('; ') || SIN_DATO,
      dinero(r.total),
      [
        r.metodoPago ? legible(r.metodoPago) : null,
        r.referenciaPago ? `referencia ${enmascarar(r.referenciaPago)}` : null,
        r.pagadoEn ? `pagado el ${fechaHoraMexico(r.pagadoEn as string)}` : null,
      ]
        .filter(Boolean)
        .join(', ') || 'Sin pago',
    ],
  },
  {
    // Sin el payload ni la referencia de la pasarela (el backend no los manda) ni quién cobró en el salón
    clave: 'pagos',
    titulo: 'Pagos',
    columnas: ['Fecha', 'Concepto', 'Método', 'Monto', 'Estado'],
    fila: (r) => [
      fechaDe(r.creadoEn),
      r.pedidoId ? `Pedido #${texto(r.pedidoId)}` : r.citaId ? `Anticipo de la cita #${texto(r.citaId)}` : SIN_DATO,
      `${legible(r.metodo)}${r.proveedor ? ` (${legible(r.proveedor)})` : ''}`,
      dinero(r.monto),
      [legible(r.estado), r.pagadoEn ? `pagado el ${fechaDe(r.pagadoEn)}` : null].filter(Boolean).join(', '),
    ],
  },
  {
    // Sin quién del personal la resolvió
    clave: 'devoluciones',
    titulo: 'Devoluciones',
    columnas: ['Fecha', 'Pedido', 'Tipo', 'Motivo', 'Estado', 'Monto', 'Resolución'],
    fila: (r) => [
      fechaDe(r.creadoEn),
      r.pedidoId ? `#${texto(r.pedidoId)}` : SIN_DATO,
      legible(r.tipo),
      texto(r.motivo),
      legible(r.estado),
      dinero(r.monto),
      [r.notaResolucion ? String(r.notaResolucion) : null, r.resueltoEn ? `(resuelta el ${fechaDe(r.resueltoEn)})` : null]
        .filter(Boolean)
        .join(' ') || 'Sin resolver',
    ],
  },
  {
    clave: 'citas',
    titulo: 'Citas',
    columnas: ['Fecha y hora', 'Servicio', 'Especialista', 'Estado', 'Anticipo', 'Notas'],
    fila: (r) => [
      fechaHoraMexico(r.fechaHoraInicio as string),
      nombreDe(r.servicio),
      nombreDe(r.especialista),
      legible(r.estado),
      r.anticipoRequerido ? `${dinero(r.anticipoRequerido)}, ${r.anticipoPagadoEn ? 'pagado' : 'sin pagar'}` : 'Sin anticipo',
      texto(r.notas),
    ],
  },
  {
    clave: 'seguimientos',
    titulo: 'Seguimientos de tus servicios',
    columnas: ['Fecha de contacto', 'Satisfacción', 'Notas', 'Requiere atención'],
    fila: (r) => [fechaDe(r.fechaContacto), texto(r.satisfaccion), texto(r.notas), texto(r.requiereAccion ?? false)],
  },
  {
    clave: 'ventasSalon',
    titulo: 'Compras en el salón',
    columnas: ['Folio', 'Fecha', 'Estado', 'Conceptos', 'Método de pago', 'Total'],
    fila: (r) => [
      texto(r.folio),
      fechaHoraMexico(r.creadoEn as string),
      legible(r.estado),
      lista(r.items)
        .map((i) => {
          const servicio = i.servicio as Registro | null | undefined;
          const presentacion = i.presentacion as Registro | null | undefined;
          const nombre = servicio?.nombre ?? (presentacion?.producto as Registro | undefined)?.nombre ?? 'Concepto';
          return `${texto(i.cantidad)} x ${String(nombre)}`;
        })
        .join('; ') || SIN_DATO,
      legible(r.metodoPago),
      dinero(r.total),
    ],
  },
  {
    clave: 'facturas',
    titulo: 'Facturas',
    columnas: ['Folio', 'Fecha', 'Tipo', 'RFC', 'Razón social', 'Monto', 'Estado'],
    fila: (r) => [
      [r.serie, r.folio].filter(Boolean).join('-') || texto(r.uuidFiscal),
      fechaHoraMexico(r.creadoEn as string),
      legible(r.tipo),
      texto(r.rfc),
      texto(r.razonSocial),
      dinero(r.monto),
      legible(r.estado),
    ],
  },
  {
    // Solo lo que manda el backend (SELECT_TARJETA_MIS_DATOS): marca, últimos 4 y vencimiento
    clave: 'metodosPago',
    titulo: 'Tarjetas guardadas',
    columnas: ['Tarjeta', 'Vence'],
    fila: (r) => [
      `${r.marca ? legible(r.marca) : 'Tarjeta'} terminación ${texto(r.ultimos4)}`,
      r.expMes && r.expAnio ? `${String(r.expMes).padStart(2, '0')}/${String(r.expAnio)}` : SIN_DATO,
    ],
  },
  {
    clave: 'consentimientos',
    titulo: 'Consentimientos',
    columnas: ['Fecha y hora', 'Consentimiento', 'Documento', 'Acción', 'Formulario'],
    fila: (r) => [
      fechaHoraMexico(r.creadoEn as string),
      etiquetaConsentimiento(String(r.tipo ?? '')),
      documentoYVersion({ documentoSlug: (r.documentoSlug as string) ?? null, documentoVersion: (r.documentoVersion as string) ?? null }),
      etiquetaAccion(String(r.accion ?? '')),
      texto(r.formulario),
    ],
  },
  {
    clave: 'solicitudesArco',
    titulo: 'Solicitudes de derechos ARCO',
    columnas: ['Folio', 'Tipo', 'Estado', 'Recibida', 'Respuesta'],
    fila: (r) => [
      texto(r.folio),
      ETIQUETA_TIPO_ARCO[r.tipo as keyof typeof ETIQUETA_TIPO_ARCO] ?? legible(r.tipo),
      ETIQUETA_ESTADO_ARCO[r.estado as keyof typeof ETIQUETA_ESTADO_ARCO] ?? legible(r.estado),
      fechaHoraMexico(r.creadaEn as string),
      r.respuesta ? String(r.respuesta) : 'Sin respuesta todavía',
    ],
  },
  {
    clave: 'quejas',
    titulo: 'Quejas',
    columnas: ['Fecha', 'Asunto', 'Descripción', 'Estado'],
    fila: (r) => [fechaHoraMexico(r.creadoEn as string), texto(r.asunto), texto(r.descripcion), legible(r.estado)],
  },
  {
    clave: 'valoraciones',
    titulo: 'Valoraciones',
    columnas: ['Fecha', 'Producto', 'Puntuación', 'Comentario'],
    fila: (r) => [fechaHoraMexico(r.creadoEn as string), nombreDe(r.producto), texto(r.puntuacion), texto(r.comentario)],
  },
  {
    clave: 'cotizaciones',
    titulo: 'Cotizaciones',
    columnas: ['Fecha del evento', 'Paquete', 'Personas', 'Monto', 'Anticipo', 'Estado'],
    fila: (r) => [
      formatearFechaSoloDia(r.fechaEvento as string, { day: '2-digit', month: '2-digit', year: 'numeric' }) ?? SIN_DATO,
      legible((r.paquete as Registro | undefined)?.tipo_evento),
      texto(r.cantidadPersonas),
      dinero(r.monto),
      dinero(r.anticipo),
      legible(r.estado),
    ],
  },
  {
    // Observaciones que el personal registró sobre ella (sin quién las escribió)
    clave: 'observaciones',
    titulo: 'Notas del personal',
    columnas: ['Fecha', 'Nota'],
    fila: (r) => [fechaDe(r.creadoEn), texto(r.texto)],
  },
  {
    // Sin metadatos internos ni enlaces de la app
    clave: 'notificaciones',
    titulo: 'Avisos que te enviamos',
    columnas: ['Fecha', 'Título', 'Mensaje', 'Leído'],
    fila: (r) => [fechaDe(r.creadoEn), texto(r.titulo), texto(r.mensaje), texto(r.leida ?? false)],
  },
  {
    clave: 'preferenciasNotificacion',
    titulo: 'Preferencias de avisos',
    columnas: ['Aviso', 'Canal', 'Activo'],
    fila: (r) => [legible(r.tipo), legible(r.canal), texto(r.activo ?? true)],
  },
];

/** Secciones que no son tablas de registros. */
const NO_SON_SECCIONES = new Set(['generadoEn', 'perfil']);

/** Las secciones del PDF, en orden: perfil, las conocidas y cualquier otra lista que mande el backend. */
export function seccionesMisDatos(datos: MisDatos): SeccionPdf[] {
  const secciones: SeccionPdf[] = [
    { titulo: 'Perfil', columnas: ['Dato', 'Valor'], filas: filasPerfil((datos.perfil ?? {}) as Registro) },
  ];
  const conocidas = new Set(SECCIONES.map((s) => s.clave));
  for (const s of SECCIONES) {
    if (!(s.clave in datos)) continue;
    secciones.push({ titulo: s.titulo, columnas: s.columnas, filas: registros(datos[s.clave]).map(s.fila) });
  }
  for (const [clave, valor] of Object.entries(datos)) {
    if (conocidas.has(clave) || NO_SON_SECCIONES.has(clave) || !Array.isArray(valor)) continue;
    secciones.push({
      titulo: legible(clave),
      columnas: ['Registro', 'Datos'],
      filas: lista(valor).map((r, i) => [
        String(i + 1),
        Object.entries(r)
          .filter(([k]) => !CAMPOS_OCULTOS.has(k))
          .map(([k, v]) => `${legible(k)}: ${texto(v)}`)
          .join('; '),
      ]),
    });
  }
  return secciones;
}

export function nombrePdfMisDatos(datos: MisDatos): string {
  return `mis-datos-miru-franco-${diaEnMexico(datos.generadoEn) ?? hoyEnMexico()}.pdf`;
}

const MARGEN = 14;

/** Aviso al inicio del PDF: qué trae y qué oculta. */
export const NOTA_PDF_MIS_DATOS =
  'Copia de los datos personales que guardamos de ti (derecho de acceso). Este PDF es la versión para leer: oculta las referencias de pago completas (solo muestra su terminación) y el identificador de tu cuenta de Google. De tus tarjetas muestra la marca, la terminación y el vencimiento; el sitio nunca guarda el número completo de la tarjeta. El archivo JSON trae estos datos con las referencias de pago completas y, de tus tarjetas, solo la marca, la terminación y el vencimiento. Ninguno incluye contraseñas.';

/** Documento listo para guardar (la pantalla llama a `.save(nombrePdfMisDatos(datos))`). */
export function crearPdfMisDatos(datos: MisDatos): jsPDF {
  const doc = new jsPDF();
  const ancho = doc.internal.pageSize.getWidth();

  doc.setFillColor(...COLOR_VINO);
  doc.rect(0, 0, ancho, 28, 'F');
  doc.setTextColor(...COLOR_TEXTO_CLARO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(RESPONSABLE_DATOS.nombreComercial, MARGEN, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Mis datos personales', MARGEN, 20);

  const perfil = (datos.perfil ?? {}) as Registro;
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(10);
  doc.text(`Titular: ${texto(perfil.nombre)} (${texto(perfil.email)})`, MARGEN, 36);
  doc.text(`Generado: ${fechaHoraMexico(datos.generadoEn)} (hora del centro de México)`, MARGEN, 42);
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const nota = doc.splitTextToSize(NOTA_PDF_MIS_DATOS, ancho - MARGEN * 2);
  doc.text(nota, MARGEN, 49);
  let y = 49 + nota.length * 4.5 + 4;

  for (const seccion of seccionesMisDatos(datos)) {
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLOR_VINO);
    doc.text(seccion.titulo, MARGEN, y);
    doc.setFont('helvetica', 'normal');
    if (seccion.filas.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text('Sin registros.', MARGEN, y + 7);
      y += 16;
      continue;
    }
    autoTable(doc, {
      startY: y + 3,
      head: [seccion.columnas],
      body: seccion.filas,
      margin: { left: MARGEN, right: MARGEN, bottom: 16 },
      headStyles: { fillColor: COLOR_ORO, textColor: COLOR_TEXTO_CLARO, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 238, 231] },
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
    });
    // @ts-expect-error lastAutoTable lo agrega jspdf-autotable en tiempo de ejecución
    y = ((doc.lastAutoTable?.finalY as number | undefined) ?? y) + 10;
  }

  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text(`Página ${p} de ${paginas}`, ancho - MARGEN, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
  }
  return doc;
}
