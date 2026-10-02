# Design System: Mirú Franco — "Atelier cálido"

Alcance: todo el sitio. Un solo sistema de tokens y primitivas (`src/app/styles/sistema.css`) que comparten el portal de clientas, `/operacion` y `/admin`. Lo exclusivo del portal (hero, catálogo 3D, lectura larga, sello de confirmación) vive en `src/app/styles/cliente.css` bajo `.superficie-cliente` y el contexto `SuperficieCliente`. Los paneles usan el cascarón `components/layouts/PanelShell.tsx` (`.superficie-panel`).

## 1. Atmósfera
Un salón de autor, no un SaaS: superficies de terracota y lino, vino profundo como voz, oro solo como detalle de joyería.
- **Portal de clientas:** densidad 4, variación 6, movimiento 6. Composiciones asimétricas donde se persuade (home, detalle de producto); estructura estable donde se opera (carrito, checkout, reserva). Un único momento cinematográfico: el hero de la home.
- **Paneles (`/operacion`, `/admin`):** modo "operar". Densidad 6–7, variación 2, movimiento 2: el personal trabaja desde la PC de recepción varias horas al día, así que la interfaz se vuelve familiar y rápida. La marca vive en los detalles (monograma, Playfair en los títulos, foco vino/oro), no en la decoración.

## 2. Paleta y roles (identidad existente, sin colores nuevos de marca)
- **Lino** `#DCC8B6` (`--fondo-general`): lienzo de página.
- **Terracota** `#B38E6F` (`--tarjetas-paneles`): superficie de tarjeta; siempre con sombra tintada.
- **Arena** `#d0b29c` (`--fondos-suaves`): superficies secundarias, marcos de imagen, skeletons.
- **Vino** `#710014` (`--botones-principales`): único acento de acción. Un CTA primario por pantalla.
- **Oro** `#9f6d1f` (`--logo-branding`): hairlines, ornamento, íconos activos en oscuro. Nunca texto largo.
- **Carbón** `#161616` (`--header-footer`): cromo del sitio, barra de los paneles y placeholders de marca. Sin negro puro.
- Modo oscuro: grises neutros `#161616` / `#1f1f1f` / `#2a2a2a` con el mismo vino y oro.
- Sombras tintadas de café (`rgba(58, 28, 10, …)`) en claro; negras suaves en oscuro.

Tokens semánticos del sistema (claro / oscuro):
| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--mf-foco` | `#710014` | `#c4954d` | Anillo de foco de 2px (≥3:1 en todas las superficies) |
| `--texto-cuerpo` | `#2a2a2a` | `rgba(242,241,237,.88)` | Texto de diálogos y paneles |
| `--superficie-modal` | lino | `#2a2a2a` | Diálogos, avisos, cajones |
| `--superficie-lateral` | lino+arena | `#1b1b1b` | Menú lateral de los paneles |
| `--campo-borde` | `#8a7667` | `#6e6e6e` | Borde de campos (≥3:1) |
| `--campo-placeholder` | `#6b5a4e` | `#b8a597` | Placeholder (≥4.5:1 sobre `--input-bg`) |
| `--nav-activo-*` | vino 10% / vino | blanco 8% / blanco + oro | Ítem activo del menú (sin borde lateral de color) |
| `--mf-linea`, `--mf-linea-fuerte` | vino 14%, carbón 22% | blanco 8%, 16% | Divisores y bordes |

## 3. Tipografía
- **Display y títulos:** Playfair Display, tracking −0.02em, `text-wrap: balance`. En paneles, solo el título de la página y el de diálogos; etiquetas, botones y datos van en Geist.
- **Texto:** Geist, interlineado 1.6, medida máxima de 65ch en párrafos largos.
- **Cifras:** `tabular-nums` en precios, KPIs y todas las celdas de tabla.
- **Acento manuscrito:** Great Vibes solo para "Franco" en la marca.
- Sin eyebrows ni etiquetas sobre los títulos.
- Las variables `--font-family-serif/-script` se resuelven en `body` (donde next/font define sus fuentes); en `:root` quedaban inválidas.

## 4. Componentes (compartidos)
- **Card:** radio 14px en el portal y 12px en paneles; sombra tintada `--mf-sombra-1`, nunca borde + sombra a la vez. Las clicables se hunden a `scale(0.99)`; solo en el portal se elevan 2px al hover.
- **Button:** colores por variables (`--btn-bg`, `--btn-bg-hover`…); hover solo con puntero fino, `scale(0.97)` al presionar (140ms), altura mínima 44px con puntero táctil. "secondary" lleva texto oscuro sobre terracota (AA).
- **Input / Select / Textarea (`.mf-campo`):** etiqueta vinculada por `htmlFor`, borde ≥3:1, foco con borde vino/oro y halo del 22%, error en `--danger-texto` con `role="alert"`.
- **Badge (`.mf-badge`):** base clara opaca teñida del color de estado + texto oscuro de su familia (los rellenos sólidos anteriores quedaban entre 2.3 y 3.9:1).
- **Table (`.mf-tabla`):** encabezado sutil de etiqueta, divisores de 1px, filas clicables con tinte al hover, marco con scroll horizontal propio y barra fina visible.
- **Modal / Drawer / avisos (`.mf-dialogo`, `.mf-aviso`):** superficie `--superficie-modal`, velo carbón al 55%, entrada de 240ms (opacidad + `scale(0.97)`), Escape cierra, título en Playfair.
- **Breadcrumb:** rastro sobrio con chevrones; la página actual en vino y `aria-current`.
- **Estados vacíos y carga:** monograma + acción; skeleton `.mf-skeleton` en vez de spinners.
- **Placeholders de imagen:** monograma dorado sobre carbón (`ServicioImagen`).
- **Pasos de flujo:** reserva y compra muestran dónde está la clienta (`PasosFlujo`).

