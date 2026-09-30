import { describe, expect, it } from 'vitest';
import { urlCloudinaryTransformada } from './cloudinaryUrl';

const T = 'c_fill,g_auto,w_600,h_800,f_auto,q_auto';

describe('urlCloudinaryTransformada', () => {
  it('inserta la transformación después de /upload/', () => {
    expect(
      urlCloudinaryTransformada('https://res.cloudinary.com/demo/image/upload/v17749/foto_ab.jpg', T)
    ).toBe(`https://res.cloudinary.com/demo/image/upload/${T}/v17749/foto_ab.jpg`);
  });

  it('respeta una URL que ya trae transformación', () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/w_300,c_fit/v1/foto.jpg';
    expect(urlCloudinaryTransformada(url, T)).toBe(url);
  });

  it('no toca URLs de otros hosts ni textos inválidos', () => {
    expect(urlCloudinaryTransformada('https://images.unsplash.com/photo.jpg', T)).toBe(
      'https://images.unsplash.com/photo.jpg'
    );
    expect(urlCloudinaryTransformada('/logo-miru.jpg', T)).toBe('/logo-miru.jpg');
  });
});
