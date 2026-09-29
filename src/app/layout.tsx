import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { Playfair_Display, Great_Vibes } from "next/font/google";
import "./styles/globals.css";
import { TokenChecker } from "./components/TokenChecker";
import { CartProvider } from "./context/CartContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { OG_IMAGE_DEFAULT, SITE_NAME, SITE_URL } from "./utils/seo";
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
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Mirú Franco — Beauty Salón",
    template: `%s | ${SITE_NAME}`,
  },
  description: "Salón de belleza profesional en Huejutla de Reyes. Cortes, coloración, tratamientos capilares, alaciado y nanoplastía. Agenda tu cita en línea.",
  openGraph: {
    title: "Mirú Franco — Beauty Salón",
    description: "Salón de belleza profesional. Cortes, coloración, tratamientos y más.",
    siteName: SITE_NAME,
    locale: "es_MX",
    type: "website",
    images: [OG_IMAGE_DEFAULT],
  },
  twitter: {
    card: "summary_large_image",
    images: [OG_IMAGE_DEFAULT.url],
  },
};

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
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.remove('dark');else document.documentElement.classList.add('dark');})();`,
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
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
