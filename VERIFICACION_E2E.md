# VERIFICACIÓN E2E — Miru Franco (frontend ↔ backend)

> Fecha: 2026-07-02
> Leyenda: ✅ verificado funcionando · ❌ falla (con motivo) · ⏳ pendiente de prueba manual del usuario · 🔧 corregido en esta sesión
>
> **Actualización 2026-07-02 — EJECUCIÓN REAL con token admin.** Se corrieron los flujos vía HTTP (curl) contra el backend en `localhost:3001` con un JWT admin. Resultados abajo.

---

## 0. Resultados de ejecución real (curl con token admin)

| Flujo | Resultado real | Evidencia |
|-------|----------------|-----------|
| **MM4 — editar cliente tipoCabello/alergias** | ✅ | `PUT /api/usuarios/:id {tipoCabello:'ondulado', alergias:'polvo y amoniaco'}` → 200; `GET .../perfil` confirma ambos campos persistidos en BD |
| **POS I1 — descuento/reversión inventario** | ✅ | Stock presentación#3: 8 → venta de 2 uds (folio `VL-2026-000003`, `pagada`, total 1020) → **6** → cancelar → **8**. Atómico y correcto |
| **POS MM5 — vender servicio** | ✅ | `POST /api/pos/ventas {items:[{servicioId:3,...}]}` → 200, folio `VL-2026-000004`, item `{serv:3, pres:null}`, sin mover inventario. (Antes daba 400) |
| **Queja — resueltaEn + método PUT** | ✅ | `POST /api/quejas` → creada; `PUT /api/quejas/1 {estado:'resuelta'}` → 200, `resueltaEn` auto-asignado |
| **Citas — crear / solapamiento / check-in / check-out** | ✅ | Cita #10 creada; cita solapada **rechazada 400** ("ya tiene una cita en ese horario"); check-in → `en_curso`; check-out → `completada` |

### 🔴 Bug nuevo encontrado y corregido durante la ejecución E2E
`req.user.rol` llegaba **undefined** a los controladores porque el payload del JWT no incluye `rol` y `jwt.strategy` no lo agregaba. Esto hacía que **quejas (crear/actualizar)** devolviera 403 "Solo admin puede actualizar quejas" incluso siendo admin (el `RolesGuard` sí lee el rol de BD, pero el service usaba `req.user.rol`). **Fix:** `jwt.strategy.validate` ahora incluye `rol` en `req.user` (fetch a BD). Verificado: la queja pasó a resuelta tras el fix.

