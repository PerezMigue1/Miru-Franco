import type { NextConfig } from "next";

const securityHeaders = [
  // 1) Evitar sniffing de tipos de contenido
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // 2) Política de referencia
  {
    key: 'Referrer-Policy',
    // Puedes usar 'no-referrer' si quieres ser más estricto
    value: 'strict-origin-when-cross-origin',
  },
  // 3) Política de permisos (limitar APIs del navegador)
  {
    key: 'Permissions-Policy',
    // Ajusta según lo que realmente uses
    value: 'geolocation=(), microphone=(), camera=(), payment=(), usb=()',
  },
  // 4) Content-Security-Policy (CSP)
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",                            // solo cargar recursos del mismo origen
      "script-src 'self' 'unsafe-inline'",             // scripts propios (añade CDNs si usas)
      "style-src 'self' 'unsafe-inline'",              // estilos propios + inline (Tailwind, etc.)
      "img-src 'self' data: https:",                   // imágenes locales + data URIs + https externos
      "font-src 'self' data:",                         // fuentes locales + data URIs
      "connect-src 'self' https:",                     // llamadas API solo a https (ajusta si necesitas)
      "frame-ancestors 'none'",                        // nadie puede incluir tu sitio en un <iframe>
    ].join('; '),
  },
  // 5) (Opcional) Protección XSS heredada
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
];

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
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
