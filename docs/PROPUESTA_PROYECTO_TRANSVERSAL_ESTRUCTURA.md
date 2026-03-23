# Propuesta — Proyecto transversal / Memoria de cálculo  
**Miru Franco Beauty Salón — Sistema integral multiplataforma**

Documento redactado según la estructura solicitada para la actividad A2 (Memoria de cálculo) y alineado con las unidades practicadas en clase de *Ecuaciones diferenciales*.

---

## Resumen

**Nombre del proyecto:** Sistema integral multiplataforma Miru Franco Web para la estética Miru Franco Beauty Salón. **Objetivo:** desarrollar una solución tecnológica que automatice procesos administrativos y operativos del salón, incluyendo inventario de productos, catálogo de servicios, gestión de clientes y extensión hacia el control de materias primas, con el fin de reducir errores manuales, tiempos de respuesta y decisiones basadas solo en la memoria operativa. **Descripción breve:** se plantea una aplicación web enlazada a una base de datos que concentra el histórico de citas, servicios y movimientos de inventario; sobre esos datos se construye un modelo predictivo que relaciona la frecuencia de asistencia de los clientes con la demanda esperada de insumos profesionales. **Problemática:** la información aparece fragmentada entre anotaciones y revisiones periódicas; no existe trazabilidad sistemática del consumo de tintes, oxidantes y tratamientos por servicio, lo que dificulta la compra oportuna y puede generar faltantes, cancelaciones o sobrestock. **Justificación:** para esta etapa se usa únicamente la ley de crecimiento/decrecimiento \( \frac{dx}{dt} = kx \), fórmula ya practicada en clase, para modelar de manera simple la variación del stock de materias primas y apoyar decisiones de compra (Zill, 2018). **Metodología:** enfoque incremental e iterativo propuesto por Pressman y Maxim (2020), con fases de análisis, diseño, implementación, prueba y documentación, elegido por permitir entregas parciales alineadas con calendario académico y retroalimentación con el negocio. **Impacto:** se espera mayor confiabilidad en la planificación de compras, alertas tempranas de stock bajo, mejor experiencia para administración y clientes, y un marco auditable para futuras integraciones (operación, CRM). Las citas bibliográficas respaldan la elección de modelo matemático y del proceso de desarrollo.

*(Meta: **280 palabras** en el párrafo anterior; verificar conteo en Word o similar antes de entregar; si falta o sobra, ajuste una frase corta al final.)*

---

## Objetivo general del proyecto

El objetivo de este proyecto es desarrollar una solución tecnológica mediante un **sistema integral multiplataforma** para que la estética **Miru Franco Beauty Salón** **automatice los procesos** administrativos y operativos (registro y consulta de productos, servicios, usuarios/clientes y, en fases posteriores, inventario de materias primas y apoyo a la operación diaria), de modo que la información quede centralizada, sea consultable en tiempo casi real y pueda alimentar **modelos predictivos** basados en datos históricos.

**¿Para qué se hace?**  
Para disminuir la dependencia de hojas de cálculo o anotaciones aisladas, reducir errores en inventario y citas, y apoyar decisiones informadas (compras, priorización de insumos) con evidencia numérica y simulación.

---

## Diagnóstico inicial (entrevistas)

En el **diagnóstico inicial** realizado mediante **entrevistas semiestructuradas** con la administración y personal operativo del salón se identificó que, **como hacían el proceso**:

- El **inventario de productos** para venta se controlaba de forma reactiva (revisión periódica manual), sin un único sistema que consolidara existencias y caducidades.
- La **agenda y la frecuencia de visita** de los clientes no quedaban sistematizadas de manera uniforme para extraer patrones (cada cuánto asisten) de forma automática.
- El **consumo de insumos profesionales** (tintes, oxidantes, tratamientos) no se registraba de forma explícita por servicio, lo que dificulta estimar demanda futura de materias primas.
- Existía **necesidad de un panel web** para administración que ya se está cubriendo parcialmente con *Miru Franco Web* (inventario, productos, servicios, clientes CRM).

*Nota:* Si en su memoria deben citar nombres concretos de entrevistados, sustituya esta frase por: “Según entrevista con [nombre/cargo], fecha […]”.

---

## Metodología

Según **Pressman y Maxim (2020)**, en *Ingeniería del software*, un enfoque **incremental e iterativo** permite entregar valor temprano, validar requisitos con el cliente y reducir riesgo técnico. Por ello se eligió esta metodología para trabajar el proyecto.

**Fases (y por qué se eligieron):**

