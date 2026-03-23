# Módulo de Base de Datos

Documentación del módulo de administración de base de datos para Miru Franco Web.

---

## Descripción general

El módulo permite a los administradores **exportar datos**, **visualizar el diagrama ER** y **consultar datos** de las tablas del sistema. Está disponible en la ruta `/admin/base-datos` dentro del área de administración.

---

## Estructura de archivos

| Archivo | Descripción |
|---------|-------------|
| `src/app/(screens)/admin/base-datos/page.tsx` | Página principal del módulo |
| `src/app/services/database.ts` | Servicio de API para import/export, diagrama y exportación directa |
| `src/app/api/db/export-direct/route.ts` | API route Next.js: lista tablas y exporta por conexión directa a la BD |
| `src/app/utils/mermaidRender.ts` | Utilidad para renderizar Mermaid a SVG/PNG |

---

## Secciones del módulo

### 1. Exportar datos (activa)

Exportación por **conexión directa** a la BD (DATABASE_URL). No se usa el backend externo.

**Flujo:** Clic en «Cargar tablas de la BD» → se listan las tablas del schema `public` → elegir «Todas las tablas» o una tabla → Formato (CSV o JSON) → Descargar.

**Formatos:** CSV, JSON

**Export con opciones (solo al elegir una tabla concreta):**
- **Columnas:** se cargan las columnas de la tabla; el usuario puede marcar/desmarcar las que quiera exportar (por defecto todas).
- **Rango de fechas:** campos «Fecha desde» y «Fecha hasta»; se aplican si la tabla tiene columna `created_at`, `createdAt`, `fecha_creacion` o `fecha_creado`.
- **Solo registros activos:** checkbox; se aplica si la tabla tiene columna `activo` (true) o `estado` ('activo').

**Elegir ubicación de guardado:**
- En **Chrome/Edge/Opera** se usa la File System Access API: el usuario puede elegir la carpeta donde guardar
- En **Firefox/Safari** la descarga va a la carpeta por defecto (p. ej. Descargas)

**Historial de exportaciones:**
- Tras cada exportación exitosa se añade una entrada a un historial guardado en `localStorage`.
- Se muestra una **tabla** con: Fecha, Exportación (etiqueta), y botón **Descargar de nuevo** por fila.
- «Descargar de nuevo» vuelve a ejecutar la misma exportación (mismas opciones) con datos actuales.
- Se conservan las últimas 50 exportaciones.

**Dependencia:** API route Next.js `GET /api/db/export-direct`. Requiere **DATABASE_URL** en `.env.local`; **JWT_SECRET** es opcional para verificar el token.

---

### 2. Diagrama ER (activa)

Genera y descarga el diagrama de entidad-relación del esquema de la base de datos.

**Formatos:**
- Mermaid (`.mmd`) — texto/código
- SVG
- PNG

**Funcionalidad:**
- **Vista previa** antes de descargar
- **Descargar** en el formato seleccionado
- **Diagrama interactivo (solo vista previa en Mermaid o SVG):** al hacer clic en una entidad (tabla) del diagrama, la página hace scroll a la sección «Consultar datos», expande el módulo correspondiente (Inventario, Usuarios, Servicios o Clientes) y muestra un mensaje breve «Mostrando: [módulo]». No aplica cuando la vista previa es PNG.

**Dependencia:** Endpoint `GET /api/db/diagram?formato=mermaid|svg|png` del backend. Para SVG/PNG se usa `mermaidRender.ts` para convertir el código Mermaid.

---

### 3. Consultar datos (activa)

Módulos expandibles para ver los datos de las tablas principales:

| Módulo | Origen de datos | Columnas principales |
|--------|-----------------|----------------------|
| **Inventario** | `getProductosSinRedirigir()` | ID, Nombre, Categoría, Marca, Precio, Stock |
| **Usuarios y roles** | `getUsuarios()` + `getUsuarioById()` | Nombre, Email, Teléfono, Rol, Estado |
| **Servicios** | `getServicios()` | ID, Nombre, Categoría, Precio, Duración |
| **Clientes CRM** | `getUsuarios()` (rol cliente) | Nombre, Email, Teléfono |

