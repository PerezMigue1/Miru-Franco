import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
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
    const isDev = process.env.NODE_ENV === 'development';

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
    ];

    // En desarrollo, Next.js usa scripts/runtime que pueden romperse con CSP estricto.
    // Dejamos CSP solo en producción para evitar pantallas "cargando" por bloqueo de scripts.
    const cspHeader = {
      key: 'Content-Security-Policy',
      value:
        "default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; frame-ancestors 'none'; script-src 'self' 'unsafe-inline' https://vercel.live; script-src-attr 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src-attr 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https: https://res.cloudinary.com https://images.unsplash.com https://logos-world.net https://*.googleusercontent.com https://lh3.googleusercontent.com https://via.placeholder.com; connect-src 'self' http://localhost:3000 http://localhost:3001 https://api.cloudinary.com https://backend-miru-franco.vercel.app https://miru-franco.onrender.com https://api.mirufranco.com; frame-src 'self' https://vercel.live; upgrade-insecure-requests;",
    };

    return [
      {
        source: '/(.*)',
        headers: isDev ? baseHeaders : [...baseHeaders, cspHeader],
      },
    ];
  },
};

export default nextConfig;
