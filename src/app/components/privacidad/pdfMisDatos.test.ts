import { describe, expect, it } from 'vitest';
import { crearPdfMisDatos, nombrePdfMisDatos, NOTA_PDF_MIS_DATOS, seccionesMisDatos } from './pdfMisDatos';
import type { MisDatos } from '../../services/arco';

const REFERENCIA_PAGO = 'MP-99887766-5678';
const ID_EXTERNO = 'card_tok_ABCDEF123456';
/** Forma real de cada tarjeta en GET /arco/mis-datos (backend-miru src/arco/arco.service.ts, SELECT_TARJETA_MIS_DATOS). */
const TARJETA_BACKEND = { marca: 'visa', ultimos4: '4242', expMes: 7, expAnio: 2029 };

const datos: MisDatos = {
  generadoEn: '2026-10-14T19:30:00.000Z',
  perfil: {
    id: 'u-1',
    nombre: 'Ana López',
    email: 'ana@correo.com',
    telefono: '7711234567',
    fechaNacimiento: '1995-03-08T00:00:00.000Z',
    foto: 'https://res.cloudinary.com/x/foto.jpg',
    googleId: '1122334455',
    rol: 'cliente',
    recibePromociones: true,
    alergias: 'Amoniaco',
    tratamientosQuimicos: false,
  },
  direcciones: [
    {
      calle: 'Allende 15',
      numeroInterior: null,
      coloniaBarrio: 'Juárez',
      localidad: 'Huejutla',
      municipioAlcaldia: 'Huejutla de Reyes',
      estado: 'Hidalgo',
      codigoPostal: '43000',
      contactoNombreApellido: 'Ana López',
      contactoTelefono: '7711234567',
      tipoDomicilio: 'casa',
      esPrincipal: true,
    },
  ],
  pedidos: [
    {
      id: 41,
      estado: 'pagado',
      total: '350.00',
      metodoPago: 'tarjeta',
      referenciaPago: REFERENCIA_PAGO,
      creadoEn: '2026-10-01T17:00:00.000Z',
      items: [{ id: 1, nombreProducto: 'Fluido Di Goji', tamanio: '120 ml', cantidad: 2, precioUnitario: '175.00', subtotal: '350.00' }],
    },
  ],
  citas: [
    {
      fechaHoraInicio: '2026-10-20T16:00:00.000Z',
      estado: 'confirmada',
      notas: null,
      servicio: { id: 3, nombre: 'Corte' },
      especialista: { id: 'e-1', nombre: 'Rubí' },
    },
  ],
  metodosPago: [TARJETA_BACKEND],
  consentimientos: [],
  solicitudesArco: [],
};

/**
 * Secciones nuevas de GET /arco/mis-datos (contrato con backend-miru): seguimientos, devoluciones, pagos,
 * notificaciones y preferencias de notificación, con los campos de sus modelos de Prisma.
 */
