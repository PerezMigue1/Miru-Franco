import type { ReactNode } from 'react';

/**
 * Textos del sitio administrables (Admin > Textos del sitio). El backend publica los textos públicos en
 * GET /api/configuracion-publica (campo `textos`) con las variables de reglas ya llenas; las de contexto ({saldo},
 * {servicio}...) quedan con llaves y las llena cada pantalla.
 *
 * TEXTOS_POR_OMISION son los textos de hoy (los mismos valores por defecto del catálogo del backend,
 * backend-miru/src/textos-sitio/catalogo.ts; su prueba revisa que no se separen). Solo se usan si el API no responde.
 * Se quedan en el código las etiquetas genéricas de los controles, los mensajes de validación y los textos de las
 * casillas de consentimiento (evidencia legal ligada a una versión publicada).
 */
export const TEXTOS_POR_OMISION: Readonly<Record<string, string>> = {
  "citas.crear.sinDatosTitulo": "Aún no has elegido un servicio y horario",
  "citas.crear.sinDatosTexto": "Elige el servicio que quieres, luego el especialista, el día y la hora. Después vuelves aquí para confirmar.",
  "citas.crear.tituloConfirmar": "Confirma tu cita",
  "citas.crear.anticipoDescuentoSaldo": "Se descuenta del total: el día de tu cita pagas {saldo} en el salón.",
  "citas.crear.anticipoDescuento": "Se descuenta del total el día de tu cita.",
  "citas.crear.botonConfirmar": "Confirmar cita",
  "citas.crear.botonConfirmarLinea": "Confirmar y pagar anticipo",
  "citas.crear.botonConfirmarSalon": "Confirmar y pagar en el salón",
  "citas.formaPago.anticipoEtiqueta": "Anticipo para apartar tu cita",
  "citas.formaPago.saldoEtiqueta": "Pagas en el salón el día de tu cita",
  "citas.formaPago.pregunta": "¿Cómo quieres pagar el anticipo?",
  "citas.formaPago.opcionLinea": "Pagar anticipo en línea",
  "citas.formaPago.opcionSalon": "Pagar anticipo en el salón",
  "citas.formaPago.plazoLinea": "Con Mercado Pago. Tienes {plazoAnticipo} para pagarlo, sin pasar de {minutosAntesPagoSalon} minutos antes de tu cita; si no, el horario se libera.",
  "citas.formaPago.llegadaSalon": "Llega entre {minutosLlegadaAntes} y {minutosAntesPagoSalon} minutos antes para pagarlo.",
  "citas.formaPago.plazoSalon": "Si a {minutosAntesPagoSalon} minutos de tu cita no se ha pagado, la cita se cancela.",
  "citas.formaPago.noAsistePierde": "Si no llegas a tu cita y no avisas, el anticipo no se devuelve.",
  "citas.formaPago.noAsisteRevisa": "Si no llegas a tu cita, el salón revisa la devolución de tu anticipo.",
  "citas.formaPago.soloLineaDespuesFalta": "Durante {mesesSoloLinea}, tus próximas citas se apartan pagando el anticipo en línea.",
  "citas.formaPago.avisoCancelar": "Para reagendar desde tu cuenta avisa con al menos {horasAviso} de anticipación; con menos aviso, reagenda con el salón.",
  "citas.formaPago.metodosSalon": "En el salón puedes pagar con {metodosSalon}.",
  "citas.formaPago.sinAnticipoPrecio": "Pagas {precio} en el salón el día de tu cita.",
  "citas.formaPago.sinAnticipo": "Pagas tu servicio en el salón el día de tu cita.",
  "citas.confirmacion.titulo": "Tu cita ha sido agendada exitosamente",
  "citas.recordatorio": "Antes de tu cita te mandaremos un recordatorio en tu cuenta y, si lo tienes activado, por correo.",
  "citas.lista.vacia": "No tienes citas agendadas",
  "citas.lista.sinResultados": "No hay citas que coincidan con tu búsqueda",
  "citas.pagoSalon.saldo": "El día de tu cita pagas en el salón {saldo} (el total menos tu anticipo).",
  "citas.pagoSalon.saldoSinPrecio": "El día de tu cita pagas en el salón el total menos tu anticipo.",
  "citas.cancelar.sinAnticipo": "Como no has pagado anticipo, cancelar no tiene costo. Si solo necesitas otro horario, te recomendamos reprogramarla.",
  "citas.cancelar.avisoReagendar": "Para reagendar desde tu cuenta avisa con al menos {horasAviso} de anticipación.",
  "citas.cancelar.anticipoSinDatos": "Si tu cita está a más de {diasExcepcion} días hábiles de la fecha en que pagaste tu anticipo de {anticipo} y cancelas dentro de los {diasReembolso} días hábiles siguientes a tu pago, te lo devolvemos completo; en otro caso no se devuelve.",
  "citas.cancelar.anticipoReembolsable": "Si cancelas ahora, te devolvemos completo tu anticipo de {anticipo} por el mismo medio con el que lo pagaste: tu cita está a más de {diasExcepcion} días hábiles de tu pago y cancelas dentro de los {diasReembolso} días hábiles siguientes.",
  "citas.cancelar.anticipoHasta": "Tienes hasta el {fechaLimite}.",
  "citas.cancelar.anticipoPlazoTerminado": "Tu anticipo de {anticipo} ya no se devuelve si cancelas: el plazo para cancelar con reembolso terminó el {fechaLimite}.",
  "citas.cancelar.anticipoNoReembolsable": "Tu anticipo de {anticipo} no se devuelve si cancelas, porque tu cita está a {diasExcepcion} días hábiles o menos de la fecha en que lo pagaste.",
  "citas.cancelar.reprogramar": "Si reprogramas tu cita con aviso, tu anticipo se respeta para la nueva fecha.",
  "citas.cancelar.toast": "Tu cita quedó cancelada.",
  "citas.cancelar.toastReembolso": "Tu cita quedó cancelada. Te devolvemos tu anticipo completo por el mismo medio con el que lo pagaste.",
  "anticipos.sinAnticipo": "Sin anticipo",
  "anticipos.botonPagar": "Pagar anticipo",
  "anticipos.botonMercadoPago": "Pagar anticipo con Mercado Pago",
  "anticipos.botonSalon": "Pagar en el salón",
  "anticipos.enlacePolitica": "Leer la Política de anticipos y cancelación",
  "anticipos.pendiente": "Págalo {formasPago}. Si no se paga en {plazoAnticipo}, el horario se libera.",
  "anticipos.plazoLinea": "Tienes {plazoAnticipo} para pagarlo en línea{limite}; si no, el horario se libera.",
  "anticipos.salonSeLibera": "Si no lo pagas a tiempo, el horario se libera.",
  "anticipos.pagado": "Se descuenta del total el día de tu cita.",
  "anticipos.enRevision": "El salón está revisando tu anticipo; te avisaremos en tu cuenta.",
  "anticipos.liberada": "No recibimos el anticipo a tiempo y el horario se liberó.",
  "anticipos.retenido": "La cita no se atendió y el anticipo se retuvo, como indican los términos.",
  "anticipos.devuelto": "Te devolvimos el anticipo.",
  "checkout.recogerTitulo": "Recoges tu pedido en el salón",
  "checkout.recogerTexto": "Lo preparamos y te lo apartamos en el mostrador.",
  "checkout.recogerAviso": "{tiempoPreparacion}. Te avisamos en la app y por correo cuando puedas pasar por él.",
  "checkout.opcionLineaTitulo": "Pagar en línea",
  "checkout.opcionLineaTexto": "Con tarjeta en la página segura de Mercado Pago.",
  "checkout.opcionSalonTitulo": "Pagar al recoger en el salón",
  "checkout.opcionSalonTexto": "Te apartamos el pedido y lo pagas en el mostrador cuando pases por él.",
  "checkout.ambasRecoges": "En los dos casos recoges tu pedido en el salón.",
  "checkout.soloRecoges": "Recoges tu pedido en el salón.",
  "checkout.avisoSalon": "Tu pedido queda apartado. Pagas {total} en el mostrador cuando pases por él{metodosSalon}.",
  "checkout.avisoLinea": "Al confirmar te llevamos a Mercado Pago para pagar {total}. Tu tarjeta la escribes allá: este sitio no la ve ni la guarda. Tienes {plazoPagoLineaHoras} horas para completar el pago.",
  "checkout.botonLinea": "Ir a pagar con Mercado Pago",
  "checkout.botonSalon": "Apartar mi pedido",
  "tienda.confirmacionTitulo": "¡Gracias por tu compra!",
  "tienda.confirmacionApartado": "Te apartamos tu pedido. Te avisamos en la app y por correo cuando esté listo para recogerlo y pagarlo en el salón.",
  "tienda.confirmacionRegistrado": "Tu pedido quedó registrado. Te avisamos en la app y por correo cuando esté listo para recoger en el salón.",
  "tienda.pagoRecibidoTexto": "Tu pedido quedó pagado. Te avisamos en la app y por correo cuando esté listo para recoger en el salón.",
  "tienda.pagoEnProcesoTexto": "Mercado Pago aún no lo confirma. Te avisamos en la app y por correo en cuanto se acredite.",
  "pedidos.lista.vacia": "No tienes pedidos realizados",
  "pedidos.lista.sinResultados": "Ningún pedido coincide con la búsqueda",
  "pedidos.estado.apartado": "Tu pedido está apartado. Lo preparamos y te avisamos cuando puedas pasar a pagarlo y recogerlo.",
  "pedidos.estado.faltaPago": "Falta completar tu pago en Mercado Pago. Tienes {plazoPago} horas desde que hiciste el pedido.",
  "pedidos.estado.confirmandoPago": "Estamos confirmando tu pago. Después lo preparamos y te avisamos.",
  "pedidos.estado.pagado": "Pago recibido. Lo preparamos y te avisamos cuando esté listo para recoger.",
  "pedidos.estado.preparando": "Estamos preparando tu pedido. Te avisamos en la app y por correo cuando esté listo.",
  "pedidos.estado.listoPagar": "Tu pedido está listo. Pasa por él al salón y págalo en el mostrador{metodosSalon}.",
  "pedidos.estado.listo": "Tu pedido está listo. Pasa por él al salón.",
  "pedidos.estado.entregado": "Recogiste tu pedido en el salón.",
  "pedidos.cancelarORevocar": "Las dos te devuelven lo que pagaste. «Cancelar pedido» solo se puede antes de que empecemos a prepararlo; «Revocar compra» es tu derecho por ley durante {diasRevocacion} días hábiles y sigue disponible aunque ya lo hayamos preparado o lo hayas recogido.",
  "pedidos.revocacion.pendiente": "Revocaste tu compra. Entrega tu pedido en el salón: al recibirlo te reembolsamos{monto} por el mismo medio con el que pagaste.",
  "pedidos.revocacion.aprobada": "Revocaste tu compra: recibimos tu pedido y te reembolsamos{monto} por el mismo medio con el que pagaste.",
  "pedidos.revocacion.rechazada": "Revocaste tu compra, pero el salón rechazó la revocación. Si tienes dudas, comunícate con el salón.",
  "pedidos.sinValoraciones": "Aún no hay reseñas registradas para productos de este pedido.",
  "pedidos.sinDevoluciones": "No hay solicitudes para este pedido.",
  "garantias.subtitulo": "Si algo de tu servicio no salió como esperabas, tienes {diasGarantia} días para reportarlo. También puedes escribirnos cualquier duda o sugerencia.",
  "garantias.vacia": "Aún no tienes casos registrados.",
  "garantias.formularioTexto": "Cuéntanos qué pasó y te responderemos en tu cuenta.",
  "garantias.toastRegistrado": "Recibimos tu caso. Te responderemos en tu cuenta.",
  "devoluciones.subtitulo": "Solicitudes registradas en el sistema según tus pedidos",
  "devoluciones.vacia": "No hay devoluciones registradas.",
  "devoluciones.requisito": "Necesitas un pedido entregado, o uno cancelado que ya hayas pagado.",
  "devoluciones.toastRegistrada": "Solicitud registrada."
};

