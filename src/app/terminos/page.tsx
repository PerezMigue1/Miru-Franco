'use client';

import { colors, colorsWithOpacity } from '../utils/colors';

export default function TerminosPage() {
  const handleClose = () => {
    // Intentar cerrar la ventana/pestaña
    // Si fue abierta desde otra ventana, window.close() funcionará
    // Si no, el usuario puede cerrarla manualmente
    try {
      if (window.opener || window.history.length <= 1) {
        window.close();
      } else {
        window.history.back();
      }
    } catch (error) {
      // Si no se puede cerrar, intentar regresar en el historial
      if (window.history.length > 1) {
        window.history.back();
      } else {
        // Si no hay historial, mostrar mensaje
        alert('Por favor, cierra esta pestaña para regresar al registro.');
      }
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.fondoGeneral }}>
      {/* Botón para regresar - completamente a la izquierda */}
      <div className="mb-6 pl-4 pt-4">
        <button
          onClick={handleClose}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
          style={{ backgroundColor: colors.botonesPrincipales }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.hover}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.botonesPrincipales}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Regresar al registro</span>
        </button>
      </div>
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">

        <div className="bg-header-footer rounded-lg shadow-lg p-8 md:p-12" style={{ backgroundColor: colors.headerFooter }}>
          <h1 className="text-page-title text-center mb-8 text-texto-fondo-oscuro">
            TÉRMINOS Y CONDICIONES DE USO Y POLÍTICA DE PRIVACIDAD
          </h1>
          
          <div className="mb-8 p-6 rounded-lg" style={{ backgroundColor: colorsWithOpacity.textoFondoOscuro10, border: `1px solid ${colorsWithOpacity.bordeSutil}` }}>
            <h2 className="text-subtitle mb-4" style={{ color: colors.textoFondoOscuro }}>
              Miru Franco Salón Beauty
            </h2>
            <div className="space-y-2 text-sm" style={{ color: colorsWithOpacity.textoFondoOscuro80 }}>
              <p><strong>Titular:</strong> Mildred Rubí Franco Martínez</p>
              <p><strong>RFC:</strong> FAMM940924CKA</p>
              <p><strong>Domicilio:</strong> Segunda Cerrada de Allende No. 15, Colonia Juárez, Huejutla de Reyes, Hidalgo, C.P. 43000</p>
              <p><strong>Correo de contacto:</strong> <a href="mailto:mildredfranco24@gmail.com" className="hover:underline" style={{ color: colors.enlacesTextosInteractivos }}>mildredfranco24@gmail.com</a></p>
              <p><strong>Teléfonos:</strong> 7711 867645 / 7712 681432</p>
            </div>
          </div>

          <div className="space-y-8 text-sm leading-relaxed" style={{ color: colorsWithOpacity.textoFondoOscuro80 }}>
            
            <section>
              <h2 className="text-subtitle mb-4" style={{ color: colors.textoFondoOscuro }}>1. ACEPTACIÓN DE LOS TÉRMINOS</h2>
              <p className="mb-4">
                El acceso y uso del sitio web y aplicación móvil de Miru Franco Salón Beauty (en adelante "la Plataforma") implica la aceptación plena y sin reservas de los presentes Términos y Condiciones, los cuales regulan el acceso, navegación, uso, compra de productos, reserva de servicios y cualquier transacción realizada a través de la Plataforma.
              </p>
              <p>
                Si el usuario no está de acuerdo con las condiciones aquí establecidas, deberá abstenerse de utilizar los servicios.
              </p>
            </section>

            <section>
              <h2 className="text-subtitle mb-4" style={{ color: colors.textoFondoOscuro }}>2. OBJETO</h2>
              <p className="mb-4">
                La Plataforma tiene como finalidad ofrecer información, venta en línea de productos de belleza, agendamiento de citas para servicios estéticos, y comunicación entre el usuario y el establecimiento físico Miru Franco Salón Beauty.
              </p>
              <p>
                Estos términos establecen los derechos y obligaciones de ambas partes en relación con los servicios digitales proporcionados.
              </p>
            </section>

            <section>
              <h2 className="text-subtitle mb-4" style={{ color: colors.textoFondoOscuro }}>3. IDENTIFICACIÓN DEL RESPONSABLE</h2>
              <p>
                El responsable de la operación del sitio y del tratamiento de los datos personales es Mildred Rubí Franco Martínez, titular del establecimiento comercial "Miru Franco Salón Beauty", con domicilio y contacto indicados al inicio del presente documento.
              </p>
            </section>

            <section>
              <h2 className="text-subtitle mb-4" style={{ color: colors.textoFondoOscuro }}>4. CONDICIONES DE USO DEL SITIO Y APLICACIÓN</h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>El usuario se compromete a utilizar la Plataforma de manera lícita, sin infringir la legislación vigente, la moral o el orden público.</li>
                <li>Queda prohibido alterar, reproducir, distribuir o modificar el contenido del sitio sin autorización expresa por escrito del titular.</li>
                <li>La información de precios, servicios y productos puede modificarse sin previo aviso, pero respetando los pedidos o reservas confirmadas con anterioridad.</li>
                <li>El uso indebido del sitio o intento de acceso no autorizado podrá dar lugar a acciones legales conforme al Código Penal Federal.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-subtitle mb-4" style={{ color: colors.textoFondoOscuro }}>5. SERVICIOS Y RESERVAS</h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>El usuario podrá agendar citas para servicios de belleza a través de la Plataforma.</li>
                <li>Las reservas se considerarán confirmadas una vez que el usuario reciba notificación electrónica o vía WhatsApp.</li>
                <li>En caso de requerir anticipo o pago previo, este deberá realizarse mediante los métodos autorizados.</li>
                <li>Las cancelaciones o reprogramaciones deberán notificarse con al menos 24 horas de anticipación.</li>
                <li>Si el cliente no se presenta sin previo aviso, el anticipo no será reembolsable.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-subtitle mb-4" style={{ color: colors.textoFondoOscuro }}>6. COMPRAS Y PAGOS</h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Las compras podrán realizarse en línea mediante transferencias bancarias, pagos electrónicos (tarjeta de crédito/débito) o en efectivo en el punto de entrega.</li>
                <li>Todos los precios incluyen impuestos, salvo que se indique lo contrario.</li>
                <li>La disponibilidad de los productos se actualizará periódicamente; en caso de falta de existencias, se notificará al cliente para cambio o reembolso.</li>
                <li>El titular no será responsable de errores imputables a las pasarelas de pago externas (PayPal, Mercado Pago, Stripe, etc.).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-subtitle mb-4" style={{ color: colors.textoFondoOscuro }}>7. ENVÍOS Y ENTREGAS</h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Los envíos se realizarán dentro de la zona de Huejutla de Reyes, Hidalgo.</li>
                <li>La entrega sin costo aplica únicamente en las zonas: Colonia Juárez, Centro, Reloj y Mercado.</li>
                <li>Para otras ubicaciones, el cliente cubrirá el costo de envío conforme a la tarifa del servicio de mensajería local.</li>
                <li>Los pedidos también pueden recogerse directamente en el establecimiento físico previa confirmación.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-subtitle mb-4" style={{ color: colors.textoFondoOscuro }}>8. CAMBIOS Y DEVOLUCIONES</h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Solo se aceptarán devoluciones si el producto se encuentra sellado, en perfectas condiciones y con comprobante de compra.</li>
                <li>No se realizan devoluciones en efectivo; podrá efectuarse un cambio por otro producto de igual o mayor valor.</li>
                <li>No se aceptan devoluciones en productos abiertos, usados o con alteración física.</li>
                <li>Para servicios, el negocio garantiza la satisfacción del cliente; en caso de inconformidad, se ofrecerá corrección del trabajo o reembolso parcial, según valoración individual.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-subtitle mb-4" style={{ color: colors.textoFondoOscuro }}>9. FACTURACIÓN</h2>
              <p className="mb-4">
                Si el cliente requiere factura, deberá solicitarla dentro del mismo mes de la compra enviando su RFC, razón social, domicilio fiscal y uso de CFDI.
              </p>
              <p>
                La factura electrónica será emitida por la contadora externa del negocio conforme a las disposiciones del SAT.
              </p>
            </section>

            <section>
              <h2 className="text-subtitle mb-4" style={{ color: colors.textoFondoOscuro }}>10. PROPIEDAD INTELECTUAL</h2>
              <p className="mb-4">
                Todo el contenido del sitio (logotipo, imágenes, textos, fotografías, diseño, videos y software) es propiedad exclusiva de Miru Franco Salón Beauty o de sus legítimos titulares, y se encuentra protegido por la Ley Federal del Derecho de Autor.
              </p>
              <p>
                El uso indebido de estos elementos podrá derivar en sanciones civiles o penales.
              </p>
            </section>

            <section>
              <h2 className="text-subtitle mb-4" style={{ color: colors.textoFondoOscuro }}>11. LIMITACIÓN DE RESPONSABILIDAD</h2>
              <p className="mb-2">Miru Franco Salón Beauty no será responsable por:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Fallos técnicos del sitio o de terceros proveedores de internet o pagos.</li>
                <li>Retrasos o pérdidas ocasionadas por causas de fuerza mayor (clima, fallas eléctricas, transporte, etc.).</li>
                <li>Daños o perjuicios derivados del uso indebido de los servicios por parte del usuario.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-subtitle mb-4" style={{ color: colors.textoFondoOscuro }}>12. POLÍTICA DE PRIVACIDAD (INAI / LFPDPPP)</h2>
              <p className="mb-4">
                Conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares, Mildred Rubí Franco Martínez, con domicilio en Huejutla de Reyes, Hidalgo, es responsable del tratamiento de los datos personales recabados a través de la Plataforma.
              </p>
              
              <div className="ml-4 space-y-4">
                <div>
                  <h3 className="font-semibold mb-2" style={{ color: colors.textoFondoOscuro }}>Finalidades del tratamiento:</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Gestionar citas, pagos y servicios contratados.</li>
                    <li>Emitir comprobantes fiscales.</li>
                    <li>Enviar recordatorios, promociones o información relevante del negocio.</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2" style={{ color: colors.textoFondoOscuro }}>Datos que se recaban:</h3>
                  <p>Nombre, teléfono, correo electrónico, información de pago y, en caso de facturación, RFC y domicilio fiscal.</p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2" style={{ color: colors.textoFondoOscuro }}>Derechos ARCO (Acceso, Rectificación, Cancelación y Oposición):</h3>
                  <p className="mb-2">
                    El titular de los datos puede ejercer sus derechos enviando solicitud al correo <a href="mailto:mildredfranco24@gmail.com" className="hover:underline" style={{ color: colors.enlacesTextosInteractivos }}>mildredfranco24@gmail.com</a>.
                  </p>
                  <p>
                    El negocio se compromete a responder en un plazo no mayor a 20 días hábiles.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2" style={{ color: colors.textoFondoOscuro }}>Transferencia de datos:</h3>
                  <p>
                    No se compartirán datos personales con terceros sin consentimiento, salvo requerimiento legal.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-subtitle mb-4" style={{ color: colors.textoFondoOscuro }}>13. MODIFICACIONES</h2>
              <p>
                Los presentes Términos y Condiciones podrán modificarse en cualquier momento. Las versiones actualizadas se publicarán en la Plataforma, surtiendo efectos desde su publicación.
              </p>
            </section>

            <section>
              <h2 className="text-subtitle mb-4" style={{ color: colors.textoFondoOscuro }}>14. LEGISLACIÓN APLICABLE Y JURISDICCIÓN</h2>
              <p className="mb-4">
                Este documento se rige por las leyes de los Estados Unidos Mexicanos.
              </p>
              <p>
                Para la interpretación y cumplimiento de los presentes Términos, las partes se someten a la jurisdicción de los tribunales competentes en Huejutla de Reyes, Hidalgo, renunciando a cualquier otro fuero que pudiera corresponderles.
              </p>
            </section>

            <section>
              <h2 className="text-subtitle mb-4" style={{ color: colors.textoFondoOscuro }}>15. CONTACTO</h2>
              <p>
                Para cualquier aclaración o duda relacionada con estos Términos y Condiciones o con la Política de Privacidad, el usuario podrá comunicarse al correo electrónico <a href="mailto:mildredfranco24@gmail.com" className="hover:underline" style={{ color: colors.enlacesTextosInteractivos }}>mildredfranco24@gmail.com</a> o mediante mensaje directo en las redes oficiales de Miru Franco Salón Beauty.
              </p>
            </section>

          </div>

          <div className="mt-12 pt-8 border-t text-center" style={{ borderColor: colorsWithOpacity.bordeSutil }}>
            <p className="text-sm" style={{ color: colorsWithOpacity.textoFondoOscuro70 }}>
              Última actualización: {new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