const REFERENCIA_EXTERNA = 'MP-1234567890123';
const datosNuevos: MisDatos = {
  generadoEn: '2026-10-14T19:30:00.000Z',
  perfil: { nombre: 'Ana López' },
  pagos: [
    {
      id: 5,
      intentoNumero: 1,
      pedidoId: 41,
      citaId: null,
      monto: '350.00',
      moneda: 'MXN',
      metodo: 'tarjeta',
      proveedor: 'mercadopago',
      estado: 'aprobado',
      referenciaExterna: REFERENCIA_EXTERNA,
      payload: { card: { id: 'tok_secreto' } },
      errorMensaje: null,
      pagadoEn: '2026-10-01T17:05:00.000Z',
      creadoEn: '2026-10-01T17:00:00.000Z',
      cobradoPorId: 'emp-cobro-1',
      corteId: 3,
    },
    { id: 6, pedidoId: null, citaId: 9, monto: '200.00', metodo: 'efectivo', proveedor: null, estado: 'pendiente', referenciaExterna: null, creadoEn: '2026-10-02T17:00:00.000Z' },
  ],
  devoluciones: [
    {
      id: 2,
      pedidoId: 41,
      pedidoItemId: 1,
      pagoId: 5,
      motivo: 'Llegó abierto',
      estado: 'aprobada',
      monto: '175.00',
      tipo: 'reembolso',
      metodoReembolso: 'metodo_original',
      origen: 'solicitud',
      notaResolucion: 'Procede el reembolso',
      resueltoEn: '2026-10-03T17:00:00.000Z',
      resueltoPorId: 'admin-resuelve-9',
      creadoEn: '2026-10-02T17:00:00.000Z',
    },
  ],
  seguimientos: [
    {
      id: 3,
      notas: 'Le encantó el tono',
      fechaContacto: '2026-10-05T16:00:00.000Z',
      satisfaccion: 5,
      requiereAccion: false,
      citaId: 9,
      usuarioId: 'u-1',
      creadoEn: '2026-10-05T16:00:00.000Z',
    },
  ],
  notificaciones: [
    {
      id: 'n-1',
      tipo: 'cita_recordatorio',
      titulo: 'Tu cita es mañana',
      mensaje: 'Te esperamos a las 10:00',
      leida: true,
      metadata: { interno: 'meta-secreta' },
      urlAccion: '/cliente/servicios-citas/mis-citas/9',
      entidadId: '9',
      creadoEn: '2026-10-19T16:00:00.000Z',
    },
  ],
  preferenciasNotificacion: [{ usuarioId: 'u-1', tipo: 'promociones', canal: 'email', activo: false, creadoEn: '2026-09-01T16:00:00.000Z' }],
  observaciones: [{ id: 8, texto: 'Prefiere citas en la mañana', creadoEn: '2026-09-20T16:00:00.000Z' }],
};

describe('PDF de mis datos: secciones nuevas del backend, legibles y con lista blanca', () => {
  const seccion = (titulo: string, datos: MisDatos = datosNuevos) => seccionesMisDatos(datos).find((s) => s.titulo === titulo)!;

  it('pagos: concepto, método, monto y estado, sin columna de referencia (el backend no la manda)', () => {
    const pagos = seccion('Pagos');
    expect(pagos.columnas).toEqual(['Fecha', 'Concepto', 'Método', 'Monto', 'Estado']);
    expect(pagos.filas).toEqual([
      ['01/10/2026 11:00', 'Pedido #41', 'Tarjeta (Mercadopago)', '$350.00', 'Aprobado, pagado el 01/10/2026 11:05'],
      ['02/10/2026 11:00', 'Anticipo de la cita #9', 'Efectivo', '$200.00', 'Pendiente'],
    ]);
    const texto = JSON.stringify(pagos);
    for (const oculto of [REFERENCIA_EXTERNA, 'tok_secreto', 'emp-cobro-1']) expect(texto).not.toContain(oculto);
  });

  it('devoluciones: pedido, tipo, motivo, estado, monto y resolución, sin quién del personal la resolvió', () => {
    const devoluciones = seccion('Devoluciones');
    expect(devoluciones.columnas).toEqual(['Fecha', 'Pedido', 'Tipo', 'Motivo', 'Estado', 'Monto', 'Resolución']);
    expect(devoluciones.filas).toEqual([
      ['02/10/2026 11:00', '#41', 'Reembolso', 'Llegó abierto', 'Aprobada', '$175.00', 'Procede el reembolso (resuelta el 03/10/2026 11:00)'],
    ]);
    expect(JSON.stringify(devoluciones)).not.toContain('admin-resuelve-9');
  });

  it('seguimientos de tus servicios: fecha de contacto, satisfacción, notas y si requiere atención', () => {
    const seguimientos = seccion('Seguimientos de tus servicios');
    expect(seguimientos.columnas).toEqual(['Fecha de contacto', 'Satisfacción', 'Notas', 'Requiere atención']);
    expect(seguimientos.filas).toEqual([['05/10/2026 10:00', '5', 'Le encantó el tono', 'No']]);
  });

  it('avisos que te enviamos: fecha, título, mensaje y si lo leíste, sin metadatos internos', () => {
    const avisos = seccion('Avisos que te enviamos');
    expect(avisos.columnas).toEqual(['Fecha', 'Título', 'Mensaje', 'Leído']);
    expect(avisos.filas).toEqual([['19/10/2026 10:00', 'Tu cita es mañana', 'Te esperamos a las 10:00', 'Sí']]);
    expect(JSON.stringify(avisos)).not.toContain('meta-secreta');
  });

  it('preferencias de avisos: aviso, canal y si está activo; también si el backend la manda como un solo registro', () => {
    const preferencias = seccion('Preferencias de avisos');
    expect(preferencias.columnas).toEqual(['Aviso', 'Canal', 'Activo']);
    expect(preferencias.filas).toEqual([['Promociones', 'Email', 'No']]);
    const unSolo = seccion('Preferencias de avisos', { ...datosNuevos, preferenciasNotificacion: { tipo: 'citas', canal: 'push', activo: true } });
    expect(unSolo.filas).toEqual([['Citas', 'Push', 'Sí']]);
  });

  it('notas del personal: la fecha y el texto', () => {
    const notas = seccion('Notas del personal');
    expect(notas.columnas).toEqual(['Fecha', 'Nota']);
    expect(notas.filas).toEqual([['20/09/2026 10:00', 'Prefiere citas en la mañana']]);
  });

  it('ninguna sección nueva cae en la tabla genérica', () => {
    const titulos = seccionesMisDatos(datosNuevos).map((s) => s.titulo);
    for (const generico of ['Pagos nuevos', 'Seguimientos', 'Notificaciones', 'PreferenciasNotificacion', 'Observaciones']) {
      expect(titulos).not.toContain(generico);
    }
  });
});