## 4b. Piezas del portal y de los paneles
- **Hero de la home (`HeroFluidos`, 2.5D con GSAP):** los cuatro fluidos AVYNA del catálogo (ids 33–36; nombre, precio y enlace del API, imágenes de renders propios en `public/hero/web`, AVIF/WebP con alfa) flotan en capas de profundidad con parallax amortiguado (`quickTo`) al puntero o al giroscopio e inclinación ligera; stickers vectoriales (tijeras, peine, gota, destello) con pop escalonado. Al hacer scroll el escenario se fija bajo el cromo del sitio (`position: sticky` sobre un recorrido de 140svh; 70svh en móvil) y el Fluido Di Goji viaja en un `<canvas>` (24 cuadros de giro en escritorio, 12 en móvil, precargados tras el primer pintado) hasta quedar sobre la tipografía gigante en Playfair ("Brillo que se nota", texto PROVISIONAL). Móvil: menos capas y pin corto. `prefers-reduced-motion`: composición estática y el destino como bloque normal (resuelto en CSS). Rendimiento: el Goji (LCP) se precarga desde la página con el mismo `srcset`/`sizes` que su `<source>`; GSAP vive en un chunk aparte (`AnimacionFluidos`) que se monta con el primer ocio del navegador o la primera interacción, así no compite con la carga. El progreso del scroll solo se lee mientras el hero está a la vista (IntersectionObserver): fuera de ella no queda ningún bucle de `requestAnimationFrame`. Las secciones bajo el hero (`SeccionesHome`) son componente de servidor; solo el carrusel de productos y la galería se hidratan, cada uno en su `<Suspense>`.
- **Intro de la home (`IntroGrieta`):** en cada carga completa de /home (entrada directa, llegada desde otro sitio o recarga); no en la navegación interna ni al volver con «atrás». El monograma MF se parte por una grieta de papel rasgado (`clip-path: polygon()`) que se abre en ≤1.3 s. Coreografía en CSS pura (corre fuera del hilo principal y termina sola aunque el JS no llegue). Se salta con clic, Escape o el botón; se omite con movimiento reducido. La decide un script mínimo del `<head>` antes del primer pintado, y arranca una sola vez por carga aunque React recree el nodo.
- **Galería (`GaleriaTrabajo`):** solo fotos reales de los servicios; mosaico editorial (cada 7 fotos: una 2×2, una 1×2 y una 2×1, llenando 12 celdas exactas) y visor a pantalla completa (flechas, deslizar por velocidad, Escape, foco devuelto). Sin fotos: estado vacío con monograma, nunca relleno.
- **Acceso (`AuthContainer`):** panel de marca carbón (en oscuro, teñido de vino) que se desliza entre el lado del acceso y el del registro (680ms ease-in-out, contra-movimiento del contenido y filete dorado en el borde que avanza). Ambos formularios montados; cambio de vista con `history.pushState` (URL directa y botón Atrás funcionan). Móvil: cabecera compacta + pestañas con indicador deslizante.
- **KPI de paneles (`TarjetaKpi`):** etiqueta que salta de línea, valor fluido con cifras tabulares, skeleton mientras carga, tonos AA (aviso, peligro, éxito, oro) y anillo de alerta solo cuando hay algo que atender. Dos columnas desde 360px.
- **Oro sobre carbón:** el texto dorado pequeño sobre el cromo (#161616) usa `--oro-sobre-carbon` (#b07a28, 4.9:1); el oro de marca queda para ornamento, íconos y texto grande.

## 5. Layout
- Portal: contenedor `layout-page`, ritmo de 4px, más espacio sobre un título que debajo. Resúmenes de compra y cita `sticky` en escritorio.
- Paneles (`PanelShell`): barra carbón de 56px con monograma, "Mirú Franco" y etiqueta del panel; menú lateral de 248px fijo desde 1024px (colapsable a 68px) y cajón deslizante por debajo, con velo y Escape; "Saltar al contenido"; contenido con máximo de 96rem.
- Una sola columna por debajo de 768px, sin scroll horizontal de página de 360 a 1920px; las tablas anchas desplazan dentro de su marco.
- Objetivos táctiles de al menos 44px.

## 6. Movimiento
- Curvas: `--mf-ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--mf-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`, `--mf-ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`.
- Duraciones: press 140ms, hover 200ms, cajón 240ms, entradas 520ms, stagger de 60ms (`--i`).
- Paneles: sin coreografías de carga; solo feedback (press, hover, cajón, diálogos).
- Entradas de sección del portal con `animation-timeline: view()` dentro de `@supports`: sin soporte, el contenido ya está visible. Nada de `data-reveal` ni IntersectionObserver.
- Feedback: "Agregar al carrito" y "Confirmar cita" transforman el botón (check + etiqueta) con un crossfade con blur.
- `prefers-reduced-motion`: se conservan opacidad y color, se elimina el desplazamiento.

## 7. Prohibido
Emojis o glifos Unicode como íconos (solo lucide-react), eyebrows, texto con gradiente, glows de neón, negro puro, bordes laterales de color de más de 1px en tarjetas, ítems o avisos, flechas que rebotan, filas de tres tarjetas iguales como estructura de marketing, imágenes de relleno, `transition: all`, animar desde `scale(0)`, hover que dependa de JS (`onMouseEnter` para colores).