export type Variables = Record<string, string | number | null | undefined>;

const VARIABLE = /\{([a-zA-Z][a-zA-Z0-9]*)\}/g;

/** Solo las claves que conoce la web, con texto; lo demás toma el valor de hoy. */
export function normalizarTextos(dato: unknown): Record<string, string> {
  const salida: Record<string, string> = { ...TEXTOS_POR_OMISION };
  if (!dato || typeof dato !== 'object' || Array.isArray(dato)) return salida;
  for (const [clave, valor] of Object.entries(dato as Record<string, unknown>)) {
    if (clave in TEXTOS_POR_OMISION && typeof valor === 'string' && valor.trim()) salida[clave] = valor;
  }
  return salida;
}

/** Llena {variable}; una variable sin valor queda vacía (nunca "undefined" ni las llaves a la vista). */
export function llenarTexto(plantilla: string, variables: Variables = {}): string {
  return plantilla.replace(VARIABLE, (_todo, nombre: string) => {
    const v = variables[nombre];
    return v === undefined || v === null ? '' : String(v);
  });
}

/** El texto de una clave con sus variables (las de contexto mandan sobre las de reglas). */
export function textoSitio(textos: Record<string, string> | undefined, clave: string, variables: Variables = {}): string {
  return llenarTexto(textos?.[clave] ?? TEXTOS_POR_OMISION[clave] ?? '', variables);
}

/**
 * Igual que textoSitio, pero una variable puede ser una pieza de React (por ejemplo, un monto con cifras tabulares):
 * devuelve la lista de trozos para pintarla tal cual.
 */
export function piezasTexto(plantilla: string, variables: Variables, piezas: Record<string, ReactNode>): ReactNode[] {
  const salida: ReactNode[] = [];
  let ultimo = 0;
  for (const m of plantilla.matchAll(VARIABLE)) {
    const inicio = m.index ?? 0;
    if (inicio > ultimo) salida.push(plantilla.slice(ultimo, inicio));
    const nombre = m[1];
    if (nombre in piezas) salida.push(piezas[nombre]);
    else salida.push(llenarTexto(m[0], variables));
    ultimo = inicio + m[0].length;
  }
  if (ultimo < plantilla.length) salida.push(plantilla.slice(ultimo));
  return salida.filter((p) => p !== '');
}

/** "2 horas", "1 hora": para las variables de contexto que llevan unidad. */
export function conUnidad(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}