**Filas expandibles:** Cada fila se puede expandir (clic) para ver el detalle completo del registro.

---

### 4. Importar datos (oculta)

Sección existente pero actualmente oculta (`{false && ...}`). Permite importar desde CSV/JSON vía `POST /api/db/import`.

Para mostrarla de nuevo, cambiar la condición o eliminarla.

---

### 5. Insertar datos (oculta)

Sección oculta con enlaces a pantallas de creación (productos, usuarios, servicios, clientes).

---

### 6. Eliminar datos (oculta)

Sección oculta con enlaces a pantallas de eliminación/desactivación.

---

## Servicio `database.ts`

### Constantes

- **`TABLAS_DISPONIBLES`**: Tablas para importar (productos, usuarios, servicios, categorias, proveedores)
- **`TABLAS_EXPORTABLES`**: Tablas que el backend permite exportar (productos, usuarios, servicios)

> El backend actual solo soporta export de 3 tablas. `TABLAS_EXPORTABLES` se usa para evitar errores al exportar.

### Funciones

| Función | Descripción |
|---------|-------------|
| `importarDatos(tabla, archivo)` | POST /api/db/import |
| `exportarDatos(tabla, formato)` | GET /api/db/export |
| `obtenerDiagrama(formato)` | GET /api/db/diagram |
| `descargarDiagrama(formato)` | Wrapper de obtenerDiagrama |
| `listarTablasDirectas()` | GET /api/db/export-direct (sin params) → lista de tablas |
| `obtenerColumnasDirectas(tabla)` | GET /api/db/export-direct?tabla=X&meta=1 → columnas de la tabla |
| `exportarDirecto(tabla, formato, opciones?)` | GET /api/db/export-direct?tabla=X&formato=Y → blob; opciones: columnas, fechaDesde, fechaHasta, soloActivos |

---

