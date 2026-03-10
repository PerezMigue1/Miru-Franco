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
| `src/app/services/database.ts` | Servicio de API para import/export y diagrama |
| `src/app/utils/mermaidRender.ts` | Utilidad para renderizar Mermaid a SVG/PNG |

---

## Secciones del módulo

### 1. Exportar datos (activa)

Permite descargar datos en formato CSV o JSON.

**Opciones:**
- **Base de datos completa (todas las tablas)**: exporta Productos, Usuarios y Servicios en archivos separados (uno por tabla)
- **Tabla individual**: Productos, Usuarios o Servicios

**Formatos:** CSV, JSON

**Elegir ubicación de guardado:**
- En **Chrome/Edge/Opera** se usa la File System Access API: el usuario puede elegir la carpeta donde guardar
- En **Firefox/Safari** la descarga va a la carpeta por defecto (p. ej. Descargas)

**Dependencia:** Endpoint `GET /api/db/export?tabla=X&formato=Y` del backend

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

---

## Dependencias del backend

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/db/export` | GET | Exporta tabla en CSV o JSON |
| `/api/db/import` | POST | Importa desde archivo (sección oculta) |
| `/api/db/diagram` | GET | Obtiene diagrama ER en Mermaid |

**Requisito:** Usuario autenticado (Bearer token en `Authorization`).

---

## Limitaciones conocidas

1. **Exportación:** Solo se pueden exportar las tablas que el backend permite: `productos`, `usuarios`, `servicios`.

2. **Elegir carpeta:** Solo funciona en Chrome, Edge y Opera (File System Access API). En Firefox y Safari se usa la descarga estándar.

3. **Importar datos:** Sección oculta; el código sigue disponible.

4. **Otras tablas de la BD:** Tablas como `codigos_oauth`, `preguntas_disponibles`, `producto_presentaciones`, etc., no aparecen en el módulo porque el backend no las expone en el endpoint de export. Para incluirlas habría que ampliar el backend.

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