describe('PDF de mis datos: secciones legibles', () => {
  it('arma las secciones del JSON en orden, empezando por el perfil', () => {
    const titulos = seccionesMisDatos(datos).map((s) => s.titulo);
    expect(titulos.slice(0, 4)).toEqual(['Perfil', 'Direcciones', 'Pedidos', 'Citas']);
    expect(titulos).toContain('Tarjetas guardadas');
    expect(titulos).toContain('Consentimientos');
    expect(titulos).toContain('Solicitudes de derechos ARCO');
  });

  it('el perfil se lee como dato y valor, con fechas de México y sin identificadores técnicos', () => {
    const perfil = seccionesMisDatos(datos)[0];
    expect(perfil.columnas).toEqual(['Dato', 'Valor']);
    const mapa = Object.fromEntries(perfil.filas.map(([k, v]) => [k, v]));
    expect(mapa['Nombre']).toBe('Ana López');
    expect(mapa['Correo']).toBe('ana@correo.com');
    expect(mapa['Fecha de nacimiento']).toBe('08/03/1995');
    expect(mapa['Alergias']).toBe('Amoniaco');
    expect(mapa['Recibe promociones']).toBe('Sí');
    expect(mapa['Tratamientos químicos']).toBe('No');
    expect(mapa['Cuenta de Google']).toBe('Vinculada');
    expect(JSON.stringify(perfil.filas)).not.toContain('1122334455');
  });

  it('los pedidos muestran artículos y total, y la referencia de pago solo con su terminación', () => {
    const pedidos = seccionesMisDatos(datos).find((s) => s.titulo === 'Pedidos')!;
    const [fila] = pedidos.filas;
    expect(fila[0]).toBe('#41');
    expect(fila).toContain('2 x Fluido Di Goji (120 ml)');
    expect(fila.join(' ')).toContain('$350.00');
    expect(fila.join(' ')).toContain('terminación 5678');
    expect(JSON.stringify(pedidos.filas)).not.toContain(REFERENCIA_PAGO);
  });

  it('las tarjetas guardadas muestran solo lo que manda el backend: marca, terminación y vencimiento', () => {
    const tarjetas = seccionesMisDatos(datos).find((s) => s.titulo === 'Tarjetas guardadas')!;
    // Sin Banco, Predeterminada ni Activa: el backend no los manda y el PDF no debe inventarlos
    expect(tarjetas.columnas).toEqual(['Tarjeta', 'Vence']);
    expect(tarjetas.filas).toEqual([['Visa terminación 4242', '07/2029']]);
  });

  it('aunque el backend mandara el identificador de la pasarela de una tarjeta, no sale en el PDF', () => {
    const tarjetas = seccionesMisDatos({ ...datos, metodosPago: [{ ...TARJETA_BACKEND, idExterno: ID_EXTERNO }] }).find(
      (s) => s.titulo === 'Tarjetas guardadas',
    )!;
    expect(JSON.stringify(tarjetas.filas)).not.toContain(ID_EXTERNO);
  });

  it('el aviso del PDF dice la verdad sobre las tarjetas: marca, terminación y vencimiento, nunca el número completo', () => {
    expect(NOTA_PDF_MIS_DATOS).toContain('la marca, la terminación y el vencimiento');
    expect(NOTA_PDF_MIS_DATOS).toContain('nunca guarda el número completo de la tarjeta');
    expect(NOTA_PDF_MIS_DATOS).not.toMatch(/solo conservamos la marca y la terminación/);
  });

  it('el aviso del PDF no dice que el JSON trae lo mismo: el JSON trae todo, con las referencias de pago completas', () => {
    expect(NOTA_PDF_MIS_DATOS).toContain(
      'El archivo JSON trae estos datos con las referencias de pago completas y, de tus tarjetas, solo la marca, la terminación y el vencimiento.',
    );
    expect(NOTA_PDF_MIS_DATOS).not.toMatch(/tal como l[oa]s guardamos/);
    expect(NOTA_PDF_MIS_DATOS).toContain('oculta las referencias de pago completas');
    expect(NOTA_PDF_MIS_DATOS).not.toMatch(/lo mismo|los mismos datos/);
    expect(NOTA_PDF_MIS_DATOS).not.toMatch(/(no|ninguno) incluye[^.]*datos completos de pago/i);
  });

  it('una sección sin registros queda vacía (el PDF dice "Sin registros")', () => {
    const consentimientos = seccionesMisDatos(datos).find((s) => s.titulo === 'Consentimientos')!;
    expect(consentimientos.filas).toEqual([]);
  });

  it('el PDF lleva título, titular y secciones, sin datos de pago completos', () => {
    const doc = crearPdfMisDatos(datos);
    const salida = doc.output();
    expect(salida).toContain('Mis datos personales');
    expect(salida).toContain('Ana L');
    expect(salida).toContain('Sin registros.');
    expect(salida).not.toContain(REFERENCIA_PAGO);
    expect(salida).not.toContain(ID_EXTERNO);
  });

  it('una sección que el backend agregue sin lista blanca tampoco muestra identificadores de pago ni de la pasarela', () => {
    const texto = JSON.stringify(
      seccionesMisDatos({
        generadoEn: '2026-10-14T19:30:00.000Z',
        perfil: {},
        pagosNuevos: [{ idExterno: 'card_tok_ABC', referenciaPago: 'MP-1234567890', referenciaExterna: 'pay_998877', payload: { token: 'tok_x' }, monto: '10.00' }],
      }),
    );
    for (const oculto of ['card_tok_ABC', 'MP-1234567890', 'pay_998877', 'tok_x']) expect(texto).not.toContain(oculto);
    expect(texto).toContain('10.00');
  });

  it('el archivo PDF se nombra con el día de México de la generación', () => {
    expect(nombrePdfMisDatos(datos)).toBe('mis-datos-miru-franco-2026-10-14.pdf');
  });
});
