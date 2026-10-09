# Paleta de Colores - Miru Franco Web

> Fuente de verdad: `src/app/styles/globals.css` (marca, estados y constantes) y `src/app/styles/sistema.css` (sistema de interfaz).
> Actualizada el 7 de octubre de 2026.

---

## Reglas

- Ningún color se escribe a mano en componentes: se usa `var(--token)` o una clase de Tailwind de la paleta (`text-marfil`, `bg-negro/45`, `bg-[var(--hover)]`).
- `src/app/utils/coloresFijos.test.ts` falla, con archivo y línea, si encuentra un hex, `rgb()`/`rgba()` o una clase de color fijo de Tailwind (`text-gray-500`, `bg-white`, `bg-[#...]`, incluidas sus variantes `dark:` y `hover:`) fuera de la paleta.
- Un color nuevo se agrega primero a la paleta, con su valor en claro y en oscuro, y después se usa.
- El modo oscuro es la clase `.dark` en `<html>`. En las tablas, "igual" significa que el token no cambia en oscuro.
- Al agregar o renombrar tokens, redesplegar en Vercel sin "Use existing Build Cache": una vez publicó el CSS viejo con los componentes nuevos.

---

## Marca y superficies (`globals.css`)

| Variable | Claro | Oscuro | Uso |
|---|---|---|---|
| `--fondo-general` | `#DCC8B6` | `#161616` | Fondo base de la app |
| `--fondos-suaves` | `#d0b29c` | `#1f1f1f` | Fondos secundarios |
| `--tarjetas-paneles` | `#B38E6F` | `#2a2a2a` | Tarjetas y paneles |
| `--superficie-elevada` | `#ffffff` | `#2a2a2a` | Tarjetas internas (checkout) |
| `--input-bg` | `#F2F1ED` | `#1f1f1f` | Fondo de campos |
| `--header-footer` | `#161616` | igual | Header y pie de página |
| `--menu-texto-principal` | `#600011` | `#ffffff` | Texto principal (vino que cumple AA sobre terracota) |
| `--encabezados-alterno` | `#2A2A2A` | `#b38e6f` | Encabezados y texto alterno |
| `--texto-fondo-oscuro` | `#F2F1ED` | `#ffffff` | Texto sobre fondos oscuros |
| `--logo-branding` | `#9f6d1f` | igual | Oro de marca |
| `--iconografia` | `#BFA181` | igual | Iconos y detalles dorados |
| `--botones-principales` | `#710014` | igual | Botón principal (vino) |
| `--hover` | `#A64B63` | igual | Hover del botón principal |
| `--enlaces-textos-interactivos` | `#4A7BA7` | `#4a7ba7` | Enlaces |
| `--hero-tagline-color` | `#2A2A2A` | `rgba(242, 241, 237, 0.85)` | Tagline del hero |
| `--boton-acento-bg` | `#758764` | igual | Botón de acento (salvia) |
| `--texto-sobre-acento` | `var(--header-footer)` | igual | Texto sobre el botón de acento |
| `--checkout-entrega-borde-seleccion` | `var(--botones-principales)` | `#a64b63` | Borde de la opción de entrega elegida |
| `--checkout-entrega-enlace` | `var(--botones-principales)` | `var(--info-texto)` | Enlaces del paso de entrega |

### Estados

| Variable | Claro | Oscuro | Uso |
|---|---|---|---|
| `--warning` | `#D98E04` | igual | Aviso (fondos y acentos) |
| `--danger` | `#710014` | igual | Error (fondos y acentos) |
| `--success` | `#6E7D57` | igual | Éxito (fondos y acentos) |

### Texto con contraste AA

Variantes para texto pequeño donde el color de marca no alcanza 4.5:1.

| Variable | Claro | Oscuro | Uso |
|---|---|---|---|
| `--oro-texto` | `#37280b` | `#c4954d` | Oro como texto pequeño |
| `--oro-grande` | `#865a17` | `#c4954d` | Oro en cifras y títulos grandes |
| `--warning-texto` | `var(--oro-texto)` | `var(--warning)` | Aviso como texto |
| `--danger-texto` | `#600011` | `#e0748f` | Error como texto |
| `--success-texto` | `#242d1b` | `#82a163` | Éxito como texto |
| `--texto-secundario` | `#4a4541` | `var(--encabezados-alterno)` | Texto secundario sobre lino y arena |
| `--texto-enlace-sobre-calido` | `#14341e` | `var(--info-texto)` | Enlaces sobre superficies cálidas claras |

### Bordes y transparencias que cambian con el tema

