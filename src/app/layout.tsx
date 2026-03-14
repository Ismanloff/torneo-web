import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Outfit } from "next/font/google";

import { PwaRegistrar } from "@/components/pwa-registrar";

import "./globals.css";

const displayFont = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Torneo Escolar 2026",
  description: "Portal de clasificacion, partidos y puntuacion del torneo.",
  applicationName: "Torneo Escolar 2026",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Torneo 2026",
  },
};

export const viewport: Viewport = {
  themeColor: "#050816",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-green-600 focus:px-4 focus:py-2 focus:text-white"
        >
          Saltar al contenido
        </a>
        <PwaRegistrar />
        <div id="main-content">{children}</div>
      </body>
    </html>
  );
}
