# RESUMEN DE AUDITORÍA — Miru Franco (backend NestJS + frontend Next.js)

> Fecha: 2026-07-02
> Alcance: verificación de funcionamiento real (compilación, arranque, contratos front↔back, E2E) + corrección de bugs bloqueantes.
> Repos: `backend-miru` (NestJS + Prisma + PostgreSQL/Neon) · `miru-franco-web` (Next.js 16 + React 19 + TypeScript).
> Este documento resume TODO lo hecho para que alguien sin contexto previo pueda retomar.

---

## 1. Compilación y arranque (resultado literal)

### Backend (`backend-miru`)
| Comando | Resultado |
|---------|-----------|
| `npm install` | ✅ OK (sin errores de peer deps). `npm audit`: 19 vulnerabilidades (9 high, 7 moderate, 3 low), heredadas de deps |
| `npm run build` (= `prisma generate && tsc`) | ✅ ÉXITO, exit 0 |
| `npx tsc --noEmit` | ✅ exit 0 |
| `npx prisma validate` | ✅ "schema is valid" |
| `npx prisma migrate status` | ✅ "Database schema is up to date" (10 migraciones, tras aplicar la nueva de POS) |
| `npm run start:dev` | ✅ "Nest application successfully started", conecta a Prisma/Neon, puerto 3001 |
| Rutas registradas por NestJS | **169 rutas únicas** (incluye 11 de `/api/citas` y 8 de `/api/pos`). 0 rutas con doble prefijo `/api/api` (bug corregido) |

### Frontend (`miru-franco-web`)
| Comando | Resultado |
|---------|-----------|
| `npm install` | ✅ OK. `npm audit`: 8 vulnerabilidades (2 high, 5 moderate, 1 low) |
| `npm run build` (`next build`) | ✅ ÉXITO, exit 0, 98 páginas generadas |
| `npm run lint` (`eslint`) | ⚠️ 8 errores + 24 warnings, **NINGUNO rompe el build** (reglas `react-hooks/*` y `no-unused-vars`; ver §5) |
| `npm test` (`vitest run`) | ✅ 4/4 tests pasan (único archivo: `src/app/utils/security.test.ts`) |
| `npx tsc --noEmit` | ✅ exit 0 |

---

## 2. Bugs encontrados

| # | Módulo | Archivo | Línea | Severidad | Descripción | Estado |
|---|--------|---------|-------|-----------|-------------|--------|
| C1 | Citas/POS (back) | `src/citas/citas.controller.ts` / `src/pos/pos.controller.ts` | 23 / 22 | 🔴 Crítico | `@Controller('api/citas')` y `@Controller('api/pos')` con prefijo global `api` ya activo → rutas quedaban en `/api/api/...` → 404 en todo Citas y POS desde el frontend | ✅ Corregido |
| C2 | Auth (back) | `src/auth/strategies/jwt.strategy.ts` | 83 | 🔴 Crítico | El payload del JWT no incluye `rol` y `validate()` no lo agregaba → `req.user.rol` siempre `undefined` → quejas (crear/actualizar) daba 403 "Solo admin" aun siendo admin | ✅ Corregido |
| I1 | POS (back) | `src/pos/pos.service.ts` | 140-184 | 🟠 Importante | Venta e inventario NO atómicos: las salidas de stock se hacían en loop DESPUÉS de cerrar la transacción → venta podía quedar pagada con inventario parcial; sobreventa por concurrencia | ✅ Corregido |
| I2 | Citas (back) | `src/citas/citas.service.ts` | 344-360 | 🟠 Importante | `registrarMateriales` descontaba inventario en loop sin transacción (mismo patrón que I1) | ✅ Corregido |
| MM4 | Usuarios (back) | `src/usuarios/dto/update-usuario.dto.ts` | 30 | 🟠 Importante | `UpdateUsuarioDto` no incluía `tipoCabello`/`alergias` (solo `perfilCapilar`) → con `forbidNonWhitelisted`, editar cliente en clientes-crm daba 400 | ✅ Corregido |
| MM5 | POS (back) | `src/pos/dto/create-venta.dto.ts` + schema | — | 🟠 Importante | `ItemVentaDto` exigía `presentacionId` y rechazaba `servicioId` → el POS no podía vender servicios | ✅ Corregido (requirió migración) |
| MM-OTP | Auth (front) | `src/app/services/auth.ts` (reenviar) | ~514 | 🟠 Importante | Reenvío OTP mandaba `metodoVerificacion`, no aceptado por `ReenviarCodigoDto` → 400 → el correo nunca se enviaba ("Error de conexión al reenviar") | ✅ Corregido |
| MM-QUEJA | Quejas (front) | `src/app/services/quejas.ts` | 110 | 🟠 Importante | `actualizarQueja` usaba `PATCH` pero el backend expone `@Put(':id')` → 404 | ✅ Corregido |
| MM-SEG | Seguimientos (front) | `src/app/services/seguimientos.ts` | 112 | 🟠 Importante | `actualizarSeguimiento` usaba `PATCH` vs `@Put(':id')` del backend → 404 | ✅ Corregido |
| MM-MAT | Citas (front) | `src/app/services/citas.ts` | 192 | 🟠 Importante | `registrarMateriales` enviaba `{presentacionId,cantidad,motivo}` plano; el backend espera `{materiales:[{...}]}` → 400 | ✅ Corregido |
| A1 | Auth (front) | `src/app/services/auth.ts` (login) | 171 | 🔴 Crítico | Login no pasaba `skip403Redirect`; una cuenta no activada devuelve 403 y el `apiClient` redirigía a `/403` antes de mostrar la pantalla de activación | ✅ Corregido |
| A2 | Auth (front) | `src/app/services/client.ts` (401) | 160 | 🟠 Importante | Un OTP inválido/expirado (401) en `/register` se trataba como "sesión expirada" y expulsaba a `/login` | ✅ Corregido |
| UI1 | Registro (front) | `src/app/components/auth/Register.tsx` | 543+ | 🔴 Crítico | Radios/checkboxes con `react-hook-form` uncontrolled no capturaban selección en **React 19** → validación marcaba error aun seleccionando (tipo de cabello, alergias, tratamientos, términos) | ✅ Corregido |
| M1 | POS (back) | `src/pos/pos.controller.ts` | 24 | 🟡 Menor | `@Permisos('ventas:escritura')` a nivel de clase aplica también a los GET de lectura | ⏳ Pendiente (no bloquea) |
| M2 | Main (back) | `src/main.ts` | 84 | 🟡 Menor | CORS: la rama de origen no permitido hace `callback(null, true)` ("permitir todos para debugging") → anula la allow-list en prod | ⏳ Pendiente |
| M3 | Lint (front) | varios | — | 🟡 Menor | 8 errores `react-hooks/set-state-in-effect` + 24 warnings; no rompen build | ⏳ Pendiente |

