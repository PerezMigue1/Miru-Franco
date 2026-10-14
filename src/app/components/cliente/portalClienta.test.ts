import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Hallazgos de la auditoría del portal de clienta que viven en el marcado de las páginas (sin DOM en
 * vitest): se revisa el código fuente de cada pantalla, como en services/solicitudFactura.test.ts.
 */
const CLIENTE = join(__dirname, '..', '..', '(screens)', '(privada)', 'cliente');
const leer = (...partes: string[]) => readFileSync(join(CLIENTE, ...partes), 'utf8');
const leerComponente = (...partes: string[]) => readFileSync(join(__dirname, '..', ...partes), 'utf8');

/** Cuerpo de una función flecha `const nombre = async (...) => { ... };` del código fuente. */
function cuerpoDe(fuente: string, nombre: string): string {
  const inicio = fuente.indexOf(`const ${nombre} = `);
  expect(inicio, `no se encontró ${nombre}`).toBeGreaterThan(-1);
  const fin = fuente.indexOf('\n  };', inicio);
  return fuente.slice(inicio, fin);
}

const crearCita = leer('servicios-citas', 'crear-cita', 'page.tsx');
const cancelar = leer('servicios-citas', 'cancelar', '[id]', 'page.tsx');
const reprogramar = leer('servicios-citas', 'reprogramar', '[id]', 'page.tsx');
const misCitas = leer('servicios-citas', 'mis-citas', 'page.tsx');
const detalleCita = leer('servicios-citas', 'mis-citas', '[id]', 'page.tsx');
const confirmacionCita = leer('servicios-citas', 'confirmacion', 'page.tsx');
const calendario = leer('servicios-citas', 'calendario', 'page.tsx');
const servicios = leer('servicios-citas', 'page.tsx');
const tienda = leer('tienda-online', 'page.tsx');
const confirmacionCompra = leer('tienda-online', 'confirmacion', 'page.tsx');
const misPedidos = leer('tienda-online', 'mis-pedidos', 'page.tsx');
const detallePedido = leer('tienda-online', 'mis-pedidos', '[id]', 'page.tsx');
const notificaciones = leer('notificaciones', 'page.tsx');
const facturas = leer('facturas', 'page.tsx');
const perfilForm = leerComponente('perfil', 'PerfilDatosForm.tsx');

describe('Hallazgo 2: datos de salud fuera del texto libre de citas', () => {
  it('las notas de la cita no piden alergias y remiten a Información personal', () => {
    const notas = crearCita.slice(crearCita.indexOf('label="Notas Adicionales'), crearCita.indexOf('/>', crearCita.indexOf('label="Notas Adicionales')));
    expect(notas).not.toMatch(/Indica[^".]*alergia/i);
    expect(notas).toMatch(/placeholder="[^"]*alergias, regístralas en Mi perfil, en Información personal/);
  });

  it('cancelar no ofrece "Problemas de salud" como motivo (viaja en la notificación)', () => {
    expect(cancelar).not.toMatch(/Problemas de salud/i);
    expect(cancelar).toContain("'Motivo personal'");
  });
});

describe('Hallazgo 4: Reprogramar y Cancelar con una sola regla', () => {
  it.each([
    ['Mis citas', misCitas],
    ['detalle de la cita', detalleCita],
  ])('%s usa citaGestionablePorClienta y no compara estados a mano', (_, fuente) => {
    expect(fuente).toMatch(/citaGestionablePorClienta\(cita, ahora\)/);
    expect(fuente).not.toMatch(/estado === 'confirmada' \|\| cita\.estado === 'pendiente'/);
  });
});

describe('Hallazgo 6: cancelar una cita que ya no está vigente', () => {
  it('avisa que la cita ya no se puede cancelar en lugar de mostrar el formulario', () => {
    expect(cancelar).toMatch(/citaGestionablePorClienta\(cita\)/);
    expect(cancelar).toContain('MENSAJE_CITA_NO_CANCELABLE');
  });

  it('al fallar no muestra el texto crudo del backend y al cancelar avisa con showToast', () => {
    const confirmar = cuerpoDe(cancelar, 'confirmarCancelacion');
    expect(confirmar).toContain('mensajeErrorCancelarCita(err)');
    expect(confirmar).not.toContain('err.message');
    expect(confirmar).toMatch(/showToast\([^)]*'success'\)/);
  });
});