| Variable | Claro | Oscuro |
|---|---|---|
| `--borde-sutil` | `rgba(255, 255, 255, 0.1)` | igual |
| `--borde-visible` | `rgba(255, 255, 255, 0.2)` | igual |
| `--texto-fondo-oscuro-80` | `rgba(242, 241, 237, 0.8)` | `rgba(255, 255, 255, 0.8)` |
| `--texto-fondo-oscuro-70` | `rgba(242, 241, 237, 0.7)` | `rgba(255, 255, 255, 0.7)` |
| `--texto-fondo-oscuro-10` | `rgba(242, 241, 237, 0.1)` | `rgba(255, 255, 255, 0.1)` |

---

## Constantes (mismo valor en claro y en oscuro)

Colores que antes estaban escritos a mano en los componentes. Se declaran igual en `:root` y en `.dark` a propósito.

### Marfil, blanco, negro y carbón

| Variable | Valor | Uso |
|---|---|---|
| `--marfil` | `#F2F1ED` | Texto sobre vino y carbón (a diferencia de `--texto-fondo-oscuro`, no pasa a blanco en oscuro) |
| `--marfil-75` | `rgba(242, 241, 237, 0.75)` | |
| `--marfil-70` | `rgba(242, 241, 237, 0.7)` | |
| `--marfil-07` | `rgba(242, 241, 237, 0.07)` | |
| `--blanco` | `#ffffff` | |
| `--blanco-04` | `rgba(255, 255, 255, 0.04)` | |
| `--blanco-07` | `rgba(255, 255, 255, 0.07)` | |
| `--negro` | `#000000` | Velos y sombras |
| `--negro-08` | `rgba(0, 0, 0, 0.08)` | |
| `--negro-09` | `rgba(0, 0, 0, 0.09)` | |
| `--negro-15` | `rgba(0, 0, 0, 0.15)` | |
| `--negro-18` | `rgba(0, 0, 0, 0.18)` | |
| `--negro-55` | `rgba(0, 0, 0, 0.55)` | |
| `--carbon-92` | `rgba(22, 22, 22, 0.92)` | |
| `--carbon-96` | `rgba(22, 22, 22, 0.96)` | Header al hacer scroll |

### Transparencias de los colores de marca

| Variable | Valor |
|---|---|
| `--oro-30` | `rgba(159, 109, 31, 0.3)` |
| `--oro-32` | `rgba(159, 109, 31, 0.32)` |
| `--oro-45` | `rgba(159, 109, 31, 0.45)` |
| `--oro-55` | `rgba(159, 109, 31, 0.55)` |
| `--destello-oro` | `rgba(214, 170, 92, 0.28)` |
| `--vino-12` | `rgba(113, 0, 20, 0.12)` |
| `--vino-55` | `rgba(113, 0, 20, 0.55)` |
| `--salvia-18` | `rgba(110, 125, 87, 0.18)` |
| `--azul-10` | `rgba(74, 123, 167, 0.10)` |
| `--azul-18` | `rgba(74, 123, 167, 0.18)` |
| `--azul-75` | `rgba(74, 123, 167, 0.75)` |
| `--ambar-15` | `rgba(217, 142, 4, 0.15)` |
| `--rosa-08` | `rgba(176, 56, 102, 0.08)` |
| `--rosa-50` | `rgba(176, 56, 102, 0.5)` |
| `--rojo-08` | `rgba(220, 38, 38, 0.08)` |

### Gráficas

`src/app/utils/chartColors.ts` arma las series con tokens: `CHART_COLORS_MARCA` para las gráficas del admin y `CHART_COLORS_CATEGORIAS` para las de categorías (empieza con `--enlaces-textos-interactivos`, `--success` y `--warning`, y sigue con estos):

| Variable | Valor |
|---|---|
| `--grafica-guinda` | `#590C0C` |
| `--grafica-ciruela` | `#8B5A8C` |
| `--grafica-petroleo` | `#2A6F6F` |
| `--grafica-teja` | `#C45C3E` |
| `--grafica-indigo` | `#5C6BC0` |

### Redes sociales (pie de página)

| Variable | Valor |
|---|---|
| `--marca-facebook` | `#1877F2` |
| `--marca-twitter` | `#1DA1F2` |
| `--marca-instagram` | `linear-gradient(45deg, #FCAF45 0%, #FF8C42 15%, #E1306C 40%, #833AB4 70%, #405DE6 100%)` |

---

## Sistema de interfaz (`sistema.css`)

