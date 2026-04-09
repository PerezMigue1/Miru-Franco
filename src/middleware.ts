import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function randomNonceBase64(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

/** Orígenes del API (fetch / RSC / etc.). */
function connectSrcOrigins(): string[] {
  const base = [
    "'self'",
    'https://api.cloudinary.com',
    'https://backend-miru-franco.vercel.app',
    'https://miru-franco.onrender.com',
    'https://api.mirufranco.com',
    'https://vercel.live',
  ];
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return base;
  try {
    const origin = new URL(raw).origin;
    if (!base.includes(origin)) base.push(origin);
  } catch {
    /* ignorar URL inválida en build */
  }
  return base;
}

/**
 * Orígenes desde los que puede cargarse una imagen (img / next/image hacia URL absoluta).
 * Debe incluir el mismo host que el API si el backend sirve /uploads, url.jpg, etc.
 */
function imgSrcOrigins(): string[] {
  const staticHosts = [
    'https://res.cloudinary.com',
    'https://images.unsplash.com',
    'https://logos-world.net',
    'https://lh3.googleusercontent.com',
    'https://lh4.googleusercontent.com',
    'https://lh5.googleusercontent.com',
    'https://lh6.googleusercontent.com',
    'https://lh7.googleusercontent.com',
    'https://via.placeholder.com',
    'https://backend-miru-franco.vercel.app',
    'https://miru-franco.onrender.com',
    'https://api.mirufranco.com',
  ];
  const out = new Set<string>(["'self'", 'data:', 'blob:', ...staticHosts]);
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (raw) {
    try {
      out.add(new URL(raw).origin);
    } catch {
      /* ignorar */
    }
  }
  return [...out];
}

/**
 * CSP en producción: nonce + strict-dynamic para scripts de Next sin 'unsafe-inline' en script-src.
 * img-src sin esquema comodín (https:) ni *.host (reduce alertas ZAP "CSP: Wildcard").
 * style-src mantiene 'unsafe-inline' por uso de style={{}} en la app (ZAP puede seguir avisando ahí).
 */
export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  const nonce = randomNonceBase64();

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://vercel.live`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "style-src-attr 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com data:",
    ['img-src', ...imgSrcOrigins()].join(' '),
    ['connect-src', ...connectSrcOrigins()].join(' '),
    "frame-src 'self' https://vercel.live",
    'upgrade-insecure-requests',
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
