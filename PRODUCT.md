# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Clientas del salón** (portal público y autenticado): reservan servicios, compran productos del catálogo y consultan sus citas, pedidos y perfil. Usan el celular y la computadora en proporción parecida (confirmado por el dueño del producto).
- **Personal del salón** — estilista, empleado y becario (`/operacion`; en BD el becario se guarda como `'becario'`): agenda, cola de atención, ejecución de servicios, cobro, punto de venta y subida de imágenes. Trabajan sobre todo desde una computadora en recepción; el móvil es secundario (confirmado).
- **Administración** (`/admin`): catálogo, inventario, ventas, clientes, personal, reportes y el Gestor de Base de Datos.

## Product Purpose
Mirú Franco Beauty Salón (Huejutla de Reyes, Hidalgo, México) opera en un solo sistema su portal de clientas (reservas de servicios y tienda en línea) y su operación interna (agenda, cobro, inventario, personal). El éxito es que una clienta reserve o compre sin fricción y que el personal atienda sin fricción desde recepción.

## Operating Context
- Horario: lunes a viernes de 9:30 a 19:30 h, sábados de 9:30 a 19:00 h, domingos cerrado (igual que `configuracion_salon` y `HORARIO_SALON`). Contacto: contacto@mirufranco.com.
- Backend propio NestJS (`backend-miru`) sobre Neon PostgreSQL con datos reales de clientas; tareas programadas de notificaciones.
- Imágenes en Cloudinary. `/operacion/subir-imagenes` sube fotos y devuelve URLs que el equipo asigna a servicios y productos; no hay tabla de galería.
- El sitio tiene modo claro y oscuro.

## Capabilities and Constraints
- Galería del sitio: se alimenta de las fotos reales de los servicios activos (`GET /api/servicios`, campo `imagen`), decisión confirmada del dueño del producto. Sin fotos, estado vacío; nunca imágenes de relleno.
- Hero de la home: productos reales del catálogo (`GET /api/productos`, activos y con imagen). Sin mocks.
- Autenticación: cookie `mf_session`, Google OAuth y validaciones existentes no se modifican desde el frontend.
- El trabajo de rediseño no cambia lógica de negocio, contratos de API, permisos, CORS ni el backend.

## Brand Commitments
Identidad existente que se eleva, no se reemplaza: terracota/beige, vino `#710014`, dorado `#9f6d1f`, Playfair Display para títulos, Great Vibes como acento manuscrito, monograma dorado "MF", íconos lucide-react (nunca emojis). Salón cálido y elegante, no estética SaaS.

## Evidence on Hand
- Logotipos: `public/logo-miru.jpg` (monograma PNG transparente), `public/images/logo-nf.png` (JPEG fondo negro).
- Fotos reales: las que existan en servicios y productos en Cloudinary. No hay testimonios, cifras de clientas ni fotos de portafolio adicionales; no se inventan.

## Product Principles
1. Reservar y comprar primero: cada pantalla de clienta tiene una acción principal clara.
2. El personal trabaja rápido desde recepción: densidad y consistencia antes que decoración.
3. Solo contenido real: productos, servicios y fotos salen de la base; los estados vacíos lo dicen con honestidad.
4. La marca vive en los detalles (tipografía, oro, monograma), no en el ruido.

## Accessibility & Inclusion
Contraste AA en claro y oscuro, objetivos táctiles de 44px, respeto a `prefers-reduced-motion`, sin scroll horizontal de 360px a 1920px.
