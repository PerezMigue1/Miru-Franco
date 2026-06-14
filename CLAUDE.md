# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Dev server on http://localhost:3000 (webpack mode)
npm run dev:mobile   # Dev server exposed on 0.0.0.0 for LAN devices
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest (one-shot)
npm run test:coverage
```

Run a single test file:
```bash
npx vitest run src/app/utils/security.test.ts
```

Tests live in `src/**/*.test.ts` (node environment, no browser APIs).

## Environment

`.env.local` is required:
```
NEXT_PUBLIC_API_URL=https://backend-miru-franco.vercel.app   # or http://localhost:3001 for local
NEXT_PUBLIC_APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...   # optional
```

In development, `next.config.ts` rewrites `/api/*` → `http://localhost:3001/api/*` so no CORS issues. In production, `NEXT_PUBLIC_API_URL` is used by `services/config.ts` and passed explicitly to every `apiClient` call.

## Architecture

### Route structure (`src/app/`)

```
(screens)/
  (public)/          # Unauthenticated: login, register, forgot-password, reset-password, error pages
  (privada)/
    cliente/         # Authenticated customer: tienda-online, servicios-citas, perfil, carrito, …
    operacion/       # Staff operations
    perfil/          # Shared profile page (wraps components/perfil/UserProfile.tsx)
  admin/             # Admin panel: ~20 sub-modules
```

Route groups `(public)` and `(privada)` are layout-only groupings (no URL impact). The admin section is flat under `/admin`.

### Layouts

| Layout | Used by |
|--------|---------|
| `components/layouts/PublicLayout.tsx` | Auth / public pages |
| `components/layouts/AdminLayout.tsx` | All `/admin/*` pages — hamburger sidebar with `GRUPOS_MODULOS` nav |
| `components/layouts/ModuleLayout.tsx` | Customer and operation modules |
| `components/layouts/OperacionLayout.tsx` | Staff operation screens |

`AdminLayout` holds all admin navigation state (sidebar open/close, active route via `pathname.startsWith`). Do not duplicate nav state in individual admin pages.

### API layer

All HTTP calls go through `services/client.ts` → `ApiClient`. Never use `fetch` directly.

```ts
// Always pass getBackendBaseUrl() as the third argument
import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

const data = await apiClient.post<MyType>('/api/something', body, getBackendBaseUrl());
```

`getBackendBaseUrl()` normalizes `NEXT_PUBLIC_API_URL` to a bare host (strips `/api` suffix if present). The client auto-attaches the JWT, handles token refresh, and redirects to `/403` / `/500` / `/login` on the corresponding HTTP errors. Pass `skip403Redirect: true` or `skip500Redirect: true` when a page needs to handle those errors inline.

### Auth / tokens

- Token stored in `localStorage` via `utils/security.ts` (`getToken`, `saveToken`, `clearAuthData`).
- `TokenChecker` (mounted in root layout) polls for expiry and fires the logout flow.
- Shared token refresh via `utils/tokenRefresh.ts` (`runSharedAccessTokenRefresh`) — prevents concurrent refresh races.
- Auth endpoints live under `/api/auth/*`. CRUD on users is `/api/usuarios/*`.

### Contexts (root layout)

`ThemeProvider` → `ToastProvider` → `CartProvider` — all three wrap the entire app. Theme is persisted in `localStorage` and applied via an inline script in `<head>` to avoid flash.

### Services split

| File | Responsibility |
|------|---------------|
| `services/auth.ts` | Login, register, OTP, password recovery, logout, `/api/auth/me` |
| `services/usuarios.ts` | Admin CRUD on user records |
| `services/perfil.ts` | Profile read/write + helpers `normalizarPerfilUsuario`, `unwrapUsuarioPayload` |
| `services/productos.ts` / `ecommerce.ts` | Store catalog and orders |
| `services/client.ts` | Raw HTTP client (single instance `apiClient`) |
| `services/config.ts` | URL normalization (`getBackendBaseUrl`, `getRestApiBaseUrl`) |

### UI components (`components/ui/`)

Shared primitives: `Button`, `Card`, `Input`, `Select`, `Textarea`, `Table`, `Modal`, `Drawer`, `Badge`, `Notification`, `PageHeader`, `Breadcrumb`, `ThemeToggle`. Use these instead of raw HTML elements for consistency.

## Key conventions

**Colors**: always use `var(--...)` CSS custom properties defined in `globals.css`. Never hardcode hex values or use Tailwind `dark:text-xxx` with literal colors.

**Icons**: use `lucide-react` everywhere. No emoji in JSX.

**Animations**: use the `style` prop with a CSS `animation:` string and stagger via `delay = index * 60ms`. Do not use `data-reveal` attributes or `IntersectionObserver` for entrance animations.

**`tienda-online/page.tsx` must remain `'use client'`**: making it a server component silences backend errors and returns an empty product array without any visible failure.

**`Card` accepts a `style` prop**: pass animations directly to `<Card style={{ animation }}>` rather than wrapping in an extra `<div>` — the extra wrapper causes TypeScript narrowing issues inside conditional render blocks.

**Backend route split** (after the auth refactor):
- `/api/auth/*` — all auth flows (login, OTP, password recovery, etc.)
- `/api/usuarios/registro` — account creation (stays under usuarios)
- `/api/usuarios/*` — admin CRUD (list, update, role/status changes, delete)
