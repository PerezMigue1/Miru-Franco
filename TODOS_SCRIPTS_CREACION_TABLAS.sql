-- =============================================================================
-- SCRIPT MAESTRO: Creación / orden de tablas (PostgreSQL / Neon)
-- Proyecto: backend-miru
-- Alineado con: prisma/schema.prisma (enero 2026)
--
-- USO:
--   • BD nueva: ejecutar en orden desde el inicio (o por secciones).
--   • BD antigua con dirección en usuarios: ejecutar antes del e-commerce la
--     sección "MIGRACIÓN: quitar dirección embebida".
--   • Si en el pasado existieron cupones en Neon: opcional
--     remove_cupones_si_ya_existian.sql
--
-- Los archivos modulares en esta carpeta son la fuente detallada; este archivo
-- consolida el orden y el SQL equivalente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ENUM + USUARIOS + PREGUNTAS (sin dirección embebida; coincide con Prisma)
-- -----------------------------------------------------------------------------

CREATE TYPE "TipoCabello" AS ENUM ('liso', 'ondulado', 'rizado');

CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "password" TEXT,
    "fechaNacimiento" TIMESTAMP(3),
    "googleId" TEXT,
    "foto" TEXT,
    "aceptaAvisoPrivacidad" BOOLEAN NOT NULL DEFAULT false,
    "recibePromociones" BOOLEAN NOT NULL DEFAULT false,
    "resetPasswordToken" TEXT,
    "resetPasswordExpires" TIMESTAMP(3),
    "codigoOTP" TEXT,
    "otpExpira" TIMESTAMP(3),
    "confirmado" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "intentos_login_fallidos" INTEGER NOT NULL DEFAULT 0,
    "cuenta_bloqueada_hasta" TIMESTAMP(3),
    "ultimo_intento_login" TIMESTAMP(3),
    "ultima_actividad" TIMESTAMP(3),
    "tokens_revocados_desde" TIMESTAMP(3),
    "rol" TEXT NOT NULL DEFAULT 'cliente',
    "tipoCabello" "TipoCabello",
    "color_natural" TEXT,
    "color_actual" TEXT,
    "productos_usados" TEXT,
    "alergias" TEXT,
    "pregunta_seguridad" TEXT,
    "respuesta_seguridad" TEXT,
    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "preguntas_disponibles" (
    "id" TEXT NOT NULL,
    "pregunta" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "preguntas_disponibles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");
CREATE UNIQUE INDEX "usuarios_googleId_key" ON "usuarios"("googleId");
CREATE UNIQUE INDEX "preguntas_disponibles_pregunta_key" ON "preguntas_disponibles"("pregunta");
CREATE INDEX "usuarios_activo_idx" ON "usuarios"("activo");
CREATE INDEX "usuarios_email_idx" ON "usuarios"("email");

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

INSERT INTO "preguntas_disponibles" ("id", "pregunta", "activa") VALUES
(gen_random_uuid()::text, '¿Cuál es el nombre de tu mascota favorita?', true),
(gen_random_uuid()::text, '¿En qué ciudad naciste?', true),
(gen_random_uuid()::text, '¿Cuál es el nombre de tu mejor amigo de la infancia?', true),
(gen_random_uuid()::text, '¿Cuál es el nombre de tu primera escuela?', true),
(gen_random_uuid()::text, '¿Cuál es el apellido de soltera de tu madre?', true),
(gen_random_uuid()::text, '¿Cuál es tu comida favorita?', true),
(gen_random_uuid()::text, '¿Cuál es el nombre de tu película favorita?', true),
(gen_random_uuid()::text, '¿En qué calle creciste?', true);

