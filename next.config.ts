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
          // Usamos hashes SHA256 para permitir scripts inline de Next.js sin 'unsafe-inline'
          // Esto permite obtener A+ en securityheaders.com
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'strict-dynamic' 'sha256-OBTN3RiyCV4Bq7dFqZ5a2pAXjnCcCYeTJMO2I/LYKeo=' 'sha256-13ceWtDG9coxSJpvNmROZnRM0mFzVwiyqqsLIbUBWAc=' 'sha256-808+W18z9Dtj13mDRW7dcRSo2OTagO15WCx3ZshKDoo=' 'sha256-YfQGCCZqclfcA29ZZS09vE6q0Hi90HJJ9oR44bavIxQ=' 'sha256-tn7xe1bCkVzTD45JAucdbqtfHmV0ujDhn/cWoVU5hsg=' 'sha256-Q4/E7Og5LmC1pNfjMYG15V4a4xPIk0ePyp9AWa9YCDI=' https://vercel.live",
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
