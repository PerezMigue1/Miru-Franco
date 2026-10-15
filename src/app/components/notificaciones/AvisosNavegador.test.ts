import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined }),
  usePathname: () => '/operacion',
}));

const { VistaAvisosNavegador } = await import('./AvisosNavegador');

const pintar = (estado: 'sin_pedir' | 'activados' | 'bloqueados' | 'no_soportado') =>
  renderToStaticMarkup(createElement(VistaAvisosNavegador, { estado, onActivar: () => undefined }));

const leer = (ruta: string) => readFileSync(join(__dirname, '..', '..', ruta), 'utf8');

describe('Perfil: "Activar avisos del navegador"', () => {
  it('sin pedir: botón con el texto exacto', () => {
    const html = pintar('sin_pedir');
    expect(html).toMatch(/<button[^>]*>[\s\S]*Activar avisos del navegador[\s\S]*<\/button>/);
    expect(html).toContain('Recibe un aviso aunque tengas el sitio en otra pestaña');
  });

  it('activados: estado sin botón para pedir', () => {
    const html = pintar('activados');
    expect(html).not.toContain('Activar avisos del navegador</');
    expect(html).toContain('role="status"');
    expect(html).toContain('Avisos activados');
  });

  it('bloqueados: explica cómo desbloquear', () => {
    const html = pintar('bloqueados');
    expect(html).toContain('candado');
    expect(html).not.toMatch(/<button/);
  });

  it('sin soporte (Android, iPhone, sin Notification): lo dice y no ofrece activar', () => {
    const html = pintar('no_soportado');
    expect(html).toContain('Este navegador no permite avisos');
    expect(html).not.toMatch(/<button/);
  });

  it('sin emojis ni rayas largas', () => {
    for (const e of ['sin_pedir', 'activados', 'bloqueados', 'no_soportado'] as const) {
      expect(pintar(e)).not.toMatch(/\u2014|\p{Extended_Pictographic}/u);
    }
  });

  it('el permiso solo se pide desde el clic', () => {
    const hook = leer('hooks/useEstadoAvisosNavegador.ts');
    expect(hook.match(/pedirPermisoAvisos\(/g) ?? []).toHaveLength(1);
    expect(hook).toMatch(/export async function activarAvisosNavegador\(\)[^{]*\{\s*const nuevo = await pedirPermisoAvisos\(\);/);
    for (const archivo of ['components/notificaciones/AvisosNavegador.tsx', 'components/notificaciones/CampanaAvisos.tsx']) {
      const fuente = leer(archivo);
      expect(fuente).not.toContain('pedirPermisoAvisos(');
      expect(fuente).not.toMatch(/useEffect\([^)]*activarAvisosNavegador/);
      expect(fuente).toMatch(/on[A-Z]\w*=\{\(\) => void activarAvisosNavegador\(\)\}/);
    }
  });

  it('el perfil de la clienta tiene el bloque de avisos', () => {
    expect(leer('components/perfil/UserProfile.tsx')).toContain('<AvisosNavegador variante="perfil" />');
  });
});

describe('Header y paneles: una sola campana con el mismo hook', () => {
  it('el Header usa CampanaAvisos (contador, título y lista) en vez de su propia carga', () => {
    const header = leer('layouts/Header.tsx');
    expect(header).toContain('<CampanaAvisos variante="sitio" bandejaHref="/cliente/notificaciones" />');
    expect(header).not.toContain('useNotificacionesSSE(');
    expect(leer('components/notificaciones/CampanaAvisos.tsx')).toContain('useAvisosNotificaciones(bandejaHref)');
  });
});