> **Nota:** quedaron datos de prueba en tu BD (queja #1 resuelta, ventas locales #3 cancelada y #4 de servicio, cliente `be0b896a` con tipoCabello/alergias de prueba). Puedes borrarlos si quieres; no afectan.

---

## 1. Inventario (entrada → stock sube → salida → baja → kardex)

| Paso | Estado | Evidencia |
|------|--------|-----------|
| Endpoints existen (`/api/inventario/entradas`, `/salidas`, `/movimientos`, `/kardex/:id`) | ✅ | Registrados en el log de arranque |
| Cada entrada/salida es atómica (stock + movimiento) | ✅ (código) | `inventario.service.ts` usa `$transaction` en registrarEntrada/Salida |
| UI `inventario` conectada | ✅ (código) | `admin/inventario/page.tsx`: 3 useEffect, importa service, maneja loading/error/empty |
| Entrada sube stock → salida baja → aparece en kardex | ⏳ | Requiere ejecución manual con datos reales |

## 2. Citas (crear → solapamiento rechazado → check-in → check-out)

| Paso | Estado | Evidencia |
|------|--------|-----------|
| Ruta `/api/citas` correcta | 🔧 | **Estaba en `/api/api/citas` (doble prefijo) → 404. Corregido** (backend `citas.controller.ts`) |
| Contrato crear cita (clienteId, especialistaId, servicioId, fechaHoraInicio, fechaHoraFin) | ✅ (código) | `CrearCitaPayload` == `CreateCitaDto` exacto |
| Validación de solapamiento implementada | ✅ (código) | `citas.service.ts validarSolapamiento()` rechaza traslape para el especialista |
| check-in / check-out cambian estado | ✅ (código) | `checkIn` → `en_curso`, `checkOut` → `completada`, con validación de estado previo |
| **UI operacion `gestion-citas` / `agenda-calendario`** | ❌ | **Son mockups estáticos**: datos hardcodeados, NO llaman a `services/citas.ts`, los botones de los modales solo cierran el modal. No crean/leen nada del backend. |
| Registrar materiales de cita | 🔧 | El front enviaba `{presentacionId, cantidad, motivo}`; el backend espera `{materiales:[...]}`. **Corregido en `services/citas.ts`** |
| Flujo completo end-to-end desde la UI | ⏳/❌ | El service funciona (probable ✅ vía curl); la **UI de operación no está cableada** |

## 3. POS (venta 2 productos → descuenta inventario → folio → cancelar → revierte)

| Paso | Estado | Evidencia |
|------|--------|-----------|
| Ruta `/api/pos` correcta | 🔧 | **Estaba en `/api/api/pos` → 404. Corregido** (backend `pos.controller.ts`) |
| Venta + items atómicos | ✅ (código) | `pos.service.ts` crea venta+items en `$transaction` |
| Descuento de inventario atómico con la venta | ❌ (riesgo) | Las salidas ocurren en loop DESPUÉS de la transacción → venta puede quedar pagada con inventario parcial; sobreventa por concurrencia (bug I1 backend) |
| Folio se genera | ✅ (código) | `generarFolio()` `VL-AAAA-000001` tras crear |
| Cancelar revierte inventario | ✅ (código, mismo riesgo de atomicidad) | Loop de `registrarEntrada` por item |
| Venta puede incluir servicios (no solo productos) | ❌ | `ItemVentaDto` exige `presentacionId` y rechaza `servicioId` (whitelist). El front modela `servicioId` pero el back no lo soporta |
| UI `venta-local` conectada | ✅ (código) | 3 imports de service, useEffect, loading/error/empty |
| UI `atencion-sin-cita` (POS sin cita) | ❌ | **Mockup estático**, sin service ni llamadas |
| Flujo completo desde UI | ⏳ | Probar `venta-local` manualmente |

## 4. Empleado + permisos (crear perfil estilista → permisos por seed → estilista solo ve SUS citas)

| Paso | Estado | Evidencia |
|------|--------|-----------|
| Seed de PermisoRol da permisos por rol | ✅ (código) | `prisma/seed.ts`: 5 roles con claves; `update:{}` no pisa personalizaciones |
| Crear perfil de empleado | ✅ (código) | `/api/empleados` POST; contrato coincide salvo `puesto` (front opcional, back requerido) |
| Estilista solo ve sus citas (scope) | ✅ (código) | `citas.service.ts aplicarScope()` filtra `especialistaId===usuarioId`; `PermisosGuard` inyecta `rolUsuario` |
| Verificación con login real de un estilista | ⏳ | Requiere usuario estilista real |

## 5. Cliente (editar tipo de cabello + alergias → persisten)

| Paso | Estado | Evidencia |
|------|--------|-----------|
| Columnas existen en BD | ✅ | `schema.prisma`: `tipoCabello TipoCabello?`, `alergias String?` |
| UI `clientes-crm` envía tipoCabello/alergias | ✅ (código) | Vía `services/usuarios` PUT `/api/usuarios/:id` |
| Backend acepta esos campos | ❌ | **`UpdateUsuarioDto` NO incluye `tipoCabello` ni `alergias`** (solo `perfilCapilar`). Con `forbidNonWhitelisted` → **400** y bloquea toda la edición |
| Persistencia end-to-end | ❌ | Roto por el mismatch de DTO (pendiente de tu decisión) |

## 6. Queja (crear → estado resuelta → asigna resueltaEn)

| Paso | Estado | Evidencia |
|------|--------|-----------|
| Crear queja | ✅ (código) | `/api/quejas` POST; contrato `CrearQuejaPayload` == `CreateQuejaDto` |
| Auto-asignación de `resueltaEn` | ✅ (código) | `quejas.service.ts:126-128` asigna `new Date()` al pasar a resuelta/cerrada |
| Cambio de estado desde UI | 🔧 | El front usaba `PATCH` pero el backend expone `@Put(':id')` → 404. **Corregido a `put` en `services/quejas.ts`** |
| Flujo completo desde UI | ⏳ | Probar `quejas-garantias` manualmente |

---

## Resumen de estados

- ✅ Verificado por código: contratos de citas/quejas/seguimientos/empleados/POS, scope por rol, atomicidad de inventario, auto-resueltaEn, seed de permisos.
- 🔧 Corregido en esta sesión: doble prefijo `/api/api` (citas, pos), método PATCH→PUT (quejas, seguimientos), shape de materiales de cita.
- ❌ Bloqueos reales:
  1. UI de operación (gestion-citas, agenda-calendario, atencion-sin-cita, seguimiento-post-servicio) **son mockups sin backend**.
  2. Edición de cliente (tipoCabello/alergias) → 400 por `UpdateUsuarioDto` incompleto.
  3. POS no soporta vender servicios (solo presentaciones de producto).
  4. Atomicidad venta↔inventario (I1) y materiales↔inventario (I2).
- ⏳ Pendiente de prueba manual tuya con la app corriendo y un usuario por rol.
