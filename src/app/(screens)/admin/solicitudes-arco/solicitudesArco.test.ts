import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  AVISO_CORREO_CANCELACION_NO_ENVIADO,
  AVISO_CORREO_RESPUESTA_NO_ENVIADO,
  avisoCorreoNoEnviado,
  confirmarYEjecutarCancelacion,
  DIAS_POR_VENCER,
  ESTILO_URGENCIA,
  estadosPosibles,
  exigeElegirRevocacion,
  fechaLimite,
  insigniaDeUrgencia,
  MENSAJE_CONFIRMAR_ANONIMIZAR,
  MENSAJE_FALTA_REVOCAR,
  OPCIONES_REVOCACION_ARCO,
  urgenciaSolicitud,
  validarRespuesta,
  validarRevocacion,
  vencidasDeFiltro,
} from './solicitudesArco';

const AHORA = new Date('2026-10-14T18:00:00.000Z');
const DIA = 24 * 60 * 60 * 1000;
const en = (dias: number) => new Date(AHORA.getTime() + dias * DIA).toISOString();

describe('Bandeja ARCO: vencimientos resaltados', () => {
  it('una solicitud abierta con el plazo de respuesta pasado está vencida', () => {
    expect(urgenciaSolicitud({ estado: 'recibida', venceRespuesta: en(-1), venceEfectividad: null }, AHORA)).toBe('vencida');
    expect(urgenciaSolicitud({ estado: 'en_proceso', venceRespuesta: en(-0.1), venceEfectividad: null }, AHORA)).toBe('vencida');
  });

  it(`a ${DIAS_POR_VENCER} días o menos del plazo está por vencer; con más margen, en plazo`, () => {
    expect(urgenciaSolicitud({ estado: 'recibida', venceRespuesta: en(DIAS_POR_VENCER), venceEfectividad: null }, AHORA)).toBe('por_vencer');
    expect(urgenciaSolicitud({ estado: 'recibida', venceRespuesta: en(1), venceEfectividad: null }, AHORA)).toBe('por_vencer');
    expect(urgenciaSolicitud({ estado: 'recibida', venceRespuesta: en(DIAS_POR_VENCER + 1), venceEfectividad: null }, AHORA)).toBe('en_plazo');
  });

  it('respondida cuenta el plazo de efectividad, no el de respuesta', () => {
    const respondida = { estado: 'respondida' as const, venceRespuesta: en(-10), venceEfectividad: en(2) };
    expect(urgenciaSolicitud(respondida, AHORA)).toBe('por_vencer');
    expect(fechaLimite(respondida)).toBe(respondida.venceEfectividad);
    expect(urgenciaSolicitud({ ...respondida, venceEfectividad: en(-1) }, AHORA)).toBe('vencida');
    expect(urgenciaSolicitud({ ...respondida, venceEfectividad: null }, AHORA)).toBe('en_plazo');
  });

  it('atendidas y rechazadas ya no se resaltan', () => {
    expect(urgenciaSolicitud({ estado: 'atendida', venceRespuesta: en(-30), venceEfectividad: null }, AHORA)).toBe('cerrada');
    expect(urgenciaSolicitud({ estado: 'rechazada', venceRespuesta: en(-30), venceEfectividad: null }, AHORA)).toBe('cerrada');
  });
});