| Variable | Claro | Oscuro | Uso |
|---|---|---|---|
| `--texto-cuerpo` | `#2a2a2a` | `rgba(242, 241, 237, 0.88)` | Texto de cuerpo neutro |
| `--superficie-modal` | `var(--fondo-general)` | `var(--tarjetas-paneles)` | Fondo de modales |
| `--superficie-lateral` | `color-mix(in srgb, var(--fondo-general) 62%, var(--fondos-suaves))` | `#1b1b1b` | Menú lateral de los paneles |
| `--mf-banda` | `#161616` | `#1f1f1f` | Banda oscura de contraste |
| `--oro-sobre-carbon` | `#b07a28` | `var(--oro-grande)` | Oro como texto pequeño sobre carbón |
| `--mf-foco` | `#710014` | `#c4954d` | Anillo de foco |
| `--mf-linea` | `rgba(113, 0, 20, 0.14)` | `rgba(255, 255, 255, 0.08)` | Divisores |
| `--mf-linea-fuerte` | `rgba(42, 42, 42, 0.22)` | `rgba(255, 255, 255, 0.16)` | Divisores marcados |
| `--campo-borde` | `#8a7667` | `#6e6e6e` | Borde de campos |
| `--campo-placeholder` | `#6b5a4e` | `#b8a597` | Placeholder sobre `--input-bg` |
| `--campo-placeholder-texto` | `#6f6a66` | `#8c8885` | Texto de ejemplo dentro de `.mf-campo` |
| `--nav-activo-bg` | `rgba(113, 0, 20, 0.1)` | `rgba(255, 255, 255, 0.08)` | Ítem activo de navegación |
| `--nav-activo-texto` | `#710014` | `#ffffff` | |
| `--nav-activo-icono` | `#710014` | `#c4954d` | |
| `--nav-hover-bg` | `rgba(113, 0, 20, 0.05)` | `rgba(255, 255, 255, 0.04)` | Hover de navegación |
| `--badge-base` | `#f2f1ed` | `#1f1f1f` | Base de las insignias |
| `--info-texto` | `#1f4466` | `#8fb6d9` | Información como texto |
| `--btn-secundario-texto` | `#2a2a2a` | `#f2f1ed` | Botón secundario sobre terracota |

### Sombras

Tintadas de café en claro y negras en oscuro.

| Variable | Claro | Oscuro |
|---|---|---|
| `--mf-sombra-1` | `0 1px 2px rgba(58, 28, 10, 0.1), 0 6px 16px -6px rgba(58, 28, 10, 0.22)` | `0 1px 2px rgba(0, 0, 0, 0.35), 0 8px 20px -8px rgba(0, 0, 0, 0.55)` |
| `--mf-sombra-2` | `0 2px 4px rgba(58, 28, 10, 0.1), 0 22px 40px -16px rgba(58, 28, 10, 0.42)` | `0 2px 4px rgba(0, 0, 0, 0.35), 0 24px 44px -16px rgba(0, 0, 0, 0.75)` |
| `--mf-sombra-modal` | `0 4px 10px rgba(58, 28, 10, 0.12), 0 32px 64px -20px rgba(58, 28, 10, 0.5)` | `0 4px 10px rgba(0, 0, 0, 0.4), 0 32px 64px -20px rgba(0, 0, 0, 0.85)` |

---

## Clases de Tailwind de la paleta

Definidas en `@theme inline` de `globals.css`. Funcionan con cualquier utilidad de color (`text-`, `bg-`, `border-`, `ring-`, `fill-`…), con opacidad (`/45`) y con variantes (`dark:`, `hover:`).

| Nombre en la clase | Token |
|---|---|
| `fondo-general` | `--fondo-general` |
| `fondos-suaves` | `--fondos-suaves` |
| `tarjetas-paneles` | `--tarjetas-paneles` |
| `menu-texto-principal` | `--menu-texto-principal` |
| `encabezados-alterno` | `--encabezados-alterno` |
| `texto-fondo-oscuro` y `over-dark` | `--texto-fondo-oscuro` |
| `logo-branding` | `--logo-branding` |
| `danger` | `--danger` |
| `marfil` | `--marfil` |
| `blanco` | `--blanco` |
| `negro` | `--negro` |

Para cualquier otro token se usa la forma arbitraria: `bg-[var(--hover)]`, `text-[var(--danger-texto)]`.

---

## Excepciones justificadas

Únicos archivos que pueden tener colores escritos a mano (la prueba revisa que cada uno use exactamente estos valores):

| Archivo | Motivo |
|---|---|
| `components/auth/LogoGoogle.tsx` | Colores oficiales del logo de Google |
| `utils/exportReportes.ts` | PDF con jsPDF: no puede leer variables CSS |
| `utils/mermaidRender.ts` | Tema de los diagramas Mermaid (SVG fuera del CSS) |
| `components/home/HeroFluidos.tsx`, `components/home/StickersSalon.tsx`, `utils/fluidosHero.ts` | Escena animada del hero |
| `components/ui/Button.tsx` | Blanco y negro de referencia dentro de `color-mix()` para el hover |
| `utils/serviceImagePlaceholder.ts` | Imagen de relleno en data URI (SVG) |

---

## Sistema Tipográfico

