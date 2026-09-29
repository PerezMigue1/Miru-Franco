# Auditoría de producción (www.mirufranco.com): estado y pendientes

Fecha: 2026-09-29. Proyectos: `miru-franco-web` (Next.js 16.2.3) y `backend-miru` (**NestJS 11** + Prisma; la auditoría lo suponía Express).

## Estado por hallazgo

| # | Hallazgo | Estado | Dónde |
|---|----------|--------|-------|
| 1 | Sin robots.txt / sitemap.xml | Corregido | `src/app/robots.ts`, `src/app/sitemap.ts` |
| 2 | Title/description idénticos | Corregido | `src/app/utils/seo.ts`, metadata en home/contacto/sobre-nosotros, `layout.tsx` nuevos en terminos, login, register, forgot/reset-password, tienda-online, servicios-citas, `servicios/[id]`; `generateMetadata` en `productos/[id]` |
| 3 | Sin canonical ni og:image | Corregido | `src/app/layout.tsx` (metadataBase, og:image por defecto) + canonical por ruta |
| 4 | Dos `<h1>` en la home | Corregido | `src/app/layouts/Header.tsx` (el logo textual deja de ser h1/h2) |
| 5 | `no-store` en páginas públicas | Corregido | home (ISR), contacto, sobre-nosotros, terminos → `s-maxage`; `src/middleware.ts` + `src/app/utils/rutasPublicasEstaticas.ts` |
| 6 | Chunk bloqueado por CSP | Corregido | `src/middleware.ts` (ver causa abajo) |
| 7 | `console.log` de configuración/URLs | Corregido | `src/app/services/config.ts`, `src/app/services/client.ts` |
| 8 | JWT y PII en localStorage | Corregido (front + back) | back: `src/auth/auth-cookie.ts`, `jwt.strategy.ts`, `auth.controller.ts`, `main.ts` · front: `utils/security.ts`, `services/client.ts`, `utils/normalizarUsuarioAlmacenado.ts` y consumidores |
| 9 | Logout sin revocación | Corregido (front + back) | El endpoint ya existía (`POST /api/auth/logout`, revoca con `tokensRevocadosDesde`). El hueco real: leía el token solo del header `Authorization`; con cookie habría respondido "Sesión cerrada" sin revocar. Ahora revoca el token con el que se autenticó la petición y borra la cookie |
| 10 | Gestor de BD dentro de `/admin` | Sin cambios de código (decisión de arquitectura) | Nota más abajo |
| 11 | Peticiones a endpoints sin permiso | Corregido | `operacion/page.tsx`, `operacion/agenda-calendario`, `operacion/gestion-citas` (condicionadas a `permisos` de `/auth/me`) |
| 12 | Tarjeta de servicio gris sin imagen | Corregido | `src/app/components/servicios/ServicioImagen.tsx` (listado, detalle y home) |
| 13 | Chips de categoría cortados en móvil | Corregido | `cliente/servicios-citas/page.tsx` (degradado + flecha mientras haya más chips) |
| 14 | KPIs de `/admin` truncados en móvil | **Fuera de alcance** por decisión de producto: el panel admin y el de operación no necesitan ser responsivos. No se tocó código | — |

### Causa real del hallazgo 6
No era un nonce desfasado por caché. Next 16.2.3 dibuja los scripts de `loading.tsx`, `error` y `not-found` (`create-component-styles-and-scripts.js`) **sin atributo `nonce`**. Con `'strict-dynamic'` el navegador ignora `'self'` y los bloquea en cada carga completa. En la navegación del lado del cliente sí cargaban, de ahí lo "intermitente". `script-src` quedó en `'self' 'nonce-…'`. Si una versión futura de Next agrega el nonce a esos scripts, se puede volver a `'strict-dynamic'`.

### Nota sobre el hallazgo 12
La imagen de "Nanoplastia Flopactive" existe hoy (Cloudinary responde 200). El bloque gris aparecía cuando la imagen **fallaba al cargar**: no había `onError` y el ícono de respaldo solo salía cuando no había URL. Ahora, si falta o falla, se muestra el monograma de la marca.

---

## Hallazgo 10: Gestor de Base de Datos dentro del panel de negocio (sin implementar)

**Riesgo.** `/admin/base-datos/*` expone monitoreo de Neon/PostgreSQL (salud, tablas, índices, locks, actividad, EXPLAIN) y operaciones destructivas (importar, **truncate**, restauración). Todo vive bajo la misma sesión y el mismo rol `admin` con que la dueña consulta ventas e inventario. Si se roba esa sesión (XSS, equipo compartido, phishing), el atacante hereda capacidades de infraestructura que el negocio no necesita en el día a día. Además, en el backend `/api/db/*` convive con la API pública.

