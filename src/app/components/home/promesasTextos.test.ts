import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Servicio, ServiciosResult } from '../../services/servicios';
import { TEXTOS_POR_OMISION } from '../../utils/textosSitio';

vi.mock('../../layouts/Header', () => ({ default: () => null }));
vi.mock('../../layouts/Footer', () => ({ default: () => null }));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('../galeria/GaleriaTrabajo', () => ({ default: () => null }));
vi.mock('./CarruselProductosHome', () => ({ default: () => null }));
const getServicios = vi.fn<() => Promise<ServiciosResult>>();
vi.mock('../../services/servicios', () => ({ getServicios: () => getServicios() }));

const { default: SeccionesHome } = await import('./SeccionesHome');
const { default: SobreNosotrosPage } = await import('../../sobre-nosotros/page');
const { default: ContactoPage } = await import('../../contacto/page');

const RAIZ = join(__dirname, '..', '..', '..', '..');
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), 'utf8');
const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const servicios: Servicio[] = [1, 2, 3].map((id) => ({ id, nombre: `S${id}`, activo: true }));

/** Cifras y garantías sin respaldo: no hay datos de años, de clientas ni una garantía de satisfacción definida. */
const SIN_RESPALDO = ['5+', '500+', '100%', 'Clientes satisfechos', 'Años de experiencia', 'Satisfacción garantizada'];
/** Se compara sin distinguir mayúsculas: "Con años de experiencia" también es una cifra sin fuente. */
const sinRespaldoEn = (t: string) => SIN_RESPALDO.filter((frase) => t.toLowerCase().includes(frase.toLowerCase()));

describe('Home y "Sobre nosotros": solo cifras reales', () => {
  it('el home no anuncia años, clientas ni porcentajes inventados (la cifra de servicios sí)', () => {
    const t = texto(renderToStaticMarkup(createElement(SeccionesHome, { initialProductos: [], initialServicios: servicios })));
    expect(sinRespaldoEn(t)).toEqual([]);
    expect(t).toContain('Servicios disponibles');
  });

  it('"Sobre nosotros" no anuncia años, clientas ni "Satisfacción garantizada"', async () => {
    getServicios.mockResolvedValueOnce({ data: servicios, error: null });
    const t = texto(renderToStaticMarkup((await SobreNosotrosPage()) as ReactElement));
    expect(sinRespaldoEn(t)).toEqual([]);
    expect(t).toContain('Servicios disponibles');
  });

  it('la descripción de "Sobre nosotros" solo promete lo que la página muestra (no hay sección de equipo)', () => {
    const fuente = leer('src/app/sobre-nosotros/page.tsx');
    expect(fuente.toLowerCase()).not.toContain('el equipo detrás');
  });

  it('si el API falla, "Sobre nosotros" no deja una franja de cifras vacía', async () => {
    getServicios.mockResolvedValueOnce({ data: [], error: 'caído' });
    const html = renderToStaticMarkup((await SobreNosotrosPage()) as ReactElement);
    expect(html).not.toContain('mf-cifras');
  });
});

describe('Home: la carta de servicios sale del catálogo', () => {
  it('sin servicios (o si el API falló) no inventa una carta: lo dice y enlaza a los servicios', () => {
    const html = renderToStaticMarkup(createElement(SeccionesHome, { initialProductos: [], initialServicios: [] }));
    const t = texto(html);
    for (const inventado of ['Corte y Estilo', 'Coloración', 'Peinados de Evento', 'quinceañeras', 'larga duración']) {
      expect(t).not.toContain(inventado);
    }
    expect(t).toContain('La carta de servicios no está disponible en este momento.');
    expect(html).toContain('href="/cliente/servicios-citas"');
  });
});

describe('Contacto: la reserva no se confirma al instante', () => {
  it('no promete "Confirmación instantánea" y explica cuándo se confirma', async () => {
    const t = texto(renderToStaticMarkup((await ContactoPage()) as ReactElement));
    expect(t).not.toMatch(/instant[áa]ne/i);
    expect(t).toContain('Si el servicio pide anticipo, tu cita se confirma al pagarlo.');
  });
});

describe('Citas: solo se anuncian los avisos que el backend manda', () => {
  // Al crear o reprogramar, el backend avisa solo en la cuenta (in_app); los recordatorios previos van
  // también por correo solo si la clienta lo tiene activado en sus preferencias (resolverCanales).
  const RECORDATORIO = 'Antes de tu cita te mandaremos un recordatorio en tu cuenta y, si lo tienes activado, por correo.';

  it('la confirmación no promete un correo de confirmación', () => {
    const fuente = leer('src/app/(screens)/(privada)/cliente/servicios-citas/confirmacion/page.tsx');
    expect(fuente).not.toMatch(/correo electrónico de confirmación/i);
    // El texto sale de Admin > Textos del sitio; su valor de hoy es el mismo recordatorio.
    expect(fuente).toContain("t('citas.recordatorio')");
    expect(TEXTOS_POR_OMISION['citas.recordatorio']).toBe(RECORDATORIO);
  });

  it('reprogramar no promete una confirmación por correo', () => {
    const fuente = leer('src/app/(screens)/(privada)/cliente/servicios-citas/reprogramar/[id]/page.tsx');
    expect(fuente).not.toMatch(/confirmación por correo/i);
    expect(fuente).toContain('te avisaremos en tu cuenta con los nuevos detalles');
  });

  it('el detalle de la cita dice el mismo recordatorio', () => {
    const fuente = leer('src/app/(screens)/(privada)/cliente/servicios-citas/mis-citas/[id]/page.tsx');
    expect(fuente).toContain("t('citas.recordatorio')");
  });
});

describe('Detalle de servicio: la evaluación previa no bloquea la reserva', () => {
  it('no dice "antes de agendar" (la reserva en línea no la exige)', () => {
    const fuente = leer('src/app/(screens)/(privada)/cliente/servicios-citas/servicios/[id]/page.tsx');
    expect(fuente).not.toContain('antes de agendar');
    expect(fuente).toContain('Este servicio requiere una evaluación previa con el especialista.');
  });
});
