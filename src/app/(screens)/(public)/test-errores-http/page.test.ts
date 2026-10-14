import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

const { default: TestErroresHttpPage } = await import('./page');

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('/test-errores-http', () => {
  it('en producción responde 404 (notFound)', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => renderToStaticMarkup(createElement(TestErroresHttpPage))).toThrow('NEXT_NOT_FOUND');
  });

  it('en desarrollo sigue disponible', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(renderToStaticMarkup(createElement(TestErroresHttpPage))).toContain('/api/test/errores');
  });
});
