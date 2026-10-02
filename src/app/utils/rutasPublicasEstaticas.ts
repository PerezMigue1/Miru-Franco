/**
 * Rutas que se prerenderizan (`dynamic = 'force-static'`). Un HTML prerenderizado no puede llevar
 * el nonce de cada request, así que src/middleware.ts les aplicaría una CSP con 'unsafe-inline' en
 * script-src. Hoy no hay ninguna: /home, /contacto, /sobre-nosotros y /terminos se renderizan por
 * request y reciben la CSP con nonce como el resto.
 *
 * Debe coincidir con las páginas/layouts que exportan `force-static` (lo verifica
 * rutasPublicasEstaticas.test.ts): una página estática fuera de esta lista recibiría una CSP con
 * nonce que su HTML no trae, y el navegador bloquearía sus scripts inline.
 */
export const RUTAS_PUBLICAS_ESTATICAS: readonly string[] = [];
