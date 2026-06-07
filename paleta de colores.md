# Paleta de Colores - Miru Franco Web

> Fuente de verdad: `src/app/styles/globals.css`

---

## Variables CSS — Modo Claro (`:root`)

### Fondos
| Variable | Valor | Descripción |
|---|---|---|
| `--fondo-general` | `#DCC8B6` | Fondo base de toda la app |
| `--fondos-suaves` | `#d0b29c` | Fondos secundarios, hover suave |
| `--tarjetas-paneles` | `#B38E6F` | Cards y paneles |
| `--superficie-elevada` | `#ffffff` | Tarjetas internas checkout (evita blanco puro en dark) |
| `--input-bg` | `#F2F1ED` | Fondo de inputs |
| `--menu-lateral-bg` | `#FFFFFF` | Fondo del menú lateral/sidebar |

### Header / Footer / Navegación
| Variable | Valor |
|---|---|
| `--header-footer` | `#161616` |
| `--menu-texto-principal` | `#710014` |

### Branding
| Variable | Valor |
|---|---|
| `--logo-branding` | `#9f6d1f` |
| `--iconografia` | `#BFA181` |

### Hero
| Variable | Valor |
|---|---|
| `--hero-brand-color` | `#161616` |
| `--hero-tagline-color` | `#2A2A2A` |

### Estados
| Variable | Valor |
|---|---|
| `--warning` | `#D98E04` |
| `--danger` | `#710014` |
| `--success` | `#6E7D57` |
| `--encabezados-alterno` | `#2A2A2A` |

### Elementos Interactivos
| Variable | Valor |
|---|---|
| `--hover` | `#A64B63` |
| `--botones-principales` | `#710014` |
| `--enlaces-textos-interactivos` | `#4A7BA7` |

### Checkout
| Variable | Valor |
|---|---|
| `--checkout-entrega-borde-seleccion` | `var(--botones-principales)` → `#710014` |
| `--checkout-entrega-enlace` | `var(--botones-principales)` → `#710014` |

### Textos
| Variable | Valor |
|---|---|
| `--texto-fondo-oscuro` | `#F2F1ED` |
| `--foreground` | `var(--menu-texto-principal)` → `#710014` |
| `--background` | `var(--fondo-general)` → `#DCC8B6` |

### Bordes y Opacidades
| Variable | Valor |
|---|---|
| `--borde-sutil` | `rgba(255, 255, 255, 0.1)` |
| `--borde-visible` | `rgba(255, 255, 255, 0.2)` |
| `--borde-secundario` | `rgba(255, 255, 255, 0.3)` |
| `--texto-fondo-oscuro-70` | `rgba(242, 241, 237, 0.7)` |
| `--texto-fondo-oscuro-80` | `rgba(242, 241, 237, 0.8)` |
| `--texto-fondo-oscuro-10` | `rgba(242, 241, 237, 0.1)` |

---

## Variables CSS — Modo Oscuro (`.dark`)

| Variable | Valor oscuro |
|---|---|
| `--fondo-general` | `#161616` |
| `--tarjetas-paneles` | `#2a2a2a` |
| `--fondos-suaves` | `#1f1f1f` |
| `--menu-texto-principal` | `#ffffff` |
| `--encabezados-alterno` | `#b38e6f` |
| `--background` | `#161616` |
| `--foreground` | `#710014` |
| `--texto-fondo-oscuro` | `#ffffff` |
| `--input-bg` | `#1f1f1f` |
| `--menu-lateral-bg` | `#710014` |
| `--superficie-elevada` | `#2a2a2a` |
| `--checkout-entrega-borde-seleccion` | `#a64b63` |
| `--checkout-entrega-enlace` | `#4a7ba7` |
| `--enlaces-textos-interactivos` | `#4a7ba7` |
| `--hero-brand-color` | `var(--texto-fondo-oscuro)` |
| `--hero-tagline-color` | `rgba(242, 241, 237, 0.85)` |
| `--texto-fondo-oscuro-70` | `rgba(255, 255, 255, 0.7)` |
| `--texto-fondo-oscuro-80` | `rgba(255, 255, 255, 0.8)` |
| `--texto-fondo-oscuro-10` | `rgba(255, 255, 255, 0.1)` |

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

## Colores de Redes Sociales

| Red | Valor |
|---|---|
| Instagram | `linear-gradient(45deg, #FCAF45 0%, #FF8C42 15%, #E1306C 40%, #833AB4 70%, #405DE6 100%)` |
| Facebook | `#1877F2` |
| Twitter/X | `#1DA1F2` |

---

## Archivos de Referencia

- **Variables CSS**: `src/app/styles/globals.css`
- **Tokens Tailwind**: `@theme inline` dentro del mismo `globals.css`