| Fase | Qué se hace | Por qué |
|------|-------------|---------|
| **1. Análisis y requisitos** | Entrevistas, diagnóstico, alcance del sistema y del modelo predictivo. | Alinear el software y las matemáticas con la realidad del salón. |
| **2. Diseño** | Arquitectura web, modelo de datos, definición de variables y ecuaciones del modelo. | Evitar retrabajo; documentar supuestos (condiciones iniciales, unidades). |
| **3. Implementación** | Desarrollo del sitio (Next.js), APIs, módulos admin (inventario, base de datos, etc.). | Materializar el producto y el “módulo funcional” de simulación/consulta. |
| **4. Prueba y validación** | Pruebas funcionales, comparación predicción vs. datos históricos o escenarios. | Cumplir la rúbrica: verificar resultados en tablas/gráficos. |
| **5. Documentación y cierre de etapa** | Memoria de cálculo, conclusiones, decisiones sugeridas. | Entregable académico y trazabilidad del trabajo. |

Se eligió por ser **compatible con proyectos académicos por entregas** (A2, avances) y con equipos pequeños, sin exigir la rigidez completa de modelos en cascada pura.

---

## Cómo resultado en esta etapa del proyecto

**Hasta dónde se llega en esta etapa:**

- **Propuesta escrita** del modelo predictivo: origen de datos, variables, fórmulas y significado físico (inventario / asistencia).
- **Base técnica existente** en el repositorio: aplicación web administrativa con inventario de productos, servicios y consulta de datos (según módulos ya desarrollados).
- **Formalización matemática** con la ley de crecimiento/decrecimiento \(dx/dt = kx\), lista para implementarse o simularse en herramienta (hoja de cálculo, script o módulo en la app).
- **Resultados preliminares** en forma de **tablas y/o gráficos** de ejemplo (datos reales simulados o anonimizados), más **interpretación** y **conclusiones** para decisiones de compra y alertas de stock.

*Ajuste según su calendario docente:* si A2 es solo propuesta, indique “hasta el diseño del modelo y plan de implementación”; si incluye implementación, indique “hasta módulo funcional de simulación”.

---

## Palabras clave

Ecuaciones diferenciales · Ley de crecimiento y decrecimiento · Modelo predictivo · Inventario · Materias primas · Salón de belleza · Sistema web · Datos históricos · Miru Franco

---

# Propuesta 1 — Modelo predictivo de demanda de insumos y frecuencia de asistencia

## Sección 1

### 1.1 Origen de los datos y captura

**Origen de los datos**  
- **Histórico almacenado en base de datos** del sistema (cuando esté disponible): registros de **citas/servicios prestados**, **clientes**, **servicios contratados** y, en extensión, **movimientos de inventario** o consumo declarado por servicio.  
- Si el histórico aún es limitado, se puede usar **datos simulados** con la misma estructura (fechas de visita, tipo de servicio, insumos asociados), documentando que son **simulados** y cuál es la semilla o regla de generación.

**Captura**  
- Automática: cada vez que se registra una cita atendida o un servicio completado en el sistema.  
- **“Cada cuánto asiste el cliente a la estética”** se obtiene calculando el **intervalo entre visitas consecutivas** por `cliente_id` (días entre cita *n* y cita *n+1*), y luego un promedio o distribución por segmento de clientes.

**Justificación (para qué)**  
Sin origen y captura claros, el modelo no es **reproducible** ni auditable; la rúbrica exige explicitar si los datos son reales o simulados y sus características.

---

### 1.2 Condiciones iniciales y variables

**Condiciones iniciales (ejemplo para inventario de una materia prima)**  
- \( S(0) = S_0 \): stock inicial al inicio del periodo de análisis (unidades o ml, según unidad de medida).  
- \( k \): tasa de consumo promedio derivada del histórico (unidades/día), estimada como \( k \approx \frac{\text{total consumido en } \Delta t}{\Delta t} \).

**Variables y elementos del proceso**  

| Variable / elemento | Significado |
|---------------------|-------------|
| \( x(t) \) | Stock de la materia prima en el tiempo \( t \) |
| \( k \) | Constante de cambio proporcional del stock |
| \( D \) | Demanda acumulada o por periodo (desde histórico) |
| \( \Delta t_{visita} \) | Días entre visitas del mismo cliente (serie temporal) |
| \( n \), \( c \) | Número de servicios/día que usan la materia; consumo por servicio |

**Justificación (para qué)**  
Fijar condiciones iniciales y variables permite **resolver** la ecuación diferencial y comparar predicción con datos; sin ellas el modelo es ambiguo.

---

### 1.3 Fórmulas

**Fórmula principal (la que ya practicaste): Ley de crecimiento y decrecimiento**  

\[
\frac{dx}{dt} = kx
\]

Donde:
- \(x(t)\): cantidad de materia prima en stock en el tiempo.
- \(k\): constante de proporcionalidad.
- Si \(k < 0\), hay decrecimiento (consumo del inventario).
- Si \(k > 0\), hay crecimiento (reposición del inventario).

**Solución general:**

\[
x(t) = x_0 e^{kt}
\]

