/**
 * Rutas públicas y no personalizadas que se prerenderizan (`dynamic = 'force-static'` + ISR) para
 * que el CDN cachee su HTML. Un HTML cacheado no puede llevar el nonce de cada request, así que
 * src/middleware.ts les aplica una CSP sin nonce.
 *
 * Debe coincidir con las páginas/layouts que exportan `force-static` (lo verifica
 * rutasPublicasEstaticas.test.ts): una página estática fuera de esta lista recibiría una CSP con
 * nonce que su HTML no trae, y el navegador bloquearía sus scripts inline.
 */
export const RUTAS_PUBLICAS_ESTATICAS: readonly string[] = ['/home', '/contacto', '/sobre-nosotros', '/terminos'];