describe('Bandeja ARCO: cómo se ve la urgencia', () => {
  it('vencida y por vencer llevan insignia de texto; en plazo y cerrada no', () => {
    expect(insigniaDeUrgencia('vencida')).toEqual({ etiqueta: 'Vencida', variante: 'danger' });
    expect(insigniaDeUrgencia('por_vencer')).toEqual({ etiqueta: 'Vence pronto', variante: 'warning' });
    expect(insigniaDeUrgencia('en_plazo')).toBeNull();
    expect(insigniaDeUrgencia('cerrada')).toBeNull();
  });

  it('la fila vencida y la por vencer se resaltan con tokens de peligro y aviso', () => {
    expect(ESTILO_URGENCIA.vencida).toMatchObject({ etiqueta: 'Vencida', variante: 'danger' });
    expect(ESTILO_URGENCIA.por_vencer).toMatchObject({ etiqueta: 'Vence pronto', variante: 'warning' });
    expect(ESTILO_URGENCIA.vencida.fondo).toMatch(/var\(--danger\)/);
    expect(ESTILO_URGENCIA.por_vencer.fondo).toMatch(/var\(--warning\)/);
    expect(ESTILO_URGENCIA.en_plazo.fondo).toBeUndefined();
    expect(ESTILO_URGENCIA.cerrada.fondo).toBeUndefined();
  });

  it('el filtro de plazo pide al backend vencidas=true, vencidas=false o ninguno', () => {
    expect(vencidasDeFiltro('vencidas')).toBe(true);
    expect(vencidasDeFiltro('sin_vencer')).toBe(false);
    expect(vencidasDeFiltro('')).toBeUndefined();
  });

  it('la pantalla usa esas reglas: insignia, fondo y filtro', () => {
    const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');
    expect(pagina).toContain('const insignia = insigniaDeUrgencia(urgencia);');
    expect(pagina).toMatch(/\{insignia && \(\s*<Badge variant=\{insignia\.variante\} size="sm">\s*\{insignia\.etiqueta\}/);
    expect(pagina).toContain('style={estilo.fondo ? { backgroundColor: estilo.fondo } : undefined}');
    expect(pagina).toContain('vencidas: vencidasDeFiltro(plazo),');
  });
});

describe('Bandeja ARCO: pantalla', () => {
  const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');

  it('el botón de anonimizar solo aparece en cancelaciones abiertas', () => {
    expect(pagina).toContain("{seleccionada.tipo === 'cancelacion' && !cerrada && (");
  });

  it('valida la respuesta antes de guardar y deja el error junto al campo', () => {
    expect(pagina).toMatch(/const invalida = validarRespuesta\(nuevoEstado, respuesta\);\s*setErrorRespuesta\(invalida\);/);
    expect(pagina).toContain('error={errorRespuesta ?? undefined}');
  });

  it('las fechas van en hora de México', () => {
    expect(pagina).not.toMatch(/toISOString\(\)|toLocale(Date|Time)?String\(/);
    expect(pagina).toContain('fechaHoraMexico(s.creadaEn)');
    expect(pagina).toContain('{limite ? fechaHoraMexico(limite) : \'Sin plazo\'}');
  });

  it('en el detalle, la fecha se llama "Fecha de recepción" para no confundirse con la insignia de estado "Recibida"', () => {
    expect(pagina).toContain('<DatoDetalle etiqueta="Fecha de recepción">{fechaHoraMexico(seleccionada.creadaEn)}</DatoDetalle>');
    expect(pagina).not.toContain('<DatoDetalle etiqueta="Recibida">');
  });

  it('"Reintentar" mide 44 px como el resto de los botones (tamaño md)', () => {
    const reintentar = pagina.match(/<Button[^>]*onClick=\{recargar\}[^>]*>\s*Reintentar/)?.[0];
    expect(reintentar).toBeDefined();
    expect(reintentar).not.toContain('size="sm"');
  });
});

describe('Bandeja ARCO: responder', () => {
  it('respondida y rechazada exigen respuesta; en proceso no', () => {
    expect(validarRespuesta('respondida', '  ')).toBe('Escribe la respuesta para la titular.');
    expect(validarRespuesta('rechazada', '')).toBe('Escribe la respuesta para la titular.');
    expect(validarRespuesta('en_proceso', '')).toBeNull();
    expect(validarRespuesta('respondida', 'Procede.')).toBeNull();
    expect(validarRespuesta('respondida', 'x'.repeat(5001))).toBe('La respuesta admite hasta 5000 caracteres.');
  });

  it('una cancelación no se marca atendida a mano: se atiende ejecutándola', () => {
    expect(estadosPosibles({ tipo: 'cancelacion', estado: 'recibida' })).toEqual(['en_proceso', 'respondida', 'rechazada']);
    expect(estadosPosibles({ tipo: 'rectificacion', estado: 'en_proceso' })).toEqual(['respondida', 'atendida', 'rechazada']);
    expect(estadosPosibles({ tipo: 'acceso', estado: 'atendida' })).toEqual([]);
  });
});

describe('Bandeja ARCO: atender una revocación', () => {
  it('ofrece los tres consentimientos que el backend sabe revocar, con su nombre legible', () => {
    expect(OPCIONES_REVOCACION_ARCO).toEqual([
      { valor: 'promociones', etiqueta: 'Promociones' },
      { valor: 'datos_salud', etiqueta: 'Datos de salud (alergias)' },
      { valor: 'fotos_resultado', etiqueta: 'Fotos del resultado' },
    ]);
  });

  it('solo se elige qué revocar al marcar atendida una revocación; la oposición no pide nada', () => {
    expect(exigeElegirRevocacion('revocacion', 'atendida')).toBe(true);
    expect(exigeElegirRevocacion('revocacion', 'respondida')).toBe(false);
    expect(exigeElegirRevocacion('revocacion', 'en_proceso')).toBe(false);
    expect(exigeElegirRevocacion('oposicion', 'atendida')).toBe(false);
    expect(exigeElegirRevocacion('rectificacion', 'atendida')).toBe(false);
  });

  it('sin elegir ninguno no deja marcarla atendida', () => {
    expect(validarRevocacion('revocacion', 'atendida', [])).toBe(MENSAJE_FALTA_REVOCAR);
    expect(validarRevocacion('revocacion', 'atendida', ['fotos_resultado'])).toBeNull();
    expect(validarRevocacion('revocacion', 'en_proceso', [])).toBeNull();
    expect(validarRevocacion('oposicion', 'atendida', [])).toBeNull();
  });

  it('la pantalla pone las casillas sin premarcar, valida antes de guardar y solo manda revocar cuando toca', () => {
    const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');
    expect(pagina).toContain('const [revocar, setRevocar] = useState<ConsentimientoRevocableArco[]>([]);');
    const abrir = pagina.slice(pagina.indexOf('const abrir ='), pagina.indexOf('const cerrar ='));
    expect(abrir).toContain('setRevocar([]);');
    expect(abrir).toContain('setErrorRevocar(null);');
    expect(pagina).toMatch(/const faltaRevocar = validarRevocacion\(seleccionada\.tipo, nuevoEstado, revocar\);\s*setErrorRevocar\(faltaRevocar\);/);
    expect(pagina).toMatch(/if \(invalida \|\| faltaRevocar\) return;/);
    expect(pagina).toContain('revocar: exigeElegirRevocacion(seleccionada.tipo, nuevoEstado) ? revocar : undefined');
    // Casillas reales (input checkbox con etiqueta), dentro de un fieldset con su leyenda, solo en revocaciones abiertas
    expect(pagina).toMatch(/\{seleccionada\.tipo === 'revocacion' && !cerrada && \(\s*<fieldset/);
    expect(pagina).toMatch(/OPCIONES_REVOCACION_ARCO\.map\(\(o\) => \(\s*<CasillaDocumento/);
    expect(pagina).toContain('checked={revocar.includes(o.valor)}');
    expect(pagina).not.toMatch(/defaultChecked|checked=\{true\}/);
    // El aviso va junto a las casillas
    expect(pagina).toMatch(/\{errorRevocar && \(\s*<p id="revocar-error" role="alert"/);
  });
});

describe('Bandeja ARCO: anonimizar exige confirmación', () => {
  const solicitud = { id: 7, folio: 'ARCO-2026-000007', usuario: { nombre: 'Ana López' } };

  it('si la persona del panel no confirma, no se anonimiza nada', async () => {
    const confirmar = vi.fn(async () => false);
    const ejecutar = vi.fn(async () => ({ mensaje: 'ok', correoEnviado: true }));
    expect(await confirmarYEjecutarCancelacion(solicitud, { confirmar, ejecutar })).toEqual({ ejecutada: false });
    expect(ejecutar).not.toHaveBeenCalled();
  });

  it('pregunta primero, explicando que es irreversible, y solo entonces ejecuta', async () => {
    const orden: string[] = [];
    const confirmar = vi.fn(async (mensaje: string, opciones: { title: string; confirmText: string }) => {
      orden.push('confirmar');
      expect(mensaje).toBe(MENSAJE_CONFIRMAR_ANONIMIZAR(solicitud));
      expect(mensaje).toContain('irreversible');
      expect(mensaje).toContain('Ana López');
      expect(mensaje).toContain('5 años');
      expect(opciones.confirmText).toBe('Sí, anonimizar');
      return true;
    });
    const ejecutar = vi.fn(async (id: number) => {
      orden.push(`ejecutar ${id}`);
      return { mensaje: 'Cuenta anonimizada y solicitud atendida.', correoEnviado: false };
    });
    expect(await confirmarYEjecutarCancelacion(solicitud, { confirmar, ejecutar })).toEqual({
      ejecutada: true,
      resultado: { mensaje: 'Cuenta anonimizada y solicitud atendida.', correoEnviado: false },
    });
    expect(orden).toEqual(['confirmar', 'ejecutar 7']);
  });

  it('la pantalla ejecuta la cancelación solo a través de la confirmación con showConfirm', () => {
    const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');
    expect(pagina).toContain('Ejecutar cancelación (anonimizar)');
    expect(pagina).toMatch(/confirmarYEjecutarCancelacion\([^)]*\{\s*confirmar: showConfirm,\s*ejecutar: ejecutarCancelacionArco/);
    // No hay otra llamada directa a ejecutarCancelacionArco fuera de la confirmación
    expect(pagina.match(/ejecutarCancelacionArco/g)?.length).toBe(2);
    expect(pagina).not.toMatch(/\bwindow\.confirm\(|\bconfirm\(/);
  });
});

describe('Bandeja ARCO: aviso cuando el correo a la titular no salió', () => {
  it('solo avisa con correoEnviado === false; true o sin el campo no avisan', () => {
    expect(avisoCorreoNoEnviado(false, 'respuesta')).toBe(AVISO_CORREO_RESPUESTA_NO_ENVIADO);
    expect(avisoCorreoNoEnviado(false, 'cancelacion')).toBe(AVISO_CORREO_CANCELACION_NO_ENVIADO);
    expect(avisoCorreoNoEnviado(true, 'respuesta')).toBeNull();
    expect(avisoCorreoNoEnviado(undefined, 'cancelacion')).toBeNull();
  });

  it('los textos dicen qué pasó y qué hacer', () => {
    expect(AVISO_CORREO_RESPUESTA_NO_ENVIADO).toBe(
      'La respuesta quedó guardada, pero no pudimos enviar el correo a la titular. Avísale por otro medio.',
    );
    expect(AVISO_CORREO_CANCELACION_NO_ENVIADO).toBe(
      'La cancelación quedó ejecutada, pero no pudimos enviarle la confirmación por correo a la titular. Avísale por otro medio.',
    );
  });

  it('la pantalla toma correoEnviado de los dos servicios y pinta un aviso persistente con tokens de aviso', () => {
    const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');
    expect(pagina).toMatch(/avisoCorreoNoEnviado\(\s*\w+\.correoEnviado,\s*'respuesta'\s*\)/);
    expect(pagina).toMatch(/avisoCorreoNoEnviado\(\s*\w+\.resultado\.correoEnviado,\s*'cancelacion'\s*\)/);
    const bloque = pagina.slice(pagina.indexOf('{avisoCorreo && ('), pagina.indexOf('{avisoCorreo && (') + 900);
    expect(bloque).toContain('role="alert"');
    expect(bloque).toContain('var(--warning');
    expect(bloque).not.toContain('setTimeout');
    expect(pagina).not.toMatch(/setTimeout\([^)]*setAvisoCorreo/);
  });
});
