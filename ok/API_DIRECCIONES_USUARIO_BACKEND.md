# Backend: direcciones de usuario (`DireccionUsuario`)

## Prisma vs Neon: no “chocan”, son capas distintas

- **En `schema.prisma`:** el **nombre del campo en TypeScript** es camelCase (`codigoPostal`, `usuarioId`, `creadoEn`). El **`@map("codigo_postal")`** solo dice a Prisma cómo se llama la **columna en PostgreSQL/Neon** (snake_case, convención SQL).
- **Prisma Client** siempre usa el nombre de **código**: `direccion.codigoPostal`. Al persistir, Prisma escribe en la columna `codigo_postal`. No tienes que usar snake_case en TS por el `@map`.
- **`@@map("direcciones_usuario")`:** nombre real de la **tabla** en la BD; el modelo sigue llamándose `DireccionUsuario` en código.

**JSON del navegador → Nest** no habla con Neon directamente: habla con tu **DTO/controlador**. Lo coherente con Prisma en Nest es JSON en **camelCase** (mismos nombres que el modelo Prisma en TS). Quien hace el puente a columnas `codigo_postal`, etc., es **Prisma** al hacer `prisma.direccionUsuario.update({ data: { codigoPostal: '...' } })`.

Si el front mandara `codigo_postal` en el JSON, Nest tendría que mapearlo a `codigoPostal` antes de pasarlo a Prisma (o definir el DTO en snake_case). Por eso el front usa camelCase alineado al **modelo TS**, no a los nombres de columna SQL.

## Tabla `direcciones_usuario` en Neon (fuente: `TODOS_SCRIPTS_CREACION_TABLAS.sql`)

El script maestro crea la tabla así (PostgreSQL; nombres **reales** de columnas en la BD):

| Columna en Neon (SQL) | Tipo | Nullable | Notas |
|------------------------|------|----------|--------|
| `id` | TEXT PK | NO | UUID/texto |
| `calle` | TEXT | NO | |
| `codigo_postal` | TEXT | NO | |
| `estado` | TEXT | NO | |
| `municipio_alcaldia` | TEXT | NO | |
| `localidad` | TEXT | NO | |
| `colonia_barrio` | TEXT | NO | |
| `numero_interior` | TEXT | SÍ | |
| `indicaciones` | TEXT | SÍ | |
| `tipo_domicilio` | enum `TipoDomicilio` | NO | valores `'casa'`, `'trabajo'` |
| `contacto_nombre_apellido` | TEXT | NO | |
| `contacto_telefono` | TEXT | NO | |
| `es_principal` | BOOLEAN | NO | default `false` |
| `creado_en` | TIMESTAMP(3) | NO | default `CURRENT_TIMESTAMP` |
| `actualizado_en` | TIMESTAMP(3) | NO | |
| `usuario_id` | TEXT FK → `usuarios(id)` | NO | CASCADE al borrar usuario |

**Mapeo Neon → campo Prisma (TS) → JSON del front**

| Neon | Prisma (`@map`) | JSON API (camelCase) |
|------|-----------------|----------------------|
| `codigo_postal` | `codigoPostal` | `codigoPostal` |
| `municipio_alcaldia` | `municipioAlcaldia` | `municipioAlcaldia` |
| `colonia_barrio` | `coloniaBarrio` | `coloniaBarrio` |
| `numero_interior` | `numeroInterior` | `numeroInterior` |
| `tipo_domicilio` | `tipoDomicilio` | `tipoDomicilio` |
| `contacto_nombre_apellido` | `contactoNombreApellido` | `contactoNombreApellido` |
| `contacto_telefono` | `contactoTelefono` | `contactoTelefono` |
| `es_principal` | `esPrincipal` | `esPrincipal` |
| `creado_en` | `creadoEn` | (solo lectura; no suele enviarse en PUT) |
| `actualizado_en` | `actualizadoEn` | (solo lectura) |
| `usuario_id` | `usuarioId` | **no enviar**; viene del JWT |

