# Propuesta: Materias Primas (extensión del Módulo de Inventario)

Documento de propuesta para incorporar **Materias Primas** en Miru Franco Web como **extensión del Módulo de Inventario** (`/admin/inventario`). Las materias primas son insumos consumidos durante los servicios (tintes, oxidantes, tratamientos, etc.) que no se venden al cliente final, pero requieren control de inventario.

---

## 1. Base: Módulo de Inventario

La propuesta se fundamenta en el **Módulo de Inventario** existente, que hoy gestiona productos de la tienda online.

| Elemento del Inventario | Función actual |
|-------------------------|----------------|
| **Cards de métricas** | Total productos, Stock bajo (≤5), Sin stock, Valor total |
| **Filtros** | Búsqueda por texto, categoría, disponibilidad |
| **Tabla principal** | Producto, Categoría, Stock, Próxima caducidad, Estado, Acciones |
| **Descuento global** | Por marca y categoría (productos) |
| **Flujo** | Listado → Ver/Editar producto |

La propuesta **extiende** este módulo con una pestaña o sección de **Materias Primas** que reutiliza la misma estructura: cards, filtros, tabla y acciones.

---

## 2. Definición y contexto

| Concepto | Descripción |
|----------|-------------|
| **Productos** (Inventario actual) | Artículos que se **venden** en la tienda online (shampoo, mascarillas, productos para el hogar). |
| **Materias Primas** | Insumos que se **consumen** en los servicios (tintes, oxidantes, decolorante, capilar, etc.). No se venden directamente. |

**Objetivo:** Tener un inventario de materias primas para:
- Control de consumo por servicio
- Alertas de stock bajo
- Trazabilidad con servicios (qué insumos usa cada servicio)
- Cálculo de costo por servicio

---

## 3. Cómo ayudará esta propuesta al sitio web

| Beneficio | Impacto en Miru Franco Web |
|-----------|----------------------------|
| **Visibilidad operativa** | El administrador ve en un solo lugar productos (venta) y materias primas (consumo en servicios), evitando sobresaltos por faltantes. |
| **Prevención de faltantes** | Alertas de stock bajo y próxima caducidad reducen cancelaciones o sustituciones de último momento. |
| **Mejor toma de decisiones** | El valor total en inventario (productos + materias primas) permite planificar compras y presupuesto. |
| **Experiencia consistente** | Misma UI que Inventario: pestañas "Productos" y "Materias primas", mismos patrones (cards, filtros, tabla). Menos curva de aprendizaje. |
| **Soporte para Operación** | Los servicios ya tienen productos asociados; al vincular materias primas, Operación puede preparar insumos y ver consumos estimados. |
| **Escalabilidad** | Base sólida para futuros reportes (consumo por período, costo por servicio) sin cambiar la navegación. |

En conjunto, la propuesta convierte el Inventario en un **centro de control único** para todo lo que entra y sale del salón.

---

## 4. Marco matemático: ecuaciones diferenciales lineales y programación lineal

La propuesta se apoya en dos pilares: **ecuaciones diferenciales lineales** (dinámica del inventario en el tiempo) y **programación lineal** (optimización de cantidades a pedir, costos y restricciones).

---

### 4.1 Ecuaciones diferenciales lineales

#### Contexto

En un salón, el stock de una materia prima (p. ej. tinte, oxidante) **cambia continuamente** por dos flujos:

- **Entrada:** compras y reabastecimientos \( I(t) \)
- **Salida:** consumo en servicios \( C(t) \)

La variación del inventario se modela con una **ecuación diferencial ordinaria de primer orden**. Cuando las tasas \( I \) y \( C \) son constantes o lineales, la ecuación es **lineal**.

#### En qué consiste

El stock \( S(t) \) es función del tiempo; su derivada \( \frac{dS}{dt} \) es la diferencia entre entrada y salida. La forma general de una EDO **lineal** de primer orden es:

\[
\frac{dS}{dt} + a(t) \cdot S = b(t)
\]

En inventario: \( a(t) = 0 \) si no hay degradación; \( b(t) = I(t) - C(t) \).

#### Fórmula (EDO lineal)

