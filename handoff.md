# Handoff — Rediseño Visual miru-franco-web

## Objetivo

Mejorar visualmente todas las pantallas privadas del proyecto `miru-franco-web` (salón de belleza / e-commerce) aplicando mejoras de CSS, animaciones, iconografía y layout — sin tocar colores, lógica de negocio, textos, ni el backend.

---

## Estado actual

Rediseño visual en progreso. Las pantallas de tienda online y servicios/citas del cliente están completas. El dashboard admin tiene un nuevo layout con sidebar hamburguesa funcional. Quedan pendientes las pantallas de perfil y las pantallas secundarias del admin.

Se resolvió además un bug de producción: productos no visibles por un mismatch de tipo en la columna `caracteristicas` de la BD.

---

## Archivos en los que se ha trabajado

### Tienda online (cliente)
- `src/app/(screens)/(privada)/cliente/tienda-online/page.tsx`
- `src/app/(screens)/(privada)/cliente/tienda-online/productos/[id]/DetalleProductoClient.tsx`
- `src/app/(screens)/(privada)/cliente/tienda-online/carrito/page.tsx`
- `src/app/(screens)/(privada)/cliente/tienda-online/checkout/page.tsx`
- `src/app/(screens)/(privada)/cliente/tienda-online/confirmacion/page.tsx`
- `src/app/(screens)/(privada)/cliente/tienda-online/mis-pedidos/page.tsx`
- `src/app/(screens)/(privada)/cliente/tienda-online/mis-pedidos/[id]/page.tsx`

### Servicios y citas (cliente)
- `src/app/(screens)/(privada)/cliente/servicios-citas/page.tsx`
- `src/app/(screens)/(privada)/cliente/servicios-citas/mis-citas/page.tsx`
- `src/app/(screens)/(privada)/cliente/servicios-citas/crear-cita/page.tsx`

### Admin
- `src/app/(screens)/admin/page.tsx`
- `src/app/components/layouts/AdminLayout.tsx`

---

## Qué ha cambiado

### Mejoras aplicadas globalmente (todas las pantallas tocadas)
- Emojis reemplazados por iconos de `lucide-react` con `aria-hidden`
- Animaciones `fadeUp` de entrada usando `animation:` en `style` prop (no `data-reveal`, que requiere IntersectionObserver)
- Stagger progresivo en listas de cards (`delay = index * 60-80ms`)
- `rounded-lg` → `rounded-xl` en contenedores de imagen y bloques de info
- `transition-all duration-200` en elementos interactivos
- Estados vacíos: `py-12` → `py-16`

### Por archivo

**`tienda-online/page.tsx`**
- Revertido a componente `'use client'` puro que carga productos en el navegador con `getProductos()`
- Muestra mensaje de error real con botón "Reintentar" si el backend falla
- Nota: en un commit anterior (`a3dbbfc`) se dividió en server component + `CatalogoProductosClient.tsx`; ese split fue revertido porque el SSR silenciaba los errores del backend. `CatalogoProductosClient.tsx` fue eliminado.

**`DetalleProductoClient.tsx`**
- 13 emojis → lucide icons (`FileText`, `Sparkles`, `FlaskConical`, `ClipboardList`, `ShoppingCart`, `Zap`, `Check`, `Star`)
- Sección "Opiniones" movida al fondo (debajo de Modo de uso / Resultado)
- Select de "Puntuación" reemplazado por 5 estrellas interactivas con hover (`hoveredStar` state) y color `var(--logo-branding)`

**`carrito/page.tsx`**
- Stagger fadeUp en items del carrito, `rounded-xl` en imagen, fadeUp en sidebar resumen

**`checkout/page.tsx`**
- Stepper con `ring-2` en paso activo, fadeUp en cada paso via `<Card style={{ animation }}>`

**`confirmacion/page.tsx`**
- `✓`/`✕` emoji → lucide `Check`/`X`, `rounded-xl` en bloque de info, fadeUp en card principal

**`mis-pedidos/page.tsx`**
- `py-16` en estados vacíos, fadeUp en card de tabla

**`mis-pedidos/[id]/page.tsx`**
- `'★'.repeat(n)` → lucide `Star`, fadeUp stagger en 7 cards (0→480ms)

**`servicios-citas/page.tsx`**
- Placeholder "Imagen del Servicio" → `<Camera size={36} />`, `rounded-xl` en imagen, `hover:scale-[1.02]`, stagger fadeUp, `rounded-xl` en filtros

**`servicios-citas/mis-citas/page.tsx`**
- `py-16` en estado vacío, fadeUp en tabla

**`servicios-citas/crear-cita/page.tsx`**
- fadeUp stagger en los 3 cards (0ms, 80ms, 160ms)

**`admin/page.tsx`**
- Eliminada sección "Accesos rápidos" y su `GRUPOS_ACCESOS` (movidos a `AdminLayout`)
- Eliminado botón hamburguesa inline (movido a `AdminLayout`)
- Dashboard queda solo con header banner + 4 KPIs con stagger fadeUp

