import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Card from './Card';

const clases = (padding: 'sm' | 'md' | 'lg') =>
  renderToStaticMarkup(createElement(Card, { padding } as ComponentProps<typeof Card>, 'x')).match(/class="([^"]*)"/)?.[1].split(/\s+/) ?? [];

/** H6: a 375 px el p-8 fijo de las tarjetas dejaba 277 px de marco para las tablas. */
describe('Card: relleno grande en móvil', () => {
  it('lg usa p-5 en móvil y p-8 desde 640 px', () => {
    expect(clases('lg')).toEqual(expect.arrayContaining(['p-5', 'sm:p-8']));
    expect(clases('lg')).not.toContain('p-8');
  });

  it('sm y md no cambian', () => {
    expect(clases('sm')).toContain('p-4');
    expect(clases('md')).toContain('p-6');
  });
});