\[
\frac{dS}{dt} = I(t) - C(t)
\]

Donde:
- \( S(t) \): cantidad en stock en el instante \( t \)
- \( I(t) \): tasa de entrada (unidades por unidad de tiempo)
- \( C(t) \): tasa de consumo (unidades por unidad de tiempo)

**Caso lineal homogéneo (consumo constante):** \( C(t) = k \), \( I(t) = 0 \):

\[
\frac{dS}{dt} = -k \quad \Rightarrow \quad S(t) = S_0 - k \cdot t
\]

Donde \( S_0 \) es el stock inicial. El tiempo hasta agotar el stock es:

\[
t_{agotar} = \frac{S_0}{k}
\]

**Tasa de consumo estimada:** Si se tienen \( n \) servicios por día, cada uno consumiendo \( c \) unidades de la materia prima:

\[
k = n \cdot c \quad \text{(unidades/día)}
\]

**Caso lineal no homogéneo (reabastecimiento periódico):** Si cada \( T \) días se reciben \( Q \) unidades:

\[
\frac{dS}{dt} = -k + \frac{Q}{T} \quad \Rightarrow \quad S(t) = S_0 + \left( \frac{Q}{T} - k \right) t
\]

El inventario crece si \( Q/T > k \), disminuye si \( Q/T < k \).

#### Por qué hacerlo

- Predecir cuándo se agotará el stock antes de que ocurra.
- Programar compras con antelación.
- Reducir rupturas de inventario y situaciones de emergencia.

#### Para qué sirve

| Uso | Descripción |
|-----|-------------|
| **Pronóstico de agotamiento** | Estimar el tiempo \( t_{agotar} \) con \( t_{agotar} = S_0 / k \). |
| **Punto de reorden** | Definir un nivel mínimo \( S_{min} \) a partir del cual emitir alertas. |
| **Planificación de compras** | Ajustar la cantidad a pedir según el consumo proyectado. |
| **Costo de inventario** | Relacionar el costo de mantener stock con la evolución de \( S(t) \). |

#### Importancia

- **Operativa:** Evitar que falten tintes, oxidantes o tratamientos durante servicios.
- **Económica:** Reducir compras urgentes y costos extras.
- **Estratégica:** Tener un control basado en datos en lugar de “a ojo”.

#### Control (EDO lineal)

El control se implementa mediante:

| Mecanismo | Descripción |
|-----------|-------------|
| **Stock mínimo** | \( S_{min} \): umbral para activar alerta de reorden. |
| **Tiempo hasta agotar** | \( t_{agotar} = S_0 / k \): si \( t_{agotar} < \text{lead time} \), hay riesgo de ruptura. |
| **Punto de reorden** | \( S_{reorden} = k \cdot L \), donde \( L \) es el tiempo de entrega del proveedor. |
| **Registro de consumo** | Actualizar \( C(t) \) con cada servicio para calibrar \( k \). |

La propuesta usa este marco de forma simplificada en la UI: alertas cuando \( S \leq S_{min} \) y estimación de días restantes hasta agotar.

---

### 4.2 Programación lineal

#### Contexto

Además de predecir el stock, se requiere **optimizar** decisiones: cuánto pedir, cuándo y a quién, minimizando costos y respetando restricciones (capacidad, presupuesto, disponibilidad).

La **programación lineal (PL)** es una técnica donde la función objetivo y las restricciones son **lineales** en las variables de decisión.

#### En qué consiste

- **Variables de decisión:** \( Q_i \) = cantidad a pedir de la materia \( i \); \( x_{ij} \) = unidades de \( i \) usadas en servicio \( j \), etc.
- **Función objetivo:** minimizar costo total (pedido + almacenamiento).
- **Restricciones:** satisfacer demanda, no superar capacidad, respetar presupuesto, stock mínimo.

#### Fórmulas (PL simplificado)

**Función objetivo (minimizar costo total):**

\[
\min \quad Z = c_p \cdot \frac{D}{Q} + c_a \cdot \frac{Q}{2}
\]

Donde \( c_p \) = costo por pedido, \( c_a \) = costo de almacenamiento por unidad/período, \( D \) = demanda, \( Q/2 \) = stock promedio.

