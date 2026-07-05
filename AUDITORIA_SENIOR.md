# AUDITORÍA SENIOR — Frontend Miru Franco (Next.js + TypeScript)

> Fecha: 2026-07-02 · Fase: verificación real de funcionamiento (pre-producción)

---

## 1. Resumen ejecutivo

- **¿Compila?** ✅ Sí. `npm run build` → "Compiled successfully", 98 páginas generadas, exit 0. `tsc --noEmit` exit 0 (incluyendo tras mis fixes).
- **¿Lint?** ⚠️ `npm run lint` → 8 errores + 24 warnings, **ninguno rompe el build** (son reglas react-hooks/unused-vars).
- **¿Tests?** ✅ 4/4 pasan (`security.test.ts`).
- **Bugs críticos/importantes:** 4 corregidos + 3 pendientes de decisión (2 tocan backend, 1 es de arquitectura de UI).
- **Hallazgo mayor:** 4 pantallas del módulo de operación son **mockups estáticos sin conexión al backend**.
- **Veredicto:** el frontend compila y arranca, y la mayoría de módulos admin están cableados. Pero **NO está listo para "todo funciona end-to-end"**: la operación de citas por UI no existe realmente y hay 2 mismatches de contrato que rompen flujos. Ver §8.

---

## 2. Tabla de resultados por fase

| Fase | Comando | Resultado |
|------|---------|-----------|
| 0 | `.env` / `.env.local` | ⚠️ Existe `.env` (no `.env.local`). `NEXT_PUBLIC_API_URL=http://localhost:3001` poblado. Next lee `.env`, así que arranca. Faltan algunas `NEXT_PUBLIC_*` opcionales (presets Cloudinary extra, redes sociales, costo envío) — tienen fallback |
| 0 | `npm install` | ✅ OK. ⚠️ `npm audit`: 8 vulnerabilidades (2 high, 5 moderate, 1 low) |
| 2.1 | `npm run build` | ✅ Compiled successfully, 98/98 páginas, exit 0 |
| 2.1 | `npm run lint` | ⚠️ 8 errores + 24 warnings (no bloquean build) |
| 2.2 | `npx vitest run` | ✅ 4/4 tests pasan (`src/app/utils/security.test.ts`) |
| 2.1 | `tsc --noEmit` (tras fixes) | ✅ exit 0 |

### Desglose de lint (por regla)

| Regla | Nº | Tipo |
|-------|----|------|
| `@typescript-eslint/no-unused-vars` | 14 | warning |
| `react-hooks/set-state-in-effect` | 9 | error (perf, no rompe build) |
| `react-hooks/exhaustive-deps` | 5 | warning |
| `@next/next` | 2 | warning |
| `react-hooks/incompatible-library` | 1 | warning |

Ejemplos de error: `AdminLayout.tsx:185` y `ThemeToggle.tsx:9` llaman `setState()` sincrónicamente dentro de un `useEffect`. No bloquean el build; conviene limpiarlos pero **no es urgente** y tocarlos puede cambiar comportamiento → no los modifiqué en esta fase.

---

## 3. Auditoría de conexión real (FASE 2.3) — por módulo

| Módulo | Ruta | ¿Conectado? | Notas |
|--------|------|-------------|-------|
| gestion-citas | operacion | ❌ **Mockup** | Datos hardcodeados, sin service, modales que solo cierran |
| agenda-calendario | operacion | ❌ **Mockup** | Sin import de service |
| atencion-sin-cita | operacion | ❌ **Mockup** | Sin import de service (POS sin cita no funciona por UI) |
| seguimiento-post-servicio | operacion | ❌ **Mockup** | Sin import de service |
| ejecucion-servicios | admin | ✅ | Usa `services/citas` (listar, checkOut, registrarMateriales); loading/error OK |
| gestion-personal | admin | ✅ | Usa `services/empleados`; 10 puntos de mutación, error handling amplio |
| quejas-garantias | admin | ✅ | Usa `services/quejas`; loading/error OK |
| venta-local | admin | ✅ | Usa `services/pos` (3 imports); loading/error/empty OK |
| clientes-crm | admin | ✅ | Usa `services/usuarios` para editar; loading/error/empty OK |
| inventario | admin | ✅ | 3 useEffect, loading/error/empty OK |
| control-caducidad | admin | ✅ | Read-only, wired |
| entregas-envios / facturacion / pagos / devoluciones-cambios | admin | ✅ | Importan service + useEffect (no auditados a fondo este pase; build OK) |
| paquetes / servicios / notificaciones / productos | varias | ✅ | Wired (no auditados a fondo este pase) |

**Estados loading/error/empty:** las pantallas admin conectadas manejan loading y error; el estado "vacío" explícito está presente en venta-local/clientes-crm/inventario, ausente o implícito en varias otras (menor).

---

## 4. Mismatches de contrato (front vs DTO backend) — lo más crítico

