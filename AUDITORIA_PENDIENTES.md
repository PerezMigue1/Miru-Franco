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

### Segunda ronda: hallazgos que aparecieron durante la implementación

| # | Hallazgo | Estado | Dónde |
|---|----------|--------|-------|
| 15 | CORS abierto a cualquier origen | Corregido (backend). Opcional: configurar `CORS_ALLOWED_ORIGINS` en Render (ver abajo) | `backend-miru/src/config/cors.config.ts`, `src/main.ts`, `.env.example` |
| 16 | `console.log` con correo, prefijo del token de recuperación y pregunta de seguridad | Corregido (frontend) | `components/auth/Login.tsx`, `components/auth/ResetPassword.tsx`, `components/auth/ForgotPasswordSecurityQuestions.tsx`, `services/auth.ts` |
| 17 | TTL del JWT distinto según el flujo (1 d login / 7 d refresh y Google) | Corregido (backend): 24 h en los tres flujos | `backend-miru/src/auth/jwt-ttl.ts` y sus usos en `usuarios.service.ts`, `auth.service.ts`, los dos `JwtModule` y `oauth.service.ts` |

**15. CORS.** La lista blanca vive solo en `src/config/cors.config.ts`:
- Producción: `https://www.mirufranco.com` y `https://mirufranco.com`.
- Fuera de producción: además `http://localhost:3000`.
- Por entorno: `FRONTEND_URL` y la variable nueva **`CORS_ALLOWED_ORIGINS`** (orígenes exactos separados por comas; `*` se ignora).

Un origen fuera de la lista recibe la respuesta sin cabeceras CORS, así que el navegador la bloquea. Las peticiones sin `Origin` (SSR de Vercel, Alexa, curl) no cambian. Se quitaron las URLs de despliegues viejos de Vercel que estaban escritas en el código. **No hace falta ninguna variable para que producción funcione.** Pendiente de decisión manual:
- `https://miru-franco.vercel.app` hoy sirve el sitio (responde 200) y dejará de poder llamar a la API desde el navegador. Lo recomendable es redirigirlo a `www` en Vercel. Si se quiere mantener, agregarlo a `CORS_ALLOWED_ORIGINS` en Render. Sin la cookie Strict, desde ahí igual no se puede iniciar sesión.
- Para `npm run dev:mobile` contra un backend local, agregar el origen de la red local (p. ej. `http://192.168.1.10:3000`) a `CORS_ALLOWED_ORIGINS` en el `.env` local.

**16. Logs.** Se eliminaron los `console.log` con correo, longitud de contraseña, prefijo del token de recuperación y pregunta de seguridad. El único diagnóstico que queda está en `services/auth.ts`: solo con `NODE_ENV === 'development'` y sin valores. Verificado en `.next/static`: ninguno de esos textos queda en los bundles de producción.

**17. TTL.** El historial de git confirma que fue un descuido, no una decisión de diseño: ambos valores llegaron en la migración a NestJS (`6baf27f`) porque `AuthModule` y `UsuariosModule` registraban `JwtModule` con valores distintos, y no existe "recordarme". Queda una sola constante, `JWT_TTL_SEGUNDOS` = 24 h. Un spec falla si aparece otro `expiresIn` propio. El `expires_in` que se anuncia a Alexa también pasa a 24 h: antes decía 7 días, aunque el token que recibe sale del login web, que duraba 1 día.

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
3. **Previews de Vercel (`*.vercel.app`)**: la cookie es de `api.mirufranco.com` con `SameSite=Strict`, así que un preview en otro dominio no la recibe y no podrá iniciar sesión contra ese backend. Además, desde el hallazgo 15, un preview solo puede llamar a la API si su origen exacto está en `CORS_ALLOWED_ORIGINS`. Para probar previews con sesión, usa un subdominio de `mirufranco.com` o un backend de staging en el mismo *site*.
4. **Verificación manual pendiente en navegador real** (no se pudo automatizar aquí: no hay credenciales de prueba, y levantar una segunda instancia del backend dispararía sus tareas programadas contra la BD de `.env`). Con las tres cuentas (cliente, admin, empleado):
   - Login con correo y con Google: en DevTools → Application → Cookies de `api.mirufranco.com` debe aparecer `mf_session` (HttpOnly, Secure, SameSite=Strict), y en Local Storage no debe haber `token`/`authToken`; `user` solo con id, nombre, email, rol, foto y permisos.
   - Navegar 30 s o más (el refresh rota la cookie) y ver que las notificaciones en vivo (SSE) siguen llegando.
   - "Cerrar sesión" y luego repetir una petición con la cookie anterior: debe responder 401.
   - Vincular Alexa (`/oauth/alexa`) con una cuenta de staff.
   - Como empleado, abrir `/operacion`: no debe aparecer ningún 403 en la consola.
5. **CSP de las páginas estáticas** (home, contacto, sobre-nosotros, terminos): su HTML se cachea en el CDN y no puede llevar un nonce por request, así que usan `script-src 'self' 'unsafe-inline'`. No reflejan entrada del usuario (contenido fijo y catálogo escapado por React). El resto del sitio conserva el nonce. Si se agrega una página a `force-static`, debe añadirse a `RUTAS_PUBLICAS_ESTATICAS` (un test lo verifica).
6. **Variable nueva (opcional)**: `NEXT_PUBLIC_SITE_URL` (dominio público para canonical, og:url y sitemap; por defecto `https://www.mirufranco.com`). Documentada en `.env.example`.

## Dependencias con riesgo aceptado

**`xlsx` 0.18.5 (SheetJS de npm)**, alta en `npm audit` sin arreglo publicado en npm: prototype pollution ([GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6)) y ReDoS ([GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9)). Revisado el 2026-10-02.

- **Uso**: solo `exportarReporteExcel` en `src/app/utils/exportReportes.ts`, llamada desde `/admin/reportes`. Arma la hoja en el navegador con `aoa_to_sheet` + `writeFile` a partir de datos que ya devolvió el backend.
- **Por qué se acepta**: los dos fallos están en el *parser* (`XLSX.read` / `readFile` sobre un archivo manipulado). La app nunca lee hojas de cálculo: el único importador (`/admin/base-datos`) acepta `.csv` y `.json` y no usa `xlsx`.
- **Revisar de nuevo si** se agrega cualquier lectura de `.xlsx`/`.xls` subidos por usuarios. En ese caso, cambiar a la build oficial de SheetJS (`https://cdn.sheetjs.com`, ≥ 0.20.2) o a `exceljs`.

## Observaciones fuera del alcance de esta tarea (no se modificaron)

- CORS abierto, datos personales en consola y TTL del JWT: resueltos en la segunda ronda (hallazgos 15-17, arriba).
- **og:image**: se usa el logo cuadrado (`/logo-miru.jpg`). Para mejores vistas previas en redes, conviene una imagen de 1200×630.
- **Lint preexistente**: `react-hooks/set-state-in-effect` en `AdminLayout.tsx`, `OperacionLayout.tsx`, `operacion/page.tsx` y `agenda-calendario/page.tsx` (ya estaba antes de estos cambios).