**Restricciones típicas:**

\[
Q \geq Q_{min} \quad,\quad Q \leq Q_{max} \quad,\quad S + Q \geq S_{min} \quad,\quad \sum_i c_i \cdot Q_i \leq B
\]

**Cantidad económica de pedido (EOQ):**

\[
Q^* = \sqrt{\frac{2 \cdot D \cdot c_p}{c_a}}
\]

#### Por qué hacerlo

- Minimizar costo total de inventario.
- Respetar restricciones operativas y de presupuesto.
- Tomar decisiones de compra de forma sistemática.

#### Para qué sirve

| Uso | Descripción |
|-----|-------------|
| **Lote óptimo** | \( Q^* \) según EOQ |
| **Presupuesto** | Respetar límite de gasto |
| **Multi-producto** | Optimizar varias materias con restricciones compartidas |
| **Stock de seguridad** | Garantizar \( S \geq S_{min} \) |

#### Importancia

- **Económica:** Reducir costos.
- **Operativa:** Cumplir capacidad y condiciones del proveedor.
- **Estratégica:** Asignar presupuesto de forma óptima.

#### Control (programación lineal)

| Mecanismo | Descripción |
|-----------|-------------|
| **Lote sugerido** | \( Q^* \) o solución del PL para cada materia |
| **Restricciones** | Validar que los pedidos cumplan capacidad y presupuesto |
| **Sensibilidad** | Analizar cambios en \( D \), \( c_p \), \( c_a \) |
| **Alertas** | Avisar cuando la solución óptima indique pedir |

---

### 4.3 Integración en la propuesta

| Componente | Ecuaciones diferenciales lineales | Programación lineal |
|------------|----------------------------------|---------------------|
| **Qué modela** | Evolución de \( S(t) \) en el tiempo | Cantidad óptima a pedir |
| **Salida principal** | \( t_{agotar} \), \( S_{reorden} \) | \( Q^* \), lote sugerido |
| **En la UI** | Alertas, días restantes | Sugerencia de pedido, validación de restricciones |

La propuesta usa ambos marcos de forma simplificada: alertas y estimación de días (EDO lineal) y, si se implementa, sugerencia de cantidad a pedir (PL/EOQ).

---

## 5. Modelo de datos propuesto

### Tabla `materias_primas`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `nombre` | string | Ej: "Tinte Rubio Medio 7.0" |
| `categoria` | string | coloracion, decoloracion, tratamientos, oxidantes, capilar, accesorios, otros |
| `marca` | string? | Ej: "L'Oréal", "Wella" |
| `unidad_medida` | string | ml, gr, unidad, tubo, botella |
| `cantidad_stock` | decimal | Cantidad actual en inventario |
| `cantidad_minima` | decimal? | Umbral para alerta de reorden |
| `costo_unitario` | decimal? | Costo de compra por unidad |
| `proveedor` | string? | Nombre del proveedor |
| `ubicacion` | string? | Ubicación física (estante, caja) |
| `fecha_caducidad` | date? | Si aplica |
| `descripcion` | text? | Notas adicionales |
| `activo` | boolean | Si está en uso |
| `creadoEn` | timestamp | |
| `actualizadoEn` | timestamp | |

### Tabla `servicio_materia_prima` (relación N:N)

Relaciona servicios con materias primas y la cantidad estimada de consumo.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `servicio_id` | UUID | FK a servicios |
| `materia_prima_id` | UUID | FK a materias_primas |
| `cantidad_estimada` | decimal | Cantidad consumida por servicio (en unidad_medida) |
| `notas` | string? | Ej: "Solo para cabello largo" |

---

## 6. Categorías sugeridas de materias primas

| Categoría | Ejemplos |
|-----------|----------|
| **Coloración** | Tintes (numeración 1–12), cremas colorantes, bases |
| **Decoloración** | Polvo decolorante, crema decolorante |
| **Oxidantes** | Volumen 10, 20, 30, 40 (peróxido) |
| **Tratamientos** | Keratina, botox capilar, mascarillas de uso profesional |
| **Capilar** | Shampoo profesional, acondicionador de salón |
| **Acabado** | Lacas, ceras, geles profesionales |
| **Accesorios** | Gorros, mechones, papel aluminio, guantes |
| **Otros** | Neutralizador, protector, etc. |