**Recomendación.**
1. Sacar el gestor a una ruta/app interna aparte (p. ej. `ops.mirufranco.com` o un deploy separado), con su propio control de acceso: rol técnico distinto de `admin`, MFA y, si es posible, allowlist de IP o acceso detrás de VPN/Cloudflare Access.
2. En el backend, mover `/api/db/*` detrás de un guard y un permiso propios (`infra:*`), deshabilitables por variable de entorno en producción. Las acciones destructivas (truncate, restauración) deben pedir reautenticación.
3. Mientras tanto, registrar en auditoría cada llamada a `/api/db/*` (quién, qué tabla, cuándo).

---

## Pendientes operativos (hacer antes o durante el despliegue)

1. **Orden de despliegue: primero el backend, luego el frontend.** El frontend nuevo envía la cabecera `X-Auth-Mode` (el backend viejo la rechazaría en el preflight CORS) y depende de la cookie `mf_session`. El backend nuevo sigue aceptando `Authorization: Bearer`, así que el frontend viejo funciona con él.
2. **Los usuarios deberán iniciar sesión una vez** tras el deploy del frontend: las sesiones antiguas (JWT en localStorage) se descartan al cargar.
3. **Previews de Vercel (`*.vercel.app`)**: la cookie es de `api.mirufranco.com` con `SameSite=Strict`, así que un preview en otro dominio no la recibe y no podrá iniciar sesión contra ese backend. Para probar previews con sesión, usa un subdominio de `mirufranco.com` o un backend de staging en el mismo *site*.
4. **Verificación manual pendiente en navegador real** (no se pudo automatizar aquí: no hay credenciales de prueba, y levantar una segunda instancia del backend dispararía sus tareas programadas contra la BD de `.env`). Con las tres cuentas (cliente, admin, empleado):
   - Login con correo y con Google: en DevTools → Application → Cookies de `api.mirufranco.com` debe aparecer `mf_session` (HttpOnly, Secure, SameSite=Strict), y en Local Storage no debe haber `token`/`authToken`; `user` solo con id, nombre, email, rol, foto y permisos.
   - Navegar 30 s o más (el refresh rota la cookie) y ver que las notificaciones en vivo (SSE) siguen llegando.
   - "Cerrar sesión" y luego repetir una petición con la cookie anterior: debe responder 401.
   - Vincular Alexa (`/oauth/alexa`) con una cuenta de staff.
   - Como empleado, abrir `/operacion`: no debe aparecer ningún 403 en la consola.
5. **CSP de las páginas estáticas** (home, contacto, sobre-nosotros, terminos): su HTML se cachea en el CDN y no puede llevar un nonce por request, así que usan `script-src 'self' 'unsafe-inline'`. No reflejan entrada del usuario (contenido fijo y catálogo escapado por React). El resto del sitio conserva el nonce. Si se agrega una página a `force-static`, debe añadirse a `RUTAS_PUBLICAS_ESTATICAS` (un test lo verifica).
6. **Variable nueva (opcional)**: `NEXT_PUBLIC_SITE_URL` (dominio público para canonical, og:url y sitemap; por defecto `https://www.mirufranco.com`). Documentada en `.env.example`.

## Observaciones fuera del alcance de esta tarea (no se modificaron)

- **CORS del backend** (`src/main.ts`): los orígenes no listados se aceptan igual (`callback(null, true)`, "temporalmente para debugging") con `credentials: true`. Con cookie `SameSite=Strict` el riesgo entre sitios es bajo, pero conviene rechazar los orígenes fuera de la lista.
- **Datos personales en consola (producción)**: `components/auth/Login.tsx` (correo), `components/auth/ResetPassword.tsx` (prefijo del token de recuperación y correo), `ForgotPasswordSecurityQuestions.tsx` y `services/auth.ts` (pregunta de seguridad). No son URLs ni configuración, pero deberían quitarse o limitarse a desarrollo.
- **TTL del JWT**: el login emite tokens de 1 día, pero refresh y Google OAuth emiten de 7 días (`AuthService.generateToken`). Conviene unificarlo.
- **og:image**: se usa el logo cuadrado (`/logo-miru.jpg`). Para mejores vistas previas en redes, conviene una imagen de 1200×630.
- **Lint preexistente**: `react-hooks/set-state-in-effect` en `AdminLayout.tsx`, `OperacionLayout.tsx`, `operacion/page.tsx` y `agenda-calendario/page.tsx` (ya estaba antes de estos cambios).