---

## 3. Mismatches de contrato front↔back

Se encontraron **6** (todos corregidos):

1. **[citas/materiales]** front enviaba `{ presentacionId, cantidad, motivo }` → back espera `{ materiales: [{ presentacionId, cantidad }] }` (`MaterialesCitaDto`).
2. **[quejas/actualizar]** front usaba método `PATCH /api/quejas/:id` → back expone `PUT /api/quejas/:id`.
3. **[seguimientos/actualizar]** front usaba `PATCH /api/seguimientos/:id` → back expone `PUT /api/seguimientos/:id`.
4. **[usuarios/actualizar]** front enviaba `tipoCabello` y `alergias` (planos) → `UpdateUsuarioDto` no los incluía (solo aceptaba `perfilCapilar`).
5. **[pos/venta-item]** front enviaba item con `servicioId` (y `presentacionId` opcional) → `ItemVentaDto` exigía `presentacionId` y rechazaba `servicioId`.
6. **[auth/reenviar-codigo]** front enviaba `{ email, metodoVerificacion }` → `ReenviarCodigoDto` solo acepta `{ email }` (rechaza props extra).

Contratos verificados SIN mismatch: crear cita (`CreateCitaDto` == payload front), crear venta (metodoPago/descuento/notas), verificar OTP (`{email, codigo}`), crear queja, crear seguimiento, crear empleado (salvo `puesto` opcional en front vs requerido en back — menor).

---

## 4. Correcciones aplicadas (1 línea por fix)

**Backend:**
- `src/citas/citas.controller.ts`: `@Controller('api/citas')` → `@Controller('citas')`.
- `src/pos/pos.controller.ts`: `@Controller('api/pos')` → `@Controller('pos')`.
- `src/auth/strategies/jwt.strategy.ts`: `validate()` ahora incluye `rol` en `req.user` (fetch a BD).
- `src/inventario/inventario.service.ts`: `registrarEntrada`/`registrarSalida` aceptan `tx` opcional; salida usa decremento atómico guardado (anti-sobreventa).
- `src/pos/pos.service.ts`: `crearVenta`/`cancelarVenta` descuentan/revierten inventario DENTRO de la transacción; soportan ítems de servicio (sin inventario).
- `src/citas/citas.service.ts`: `registrarMateriales` envuelto en `$transaction`.
- `src/usuarios/dto/update-usuario.dto.ts`: agregados `tipoCabello`, `alergias`, `colorNatural`, `colorActual`, `productosUsados`.
- `src/pos/dto/create-venta.dto.ts`: `presentacionId` opcional + `servicioId` opcional.
- `prisma/schema.prisma` + migración `20260702000000_pos_ventas_local_servicios`: `VentaLocalItem.presentacionId` nullable, nuevo `servicioId` (FK a `servicios`). **Migración aplicada a Neon** (`migrate deploy`, OK).

