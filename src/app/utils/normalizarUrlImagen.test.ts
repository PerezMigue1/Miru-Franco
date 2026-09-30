import { describe, expect, it } from 'vitest';
import { imagenProductoMostrable } from './normalizarUrlImagen';

describe('imagenProductoMostrable', () => {
  it('acepta fotos de Cloudinary (también con entidades HTML escapadas)', () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/v1/producto.jpg';
    expect(imagenProductoMostrable(url)).toBe(url);
    expect(imagenProductoMostrable('https:&#x2F;&#x2F;res.cloudinary.com&#x2F;demo&#x2F;a.png')).toBe(
      'https://res.cloudinary.com/demo/a.png'
    );
  });

  it('trata como "sin imagen" cualquier otra URL o valor', () => {
    expect(imagenProductoMostrable('https://url.jpg')).toBeNull();
    expect(imagenProductoMostrable('http://res.cloudinary.com/demo/a.png')).toBeNull();
    expect(imagenProductoMostrable('https://otro-cdn.com/a.png')).toBeNull();
    expect(imagenProductoMostrable('/images/producto.png')).toBeNull();
    expect(imagenProductoMostrable('')).toBeNull();
    expect(imagenProductoMostrable(undefined)).toBeNull();
    expect(imagenProductoMostrable({ url: 'https://res.cloudinary.com/x.png' })).toBeNull();
  });
});
