import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { Playfair_Display, Great_Vibes } from "next/font/google";
import "./styles/globals.css";
import { TokenChecker } from "./components/TokenChecker";
import { CartProvider } from "./context/CartContext";
import { ThemeProvider } from "./context/ThemeContext";
import { SCRIPT_INTRO } from "./components/home/introScript";
import { ToastProvider } from "./context/ToastContext";
import ReaceptacionDocumentos from "./components/legal/ReaceptacionDocumentos";
import AvisoCookies from "./components/legal/AvisoCookies";
import { OG_IMAGE_DEFAULT, SITE_URL } from "./utils/seo";
import { obtenerConfiguracionPublica } from "./services/configuracionSitio";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const greatVibes = Great_Vibes({
  variable: "--font-great-vibes",
  subsets: ["latin"],
  weight: ["400"],
});

// Sin `alternates.canonical` aquí a propósito: se heredaría a todas las rutas hijas que no
// definan el suyo y todas apuntarían al mismo canonical. Cada ruta pública declara el propio.
// Nombre y descripción: Configuración del sitio (revalida cada minuto; sin API, el nombre registrado).
export async function generateMetadata(): Promise<Metadata> {
  const { salon } = await obtenerConfiguracionPublica();
  return {
  metadataBase: new URL(SITE_URL),
  title: {
    default: salon.nombre,
    template: `%s | ${salon.nombre}`,
  },
  description: salon.descripcionSeo,
  // Safari en iPhone convertía teléfono, correo y dirección del pie en enlaces antes de hidratar (error 418 de React).
  formatDetection: { telephone: false, email: false, address: false, date: false },
  openGraph: {
    title: salon.nombre,
    description: salon.descripcionSeo,
    siteName: salon.nombre,
    locale: "es_MX",
    type: "website",
    images: [OG_IMAGE_DEFAULT],
  },
  twitter: {
    card: "summary_large_image",
    images: [OG_IMAGE_DEFAULT.url],
  },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          {...(nonce ? { nonce } : {})}
          dangerouslySetInnerHTML={{
            // Tema antes del primer pintado + decisión de la intro de la home (IntroGrieta.tsx)
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.remove('dark');else document.documentElement.classList.add('dark');})();${SCRIPT_INTRO}`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} ${greatVibes.variable} antialiased`}
      >
        <ThemeProvider>
          <TokenChecker />
          <ToastProvider>
            <CartProvider>
              {children}
            </CartProvider>
            {/* Con sesión: pide aceptar la versión nueva de Términos y Aviso. Sin bloquear: aviso de cookies. */}
            <ReaceptacionDocumentos />
            <AvisoCookies />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