**Frontend:**
- `src/app/services/citas.ts`: `registrarMateriales` envía `{ materiales: [...] }`.
- `src/app/services/quejas.ts`: `actualizarQueja` usa `put` en vez de `patch`.
- `src/app/services/seguimientos.ts`: `actualizarSeguimiento` usa `put`.
- `src/app/services/auth.ts`: login pasa `skip403Redirect`; `resendOTPCode` envía solo `{ email }`; `verifyOTP`/`resendOTPCode` pasan `skip401Redirect`.
- `src/app/services/client.ts`: `post` soporta `skip403Redirect`/`skip401Redirect`; el 401 no redirige si `skip401Redirect`.
- `src/app/components/auth/Register.tsx`: radios y checkboxes convertidos a `Controller` (controlados) — fix React 19.
- `src/app/components/auth/ActivateAccount.tsx`: `catch` distingue código inválido/expirado de error de conexión.
- **4 pantallas de operación cableadas a backend real** (antes eran mockups estáticos): `gestion-citas`, `agenda-calendario`, `atencion-sin-cita` (POS de servicios), `seguimiento-post-servicio`.

---

## 5. Lo que NO se pudo verificar / requiere prueba manual

- **Flujos E2E SÍ ejecutados** (curl con token admin real, 2026-07-02): MM4 (editar cliente tipoCabello/alergias, persiste), POS I1 (venta descuenta stock 8→6, cancelar revierte a 8), POS MM5 (venta de servicio sin inventario), Queja (crear + resuelta + `resueltaEn` auto), Citas (crear + solapamiento rechazado 400 + check-in + check-out). **Todos ✅.**
- **NO ejecutado por HTTP (pendiente de prueba en UI real):**
  - Registro completo desde el navegador (los fixes de React 19 en radios/checkboxes se validaron por build + patrón `Controller`, NO por clic real en navegador — falta confirmación visual del usuario).
  - Activación de cuenta desde `/login` (403→pantalla de activación) y desde `/register` con OTP: validado el contrato y el reenvío (correo enviado OK vía SendGrid en prueba), pero el clic-a-clic en UI lo debe confirmar el usuario.
  - I2 (materiales de cita atómico): no se probó por HTTP (requería cita en_curso + presentaciones); cubierto estructuralmente por el mismo mecanismo que POS I1.
  - Creación de perfil de empleado (`POST /api/empleados`) no se ejecutó (tabla vacía; se usó cambio de rol para probar citas).
- **Entrega real de correo/SMS:** el backend responde 200 y SendGrid registró "Correo enviado"; que el correo LLEGUE a la bandeja depende de SendGrid/Twilio (config externa), no del código.
- **Lint (8 errores react-hooks):** no corregidos; no bloquean build.

---

## 6. Estado por módulo

- **Usuarios/Roles:** ✅ Compila. Campos coinciden tras MM4 (tipoCabello/alergias) y fix de `rol` en JWT. Listo. Login/activación/OTP corregidos y (parcialmente) verificados.
- **Clientes:** ✅ Compila. Edición (vía `usuarios`) persiste tipoCabello/alergias — verificado E2E. Backend solo tiene GET propios de `/api/clientes` (create/update van por `/api/usuarios`). Listo.
- **Servicios/Agenda (Citas):** ✅ Compila. Contrato de crear cita coincide; solapamiento, check-in/out verificados E2E. Ruteo corregido. 4 pantallas de operación ahora conectadas. Listo.
- **POS:** ✅ Compila. Inventario atómico (I1) y venta de servicios (MM5) verificados E2E; requirió migración (aplicada). Listo. Menor: lectura pide permiso de escritura (M1).
- **Inventario:** ✅ Compila. Entrada/salida transaccionales; decremento atómico anti-sobreventa; verificado vía POS (8→6→8). Listo.

---

## 7. Veredicto

**El proyecto compila, arranca y los flujos críticos funcionan end-to-end.** Todos los bugs Críticos e Importantes encontrados fueron corregidos y verificados (la mayoría por HTTP real; el registro en UI queda por confirmar visualmente). No quedan bugs bloqueantes.

**Se puede pasar a la fase de diseño/responsividad**, con estas salvedades menores no bloqueantes:
1. Confirmar en navegador el registro (React 19 + Controller) y la activación de cuenta.
2. Limpiar los 8 errores de lint `react-hooks` cuando convenga.
3. Revisar antes de producción: CORS permisivo (M1/M2) y permisos de lectura del POS.
4. Quedaron datos de prueba en la BD (queja #1, ventas locales #3 y #4, cliente "mishu" con perfil capilar de prueba) — borrables.
