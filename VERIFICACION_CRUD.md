# VERIFICACIÓN CRUD — Inventario, Servicios, Usuarios/Roles, Clientes CRM

> Fecha: 2026-07-08 · Sesión de **diagnóstico** (sin corregir).
> Fuentes: (a) revisión del código frontend; (b) status HTTP reales ejecutados contra el backend en esta sesión (ver `VERIFICACION_HTTP.md`). No se creó data de prueba nueva en productos para no ensuciar el catálogo real.
> Leyenda: ✅ funciona · ⚠️ funciona con problemas · ❌ falta o roto.

## Tabla resumen

| Módulo | Crear | Editar | Eliminar/Estado | Notas |
|--------|-------|--------|-----------------|-------|
| **Inventario (Producto)** | ✅ | ✅ | ✅ | Delete solo desde la página de detalle `/productos/[id]`, no desde la lista de inventario |
| **Servicios** | ✅ | ❌ **falta en la UI** | ✅ | `updateServicio` existe en el service y el backend soporta `PUT` (200), pero la pantalla no lo expone (sin botón Editar) |
| **Usuarios y Roles** | ✅ | ⚠️ incompleto | ✅ | Editar solo envía nombre/telefono/rol (faltan 8 campos). Reactivar SÍ existe y funciona |
| **Clientes CRM** | ⚠️ no-op | ⚠️ duplicado + incompleto en detalle | ✅ | 2 rutas de edición (lista completa / detalle solo 2 campos). "Nuevo Cliente" no crea, redirige |

---

## MÓDULO 1 — Inventario · ¿CRUD completo? Sí, con un detalle de UX

- **Crear producto** ✅ — `admin/productos/nuevo` usa `createProducto` → `POST /api/productos`. Endpoint registrado. (No lo ejecuté por HTTP para no crear producto basura en el catálogo real; el código está cableado.)
- **Editar producto** ✅ — `admin/productos/[id]` carga con `getProductoPorId` (useEffect, línea 141) y guarda con `updateProducto` → `PUT /api/productos/:id`. Carga poblada + guardado presentes.
- **Eliminar producto** ✅ (con matiz) — `deleteProducto` → `DELETE /api/productos/:id` (borrado lógico) existe **solo en la página de detalle `/productos/[id]`**. ⚠️ **La lista de inventario (`admin/inventario`) NO tiene botón de eliminar producto** — hay que entrar al detalle para borrarlo. No es un hueco de CRUD, pero sí de accesibilidad/UX.
- **Movimientos** ✅ — `registrarEntrada`, `registrarSalida`, `registrarAjuste` (líneas 223/239/255). Verificados en vivo por HTTP en esta sesión (201, con descuento/validación de stock correctos).

## MÓDULO 2 — Servicios · ⚠️ FALTA EDITAR (confirmado)

- **Crear servicio** ✅ — `createServicio` → `POST /api/servicios` (verificado 201).
- **Editar servicio** ❌ — **La página `admin/servicios/page.tsx` NO importa ni llama a `updateServicio`.** Su import (línea 16) es solo `getServicios, createServicio, deleteServicio`. No hay botón "Editar" ni modal de edición. **Es un hueco real de CRUD en la UI.**
  - Dato clave: la función `updateServicio(id, payload)` **SÍ existe** en `services/servicios.ts` (línea 319) y el backend expone `PUT /api/servicios/:id` (verificado 200 en esta sesión). Solo falta conectarlo en la pantalla (botón Editar → precargar → `updateServicio`).
- **Eliminar servicio** ✅ — `deleteServicio` → `DELETE /api/servicios/:id` (verificado 200).
- **Conclusión:** CRUD **incompleto — falta Editar en la UI.** El backend y el service ya lo soportan; es solo frontend. (Nota: pediste no tocar `servicios`; este es el hueco que querías confirmar para decidir la excepción.)

## MÓDULO 3 — Usuarios y Roles · Editar incompleto; Reactivar SÍ funciona

- **Crear usuario** ✅ — `createUsuario` (líneas 209-227) envía nombre, email, telefono, fechaNacimiento, perfil capilar (tipoCabello, alergias) y recibePromociones; luego `patchUsuarioRol` para el rol.
- **Editar usuario** ⚠️ **incompleto** — `handleGuardarEdicion` (líneas 265-269) solo envía **`nombre`, `telefono`, `rol`**. El formulario de edición solo precarga nombre y telefono (líneas 171-173).
  - **Campos editables que FALTAN en el form (8):** `fechaNacimiento`, `foto`, `recibePromociones`, `tipoCabello`, `colorNatural`, `colorActual`, `productosUsados`, `alergias`.
  - (El backend `PUT /api/usuarios/:id` acepta todos esos campos — verificado; el hueco es del formulario frontend.)
