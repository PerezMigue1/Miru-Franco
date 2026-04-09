import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

/** Raíz real del app (evita que Turbopack elija otro lockfile en carpetas padre, p. ej. el del usuario). */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactCompiler: true,
  /** Evita cabecera X-Powered-By: Next.js (alerta baja en ZAP / fuga de stack). */
  poweredByHeader: false,
  turbopack: {
    root: projectRoot,
  },
  // En desarrollo: proxy /api/* al backend para evitar CORS (peticiones van a mismo origen)
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        { source: '/api/:path*', destination: 'http://localhost:3001/api/:path*' },
      ];
    }
    return [];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'logos-world.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      /** Fotos de perfil Google OAuth (subdominios lh*.googleusercontent.com) */
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    const baseHeaders = [
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      },
      {
        key: 'Cross-Origin-Opener-Policy',
        value: 'same-origin-allow-popups',
      },
      {
        key: 'Cross-Origin-Embedder-Policy',
        value: 'unsafe-none',
      },
    ];

    // Rutas más específicas primero: Next/Vercel a veces no aplican el patrón genérico a /_next/image.
    const hstsOnly = [
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      },
    ];

    return [
      { source: '/_next/image', headers: hstsOnly },
      { source: '/_next/static/:path*', headers: hstsOnly },
      {
        source: '/(.*)',
        headers: baseHeaders,
      },
    ];
  },
};

export default nextConfig;
