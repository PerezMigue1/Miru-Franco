import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CONFIGURACION_POR_OMISION, type ConfiguracionPublica } from '../services/configuracionSitio';

vi.mock('../layouts/Header', () => ({ default: () => null }));
vi.mock('../layouts/Footer', () => ({ default: () => null }));
vi.mock('../services/contenido', () => ({
  listarPreguntasFrecuentes: async () => ({ data: [{ id: 1, pregunta: '¿Hacen envíos?', respuesta: 'No, recoges en el salón.' }], error: null }),
}));

const config: ConfiguracionPublica = {
  ...CONFIGURACION_POR_OMISION,
  salon: { ...CONFIGURACION_POR_OMISION.salon, correoContacto: 'hola@ejemplo.test', telefono: '771 000 1111', whatsapp: '771 000 2222', mapaUrl: 'https://maps.app.goo.gl/abc123' },
  horario: { dias: CONFIGURACION_POR_OMISION.horario.dias.map((d) => (d.dia === 'sabado' ? { ...d, cierra: '15:00' } : d)) },
  contenido: { ...CONFIGURACION_POR_OMISION.contenido, contacto: { introduccion: 'Introducción desde la configuración.', agendaTexto: 'Texto de agenda desde la configuración.' } },
};
vi.mock('../services/configuracionSitio', async (original) => ({
  ...(await original<typeof import('../services/configuracionSitio')>()),
  obtenerConfiguracionPublica: async () => config,
}));

const { default: ContactoPage } = await import('./page');

describe('/contacto con los datos de Configuración del sitio', () => {
  it('muestra las preguntas frecuentes de Admin > Contenido', async () => {
    const html = renderToStaticMarkup((await ContactoPage()) as ReactElement);
    expect(html).toContain('Preguntas frecuentes');
    expect(html).toContain('¿Hacen envíos?');
    expect(html).toContain('No, recoges en el salón.');
  });

  it('no tiene contacto ni horario escritos a mano', () => {
    const fuente = readFileSync(join(__dirname, 'page.tsx'), 'utf8');
    expect(fuente).not.toContain('contacto@mirufranco.com');
    expect(fuente).not.toContain('contactoSalon');
    expect(fuente).toContain('obtenerConfiguracionPublica');
  });

  it('muestra textos, domicilio con mapa, correo, teléfono, WhatsApp y horario de la configuración', async () => {
    const html = renderToStaticMarkup((await ContactoPage()) as ReactElement);
    expect(html).toContain('Introducción desde la configuración.');
    expect(html).toContain('Texto de agenda desde la configuración.');
    expect(html).toContain('Segunda Cerrada de Allende No. 15, Col. Juárez, Huejutla de Reyes, Hidalgo, C.P. 43000');
    expect(html).toContain('href="https://maps.app.goo.gl/abc123"');
    expect(html).toContain('href="mailto:hola@ejemplo.test"');
    expect(html).toContain('href="tel:+527710001111"');
    expect(html).toContain('href="https://wa.me/527710002222"');
    expect(html).toContain('Sábados de 9:30 a 15:00 h.');
  });
});