### Familias
| Variable | Valor |
|---|---|
| `--font-family-sans` | Geist Sans + system-ui |
| `--font-family-mono` | Geist Mono + Courier New |
| `--font-family-serif` | Playfair Display + Times New Roman |
| `--font-family-script` | Great Vibes (cursiva) |

### Escala de tamaños
| Variable | Valor | px equivalente |
|---|---|---|
| `--font-size-xs` | `0.75rem` | 12px |
| `--font-size-sm` | `0.875rem` | 14px |
| `--font-size-base` | `1rem` | 16px |
| `--font-size-lg` | `1.125rem` | 18px |
| `--font-size-xl` | `1.25rem` | 20px |
| `--font-size-2xl` | `1.5rem` | 24px |
| `--font-size-3xl` | `1.875rem` | 30px |
| `--font-size-4xl` | `2.25rem` | 36px |
| `--font-size-5xl` | `3rem` | 48px |
| `--font-size-6xl` | `3.75rem` | 60px |

### Line Heights
| Variable | Valor | Uso |
|---|---|---|
| `--line-height-tight` | `1.2` | Títulos grandes |
| `--line-height-snug` | `1.375` | Títulos medianos |
| `--line-height-normal` | `1.5` | Texto de cuerpo |
| `--line-height-relaxed` | `1.625` | Texto largo |

### Letter Spacing
| Variable | Valor |
|---|---|
| `--letter-spacing-tight` | `-0.025em` |
| `--letter-spacing-normal` | `0` |
| `--letter-spacing-wide` | `0.05em` |
| `--letter-spacing-wider` | `0.1em` |

### Font Weights
| Variable | Valor |
|---|---|
| `--font-weight-normal` | `400` |
| `--font-weight-medium` | `500` |
| `--font-weight-semibold` | `600` |
| `--font-weight-bold` | `700` |

---

## Clases de Utilidad Tipográfica

### Sans-serif (Geist)
| Clase | Tamaño base | Tamaño md+ | Uso |
|---|---|---|---|
| `.text-display` | 3rem | 3.75rem | Hero, Landing |
| `.text-hero` | 2.25rem | 3rem | Títulos principales de sección |
| `.text-hero-light` | 2.25rem | 3rem | Títulos en fondos oscuros (con text-shadow) |
| `.text-section-title` | 1.875rem | — | Títulos grandes de sección |
| `.text-page-title` | 1.5rem | — | Títulos de formularios/páginas |
| `.text-subtitle` | 1.25rem | — | Títulos de cards |
| `.text-lead` | 1.125rem | — | Descripciones, introducciones |
| `.text-logo` | 1.125rem | 1.25rem | Logo principal |
| `.text-logo-small` | 0.875rem | 1rem | Logo secundario/subtítulo |

### Serif (Playfair Display)
| Clase | Tamaño base | Tamaño md+ | Uso |
|---|---|---|---|
| `.text-elegant-display` | 3rem | 3.75rem | Títulos hero muy destacados |
| `.text-elegant-hero` | 2.25rem | 3rem | Títulos principales elegantes |
| `.text-elegant-hero-light` | 2.25rem | 3rem | Títulos elegantes en fondos oscuros |
| `.text-elegant-title` | 1.875rem | 2.25rem | Títulos de sección elegantes |
| `.text-elegant-quote` | 1.25rem | 1.5rem | Citas o texto destacado (italic) |

### Branding MIRÚ Franco
| Clase | Fuente | Tamaño | Uso |
|---|---|---|---|
| `.text-brand-miru` | Playfair Display | `clamp(2.75rem, 7.5vw, 5rem)` | "MIRÚ" en hero |
| `.text-brand-franco` | Great Vibes | `clamp(2.25rem, 6vw, 4rem)` | "FRANCO" en hero |
| `.text-brand-tagline` | Geist Sans | `clamp(0.75rem, 1.8vw, 1rem)` | Tagline "BEAUTY SALON" |
| `.text-brand-gold` | — | — | Aplica `color: var(--logo-branding)` |

---

## Decoraciones Hero

| Clase | Descripción |
|---|---|
| `.hero-flourish` | Línea decorativa con gradiente dorado (`80px × 1px`) |
| `.hero-ornament` | Punto circular dorado (`6px`) |
| `.hero-bg-gradient` | Gradiente radial cálido sobre `--fondo-general → --fondos-suaves` |
| `.dark .hero-bg-gradient` | Versión oscura con tono vino (`#710014`) |

---

## Archivos de Referencia

- **Colores de marca, estados y constantes**: `src/app/styles/globals.css` (`:root` y `.dark`)
- **Colores del sistema de interfaz**: `src/app/styles/sistema.css`
- **Clases de Tailwind**: `@theme inline` en `globals.css`
- **Gráficas**: `src/app/utils/chartColors.ts`
- **Prueba que impide colores escritos a mano**: `src/app/utils/coloresFijos.test.ts`