**`AdminLayout.tsx`**
- Añadido `GRUPOS_MODULOS` con los 7 grupos de navegación admin
- Botón hamburguesa `☰`/`✕` en la barra superior, visible en todos los módulos
- Sidebar deslizable (`translateX`) debajo de la barra superior
- Backdrop oscuro con cierre al clic exterior
- Módulo activo resaltado (`isActive` via `pathname.startsWith`)
- Cierre automático al navegar (`useEffect` en `pathname`)
- Bloqueo de scroll del body mientras el sidebar está abierto

---

## Qué ha fallado / errores encontrados y resueltos

| Error | Causa | Solución |
|-------|-------|----------|
| TypeScript: "Las expresiones JSX deben tener un elemento primario" en carrito | Template literal en `style` + `<Card` mal anidado en wrapper `<div>` | Reescribir bloque map con `{ return (...) }` y concatenación de strings |
| TypeScript: cascade de tipos `paso === 2` / `3` / `4`… en checkout | Wrapper `<div style>` alrededor de `<Card>` dentro de `paso === 2 && (...)` narroweaba el tipo de `paso` a literal `2` | Pasar `style` directamente a `<Card style={{ animation }}>` — Card acepta `style` prop |
| Diagnósticos falsos de "variable no usada" | TS server analiza el archivo en estado anterior al último edit | Ignorar hints obsoletos, el archivo es correcto |
| `GRUPOS_ACCESOS` quedó en `page.tsx` tras quitar la sección | El Edit no eliminó el bloque completo | Reescribir el archivo completo con `Write` |
| Sidebar en `page.tsx` no aparecía en otros módulos | El estado y botón vivían en la página del dashboard, no en el layout | Mover todo a `AdminLayout.tsx` |
| Productos no se mostraban en tienda online | Commit `a3dbbfc` convirtió `page.tsx` en server component; el SSR silenciaba el error del backend devolviendo array vacío | Revertir `page.tsx` a client component y eliminar `CatalogoProductosClient.tsx` |
| Backend: `Inconsistent column data: List field did not return an Array` en `productos.caracteristicas` | La columna `caracteristicas` en la BD quedó como `text` en lugar de `text[]` (probablemente por una migración o script previo) | `ALTER TABLE productos ALTER COLUMN caracteristicas TYPE text[] USING caracteristicas::text[]` ejecutado en la BD. Requiere reiniciar el backend para limpiar planes en caché (`cached plan must not change result type`) |

---

## Qué se ha intentado y revertido

- **Quitar sección "Accesos rápidos"** del dashboard admin → usuario pidió revertir → restaurado con `Write` del archivo completo
- **Sidebar siempre visible en desktop** (`hidden lg:flex`) → usuario pidió que sea hamburguesa en todas las pantallas → cambiado a toggle con estado
- **Split de `page.tsx` en server component + `CatalogoProductosClient.tsx`** → revertido porque el SSR silenciaba errores del backend y los productos no aparecían

---

## Qué falta por hacer

### Pantallas pendientes (no tocadas aún)
- `src/app/(screens)/(privada)/perfil/page.tsx` — solo es un wrapper; el contenido visual está en `src/app/components/perfil/UserProfile.tsx` y sus sub-componentes (`PerfilDatosForm.tsx`, `PerfilFotoBlock.tsx`). Esos archivos ya tienen cambios locales del usuario — **confirmar antes de tocar**.
- Pantallas secundarias del cliente: `cotizaciones`, `devoluciones`, `direcciones`, `facturas`, `galeria`, `garantias`, `notificaciones`, `promociones`, `seguimientos`, `tarjetas`
- Sub-pantallas de servicios-citas: `calendario`, `cancelar/[id]`, `confirmacion`, `mis-citas/[id]`, `reprogramar/[id]`, `servicios/[id]`
- Tienda: `checkout/elegir-domicilio`, `rastreo-pedidos`

### Pantallas admin pendientes
- Todas las pantallas bajo `src/app/(screens)/admin/` (inventario, clientes-crm, venta-local, venta-online, servicios, reportes, pagos, etc.)
- Pantallas de operación bajo `src/app/(screens)/(privada)/operacion/`

### Reglas que deben mantenerse
- ❌ No cambiar colores existentes en pantallas (usar solo `var(--...)`)
- ❌ No usar `dark:` con colores hardcodeados
- ❌ No tocar `globals.css` ni `backend-miru`
- ❌ No eliminar secciones, JSX blocks ni cards existentes
- ❌ No cambiar textos, lógica ni handlers
- ✅ Solo: `rounded-xl`, `shadow`, `transition`, `fadeUp`, iconos lucide, espaciado, tipografía serif en títulos principales

### Pendiente de verificar
- Confirmar que productos se muestran correctamente en tienda online después de reiniciar el backend (el ALTER TABLE ya se ejecutó en BD)