| # | Módulo | Front envía | Backend espera | Efecto | Estado |
|---|--------|-------------|----------------|--------|--------|
| MM1 | citas/materiales | `{presentacionId, cantidad, motivo}` | `{materiales:[{presentacionId,cantidad}]}` (`MaterialesCitaDto`) | 400 (whitelist) | 🔧 **Corregido** (`services/citas.ts`) |
| MM2 | quejas update | `PATCH /api/quejas/:id` | `@Put(':id')` | 404 | 🔧 **Corregido** → `put` |
| MM3 | seguimientos update | `PATCH /api/seguimientos/:id` | `@Put(':id')` | 404 | 🔧 **Corregido** → `put` |
| MM4 | usuarios/cliente update | `tipoCabello`, `alergias` (planos) | `UpdateUsuarioDto` NO los incluye (solo `perfilCapilar`) | 400, bloquea edición completa | ⏳ **Pendiente** (toca DTO+service+enum backend) |
| MM5 | POS venta | item con `servicioId`, `presentacionId?` | `ItemVentaDto` exige `presentacionId`, rechaza `servicioId` | 400 al vender servicio | ⏳ **Pendiente** (falta capacidad backend) |
| MM6 | empleados crear | `puesto?` opcional | `CreateEmpleadoDto.puesto` requerido (`@IsNotEmpty`) | 400 si se omite | 🟡 Menor (el form probablemente lo exige) |

---

## 5. Auditoría de calidad senior (FASE 2.4)

- **Manejo de errores HTTP:** `apiClient` (`services/client.ts`) centraliza y **redirige** a `/403`, `/500`, `/login` según el status; los servicios propagan `error.message`. La mayoría de pantallas muestran el mensaje genérico, sin distinguir 400/409 con UX específica (menor).
- **`getProductosSinRedirigir`:** existe **precisamente por un anti-patrón**: `apiClient` navega/redirige como efecto secundario dentro del fetch de datos. Para dashboard e inventario, donde no se quiere navegar al fallar, se hizo una variante con `fetch` crudo que devuelve `{data:[], error}` sin redirigir. ⚠️ Efecto colateral: ese `fetch` crudo **no adjunta el JWT** (solo `credentials:'include'`) — si el endpoint requiere Authorization (p.ej. inventario con `incluirNoDisponibles`), podría 401. Recomendación: exponer un flag `skipRedirect` en `apiClient` en vez de duplicar con fetch.
- **Estados de carga:** varias pantallas muestran tabla vacía sin spinner mientras cargan (no todas tienen skeleton). Menor.
- **Validación cliente:** los forms validan parcialmente; no se detectó validación coherente de fechas (inicio<fin) ni de números positivos en todos los modales — se delega al backend. Menor.
- **Mockups en producción:** 4 pantallas de operación renderizan datos ficticios. Riesgo alto de confusión: parecen funcionales pero no persisten nada.

---

## 6. Bugs corregidos en esta sesión (frontend)

| # | Archivo | Cambio |
|---|---------|--------|
| MM1 | `src/app/services/citas.ts` | `registrarMateriales` ahora envía `{ materiales: [{ presentacionId, cantidad }] }` |
| MM2 | `src/app/services/quejas.ts` | `actualizarQueja`: `apiClient.patch` → `apiClient.put` |
| MM3 | `src/app/services/seguimientos.ts` | `actualizarSeguimiento`: `apiClient.patch` → `apiClient.put` |

Verificado: `tsc --noEmit` exit 0 tras los cambios.
(El bug de ruteo `/api/api` se corrigió en el backend — ver su AUDITORIA_SENIOR.md.)

---

## 7. Bugs pendientes que requieren tu decisión

1. **MM4 (tipoCabello/alergias):** agregar esos campos a `UpdateUsuarioDto` en el backend + mapear en el service (tipoCabello es enum `liso|ondulado|rizado`). Toca backend → tu OK.
2. **MM5 (POS servicios):** decidir si el POS debe vender servicios; si sí, requiere ampliar `ItemVentaDto`/schema. Toca backend.
3. **Mockups de operación:** hay que cablear 4 pantallas a `services/citas` y `services/pos`. Es desarrollo de features (fuera del alcance "solo verificar/arreglar"), pero es la brecha más grande para "funciona end-to-end". ¿Lo agendamos como tarea aparte?
4. **Lint (9 errores react-hooks):** limpieza recomendada, no urgente.

---

## 8. Veredicto honesto

- **Compila y arranca:** ✅ sí (build, tests, typecheck en verde).
- **¿"Todo lo construido funciona end-to-end"?** ❌ **No todavía.** Con los 4 fixes aplicados, los flujos de **quejas, seguimientos y materiales de cita** ya deberían funcionar por API. Pero:
  - La **operación de citas por UI no existe** (mockups) — es la brecha más grande.
  - **Editar cliente (tipoCabello/alergias) está roto** por MM4.
  - **POS no vende servicios** (MM5) y su descuento de inventario no es transaccional (I1 backend).

**Recomendación:** NO pasar aún a "solo diseño y responsividad" como si la funcionalidad estuviera cerrada. Antes conviene: (a) decidir MM4/MM5 (backend), y (b) planificar el cableado real de las 4 pantallas de operación. El resto de módulos admin sí están funcionalmente cableados y pueden avanzar a diseño en paralelo.
