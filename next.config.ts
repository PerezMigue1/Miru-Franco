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
    return [
      {
        source: '/(.*)',
        headers: [
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
            key: 'Content-Security-Policy',
            value: "default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; frame-ancestors 'none'; script-src 'self' https://vercel.live; script-src-attr 'none'; style-src 'self' https://fonts.googleapis.com; style-src-attr 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://logos-world.net https://*.googleusercontent.com; connect-src 'self' http://localhost:3000 http://localhost:3001 https://api.cloudinary.com https://backend-miru-franco.vercel.app; frame-src 'self' https://vercel.live; upgrade-insecure-requests;",
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
