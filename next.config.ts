import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
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
    ],
  },
  async headers() {
    return [
      {
        // Aplica a todas las rutas
        source: '/(.*)',
        headers: [
          // 1) Evitar sniffing de tipos de contenido
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // 2) Política de referencia
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // 3) Política de permisos (limitar APIs del navegador)
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          // 4) Content-Security-Policy (CSP)
          // Next.js requiere 'unsafe-inline' para scripts inline de hidratación
          // Todos los demás headers de seguridad están configurados para obtener A+
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://vercel.live",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: https:",
              "connect-src 'self' https://backend-miru-franco.vercel.app https://*.vercel.app",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          // 5) Protección XSS heredada
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // 6) X-Frame-Options
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