- **Cambiar rol** ✅ — `patchUsuarioRol` → `PATCH /api/usuarios/:id/rol` (verificado 200).
- **Activar / Desactivar** ✅ **funciona** (el reporte de "no hay opción para reactivar" NO se confirma como bug):
  - La lista **NO oculta inactivos** (filtra solo por rol de personal, línea 99), así que los usuarios inactivos SÍ aparecen.
  - El botón **"Activar"** (líneas 460-468) **siempre se renderiza**, habilitado solo cuando `usuario.activo === false` (`disabled={usuario.activo || ...}`). Para un usuario inactivo está habilitado y clicable.
  - `handleActivar` (línea 319) → `patchUsuarioEstado(id, true)` → `PATCH /api/usuarios/:id/estado` (verificado 200).
  - **Posible causa de la confusión del usuario:** el botón "Activar" se muestra SIEMPRE (en gris/disabled cuando el usuario ya está activo), junto a "Editar" y "Eliminar", y en móvil los 3 botones hacen wrap (`flex flex-wrap`). Para un usuario ACTIVO se ve un "Activar" gris → parece que "no hay opción". Pero para un INACTIVO funciona. Es un tema de UX/visibilidad, no de lógica rota.

## MÓDULO 4 — Clientes CRM · Editar duplicado; crear no-op

- **Listar / Buscar** ✅ — búsqueda por nombre, teléfono o email (líneas 82-83).
- **Editar cliente** ⚠️ **DUPLICADO, con distinta completitud** — hay **DOS botones "Editar"** en dos lugares:
  1. **En la lista** (`clientes-crm/page.tsx`, botón línea 222 → `openEditar`): modal **COMPLETO**, 11 campos (nombre, telefono, email, fechaNacimiento, foto, recibePromociones, tipoCabello, colorNatural, colorActual, productosUsados, alergias) — líneas 108-140.
  2. **En el detalle "Ver perfil"** (`clientes-crm/[id]/page.tsx`, botón línea 153 → modal): **INCOMPLETO**, solo envía **nombre + telefono** (líneas 99-102).
  - Además, cada fila de la lista tiene **"Ver perfil" + "Editar"** (2 botones por cliente).
  - Resumen: el "editar suelto" (lista) está completo; el "editar dentro de ver perfil" (detalle) es el incompleto (2 campos). Eso explica los dos reportes del usuario: "botón duplicado" y "faltan campos" (los del detalle).
- **Crear cliente** ⚠️ **no-op** — el modal tiene modo "Nuevo Cliente" (título línea 286), pero `handleGuardar` en modo crear **no llama a `createUsuario`**: solo cierra el form y hace `router.push('/admin/usuarios-roles')` (líneas 148-150). Es decir, crear cliente desde el CRM está delegado/redirigido a Usuarios y Roles; no crea nada por sí mismo.
- **Eliminar/Desactivar** ✅ — desactivación lógica presente (lista y detalle).

---

## Resumen de hallazgos priorizados (para decidir qué corregir)

| # | Módulo | Hallazgo | Severidad |
|---|--------|----------|-----------|
| 1 | Servicios | **No hay Editar en la UI** (updateServicio existe pero no se usa) | 🔴 Hueco de CRUD |
| 2 | Usuarios | Editar solo guarda 3 campos; faltan 8 editables | 🟠 Editar incompleto |
| 3 | Clientes CRM | Editar duplicado: lista (completo) vs detalle (solo 2 campos) | 🟠 Inconsistencia |
| 4 | Clientes CRM | "Nuevo Cliente" no crea (redirige a usuarios-roles) | 🟠 Crear no funcional |
| 5 | Usuarios | Botón "Activar" siempre visible (gris si activo) → confunde | 🟡 UX (funciona) |
| 6 | Inventario | Eliminar producto solo desde detalle, no desde la lista | 🟡 UX (funciona) |

**Nada roto a nivel backend** — todos los endpoints CRUD funcionan (verificados por HTTP: servicios PUT/DELETE, usuarios PUT/PATCH, inventario movimientos). Los huecos son **de frontend** (UI que no expone o no completa operaciones que el backend sí soporta).

**No corregí nada** — esperando tu decisión sobre qué atacar y en qué orden.
