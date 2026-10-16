import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const put = vi.fn();
const post = vi.fn();
vi.mock('./client', () => ({ apiClient: { get, put, post } }));
vi.mock('./config', () => ({ getBackendBaseUrl: () => 'http://api.test' }));

const servicio = await import('./textosSitio');
const { normalizarConfiguracion, CONFIGURACION_POR_OMISION } = await import('./configuracionSitio');

/** Admin > Textos del sitio: rutas, 403 en la misma pantalla y datos del API normalizados. */
beforeEach(() => {
  get.mockReset();
  put.mockReset();
  post.mockReset();
});

describe('Servicio de Textos del sitio', () => {
  it('lee el catálogo mostrando el 403 en la pantalla y descarta filas incompletas', async () => {
    get.mockResolvedValue({
      paginas: ['Checkout'],
      data: [
        { clave: 'checkout.botonSalon', valor: 'Apartar', porDefecto: 'Apartar mi pedido', pagina: 'Checkout', descripcion: 'Botón', tipo: 'texto', max: 40, personalizado: true, variables: [{ nombre: 'total', descripcion: 'Total', ejemplo: '$1', origen: 'contexto' }, { x: 1 }] },
        { clave: 'roto' },
      ],
    });
    const c = await servicio.obtenerTextosSitio();
    expect(get).toHaveBeenCalledWith('/api/textos-sitio', { customBase: 'http://api.test', skip403Redirect: true });
    expect(c.paginas).toEqual(['Checkout']);
    expect(c.data).toHaveLength(1);
    expect(c.data[0]).toMatchObject({ clave: 'checkout.botonSalon', valor: 'Apartar', max: 40, personalizado: true });
    expect(c.data[0].variables).toHaveLength(1);
  });

  it('guardar (PUT), restaurar (POST) e historial con la clave codificada', async () => {
    put.mockResolvedValue({ valor: 'Hola' });
    post.mockResolvedValue({ valor: 'Original' });
    get.mockResolvedValue({ data: [{ id: 1 }] });
    await servicio.guardarTextoSitio('citas.crear.botonConfirmar', 'Hola');
    await servicio.restaurarTextoSitio('citas.crear.botonConfirmar');
    const h = await servicio.obtenerHistorialTexto('citas.crear.botonConfirmar');
    expect(put).toHaveBeenCalledWith('/api/textos-sitio/citas.crear.botonConfirmar', { valor: 'Hola' }, 'http://api.test');
    expect(post).toHaveBeenCalledWith('/api/textos-sitio/citas.crear.botonConfirmar/restaurar', {}, 'http://api.test');
    expect(get).toHaveBeenCalledWith('/api/textos-sitio/citas.crear.botonConfirmar/historial', { customBase: 'http://api.test', skip403Redirect: true });
    expect(h).toEqual([{ id: 1 }]);
  });
});

describe('Configuración pública: textos', () => {
  it('toma los textos del API que conoce la web y deja los de hoy en lo demás', () => {
    const c = normalizarConfiguracion({ textos: { 'checkout.botonSalon': 'Apartar ya', 'clave.desconocida': 'x', 'citas.lista.vacia': 5 } });
    expect(c.textos['checkout.botonSalon']).toBe('Apartar ya');
    expect(c.textos['clave.desconocida']).toBeUndefined();
    expect(c.textos['citas.lista.vacia']).toBe(CONFIGURACION_POR_OMISION.textos['citas.lista.vacia']);
  });
});
