# Design System: Mirú Franco — superficies de cliente

Alcance: pantallas públicas y de cliente (home, contacto, sobre nosotros, términos, auth, `/cliente/*`, `/perfil`). `/admin` y `/operacion` conservan su diseño y no heredan nada de esto: todo vive detrás de `.superficie-cliente` (clase) y `SuperficieCliente` (contexto React en `components/cliente/SuperficieCliente.tsx`).

## 1. Atmósfera — "Atelier cálido"
Un salón de autor, no un SaaS: superficies de terracota y lino, vino profundo como voz, oro solo como detalle de joyería. Densidad 4 (aire generoso en marketing y catálogo; compacta y predecible en carrito, checkout y reserva). Variación 6: composiciones asimétricas en páginas que persuaden (home, detalle), estructura estable en las que operan (checkout, citas). Movimiento 6, con un único momento cinematográfico: el hero de la home.

## 2. Paleta y roles (identidad existente, sin colores nuevos de marca)
- **Lino** `#DCC8B6` (`--fondo-general`): lienzo de página.
- **Terracota** `#B38E6F` (`--tarjetas-paneles`): superficie de tarjeta; siempre con sombra tintada, nunca plana sobre el lino.
- **Arena** `#d0b29c` (`--fondos-suaves`): superficies secundarias, marcos de imagen, skeletons.
- **Vino** `#710014` (`--botones-principales`): único acento de acción. Un CTA primario por pantalla.
- **Oro** `#9f6d1f` (`--logo-branding`): foco, hairlines, brillo al hover, ornamento. Nunca texto largo.
- **Carbón** `#161616` (`--header-footer`): cromo del sitio y placeholders de marca. Sin negro puro.
- Las sombras se tiñen de café (`rgba(58, 28, 10, …)`), no de gris.

## 3. Tipografía
- **Display y títulos:** Playfair Display (fijada por la marca), tracking −0.02em, `text-wrap: balance`. `PageHeader` usa esta voz en todas las pantallas de cliente.
- **Texto:** Geist, interlineado 1.6, medida máxima de 65ch en párrafos largos.
- **Precios y cifras:** `font-variant-numeric: tabular-nums`.
- Sin eyebrows ni etiquetas sobre los títulos: el título lleva su propio peso.

## 4. Componentes (variante cliente)
- **Tarjetas:** radio de 14px, elevación por sombra tintada (sin borde + sombra a la vez). Las clicables se elevan 2px y ganan sombra al hover (solo con puntero fino) y se hunden a `scale(0.99)` al presionar.
- **Tarjetas de catálogo 3D:** inclinación máxima de 6°, con brillo dorado que sigue al puntero y un resorte (lerp en rAF). Se desactiva con puntero táctil o `prefers-reduced-motion`.
- **Botones:** `scale(0.97)` al presionar (140ms), transición solo de color/sombra/transform; foco con anillo de oro de 2px separado 2px.
- **Estados vacíos y carga:** composición con el monograma de la marca y una acción; skeleton con brillo lento en vez de spinners.
- **Placeholders de imagen:** monograma dorado sobre carbón (`ServicioImagen`, tarjetas de producto).
- **Pasos de flujo:** los flujos de reserva y compra muestran dónde está el usuario (`PasosFlujo`).

## 5. Layout
- Contenedor `layout-page` existente; ritmo de 4px. Más espacio sobre un título que debajo.
- Una sola columna por debajo de 768px, sin scroll horizontal y con objetivos táctiles de al menos 44px.
- Resúmenes de compra y cita fijos (`sticky`) en escritorio.

## 6. Movimiento
- Curvas: `--mf-ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--mf-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`.
- Duraciones: press 140ms, hover 200ms, entradas 520ms, stagger de 60ms (`--i`).
- Entradas de sección con `animation-timeline: view()` dentro de `@supports`: si el navegador no lo soporta, el contenido ya está visible. Nada de `data-reveal` ni IntersectionObserver.
- Hero: capas de profundidad (monograma, anillos, halo, tipografía) con parallax por puntero y por scroll. Con `prefers-reduced-motion` o puntero táctil queda estático o solo con scroll suave.
- Feedback: "Agregar al carrito" y "Confirmar cita" transforman el botón (check + etiqueta) con un crossfade con blur.
- `prefers-reduced-motion`: se conservan opacidad y color, se elimina el desplazamiento.

## 7. Prohibido
Emojis como íconos (solo lucide-react), eyebrows, texto con gradiente, glows de neón, negro puro, flechas que rebotan ("Descubre"), filas de tres tarjetas iguales como estructura de marketing, cajas vacías con un ícono de cámara, `transition: all`, animar desde `scale(0)`.