describe('Hallazgo 7: notificaciones legibles y eliminar con confirmación', () => {
  it('la insignia muestra la etiqueta del tipo, no la clave interna', () => {
    expect(notificaciones).not.toMatch(/\{n\.tipo\}/);
    expect(notificaciones).toContain('etiquetaTipoNotificacion(n.tipo)');
  });

  it('eliminar pide confirmación con el diálogo de la app antes de borrar', () => {
    const borrar = cuerpoDe(notificaciones, 'borrar');
    expect(borrar).toContain('await showConfirm(');
    expect(borrar.indexOf('showConfirm(')).toBeLessThan(borrar.indexOf('eliminarNotificacion('));
    expect(notificaciones).not.toMatch(/window\.confirm|[^.\w]confirm\(/);
  });
});

describe('Hallazgo 8: estado y precio legibles en citas', () => {
  it('el detalle usa etiquetaEstadoCita y formatearPrecioMXN', () => {
    expect(detalleCita).toContain('etiquetaEstadoCita(cita.estado)');
    expect(detalleCita).not.toMatch(/>\s*\{cita\.estado\}\s*</);
    expect(detalleCita).toMatch(/formatearPrecioMXN\(servicio\.precio\)/);
  });

  it('la confirmación titula según el estado (no "Confirmada" con insignia Pendiente)', () => {
    expect(confirmacionCita).not.toContain('¡Cita Confirmada!');
    expect(confirmacionCita).toContain('tituloConfirmacionCita(cita.estado)');
  });
});

describe('Hallazgo 9: pedidos con etiquetas y historial al día', () => {
  it('los pagos muestran método y estado en palabras', () => {
    expect(detallePedido).not.toMatch(/\{pg\.metodo\}|\(\{pg\.estado\}\)/);
    expect(detallePedido).toContain('etiquetaMetodoPagoPedido(pg.metodo)');
    expect(detallePedido).toContain('etiquetaEstadoPago(pg.estado)');
  });

  it('el estado del envío se muestra con etiqueta', () => {
    expect(detallePedido).not.toMatch(/>\{envio\.estadoEnvio\}</);
    expect(detallePedido).toContain('etiquetaEstadoEnvio(envio.estadoEnvio)');
  });

  it('al cancelar se recarga el historial de estados', () => {
    expect(cuerpoDe(detallePedido, 'cancelarPedido')).toContain('listarHistorialPedido(');
  });

  it('Mis pedidos formatea el total con formatearPrecioMXN', () => {
    expect(misPedidos).not.toMatch(/toLocaleString\(\)/);
    expect(misPedidos).toContain('formatearPrecioMXN(pedido.total)');
  });
});

describe('Hallazgo 10: facturas con total y estado legibles', () => {
  it('el total del pedido usa formatearPrecioMXN y el estado su etiqueta', () => {
    expect(facturas).not.toMatch(/\$\$\{p\.total\}/);
    expect(facturas).toContain('formatearPrecioMXN(p.total)');
    expect(facturas).toContain('etiquetaEstadoFactura(doc.estado)');
  });
});

describe('Hallazgo 12: etiquetas vinculadas y fechas acotadas', () => {
  it('reprogramar: la fecha tiene etiqueta vinculada y no permite días pasados', () => {
    expect(reprogramar).toMatch(/htmlFor="nueva-fecha"/);
    expect(reprogramar).toMatch(/id="nueva-fecha"/);
    expect(reprogramar).toMatch(/min=\{hoy\}/);
  });

  it('cancelar: el motivo tiene etiqueta vinculada', () => {
    expect(cancelar).toMatch(/htmlFor="motivo-cancelacion"/);
    expect(cancelar).toMatch(/id="motivo-cancelacion"/);
  });

  it('perfil: la fecha de nacimiento no permite días futuros', () => {
    const campo = perfilForm.slice(perfilForm.indexOf('label="Fecha de nacimiento"'), perfilForm.indexOf("register('fechaNacimiento')"));
    expect(campo).toMatch(/max=\{hoyEnMexico\(\)\}/);
  });
});

describe('Hallazgo 1: límites del perfil capilar como el DTO', () => {
  it('color natural y actual hasta 255, productos y alergias hasta 1000', () => {
    expect(perfilForm).toMatch(/label="Color natural"[^>]*maxLength=\{255\}/);
    expect(perfilForm).toMatch(/label="Color actual"[^>]*maxLength=\{255\}/);
    expect(perfilForm).toMatch(/label="Productos que usas"[^>]*maxLength=\{1000\}/);
    expect(perfilForm).toMatch(/label="Alergias"[^>]*maxLength=\{1000\}/);
  });
});

describe('Hallazgo 5: error al guardar el perfil', () => {
  it('onSubmit atrapa el fallo de PATCH /auth/me y lo muestra con role="alert"', () => {
    const onSubmit = cuerpoDe(perfilForm, 'onSubmit');
    expect(onSubmit).toMatch(/try \{[\s\S]*await patchMiPerfil\(cuerpo\)[\s\S]*\} catch/);
    expect(onSubmit).toContain('setSaveError(');
    expect(perfilForm).toMatch(/\{saveError && [\s\S]{0,200}role="alert"/);
  });
});

describe('Hallazgo 3: el pago no se queda consultando para siempre', () => {
  it('si falla la consulta del estado, la pantalla pasa a error con salida', () => {
    const consultar = confirmacionCompra.slice(
      confirmacionCompra.indexOf('const consultar = async'),
      confirmacionCompra.indexOf('void consultar();'),
    );
    expect(consultar).toMatch(/catch \(e\) \{[\s\S]*setErrorConsulta\(mensajeUsuarioDesdeErrorApi\(e\)\)/);
    expect(confirmacionCompra).toMatch(/errorConsulta=\{errorConsulta\}/);
  });
});

describe('Hallazgo 13: especialistas que no cargan', () => {
  it('muestra el error con un botón para reintentar', () => {
    expect(calendario).not.toContain('.catch(() => setEspecialistas([]))');
    expect(calendario).toContain('setErrorEspecialistas(');
    expect(calendario).toMatch(/errorEspecialistas && [\s\S]{0,600}Reintentar/);
  });
});

describe('Hallazgo 14: búsqueda y rangos con nombre accesible', () => {
  it('servicios: búsqueda y Mín/Máx de precio y duración con aria-label', () => {
    expect(servicios).toContain('aria-label="Buscar servicio"');
    expect(servicios).toContain('aria-label="Precio mínimo"');
    expect(servicios).toContain('aria-label="Precio máximo"');
    expect(servicios).toContain('aria-label="Duración mínima en minutos"');
    expect(servicios).toContain('aria-label="Duración máxima en minutos"');
  });

  it('tienda: Mín/Máx de precio con aria-label', () => {
    expect(tienda).toContain('aria-label="Precio mínimo"');
    expect(tienda).toContain('aria-label="Precio máximo"');
  });
});