Las columnas `calle`, `estado`, `localidad` coinciden en nombre entre SQL y Prisma (sin `@map` distinto en el sentido de “otro nombre”; en Prisma siguen siendo `calle`, `estado`, `localidad`).

---

Si el front muestra **«Revisa los campos del formulario»**, el backend está respondiendo **400** con validación fallida. Revisa lo siguiente.

## 1. Cuerpo JSON que envía el front (camelCase)

Debe coincidir con tu **DTO** de Nest (nombres de propiedades en TypeScript, no nombres de columna SQL):

| Campo JSON | Tipo | Notas |
|------------|------|--------|
| `calle` | string | obligatorio en creación |
| `codigoPostal` | string | no `codigo_postal` en el JSON si usas DTO camelCase |
| `estado` | string | |
| `municipioAlcaldia` | string | |
| `localidad` | string | |
| `coloniaBarrio` | string | |
| `numeroInterior` | string \| null | opcional |
| `indicaciones` | string \| null | opcional |
| `tipoDomicilio` | `"casa"` \| `"trabajo"` | enum Prisma `TipoDomicilio` |
| `contactoNombreApellido` | string | |
| `contactoTelefono` | string | el front envía 10 dígitos |
| `esPrincipal` | boolean | |

**No enviar** `usuarioId` desde el front: debe salir del **JWT** en el controlador.

## 2. ValidationPipe (causa típica del error)

Si en `main.ts` tienes algo como:

```ts
new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })
```

entonces:

- El DTO debe declarar **exactamente** las propiedades que llegan (camelCase como arriba).
- Si el DTO usa solo `snake_case`, o faltan propiedades con `@IsOptional()`, fallará la validación.

**Opciones:**

- Ajustar el DTO a los nombres camelCase del modelo Prisma en TS, **o**
- Usar `@Expose` / `class-transformer` para mapear desde snake_case, **o**
- Relajar solo en esta ruta: `forbidNonWhitelisted: false` (menos recomendado).

## 3. PUT vs PATCH

El front intenta **`PUT /api/direcciones-usuario/:id`** y, si responde **405**, **`PATCH`** con el mismo cuerpo.

Tu controlador debe exponer al menos uno de los dos con el mismo DTO de actualización.

## 4. DTO ejemplo (Nest + class-validator)

```ts
import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

enum TipoDomicilioDto {
  casa = 'casa',
  trabajo = 'trabajo',
}

export class UpdateDireccionUsuarioDto {
  @IsString() @MinLength(1) calle!: string;
  @IsString() codigoPostal!: string;
  @IsString() estado!: string;
  @IsString() municipioAlcaldia!: string;
  @IsString() localidad!: string;
  @IsString() coloniaBarrio!: string;
  @IsOptional() @IsString() numeroInterior?: string | null;
  @IsOptional() @IsString() indicaciones?: string | null;
  @IsEnum(TipoDomicilioDto) tipoDomicilio!: TipoDomicilioDto;
  @IsString() contactoNombreApellido!: string;
  @IsString() contactoTelefono!: string;
  @IsBoolean() esPrincipal!: boolean;
}
```

En **PATCH** parcial, marca casi todo con `@IsOptional()` si aceptas actualizaciones parciales.

## 5. Respuesta del servidor

Tras PUT/PATCH, devuelve el objeto actualizado (o `{ data: { ... } }`) con `id` en UUID para que el front pueda normalizarlo. Si devuelves **204 sin cuerpo**, el front ya reintenta con **GET** de la lista.

## 6. Mensaje «Revisa los campos del formulario»

Eso lo genera **tu API** en el cuerpo del 400 (`message` / `error`). Mejora el backend para incluir **`errors`** de class-validator en la respuesta JSON y así ver en Network la propiedad concreta que falla.