-- -----------------------------------------------------------------------------
-- 2. PRODUCTOS + PRESENTACIONES (= create_productos_tables alineado a Prisma)
--    Precio/stock/disponible van en producto_presentaciones, no en productos.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS productos (
  id                SERIAL PRIMARY KEY,
  nombre            VARCHAR(255) NOT NULL,
  marca             VARCHAR(255) NOT NULL,
  descripcion       VARCHAR(1000),
  descripcion_larga TEXT,
  imagenes          TEXT[] DEFAULT '{}',
  descuento         INTEGER,
  categoria         VARCHAR(100),
  nuevo             BOOLEAN NOT NULL DEFAULT FALSE,
  cruelty_free      BOOLEAN NOT NULL DEFAULT FALSE,
  caracteristicas   TEXT[] DEFAULT '{}',
  ingredientes      TEXT,
  modo_uso          TEXT,
  resultado         TEXT,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS producto_presentaciones (
  id               SERIAL PRIMARY KEY,
  producto_id      INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  tamanio          VARCHAR(50) NOT NULL,
  precio           DECIMAL(10,2) NOT NULL,
  precio_original  DECIMAL(10,2),
  stock            INTEGER NOT NULL DEFAULT 0,
  disponible       BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_caducidad  TIMESTAMP(3),
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
CREATE INDEX IF NOT EXISTS idx_producto_presentaciones_producto_id ON producto_presentaciones(producto_id);

-- -----------------------------------------------------------------------------
-- 3. SERVICIOS + SERVICIO_PRODUCTOS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS servicios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  descripcion_larga TEXT,
  precio DECIMAL(10,2) NOT NULL,
  duracion_minutos INT NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  requiere_evaluacion BOOLEAN DEFAULT false,
  imagen JSONB DEFAULT '[]',
  incluye JSONB DEFAULT '[]',
  recomendaciones JSONB DEFAULT '[]',
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS servicio_productos (
  id SERIAL PRIMARY KEY,
  servicio_id INT NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
  producto_id INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  cantidad_estimada DECIMAL(10,2) DEFAULT 1,
  UNIQUE(servicio_id, producto_id)
);

CREATE INDEX IF NOT EXISTS idx_servicios_categoria ON servicios(categoria);
CREATE INDEX IF NOT EXISTS idx_servicios_activo ON servicios(activo);
CREATE INDEX IF NOT EXISTS idx_servicio_productos_servicio ON servicio_productos(servicio_id);
CREATE INDEX IF NOT EXISTS idx_servicio_productos_producto ON servicio_productos(producto_id);

-- -----------------------------------------------------------------------------
-- 4. SERVICIO_ESPECIALISTAS (= create_servicio_especialistas.sql)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS servicio_especialistas (
  id SERIAL PRIMARY KEY,
  servicio_id INT NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  UNIQUE(servicio_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_servicio_especialistas_servicio ON servicio_especialistas(servicio_id);
CREATE INDEX IF NOT EXISTS idx_servicio_especialistas_usuario ON servicio_especialistas(usuario_id);

-- -----------------------------------------------------------------------------
-- 5. TOKENS REVOCADOS (blacklist JWT)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "tokens_revocados" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "token" TEXT NOT NULL,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tokens_revocados_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tokens_revocados_token_key" ON "tokens_revocados"("token");
CREATE INDEX IF NOT EXISTS "tokens_revocados_expira_en_idx" ON "tokens_revocados"("expira_en");

-- -----------------------------------------------------------------------------
-- 6. CÓDIGOS OAUTH
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "codigos_oauth" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "codigo" TEXT NOT NULL UNIQUE,
  "token" TEXT NOT NULL,
  "expira_en" TIMESTAMP NOT NULL,
  "usado" BOOLEAN NOT NULL DEFAULT false,
  "creado_en" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_codigos_oauth_codigo" ON "codigos_oauth"("codigo");
CREATE INDEX IF NOT EXISTS "idx_codigos_oauth_expira_en" ON "codigos_oauth"("expira_en");

-- =============================================================================
-- MIGRACIÓN: quitar dirección embebida de usuarios (BD creada con script viejo)
-- Archivo equivalente: drop_direccion_embebida_usuarios.sql
-- =============================================================================

-- ALTER TABLE usuarios DROP COLUMN IF EXISTS calle;
-- ALTER TABLE usuarios DROP COLUMN IF EXISTS numero;
-- ALTER TABLE usuarios DROP COLUMN IF EXISTS colonia;
-- ALTER TABLE usuarios DROP COLUMN IF EXISTS ciudad;
-- ALTER TABLE usuarios DROP COLUMN IF EXISTS estado;
-- ALTER TABLE usuarios DROP COLUMN IF EXISTS codigo_postal;

-- =============================================================================
-- PARCHES INCREMENTALES (bases ya existentes; idempotentes con IF NOT EXISTS)
-- =============================================================================

-- Columnas de seguridad / actividad si faltan (usuarios antiguos)
ALTER TABLE "usuarios"
ADD COLUMN IF NOT EXISTS "intentos_login_fallidos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "cuenta_bloqueada_hasta" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "ultimo_intento_login" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "ultima_actividad" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "tokens_revocados_desde" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "rol" TEXT NOT NULL DEFAULT 'cliente';

ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagenes TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS "idx_usuarios_tokens_revocados_desde" ON "usuarios"("tokens_revocados_desde");
CREATE INDEX IF NOT EXISTS "idx_usuarios_ultima_actividad" ON "usuarios"("ultima_actividad");
COMMENT ON COLUMN "usuarios"."ultima_actividad" IS 'Última actividad del usuario para verificar expiración por inactividad (15 minutos)';

ALTER TABLE producto_presentaciones ADD COLUMN IF NOT EXISTS fecha_caducidad TIMESTAMP(3);

-- =============================================================================
-- 7. E-COMMERCE (direcciones_usuario, pedidos, carrito, pagos, etc.)
-- Archivo equivalente: create_ecommerce_pedidos_y_relacionadas.sql
-- Requiere: usuarios, productos, producto_presentaciones
-- =============================================================================

DO $$ BEGIN CREATE TYPE "TipoDomicilio" AS ENUM ('casa', 'trabajo'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EstadoPedido" AS ENUM ('borrador', 'pendiente_pago', 'pagado', 'preparando', 'enviado', 'entregado', 'cancelado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EstadoEnvio" AS ENUM ('preparando', 'en_transito', 'entregado', 'fallido'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EstadoPago" AS ENUM ('pendiente', 'aprobado', 'rechazado', 'cancelado', 'reembolsado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS direcciones_usuario (
  id TEXT NOT NULL PRIMARY KEY,
  calle TEXT NOT NULL,
  codigo_postal TEXT NOT NULL,
  estado TEXT NOT NULL,
  municipio_alcaldia TEXT NOT NULL,
  localidad TEXT NOT NULL,
  colonia_barrio TEXT NOT NULL,
  numero_interior TEXT,
  indicaciones TEXT,
  tipo_domicilio "TipoDomicilio" NOT NULL,
  contacto_nombre_apellido TEXT NOT NULL,
  contacto_telefono TEXT NOT NULL,
  es_principal BOOLEAN NOT NULL DEFAULT false,
  creado_en TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS direcciones_usuario_usuario_id_idx ON direcciones_usuario(usuario_id);

CREATE TABLE IF NOT EXISTS pedidos (
  id SERIAL PRIMARY KEY,
  estado "EstadoPedido" NOT NULL DEFAULT 'borrador',
  subtotal DECIMAL(10,2) NOT NULL,
  costo_envio DECIMAL(10,2) NOT NULL DEFAULT 0,
  impuestos DECIMAL(10,2) NOT NULL DEFAULT 0,
  descuento DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  moneda TEXT NOT NULL DEFAULT 'MXN',
  direccion_texto_completa TEXT,
  notas_cliente TEXT,
  metodo_pago TEXT,
  referencia_pago TEXT,
  pagado_en TIMESTAMP(3),
  creado_en TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  direccion_envio_id TEXT REFERENCES direcciones_usuario(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS pedidos_usuario_id_idx ON pedidos(usuario_id);
CREATE INDEX IF NOT EXISTS pedidos_estado_idx ON pedidos(estado);
CREATE INDEX IF NOT EXISTS pedidos_creado_en_idx ON pedidos(creado_en);

CREATE TABLE IF NOT EXISTS pedido_items (
  id SERIAL PRIMARY KEY,
  cantidad INTEGER NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  nombre_producto TEXT,
  tamanio TEXT,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE ON UPDATE CASCADE,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  presentacion_id INTEGER NOT NULL REFERENCES producto_presentaciones(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS pedido_items_pedido_id_idx ON pedido_items(pedido_id);
CREATE INDEX IF NOT EXISTS pedido_items_pedido_id_producto_id_idx ON pedido_items(pedido_id, producto_id);
CREATE INDEX IF NOT EXISTS pedido_items_producto_id_idx ON pedido_items(producto_id);

CREATE TABLE IF NOT EXISTS carrito_items (
  id SERIAL PRIMARY KEY,
  cantidad INTEGER NOT NULL,
  precio_referencia DECIMAL(10,2),
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE ON UPDATE CASCADE,
  presentacion_id INTEGER NOT NULL REFERENCES producto_presentaciones(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT carrito_items_usuario_id_presentacion_id_key UNIQUE (usuario_id, presentacion_id)
);
CREATE INDEX IF NOT EXISTS carrito_items_usuario_id_idx ON carrito_items(usuario_id);

CREATE TABLE IF NOT EXISTS pagos (
  id SERIAL PRIMARY KEY,
  intento_numero INTEGER NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  moneda TEXT NOT NULL DEFAULT 'MXN',
  metodo TEXT NOT NULL,
  proveedor TEXT,
  estado "EstadoPago" NOT NULL DEFAULT 'pendiente',
  referencia_externa TEXT,
  error_mensaje TEXT,
  payload JSONB,
  pagado_en TIMESTAMP(3),
  creado_en TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS pagos_pedido_id_idx ON pagos(pedido_id);
CREATE INDEX IF NOT EXISTS pagos_estado_idx ON pagos(estado);
CREATE INDEX IF NOT EXISTS pagos_referencia_externa_idx ON pagos(referencia_externa);

CREATE TABLE IF NOT EXISTS historial_estados_pedido (
  id SERIAL PRIMARY KEY,
  estado_anterior "EstadoPedido",
  estado_nuevo "EstadoPedido" NOT NULL,
  origen TEXT,
  creado_en TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE ON UPDATE CASCADE,
  usuario_id TEXT REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS historial_estados_pedido_pedido_id_idx ON historial_estados_pedido(pedido_id);
CREATE INDEX IF NOT EXISTS historial_estados_pedido_creado_en_idx ON historial_estados_pedido(creado_en);

CREATE TABLE IF NOT EXISTS envios (
  id SERIAL PRIMARY KEY,
  empresa_envio TEXT,
  numero_guia TEXT,
  estado_envio "EstadoEnvio" NOT NULL DEFAULT 'preparando',
  fecha_envio TIMESTAMP(3),
  fecha_entrega TIMESTAMP(3),
  notas TEXT,
  creado_en TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS envios_pedido_id_idx ON envios(pedido_id);
CREATE INDEX IF NOT EXISTS envios_numero_guia_idx ON envios(numero_guia);

CREATE TABLE IF NOT EXISTS facturas (
  id SERIAL PRIMARY KEY,
  uuid_fiscal TEXT,
  folio TEXT,
  serie TEXT,
  xml_url TEXT,
  pdf_url TEXT,
  estado TEXT,
  creado_en TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS facturas_pedido_id_idx ON facturas(pedido_id);

CREATE TABLE IF NOT EXISTS valoraciones (
  id SERIAL PRIMARY KEY,
  puntuacion INTEGER NOT NULL,
  comentario TEXT,
  creado_en TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE ON UPDATE CASCADE,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT valoraciones_usuario_id_producto_id_key UNIQUE (usuario_id, producto_id)
);
CREATE INDEX IF NOT EXISTS valoraciones_producto_id_idx ON valoraciones(producto_id);
CREATE INDEX IF NOT EXISTS valoraciones_pedido_id_idx ON valoraciones(pedido_id);

CREATE TABLE IF NOT EXISTS devoluciones (
  id SERIAL PRIMARY KEY,
  motivo TEXT,
  estado TEXT NOT NULL,
  monto DECIMAL(10,2),
  creado_en TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE ON UPDATE CASCADE,
  pedido_item_id INTEGER REFERENCES pedido_items(id) ON DELETE SET NULL ON UPDATE CASCADE,
  pago_id INTEGER REFERENCES pagos(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS devoluciones_pedido_id_idx ON devoluciones(pedido_id);
CREATE INDEX IF NOT EXISTS devoluciones_estado_idx ON devoluciones(estado);

CREATE TABLE IF NOT EXISTS notificaciones (
  id TEXT NOT NULL PRIMARY KEY,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  creado_en TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS notificaciones_usuario_id_idx ON notificaciones(usuario_id);
CREATE INDEX IF NOT EXISTS notificaciones_leida_idx ON notificaciones(leida);

-- =============================================================================
-- FIN SCRIPT MAESTRO
-- Referencias: drop_direccion_embebida_usuarios.sql,
--               create_ecommerce_pedidos_y_relacionadas.sql,
--               alter_producto_presentaciones_precio_a_decimal.sql (BD con precio VARCHAR),
--               remove_cupones_si_ya_existian.sql (solo si aplicó cupones viejos)
-- =============================================================================