Aplicación en la propuesta:
- Para modelar consumo diario se usa \(k<0\).
- Se proyecta \(x(t)\) a 7, 14 o 30 días.
- Se compara contra un umbral mínimo \(x_{min}\) para decidir pedido.

**Mini sección opcional (Laplace, nivel básico visto en clase)**  
Si se quiere justificar el modelo en dominio \(s\) sin complicarlo:

- \( \mathcal{L}\{1\} = \frac{1}{s} \)  (tabla 1)
- \( \mathcal{L}\{t\} = \frac{1}{s^2} \)  (tabla 2)
- \( \mathcal{L}\{\sen(kt)\} = \frac{k}{s^2+k^2} \)  (tabla 7)
- \( \mathcal{L}\{e^{at}\} = \frac{1}{s-a} \)  (tabla 11)

Uso en la propuesta (opcional):
- \(e^{kt}\) aparece en la solución \(x(t)=x_0e^{kt}\), por lo tanto su transformada se puede citar como \( \mathcal{L}\{e^{kt}\}=\frac{1}{s-k} \).
- Esto sirve solo para mostrar relación con lo aprendido en Laplace; **el modelo principal sigue siendo** \( \frac{dx}{dt}=kx \).

**Justificación (para qué)**  
Se usa esta fórmula porque es la que ya trabajaste y permite construir un modelo predictivo claro, defendible y acorde al nivel actual del curso.

---

### 1.4 Modelo predictivo

El **modelo predictivo** combina:  
1) estimación de \( k \) desde frecuencia de servicios e insumos por servicio;  
2) uso de la solución \(x(t)=x_0e^{kt}\) para proyectar el stock en un horizonte (p. ej. 7, 14, 30 días);  
3) reglas de decisión: si \( x(t) \leq x_{\min} \) antes del plazo de entrega del proveedor → **alerta de pedido**.

**Justificación (para qué)**  
Unificar histórico + ecuación diferencial de crecimiento/decrecimiento cumple el producto de aprendizaje al aplicar una fórmula vista en clase a un problema real de ingeniería.

---

### 1.5 Resultados

*(En la memoria final, aquí van tablas y gráficos reales.)*

**Ejemplo de presentación esperada:**  
- Tabla: día \( t \), \( S(t) \) predicho, \( S(t) \) observado (si hay registro).  
- Gráfico: \( x(t) \) vs. tiempo (curva de decrecimiento o crecimiento según el valor de \(k\)).  
- Tabla: distribución de \( \Delta t_{visita} \) (cada cuánto asiste el cliente).

**Justificación (para qué)**  
La rúbrica exige **tablas, gráficos o reportes** para verificar el módulo funcional y la comunicación de resultados.

---

### 1.6 Interpretación de resultados

- Si la curva predicha \( x(t) \) **cruza el umbral** \( x_{\min} \) antes del próximo ciclo de compra, la interpretación es **riesgo de faltante**; la decisión sugerida es **anticipar el pedido**.  
- Si el valor absoluto de \(k\) sube tras campañas o temporada alta, la interpretación es que el consumo se acelera y se debe revisar el punto de reorden.  
- La **frecuencia de visita** alta en un segmento de clientes implica **mayor demanda esperada** de servicios e insumos asociados.

**Justificación (para qué)**  
La rúbrica pide indicar **qué decisiones** pueden tomarse a partir del análisis; sin interpretación, el modelo no aporta a la gestión del salón.

---

### 1.7 Conclusiones

- El modelo con la ley de crecimiento/decrecimiento \( \frac{dx}{dt}=kx \) es adecuado para representar la variación del stock de materias primas.  
- La solución \( x(t)=x_0e^{kt} \) permite estimar con anticipación cuándo se alcanzará un nivel crítico de inventario.  
- El enfoque es consistente con las fórmulas vistas en clase y cumple el alcance académico de esta etapa.  
- La integración en **Miru Franco Web** (módulo inventario / futura pestaña materias primas) da el marco de software para convertir ese análisis en decisiones operativas.

**Justificación (para qué)**  
Las conclusiones cierran el ciclo **evidencia → modelo → decisión**, requisito de la memoria de cálculo y del proyecto transversal.

---

## Referencias bibliográficas (ejemplo para citar en el documento final)

- Pressman, R. S., & Maxim, B. R. (2020). *Ingeniería del software: un enfoque práctico* (8.ª ed.). McGraw-Hill.  
- Zill, D. G. (2018). *Ecuaciones diferenciales con aplicaciones de modelado* (11.ª ed.). Cengage Learning.  

*(Añada las que indique su docente: normas APA, IEEE, etc.)*

---

## Historial

| Fecha | Cambio |
|-------|--------|
| 2025-03 | Documento generado según estructura académica y rúbrica A2 |
| 2026-03 | Ajuste de fórmulas: solo ley de crecimiento/decrecimiento \(dx/dt = kx\) según práctica en clase |