## Dependencias del backend

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/db/export-direct` | GET | **Next.js API route**: lista tablas o exporta por conexión directa (DATABASE_URL). Sin params → `{ tablas: string[] }`. Con `?tabla=X&meta=1` → `{ columnas: string[] }`. Con `?tabla=X&formato=Y` → archivo; opcionales: `columnas`, `fechaDesde`, `fechaHasta`, `soloActivos`. |
| `/api/db/import` | POST | Importa desde archivo (sección oculta; backend externo) |
| `/api/db/diagram` | GET | Obtiene diagrama ER en Mermaid (backend externo) |

**Requisito:** Usuario autenticado (Bearer token en `Authorization`).

---

## Limitaciones conocidas

1. **Elegir carpeta:** Solo funciona en Chrome, Edge y Opera (File System Access API). En Firefox y Safari se usa la descarga estándar.

2. **Importar datos:** Sección oculta; el código sigue disponible.

---

## Datos mostrados al expandir filas

### Productos
ID, nombre, categoría, marca, precio, precio original, descuento, stock, stock cantidad, presentación, nuevo, cruelty free, descripción, descripción larga, ingredientes, modo de uso, resultado, características, presentaciones (tamaño, precio, stock, fecha caducidad)

### Usuarios / Clientes
ID, nombre, email, teléfono, rol, estado, confirmado, creado, actualizado, última actividad

### Servicios
ID, nombre, categoría, precio, duración, duración (min), requiere evaluación, descripción, descripción larga, incluye, recomendaciones, especialistas, productos asociados

---

## Cómo mostrar secciones ocultas

En `page.tsx`, buscar `{false && (` y cambiar a `{true && (` o eliminar la condición para mostrar:

- Importar datos
- Insertar datos  
- Eliminar datos

---

## Historial de cambios

| Fecha | Cambio |
|-------|--------|
| 2025-03 | Creación del módulo con export, diagrama y consulta |
| 2025-03 | Filas expandibles en Consultar datos |
| 2025-03 | Opción "Base de datos completa" en exportar |
| 2025-03 | File System Access API para elegir carpeta (Chrome/Edge) |
| 2025-03 | `TABLAS_EXPORTABLES` por limitación del backend |
| 2025-03 | Sección Importar datos oculta |
| 2025-03 | Última exportación y «Repetir último export» (localStorage) |
| 2025-03 | Historial de exportaciones en tabla con «Descargar de nuevo» por entrada |
| 2025-03 | Diagrama ER interactivo: clic en entidad → scroll a Consultar datos y expandir módulo |
| 2025-03 | Conexión directa a la BD: API route `/api/db/export-direct`, listar y exportar todas las tablas (DATABASE_URL) |
| 2025-03 | Export con opciones: selector de columnas, rango de fechas, solo registros activos (opción 7) |



Algunas ideas que encajan bien con lo que ya tienes:

---

## 1. **Reactivar y mejorar Importar datos**
- Volver a mostrar la sección y documentar el formato esperado (columnas CSV / estructura JSON).
- Añadir una plantilla descargable (CSV/JSON de ejemplo) por tabla.
- Mostrar vista previa de las primeras filas antes de confirmar la importación.

---

## 2. **Histrial Backup programado / “Último export”** ---------------------------------------------------SUCCES
- Botón tipo “Descargar último backup” si el backend guarda un export reciente.
- O texto “Última exportación: [fecha]” para recordar cuándo se hizo el último backup manual.

---

## 3. **Estadísticas rápidas** ---------------------------------------------------SUCCESS
- En la parte superior, un grupo de cards muestra: total de productos, **usuarios (personal)**, servicios y clientes.
- Los números se cargan automáticamente al entrar en el módulo usando los servicios existentes (`getProductosSinRedirigir`, `getUsuarios`, `getServicios`). Para el rol, se enriquece cada usuario con `getUsuarioById()` y se cuentan:
  - **personal**: roles `admin`, `estilista`, `empleado`, `becario` (y `becado` normalizado)
  - **clientes**: `rol = 'cliente'`

---

## 4. **Búsqueda y filtros en Consultar datos**
- En cada módulo (Inventario, Usuarios, Servicios, Clientes): campo de búsqueda por nombre/email y filtros (p. ej. por categoría, rol, activo sí/no).
- Paginación si las listas son largas.

---

## 5. **Acciones rápidas desde la fila**
- En las filas expandibles: enlaces “Editar producto”, “Ver en tienda”, “Editar usuario”, etc., que lleven a la pantalla correspondiente del admin.

---

## 6. **Diagrama ER interactivo** ---------------------------------------------------
- Si el diagrama es SVG, hacer que al hacer clic en una entidad se muestre un pequeño resumen (nombre de tabla, cantidad de registros) o se abra “Consultar datos” filtrado por esa entidad.

---

## 7. **Export con opciones** ---------------------------------------------------SUCCESS
- Selector de columnas a exportar (solo las que el usuario marque).
- Filtro por rango de fechas (si la tabla tiene `createdAt`).
- Opción “Solo registros activos” para usuarios/servicios.

---

## 8. **Registro de actividad del módulo**
- Lista simple: “Exportación completa – 4 mar 2025, 10:30”, “Diagrama descargado – 3 mar 2025”. Puede ser solo en front (guardar en `localStorage`) o con endpoint en backend.

---

## 9. **Comparar con backup anterior**
- Subir un JSON/CSV exportado antes y comparar con los datos actuales (diferencias, nuevos, eliminados). Requiere más lógica y posiblemente backend.

---

## 10. **Conexión directa a la BD (como comentamos)**
- API route en Next.js que use `DATABASE_URL` para exportar todas las tablas y/o listar tablas. Útil si quieres independizarte del backend para exports.

---

## Automatización de tareas (UI)

En la cabecera (parte superior derecha) hay un panel de **Automatización** que permite crear tareas guardadas en `localStorage`:

- **Tipos de tarea**:
  - Backup completo (todas las tablas) en CSV/JSON (si son varias tablas, se descarga como ZIP).
  - Export de una tabla (con opción “Solo activos”).
  - Descarga de diagrama ER (SVG/PNG/Mermaid).
- **Triggers**:
  - Manual
  - Al abrir (se ejecuta al entrar a la página)
  - Intervalo (cada X minutos **solo mientras esta página está abierta**)

**Prioridad sugerida:**  
- Rápido y útil: **3 (estadísticas)** y **5 (enlaces desde la fila)**.  
- Muy valorado por el usuario: **4 (búsqueda y filtros)** y **1 (importar con plantilla y vista previa)**.