---

## 7. Ejemplos de materias primas por categoría

### Coloración
- Tinte Rubio Claro 9.0
- Tinte Rubio Medio 7.0
- Tinte Castaño Oscuro 4.0
- Base Colorante 0
- Color Corrector Azul

### Oxidantes
- Oxidante Vol. 10
- Oxidante Vol. 20
- Oxidante Vol. 30
- Oxidante Vol. 40

### Decoloración
- Polvo Decolorante
- Crema Decolorante

### Tratamientos
- Keratina Líquida 60 ml
- Botox Capilar
- Mascarilla Reconstructora

### Accesorios
- Gorro plástico (unidad)
- Papel aluminio (rollo)
- Guantes desechables (par)
- Mechones para mechas

---

## 8. Integración en el Módulo de Inventario

**Enfoque recomendado: pestaña dentro de Inventario** (`/admin/inventario`).

La página actual tendría dos pestañas:

| Pestaña | Contenido |
|---------|-----------|
| **Productos** | Lo existente: cards (Total, Stock bajo, Sin stock, Valor), descuento global, tabla de productos. |
| **Materias primas** | Estructura análoga: cards, filtros, tabla y acciones. |

### Estructura propuesta para la pestaña "Materias primas"

| Elemento | Descripción (basado en Inventario) |
|----------|------------------------------------|
| **Cards** | Total materias primas, Stock bajo (≤ cantidad mínima), Sin stock, Valor en inventario (cantidad × costo unitario) |
| **Filtros** | Búsqueda por nombre/marca, categoría, disponibilidad |
| **Tabla** | Nombre, Categoría, Marca, Stock, Unidad, Stock mín., Próxima caducidad, Estado, Acciones |
| **Acciones** | "+ Agregar materia prima", "Ver y editar" por fila |
| **Sin descuento global** | Las materias primas no se venden; no aplica descuento por marca/categoría |

Se reutilizan: `Card`, `Table`, `Badge`, `Input`, `Select`, `Button` y el layout del Inventario.

---

## 9. Integración adicional con Base de Datos

Opcional para export/consulta masiva:

| Acción | Cambio sugerido |
|--------|------------------|
| **Exportar** | Añadir tabla `materias_primas` a `TABLAS_EXPORTABLES`. |
| **Consultar datos** | Nuevo módulo expandible "Materias primas". |
| **Diagrama ER** | Actualizar esquema con `materias_primas` y `servicio_materia_prima`. |

---

## 10. Alertas y métricas sugeridas

| Métrica | Descripción |
|---------|-------------|
| Stock bajo | `cantidad_stock <= cantidad_minima` |
| Sin stock | `cantidad_stock = 0` |
| Próxima caducidad | Materias con `fecha_caducidad` en los próximos 30 días |
| Valor en inventario | Suma de `cantidad_stock * costo_unitario` por materia prima |
| Consumo estimado por servicio | Suma de `cantidad_estimada` de materias asociadas al servicio |

---

## 11. Pasos de implementación

1. **Backend:** Crear modelo Prisma `MateriaPrima` y `ServicioMateriaPrima`.
2. **API:** Endpoints CRUD para materias primas y relación con servicios.
3. **Frontend:** Servicio `materias-primas.ts` (similar a `productos.ts`).
4. **UI Admin:** Pestaña "Materias primas" dentro de `/admin/inventario`, reutilizando layout, cards, tabla y componentes del Inventario.
5. **Base de datos (opcional):** Añadir módulo "Materias primas" en Consultar datos y exportación.

---

## 12. Historial

| Fecha | Cambio |
|-------|--------|
| 2025-03 | Propuesta inicial |
| 2025-03 | Basada en Módulo de Inventario; sección "Cómo ayudará al sitio web"; integración como pestaña |
| 2025-03 | Marco de ecuaciones diferenciales: contexto, fórmula, control, importancia |
| 2025-03 | Ecuaciones diferenciales lineales + programación lineal: EDO, EOQ, restricciones PL |
